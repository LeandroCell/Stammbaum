import { describe, it, expect } from "vitest";
import { networkLayout } from "./networkLayout";
import { people, families } from "../data/sampleData";
import { buildDynasty, countOverlaps } from "./largeTree.fixture";

describe("networkLayout large trees", () => {
  const dynasty = buildDynasty(5);
  const result = networkLayout(dynasty.people, dynasty.families, "p1");

  it("wraps wide generations into several rows instead of one enormous row", () => {
    const maxWidth = Math.max(...result.nodes.map((n) => n.x)) - Math.min(...result.nodes.map((n) => n.x));
    expect(maxWidth).toBeLessThanOrEqual(9 * 220);
  });

  it("orders each generation so parent-child lines rarely cross", () => {
    // Rank within the generation (row by row) so wrapped rows count as one line.
    const rank = new Map<string, number>();
    for (const g of new Set(result.nodes.map((n) => n.generation)))
      result.nodes
        .filter((n) => n.generation === g)
        .sort((a, b) => a.y - b.y || a.x - b.x)
        .forEach((n, i) => rank.set(n.personId, i));
    const at = new Map(result.nodes.map((n) => [n.personId, { ...n, x: rank.get(n.personId)! }]));
    const pc = result.edges
      .filter((e) => e.kind === "parent-child")
      .map((e) => [at.get(e.fromPersonId)!, at.get(e.toPersonId)!]);
    let crossings = 0;
    for (let i = 0; i < pc.length; i++)
      for (let j = i + 1; j < pc.length; j++) {
        const [a, b] = [pc[i], pc[j]];
        if (a[0].generation !== b[0].generation || a[1].generation !== b[1].generation) continue;
        if ((a[0].x - b[0].x) * (a[1].x - b[1].x) < 0) crossings++;
      }
    // BFS-discovery order gave ~6000 here; barycenter ordering ~200.
    expect(crossings).toBeLessThan(400);
  });

  it("never overlaps cards and keeps generations in order top to bottom", () => {
    expect(countOverlaps(result.nodes)).toBe(0);
    const yByGeneration = new Map<number, number[]>();
    for (const n of result.nodes) yByGeneration.set(n.generation, [...(yByGeneration.get(n.generation) ?? []), n.y]);
    const gens = [...yByGeneration.keys()].sort((a, b) => a - b);
    for (let i = 1; i < gens.length; i++) {
      expect(Math.min(...yByGeneration.get(gens[i])!)).toBeGreaterThan(Math.max(...yByGeneration.get(gens[i - 1])!));
    }
  });
});

describe("networkLayout in-law siblings", () => {
  const person = (id: string) => ({ id, firstName: id, lastName: "X" });
  const ids = ["b", "c", "i", "s", "andrea", "franco", "martina", "anja", "daniela", "kid"];
  const fams = [
    { id: "f1", partnerIds: ["b", "c"], childrenIds: ["andrea", "franco"] },
    { id: "f2", partnerIds: ["i", "s"], childrenIds: ["anja", "daniela", "martina"] },
    { id: "f3", partnerIds: ["franco", "martina"], childrenIds: ["kid"] },
  ];

  it("keeps a partner's siblings next to the partner, not across the whole row", () => {
    const r = networkLayout(ids.map(person), fams, "franco");
    const x = new Map(r.nodes.map((n) => [n.personId, n.x]));
    const row = ["andrea", "franco", "martina", "anja", "daniela"].sort((a, b) => x.get(a)! - x.get(b)!);
    // The two families form contiguous blocks and the couple touches.
    expect(row.slice(0, 2)).toEqual(expect.arrayContaining(["andrea", "franco"]));
    expect(Math.abs(x.get("franco")! - x.get("martina")!)).toBe(220);
  });
});

describe("networkLayout", () => {
  const result = networkLayout(people, families, "me");
  const nodeById = new Map(result.nodes.map((n) => [n.personId, n]));

  it("includes every person reachable from the center, unlike the classic view", () => {
    expect([...nodeById.keys()].sort()).toEqual(people.map((p) => p.id).sort());
  });

  it("places the center person at generation 0", () => {
    expect(nodeById.get("me")).toMatchObject({ x: 0, y: 0, generation: 0 });
  });

  it("places a sibling at the same generation as the center person", () => {
    expect(nodeById.get("sibling1")?.generation).toBe(0);
  });

  it("places parents one generation up and children one generation down", () => {
    expect(nodeById.get("father")?.generation).toBe(-1);
    expect(nodeById.get("mother")?.generation).toBe(-1);
    expect(nodeById.get("child1")?.generation).toBe(1);
  });

  it("places grandparents two generations up", () => {
    expect(nodeById.get("pgf")?.generation).toBe(-2);
    expect(nodeById.get("mgm")?.generation).toBe(-2);
  });

  it("has no duplicate edges between the same two people", () => {
    const ids = result.edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("connects the center person to their partner with a partner edge", () => {
    const partnerEdge = result.edges.find(
      (e) => e.kind === "partner" && [e.fromPersonId, e.toPersonId].includes("me") && [e.fromPersonId, e.toPersonId].includes("partner")
    );
    expect(partnerEdge).toBeDefined();
  });
});
