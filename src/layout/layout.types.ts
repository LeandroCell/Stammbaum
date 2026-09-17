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

export type LayoutFn = (
  people: Person[],
  families: Family[],
  centerPersonId: string
) => LayoutResult;
