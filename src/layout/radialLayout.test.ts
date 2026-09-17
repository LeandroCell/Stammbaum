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

  it("places the center's sibling away from both the ancestor fan and the partner slot", () => {
    const sibling = nodeById.get("sibling1")!;
    const partner = nodeById.get("partner")!;
    expect(sibling.generation).toBe(0);
    expect(sibling.x).not.toBe(partner.x);
    expect(sibling.y).not.toBe(partner.y);
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
