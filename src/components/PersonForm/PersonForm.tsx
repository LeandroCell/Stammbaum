import { useState, type FormEvent } from "react";
import type { Family, Gender, Person } from "../../data/types";
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
  };
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
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4">
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
