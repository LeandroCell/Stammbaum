import { describe, it, expect } from "vitest";
import { exportGedcom } from "./gedcomExport";
import { parseGedcom } from "./gedcomImport";
import { people, families } from "./sampleData";

describe("exportGedcom", () => {
  const output = exportGedcom(people, families);
  const outputLines = output.split("\n");

  it("starts with a valid GEDCOM header and ends with a trailer", () => {
    expect(outputLines[0]).toBe("0 HEAD");
    expect(outputLines).toContain("1 CHAR UTF-8");
    expect(output.trim().endsWith("0 TRLR")).toBe(true);
  });

  it("writes one INDI record per person with a NAME in 'Given /Surname/' form", () => {
    const indiCount = outputLines.filter((line) => / INDI$/.test(line)).length;
    expect(indiCount).toBe(people.length);
    expect(output).toContain("1 NAME Max /Berger/");
  });

  it("writes SEX, BIRT/DATE/PLAC, and DEAT/DATE/PLAC for a person with that data", () => {
    expect(output).toContain("1 SEX M");
    expect(output).toContain("2 DATE 12 MAR 1930");
    expect(output).toContain("2 PLAC München");
    expect(output).toContain("2 DATE 2 NOV 2005");
  });

  it("writes the biography as a NOTE", () => {
    expect(output).toContain("1 NOTE Mittelpunkt des Beispiel-Stammbaums.");
  });

  it("writes one FAM record per family with HUSB/WIFE/CHIL", () => {
    const famCount = outputLines.filter((line) => / FAM$/.test(line)).length;
    expect(famCount).toBe(families.length);
    expect(output).toMatch(/1 HUSB @I\d+@\n1 WIFE @I\d+@/);
  });

  it("cross-references FAMC/FAMS on the individual records", () => {
    // "me" is a child in fam-parents and a partner in fam-me — both
    // directions of the relationship should be present, not just the FAM
    // record's own HUSB/WIFE/CHIL.
    expect(output).toMatch(/1 FAMC @F\d+@/);
    expect(output).toMatch(/1 FAMS @F\d+@/);
  });

  it("round-trips through parseGedcom with the same person/family counts and names preserved", () => {
    const reimported = parseGedcom(output);
    expect(reimported.people).toHaveLength(people.length);
    expect(reimported.families).toHaveLength(families.length);

    const originalNames = people.map((p) => `${p.firstName} ${p.lastName}`).sort();
    const reimportedNames = reimported.people.map((p) => `${p.firstName} ${p.lastName}`).sort();
    expect(reimportedNames).toEqual(originalNames);
  });

  it("round-trips family structure by name (child count per family matches)", () => {
    const reimported = parseGedcom(output);
    const originalChildCounts = families.map((f) => f.childrenIds.length).sort();
    const reimportedChildCounts = reimported.families.map((f) => f.childrenIds.length).sort();
    expect(reimportedChildCounts).toEqual(originalChildCounts);
  });
});
