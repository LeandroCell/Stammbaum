import { describe, it, expect } from "vitest";
import { people, families } from "./sampleData";

describe("sampleData integrity", () => {
  const personIds = new Set(people.map((p) => p.id));

  it("has unique person ids", () => {
    expect(personIds.size).toBe(people.length);
  });

  it("references only existing people in every family", () => {
    for (const family of families) {
      for (const id of [...family.partnerIds, ...family.childrenIds]) {
        expect(personIds.has(id)).toBe(true);
      }
    }
  });
});
