import { useEffect, useState, type FocusEvent } from "react";
import type { Person } from "../../data/types";

interface PersonPickerProps {
  label: string;
  people: Person[];
  value: string;
  onChange: (personId: string) => void;
  clearLabel: string;
}

const MAX_RESULTS = 50;

export function personLabel(person: Person): string {
  const year = person.birthDate?.slice(0, 4);
  return year ? `${person.firstName} ${person.lastName} (${year})` : `${person.firstName} ${person.lastName}`;
}

// ponytail: click/type-driven combobox, no arrow-key navigation of the
// result list — fine for a mouse/touch-first form, add keyboard nav if
// that turns out to matter for real usage.
export function PersonPicker({ label, people, value, onChange, clearLabel }: PersonPickerProps) {
  const [query, setQuery] = useState(() => {
    const person = people.find((p) => p.id === value);
    return person ? personLabel(person) : "";
  });
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const person = people.find((p) => p.id === value);
    setQuery(person ? personLabel(person) : "");
  }, [value, people]);

  const matches = people
    .filter((p) => personLabel(p).toLowerCase().includes(query.trim().toLowerCase()))
    .slice(0, MAX_RESULTS);

  function selectPerson(personId: string) {
    onChange(personId);
    setIsOpen(false);
  }

  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsOpen(false);
    // Revert to the current selection's label if what's typed doesn't
    // resolve to it anymore — the field must always reflect a real
    // selection (or none), never unattached free text.
    const person = people.find((p) => p.id === value);
    setQuery(person ? personLabel(person) : "");
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <label className="block text-sm text-slate-700">
        {label}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={clearLabel}
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
        />
      </label>

      {isOpen && (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          <li>
            <button
              type="button"
              onClick={() => selectPerson("")}
              className="w-full px-3 py-1.5 text-left text-sm text-slate-400 hover:bg-slate-50"
            >
              {clearLabel}
            </button>
          </li>
          {matches.map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => selectPerson(person.id)}
                className="w-full px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                {personLabel(person)}
              </button>
            </li>
          ))}
          {matches.length === 0 && <li className="px-3 py-1.5 text-sm text-slate-400">Keine Treffer</li>}
        </ul>
      )}
    </div>
  );
}
