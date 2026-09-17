import { describe, it, expect } from "vitest";
import { radialLayout } from "./radialLayout";
import { people, families } from "../data/sampleData";

describe("radialLayout", () => {
  const result = radialLayout(people, families, "me");
  const nodeById = new Map(result.nodes.map((n) => [n.personId, n]));

  const distanceFromCenter = (x: number, y: number) => Math.sqrt(x * x + y * y);

  it("places the center person at the origin", () => {
    const center = nodeById.get("me")!;
    expect(center.x).toBeCloseTo(0);
    expect(center.y).toBeCloseTo(0);
    expect(center.generation).toBe(0);
  });

  it("places the father to the right and the mother to the left", () => {
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;
    expect(father.x).toBeGreaterThan(0);
    expect(mother.x).toBeLessThan(0);
    expect(father.generation).toBe(-1);
    expect(mother.generation).toBe(-1);
  });

  it("places grandparents on a wider ring than parents", () => {
    const father = nodeById.get("father")!;
    const paternalGrandfather = nodeById.get("pgf")!;
    expect(distanceFromCenter(paternalGrandfather.x, paternalGrandfather.y)).toBeGreaterThan(
      distanceFromCenter(father.x, father.y)
    );
    expect(paternalGrandfather.generation).toBe(-2);
  });

  it("includes ancestors, their siblings, and the partner, but no further descendants", () => {
    const expectedIds = ["me", "sibling1", "father", "mother", "pgf", "pgm", "mgf", "mgm", "partner"];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("places the center's sibling below everything else, clear of the partner slot", () => {
    const sibling = nodeById.get("sibling1")!;
    const partner = nodeById.get("partner")!;
    expect(sibling.generation).toBe(0);
    expect(sibling.y).toBeGreaterThan(partner.y);
  });

  it("places multiple siblings from different branches without any overlapping position", () => {
    // Simulate a second family with more siblings-of-ancestors than the
    // sample data has, so a naive per-node offset would collide.
    const extraFamilies = [
      ...families,
      { id: "fam-extra", partnerIds: ["father", "mother"], childrenIds: ["me", "sibling1", "extra1", "extra2"] },
      { id: "fam-paternal-extra", partnerIds: ["pgf", "pgm"], childrenIds: ["father", "extra3"] },
    ];
    const extraPeople = [
      ...people,
      { id: "extra1", firstName: "Extra", lastName: "One" },
      { id: "extra2", firstName: "Extra", lastName: "Two" },
      { id: "extra3", firstName: "Extra", lastName: "Three" },
    ];
    // Replace fam-parents (which also lists me/sibling1) so childrenIds
    // for that partner pair aren't declared twice across two families.
    const dedupedFamilies = extraFamilies.filter((f) => f.id !== "fam-parents");
    const extraResult = radialLayout(extraPeople, dedupedFamilies, "me");

    const positions = extraResult.nodes.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`);
    expect(new Set(positions).size).toBe(positions.length);
  });

  it("connects every ancestor relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("pgf", "father"))).toBe(true);
    expect(edgeSet.has(edgeKey("father", "sibling1"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "sibling1"))).toBe(true);
  });
});
