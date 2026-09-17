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
