import type { Person, Family } from "./types";

export interface FamilyMaps {
  peopleById: Map<string, Person>;
  familyByChildId: Map<string, Family>;
  familiesByPartnerId: Map<string, Family[]>;
}

// ponytail: assumes a person is a child in at most one family (no known
// double-adoption cases in the sample data). Extend familyByChildId to a
// Map<string, Family[]> if that ever needs to be modeled.
export function buildFamilyMaps(people: Person[], families: Family[]): FamilyMaps {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const familyByChildId = new Map<string, Family>();
  const familiesByPartnerId = new Map<string, Family[]>();

  for (const family of families) {
    for (const childId of family.childrenIds) {
      familyByChildId.set(childId, family);
    }
    for (const partnerId of family.partnerIds) {
      const existing = familiesByPartnerId.get(partnerId) ?? [];
      existing.push(family);
      familiesByPartnerId.set(partnerId, existing);
    }
  }

  return { peopleById, familyByChildId, familiesByPartnerId };
}

export function orderParentsFatherFirst(partnerIds: string[], peopleById: Map<string, Person>): string[] {
  const known = partnerIds.filter((id) => peopleById.has(id));
  const father = known.find((id) => peopleById.get(id)?.gender === "male");
  const mother = known.find((id) => peopleById.get(id)?.gender === "female");
  const rest = known.filter((id) => id !== father && id !== mother);
  return [father, mother, ...rest].filter((id): id is string => Boolean(id));
}

// Picks a sensible starting person for a freshly imported tree: the one
// with the most known ancestors, i.e. the deepest, best-documented branch
// (typically the youngest person of the main line, which is what
// genealogy software usually treats as the "proband"). A file's first
// INDI record is arbitrary — often the oldest ancestor with nothing above
// them, which makes the classic view a huge descendant sprawl and the
// radial view empty.
export function pickDefaultCenter(people: Person[], families: Family[]): string | undefined {
  if (people.length === 0) return undefined;
  const { familyByChildId, peopleById } = buildFamilyMaps(people, families);

  function countAncestors(personId: string): number {
    const seen = new Set<string>();
    const stack = [personId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      const parentFamily = familyByChildId.get(current);
      if (!parentFamily) continue;
      for (const parentId of parentFamily.partnerIds) {
        if (!seen.has(parentId) && peopleById.has(parentId) && parentId !== personId) {
          seen.add(parentId);
          stack.push(parentId);
        }
      }
    }
    return seen.size;
  }

  let best = people[0].id;
  let bestCount = -1;
  for (const person of people) {
    const count = countAncestors(person.id);
    if (count > bestCount) {
      best = person.id;
      bestCount = count;
    }
  }
  return best;
}

// Picks the person with the latest known birth year — used by the "Alle
// Personen" action, which centers the classic view (ancestors + descendants
// + siblings + partner) on whoever is youngest, since that person's
// ancestor chain tends to surface as much of the tree as a single center
// can show. Falls back to the first person if nobody has a birth date.
export function pickYoungestPerson(people: Person[]): string | undefined {
  let best: Person | undefined;
  let bestYear = -Infinity;
  for (const person of people) {
    const year = person.birthDate ? Number(person.birthDate.slice(0, 4)) : NaN;
    if (!Number.isNaN(year) && year > bestYear) {
      bestYear = year;
      best = person;
    }
  }
  return (best ?? people[0])?.id;
}
