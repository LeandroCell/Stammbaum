import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const GENERATION_HEIGHT = 160;
const NODE_SPACING = 220;
const MAX_ANCESTOR_GENERATIONS = 5;
const MAX_DESCENDANT_GENERATIONS = 5;

// Positions are in slot units (1 slot = NODE_SPACING); `left`/`right` bound
// the whole block so neighbouring blocks can be laid side by side without
// ever overlapping, at any generation.
interface AncestorBlock {
  x: number;
  left: number;
  right: number;
  items: { personId: string; generation: number; x: number }[];
}

function collectSpine(personId: string, generation: number, maps: FamilyMaps, spine: Set<string>) {
  if (spine.has(personId)) return;
  spine.add(personId);
  const family = generation < MAX_ANCESTOR_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  for (const parentId of family?.partnerIds ?? []) collectSpine(parentId, generation + 1, maps, spine);
}

// Lays out a person, their siblings and everything above them. The person's
// siblings form one contiguous group with them, on the outer side of the
// couple (`siblingSide`: mother → left, father → right), so aunts/uncles
// stand next to the parent they belong to, not at the far edge of the row.
function layoutAncestors(
  personId: string,
  generation: number,
  siblingSide: "left" | "right",
  maps: FamilyMaps,
  spine: Set<string>,
  edges: LayoutEdge[]
): AncestorBlock {
  const parentFamily = generation < MAX_ANCESTOR_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById)
    : [undefined, undefined];
  const siblingIds = (parentFamily?.childrenIds ?? []).filter(
    (id) => id !== personId && !spine.has(id) && maps.peopleById.has(id)
  );

  const mother = motherId ? layoutAncestors(motherId, generation + 1, "left", maps, spine, edges) : undefined;
  const father = fatherId ? layoutAncestors(fatherId, generation + 1, "right", maps, spine, edges) : undefined;
  // Father's block goes directly right of the mother's block.
  const fatherShift = mother && father ? mother.right - father.left : 0;
  const parents = [mother, father].filter((b): b is AncestorBlock => b !== undefined);
  const parentXs = [mother?.x, father && father.x + fatherShift].filter((v): v is number => v !== undefined);

  const items: AncestorBlock["items"] = [];
  let left = Infinity;
  let right = -Infinity;
  parents.forEach((block) => {
    const shift = block === father ? fatherShift : 0;
    for (const item of block.items) items.push({ ...item, x: item.x + shift });
    left = Math.min(left, block.left + shift);
    right = Math.max(right, block.right + shift);
  });

  const mid = parentXs.length ? parentXs.reduce((a, b) => a + b, 0) / parentXs.length : 0;
  const half = siblingIds.length / 2;
  // ponytail: "+ 0" normalizes -0 (JS negative zero from `-generation`).
  const personX = siblingSide === "left" ? mid + half : mid - half;
  const y = generation;
  items.push({ personId, generation: -y + 0, x: personX });
  siblingIds.forEach((siblingId, i) => {
    const x = siblingSide === "left" ? personX - (i + 1) : personX + (i + 1);
    items.push({ personId: siblingId, generation: -y + 0, x });
    for (const parentId of parentFamily!.partnerIds) {
      edges.push({ id: `${parentId}->${siblingId}`, fromPersonId: parentId, toPersonId: siblingId, kind: "parent-child" });
    }
  });
  const groupLeft = siblingSide === "left" ? personX - siblingIds.length : personX;
  const groupRight = siblingSide === "left" ? personX : personX + siblingIds.length;
  left = Math.min(left, groupLeft - 0.5);
  right = Math.max(right, groupRight + 0.5);

  for (const parentId of [fatherId, motherId]) {
    if (parentId) edges.push({ id: `${parentId}->${personId}`, fromPersonId: parentId, toPersonId: personId, kind: "parent-child" });
  }
  return { x: personX, left, right, items };
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
  maps: FamilyMaps,
  centerPersonId: string
): void {
  const spineSnapshot = Array.from(nodes.values()).filter((n) => n.generation <= 0);

  const leftmostXByGeneration = new Map<number, number>();
  for (const node of nodes.values()) {
    const current = leftmostXByGeneration.get(node.generation);
    if (current === undefined || node.x < current) {
      leftmostXByGeneration.set(node.generation, node.x);
    }
  }

  const rightmostXByGeneration = new Map<number, number>();
  for (const node of nodes.values()) {
    rightmostXByGeneration.set(node.generation, Math.max(node.x, rightmostXByGeneration.get(node.generation) ?? -Infinity));
  }
  const rightmostX = (generation: number) => rightmostXByGeneration.get(generation)!;

  for (const node of spineSnapshot) {
    const parentFamily = maps.familyByChildId.get(node.personId);
    if (!parentFamily) continue;
    const siblingIds = parentFamily.childrenIds.filter((id) => id !== node.personId && !nodes.has(id));
    // The center's partner sits at the right end of generation 0, so their
    // siblings go further right, next to them, instead of across the row.
    const isPartner = node.generation === 0 && node.personId !== centerPersonId;
    siblingIds.forEach((siblingId) => {
      const x = isPartner ? rightmostX(node.generation) + NODE_SPACING : leftmostXByGeneration.get(node.generation)! - NODE_SPACING;
      if (isPartner) rightmostXByGeneration.set(node.generation, x);
      else leftmostXByGeneration.set(node.generation, x);

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

  const spine = new Set<string>();
  collectSpine(centerPersonId, 0, maps, spine);
  const ancestors = layoutAncestors(centerPersonId, 0, "left", maps, spine, edges);
  for (const item of ancestors.items) {
    nodes.set(item.personId, {
      personId: item.personId,
      x: item.x * NODE_SPACING,
      y: item.generation * GENERATION_HEIGHT + 0,
      generation: item.generation,
    });
  }
  const centerX = ancestors.x * NODE_SPACING;

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

  addAncestorSiblings(nodes, edges, maps, centerPersonId);

  const offsetX = nodes.get(centerPersonId)?.x ?? 0;
  const recentered = Array.from(nodes.values()).map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
