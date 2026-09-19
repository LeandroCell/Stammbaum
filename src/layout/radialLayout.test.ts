import { describe, it, expect } from "vitest";
import { radialLayout } from "./radialLayout";
import { people, families } from "../data/sampleData";
import { buildDynasty, countOverlaps } from "./largeTree.fixture";

describe("radialLayout large trees", () => {
  it("keeps deep generations from overlapping", () => {
    const dynasty = buildDynasty(6);
    const deepest = dynasty.people[dynasty.people.length - 1].id;
    const result = radialLayout(dynasty.people, dynasty.families, deepest);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(countOverlaps(result.nodes)).toBe(0);
  });
});

describe("radialLayout", () => {
  const result = radialLayout(people, families, "me");
  const nodeById = new Map(result.nodes.map((n) => [n.personId, n]));

  it("places the center person at the origin", () => {
    expect(nodeById.get("me")).toMatchObject({ x: 0, y: 0, generation: 0 });
  });

  it("places the direct parents exactly level with the centered person — father right, mother left", () => {
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;
    expect(father.x).toBeGreaterThan(0);
    expect(mother.x).toBeLessThan(0);
    expect(father.y).toBe(0);
    expect(mother.y).toBe(0);
    expect(father.generation).toBe(-1);
    expect(mother.generation).toBe(-1);
  });

  it("places grandparents further out than parents, on the same side", () => {
    const father = nodeById.get("father")!;
    const pgf = nodeById.get("pgf")!;
    const mother = nodeById.get("mother")!;
    const mgf = nodeById.get("mgf")!;
    expect(pgf.x).toBeGreaterThan(father.x);
    expect(mgf.x).toBeLessThan(mother.x);
    expect(pgf.generation).toBe(-2);
  });

  it("fans grandparents symmetrically above and below their own child's row, not diagonally upward", () => {
    const father = nodeById.get("father")!;
    const pgf = nodeById.get("pgf")!;
    const pgm = nodeById.get("pgm")!;
    expect(pgf.y).toBeGreaterThan(father.y);
    expect(pgm.y).toBeLessThan(father.y);
    expect(Math.abs(pgf.y - father.y)).toBeCloseTo(Math.abs(pgm.y - father.y));
  });

  it("includes only the center's direct blood-line ancestors — no siblings, no partner, no descendants", () => {
    const expectedIds = ["me", "father", "mother", "pgf", "pgm", "mgf", "mgm"];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("connects every ancestor relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("pgf", "father"))).toBe(true);
    expect(edgeSet.has(edgeKey("mgf", "mother"))).toBe(true);
  });

  it("shows only the centered person when nobody's ancestors are known", () => {
    const lonely = [{ id: "solo", firstName: "Solo", lastName: "X" }];
    const result = radialLayout(lonely, [], "solo");
    expect(result.nodes).toEqual([{ personId: "solo", x: 0, y: 0, generation: 0 }]);
  });
});
