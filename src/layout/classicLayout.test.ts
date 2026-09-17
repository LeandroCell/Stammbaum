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

  it("includes the ancestor chain, their siblings, the partner, and the descendants of the center person", () => {
    const expectedIds = [
      "me",
      "sibling1",
      "father",
      "mother",
      "pgf",
      "pgm",
      "mgf",
      "mgm",
      "partner",
      "child1",
    ];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });

  it("places the center person's sibling at the same generation, without overlapping the partner", () => {
    const me = nodeById.get("me")!;
    const sibling = nodeById.get("sibling1")!;
    const partner = nodeById.get("partner")!;
    expect(sibling.generation).toBe(0);
    expect(sibling.x).not.toBe(partner.x);
    expect(sibling.x).toBeLessThan(me.x);
  });

  it("connects the sibling to both shared parents", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "sibling1"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "sibling1"))).toBe(true);
  });

  it("places many siblings across different branches without any overlapping position", () => {
    // Several generations each with multiple extra children — a naive
    // per-node offset (placing each branch's siblings relative only to
    // that branch's own x) would collide here, since father's and
    // mother's own extra siblings, plus the grandparents', all compete
    // for the same horizontal space.
    const extraPeople = [
      ...people,
      { id: "auntUncle1", firstName: "Aunt", lastName: "One" },
      { id: "auntUncle2", firstName: "Aunt", lastName: "Two" },
      { id: "greatAunt1", firstName: "Great", lastName: "One" },
      { id: "greatAunt2", firstName: "Great", lastName: "Two" },
      { id: "sibling2", firstName: "Sib", lastName: "Two" },
      { id: "sibling3", firstName: "Sib", lastName: "Three" },
    ];
    const extraFamilies = families.map((f) =>
      f.id === "fam-parents"
        ? { ...f, childrenIds: [...f.childrenIds, "sibling2", "sibling3"] }
        : f.id === "fam-paternal"
          ? { ...f, childrenIds: [...f.childrenIds, "auntUncle1", "auntUncle2"] }
          : f.id === "fam-maternal"
            ? { ...f, childrenIds: [...f.childrenIds, "greatAunt1", "greatAunt2"] }
            : f
    );

    const result = classicLayout(extraPeople, extraFamilies, "me");
    const positions = result.nodes.map((n) => `${n.x.toFixed(1)},${n.y.toFixed(1)}`);
    expect(new Set(positions).size).toBe(positions.length);
  });
});
