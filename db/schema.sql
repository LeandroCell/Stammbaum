-- Einmal in der SQL-Konsole der neuen Postgres-Datenbank ausführen
-- (Vercel-Dashboard -> Storage -> Postgres-Datenbank -> "Query" Tab).
-- Beispieldaten werden NICHT hier eingefügt, sondern per `npm run seed`
-- (siehe scripts/seed.ts) — das vermeidet, die Beispieldaten doppelt in
-- TypeScript und in Raw-SQL pflegen zu müssen.

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birth_name TEXT,
  gender TEXT,
  birth_date TEXT,
  birth_place TEXT,
  death_date TEXT,
  death_place TEXT,
  biography TEXT,
  photos JSONB,
  sources JSONB,
  documents JSONB,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  partner_ids JSONB NOT NULL,
  children_ids JSONB NOT NULL
);
