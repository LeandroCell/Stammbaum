import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const RING_RADIUS_STEP = 180;
const MAX_GENERATIONS = 5;
const MIN_ARC_PER_CARD = 200;
// A full half-turn: the root split (the centered person's own two parents)
// lands exactly ±90° from straight up, i.e. due right / due left — level
// with the centered person, not climbing diagonally toward it.
const ROOT_SPREAD = Math.PI;

// A ring at generation g holds up to 2^g ancestors spread over a half circle,
// so its radius has to grow with that count (arc length = radius * PI must fit
// 2^g cards) — a purely linear radius makes the outer rings overlap from
// generation 4 on.
function ringRadius(generation: number): number {
  if (generation === 0) return 0;
  return Math.max(generation * RING_RADIUS_STEP, (2 ** generation * MIN_ARC_PER_CARD) / Math.PI);
}

// ponytail: pure ancestor fan chart, per spec section 4 — no descendants,
// no siblings, no partner (blood line only): the centered person plus their
// parents, grandparents, etc.
//
// Each person is placed at a fixed `angle` (0 = straight up from the
// center); their own two parents split off symmetrically around THAT same
// angle, each offset by half of `spread` — not biased toward one edge of a
// shrinking range like a naive binary subdivision would be. That keeps the
// direct parents exactly level with the centered person (angle ±90° at the
// root, via `x = radius*sin(angle)`, `y = -radius*cos(angle)`) and every
// further generation fans outward evenly above and below its own parent's
// angle, instead of drifting continuously upward on one diagonal.
// Father's whole subtree always uses angle = parent's angle + spread/2,
// mother's angle = parent's angle - spread/2, so the sign of the angle
// (and therefore x, i.e. "Vater rechts, Mutter links") is preserved at
// every generation without needing to track it separately.
function layoutRadialAncestors(
  personId: string,
  generation: number,
  angle: number,
  spread: number,
  maps: FamilyMaps,
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): void {
  const radius = ringRadius(generation);
  const x = radius * Math.sin(angle);
  const y = -radius * Math.cos(angle);
  // ponytail: "+ 0" normalizes the -0 that `-generation` produces for the
  // center person (generation 0) — see the same fix in classicLayout.ts.
  nodes.set(personId, { personId, x, y, generation: -generation + 0 });

  if (generation >= MAX_GENERATIONS) return;
  const parentFamily = maps.familyByChildId.get(personId);
  if (!parentFamily) return;

  const [fatherId, motherId] = orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById);
  const half = spread / 2;

  if (fatherId) {
    edges.push({ id: `${fatherId}->${personId}`, fromPersonId: fatherId, toPersonId: personId, kind: "parent-child" });
    layoutRadialAncestors(fatherId, generation + 1, angle + half, half, maps, nodes, edges);
  }
  if (motherId) {
    edges.push({ id: `${motherId}->${personId}`, fromPersonId: motherId, toPersonId: personId, kind: "parent-child" });
    layoutRadialAncestors(motherId, generation + 1, angle - half, half, maps, nodes, edges);
  }
}

export const radialLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  layoutRadialAncestors(centerPersonId, 0, 0, ROOT_SPREAD, maps, nodes, edges);

  return { nodes: Array.from(nodes.values()), edges };
};
