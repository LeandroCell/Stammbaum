import { describe, it, expect } from "vitest";
import { buildFamilyConnectors } from "./familyConnectors";
import type { Family } from "../../data/types";
import type { PositionedNode } from "../../layout/layout.types";

function node(personId: string, x: number, y: number): PositionedNode {
  return { personId, x, y, generation: 0 };
}

describe("buildFamilyConnectors 'elbow' style (classic view)", () => {
  const family: Family = { id: "fam-1", partnerIds: ["father", "mother"], childrenIds: ["child"] };

  it("first connects the two parents to each other with a straight line", () => {
    const nodeById = new Map([
      ["father", node("father", 100, 0)],
      ["mother", node("mother", -100, 0)],
      ["child", node("child", 0, 160)],
    ]);
    const segments = buildFamilyConnectors([family], nodeById, "elbow");
    const parentLine = segments.find((s) => s.id === "fam-1-parents");
    expect(parentLine).toEqual({ id: "fam-1-parents", x1: 100, y1: 0, x2: -100, y2: 0 });
  });

  it("routes from the parents' midpoint to the child, not from each parent directly", () => {
    const nodeById = new Map([
      ["father", node("father", 100, 0)],
      ["mother", node("mother", -100, 0)],
      ["child", node("child", 0, 160)],
    ]);
    const segments = buildFamilyConnectors([family], nodeById, "elbow");
    const stem = segments.find((s) => s.id === "fam-1-stem")!;
    expect(stem.x1).toBe(0);
    expect(stem.y1).toBe(0);
    // Nothing should connect a child straight to a single parent's own x.
    expect(segments.some((s) => s.x1 === 100 && s.x2 === 0 && s.y2 === 160)).toBe(false);
    expect(segments.some((s) => s.x1 === -100 && s.x2 === 0 && s.y2 === 160)).toBe(false);
  });

  it("drops from a shared bus to every child when there are several", () => {
    const twoKids: Family = { id: "fam-2", partnerIds: ["father", "mother"], childrenIds: ["a", "b"] };
    const nodeById = new Map([
      ["father", node("father", 50, 0)],
      ["mother", node("mother", -50, 0)],
      ["a", node("a", -110, 160)],
      ["b", node("b", 110, 160)],
    ]);
    const segments = buildFamilyConnectors([twoKids], nodeById, "elbow");
    const bus = segments.find((s) => s.id === "fam-2-bus")!;
    expect(bus.x1).toBe(-110);
    expect(bus.x2).toBe(110);
    expect(segments.find((s) => s.id === "fam-2-drop-a")).toBeTruthy();
    expect(segments.find((s) => s.id === "fam-2-drop-b")).toBeTruthy();
  });

  it("still draws the marriage line for a childless couple", () => {
    const noKids: Family = { id: "fam-3", partnerIds: ["father", "mother"], childrenIds: [] };
    const nodeById = new Map([
      ["father", node("father", 100, 0)],
      ["mother", node("mother", -100, 0)],
    ]);
    const segments = buildFamilyConnectors([noKids], nodeById, "elbow");
    expect(segments).toEqual([{ id: "fam-3-parents", x1: 100, y1: 0, x2: -100, y2: 0 }]);
  });

  it("connects a child to a single known parent without a marriage line", () => {
    const singleParent: Family = { id: "fam-4", partnerIds: ["mother"], childrenIds: ["child"] };
    const nodeById = new Map([
      ["mother", node("mother", 0, 0)],
      ["child", node("child", 0, 160)],
    ]);
    const segments = buildFamilyConnectors([singleParent], nodeById, "elbow");
    expect(segments.some((s) => s.id === "fam-4-parents")).toBe(false);
    expect(segments.some((s) => s.id === "fam-4-stem")).toBe(true);
  });

  it("skips a family whose members are entirely outside the current layout", () => {
    const segments = buildFamilyConnectors([family], new Map(), "elbow");
    expect(segments).toEqual([]);
  });
});

describe("buildFamilyConnectors 'direct' style (radial view)", () => {
  const family: Family = { id: "fam-1", partnerIds: ["father", "mother"], childrenIds: ["child"] };

  it("connects each parent straight to the child, without a line between the parents", () => {
    const nodeById = new Map([
      ["father", node("father", 100, -50)],
      ["mother", node("mother", -100, -50)],
      ["child", node("child", 0, 0)],
    ]);
    const segments = buildFamilyConnectors([family], nodeById, "direct");

    expect(segments).toContainEqual({ id: "fam-1-direct-father-child", x1: 100, y1: -50, x2: 0, y2: 0 });
    expect(segments).toContainEqual({ id: "fam-1-direct-mother-child", x1: -100, y1: -50, x2: 0, y2: 0 });
    expect(segments.some((s) => s.id.includes("parents") || s.id.includes("stem") || s.id.includes("bus"))).toBe(
      false
    );
    expect(segments).toHaveLength(2);
  });

  it("connects a single known parent directly to the child", () => {
    const singleParent: Family = { id: "fam-4", partnerIds: ["mother"], childrenIds: ["child"] };
    const nodeById = new Map([
      ["mother", node("mother", 0, -50)],
      ["child", node("child", 0, 0)],
    ]);
    const segments = buildFamilyConnectors([singleParent], nodeById, "direct");
    expect(segments).toEqual([{ id: "fam-4-direct-mother-child", x1: 0, y1: -50, x2: 0, y2: 0 }]);
  });

  it("never draws a line between the parents themselves, even without a visible child", () => {
    const noKids: Family = { id: "fam-3", partnerIds: ["father", "mother"], childrenIds: [] };
    const nodeById = new Map([
      ["father", node("father", 100, 0)],
      ["mother", node("mother", -100, 0)],
    ]);
    const segments = buildFamilyConnectors([noKids], nodeById, "direct");
    expect(segments).toEqual([]);
  });

  it("skips a family whose members are entirely outside the current layout", () => {
    const segments = buildFamilyConnectors([family], new Map(), "direct");
    expect(segments).toEqual([]);
  });
});
