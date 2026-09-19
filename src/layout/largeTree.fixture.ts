import type { Family, Person } from "../data/types";

// Deterministic multi-generation dynasty: every couple has 2-4 children,
// most of whom marry an outsider. Shared by the layout tests to exercise
// the layouts on a tree far bigger than the hand-written sample data.
export function buildDynasty(maxGen = 5): { people: Person[]; families: Family[] } {
  let seed = 42;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const people: Person[] = [];
  const families: Family[] = [];
  const add = (name: string, gender: "male" | "female") => {
    const id = `p${people.length + 1}`;
    people.push({ id, firstName: name, lastName: "Test", gender });
    return id;
  };
  const build = (gen: number, husband: string, wife: string) => {
    const family: Family = { id: `f${families.length + 1}`, partnerIds: [husband, wife], childrenIds: [] };
    families.push(family);
    if (gen >= maxGen) return;
    const kids = 2 + Math.floor(rnd() * 3);
    for (let k = 0; k < kids; k++) {
      const gender = rnd() < 0.5 ? "male" : "female";
      const child = add(`G${gen + 1}K${k}`, gender);
      family.childrenIds.push(child);
      if (rnd() < 0.8) {
        const spouse = add(`G${gen + 1}S${k}`, gender === "male" ? "female" : "male");
        build(gen + 1, gender === "male" ? child : spouse, gender === "male" ? spouse : child);
      }
    }
  };
  build(0, add("Ahn", "male"), add("Ahnin", "female"));
  return { people, families };
}

const CARD_W = 180;
const CARD_H = 72;
export function countOverlaps(nodes: { x: number; y: number }[]): number {
  let overlaps = 0;
  for (let i = 0; i < nodes.length; i++)
    for (let j = i + 1; j < nodes.length; j++)
      if (Math.abs(nodes[i].x - nodes[j].x) < CARD_W && Math.abs(nodes[i].y - nodes[j].y) < CARD_H) overlaps++;
  return overlaps;
}
