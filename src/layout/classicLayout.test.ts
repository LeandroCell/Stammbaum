import { describe, it, expect } from "vitest";
import { classicLayout } from "./classicLayout";
import { people, families } from "../data/sampleData";

describe("classicLayout", () => {
  const result = classicLayout(people, families, "me");
  const nodeById = new Map(result.nodes.map((n) => [n.personId, n]));

  it("places the center person at the origin", () => {
    expect(nodeById.get("me")).toMatchObject({ x: 0, y: 0, generation: 0 });
  });

  it("places the father to the right and the mother to the left", () => {
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;
    expect(father.x).toBeGreaterThan(mother.x);
    expect(father.generation).toBe(-1);
    expect(mother.generation).toBe(-1);
  });

  it("places the paternal grandfather further out than the father", () => {
    const father = nodeById.get("father")!;
    const paternalGrandfather = nodeById.get("pgf")!;
    expect(Math.abs(paternalGrandfather.x)).toBeGreaterThanOrEqual(Math.abs(father.x));
    expect(paternalGrandfather.generation).toBe(-2);
  });

  it("places children below the center person", () => {
    const child = nodeById.get("child1")!;
    expect(child.y).toBeGreaterThan(0);
    expect(child.generation).toBe(1);
  });

  it("connects every family relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("me", "child1"))).toBe(true);
  });

  it("includes the ancestor chain, the partner, and the descendants of the center person", () => {
    const expectedIds = ["me", "father", "mother", "pgf", "pgm", "mgf", "mgm", "partner", "child1"];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });
});
