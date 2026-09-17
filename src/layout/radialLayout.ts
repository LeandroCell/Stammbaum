import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const RING_RADIUS_STEP = 180;
const PARTNER_SPACING = 200;
const SIBLING_ROW_SPACING = 200;
const SIBLING_ROW_GAP = 140;
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

// Same widening as classicLayout's addAncestorSiblings: shows the center's
// own siblings and every ancestor's siblings (aunts/uncles, great-aunts/
// uncles, ...), so anyone connected to the tree is visible somewhere, not
// only the people who happen to be someone's direct parent.
//
// ponytail: siblings are leaves, not expanded further. Rather than fanning
// each sibling out tangentially from its own ancestor's position on the
// ring — which could still collide with a DIFFERENT ancestor's siblings
// sharing that same ring, or with the ring itself — every addition across
// the whole tree goes into one dedicated row below everything else,
// evenly spaced. That sacrifices a bit of "everything is a circular fan"
// purity for a layout that's collision-free regardless of how many
// siblings exist at any generation.
function addAncestorSiblings(nodes: Map<string, PositionedNode>, edges: LayoutEdge[], maps: FamilyMaps): void {
  const spineSnapshot = Array.from(nodes.values()).filter((n) => n.generation <= 0);
  const additions: { siblingId: string; generation: number; partnerIds: string[] }[] = [];

  for (const node of spineSnapshot) {
    const parentFamily = maps.familyByChildId.get(node.personId);
    if (!parentFamily) continue;
    const siblingIds = parentFamily.childrenIds.filter(
      (id) => id !== node.personId && !nodes.has(id) && !additions.some((a) => a.siblingId === id)
    );
    for (const siblingId of siblingIds) {
      additions.push({ siblingId, generation: node.generation, partnerIds: parentFamily.partnerIds });
    }
  }

  if (additions.length === 0) return;

  const maxY = Math.max(0, ...Array.from(nodes.values()).map((n) => n.y));
  const rowY = maxY + SIBLING_ROW_GAP;
  const startX = -((additions.length - 1) * SIBLING_ROW_SPACING) / 2;

  additions.forEach(({ siblingId, generation, partnerIds }, index) => {
    nodes.set(siblingId, { personId: siblingId, x: startX + index * SIBLING_ROW_SPACING, y: rowY, generation });
    for (const parentId of partnerIds) {
      edges.push({
        id: `${parentId}->${siblingId}`,
        fromPersonId: parentId,
        toPersonId: siblingId,
        kind: "parent-child",
      });
    }
  });
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

  addAncestorSiblings(nodes, edges, maps);

  return { nodes: Array.from(nodes.values()), edges };
};
