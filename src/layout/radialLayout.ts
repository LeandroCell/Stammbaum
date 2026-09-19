import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps, orderParentsFatherFirst, type FamilyMaps } from "../data/familyGraph";

const GENERATION_SPACING = 220;
const SLOT_HEIGHT = 160;
const MAX_GENERATIONS = 5;

// Lays out one side (mother's or father's whole ancestor line) as a tidy
// binary bracket, the mirror image of a tournament bracket: people with no
// further known parents (or past MAX_GENERATIONS) get sequential y-slots;
// every ancestor above them sits at the average y of their own two parents,
// centering them over their own subtree. `direction` is -1 for the
// mother's side (grows further left, more negative x) and +1 for the
// father's (grows right) — generations grow sideways here, not upward, and
// there are no siblings (this view is blood-line only). Returns the y this
// person ended up at, so the caller can re-center the whole side afterwards.
function layoutSide(
  personId: string,
  generation: number,
  direction: 1 | -1,
  maps: FamilyMaps,
  nextLeafY: { value: number },
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): number {
  const parentFamily = generation < MAX_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById)
    : [undefined, undefined];
  const x = direction * generation * GENERATION_SPACING;

  if (!fatherId && !motherId) {
    const y = nextLeafY.value;
    nextLeafY.value += SLOT_HEIGHT;
    nodes.set(personId, { personId, x, y, generation: -generation });
    return y;
  }

  const motherY = motherId ? layoutSide(motherId, generation + 1, direction, maps, nextLeafY, nodes, edges) : undefined;
  const fatherY = fatherId ? layoutSide(fatherId, generation + 1, direction, maps, nextLeafY, nodes, edges) : undefined;

  for (const parentId of [fatherId, motherId]) {
    if (parentId) edges.push({ id: `${parentId}->${personId}`, fromPersonId: parentId, toPersonId: personId, kind: "parent-child" });
  }

  const ys = [motherY, fatherY].filter((v): v is number => v !== undefined);
  const y = ys.reduce((a, b) => a + b, 0) / ys.length;
  nodes.set(personId, { personId, x, y, generation: -generation });
  return y;
}

// Places one whole side into `nodes`/`edges`, then shifts it so the direct
// parent (not just some leaf average) lands exactly at y = 0 — level with
// the centered person — with their own ancestors fanning out evenly above
// and below that line instead of drifting diagonally away from it.
function placeSide(
  parentId: string,
  direction: 1 | -1,
  maps: FamilyMaps,
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): void {
  const scratch = new Map<string, PositionedNode>();
  const scratchEdges: LayoutEdge[] = [];
  const parentY = layoutSide(parentId, 1, direction, maps, { value: 0 }, scratch, scratchEdges);
  for (const node of scratch.values()) nodes.set(node.personId, { ...node, y: node.y - parentY });
  edges.push(...scratchEdges);
}

// ponytail: pure ancestor bracket, per the latest layout revision — no
// descendants, no siblings, no partner (blood line only): the centered
// person plus their parents, grandparents, etc. Mother's whole line grows
// to the left, father's whole line to the right — a mirrored, horizontal
// binary tree (like a tournament bracket) rather than a circular fan.
export const radialLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  nodes.set(centerPersonId, { personId: centerPersonId, x: 0, y: 0, generation: 0 });

  const parentFamily = maps.familyByChildId.get(centerPersonId);
  if (parentFamily) {
    const [fatherId, motherId] = orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById);

    if (motherId) {
      edges.push({ id: `${motherId}->${centerPersonId}`, fromPersonId: motherId, toPersonId: centerPersonId, kind: "parent-child" });
      placeSide(motherId, -1, maps, nodes, edges);
    }
    if (fatherId) {
      edges.push({ id: `${fatherId}->${centerPersonId}`, fromPersonId: fatherId, toPersonId: centerPersonId, kind: "parent-child" });
      placeSide(fatherId, 1, maps, nodes, edges);
    }
  }

  return { nodes: Array.from(nodes.values()), edges };
};
