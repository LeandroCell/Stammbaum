import type { Person, Family } from "../data/types";

export interface PositionedNode {
  personId: string;
  x: number;
  y: number;
  generation: number;
}

export interface LayoutEdge {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  kind: "parent-child" | "partner";
}

export interface LayoutResult {
  nodes: PositionedNode[];
  edges: LayoutEdge[];
}

export interface LayoutOptions {
  // Whether to include siblings (the center's own, and every ancestor's) in
  // the layout. Only classicLayout honors this — radialLayout never shows
  // siblings (pure ancestor fan) and networkLayout always shows them (its
  // whole point is the full reachable family graph), regardless of this flag.
  showSiblings?: boolean;
}

export type LayoutFn = (
  people: Person[],
  families: Family[],
  centerPersonId: string,
  options?: LayoutOptions
) => LayoutResult;
