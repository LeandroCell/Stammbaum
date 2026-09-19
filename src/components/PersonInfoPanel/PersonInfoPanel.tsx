import { useEffect, useState } from "react";
import type { Person } from "../../data/types";

interface PersonInfoPanelProps {
  person: Person | null;
  onClose: () => void;
  onCenter: (personId: string) => void;
  onEdit: (personId: string) => void;
  onDelete: (personId: string) => void;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

function formatDate(dateString?: string): string | undefined {
  if (!dateString) return undefined;
  const [year, month, day] = dateString.split("-");
  if (!month || !day) return year;
  return `${day}.${month}.${year}`;
}

export function PersonInfoPanel({
  person,
  onClose,
  onCenter,
  onEdit,
  onDelete,
  isCollapsed,
  onToggleCollapsed,
}: PersonInfoPanelProps) {
  const isVisible = Boolean(person) && !isCollapsed;
  const [openPhotoIndex, setOpenPhotoIndex] = useState<number | null>(null);

  // A stale index from a previous person's (possibly longer) photo list
  // must never leak into the next person's lightbox.
  useEffect(() => {
    setOpenPhotoIndex(null);
  }, [person?.id]);

  const photos = person?.photos ?? [];
  const openPhoto = openPhotoIndex !== null ? photos[openPhotoIndex] : undefined;

  function showPhoto(index: number) {
    setOpenPhotoIndex(((index % photos.length) + photos.length) % photos.length);
  }

  return (
    <>
    <aside
      className={`fixed left-0 top-0 z-20 h-full w-full max-w-sm transform bg-white shadow-xl transition-transform duration-300 ease-out ${
        isVisible ? "translate-x-0" : "-translate-x-full"
      }`}
      aria-hidden={!isVisible}
    >
      {person && (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={isCollapsed ? "Info-Panel einblenden" : "Info-Panel ausblenden"}
          className="absolute -right-7 top-1/2 flex h-14 w-7 -translate-y-1/2 items-center justify-center rounded-r-md bg-white text-slate-400 shadow-md hover:text-slate-600"
        >
          {isCollapsed ? "›" : "‹"}
        </button>
      )}

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

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCenter(person.id)}
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Zentrieren
            </button>
            <button
              type="button"
              onClick={() => onEdit(person.id)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Bearbeiten
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`${person.firstName} ${person.lastName} wirklich löschen?`)) {
                  onDelete(person.id);
                }
              }}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              Löschen
            </button>
          </div>

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
            {photos.length ? (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setOpenPhotoIndex(index)}
                    aria-label={`Bild vergrößern${photo.caption ? `: ${photo.caption}` : ""}`}
                    className="aspect-square overflow-hidden rounded"
                  >
                    <img src={photo.url} alt={photo.caption ?? ""} className="h-full w-full object-cover" />
                  </button>
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

    {openPhoto && (
      <div
        role="dialog"
        aria-label="Bild"
        className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-4 bg-slate-900/80 p-6"
      >
        <button
          type="button"
          onClick={() => setOpenPhotoIndex(null)}
          aria-label="Bild schließen"
          className="absolute right-4 top-4 text-2xl text-white/80 hover:text-white"
        >
          ✕
        </button>

        <div className="flex max-h-[75vh] max-w-3xl items-center gap-4">
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => showPhoto(openPhotoIndex! - 1)}
              aria-label="Vorheriges Bild"
              className="text-3xl text-white/70 hover:text-white"
            >
              ‹
            </button>
          )}
          <img src={openPhoto.url} alt={openPhoto.caption ?? ""} className="max-h-[75vh] max-w-full rounded object-contain" />
          {photos.length > 1 && (
            <button
              type="button"
              onClick={() => showPhoto(openPhotoIndex! + 1)}
              aria-label="Nächstes Bild"
              className="text-3xl text-white/70 hover:text-white"
            >
              ›
            </button>
          )}
        </div>

        <p className="min-h-[1.5rem] text-center text-sm text-white/90">{openPhoto.caption}</p>
      </div>
    )}
    </>
  );
}
