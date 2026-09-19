import { useState, type FormEvent, type ReactNode } from "react";
import type { DocumentRef, Family, Gender, Person, Photo, Source } from "../../data/types";
import { orderParentsFatherFirst } from "../../data/familyGraph";
import { PersonPicker } from "../PersonPicker/PersonPicker";

export interface PersonFormValues {
  firstName: string;
  lastName: string;
  birthName: string;
  gender: Gender | "";
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  biography: string;
  fatherId: string;
  motherId: string;
  partnerId: string;
  photos: Photo[];
  sources: Source[];
  documents: DocumentRef[];
}

// ponytail: local-only ids for still-unsaved list rows — mirrors the
// scheme useFamilyData's generateId uses for real records.
function generateLocalId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

// Embeds the uploaded file directly as a data: URL — same approach the
// sample data's example photo already uses — since this prototype has no
// backend file storage; `url` just becomes a (large) self-contained string.
function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Datei konnte nicht gelesen werden."));
    reader.readAsDataURL(file);
  });
}

interface PersonFormProps {
  mode: "create" | "edit";
  people: Person[];
  initialValues: PersonFormValues;
  excludePersonId?: string;
  onSubmit: (values: PersonFormValues) => void;
  onCancel: () => void;
}

export function emptyPersonFormValues(): PersonFormValues {
  return {
    firstName: "",
    lastName: "",
    birthName: "",
    gender: "",
    birthDate: "",
    birthPlace: "",
    deathDate: "",
    deathPlace: "",
    biography: "",
    fatherId: "",
    motherId: "",
    partnerId: "",
    photos: [],
    sources: [],
    documents: [],
  };
}

export function personToFormValues(person: Person, people: Person[], families: Family[]): PersonFormValues {
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const parentFamily = families.find((f) => f.childrenIds.includes(person.id));
  const [fatherId, motherId] = parentFamily
    ? orderParentsFatherFirst(parentFamily.partnerIds, peopleById)
    : [undefined, undefined];

  const partnerFamily = families.find((f) => f.partnerIds.includes(person.id));
  const partnerId = partnerFamily?.partnerIds.find((id) => id !== person.id);

  return {
    firstName: person.firstName,
    lastName: person.lastName,
    birthName: person.birthName ?? "",
    gender: person.gender ?? "",
    birthDate: person.birthDate ?? "",
    birthPlace: person.birthPlace ?? "",
    deathDate: person.deathDate ?? "",
    deathPlace: person.deathPlace ?? "",
    biography: person.biography ?? "",
    fatherId: fatherId ?? "",
    motherId: motherId ?? "",
    partnerId: partnerId ?? "",
    photos: person.photos ?? [],
    sources: person.sources ?? [],
    documents: person.documents ?? [],
  };
}

interface ListEditorProps<T extends { id: string }> {
  legend: string;
  items: T[];
  onChange: (items: T[]) => void;
  createItem: () => T;
  renderFields: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
  addLabel: string;
  emptyLabel: string;
}

// Shared add/remove list editor for the photos/sources/documents sections
// below — the three differ only in which fields each row has.
function ListEditor<T extends { id: string }>({
  legend,
  items,
  onChange,
  createItem,
  renderFields,
  addLabel,
  emptyLabel,
}: ListEditorProps<T>) {
  return (
    <div className="col-span-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-700">{legend}</h3>
        <button
          type="button"
          onClick={() => onChange([...items, createItem()])}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          {addLabel}
        </button>
      </div>
      {items.length === 0 && <p className="mt-1 text-sm text-slate-400">{emptyLabel}</p>}
      <div className="mt-2 space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="flex items-start gap-2 rounded border border-slate-200 p-2">
            <div className="grid flex-1 grid-cols-2 gap-2">
              {renderFields(item, (patch) => {
                const next = [...items];
                next[index] = { ...item, ...patch };
                onChange(next);
              })}
            </div>
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label={`${legend}-Eintrag entfernen`}
              className="mt-1 text-slate-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonForm({ mode, people, initialValues, excludePersonId, onSubmit, onCancel }: PersonFormProps) {
  const [values, setValues] = useState<PersonFormValues>(initialValues);
  const selectablePeople = people.filter((p) => p.id !== excludePersonId);

  function update<K extends keyof PersonFormValues>(key: K, value: PersonFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/40 p-4">
      <form
        onSubmit={handleSubmit}
        aria-label={mode === "create" ? "Neue Person" : "Person bearbeiten"}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "Neue Person" : "Person bearbeiten"}
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="text-sm text-slate-700">
            Vorname*
            <input
              required
              value={values.firstName}
              onChange={(e) => update("firstName", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-slate-700">
            Nachname*
            <input
              required
              value={values.lastName}
              onChange={(e) => update("lastName", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="col-span-2 text-sm text-slate-700">
            Geburtsname
            <input
              value={values.birthName}
              onChange={(e) => update("birthName", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="col-span-2 text-sm text-slate-700">
            Geschlecht
            <select
              value={values.gender}
              onChange={(e) => update("gender", e.target.value as PersonFormValues["gender"])}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            >
              <option value="">Unbekannt</option>
              <option value="male">Männlich</option>
              <option value="female">Weiblich</option>
              <option value="other">Divers</option>
            </select>
          </label>
          <label className="text-sm text-slate-700">
            Geburtsdatum
            <input
              type="date"
              value={values.birthDate}
              onChange={(e) => update("birthDate", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-slate-700">
            Geburtsort
            <input
              value={values.birthPlace}
              onChange={(e) => update("birthPlace", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-slate-700">
            Sterbedatum
            <input
              type="date"
              value={values.deathDate}
              onChange={(e) => update("deathDate", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="text-sm text-slate-700">
            Sterbeort
            <input
              value={values.deathPlace}
              onChange={(e) => update("deathPlace", e.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>
          <label className="col-span-2 text-sm text-slate-700">
            Biografie
            <textarea
              value={values.biography}
              onChange={(e) => update("biography", e.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            />
          </label>

          <ListEditor
            legend="Bilder"
            items={values.photos}
            onChange={(photos) => update("photos", photos)}
            createItem={() => ({ id: generateLocalId("photo"), url: "", caption: "" })}
            addLabel="+ Bild hinzufügen"
            emptyLabel="Keine Bilder hinterlegt."
            renderFields={(photo, updatePhoto) => (
              <>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Datei hochladen
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      updatePhoto({ url: await readFileAsDataUrl(file) });
                    }}
                    className="mt-1 w-full text-xs text-slate-600"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  oder Bild-URL*
                  <input
                    required
                    value={photo.url}
                    onChange={(e) => updatePhoto({ url: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600">
                  Bildunterschrift
                  <input
                    value={photo.caption ?? ""}
                    onChange={(e) => updatePhoto({ caption: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                {photo.url && (
                  <img src={photo.url} alt="" className="col-span-2 h-16 w-16 rounded object-cover" />
                )}
              </>
            )}
          />

          <ListEditor
            legend="Quellen"
            items={values.sources}
            onChange={(sources) => update("sources", sources)}
            createItem={() => ({ id: generateLocalId("src"), title: "", url: "", note: "" })}
            addLabel="+ Quelle hinzufügen"
            emptyLabel="Keine Quellen hinterlegt."
            renderFields={(source, updateSource) => (
              <>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Titel*
                  <input
                    required
                    value={source.title}
                    onChange={(e) => updateSource({ title: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Link
                  <input
                    value={source.url ?? ""}
                    onChange={(e) => updateSource({ url: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600">
                  Notiz
                  <input
                    value={source.note ?? ""}
                    onChange={(e) => updateSource({ note: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
              </>
            )}
          />

          <ListEditor
            legend="Dokumente"
            items={values.documents}
            onChange={(documents) => update("documents", documents)}
            createItem={() => ({ id: generateLocalId("doc"), title: "", url: "", type: "" })}
            addLabel="+ Dokument hinzufügen"
            emptyLabel="Keine Dokumente hinterlegt."
            renderFields={(doc, updateDoc) => (
              <>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Titel*
                  <input
                    required
                    value={doc.title}
                    onChange={(e) => updateDoc({ title: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Typ
                  <input
                    value={doc.type ?? ""}
                    onChange={(e) => updateDoc({ type: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600 sm:col-span-1">
                  Datei hochladen
                  <input
                    type="file"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      updateDoc({ url: await readFileAsDataUrl(file), type: doc.type || file.type || undefined });
                    }}
                    className="mt-1 w-full text-xs text-slate-600"
                  />
                </label>
                <label className="col-span-2 text-xs text-slate-600">
                  oder Link*
                  <input
                    required
                    value={doc.url}
                    onChange={(e) => updateDoc({ url: e.target.value })}
                    className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
                  />
                </label>
              </>
            )}
          />

          <PersonPicker
            label="Vater"
            people={selectablePeople}
            value={values.fatherId}
            onChange={(id) => update("fatherId", id)}
            clearLabel="— keiner —"
          />
          <PersonPicker
            label="Mutter"
            people={selectablePeople}
            value={values.motherId}
            onChange={(id) => update("motherId", id)}
            clearLabel="— keine —"
          />
          <div className="col-span-2">
            <PersonPicker
              label="Partner"
              people={selectablePeople}
              value={values.partnerId}
              onChange={(id) => update("partnerId", id)}
              clearLabel="— keiner —"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Abbrechen
          </button>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Speichern
          </button>
        </div>
      </form>
    </div>
  );
}
