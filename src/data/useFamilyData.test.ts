import { describe, it, expect, beforeEach, vi } from "vitest";
import { useFamilyData } from "./useFamilyData";

const initialState = useFamilyData.getState();

describe("useFamilyData mutations (offline, no backend involved)", () => {
  beforeEach(() => {
    // isOffline: true makes every mutation's background persist() a no-op,
    // so these tests exercise pure client-side logic only — the network
    // integration itself is covered separately below.
    useFamilyData.setState({ ...initialState, isOffline: true }, true);
  });

  it("starts with the sample people and families", () => {
    const state = useFamilyData.getState();
    expect(state.people.some((p) => p.id === "me")).toBe(true);
    expect(state.families.length).toBeGreaterThan(0);
  });

  it("adds a new person and returns their id", async () => {
    const id = await useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    const added = useFamilyData.getState().people.find((p) => p.id === id);
    expect(added).toMatchObject({ firstName: "Nina", lastName: "Berger" });
  });

  it("updates an existing person's fields", async () => {
    await useFamilyData.getState().updatePerson("me", { birthPlace: "Hamburg" });
    const updated = useFamilyData.getState().people.find((p) => p.id === "me");
    expect(updated?.birthPlace).toBe("Hamburg");
    expect(updated?.firstName).toBe("Max");
  });

  it("deletes a person and removes them from every family", async () => {
    await useFamilyData.getState().deletePerson("child1");
    const state = useFamilyData.getState();
    expect(state.people.some((p) => p.id === "child1")).toBe(false);
    for (const family of state.families) {
      expect(family.partnerIds).not.toContain("child1");
      expect(family.childrenIds).not.toContain("child1");
    }
  });

  it("drops a family entirely once it has no partners and no children left", async () => {
    const idA = await useFamilyData.getState().addPerson({ firstName: "A", lastName: "Test" });
    const idB = await useFamilyData.getState().addPerson({ firstName: "B", lastName: "Test" });
    await useFamilyData.getState().addPartner(idA, idB);
    const familyId = useFamilyData
      .getState()
      .families.find((f) => f.partnerIds.includes(idA) && f.partnerIds.includes(idB))!.id;

    await useFamilyData.getState().deletePerson(idA);
    await useFamilyData.getState().deletePerson(idB);

    expect(useFamilyData.getState().families.some((f) => f.id === familyId)).toBe(false);
  });

  it("creates a new family when setting parents that aren't paired yet", async () => {
    const id = await useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    await useFamilyData.getState().setParents(id, "father", "mother");
    const state = useFamilyData.getState();
    const family = state.families.find((f) => f.childrenIds.includes(id));
    expect(family?.partnerIds.sort()).toEqual(["father", "mother"].sort());
  });

  it("reuses the existing family when the same parent pair already has children", async () => {
    const id = await useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    await useFamilyData.getState().setParents(id, "father", "mother");
    const state = useFamilyData.getState();
    const familiesWithBothParents = state.families.filter(
      (f) => f.partnerIds.includes("father") && f.partnerIds.includes("mother")
    );
    expect(familiesWithBothParents).toHaveLength(1);
    expect(familiesWithBothParents[0].childrenIds).toEqual(expect.arrayContaining(["me", "sibling1", id]));
  });

  it("clears parents when both are set to null", async () => {
    await useFamilyData.getState().setParents("sibling1", null, null);
    const state = useFamilyData.getState();
    for (const family of state.families) {
      expect(family.childrenIds).not.toContain("sibling1");
    }
  });

  it("adds a partner relationship between two people", async () => {
    const id = await useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    await useFamilyData.getState().addPartner("sibling1", id);
    const state = useFamilyData.getState();
    const family = state.families.find((f) => f.partnerIds.includes("sibling1") && f.partnerIds.includes(id));
    expect(family).toBeDefined();
  });

  it("removes a partner relationship", async () => {
    await useFamilyData.getState().removePartner("me", "partner");
    const state = useFamilyData.getState();
    const stillPartners = state.families.some(
      (f) => f.partnerIds.includes("me") && f.partnerIds.includes("partner")
    );
    expect(stillPartners).toBe(false);
  });

  describe("importGedcomFile", () => {
    const validGedcom = "0 HEAD\n0 @I1@ INDI\n1 NAME Erika /Muster/\n1 SEX F\n0 TRLR";

    it("sets isLoading while the import is in progress and clears it afterward", async () => {
      const file = new File([validGedcom], "test.ged");
      const promise = useFamilyData.getState().importGedcomFile(file);
      expect(useFamilyData.getState().isLoading).toBe(true);
      await promise;
      expect(useFamilyData.getState().isLoading).toBe(false);
    });

    it("replaces people and families with the imported data on success", async () => {
      const file = new File([validGedcom], "test.ged");
      await useFamilyData.getState().importGedcomFile(file);
      const state = useFamilyData.getState();
      expect(state.people).toHaveLength(1);
      expect(state.people[0]).toMatchObject({ firstName: "Erika", lastName: "Muster" });
      expect(state.error).toBeNull();
    });

    it("keeps the existing data and sets an error when the file is invalid", async () => {
      const file = new File(["0 HEAD\n0 TRLR"], "empty.ged");
      await useFamilyData.getState().importGedcomFile(file);
      const state = useFamilyData.getState();
      expect(state.error).toBeInstanceOf(Error);
      expect(state.people.some((p) => p.id === "me")).toBe(true);
    });
  });

  it("clears a previous import error", () => {
    useFamilyData.setState({ error: new Error("test") });
    useFamilyData.getState().clearImportError();
    expect(useFamilyData.getState().error).toBeNull();
  });
});

describe("useFamilyData network integration", () => {
  beforeEach(() => {
    useFamilyData.setState(initialState, true);
  });

  describe("loadTree", () => {
    it("falls back to bundled sample data when no backend is reachable", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
      await useFamilyData.getState().loadTree();
      const state = useFamilyData.getState();
      expect(state.isOffline).toBe(true);
      expect(state.needsLogin).toBe(false);
      expect(state.people.some((p) => p.id === "me")).toBe(true);
    });

    it("shows the login screen when the backend responds 401", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
      await useFamilyData.getState().loadTree();
      const state = useFamilyData.getState();
      expect(state.needsLogin).toBe(true);
      expect(state.isOffline).toBe(false);
    });

    it("loads people/families from a reachable, authenticated backend", async () => {
      const serverPeople = [{ id: "server-1", firstName: "Erika", lastName: "Muster" }];
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(
          new Response(JSON.stringify({ people: serverPeople, families: [] }), { status: 200 })
        )
      );
      await useFamilyData.getState().loadTree();
      const state = useFamilyData.getState();
      expect(state.people).toEqual(serverPeople);
      expect(state.isOffline).toBe(false);
      expect(state.needsLogin).toBe(false);
    });
  });

  describe("login", () => {
    it("returns true, clears needsLogin, and reloads the tree on success", async () => {
      const serverPeople = [{ id: "server-1", firstName: "Erika", lastName: "Muster" }];
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ people: serverPeople, families: [] }), { status: 200 })
        );
      vi.stubGlobal("fetch", fetchMock);

      useFamilyData.setState({ needsLogin: true });
      const success = await useFamilyData.getState().login("geheim123");

      expect(success).toBe(true);
      expect(useFamilyData.getState().needsLogin).toBe(false);
      expect(useFamilyData.getState().people).toEqual(serverPeople);
    });

    it("returns false and keeps needsLogin on a wrong password", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "Falsches Passwort." }), { status: 401 }))
      );
      useFamilyData.setState({ needsLogin: true });
      const success = await useFamilyData.getState().login("falsch");

      expect(success).toBe(false);
      expect(useFamilyData.getState().needsLogin).toBe(true);
    });
  });

  describe("logout", () => {
    it("sets needsLogin back to true", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 })));
      await useFamilyData.getState().logout();
      expect(useFamilyData.getState().needsLogin).toBe(true);
    });
  });

  describe("persist via a mutation", () => {
    it("saves the updated tree to the backend when online", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      useFamilyData.setState({ isOffline: false });

      await useFamilyData.getState().updatePerson("me", { birthPlace: "Hamburg" });

      expect(fetchMock).toHaveBeenCalledWith(
        "/api/tree",
        expect.objectContaining({ method: "PUT" })
      );
      expect(useFamilyData.getState().error).toBeNull();
    });

    it("surfaces a save error without discarding the local change", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
      useFamilyData.setState({ isOffline: false });

      await useFamilyData.getState().updatePerson("me", { birthPlace: "Hamburg" });

      const state = useFamilyData.getState();
      expect(state.error).toBeInstanceOf(Error);
      expect(state.people.find((p) => p.id === "me")?.birthPlace).toBe("Hamburg");
    });
  });
});
