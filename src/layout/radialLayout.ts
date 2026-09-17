import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "./familyGraph";

const RING_RADIUS_STEP = 180;
const PARTNER_SPACING = 200;
const MAX_GENERATIONS = 5;

// ponytail: pure ancestor fan chart, per spec section 4 — no descendants,
// no siblings. The fan only spans the top semicircle (angle -90°..+90°,
// i.e. left-up-right), leaving the bottom half free for the center
// person's partner(s) — a full 360° fan would place generation-1 father
// directly on the same horizontal ray the partner sits on, overlapping it.
// Father's whole subtree always occupies the half of the angular slice
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
  const radius = generation * RING_RADIUS_STEP;
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

export const radialLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  layoutRadialAncestors(centerPersonId, 0, -Math.PI / 2, Math.PI / 2, maps, nodes, edges);

  // Partner(s) go below the center, in the semicircle the ancestor fan
  // never uses.
  const centerFamilies = maps.familiesByPartnerId.get(centerPersonId) ?? [];
  const partnerIds = centerFamilies
    .flatMap((f) => f.partnerIds)
    .filter((id) => id !== centerPersonId);
  partnerIds.forEach((partnerId, index) => {
    nodes.set(partnerId, {
      personId: partnerId,
      x: 0,
      y: PARTNER_SPACING * (index + 1),
      generation: 0,
    });
    edges.push({
      id: `${centerPersonId}-${partnerId}`,
      fromPersonId: centerPersonId,
      toPersonId: partnerId,
      kind: "partner",
    });
  });

  return { nodes: Array.from(nodes.values()), edges };
};
