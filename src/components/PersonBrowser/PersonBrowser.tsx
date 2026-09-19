import { useState } from "react";
import type { Person } from "../../data/types";
import { personLabel } from "../PersonPicker/PersonPicker";

interface PersonBrowserProps {
  people: Person[];
  onSelect: (personId: string) => void;
  onClose: () => void;
}

// Lets the user jump back to anyone in the tree — centering on a person
// only ever shows their own ancestors/descendants/siblings, so without
// this, everyone outside that scope becomes unreachable again.
export function PersonBrowser({ people, onSelect, onClose }: PersonBrowserProps) {
  const [query, setQuery] = useState("");

  const sorted = [...people].sort((a, b) => personLabel(a).localeCompare(personLabel(b)));
  const matches = sorted.filter((p) => personLabel(p).toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-label="Alle Personen"
        className="flex max-h-[80vh] w-full max-w-md flex-col overflow-hidden rounded-lg bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <h2 className="text-lg font-semibold text-slate-900">Alle Personen</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600" aria-label="Schließen">
            ✕
          </button>
        </div>
        <div className="p-4 pb-2">
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Person suchen…"
            aria-label="Person suchen"
            className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          />
        </div>
        <ul className="flex-1 overflow-y-auto p-2">
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => onSelect(person.id)}
                className="w-full rounded px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {personLabel(person)}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Keine Treffer</li>}
        </ul>
      </div>
    </div>
  );
}
