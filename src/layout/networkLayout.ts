import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps } from "../data/familyGraph";

const GENERATION_GAP = 90;
const ROW_HEIGHT = 110;
const NODE_SPACING = 220;
const MAX_GENERATIONS = 5;
// A generation with dozens of relatives would otherwise be one enormous
// row, forcing the camera down to its minimum zoom (unreadable). Wrap it.
const MAX_PER_ROW = 10;

// Barycenter heuristic: sweep down then up a few times, ordering each
// generation by the average position of its neighbours in the reference
// generation. In-laws without a neighbour there follow their partner so
// couples stay adjacent. ponytail: heuristic, not optimal crossing count.
function reduceCrossings(
  idsByGeneration: Map<number, string[]>,
  generationById: Map<string, number>,
  edges: LayoutEdge[]
) {
  const neighbours = new Map<string, string[]>();
  const link = (a: string, b: string) => neighbours.set(a, [...(neighbours.get(a) ?? []), b]);
  for (const e of edges) {
    link(e.fromPersonId, e.toPersonId);
    link(e.toPersonId, e.fromPersonId);
  }
  const generations = Array.from(idsByGeneration.keys()).sort((a, b) => a - b);
  const position = new Map<string, number>();
  const record = (ids: string[]) => ids.forEach((id, i) => position.set(id, i / Math.max(ids.length, 1)));
  generations.forEach((g) => record(idsByGeneration.get(g)!));

  function sortAgainst(generation: number, refGeneration: number) {
    const ids = idsByGeneration.get(generation)!;
    const own = (id: string) => {
      const ps = (neighbours.get(id) ?? []).filter((n) => generationById.get(n) === refGeneration).map((n) => position.get(n)!);
      return ps.length ? ps.reduce((a, b) => a + b, 0) / ps.length : undefined;
    };
    const key = new Map<string, number>();
    for (const id of ids) {
      let k = own(id);
      if (k === undefined) {
        const partner = (neighbours.get(id) ?? []).find((n) => generationById.get(n) === generation && own(n) !== undefined);
        k = partner ? own(partner)! + 0.0001 : position.get(id)!;
      }
      key.set(id, k);
    }
    ids.sort((a, b) => key.get(a)! - key.get(b)!);
    record(ids);
  }

  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < generations.length; i++) sortAgainst(generations[i], generations[i - 1]);
    for (let i = generations.length - 2; i >= 0; i--) sortAgainst(generations[i], generations[i + 1]);
  }
}

// ponytail: deterministic breadth-first layered layout, not a live force
// simulation (see spec section 4 — physics would flicker/jitter on pan and
// zoom for large trees). Unlike classicLayout, this walks the WHOLE
// reachable family graph (siblings, in-laws, etc. included), which is the
// point of the network view for untangling complex/blended families.
export const networkLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildFamilyMaps(people, families);
  const generationById = new Map<string, number>();
  const edgeIds = new Set<string>();
  const edges: LayoutEdge[] = [];
  const order: string[] = [];

  function addEdge(fromId: string, toId: string, kind: LayoutEdge["kind"]) {
    const id = kind === "partner" ? [fromId, toId].sort().join("~") : `${fromId}->${toId}`;
    if (edgeIds.has(id)) return;
    edgeIds.add(id);
    edges.push({ id, fromPersonId: fromId, toPersonId: toId, kind });
  }

  generationById.set(centerPersonId, 0);
  order.push(centerPersonId);
  const queue: string[] = [centerPersonId];

  while (queue.length > 0) {
    const personId = queue.shift()!;
    const generation = generationById.get(personId)!;
    if (Math.abs(generation) >= MAX_GENERATIONS) continue;

    const parentFamily = maps.familyByChildId.get(personId);
    if (parentFamily) {
      for (const parentId of parentFamily.partnerIds) {
        if (!maps.peopleById.has(parentId)) continue;
        addEdge(parentId, personId, "parent-child");
        if (!generationById.has(parentId)) {
          generationById.set(parentId, generation - 1);
          order.push(parentId);
          queue.push(parentId);
        }
      }
    }

    const partnerFamilies = maps.familiesByPartnerId.get(personId) ?? [];
    for (const family of partnerFamilies) {
      for (const partnerId of family.partnerIds) {
        if (partnerId === personId) continue;
        addEdge(personId, partnerId, "partner");
        if (!generationById.has(partnerId)) {
          generationById.set(partnerId, generation);
          order.push(partnerId);
          queue.push(partnerId);
        }
      }
      for (const childId of family.childrenIds) {
        addEdge(personId, childId, "parent-child");
        if (!generationById.has(childId)) {
          generationById.set(childId, generation + 1);
          order.push(childId);
          queue.push(childId);
        }
      }
    }
  }

  const idsByGeneration = new Map<number, string[]>();
  for (const personId of order) {
    const generation = generationById.get(personId)!;
    const bucket = idsByGeneration.get(generation) ?? [];
    bucket.push(personId);
    idsByGeneration.set(generation, bucket);
  }

  reduceCrossings(idsByGeneration, generationById, edges);

  // Generations stack top to bottom (oldest first); each one is split into
  // as many wrapped rows as needed, and every generation block starts below
  // the previous one's last row, so wrapped rows can never run into the
  // next generation.
  const nodes: PositionedNode[] = [];
  let cursorY = 0;
  const generations = Array.from(idsByGeneration.keys()).sort((a, b) => a - b);
  for (const generation of generations) {
    const ids = idsByGeneration.get(generation)!;
    ids.forEach((personId, index) => {
      const row = Math.floor(index / MAX_PER_ROW);
      const rowStart = row * MAX_PER_ROW;
      const rowCount = Math.min(MAX_PER_ROW, ids.length - rowStart);
      const x = (index - rowStart - (rowCount - 1) / 2) * NODE_SPACING;
      nodes.push({ personId, x, y: cursorY + row * ROW_HEIGHT, generation });
    });
    cursorY += Math.ceil(ids.length / MAX_PER_ROW) * ROW_HEIGHT + GENERATION_GAP;
  }

  // Recenter so the center person always sits at (0, 0), regardless of how
  // many same-generation relatives (siblings, in-laws) were discovered
  // before or after them within their own layer.
  const centerNode = nodes.find((n) => n.personId === centerPersonId);
  const offsetX = centerNode?.x ?? 0;
  const offsetY = centerNode?.y ?? 0;
  const recentered = nodes.map((n) => ({ ...n, x: n.x - offsetX, y: n.y - offsetY }));

  return { nodes: recentered, edges };
};
