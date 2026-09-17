import { describe, it, expect } from "vitest";
import { networkLayout } from "./networkLayout";
import { people, families } from "../data/sampleData";

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
