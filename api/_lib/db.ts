import { neon } from "@neondatabase/serverless";
import type { Person, Family } from "../../src/data/types";

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist auf dem Server nicht konfiguriert.");
  }
  return neon(connectionString);
}

interface PersonRow {
  id: string;
  first_name: string;
  last_name: string;
  birth_name: string | null;
  gender: string | null;
  birth_date: string | null;
  birth_place: string | null;
  death_date: string | null;
  death_place: string | null;
  biography: string | null;
  photos: unknown;
  sources: unknown;
  documents: unknown;
  notes: string | null;
}

interface FamilyRow {
  id: string;
  partner_ids: string[];
  children_ids: string[];
}

function rowToPerson(row: PersonRow): Person {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    birthName: row.birth_name ?? undefined,
    gender: (row.gender as Person["gender"]) ?? undefined,
    birthDate: row.birth_date ?? undefined,
    birthPlace: row.birth_place ?? undefined,
    deathDate: row.death_date ?? undefined,
    deathPlace: row.death_place ?? undefined,
    biography: row.biography ?? undefined,
    photos: (row.photos as Person["photos"]) ?? undefined,
    sources: (row.sources as Person["sources"]) ?? undefined,
    documents: (row.documents as Person["documents"]) ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function getTree(): Promise<{ people: Person[]; families: Family[] }> {
  const sql = getSql();
  const personRows = (await sql`SELECT * FROM people`) as unknown as PersonRow[];
  const familyRows = (await sql`SELECT * FROM families`) as unknown as FamilyRow[];

  return {
    people: personRows.map(rowToPerson),
    families: familyRows.map((row) => ({
      id: row.id,
      partnerIds: row.partner_ids,
      childrenIds: row.children_ids,
    })),
  };
}

// ponytail: replaces the whole table contents in one transaction rather
// than diffing/upserting individual rows. Simplest correct approach at
// personal-tree scale (dozens to a few hundred people per save), and keeps
// every relationship rule (setParents, addPartner, ...) living in exactly
// one place — the already-tested client store — instead of duplicating
// that logic on the server too. Revisit with real diffing if trees grow
// large enough for whole-table rewrites to matter.
export async function saveTree(people: Person[], families: Family[]): Promise<void> {
  const sql = getSql();

  await sql.transaction((tx) => [
    tx`DELETE FROM families`,
    tx`DELETE FROM people`,
    ...people.map(
      (person) => tx`
        INSERT INTO people (
          id, first_name, last_name, birth_name, gender, birth_date, birth_place,
          death_date, death_place, biography, photos, sources, documents, notes
        ) VALUES (
          ${person.id}, ${person.firstName}, ${person.lastName}, ${person.birthName ?? null},
          ${person.gender ?? null}, ${person.birthDate ?? null}, ${person.birthPlace ?? null},
          ${person.deathDate ?? null}, ${person.deathPlace ?? null}, ${person.biography ?? null},
          ${JSON.stringify(person.photos ?? null)}, ${JSON.stringify(person.sources ?? null)},
          ${JSON.stringify(person.documents ?? null)}, ${person.notes ?? null}
        )
      `
    ),
    ...families.map(
      (family) => tx`
        INSERT INTO families (id, partner_ids, children_ids)
        VALUES (${family.id}, ${JSON.stringify(family.partnerIds)}, ${JSON.stringify(family.childrenIds)})
      `
    ),
  ]);
}
