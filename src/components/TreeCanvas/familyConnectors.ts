import type { Family } from "../../data/types";
import type { PositionedNode } from "../../layout/layout.types";

export interface ConnectorSegment {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type ConnectorStyle = "elbow" | "direct";

// Renders each Family as either:
// - "elbow" (classic view, generations stacked in fixed rows): a line
//   connecting the parents to each other first, then — starting from that
//   connection point — a right-angled stem + bus out to each child. The
//   usual pedigree-chart look.
// - "direct" (radial fan): parents are NOT connected to each other; each
//   known parent gets its own straight line directly to the child, matching
//   the fan's spokes.
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

    if (parents.length === 0 || children.length === 0) {
      if (style === "elbow" && parents.length >= 2 && children.length === 0) {
        const [a, b] = parents;
        segments.push({ id: `${family.id}-parents`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
      continue;
    }

    if (style === "direct") {
      parents.forEach((parent) => {
        children.forEach((child) => {
          segments.push({
            id: `${family.id}-direct-${parent.personId}-${child.personId}`,
            x1: parent.x,
            y1: parent.y,
            x2: child.x,
            y2: child.y,
          });
        });
      });
      continue;
    }

    // elbow
    let hub: { x: number; y: number };
    if (parents.length >= 2) {
      const [a, b] = parents;
      segments.push({ id: `${family.id}-parents`, x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      hub = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    } else {
      hub = { x: parents[0].x, y: parents[0].y };
    }

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
  }

  return segments;
}
