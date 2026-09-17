import { create } from "zustand";
import { people as initialPeople, families as initialFamilies } from "./sampleData";
import { parseGedcom } from "./gedcomImport";
import type { Person, Family } from "./types";

interface FamilyDataState {
  people: Person[];
  families: Family[];
  isLoading: boolean;
  error: Error | null;
  addPerson: (data: Omit<Person, "id">) => string;
  updatePerson: (personId: string, updates: Partial<Omit<Person, "id">>) => void;
  deletePerson: (personId: string) => void;
  setParents: (childId: string, fatherId: string | null, motherId: string | null) => void;
  addPartner: (personId: string, partnerId: string) => void;
  removePartner: (personId: string, partnerId: string) => void;
  importGedcomFile: (file: File) => Promise<void>;
  clearImportError: () => void;
}

// ponytail: session-only ids via Math.random — fine for an in-memory
// prototype, swap for a real id generator (uuid, or the backend's own ids)
// once a persistence layer exists.
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

export const useFamilyData = create<FamilyDataState>((set, get) => ({
  people: initialPeople,
  families: initialFamilies,
  isLoading: false,
  error: null,

  addPerson: (data) => {
    const id = generateId("person");
    set((state) => ({ people: [...state.people, { id, ...data }] }));
    return id;
  },

  updatePerson: (personId, updates) => {
    set((state) => ({
      people: state.people.map((p) => (p.id === personId ? { ...p, ...updates } : p)),
    }));
  },

  // ponytail: no cycle check (e.g. setting a descendant as someone's
  // parent) — the layout algorithms' MAX_GENERATIONS caps keep a bad edit
  // from hanging the app, but the data itself would stay inconsistent
  // until corrected. Add a reachability check here if real data entry
  // makes that a real risk.
  deletePerson: (personId) => {
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
  },

  setParents: (childId, fatherId, motherId) => {
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
  },

  addPartner: (personId, partnerId) => {
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
  },

  removePartner: (personId, partnerId) => {
    set((state) => ({
      families: withoutEmptyFamilies(
        state.families.map((f) =>
          f.partnerIds.includes(personId) && f.partnerIds.includes(partnerId)
            ? { ...f, partnerIds: f.partnerIds.filter((id) => id !== personId && id !== partnerId) }
            : f
        )
      ),
    }));
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
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err : new Error("GEDCOM-Import fehlgeschlagen."),
      });
    }
  },

  clearImportError: () => set({ error: null }),
}));
