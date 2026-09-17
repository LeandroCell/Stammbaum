import { describe, it, expect } from "vitest";
import { computeFitTransform } from "./fitTransform";

describe("computeFitTransform", () => {
  it("centers a single node at scale 1 in the viewport", () => {
    const result = computeFitTransform([{ x: 0, y: 0 }], 1000, 800, 180, 72, 80);
    expect(result.k).toBe(1);
    expect(result.x).toBe(500);
    expect(result.y).toBe(400);
  });

  it("shrinks the scale to fit a wide spread of nodes within the viewport", () => {
    const nodes = [
      { x: -2000, y: 0 },
      { x: 2000, y: 0 },
    ];
    const result = computeFitTransform(nodes, 1000, 800, 180, 72, 80);
    expect(result.k).toBeLessThan(1);

    // Both extreme points, once transformed, should land symmetrically
    // around the viewport's horizontal center — i.e. everyone fits.
    const leftScreenX = -2000 * result.k + result.x;
    const rightScreenX = 2000 * result.k + result.x;
    expect((leftScreenX + rightScreenX) / 2).toBeCloseTo(500, 5);
  });

  it("never zooms in past 1x for a sparse tree", () => {
    const nodes = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
    ];
    const result = computeFitTransform(nodes, 2000, 2000, 180, 72, 80);
    expect(result.k).toBe(1);
  });

  it("falls back to a centered identity transform when there are no nodes", () => {
    const result = computeFitTransform([], 1000, 800, 180, 72, 80);
    expect(result).toEqual({ x: 500, y: 400, k: 1 });
  });

  it("clamps to the zoom behavior's own scale floor (0.1) for an extremely spread-out tree", () => {
    const nodes = [
      { x: -1000000, y: 0 },
      { x: 1000000, y: 0 },
    ];
    const result = computeFitTransform(nodes, 1000, 800, 180, 72, 80);
    expect(result.k).toBe(0.1);
  });
});
