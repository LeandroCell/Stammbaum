import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";
import { buildFamilyMaps } from "../data/familyGraph";

const GENERATION_HEIGHT = 160;
const NODE_SPACING = 220;
const MAX_GENERATIONS = 5;

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

  const nodes: PositionedNode[] = [];
  for (const [generation, ids] of idsByGeneration) {
    ids.forEach((personId, index) => {
      const x = (index - (ids.length - 1) / 2) * NODE_SPACING;
      nodes.push({ personId, x, y: generation * GENERATION_HEIGHT, generation });
    });
  }

  // Recenter so the center person always sits at x=0, regardless of how
  // many same-generation relatives (siblings, in-laws) were discovered
  // before or after them within their own layer.
  const offsetX = nodes.find((n) => n.personId === centerPersonId)?.x ?? 0;
  const recentered = nodes.map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
