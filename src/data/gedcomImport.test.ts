import { describe, it, expect } from "vitest";
import { parseGedcom } from "./gedcomImport";

const SAMPLE_GEDCOM = `
0 HEAD
1 SOUR TestExport
0 @I1@ INDI
1 NAME Johann /Schmidt/
1 SEX M
1 BIRT
2 DATE 12 JAN 1930
2 PLAC Berlin
1 DEAT
2 DATE 3 MAR 2001
2 PLAC Hamburg
1 NOTE Ein Testeintrag.
2 CONT Zweite Zeile.
0 @I2@ INDI
1 NAME Maria /Schmidt/
1 SEX F
1 BIRT
2 DATE 1932
0 @I3@ INDI
1 NAME Klaus /Schmidt/
1 SEX M
1 FAMC @F1@
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE JUN 1955
0 TRLR
`;

describe("parseGedcom", () => {
  const result = parseGedcom(SAMPLE_GEDCOM);
  const peopleById = new Map(result.people.map((p) => [p.id, p]));

  it("parses every INDI record into a Person with a prefixed id", () => {
    expect([...peopleById.keys()].sort()).toEqual(["gedcom-I1", "gedcom-I2", "gedcom-I3"]);
  });

  it("splits the GEDCOM 'Given /Surname/' name format", () => {
    const johann = peopleById.get("gedcom-I1")!;
    expect(johann.firstName).toBe("Johann");
    expect(johann.lastName).toBe("Schmidt");
  });

  it("maps SEX to gender", () => {
    expect(peopleById.get("gedcom-I1")?.gender).toBe("male");
    expect(peopleById.get("gedcom-I2")?.gender).toBe("female");
  });

  it("parses a full DD MON YYYY birth and death date plus place", () => {
    const johann = peopleById.get("gedcom-I1")!;
    expect(johann.birthDate).toBe("1930-01-12");
    expect(johann.birthPlace).toBe("Berlin");
    expect(johann.deathDate).toBe("2001-03-03");
    expect(johann.deathPlace).toBe("Hamburg");
  });

  it("parses a year-only date", () => {
    expect(peopleById.get("gedcom-I2")?.birthDate).toBe("1932");
  });

  it("joins NOTE and its CONT continuation lines into the biography", () => {
    expect(peopleById.get("gedcom-I1")?.biography).toBe("Ein Testeintrag.\nZweite Zeile.");
  });

  it("parses the FAM record's HUSB/WIFE into partnerIds and CHIL into childrenIds", () => {
    expect(result.families).toHaveLength(1);
    const family = result.families[0];
    expect(family.id).toBe("gedcom-F1");
    expect(family.partnerIds.sort()).toEqual(["gedcom-I1", "gedcom-I2"]);
    expect(family.childrenIds).toEqual(["gedcom-I3"]);
  });

  it("throws a clear error when the file has no INDI records", () => {
    expect(() => parseGedcom("0 HEAD\n1 SOUR Empty\n0 TRLR")).toThrow(/keine personen/i);
  });
});
