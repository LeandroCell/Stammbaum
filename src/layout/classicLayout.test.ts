import { describe, it, expect } from "vitest";
import { classicLayout } from "./classicLayout";
import { people, families } from "../data/sampleData";
import { buildDynasty, countOverlaps } from "./largeTree.fixture";

describe("classicLayout large trees", () => {
  const dynasty = buildDynasty();

  it("has no overlapping cards when centered on a deep descendant", () => {
    const deep = dynasty.people[dynasty.people.length - 1].id;
    expect(countOverlaps(classicLayout(dynasty.people, dynasty.families, deep).nodes)).toBe(0);
  });

  it("never shows the centered person's own descendants", () => {
    // f1's children are the root couple's direct descendants.
    const result = classicLayout(dynasty.people, dynasty.families, "p1");
    const ids = new Set(result.nodes.map((n) => n.personId));
    for (const childId of dynasty.families[0].childrenIds) {
      expect(ids.has(childId)).toBe(false);
    }
  });

  it("terminates on cyclic data instead of recursing forever", () => {
    const cyclePeople = [
      { id: "a", firstName: "A", lastName: "X" },
      { id: "b", firstName: "B", lastName: "X" },
    ];
    const cycleFamilies = [
      { id: "f1", partnerIds: ["a"], childrenIds: ["b"] },
      { id: "f2", partnerIds: ["b"], childrenIds: ["a"] },
    ];
    expect(() => classicLayout(cyclePeople, cycleFamilies, "a")).not.toThrow();
  });
});

describe("classicLayout partner's siblings", () => {
  const person = (id: string) => ({ id, firstName: id, lastName: "X" });
  const fams = [
    { id: "f1", partnerIds: ["b", "c"], childrenIds: ["andrea", "franco"] },
    { id: "f2", partnerIds: ["i", "s"], childrenIds: ["anja", "daniela", "martina"] },
    { id: "f3", partnerIds: ["franco", "martina"], childrenIds: ["kid"] },
  ];

  it("does not show the partner's own siblings, only the center's", () => {
    const r = classicLayout(["b", "c", "i", "s", "andrea", "franco", "martina", "anja", "daniela", "kid"].map(person), fams, "franco");
    const ids = r.nodes.map((n) => n.personId);
    expect(ids).toContain("andrea");
    expect(ids).toContain("martina");
    expect(ids).not.toContain("anja");
    expect(ids).not.toContain("daniela");
  });

  it("does not show the centered person's own children", () => {
    const r = classicLayout(["b", "c", "i", "s", "andrea", "franco", "martina", "anja", "daniela", "kid"].map(person), fams, "franco");
    expect(r.nodes.map((n) => n.personId)).not.toContain("kid");
  });
});

describe("classicLayout ancestor siblings", () => {
  it("keeps each grandparent's siblings next to that grandparent, on the outer side of the couple", () => {
    const person = (id: string) => ({ id, firstName: id, lastName: "X" });
    const r = classicLayout(
      ["b", "c", "i", "s", "andrea", "franco", "martina", "anja", "daniela", "chiara", "emilia"].map(person),
      [
        { id: "f1", partnerIds: ["b", "c"], childrenIds: ["andrea", "franco"] },
        { id: "f2", partnerIds: ["i", "s"], childrenIds: ["anja", "daniela", "martina"] },
        { id: "f3", partnerIds: ["franco", "martina"], childrenIds: ["chiara"] },
        { id: "f4", partnerIds: ["chiara"], childrenIds: ["emilia"] },
      ],
      "emilia"
    );
    const x = new Map(r.nodes.map((n) => [n.personId, n.x]));
    const order = ["anja", "daniela", "martina", "franco", "andrea"].sort((a, b) => x.get(a)! - x.get(b)!);
    // franco is the father (right), martina the mother (left); each side's siblings stay outside.
    expect(order.indexOf("martina")).toBeGreaterThan(order.indexOf("anja"));
    expect(order.indexOf("martina")).toBeGreaterThan(order.indexOf("daniela"));
    expect(order.indexOf("franco")).toBeLessThan(order.indexOf("andrea"));
    expect(order.indexOf("martina") + 1).toBe(order.indexOf("franco"));
  });
});

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

  it("does not show the center's own children (descendants)", () => {
    expect(nodeById.has("child1")).toBe(false);
  });

  it("connects every ancestor relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
  });

  it("includes the ancestor chain, their siblings, and the center's partner — but no descendants", () => {
    const expectedIds = ["me", "sibling1", "father", "mother", "pgf", "pgm", "mgf", "mgm", "partner"];
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

describe("classicLayout showSiblings option", () => {
  it("omits siblings (the center's own and every ancestor's) when showSiblings is false", () => {
    const result = classicLayout(people, families, "me", { showSiblings: false });
    const ids = result.nodes.map((n) => n.personId);
    expect(ids).not.toContain("sibling1");
    expect(ids.sort()).toEqual(["me", "father", "mother", "pgf", "pgm", "mgf", "mgm", "partner"].sort());
  });

  it("still includes siblings when showSiblings is omitted (defaults to true)", () => {
    const result = classicLayout(people, families, "me");
    expect(result.nodes.map((n) => n.personId)).toContain("sibling1");
  });
});
