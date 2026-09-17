import { create } from "zustand";
import { people as initialPeople, families as initialFamilies } from "./sampleData";
import { parseGedcom } from "./gedcomImport";
import type { Person, Family } from "./types";

interface FamilyDataState {
  people: Person[];
  families: Family[];
  isLoading: boolean;
  error: Error | null;
  needsLogin: boolean;
  isOffline: boolean;
  loadTree: () => Promise<void>;
  login: (password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  addPerson: (data: Omit<Person, "id">) => Promise<string>;
  updatePerson: (personId: string, updates: Partial<Omit<Person, "id">>) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  setParents: (childId: string, fatherId: string | null, motherId: string | null) => Promise<void>;
  addPartner: (personId: string, partnerId: string) => Promise<void>;
  removePartner: (personId: string, partnerId: string) => Promise<void>;
  importGedcomFile: (file: File) => Promise<void>;
  clearImportError: () => void;
}

// ponytail: session-only ids via Math.random — fine given the server just
// stores whatever id the client assigns (TEXT primary key, no server-side
// sequence), swap for a real id generator (uuid) if collision risk ever
// matters at a larger scale.
function generateId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function withoutEmptyFamilies(families: Family[]): Family[] {
  return families.filter((f) => f.partnerIds.length > 0 || f.childrenIds.length > 0);
}

// ponytail: FileReader instead of the newer Blob.text() — both work in
// every real browser, but this project's test environment (jsdom) doesn't
// implement Blob.text() yet, and FileReader is the one that's testable
// there too.
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsText(file);
  });
}

export const useFamilyData = create<FamilyDataState>((set, get) => {
  // ponytail: saves the whole current tree after every mutation instead of
  // diffing — same reasoning as api/_lib/db.ts's saveTree. Skipped entirely
  // while offline, so local-only editing (no backend configured, e.g. plain
  // `vite dev`) never attempts a network call.
  async function persist() {
    if (get().isOffline) return;
    try {
      const res = await fetch("/api/tree", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ people: get().people, families: get().families }),
      });
      if (res.status === 401) {
        set({ needsLogin: true });
        return;
      }
      if (!res.ok) {
        throw new Error(`Speichern fehlgeschlagen (${res.status}).`);
      }
      set({ error: null });
    } catch (err) {
      set({ error: err instanceof Error ? err : new Error("Speichern fehlgeschlagen.") });
    }
  }

  return {
    people: initialPeople,
    families: initialFamilies,
    isLoading: false,
    error: null,
    needsLogin: false,
    isOffline: false,

    loadTree: async () => {
      set({ isLoading: true, error: null });
      try {
        const res = await fetch("/api/tree", { credentials: "include" });
        if (res.status === 401) {
          set({ isLoading: false, needsLogin: true, isOffline: false });
          return;
        }
        if (!res.ok) {
          throw new Error(`Serverfehler (${res.status}).`);
        }
        const data = (await res.json()) as { people: Person[]; families: Family[] };
        set({
          people: data.people,
          families: data.families,
          isLoading: false,
          error: null,
          needsLogin: false,
          isOffline: false,
        });
      } catch {
        // ponytail: no backend reachable at all (e.g. plain `vite dev`
        // without the /api functions, or before a database is configured)
        // — fall back to the bundled sample data so the UI stays usable
        // for frontend-only work. A reachable backend that merely responds
        // with an error (not this catch block) surfaces as `error` instead.
        set({
          people: initialPeople,
          families: initialFamilies,
          isLoading: false,
          error: null,
          needsLogin: false,
          isOffline: true,
        });
      }
    },

    login: async (password) => {
      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}) as { error?: string });
          set({ error: new Error(body.error ?? "Anmeldung fehlgeschlagen.") });
          return false;
        }
        set({ needsLogin: false, error: null });
        await get().loadTree();
        return true;
      } catch (err) {
        set({ error: err instanceof Error ? err : new Error("Anmeldung fehlgeschlagen.") });
        return false;
      }
    },

    logout: async () => {
      await fetch("/api/logout", { method: "POST", credentials: "include" }).catch(() => {});
      set({ needsLogin: true });
    },

    addPerson: async (data) => {
      const id = generateId("person");
      set((state) => ({ people: [...state.people, { id, ...data }] }));
      await persist();
      return id;
    },

    updatePerson: async (personId, updates) => {
      set((state) => ({
        people: state.people.map((p) => (p.id === personId ? { ...p, ...updates } : p)),
      }));
      await persist();
    },

    // ponytail: no cycle check (e.g. setting a descendant as someone's
    // parent) — the layout algorithms' MAX_GENERATIONS caps keep a bad edit
    // from hanging the app, but the data itself would stay inconsistent
    // until corrected. Add a reachability check here if real data entry
    // makes that a real risk.
    deletePerson: async (personId) => {
      set((state) => ({
        people: state.people.filter((p) => p.id !== personId),
        families: withoutEmptyFamilies(
          state.families.map((f) => ({
            ...f,
            partnerIds: f.partnerIds.filter((id) => id !== personId),
            childrenIds: f.childrenIds.filter((id) => id !== personId),
          }))
        ),
      }));
      await persist();
    },

    setParents: async (childId, fatherId, motherId) => {
      set((state) => {
        const withoutChild = withoutEmptyFamilies(
          state.families.map((f) => ({ ...f, childrenIds: f.childrenIds.filter((id) => id !== childId) }))
        );

        const parentIds = [fatherId, motherId].filter((id): id is string => Boolean(id));
        if (parentIds.length === 0) {
          return { families: withoutChild };
        }

        const existingIndex = withoutChild.findIndex(
          (f) => f.partnerIds.length === parentIds.length && parentIds.every((id) => f.partnerIds.includes(id))
        );

        if (existingIndex >= 0) {
          const updated = [...withoutChild];
          updated[existingIndex] = {
            ...updated[existingIndex],
            childrenIds: [...updated[existingIndex].childrenIds, childId],
          };
          return { families: updated };
        }

        return {
          families: [...withoutChild, { id: generateId("fam"), partnerIds: parentIds, childrenIds: [childId] }],
        };
      });
      await persist();
    },

    addPartner: async (personId, partnerId) => {
      const alreadyPartners = get().families.some(
        (f) => f.partnerIds.includes(personId) && f.partnerIds.includes(partnerId)
      );
      if (alreadyPartners) return;
      set((state) => ({
        families: [
          ...state.families,
          { id: generateId("fam"), partnerIds: [personId, partnerId], childrenIds: [] },
        ],
      }));
      await persist();
    },

    removePartner: async (personId, partnerId) => {
      set((state) => ({
        families: withoutEmptyFamilies(
          state.families.map((f) =>
            f.partnerIds.includes(personId) && f.partnerIds.includes(partnerId)
              ? { ...f, partnerIds: f.partnerIds.filter((id) => id !== personId && id !== partnerId) }
              : f
          )
        ),
      }));
      await persist();
    },

    // ponytail: a GEDCOM import replaces the whole tree rather than merging
    // it into the current one — the file represents a complete, independent
    // family tree, and there's no reliable way to match its ids against ours.
    importGedcomFile: async (file) => {
      set({ isLoading: true, error: null });
      try {
        const text = await readFileAsText(file);
        const { people, families } = parseGedcom(text);
        set({ people, families, isLoading: false, error: null });
        await persist();
      } catch (err) {
        set({
          isLoading: false,
          error: err instanceof Error ? err : new Error("GEDCOM-Import fehlgeschlagen."),
        });
      }
    },

    clearImportError: () => set({ error: null }),
  };
});
