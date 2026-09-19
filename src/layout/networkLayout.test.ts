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
