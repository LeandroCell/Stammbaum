import { describe, it, expect } from "vitest";
import { pickDefaultCenter } from "./familyGraph";
import { people, families } from "./sampleData";

describe("pickDefaultCenter", () => {
  it("returns undefined for an empty tree", () => {
    expect(pickDefaultCenter([], [])).toBeUndefined();
  });

  it("prefers the person with the most known ancestors over an arbitrary first record", () => {
    // pgf (a root ancestor with no parents) comes first in the sample data;
    // the deepest branch is Max/Julia/Ben's line, not pgf.
    expect(people[0].id).toBe("pgf");
    const center = pickDefaultCenter(people, families);
    expect(center).not.toBe("pgf");
    // Ben (child1) has father me, mother partner(no parents), plus me's
    // whole ancestry: the most ancestors in the sample tree.
    expect(center).toBe("child1");
  });

  it("falls back to the first person when nobody has ancestors", () => {
    const flat = [
      { id: "a", firstName: "A", lastName: "X" },
      { id: "b", firstName: "B", lastName: "X" },
    ];
    expect(pickDefaultCenter(flat, [])).toBe("a");
  });

  it("survives cyclic data without hanging", () => {
    const cyclePeople = [
      { id: "a", firstName: "A", lastName: "X" },
      { id: "b", firstName: "B", lastName: "X" },
    ];
    const cycleFamilies = [
      { id: "f1", partnerIds: ["a"], childrenIds: ["b"] },
      { id: "f2", partnerIds: ["b"], childrenIds: ["a"] },
    ];
    expect(pickDefaultCenter(cyclePeople, cycleFamilies)).toBeDefined();
  });
});
