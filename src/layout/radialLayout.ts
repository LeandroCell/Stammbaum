import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const RING_RADIUS_STEP = 180;
const MAX_GENERATIONS = 5;
const MIN_ARC_PER_CARD = 200;

// A ring at generation g holds up to 2^g ancestors spread over a half circle,
// so its radius has to grow with that count (arc length = radius * PI must fit
// 2^g cards) — a purely linear radius makes the outer rings overlap from
// generation 4 on.
function ringRadius(generation: number): number {
  if (generation === 0) return 0;
  return Math.max(generation * RING_RADIUS_STEP, (2 ** generation * MIN_ARC_PER_CARD) / Math.PI);
}

// ponytail: pure ancestor fan chart, per spec section 4 — no descendants,
// no siblings, no partner (blood line only). The fan only spans the top
// semicircle (angle -90°..+90°, i.e. left-up-right), the classic fan-chart
// shape with the centered person at the bottom point. Father's whole
// subtree always occupies the half of the angular slice
// closer to angleEnd ("right" via the x/y formula below), mother's the
// half closer to angleStart ("left"), so "Vater rechts, Mutter links"
// holds at every generation, not just the first one.
function layoutRadialAncestors(
  personId: string,
  generation: number,
  angleStart: number,
  angleEnd: number,
  maps: FamilyMaps,
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): void {
  const angle = (angleStart + angleEnd) / 2;
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
  const mid = (angleStart + angleEnd) / 2;

  if (fatherId) {
    edges.push({ id: `${fatherId}->${personId}`, fromPersonId: fatherId, toPersonId: personId, kind: "parent-child" });
    layoutRadialAncestors(fatherId, generation + 1, mid, angleEnd, maps, nodes, edges);
  }
  if (motherId) {
    edges.push({ id: `${motherId}->${personId}`, fromPersonId: motherId, toPersonId: personId, kind: "parent-child" });
    layoutRadialAncestors(motherId, generation + 1, angleStart, mid, maps, nodes, edges);
  }
}

// ponytail: unlike classicLayout, this view never shows siblings or the
// center's partner — per spec it's a pure ancestor fan (blood line only):
// the centered person plus their parents, grandparents, etc., nothing else.
export const radialLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  layoutRadialAncestors(centerPersonId, 0, -Math.PI / 2, Math.PI / 2, maps, nodes, edges);

  return { nodes: Array.from(nodes.values()), edges };
};
