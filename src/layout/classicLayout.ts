import type { LayoutEdge, LayoutFn, LayoutOptions, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const GENERATION_HEIGHT = 160;
const NODE_SPACING = 220;
const MAX_ANCESTOR_GENERATIONS = 5;

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
  edges: LayoutEdge[],
  showSiblings: boolean
): AncestorBlock {
  const parentFamily = generation < MAX_ANCESTOR_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById)
    : [undefined, undefined];
  const siblingIds = showSiblings
    ? (parentFamily?.childrenIds ?? []).filter((id) => id !== personId && !spine.has(id) && maps.peopleById.has(id))
    : [];

  const mother = motherId ? layoutAncestors(motherId, generation + 1, "left", maps, spine, edges, showSiblings) : undefined;
  const father = fatherId ? layoutAncestors(fatherId, generation + 1, "right", maps, spine, edges, showSiblings) : undefined;
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


// ponytail: pure ancestor tree, per the latest spec revision — no
// descendants are shown at all when centering on a person, only their
// ancestors (plus siblings, toggleable, and their own partner). To see
// someone's children, center on the CHILD instead; their parent then shows
// up as one of that child's own ancestors.
export const classicLayout: LayoutFn = (people, families, centerPersonId, options?: LayoutOptions) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  const showSiblings = options?.showSiblings ?? true;
  const spine = new Set<string>();
  collectSpine(centerPersonId, 0, maps, spine);
  const ancestors = layoutAncestors(centerPersonId, 0, "left", maps, spine, edges, showSiblings);
  for (const item of ancestors.items) {
    nodes.set(item.personId, {
      personId: item.personId,
      x: item.x * NODE_SPACING,
      y: item.generation * GENERATION_HEIGHT + 0,
      generation: item.generation,
    });
  }

  // The center's own partner(s) sit alongside them — a partner is neither
  // an ancestor nor a descendant, so this doesn't conflict with the
  // ancestors-only rule above.
  const centerRawX = nodes.get(centerPersonId)?.x ?? 0;
  const centerFamilies = maps.familiesByPartnerId.get(centerPersonId) ?? [];
  const partnerIds = centerFamilies
    .flatMap((f) => f.partnerIds)
    .filter((id) => id !== centerPersonId && maps.peopleById.has(id) && !nodes.has(id));
  partnerIds.forEach((partnerId, index) => {
    nodes.set(partnerId, { personId: partnerId, x: centerRawX + (index + 1) * NODE_SPACING, y: 0, generation: 0 });
    edges.push({ id: `${centerPersonId}-${partnerId}`, fromPersonId: centerPersonId, toPersonId: partnerId, kind: "partner" });
  });

  const offsetX = nodes.get(centerPersonId)?.x ?? 0;
  const recentered = Array.from(nodes.values()).map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
