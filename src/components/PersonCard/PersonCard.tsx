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
