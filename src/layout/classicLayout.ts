import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const GENERATION_HEIGHT = 160;
const NODE_SPACING = 220;
const MAX_ANCESTOR_GENERATIONS = 5;
const MAX_DESCENDANT_GENERATIONS = 5;

function layoutAncestors(
  personId: string,
  generation: number,
  maps: FamilyMaps,
  nextLeafX: { value: number },
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): number {
  const parentFamily =
    generation < MAX_ANCESTOR_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById)
    : [undefined, undefined];

  if (!fatherId && !motherId) {
    const x = nextLeafX.value;
    nextLeafX.value += NODE_SPACING;
    // ponytail: "+ 0" normalizes the -0 that `-generation` produces when
    // generation is 0 (the center person) — a JS negative-zero artifact,
    // not a geometry change (-0 === 0 numerically, but fails Object.is-based
    // matchers like toMatchObject).
    nodes.set(personId, { personId, x, y: -generation * GENERATION_HEIGHT + 0, generation: -generation + 0 });
    return x;
  }

  const motherX = motherId
    ? layoutAncestors(motherId, generation + 1, maps, nextLeafX, nodes, edges)
    : undefined;
  const fatherX = fatherId
    ? layoutAncestors(fatherId, generation + 1, maps, nextLeafX, nodes, edges)
    : undefined;

  for (const parentId of [fatherId, motherId]) {
    if (parentId) {
      edges.push({
        id: `${parentId}->${personId}`,
        fromPersonId: parentId,
        toPersonId: personId,
        kind: "parent-child",
      });
    }
  }

  const xs = [motherX, fatherX].filter((v): v is number => v !== undefined);
  const x = xs.reduce((a, b) => a + b, 0) / xs.length;
  // ponytail: same -0 normalization as the leaf branch above.
  nodes.set(personId, { personId, x, y: -generation * GENERATION_HEIGHT + 0, generation: -generation + 0 });
  return x;
}

// Widens the ancestor spine to include siblings at every generation (the
// center's own siblings, aunts/uncles, great-aunts/uncles, ...) so a person
// is visible as soon as they're connected to the tree at all, not only when
// they happen to be someone's direct parent.
//
// ponytail: siblings added here are leaves — their own descendants aren't
// expanded (center on one of them to see their line). Offset to the left of
// their spine sibling to avoid the center's partner slot, which sits to the
// right; some overlap risk remains for deep generations with many siblings,
// same accepted-ceiling tradeoff as the descendant spacing above.
function addAncestorSiblings(
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[],
  maps: FamilyMaps
): void {
  const spineSnapshot = Array.from(nodes.values()).filter((n) => n.generation <= 0);
  for (const node of spineSnapshot) {
    const parentFamily = maps.familyByChildId.get(node.personId);
    if (!parentFamily) continue;
    const siblingIds = parentFamily.childrenIds.filter((id) => id !== node.personId && !nodes.has(id));
    siblingIds.forEach((siblingId, index) => {
      nodes.set(siblingId, {
        personId: siblingId,
        x: node.x - NODE_SPACING * (index + 1),
        y: node.y,
        generation: node.generation,
      });
      for (const parentId of parentFamily.partnerIds) {
        edges.push({
          id: `${parentId}->${siblingId}`,
          fromPersonId: parentId,
          toPersonId: siblingId,
          kind: "parent-child",
        });
      }
    });
  }
}

function layoutDescendants(
  personId: string,
  generation: number,
  centerX: number,
  maps: FamilyMaps,
  nextLeafX: { value: number },
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): void {
  if (generation > MAX_DESCENDANT_GENERATIONS) return;
  const partnerFamilies = maps.familiesByPartnerId.get(personId) ?? [];
  const childIds = partnerFamilies.flatMap((f) => f.childrenIds);

  if (!nodes.has(personId)) {
    nodes.set(personId, { personId, x: centerX, y: generation * GENERATION_HEIGHT, generation });
  }

  // ponytail: children are spaced evenly left-to-right without being
  // perfectly re-centered under multiple siblings; fine for the sample
  // data's small families, revisit with a tidy-tree pass for large ones.
  childIds.forEach((childId) => {
    edges.push({
      id: `${personId}->${childId}`,
      fromPersonId: personId,
      toPersonId: childId,
      kind: "parent-child",
    });
    const x = nextLeafX.value;
    nextLeafX.value += NODE_SPACING;
    nodes.set(childId, { personId: childId, x, y: (generation + 1) * GENERATION_HEIGHT, generation: generation + 1 });
    layoutDescendants(childId, generation + 1, x, maps, nextLeafX, nodes, edges);
  });
}

export const classicLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  const ancestorLeafX = { value: 0 };
  const centerX = layoutAncestors(centerPersonId, 0, maps, ancestorLeafX, nodes, edges);

  const centerFamilies = maps.familiesByPartnerId.get(centerPersonId) ?? [];
  const partnerIds = centerFamilies
    .flatMap((f) => f.partnerIds)
    .filter((id) => id !== centerPersonId);
  partnerIds.forEach((partnerId, index) => {
    nodes.set(partnerId, {
      personId: partnerId,
      x: centerX + NODE_SPACING * (index + 1),
      y: 0,
      generation: 0,
    });
    edges.push({
      id: `${centerPersonId}-${partnerId}`,
      fromPersonId: centerPersonId,
      toPersonId: partnerId,
      kind: "partner",
    });
  });

  const descendantLeafX = { value: centerX - NODE_SPACING / 2 };
  layoutDescendants(centerPersonId, 0, centerX, maps, descendantLeafX, nodes, edges);

  addAncestorSiblings(nodes, edges, maps);

  const offsetX = nodes.get(centerPersonId)?.x ?? 0;
  const recentered = Array.from(nodes.values()).map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
