import type { Person, Family } from "./types";
import { orderParentsFatherFirst } from "./familyGraph";

const GEDCOM_MONTHS_BY_NUM: Record<string, string> = {
  "01": "JAN",
  "02": "FEB",
  "03": "MAR",
  "04": "APR",
  "05": "MAY",
  "06": "JUN",
  "07": "JUL",
  "08": "AUG",
  "09": "SEP",
  "10": "OCT",
  "11": "NOV",
  "12": "DEC",
};

// Inverse of gedcomImport.ts's parseGedcomDate. Our internal format is
// "YYYY-MM-DD", "YYYY-MM", "YYYY", or (for a date that couldn't be parsed
// on a previous import) arbitrary raw text — passed through unchanged
// rather than mangled, since we don't know how to reinterpret it either.
function toGedcomDate(value: string): string {
  const parts = value.split("-");
  if (parts.length === 3 && GEDCOM_MONTHS_BY_NUM[parts[1]]) {
    return `${Number(parts[2])} ${GEDCOM_MONTHS_BY_NUM[parts[1]]} ${parts[0]}`;
  }
  if (parts.length === 2 && GEDCOM_MONTHS_BY_NUM[parts[1]]) {
    return `${GEDCOM_MONTHS_BY_NUM[parts[1]]} ${parts[0]}`;
  }
  return value;
}

function gedcomSex(gender: Person["gender"]): string | undefined {
  if (gender === "male") return "M";
  if (gender === "female") return "F";
  return undefined;
}

function noteLines(note: string): string[] {
  const [first, ...rest] = note.split("\n");
  return [`1 NOTE ${first}`, ...rest.map((line) => `2 CONT ${line}`)];
}

// ponytail: birthName (maiden name) isn't standardized cleanly across
// GEDCOM-consuming software (some use a second NAME with TYPE maiden,
// others a custom tag) — left out of the export rather than guessing at a
// convention that might not round-trip anywhere.
export function exportGedcom(people: Person[], families: Family[]): string {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const personXref = new Map(people.map((p, index) => [p.id, `I${index + 1}`]));
  const familyXref = new Map(families.map((f, index) => [f.id, `F${index + 1}`]));

  const parentFamilyXrefByChild = new Map<string, string>();
  const spouseFamilyXrefsByPartner = new Map<string, string[]>();
  for (const family of families) {
    const xref = familyXref.get(family.id)!;
    for (const childId of family.childrenIds) {
      parentFamilyXrefByChild.set(childId, xref);
    }
    for (const partnerId of family.partnerIds) {
      const existing = spouseFamilyXrefsByPartner.get(partnerId) ?? [];
      existing.push(xref);
      spouseFamilyXrefsByPartner.set(partnerId, existing);
    }
  }

  const lines: string[] = ["0 HEAD", "1 SOUR Stammbaum", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"];

  for (const person of people) {
    const xref = personXref.get(person.id)!;
    lines.push(`0 @${xref}@ INDI`);
    lines.push(`1 NAME ${person.firstName} /${person.lastName}/`);

    const sex = gedcomSex(person.gender);
    if (sex) lines.push(`1 SEX ${sex}`);

    if (person.birthDate || person.birthPlace) {
      lines.push("1 BIRT");
      if (person.birthDate) lines.push(`2 DATE ${toGedcomDate(person.birthDate)}`);
      if (person.birthPlace) lines.push(`2 PLAC ${person.birthPlace}`);
    }

    if (person.deathDate || person.deathPlace) {
      lines.push("1 DEAT");
      if (person.deathDate) lines.push(`2 DATE ${toGedcomDate(person.deathDate)}`);
      if (person.deathPlace) lines.push(`2 PLAC ${person.deathPlace}`);
    }

    if (person.biography) lines.push(...noteLines(person.biography));

    const parentFamilyXref = parentFamilyXrefByChild.get(person.id);
    if (parentFamilyXref) lines.push(`1 FAMC @${parentFamilyXref}@`);
    for (const spouseFamilyXref of spouseFamilyXrefsByPartner.get(person.id) ?? []) {
      lines.push(`1 FAMS @${spouseFamilyXref}@`);
    }
  }

  for (const family of families) {
    const xref = familyXref.get(family.id)!;
    lines.push(`0 @${xref}@ FAM`);

    // ponytail: a family with more than two partners (not something this
    // app's UI can currently create) has no clean HUSB/WIFE slot for the
    // extras in the GEDCOM spec anyway — they're silently dropped.
    const [husbandId, wifeId] = orderParentsFatherFirst(family.partnerIds, peopleById);
    if (husbandId) lines.push(`1 HUSB @${personXref.get(husbandId)}@`);
    if (wifeId) lines.push(`1 WIFE @${personXref.get(wifeId)}@`);
    for (const childId of family.childrenIds) {
      lines.push(`1 CHIL @${personXref.get(childId)}@`);
    }
  }

  lines.push("0 TRLR");
  return `${lines.join("\n")}\n`;
}
