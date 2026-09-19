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
// expanded (center on one of them to see their line). Placement is
// collision-free by construction: `leftmostXByGeneration` tracks the
// leftmost x used so far at each generation across the WHOLE tree (not
// just one spine node's own siblings), and every new addition — from any
// spine node, in any order — is placed strictly further left than
// everything already at that generation, including the center's partner
// and previously-added siblings from a different branch.
function addAncestorSiblings(
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[],
  maps: FamilyMaps
): void {
  const spineSnapshot = Array.from(nodes.values()).filter((n) => n.generation <= 0);

  const leftmostXByGeneration = new Map<number, number>();
  for (const node of nodes.values()) {
    const current = leftmostXByGeneration.get(node.generation);
    if (current === undefined || node.x < current) {
      leftmostXByGeneration.set(node.generation, node.x);
    }
  }

  for (const node of spineSnapshot) {
    const parentFamily = maps.familyByChildId.get(node.personId);
    if (!parentFamily) continue;
    const siblingIds = parentFamily.childrenIds.filter((id) => id !== node.personId && !nodes.has(id));
    siblingIds.forEach((siblingId) => {
      const leftmost = leftmostXByGeneration.get(node.generation) ?? node.x;
      const x = leftmost - NODE_SPACING;
      leftmostXByGeneration.set(node.generation, x);

      nodes.set(siblingId, { personId: siblingId, x, y: node.y, generation: node.generation });
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

interface DescendantUnit {
  personId: string;
  partnerIds: string[];
  children: DescendantUnit[];
  width: number;
}

// Builds the descendant tree bottom-up: every person plus their partner(s)
// forms one "unit" (partners sit directly to the right of the person), and
// a unit's width is the larger of its own width and the total width of its
// children's units. Placing then centers each unit over its children, so
// parents sit above their kids instead of at the left edge of their
// subtree — the difference between a readable tree and long, crossing
// edges once a family has more than a couple of generations.
//
// `visited` guards against cycles/duplicates in real-world data (a person
// listed as their own descendant, or the same child under two families).
function buildDescendantUnit(
  personId: string,
  generation: number,
  maps: FamilyMaps,
  visited: Set<string>
): DescendantUnit {
  visited.add(personId);
  const partnerFamilies = maps.familiesByPartnerId.get(personId) ?? [];
  const partnerIds: string[] = [];
  for (const family of partnerFamilies) {
    for (const id of family.partnerIds) {
      if (id !== personId && !visited.has(id) && maps.peopleById.has(id) && !partnerIds.includes(id)) {
        partnerIds.push(id);
      }
    }
  }
  partnerIds.forEach((id) => visited.add(id));

  const children: DescendantUnit[] = [];
  if (generation < MAX_DESCENDANT_GENERATIONS) {
    for (const family of partnerFamilies) {
      for (const childId of family.childrenIds) {
        if (visited.has(childId) || !maps.peopleById.has(childId)) continue;
        children.push(buildDescendantUnit(childId, generation + 1, maps, visited));
      }
    }
  }

  const ownWidth = 1 + partnerIds.length;
  const childrenWidth = children.reduce((sum, c) => sum + c.width, 0);
  return { personId, partnerIds, children, width: Math.max(ownWidth, childrenWidth) };
}

// Places a unit (and recursively its children) starting at slot `left`,
// returning the x of the unit's person so callers can draw edges to it.
function placeDescendantUnit(
  unit: DescendantUnit,
  generation: number,
  left: number,
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): number {
  const ownWidth = 1 + unit.partnerIds.length;
  const y = generation * GENERATION_HEIGHT;

  const childrenWidth = unit.children.reduce((sum, c) => sum + c.width, 0);
  const childrenLeft = left + (unit.width - childrenWidth) / 2;
  let cursor = childrenLeft;
  const childXs = unit.children.map((child) => {
    const x = placeDescendantUnit(child, generation + 1, cursor, nodes, edges);
    cursor += child.width;
    return x;
  });

  // Center the person+partners unit over its children's span (or over its
  // own slot range when it has no children).
  const spanLeft = childXs.length > 0 ? (childXs[0] + childXs[childXs.length - 1]) / 2 - (ownWidth - 1) / 2 : left + (unit.width - ownWidth) / 2;
  const personX = spanLeft * NODE_SPACING;

  if (!nodes.has(unit.personId)) {
    nodes.set(unit.personId, { personId: unit.personId, x: personX, y, generation });
  }
  unit.partnerIds.forEach((partnerId, index) => {
    nodes.set(partnerId, { personId: partnerId, x: personX + NODE_SPACING * (index + 1), y, generation });
    edges.push({ id: `${unit.personId}-${partnerId}`, fromPersonId: unit.personId, toPersonId: partnerId, kind: "partner" });
  });
  unit.children.forEach((child) => {
    for (const parentId of [unit.personId, ...unit.partnerIds]) {
      edges.push({ id: `${parentId}->${child.personId}`, fromPersonId: parentId, toPersonId: child.personId, kind: "parent-child" });
    }
  });

  return personX / NODE_SPACING;
}

export const classicLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  const ancestorLeafX = { value: 0 };
  const centerX = layoutAncestors(centerPersonId, 0, maps, ancestorLeafX, nodes, edges);

  const rootUnit = buildDescendantUnit(centerPersonId, 0, maps, new Set());
  // Place the descendant tree relative to slot 0, then shift it so the
  // center person lands exactly where the ancestor layout put them.
  const scratch = new Map<string, PositionedNode>();
  const scratchEdges: LayoutEdge[] = [];
  const centerSlotX = placeDescendantUnit(rootUnit, 0, 0, scratch, scratchEdges);
  const shift = centerX - centerSlotX * NODE_SPACING;
  for (const node of scratch.values()) {
    // Skip anyone the ancestor pass already placed (the center, or a
    // relative who is both an ancestor and a descendant's spouse) — moving
    // them would break the ancestor rows.
    if (nodes.has(node.personId)) continue;
    nodes.set(node.personId, { ...node, x: node.x + shift });
  }
  edges.push(...scratchEdges);

  addAncestorSiblings(nodes, edges, maps);

  const offsetX = nodes.get(centerPersonId)?.x ?? 0;
  const recentered = Array.from(nodes.values()).map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
