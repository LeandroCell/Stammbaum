# Stammbaum – Aktueller Stand

Diese Datei ist eine Übergabe-Notiz für die Fortsetzung der Arbeit auf einem
anderen Rechner (z. B. dem Mac). Sie beschreibt den Stand nach der
Prototyp-Phase 2 (Familienlinien, Bilder/Dokumente, neues Rundbaum-Layout).

## Branch-/Merge-Status (wichtig zuerst prüfen!)

`main` enthielt zuletzt (nach PR #5) den Commit `85d6cef`. Danach wurden auf
dem Branch `worktree-stammbaum-prototyp-phase-2` noch zwei weitere Commits
gepusht, die zum Zeitpunkt dieser Notiz **noch nicht sicher in `main`
gemerged waren**:

```
0b47ffd feat: Zentrieren zeigt nur Vorfahren, Runder Stammbaum als horizontales Bracket-Layout
071d639 fix: keine Partner-Geschwister, Alle-Personen zeigt Gesamtbaum, Rundbaum ohne diagonalen Anstieg
85d6cef feat: Personen-Browser, Netzwerkansicht entfernt, direkte Radial-Verbindungen, Datei-Upload und Bilder-Popout   <- letzter Stand in main (PR #5)
```

**Erster Schritt auf dem neuen Rechner:** `git log --oneline -5` auf `main`
prüfen. Falls `0b47ffd` dort noch fehlt, den Branch
`worktree-stammbaum-prototyp-phase-2` (oder den entsprechenden PR) noch
mergen, bevor weitergearbeitet wird — sonst fehlen die zuletzt gebauten
Features (ancestors-only Zentrieren, neues Rundbaum-Layout).

## Was in dieser Session gebaut wurde (chronologisch)

1. **Familienlinien**: Eltern werden per Linie verbunden bzw. (im Rundbaum)
   direkt mit dem Kind verbunden, statt dass jede Beziehung als isolierte
   Linie gezeichnet wird. Neues Modul: `src/components/TreeCanvas/familyConnectors.ts`.
2. **Geschwister-Toggle**: Checkbox "Geschwister anzeigen" in der
   klassischen Ansicht (`useTreeStore.showSiblings`).
3. **Runder Stammbaum — reine Blutlinie**: keine Geschwister, kein Partner
   mehr in dieser Ansicht.
4. **Bilder/Quellen/Dokumente im Personenformular**: können jetzt
   hinzugefügt/entfernt werden (vorher nur read-only im Info-Panel).
5. **Netzwerkansicht entfernt** (Layout-Modul, Store-Typ, Menüeintrag,
   Tests) — auf expliziten Wunsch.
6. **"Alle Personen"-Button**: zeigt den gesamten Baum, zentriert auf die
   jüngste bekannte Person (`pickYoungestPerson` in `familyGraph.ts`) —
   ersetzt eine frühere, wieder verworfene Variante mit Auswahl-Dialog.
7. **Direkte Radial-Verbindungen**: keine "Heirats-Linie" mehr zwischen
   zwei Eltern im Rundbaum, sondern je eine direkte Linie von jedem
   Elternteil zum Kind (`ConnectorStyle: "direct"`).
8. **Datei-Upload für Bilder/Dokumente**: echter Datei-Upload (liest die
   Datei client-seitig als `data:`-URL ein, wie es das Beispielbild in
   `sampleData.ts` schon vormacht) — Text-/Bildunterschriftfelder bleiben
   zusätzlich nutzbar.
9. **Bilder-Popout im Info-Panel**: Klick auf ein Bild öffnet es zentriert
   als Lightbox mit Bildunterschrift und Vor-/Zurück bei mehreren Bildern.
10. **Fix**: Geschwister des *Partners* der zentrierten Person wurden fälschlich
    mitangezeigt — entfernt (nur noch die eigenen Geschwister/Onkel/Tanten
    der zentrierten Person selbst).
11. **Zentrieren zeigt nur noch Vorfahren**: Die klassische Ansicht zeigt
    beim Zentrieren keine Nachfahren (Kinder/Enkel) mehr, nur noch
    Vorfahren + optional deren Geschwister + den eigenen Partner. Um die
    Kinder einer Person zu sehen, zentriert man jetzt direkt auf das Kind.
12. **Runder Stammbaum neu als horizontales Bracket-Layout**: komplette
    Neu-Implementierung nach einer vom Nutzer bereitgestellten
    Referenzgrafik (Turnierbaum-artige Verzweigung) statt eines
    Kreis-Fächers — zentrierte Person in der Mitte, Mutter direkt links,
    Vater direkt rechts, jede weitere Generation fächert symmetrisch nach
    außen auf (nicht mehr diagonal).

Alle Änderungen sind mit Vitest-Tests abgedeckt (`npm test` → zuletzt 177
grüne Tests) und wurden zusätzlich manuell im laufenden Dev-Server per
Browser-Interaktion verifiziert (Koordinaten der SVG-Knoten/Linien direkt
geprüft, nicht nur Screenshots).

## Deployment-Status

- Der Backend-Code ist fertig und **nicht** Teil der offenen Punkte:
  `api/tree.ts` (GET/PUT), `api/login.ts`, `api/logout.ts`,
  `api/_lib/db.ts` (Neon/Postgres), `api/_lib/auth.ts` (Session-Cookie),
  `db/schema.sql` (Tabellen `people`/`families`, inkl. `photos`/`sources`/
  `documents` als JSONB — passt zu den heute ergänzten Formularfeldern).
- Die eigentliche Einrichtung (Vercel-Projekt, Neon-Postgres-Datenbank,
  Umgebungsvariablen `DATABASE_URL`/`SITE_PASSWORD`/`SESSION_SECRET`,
  Schema ausführen, deployen) ist **noch nicht** erfolgt — geplant für
  "morgen" mit dem Kunden. Anleitung: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
- Bekannter kleiner Schönheitsfehler in der Anleitung: Schritt 1 von
  `docs/DEPLOYMENT.md` nennt noch den alten, bereits gemergten Branch-Namen
  `worktree-stammbaum-prototyp-phase-1`. Der Rest der Anleitung ist aktuell
  und funktioniert unverändert — es reicht, beim Deployen den aktuellen
  `main`-Stand zu verwenden statt dem alten Branch-Namen zu folgen.
- `npm run dev` (reines Vite, ohne `/api`-Functions) zeigt immer den
  Hinweis "Kein Server verbunden" und arbeitet nur mit den Beispieldaten
  aus `sampleData.ts` — das ist der gewollte Offline-Fallback, kein Bug.
  Für echte Full-Stack-Tests gegen die Datenbank: `vercel dev` (nach
  `vercel link` + `vercel env pull .env.local`).

## Architektur-Kurzübersicht

```
src/
  data/
    types.ts            Person, Family, Photo, Source, DocumentRef
    sampleData.ts        Beispiel-Familie (10 Personen)
    useFamilyData.ts      Zustand-Store: people/families + Persistenz über /api/tree
    familyGraph.ts        buildFamilyMaps, orderParentsFatherFirst,
                           pickDefaultCenter, pickYoungestPerson
    gedcomImport.ts / gedcomExport.ts
  layout/
    layout.types.ts       PositionedNode, LayoutEdge, LayoutFn, LayoutOptions
    classicLayout.ts       Vorfahren + optionale Geschwister + eigener Partner
                           (KEINE Nachfahren mehr)
    radialLayout.ts        horizontales Bracket-Layout, reine Blutlinie
                           (kein Partner, keine Geschwister)
  components/
    TreeCanvas/            SVG + D3 Zoom/Pan; familyConnectors.ts für die
                           Verbindungslinien ("elbow" klassisch, "direct" rund)
    PersonCard/            kompakte Karte im Baum
    PersonInfoPanel/       Slide-in-Panel inkl. Bilder-Lightbox
    PersonForm/            Anlegen/Bearbeiten inkl. Datei-Upload für
                           Bilder/Dokumente
    PersonPicker/          Autocomplete-Auswahl (Vater/Mutter/Partner)
    ViewMenu/              Drei-Punkte-Menü, nur noch "Klassisch"/"Rund"
    LoginScreen/
  state/
    useTreeStore.ts        centerPersonId, selectedPersonId,
                           activeView ("classic" | "radial"), showSiblings,
                           isPanelCollapsed
api/
  tree.ts, login.ts, logout.ts, _lib/db.ts, _lib/auth.ts, _lib/testHelpers.ts
db/
  schema.sql
docs/
  DEPLOYMENT.md
  superpowers/specs/2026-09-17-stammbaum-webapp-design.md   (Original-Spezifikation)
  superpowers/plans/2026-09-17-stammbaum-prototyp-phase-1.md
```

## Offene Punkte / bekannte Lücken

- **Kein echter Datei-Speicher**: Bild-/Dokument-Uploads werden als
  `data:`-URL (Base64) direkt in der Datenbank-Zeile gespeichert. Für einen
  Familien-Stammbaum mit einer überschaubaren Anzahl Bilder unproblematisch,
  aber keine produktionsreife Lösung bei vielen/großen Dateien (kein
  S3/Blob-Storage). Falls das später zum Problem wird: eigener
  Upload-Endpoint + Objektspeicher wäre der nächste Schritt.
- **Branch-Merge** (siehe oben) — unbedingt zuerst prüfen.
- `docs/DEPLOYMENT.md` Schritt 1 nennt einen veralteten Branch-Namen (siehe
  oben) — funktional harmlos, aber verwirrend beim Lesen.

## Nützliche Befehle

```bash
npm install
npm run dev          # reines Frontend, Beispieldaten, kein Speichern
npm test             # Vitest, sollte 177 Tests grün liefern
npx tsc -b           # Type-Check, sollte fehlerfrei sein
npm run seed         # Beispieldaten in die echte DB einspielen (braucht .env.local)
vercel dev           # Full-Stack lokal gegen echte Datenbank
vercel --prod        # Deploy
```
