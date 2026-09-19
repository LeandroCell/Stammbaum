import { describe, it, expect } from "vitest";
import { radialLayout } from "./radialLayout";
import { people, families } from "../data/sampleData";
import { buildDynasty, countOverlaps } from "./largeTree.fixture";

describe("radialLayout large trees", () => {
  it("keeps deep generations from overlapping by growing the ring radius with the slot count", () => {
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

  it("includes only the center's direct blood-line ancestors — no siblings, no partner, no descendants", () => {
    const expectedIds = ["me", "father", "mother", "pgf", "pgm", "mgf", "mgm"];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("places father's side further right on every generation, mother's side further left", () => {
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;
    const pgf = nodeById.get("pgf")!;
    const mgf = nodeById.get("mgf")!;
    expect(pgf.x).toBeGreaterThan(father.x);
    expect(mgf.x).toBeLessThan(mother.x);
  });

  it("connects every ancestor relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("pgf", "father"))).toBe(true);
    expect(edgeSet.has(edgeKey("mgf", "mother"))).toBe(true);
  });
});
