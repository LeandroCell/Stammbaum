# Stammbaum-Prototyp (Phase 1–3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ein lauffähiger, interaktiver Stammbaum-Prototyp: Beispieldaten,
klassische Baumansicht mit Zoom/Pan, anklickbare Personen, Info-Panel und
Zentrieren-Funktion.

**Architecture:** React + TypeScript SPA (Vite). Datenzugriff läuft
ausschließlich über `useFamilyData()`, sodass die Fixture später durch einen
echten API-Call ersetzt werden kann, ohne dass Komponenten sich ändern.
Layout-Berechnung ist von der Darstellung getrennt (`LayoutFn`-Typ), sodass
weitere Ansichten (Phase 4) ohne Änderungen an `TreeCanvas` ergänzt werden
können. Zustand (Mittelpunkt, Auswahl, aktive Ansicht) lebt in einem
zentralen Zustand-Store.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS 4, Zustand, D3
(Zoom/Pan), Vitest + React Testing Library.

**Spec:** [docs/superpowers/specs/2026-09-17-stammbaum-webapp-design.md](../specs/2026-09-17-stammbaum-webapp-design.md)

## Global Constraints

- UI-Sprache: Deutsch (Labels, Beispieldaten, Fehlermeldungen).
- Kein Backend/keine Netzwerk-Calls in dieser Phase — alle Daten kommen aus
  `src/data/sampleData.ts` über `useFamilyData()`.
- Jede Komponente, die Personendaten braucht, bekommt sie als Prop — keine
  Komponente importiert `sampleData` direkt außer `App.tsx`.
- Datenmodell folgt exakt der Spec (Abschnitt 3): `Person` + `Family`
  (Union-Modell), keine Eltern-IDs direkt an `Person`.
- Diese Phase deckt Spec-Abschnitte 3, 4 (nur „Klassisch“), 5, 6 und 8 ab.
  Radiale/Netzwerk-Ansicht, das Drei-Punkte-Menü, Responsive-Feinschliff und
  Performance-Tuning (Virtualisierung/Level-of-Detail) aus Abschnitt 7/9
  folgen in einem eigenen Anschlussplan, sobald dieser Prototyp läuft.

---

## Task 1: Projekt-Setup (Vite + React + TypeScript + Tailwind + Vitest)

Das Verzeichnis enthält bereits `README.md` und `docs/`, daher werden die
Vite-Grunddateien von Hand angelegt statt über das interaktive
`npm create vite`-Scaffolding (das bei einem nicht-leeren Verzeichnis
nachfragen würde).

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `.gitignore`
- Create: `src/main.tsx`
- Create: `src/vite-env.d.ts`
- Create: `src/index.css`
- Create: `src/App.tsx`
- Create: `src/App.test.tsx`
- Create: `src/test/setup.ts`

**Interfaces:**
- Produces: `App` (default export, `src/App.tsx`) — wird von `src/main.tsx`
  und von allen späteren Integrationstests importiert.

- [ ] **Step 1: Basisdateien anlegen**

`package.json`:
```json
{
  "name": "stammbaum",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "d3": "^7.9.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zustand": "^4.5.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/d3": "^7.4.3",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.2",
    "@tailwindcss/vite": "^4.0.0",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4.0.0",
    "typescript": "^5.6.2",
    "vite": "^5.4.8",
    "vitest": "^2.1.2"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"]
}
```

`index.html`:
```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Stammbaum</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

`.gitignore`:
```
node_modules
dist
*.local
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

`src/index.css`:
```css
@import "tailwindcss";
```

`src/test/setup.ts`:
```ts
import "@testing-library/jest-dom/vitest";
```

`src/main.tsx`:
```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

- [ ] **Step 2: Fehlschlagenden Smoke-Test schreiben**

`src/App.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import App from "./App";

describe("App", () => {
  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Stammbaum")).toBeInTheDocument();
  });
});
```

`src/App.tsx` (zunächst leer, damit der Test fehlschlägt):
```tsx
function App() {
  return null;
}

export default App;
```

- [ ] **Step 3: Dependencies installieren**

Run: `npm install`

- [ ] **Step 4: Test ausführen, Fehlschlag verifizieren**

Run: `npm test`
Expected: FAIL — "Stammbaum" wird nicht gefunden.

- [ ] **Step 5: Minimale Implementierung**

`src/App.tsx`:
```tsx
function App() {
  return (
    <div className="h-screen w-screen bg-slate-100">
      <h1 className="p-4 text-xl font-semibold text-slate-900">Stammbaum</h1>
    </div>
  );
}

export default App;
```

- [ ] **Step 6: Test ausführen, Erfolg verifizieren**

Run: `npm test`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json index.html vite.config.ts .gitignore src
git commit -m "chore: Vite/React/TS/Tailwind-Projekt aufsetzen"
```

---

## Task 2: Datenmodell + Beispieldaten + Datenzugriffs-Hook

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/sampleData.ts`
- Create: `src/data/sampleData.test.ts`
- Create: `src/data/useFamilyData.ts`

**Interfaces:**
- Produces: `Person`, `Family`, `Photo`, `Source`, `DocumentRef` (Typen aus
  `src/data/types.ts`); `people: Person[]`, `families: Family[]` (aus
  `src/data/sampleData.ts`); `useFamilyData(): { people, families, isLoading,
  error }` (aus `src/data/useFamilyData.ts`).

- [ ] **Step 1: Typen schreiben**

`src/data/types.ts`:
```ts
export type Gender = "male" | "female" | "other";

export interface Photo {
  id: string;
  url: string;
  caption?: string;
}

export interface Source {
  id: string;
  title: string;
  url?: string;
  note?: string;
}

export interface DocumentRef {
  id: string;
  title: string;
  url: string;
  type?: string;
}

export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthName?: string;
  gender?: Gender;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  biography?: string;
  photos?: Photo[];
  sources?: Source[];
  documents?: DocumentRef[];
  notes?: string;
}

export interface Family {
  id: string;
  partnerIds: string[];
  childrenIds: string[];
}
```

- [ ] **Step 2: Beispieldaten schreiben**

`src/data/sampleData.ts`:
```ts
import type { Person, Family } from "./types";

export const people: Person[] = [
  {
    id: "pgf",
    firstName: "Karl",
    lastName: "Berger",
    birthDate: "1930-03-12",
    deathDate: "2005-11-02",
    birthPlace: "München",
    gender: "male",
  },
  {
    id: "pgm",
    firstName: "Erna",
    lastName: "Berger",
    birthName: "Wolf",
    birthDate: "1932-07-04",
    deathDate: "2010-01-20",
    birthPlace: "Augsburg",
    gender: "female",
  },
  {
    id: "mgf",
    firstName: "Hans",
    lastName: "Vogel",
    birthDate: "1928-05-09",
    deathDate: "1999-09-15",
    birthPlace: "Köln",
    gender: "male",
  },
  {
    id: "mgm",
    firstName: "Grete",
    lastName: "Vogel",
    birthName: "Schmidt",
    birthDate: "1931-02-27",
    deathDate: "2012-06-30",
    birthPlace: "Bonn",
    gender: "female",
  },
  {
    id: "father",
    firstName: "Thomas",
    lastName: "Berger",
    birthDate: "1958-09-21",
    birthPlace: "München",
    gender: "male",
    biography: "Aufgewachsen in München, später Ingenieur.",
  },
  {
    id: "mother",
    firstName: "Anna",
    lastName: "Berger",
    birthName: "Vogel",
    birthDate: "1961-04-14",
    birthPlace: "Köln",
    gender: "female",
  },
  {
    id: "sibling1",
    firstName: "Julia",
    lastName: "Berger",
    birthDate: "1990-12-01",
    gender: "female",
  },
  {
    id: "me",
    firstName: "Max",
    lastName: "Berger",
    birthDate: "1988-06-18",
    birthPlace: "Frankfurt am Main",
    gender: "male",
    biography: "Mittelpunkt des Beispiel-Stammbaums.",
    photos: [
      { id: "photo-me-1", url: "https://placehold.co/200x200", caption: "Beispielbild" },
    ],
    sources: [
      { id: "src-1", title: "Geburtsurkunde Standesamt Frankfurt", note: "Familienarchiv" },
    ],
    documents: [
      { id: "doc-1", title: "Einbürgerungsurkunde", url: "https://example.com/doc.pdf", type: "PDF" },
    ],
  },
  {
    id: "partner",
    firstName: "Lisa",
    lastName: "Berger",
    birthName: "Fuchs",
    birthDate: "1989-02-09",
    gender: "female",
  },
  {
    id: "child1",
    firstName: "Ben",
    lastName: "Berger",
    birthDate: "2016-08-30",
    gender: "male",
  },
];

export const families: Family[] = [
  { id: "fam-paternal", partnerIds: ["pgf", "pgm"], childrenIds: ["father"] },
  { id: "fam-maternal", partnerIds: ["mgf", "mgm"], childrenIds: ["mother"] },
  { id: "fam-parents", partnerIds: ["father", "mother"], childrenIds: ["me", "sibling1"] },
  { id: "fam-me", partnerIds: ["me", "partner"], childrenIds: ["child1"] },
];
```

- [ ] **Step 3: Integritätstest schreiben**

`src/data/sampleData.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { people, families } from "./sampleData";

describe("sampleData integrity", () => {
  const personIds = new Set(people.map((p) => p.id));

  it("has unique person ids", () => {
    expect(personIds.size).toBe(people.length);
  });

  it("references only existing people in every family", () => {
    for (const family of families) {
      for (const id of [...family.partnerIds, ...family.childrenIds]) {
        expect(personIds.has(id)).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- sampleData`
Expected: PASS (die Daten sind bereits korrekt geschrieben — dieser Test
schützt vor zukünftigen Tippfehlern beim Erweitern der Beispieldaten)

- [ ] **Step 5: Datenzugriffs-Hook schreiben**

`src/data/useFamilyData.ts`:
```ts
import { useMemo } from "react";
import { people, families } from "./sampleData";
import type { Person, Family } from "./types";

interface FamilyData {
  people: Person[];
  families: Family[];
  isLoading: boolean;
  error: Error | null;
}

export function useFamilyData(): FamilyData {
  return useMemo(
    () => ({ people, families, isLoading: false, error: null }),
    []
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add src/data
git commit -m "feat: Datenmodell, Beispieldaten und useFamilyData-Hook"
```

---

## Task 3: Zustand-Store

**Files:**
- Create: `src/state/useTreeStore.ts`
- Create: `src/state/useTreeStore.test.ts`

**Interfaces:**
- Consumes: nichts.
- Produces: `useTreeStore` (Zustand-Hook) mit State `{ centerPersonId:
  string, selectedPersonId: string | null, activeView: "classic" | "radial"
  | "network" }` und Actions `setCenterPerson(id: string)`,
  `selectPerson(id: string | null)`, `setActiveView(view: ViewMode)`.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/state/useTreeStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import { useTreeStore } from "./useTreeStore";

const initialState = useTreeStore.getState();

describe("useTreeStore", () => {
  beforeEach(() => {
    useTreeStore.setState(initialState, true);
  });

  it("starts centered on 'me' with the classic view and no selection", () => {
    const state = useTreeStore.getState();
    expect(state.centerPersonId).toBe("me");
    expect(state.selectedPersonId).toBeNull();
    expect(state.activeView).toBe("classic");
  });

  it("updates the center person", () => {
    useTreeStore.getState().setCenterPerson("father");
    expect(useTreeStore.getState().centerPersonId).toBe("father");
  });

  it("selects and clears a person", () => {
    useTreeStore.getState().selectPerson("mother");
    expect(useTreeStore.getState().selectedPersonId).toBe("mother");
    useTreeStore.getState().selectPerson(null);
    expect(useTreeStore.getState().selectedPersonId).toBeNull();
  });

  it("switches the active view", () => {
    useTreeStore.getState().setActiveView("radial");
    expect(useTreeStore.getState().activeView).toBe("radial");
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- useTreeStore`
Expected: FAIL — Modul `./useTreeStore` existiert nicht.

- [ ] **Step 3: Store implementieren**

`src/state/useTreeStore.ts`:
```ts
import { create } from "zustand";

export type ViewMode = "classic" | "radial" | "network";

interface TreeState {
  centerPersonId: string;
  selectedPersonId: string | null;
  activeView: ViewMode;
  setCenterPerson: (personId: string) => void;
  selectPerson: (personId: string | null) => void;
  setActiveView: (view: ViewMode) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  centerPersonId: "me",
  selectedPersonId: null,
  activeView: "classic",
  setCenterPerson: (personId) => set({ centerPersonId: personId }),
  selectPerson: (personId) => set({ selectedPersonId: personId }),
  setActiveView: (view) => set({ activeView: view }),
}));
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- useTreeStore`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/state
git commit -m "feat: zentralen Zustand-Store für Mittelpunkt/Auswahl/Ansicht"
```

---

## Task 4: `classicLayout`-Algorithmus

**Files:**
- Create: `src/layout/layout.types.ts`
- Create: `src/layout/classicLayout.ts`
- Create: `src/layout/classicLayout.test.ts`

**Interfaces:**
- Consumes: `Person`, `Family` (aus `src/data/types.ts`); Beispieldaten
  `people`, `families` (aus `src/data/sampleData.ts`, nur im Test).
- Produces: `PositionedNode { personId: string; x: number; y: number;
  generation: number }`, `LayoutEdge { id: string; fromPersonId: string;
  toPersonId: string; kind: "parent-child" | "partner" }`, `LayoutResult {
  nodes: PositionedNode[]; edges: LayoutEdge[] }`, `LayoutFn = (people:
  Person[], families: Family[], centerPersonId: string) => LayoutResult`
  (aus `src/layout/layout.types.ts`); `classicLayout: LayoutFn` (aus
  `src/layout/classicLayout.ts`) — wird in Task 6 von `TreeCanvas`
  konsumiert.

- [ ] **Step 1: Typen schreiben**

`src/layout/layout.types.ts`:
```ts
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
```

- [ ] **Step 2: Fehlschlagenden Test schreiben**

`src/layout/classicLayout.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { classicLayout } from "./classicLayout";
import { people, families } from "../data/sampleData";

describe("classicLayout", () => {
  const result = classicLayout(people, families, "me");
  const nodeById = new Map(result.nodes.map((n) => [n.personId, n]));

  it("places the center person at the origin", () => {
    expect(nodeById.get("me")).toMatchObject({ x: 0, y: 0, generation: 0 });
  });

  it("places the father to the right and the mother to the left", () => {
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;
    expect(father.x).toBeGreaterThan(mother.x);
    expect(father.generation).toBe(-1);
    expect(mother.generation).toBe(-1);
  });

  it("places the paternal grandfather further out than the father", () => {
    const father = nodeById.get("father")!;
    const paternalGrandfather = nodeById.get("pgf")!;
    expect(Math.abs(paternalGrandfather.x)).toBeGreaterThanOrEqual(Math.abs(father.x));
    expect(paternalGrandfather.generation).toBe(-2);
  });

  it("places children below the center person", () => {
    const child = nodeById.get("child1")!;
    expect(child.y).toBeGreaterThan(0);
    expect(child.generation).toBe(1);
  });

  it("connects every family relationship with an edge", () => {
    const edgeKey = (a: string, b: string) => `${a}->${b}`;
    const edgeSet = new Set(result.edges.map((e) => edgeKey(e.fromPersonId, e.toPersonId)));
    expect(edgeSet.has(edgeKey("father", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("mother", "me"))).toBe(true);
    expect(edgeSet.has(edgeKey("me", "child1"))).toBe(true);
  });

  it("includes the ancestor chain, the partner, and the descendants of the center person", () => {
    const expectedIds = ["me", "father", "mother", "pgf", "pgm", "mgf", "mgm", "partner", "child1"];
    expect([...nodeById.keys()].sort()).toEqual(expectedIds.sort());
  });
});
```

- [ ] **Step 3: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- classicLayout`
Expected: FAIL — Modul `./classicLayout` existiert nicht.

- [ ] **Step 4: Layout-Algorithmus implementieren**

`src/layout/classicLayout.ts`:
```ts
import type { Person, Family } from "../data/types";
import type { LayoutEdge, LayoutFn, PositionedNode } from "./layout.types";

const GENERATION_HEIGHT = 160;
const NODE_SPACING = 220;
const MAX_ANCESTOR_GENERATIONS = 5;
const MAX_DESCENDANT_GENERATIONS = 5;

interface Maps {
  peopleById: Map<string, Person>;
  familyByChildId: Map<string, Family>;
  familiesByPartnerId: Map<string, Family[]>;
}

// ponytail: assumes a person is a child in at most one family (no known
// double-adoption cases in the sample data). Extend familyByChildId to a
// Map<string, Family[]> if that ever needs to be modeled.
function buildMaps(people: Person[], families: Family[]): Maps {
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

function orderParentsFatherFirst(partnerIds: string[], peopleById: Map<string, Person>): string[] {
  const known = partnerIds.filter((id) => peopleById.has(id));
  const father = known.find((id) => peopleById.get(id)?.gender === "male");
  const mother = known.find((id) => peopleById.get(id)?.gender === "female");
  const rest = known.filter((id) => id !== father && id !== mother);
  return [father, mother, ...rest].filter((id): id is string => Boolean(id));
}

function layoutAncestors(
  personId: string,
  generation: number,
  maps: Maps,
  nextLeafX: { value: number },
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): number {
  const parentFamily =
    generation < MAX_ANCESTOR_GENERATIONS ? maps.familyByChildId.get(personId) : undefined;
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, maps.peopleById)
    : [undefined, undefined];

  if (!fatherId && !motherId) {
    const x = nextLeafX.value;
    nextLeafX.value += NODE_SPACING;
    nodes.set(personId, { personId, x, y: -generation * GENERATION_HEIGHT, generation: -generation });
    return x;
  }

  const motherX = motherId
    ? layoutAncestors(motherId, generation + 1, maps, nextLeafX, nodes, edges)
    : undefined;
  const fatherX = fatherId
    ? layoutAncestors(fatherId, generation + 1, maps, nextLeafX, nodes, edges)
    : undefined;

  for (const parentId of [fatherId, motherId]) {
    if (parentId) {
      edges.push({
        id: `${parentId}->${personId}`,
        fromPersonId: parentId,
        toPersonId: personId,
        kind: "parent-child",
      });
    }
  }

  const xs = [motherX, fatherX].filter((v): v is number => v !== undefined);
  const x = xs.reduce((a, b) => a + b, 0) / xs.length;
  nodes.set(personId, { personId, x, y: -generation * GENERATION_HEIGHT, generation: -generation });
  return x;
}

// ponytail: classic view shows only the center person's direct ancestor
// line, their partner(s), and their own descendants — siblings/aunts/uncles
// are intentionally out of scope here (per spec section 4). Centering on a
// parent naturally reveals those relatives as that parent's own descendants.
function layoutDescendants(
  personId: string,
  generation: number,
  centerX: number,
  maps: Maps,
  nextLeafX: { value: number },
  nodes: Map<string, PositionedNode>,
  edges: LayoutEdge[]
): void {
  if (generation > MAX_DESCENDANT_GENERATIONS) return;
  const partnerFamilies = maps.familiesByPartnerId.get(personId) ?? [];
  const childIds = partnerFamilies.flatMap((f) => f.childrenIds);

  if (!nodes.has(personId)) {
    nodes.set(personId, { personId, x: centerX, y: generation * GENERATION_HEIGHT, generation });
  }

  // ponytail: children are spaced evenly left-to-right without being
  // perfectly re-centered under multiple siblings; fine for the sample
  // data's small families, revisit with a tidy-tree pass for large ones.
  childIds.forEach((childId) => {
    edges.push({
      id: `${personId}->${childId}`,
      fromPersonId: personId,
      toPersonId: childId,
      kind: "parent-child",
    });
    const x = nextLeafX.value;
    nextLeafX.value += NODE_SPACING;
    nodes.set(childId, { personId: childId, x, y: (generation + 1) * GENERATION_HEIGHT, generation: generation + 1 });
    layoutDescendants(childId, generation + 1, x, maps, nextLeafX, nodes, edges);
  });
}

export const classicLayout: LayoutFn = (people, families, centerPersonId) => {
  const maps = buildMaps(people, families);
  const nodes = new Map<string, PositionedNode>();
  const edges: LayoutEdge[] = [];

  const ancestorLeafX = { value: 0 };
  const centerX = layoutAncestors(centerPersonId, 0, maps, ancestorLeafX, nodes, edges);

  const centerFamilies = maps.familiesByPartnerId.get(centerPersonId) ?? [];
  const partnerIds = centerFamilies
    .flatMap((f) => f.partnerIds)
    .filter((id) => id !== centerPersonId);
  partnerIds.forEach((partnerId, index) => {
    nodes.set(partnerId, {
      personId: partnerId,
      x: centerX + NODE_SPACING * (index + 1),
      y: 0,
      generation: 0,
    });
    edges.push({
      id: `${centerPersonId}-${partnerId}`,
      fromPersonId: centerPersonId,
      toPersonId: partnerId,
      kind: "partner",
    });
  });

  const descendantLeafX = { value: centerX - NODE_SPACING / 2 };
  layoutDescendants(centerPersonId, 0, centerX, maps, descendantLeafX, nodes, edges);

  const offsetX = nodes.get(centerPersonId)?.x ?? 0;
  const recentered = Array.from(nodes.values()).map((n) => ({ ...n, x: n.x - offsetX }));

  return { nodes: recentered, edges };
};
```

- [ ] **Step 5: Test ausführen, Erfolg verifizieren**

Run: `npm test -- classicLayout`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/layout
git commit -m "feat: classicLayout-Algorithmus für die klassische Baumansicht"
```

---

## Task 5: `PersonCard`-Komponente

**Files:**
- Create: `src/components/PersonCard/PersonCard.tsx`
- Create: `src/components/PersonCard/PersonCard.test.tsx`

**Interfaces:**
- Consumes: `Person` (aus `src/data/types.ts`).
- Produces: `PersonCard(props: { person: Person; x: number; y: number;
  isSelected: boolean; onSelect: (personId: string) => void })`, benannte
  Exporte `CARD_WIDTH`, `CARD_HEIGHT` — werden in Task 6 von `TreeCanvas`
  konsumiert.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/components/PersonCard/PersonCard.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonCard } from "./PersonCard";
import type { Person } from "../../data/types";

const person: Person = {
  id: "me",
  firstName: "Max",
  lastName: "Berger",
  birthDate: "1988-06-18",
};

describe("PersonCard", () => {
  it("shows the person's name and birth year", () => {
    render(
      <svg>
        <PersonCard person={person} x={0} y={0} isSelected={false} onSelect={() => {}} />
      </svg>
    );
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText("1988")).toBeInTheDocument();
  });

  it("calls onSelect with the person's id when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <PersonCard person={person} x={0} y={0} isSelected={false} onSelect={onSelect} />
      </svg>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("me");
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- PersonCard`
Expected: FAIL — Modul `./PersonCard` existiert nicht.

- [ ] **Step 3: Komponente implementieren**

`src/components/PersonCard/PersonCard.tsx`:
```tsx
import type { Person } from "../../data/types";

const CARD_WIDTH = 180;
const CARD_HEIGHT = 72;

interface PersonCardProps {
  person: Person;
  x: number;
  y: number;
  isSelected: boolean;
  onSelect: (personId: string) => void;
}

function formatYear(dateString?: string): string | undefined {
  return dateString?.slice(0, 4);
}

export function PersonCard({ person, x, y, isSelected, onSelect }: PersonCardProps) {
  const birthYear = formatYear(person.birthDate);
  const deathYear = formatYear(person.deathDate);
  const dateLine = [birthYear ?? "?", deathYear ?? ""].filter(Boolean).join(" – ");

  return (
    <foreignObject x={x - CARD_WIDTH / 2} y={y - CARD_HEIGHT / 2} width={CARD_WIDTH} height={CARD_HEIGHT}>
      <button
        type="button"
        onClick={() => onSelect(person.id)}
        className={`h-full w-full rounded-lg border px-3 py-2 text-left shadow-sm transition-colors ${
          isSelected
            ? "border-amber-400 bg-amber-50 ring-2 ring-amber-300"
            : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-md"
        }`}
      >
        <div className="truncate text-sm font-semibold text-slate-900">
          {person.firstName} {person.lastName}
        </div>
        <div className="text-xs text-slate-500">{dateLine}</div>
      </button>
    </foreignObject>
  );
}

export { CARD_WIDTH, CARD_HEIGHT };
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- PersonCard`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PersonCard
git commit -m "feat: kompakte PersonCard-Komponente"
```

---

## Task 6: `TreeCanvas`-Komponente (SVG + D3 Zoom/Pan)

**Files:**
- Create: `src/components/TreeCanvas/TreeCanvas.tsx`
- Create: `src/components/TreeCanvas/TreeCanvas.test.tsx`

**Interfaces:**
- Consumes: `Person`, `Family` (`src/data/types.ts`); `LayoutFn`
  (`src/layout/layout.types.ts`); `classicLayout` (`src/layout/classicLayout.ts`,
  nur im Test); `PersonCard` (`src/components/PersonCard/PersonCard.tsx`).
- Produces: `TreeCanvas(props: { people: Person[]; families: Family[];
  centerPersonId: string; layoutFn: LayoutFn; selectedPersonId: string |
  null; onSelectPerson: (personId: string) => void })` — wird in Task 8 von
  `App` konsumiert.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/components/TreeCanvas/TreeCanvas.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TreeCanvas } from "./TreeCanvas";
import { classicLayout } from "../../layout/classicLayout";
import { people, families } from "../../data/sampleData";

describe("TreeCanvas", () => {
  it("renders person cards for the center person and their relatives", () => {
    render(
      <TreeCanvas
        people={people}
        families={families}
        centerPersonId="me"
        layoutFn={classicLayout}
        selectedPersonId={null}
        onSelectPerson={() => {}}
      />
    );
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText("Thomas Berger")).toBeInTheDocument();
  });

  it("calls onSelectPerson when a card is clicked", async () => {
    const onSelectPerson = vi.fn();
    render(
      <TreeCanvas
        people={people}
        families={families}
        centerPersonId="me"
        layoutFn={classicLayout}
        selectedPersonId={null}
        onSelectPerson={onSelectPerson}
      />
    );
    await userEvent.click(screen.getByText("Thomas Berger"));
    expect(onSelectPerson).toHaveBeenCalledWith("father");
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- TreeCanvas`
Expected: FAIL — Modul `./TreeCanvas` existiert nicht.

- [ ] **Step 3: Komponente implementieren**

`src/components/TreeCanvas/TreeCanvas.tsx`:
```tsx
import { useEffect, useMemo, useRef } from "react";
import * as d3 from "d3";
import type { Person, Family } from "../../data/types";
import type { LayoutFn } from "../../layout/layout.types";
import { PersonCard } from "../PersonCard/PersonCard";

interface TreeCanvasProps {
  people: Person[];
  families: Family[];
  centerPersonId: string;
  layoutFn: LayoutFn;
  selectedPersonId: string | null;
  onSelectPerson: (personId: string) => void;
}

export function TreeCanvas({
  people,
  families,
  centerPersonId,
  layoutFn,
  selectedPersonId,
  onSelectPerson,
}: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);

  const layout = useMemo(
    () => layoutFn(people, families, centerPersonId),
    [people, families, centerPersonId, layoutFn]
  );

  useEffect(() => {
    if (!svgRef.current || !groupRef.current) return;
    const svg = d3.select(svgRef.current);
    const group = d3.select(groupRef.current);

    // ponytail: camera reset on re-center is instant; add a d3 transition
    // for a smooth animated pan if that's noticeably jarring in practice.
    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 3])
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        group.attr("transform", event.transform.toString());
      });

    svg.call(zoomBehavior);
    svg.call(
      zoomBehavior.transform,
      d3.zoomIdentity.translate(window.innerWidth / 2, window.innerHeight / 2)
    );

    return () => {
      svg.on(".zoom", null);
    };
  }, [centerPersonId]);

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const nodeById = useMemo(() => new Map(layout.nodes.map((n) => [n.personId, n])), [layout]);

  return (
    <svg ref={svgRef} className="h-full w-full bg-slate-100">
      <g ref={groupRef}>
        {layout.edges.map((edge) => {
          const from = nodeById.get(edge.fromPersonId);
          const to = nodeById.get(edge.toPersonId);
          if (!from || !to) return null;
          return <line key={edge.id} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#94a3b8" strokeWidth={2} />;
        })}
        {layout.nodes.map((node) => {
          const person = peopleById.get(node.personId);
          if (!person) return null;
          return (
            <PersonCard
              key={node.personId}
              person={person}
              x={node.x}
              y={node.y}
              isSelected={node.personId === selectedPersonId}
              onSelect={onSelectPerson}
            />
          );
        })}
      </g>
    </svg>
  );
}
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- TreeCanvas`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/TreeCanvas
git commit -m "feat: TreeCanvas mit SVG-Rendering und D3-Zoom/Pan"
```

---

## Task 7: `PersonInfoPanel`-Komponente

**Files:**
- Create: `src/components/PersonInfoPanel/PersonInfoPanel.tsx`
- Create: `src/components/PersonInfoPanel/PersonInfoPanel.test.tsx`

**Interfaces:**
- Consumes: `Person` (aus `src/data/types.ts`).
- Produces: `PersonInfoPanel(props: { person: Person | null; onClose: () =>
  void; onCenter: (personId: string) => void })` — wird in Task 8 von `App`
  konsumiert.

- [ ] **Step 1: Fehlschlagenden Test schreiben**

`src/components/PersonInfoPanel/PersonInfoPanel.test.tsx`:
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonInfoPanel } from "./PersonInfoPanel";
import { people } from "../../data/sampleData";

const me = people.find((p) => p.id === "me")!;

describe("PersonInfoPanel", () => {
  it("shows the person's details when a person is given", () => {
    render(<PersonInfoPanel person={me} onClose={() => {}} onCenter={() => {}} />);
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText(/Frankfurt am Main/)).toBeInTheDocument();
  });

  it("calls onCenter with the person's id when 'Zentrieren' is clicked", async () => {
    const onCenter = vi.fn();
    render(<PersonInfoPanel person={me} onClose={() => {}} onCenter={onCenter} />);
    await userEvent.click(screen.getByText("Zentrieren"));
    expect(onCenter).toHaveBeenCalledWith("me");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<PersonInfoPanel person={me} onClose={onClose} onCenter={() => {}} />);
    await userEvent.click(screen.getByLabelText("Schließen"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays hidden when no person is selected", () => {
    render(<PersonInfoPanel person={null} onClose={() => {}} onCenter={() => {}} />);
    expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- PersonInfoPanel`
Expected: FAIL — Modul `./PersonInfoPanel` existiert nicht.

- [ ] **Step 3: Komponente implementieren**

`src/components/PersonInfoPanel/PersonInfoPanel.tsx`:
```tsx
import type { Person } from "../../data/types";

interface PersonInfoPanelProps {
  person: Person | null;
  onClose: () => void;
  onCenter: (personId: string) => void;
}

function formatDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;
  const [year, month, day] = dateString.split("-");
  if (!month || !day) return year;
  return `${day}.${month}.${year}`;
}

export function PersonInfoPanel({ person, onClose, onCenter }: PersonInfoPanelProps) {
  return (
    <aside
      className={`fixed left-0 top-0 h-full w-full max-w-sm transform bg-white shadow-xl transition-transform duration-300 ease-out ${
        person ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-hidden={!person}
    >
      {person && (
        <div className="flex h-full flex-col overflow-y-auto p-6">
          <div className="flex items-start justify-between">
            <h2 className="text-lg font-semibold text-slate-900">
              {person.firstName} {person.lastName}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Schließen">
              ✕
            </button>
          </div>

          <button
            type="button"
            onClick={() => onCenter(person.id)}
            className="mt-4 self-start rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Zentrieren
          </button>

          <section className="mt-6 space-y-1 text-sm text-slate-700">
            <h3 className="font-medium text-slate-900">Übersicht</h3>
            {person.birthName && <p>Geburtsname: {person.birthName}</p>}
            <p>Geboren: {formatDate(person.birthDate) ?? "unbekannt"}</p>
            {person.birthPlace && <p>Geburtsort: {person.birthPlace}</p>}
            {person.deathDate && <p>Gestorben: {formatDate(person.deathDate)}</p>}
            {person.deathPlace && <p>Sterbeort: {person.deathPlace}</p>}
          </section>

          {person.biography && (
            <section className="mt-6 text-sm text-slate-700">
              <h3 className="font-medium text-slate-900">Biografie</h3>
              <p className="mt-1 whitespace-pre-line">{person.biography}</p>
            </section>
          )}

          <section className="mt-6 text-sm text-slate-700">
            <h3 className="font-medium text-slate-900">Bilder</h3>
            {person.photos?.length ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {person.photos.map((photo) => (
                  <img key={photo.id} src={photo.url} alt={photo.caption ?? ""} className="aspect-square rounded object-cover" />
                ))}
              </div>
            ) : (
              <p className="mt-1 text-slate-400">Keine Bilder hinterlegt.</p>
            )}
          </section>

          <section className="mt-6 text-sm text-slate-700">
            <h3 className="font-medium text-slate-900">Quellen</h3>
            {person.sources?.length ? (
              <ul className="mt-1 list-disc pl-4">
                {person.sources.map((source) => (
                  <li key={source.id}>
                    {source.url ? (
                      <a href={source.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                    {source.note ? ` – ${source.note}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-400">Keine Quellen hinterlegt.</p>
            )}
          </section>

          <section className="mt-6 text-sm text-slate-700">
            <h3 className="font-medium text-slate-900">Dokumente</h3>
            {person.documents?.length ? (
              <ul className="mt-1 list-disc pl-4">
                {person.documents.map((doc) => (
                  <li key={doc.id}>
                    <a href={doc.url} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                      {doc.title}
                    </a>
                    {doc.type ? ` (${doc.type})` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-slate-400">Keine Dokumente hinterlegt.</p>
            )}
          </section>
        </div>
      )}
    </aside>
  );
}
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test -- PersonInfoPanel`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/PersonInfoPanel
git commit -m "feat: PersonInfoPanel mit Übersicht, Biografie, Bildern, Quellen, Dokumenten"
```

---

## Task 8: App-Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Interfaces:**
- Consumes: `useFamilyData` (`src/data/useFamilyData.ts`), `useTreeStore`
  (`src/state/useTreeStore.ts`), `TreeCanvas`
  (`src/components/TreeCanvas/TreeCanvas.tsx`), `PersonInfoPanel`
  (`src/components/PersonInfoPanel/PersonInfoPanel.tsx`), `classicLayout`
  (`src/layout/classicLayout.ts`).
- Produces: fertiger End-to-End-Ablauf: Person anklicken → Info-Panel öffnet
  sich → „Zentrieren“ klicken → Baum baut sich um die neue Mittelpunkt-Person
  neu auf.

- [ ] **Step 1: Fehlschlagende Integrationstests ergänzen**

`src/App.test.tsx` (bestehende Datei erweitern):
```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import App from "./App";
import { useTreeStore } from "./state/useTreeStore";

const initialState = useTreeStore.getState();

describe("App", () => {
  beforeEach(() => {
    useTreeStore.setState(initialState, true);
  });

  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Stammbaum")).toBeInTheDocument();
  });

  it("opens the info panel with the clicked person's details", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Thomas Berger"));
    expect(screen.getByText("Zentrieren")).toBeInTheDocument();
    expect(screen.getByText(/München/)).toBeInTheDocument();
  });

  it("re-centers the tree on the selected person", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Thomas Berger"));
    await userEvent.click(screen.getByText("Zentrieren"));
    expect(screen.getByText("Julia Berger")).toBeInTheDocument();
    expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Test ausführen, Fehlschlag verifizieren**

Run: `npm test -- App`
Expected: FAIL — Info-Panel/Zentrieren-Verhalten existiert in `App.tsx`
noch nicht.

- [ ] **Step 3: `App.tsx` implementieren**

`src/App.tsx`:
```tsx
import { useFamilyData } from "./data/useFamilyData";
import { useTreeStore } from "./state/useTreeStore";
import { TreeCanvas } from "./components/TreeCanvas/TreeCanvas";
import { PersonInfoPanel } from "./components/PersonInfoPanel/PersonInfoPanel";
import { classicLayout } from "./layout/classicLayout";

function App() {
  const { people, families } = useFamilyData();
  const centerPersonId = useTreeStore((s) => s.centerPersonId);
  const selectedPersonId = useTreeStore((s) => s.selectedPersonId);
  const selectPerson = useTreeStore((s) => s.selectPerson);
  const setCenterPerson = useTreeStore((s) => s.setCenterPerson);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-900">Stammbaum</h1>
      </header>

      <TreeCanvas
        people={people}
        families={families}
        centerPersonId={centerPersonId}
        layoutFn={classicLayout}
        selectedPersonId={selectedPersonId}
        onSelectPerson={selectPerson}
      />

      <PersonInfoPanel
        person={selectedPerson}
        onClose={() => selectPerson(null)}
        onCenter={(personId) => {
          setCenterPerson(personId);
          selectPerson(null);
        }}
      />
    </div>
  );
}

export default App;
```

- [ ] **Step 4: Test ausführen, Erfolg verifizieren**

Run: `npm test`
Expected: PASS (alle Tests aus Task 1–8)

- [ ] **Step 5: Manuell im Browser prüfen**

Run: `npm run dev`, im Browser öffnen, eine Personen-Karte anklicken, Panel
prüfen, „Zentrieren“ klicken, prüfen dass der Baum sich neu aufbaut und
Zoom/Pan mit Mausrad bzw. Ziehen funktioniert.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: App-Integration – Klick, Info-Panel und Zentrieren verbinden"
```

---

## Danach

Sobald dieser Plan umgesetzt ist, existiert ein lauffähiger Prototyp mit der
klassischen Ansicht. Ein Folge-Plan ergänzt dann Spec-Abschnitt 4 (radiale
und Netzwerk-Ansicht + Drei-Punkte-Menü) sowie Abschnitt 7/9
(Virtualisierung, Level-of-Detail, Responsive-Feinschliff für
Tablet/Smartphone).
