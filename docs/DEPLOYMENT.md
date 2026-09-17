# Deployment auf Vercel mit Postgres-Datenbank

Diese Anleitung bringt die App von "läuft nur lokal mit Beispieldaten" zu
"läuft auf Vercel, speichert echte Änderungen dauerhaft in einer Postgres-
Datenbank, ist mit einem Passwort geschützt".

Alle Schritte hier musst du selbst ausführen (Accounts anlegen, Werte im
Vercel-Dashboard eintragen, Befehle in deinem eigenen Terminal ausführen) —
das kann eine KI-Session aus Sicherheitsgründen nicht für dich übernehmen.

## 1. Code zu GitHub pushen

Falls noch nicht geschehen, den aktuellen Stand des Branches pushen:

```bash
git push -u origin worktree-stammbaum-prototyp-phase-1
```

## 2. Vercel-Account anlegen und Projekt importieren

1. Auf [vercel.com](https://vercel.com) mit deinem GitHub-Account anmelden.
2. "Add New… → Project" → das Repo `LeandroCell/Stammbaum` auswählen und importieren.
3. Vercel erkennt Vite automatisch (Framework Preset: "Vite"). Build-Einstellungen
   kannst du unverändert lassen (`npm run build`, Output-Verzeichnis `dist`).
4. Noch **nicht** deployen — erst die Datenbank und die Umgebungsvariablen einrichten
   (Schritte 3 und 4), sonst schlägt der erste Build/die erste Anfrage mangels
   `DATABASE_URL`/`SITE_PASSWORD`/`SESSION_SECRET` fehl. Das ist ungefährlich und
   leicht behebbar, aber unnötig.

## 3. Postgres-Datenbank anlegen (Neon über Vercel Marketplace)

1. Im Vercel-Projekt: Tab **Storage** → **Create Database** → **Postgres** (powered by Neon) auswählen.
2. Name vergeben, Region wählen (idealerweise nah an der Vercel-Region deines Projekts), erstellen.
3. Vercel verknüpft die Datenbank automatisch mit dem Projekt und setzt die
   Umgebungsvariable `DATABASE_URL` (bzw. eine ähnlich benannte, z. B. `POSTGRES_URL`)
   für dich. Falls der Variablenname von `DATABASE_URL` abweicht, im nächsten Schritt
   zusätzlich manuell `DATABASE_URL` mit demselben Connection-String anlegen — der
   Code in `api/_lib/db.ts` liest exakt `DATABASE_URL`.

## 4. Umgebungsvariablen setzen

Im Vercel-Projekt unter **Settings → Environment Variables** ergänzen (für "Production"
und "Preview"):

| Name | Wert |
|---|---|
| `SITE_PASSWORD` | ein frei gewähltes Passwort für den Login-Bildschirm |
| `SESSION_SECRET` | ein langer Zufallsstring, z. B. per `openssl rand -hex 32` erzeugt |

(`DATABASE_URL` kommt bereits aus Schritt 3.)

## 5. Datenbankschema anlegen

1. Im Vercel-Projekt: **Storage** → deine Postgres-Datenbank öffnen → Tab **Query** (bzw. im
   Neon-Dashboard: **SQL Editor**).
2. Den Inhalt von [`db/schema.sql`](../db/schema.sql) hineinkopieren und ausführen.
   Das legt nur die beiden leeren Tabellen `people` und `families` an — noch keine Daten.

## 6. Umgebungsvariablen lokal holen und Beispieldaten einspielen

Im Projektordner (mit installierter [Vercel CLI](https://vercel.com/docs/cli), sonst
vorher `npm install -g vercel`):

```bash
vercel link      # einmalig: dieses lokale Verzeichnis mit dem Vercel-Projekt verknüpfen
vercel env pull .env.local
npm run seed
```

`npm run seed` befüllt die Datenbank mit den aktuellen Beispieldaten aus
`src/data/sampleData.ts` (die gleiche Familie, die auch im lokalen Prototyp zu sehen war) —
das gibt dir sofort einen sinnvollen Ausgangspunkt zum Weiterbearbeiten, statt mit einem
leeren Baum zu starten.

## 7. Deployen

```bash
vercel --prod
```

Oder einfach über den Vercel-Dashboard-Button "Deploy" — jeder Push auf den verbundenen
Branch deployed ab jetzt automatisch.

## 8. Testen

Die deployte URL öffnen → Login-Bildschirm sollte erscheinen → mit dem gesetzten
`SITE_PASSWORD` anmelden → der Beispiel-Stammbaum sollte erscheinen. Änderungen (Person
anlegen/bearbeiten/löschen, GEDCOM-Import) werden jetzt automatisch in der Postgres-
Datenbank gespeichert und bleiben nach einem Reload erhalten.

## Lokale Entwicklung danach

- `npm run dev` (reines Vite, ohne `/api`-Funktionen): zeigt weiterhin sofort die
  Beispieldaten, ohne Login — praktisch für reine Frontend-Arbeit. Änderungen werden dabei
  **nicht** gespeichert (Offline-Hinweis erscheint oben in der App).
- `vercel dev` (mit `.env.local` aus Schritt 6): startet Vite **und** die `/api`-Funktionen
  lokal gegen die echte Datenbank — für Full-Stack-Tests inklusive Login/Speichern.
