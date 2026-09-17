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

          <section className="mt-6 text-sm text-slate-700">
            <h3 className="font-medium text-slate-900">Biografie</h3>
            {person.biography ? (
              <p className="mt-1 whitespace-pre-line">{person.biography}</p>
            ) : (
              <p className="mt-1 text-slate-400">Keine Biografie hinterlegt.</p>
            )}
          </section>

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
