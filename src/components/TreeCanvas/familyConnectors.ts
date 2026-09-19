import type { Family } from "../../data/types";
import type { PositionedNode } from "../../layout/layout.types";

export interface ConnectorSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ConnectorStyle = "elbow" | "straight";

// Renders each Family as: a line connecting the parents to each other first,
// then — starting from that connection point — a line out to each child.
// "elbow" (classic/network views, generations stacked in fixed rows) draws a
// right-angled stem + bus, the usual pedigree-chart look. "straight" (radial
// fan) just draws a line from the parents' midpoint to each child, matching
// the fan's spokes instead of an orthogonal tree.
//
// Driven entirely by `families` + node positions rather than `layout.edges`,
// so it automatically respects whichever people the active layout actually
// placed (e.g. with siblings hidden, their families simply have no known
// child node and are skipped here too).
export function buildFamilyConnectors(
  families: Family[],
  nodeById: Map<string, PositionedNode>,
  style: ConnectorStyle
): ConnectorSegment[] {
  const segments: ConnectorSegment[] = [];

  for (const family of families) {
    const parents = family.partnerIds
      .map((id) => nodeById.get(id))
      .filter((n): n is PositionedNode => Boolean(n));
    const children = family.childrenIds
      .map((id) => nodeById.get(id))
      .filter((n): n is PositionedNode => Boolean(n));

    if (parents.length === 0 && children.length === 0) continue;

    let hub: { x: number; y: number } | undefined;
    if (parents.length >= 2) {
      const [a, b] = parents;
      segments.push({ id: `${family.id}-parents`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      hub = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else if (parents.length === 1) {
      hub = { x: parents[0].x, y: parents[0].y };
    }

    if (!hub || children.length === 0) continue;

    if (style === "elbow") {
      const stemY = hub.y + (children[0].y - hub.y) / 2;
      segments.push({ id: `${family.id}-stem`, x1: hub.x, y1: hub.y, x2: hub.x, y2: stemY });
      const xs = [hub.x, ...children.map((c) => c.x)];
      const busLeft = Math.min(...xs);
      const busRight = Math.max(...xs);
      if (busRight > busLeft) {
        segments.push({ id: `${family.id}-bus`, x1: busLeft, y1: stemY, x2: busRight, y2: stemY });
      }
      children.forEach((child) => {
        segments.push({ id: `${family.id}-drop-${child.personId}`, x1: child.x, y1: stemY, x2: child.x, y2: child.y });
      });
    } else {
      children.forEach((child) => {
        segments.push({ id: `${family.id}-spoke-${child.personId}`, x1: hub.x, y1: hub.y, x2: child.x, y2: child.y });
      });
    }
  }

  return segments;
}
