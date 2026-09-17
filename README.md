# Stammbaum

Interaktiver Familien-Stammbaum: klassische, runde und Netzwerk-Ansicht,
Personen anlegen/bearbeiten/löschen, GEDCOM-Import.

## Lokale Entwicklung

```bash
npm install
npm run dev
```

Läuft ohne Backend/Datenbank mit Beispieldaten (`src/data/sampleData.ts`).
Änderungen werden dabei nur im Browser-Tab gehalten, nicht dauerhaft
gespeichert (Offline-Hinweis in der App).

```bash
npm test        # Vitest, einmalig
npx tsc --noEmit  # Typecheck
```

## Mit echter Datenbank (Vercel + Postgres)

Siehe [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) für die vollständige
Einrichtung (Vercel-Projekt, Postgres-Datenbank, Login-Passwort, Seed-Daten).
