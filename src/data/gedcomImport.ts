import type { Family, Gender, Person } from "./types";

interface GedcomLine {
  level: number;
  xref?: string;
  tag: string;
  value?: string;
}

const GEDCOM_MONTHS: Record<string, string> = {
  JAN: "01",
  FEB: "02",
  MAR: "03",
  APR: "04",
  MAY: "05",
  JUN: "06",
  JUL: "07",
  AUG: "08",
  SEP: "09",
  OCT: "10",
  NOV: "11",
  DEC: "12",
};

function parseLine(rawLine: string): GedcomLine {
  const trimmed = rawLine.trim();
  const firstSpace = trimmed.indexOf(" ");
  if (firstSpace === -1) {
    return { level: Number(trimmed), tag: "" };
  }
  const level = Number(trimmed.slice(0, firstSpace));
  const rest = trimmed.slice(firstSpace + 1).trim();

  if (rest.startsWith("@")) {
    const closingIndex = rest.indexOf("@", 1);
    const xref = rest.slice(1, closingIndex);
    const afterXref = rest.slice(closingIndex + 1).trim();
    const tagSpace = afterXref.indexOf(" ");
    const tag = tagSpace === -1 ? afterXref : afterXref.slice(0, tagSpace);
    const value = tagSpace === -1 ? undefined : afterXref.slice(tagSpace + 1).trim();
    return { level, xref, tag, value };
  }

  const tagSpace = rest.indexOf(" ");
  const tag = tagSpace === -1 ? rest : rest.slice(0, tagSpace);
  const value = tagSpace === -1 ? undefined : rest.slice(tagSpace + 1).trim();
  return { level, tag, value };
}

function gedcomId(xref: string): string {
  return `gedcom-${xref}`;
}

function stripPointer(value: string): string {
  return value.replace(/@/g, "");
}

function parseGedcomName(raw: string): { firstName: string; lastName: string } {
  const match = raw.match(/^(.*?)\s*\/(.*)\/\s*$/);
  if (match) {
    return { firstName: match[1].trim(), lastName: match[2].trim() };
  }
  return { firstName: raw.trim(), lastName: "" };
}

function parseGedcomSex(raw: string | undefined): Gender | undefined {
  if (raw === "M") return "male";
  if (raw === "F") return "female";
  return undefined;
}

// ponytail: covers the common "DD MON YYYY" / "MON YYYY" / "YYYY" cases and
// strips ABT/BEF/AFT/CAL/EST qualifiers. Ranges (BET ... AND ...), double
// dating, and non-Gregorian calendars are kept as raw text rather than
// dropped, so nothing is silently lost — just not usable for date sorting.
function parseGedcomDate(raw: string): string | undefined {
  const cleaned = raw.replace(/^(ABT|BEF|AFT|CAL|EST)\s+/i, "").trim();
  const parts = cleaned.split(/\s+/);

  if (parts.length === 3) {
    const [day, monthAbbr, year] = parts;
    const month = GEDCOM_MONTHS[monthAbbr.toUpperCase()];
    if (month && /^\d{1,2}$/.test(day) && /^\d{4}$/.test(year)) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }
  if (parts.length === 2) {
    const [monthAbbr, year] = parts;
    const month = GEDCOM_MONTHS[monthAbbr.toUpperCase()];
    if (month && /^\d{4}$/.test(year)) {
      return `${year}-${month}`;
    }
  }
  if (parts.length === 1 && /^\d{4}$/.test(parts[0])) {
    return parts[0];
  }

  return cleaned || undefined;
}

interface IndiDraft {
  id: string;
  firstName?: string;
  lastName?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
}

interface FamDraft {
  id: string;
  partnerIds: string[];
  childrenIds: string[];
}

export function parseGedcom(text: string): { people: Person[]; families: Family[] } {
  const lines = text
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "")
    .map(parseLine);

  const people: Person[] = [];
  const families: Family[] = [];

  let currentIndi: IndiDraft | null = null;
  let currentFam: FamDraft | null = null;
  let pendingEvent: "BIRT" | "DEAT" | null = null;
  let noteLines: string[] = [];

  function flushIndi() {
    if (!currentIndi) return;
    people.push({
      id: currentIndi.id,
      firstName: currentIndi.firstName ?? "",
      lastName: currentIndi.lastName ?? "",
      gender: currentIndi.gender,
      birthDate: currentIndi.birthDate,
      birthPlace: currentIndi.birthPlace,
      deathDate: currentIndi.deathDate,
      deathPlace: currentIndi.deathPlace,
      biography: noteLines.length > 0 ? noteLines.join("\n") : undefined,
    });
    noteLines = [];
  }

  function flushFam() {
    if (!currentFam) return;
    families.push({ id: currentFam.id, partnerIds: currentFam.partnerIds, childrenIds: currentFam.childrenIds });
  }

  for (const line of lines) {
    if (line.level === 0) {
      flushIndi();
      flushFam();
      currentIndi = null;
      currentFam = null;
      pendingEvent = null;

      if (line.xref && line.tag === "INDI") {
        currentIndi = { id: gedcomId(line.xref) };
      } else if (line.xref && line.tag === "FAM") {
        currentFam = { id: gedcomId(line.xref), partnerIds: [], childrenIds: [] };
      }
      continue;
    }

    if (currentIndi) {
      if (line.level === 1) {
        pendingEvent = null;
        if (line.tag === "NAME" && line.value) {
          const { firstName, lastName } = parseGedcomName(line.value);
          currentIndi.firstName = firstName;
          currentIndi.lastName = lastName;
        } else if (line.tag === "SEX") {
          currentIndi.gender = parseGedcomSex(line.value);
        } else if (line.tag === "BIRT") {
          pendingEvent = "BIRT";
        } else if (line.tag === "DEAT") {
          pendingEvent = "DEAT";
        } else if (line.tag === "NOTE" && line.value) {
          noteLines.push(line.value);
        }
      } else if (line.level === 2 && pendingEvent) {
        if (line.tag === "DATE" && line.value) {
          const date = parseGedcomDate(line.value);
          if (pendingEvent === "BIRT") currentIndi.birthDate = date;
          else currentIndi.deathDate = date;
        } else if (line.tag === "PLAC" && line.value) {
          if (pendingEvent === "BIRT") currentIndi.birthPlace = line.value;
          else currentIndi.deathPlace = line.value;
        }
      } else if (line.level === 2 && line.tag === "CONT" && noteLines.length > 0) {
        noteLines[noteLines.length - 1] += `\n${line.value ?? ""}`;
      }
    } else if (currentFam) {
      if (line.level === 1 && line.value) {
        if (line.tag === "HUSB" || line.tag === "WIFE") {
          currentFam.partnerIds.push(gedcomId(stripPointer(line.value)));
        } else if (line.tag === "CHIL") {
          currentFam.childrenIds.push(gedcomId(stripPointer(line.value)));
        }
      }
    }
  }

  flushIndi();
  flushFam();

  if (people.length === 0) {
    throw new Error("Keine Personen (INDI) in der GEDCOM-Datei gefunden.");
  }

  return { people, families };
}
