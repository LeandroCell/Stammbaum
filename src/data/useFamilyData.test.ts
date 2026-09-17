import { describe, it, expect, beforeEach } from "vitest";
import { useFamilyData } from "./useFamilyData";

const initialState = useFamilyData.getState();

describe("useFamilyData", () => {
  beforeEach(() => {
    useFamilyData.setState(initialState, true);
  });

  it("starts with the sample people and families", () => {
    const state = useFamilyData.getState();
    expect(state.people.some((p) => p.id === "me")).toBe(true);
    expect(state.families.length).toBeGreaterThan(0);
  });

  it("adds a new person and returns their id", () => {
    const id = useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    const added = useFamilyData.getState().people.find((p) => p.id === id);
    expect(added).toMatchObject({ firstName: "Nina", lastName: "Berger" });
  });

  it("updates an existing person's fields", () => {
    useFamilyData.getState().updatePerson("me", { birthPlace: "Hamburg" });
    const updated = useFamilyData.getState().people.find((p) => p.id === "me");
    expect(updated?.birthPlace).toBe("Hamburg");
    expect(updated?.firstName).toBe("Max");
  });

  it("deletes a person and removes them from every family", () => {
    useFamilyData.getState().deletePerson("child1");
    const state = useFamilyData.getState();
    expect(state.people.some((p) => p.id === "child1")).toBe(false);
    for (const family of state.families) {
      expect(family.partnerIds).not.toContain("child1");
      expect(family.childrenIds).not.toContain("child1");
    }
  });

  it("drops a family entirely once it has no partners and no children left", () => {
    const idA = useFamilyData.getState().addPerson({ firstName: "A", lastName: "Test" });
    const idB = useFamilyData.getState().addPerson({ firstName: "B", lastName: "Test" });
    useFamilyData.getState().addPartner(idA, idB);
    const familyId = useFamilyData
      .getState()
      .families.find((f) => f.partnerIds.includes(idA) && f.partnerIds.includes(idB))!.id;

    useFamilyData.getState().deletePerson(idA);
    useFamilyData.getState().deletePerson(idB);

    expect(useFamilyData.getState().families.some((f) => f.id === familyId)).toBe(false);
  });

  it("creates a new family when setting parents that aren't paired yet", () => {
    const id = useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    useFamilyData.getState().setParents(id, "father", "mother");
    const state = useFamilyData.getState();
    const family = state.families.find((f) => f.childrenIds.includes(id));
    expect(family?.partnerIds.sort()).toEqual(["father", "mother"].sort());
  });

  it("reuses the existing family when the same parent pair already has children", () => {
    const id = useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    useFamilyData.getState().setParents(id, "father", "mother");
    const state = useFamilyData.getState();
    const familiesWithBothParents = state.families.filter(
      (f) => f.partnerIds.includes("father") && f.partnerIds.includes("mother")
    );
    expect(familiesWithBothParents).toHaveLength(1);
    expect(familiesWithBothParents[0].childrenIds).toEqual(expect.arrayContaining(["me", "sibling1", id]));
  });

  it("clears parents when both are set to null", () => {
    useFamilyData.getState().setParents("sibling1", null, null);
    const state = useFamilyData.getState();
    for (const family of state.families) {
      expect(family.childrenIds).not.toContain("sibling1");
    }
  });

  it("adds a partner relationship between two people", () => {
    const id = useFamilyData.getState().addPerson({ firstName: "Nina", lastName: "Berger" });
    useFamilyData.getState().addPartner("sibling1", id);
    const state = useFamilyData.getState();
    const family = state.families.find((f) => f.partnerIds.includes("sibling1") && f.partnerIds.includes(id));
    expect(family).toBeDefined();
  });

  it("removes a partner relationship", () => {
    useFamilyData.getState().removePartner("me", "partner");
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
