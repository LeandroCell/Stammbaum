# Interaktiver Familien-Stammbaum – Design-Spezifikation

Datum: 2026-09-17
Status: Freigegeben, bereit für Implementierungsplan

## 1. Ziel

Eine moderne, interaktive Web-App, die einen Familien-Stammbaum ausgehend von
einer beliebigen Mittelpunkt-Person darstellt. Nutzer können frei zoomen,
verschieben, Personen anklicken, Details einsehen und jede Person zum neuen
Mittelpunkt machen. Drei Darstellungsarten (klassisch, rund, Netzwerk) sind
über ein Drei-Punkte-Menü wählbar. Diese Phase liefert einen vollständig
interaktiven Frontend-Prototyp mit Beispieldaten; die Datenschicht ist so
gekapselt, dass sie später ohne UI-Änderungen durch eine echte API/Datenbank
ersetzt werden kann.

## 2. Entscheidungen (aus Brainstorming)

| Bereich | Entscheidung |
|---|---|
| Rendering-Engine | SVG + D3.js (Zoom/Pan/Skalierung), mit Renderer-Virtualisierung |
| Frontend-Stack | React + TypeScript, Build-Tool Vite |
| Backend-Umfang (diese Phase) | Nur Frontend, Beispieldaten als typisierte Fixtures hinter einer Datenzugriffs-Schicht |
| Styling | Tailwind CSS |
| State-Management | Zustand (minimal, kein Redux-Overhead) |
| Tests | Vitest, Fokus auf die reinen Layout-Algorithmen |

## 3. Datenmodell

Genealogisch korrekt für Mehrfachehen, Stiefkinder, Adoptionen: Beziehungen
werden nicht direkt an der Person gespeichert, sondern über `Family`-Einheiten
(vergleichbar mit GEDCOM `FAM`-Records).

```ts
interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthName?: string;        // Geburtsname, falls abweichend
  gender?: "male" | "female" | "other";
  birthDate?: string;        // ISO 8601, auch unvollständig (nur Jahr) erlaubt
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  biography?: string;        // Freitext/Markdown
  photos?: Photo[];
  sources?: Source[];
  documents?: Document[];
  notes?: string;
}

interface Family {
  id: string;
  partnerIds: string[];      // meist 2, unterstützt aber auch Einzelelternteil
  childrenIds: string[];
}

interface Photo    { id: string; url: string; caption?: string; }
interface Source   { id: string; title: string; url?: string; note?: string; }
interface Document { id: string; title: string; url: string; type?: string; }
```

Ableitungen (Eltern, Kinder, Geschwister, Partner einer Person) werden zur
Laufzeit aus `Family[]` berechnet, nicht redundant gespeichert.

### Datenzugriffs-Schicht

`src/data/useFamilyData.ts` liefert `{ people, families, isLoading, error }`
über einen Hook. Die Implementierung liest heute aus einer lokalen
TypeScript-Fixture (`src/data/sampleData.ts`); ein späterer Wechsel auf einen
REST/GraphQL-Call ändert nur diese eine Datei, keine Komponente.

## 4. Darstellungsarten

Jede Ansicht ist eine reine, unabhängig testbare Funktion:

```ts
type LayoutFn = (
  people: Person[],
  families: Family[],
  centerPersonId: string
) => { nodes: PositionedNode[]; edges: Edge[] };
```

1. **Klassisch** (`classicLayout`): Mittelpunkt-Person zentral. Vorfahren
   verzweigen generationsweise nach oben, Vater-Seite rechts, Mutter-Seite
   links. Nachkommen verzweigen nach unten. Partner werden nebeneinander
   platziert. Entspricht einem kombinierten Pedigree-/Descendant-Chart.
2. **Rund** (`radialLayout`): Reiner Vorfahren-Fächer (Fan Chart). Mittelpunkt
   in der Mitte, Generationen als konzentrische Ringe, ältere Generationen
   weiter außen.
3. **Netzwerk** (`networkLayout`): Deterministisches Schichten-Layout (kein
   Live-Physik-/Force-Sim, um bei großen Bäumen Ruckeln zu vermeiden) für
   übersichtliche Darstellung komplexer/verzweigter Konstellationen als
   verbundenes Netzwerk.

Wechsel zwischen den Ansichten über ein Drei-Punkte-Menü oben rechts in der
UI.

## 5. Interaktion

- **Pan/Zoom**: D3-Zoom-Verhalten auf dem SVG-Root, Mausrad/Pinch zum Zoomen,
  Drag zum Verschieben, sanfte Transitions bei programmatischen
  Kamera-Bewegungen (z. B. beim Zentrieren).
- **Personen-Karte anklicken**: öffnet das Info-Panel links (siehe Abschnitt
  6), Baum bleibt sichtbar und wird nicht verdeckt.
- **„Zentrieren“**: im Info-Panel oder Kontextmenü einer Karte verfügbar.
  Setzt `centerPersonId` im Store, Layout wird neu berechnet, Kamera fährt
  animiert zur neuen Mittelpunkt-Person.
- **Kompakte Kartenansicht** zeigt: Name, Geburtsdatum, ggf. Sterbedatum.

## 6. Info-Panel

Öffnet sich als Slide-in-Panel von links (nicht modal, keine Verdeckung des
Baums). Inhalt in Tabs/Abschnitten:

- Übersicht: vollständiger Name, Geburtsdatum/-ort, Sterbedatum/-ort
- Biografie: Freitext
- Bilder: Galerie (Platzhalter-Grid, vorbereitet für spätere Uploads)
- Quellen: Liste mit Titel/Link/Notiz
- Dokumente: Liste mit Titel/Link/Typ
- Aktion „Zentrieren“ prominent im Panel-Header

## 7. Performance-Strategie für große Stammbäume

„Der Stammbaum ist immer vollständig dargestellt“ wird wie folgt technisch
umgesetzt, ohne die Performance zu gefährden:

- **Daten**: `people`/`families` sind immer vollständig im Speicher (kein
  Nachladen beim Scrollen/Zoomen) – aus Nutzersicht ist der Baum immer
  komplett vorhanden.
- **Rendering**: Nur Knoten im/nahe am sichtbaren Viewport werden tatsächlich
  als DOM-Elemente gerendert (Virtualisierung); alle anderen Positionen sind
  bereits berechnet, aber nicht gemountet.
- **Level of Detail**: Bei starkem Rauszoomen wechseln Karten auf eine
  vereinfachte Darstellung (Punkt + Name statt volle Karte), um die Anzahl
  gerenderter DOM-Knoten weiter zu begrenzen.
- **Layout-Caching**: Layout-Berechnung pro `(view, centerPersonId)` wird
  memoisiert, damit reines Zoomen/Verschieben keine Neuberechnung auslöst.

## 8. Architektur / Ordnerstruktur

```
src/
  data/
    types.ts            Person, Family, Photo, Source, Document
    sampleData.ts        Beispiel-Familienbaum
    useFamilyData.ts      Datenzugriffs-Hook (später gegen API austauschbar)
  layout/
    classicLayout.ts
    radialLayout.ts
    networkLayout.ts
    layout.types.ts       PositionedNode, Edge
  components/
    AppShell/             Grundgerüst, Header, Drei-Punkte-Menü
    TreeCanvas/            SVG-Root, D3-Zoom/Pan, Virtualisierung, LOD
    PersonCard/            kompakte Karte
    PersonInfoPanel/       Slide-in-Panel mit Tabs
    ViewMenu/              Auswahl der drei Darstellungsarten
  state/
    useTreeStore.ts        zustand-Store: centerPersonId, selectedPersonId,
                             activeView, Zoom-Transform
  App.tsx
  main.tsx
```

## 9. Responsive Verhalten

- Desktop: Info-Panel als Seitenpanel neben dem Baum.
- Tablet: Info-Panel als überlagerndes Panel mit reduzierter Breite.
- Smartphone: Info-Panel als Bottom-Sheet oder Vollbild-Overlay; Drei-Punkte-
  Menü und Zentrieren-Aktion bleiben per Daumen erreichbar; Touch-Gesten
  (Pinch-Zoom, Drag) statt Maus-Events.

## 10. Out of Scope (diese Phase)

- Echtes Backend/Datenbank-Anbindung (Datenschicht ist nur dafür vorbereitet)
- Echter Datei-Upload für Bilder/Dokumente (UI-Platzhalter vorhanden)
- Bearbeiten/Anlegen von Personen (nur Lesen/Navigieren)
- Authentifizierung/Mehrbenutzerbetrieb

## 11. Phasenplan (grobe Reihenfolge für den Implementierungsplan)

1. Projekt-Setup (Vite + React + TS + Tailwind), Datenmodell + Beispieldaten
2. Klassische Ansicht mit Zoom/Pan, Klick auf Personen, Zentrieren-Funktion
3. Info-Panel mit allen Inhaltsabschnitten
4. Radiale Ansicht + Netzwerkansicht + Drei-Punkte-Menü zum Wechseln
5. Responsive Feinschliff, Performance-Tuning (Virtualisierung, Level of
   Detail), Platzhalter für Bilder/Quellen/Dokumente
