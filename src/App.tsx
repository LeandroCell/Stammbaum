import { useState } from "react";
import { useFamilyData } from "./data/useFamilyData";
import { useTreeStore, type ViewMode } from "./state/useTreeStore";
import { TreeCanvas } from "./components/TreeCanvas/TreeCanvas";
import { PersonInfoPanel } from "./components/PersonInfoPanel/PersonInfoPanel";
import { ViewMenu } from "./components/ViewMenu/ViewMenu";
import {
  PersonForm,
  emptyPersonFormValues,
  personToFormValues,
  type PersonFormValues,
} from "./components/PersonForm/PersonForm";
import { classicLayout } from "./layout/classicLayout";
import { radialLayout } from "./layout/radialLayout";
import { networkLayout } from "./layout/networkLayout";
import type { LayoutFn } from "./layout/layout.types";

const LAYOUTS: Record<ViewMode, LayoutFn> = {
  classic: classicLayout,
  radial: radialLayout,
  network: networkLayout,
};

type FormState = { mode: "create" } | { mode: "edit"; personId: string };

function toOptionalField(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function App() {
  const people = useFamilyData((s) => s.people);
  const families = useFamilyData((s) => s.families);
  const addPerson = useFamilyData((s) => s.addPerson);
  const updatePerson = useFamilyData((s) => s.updatePerson);
  const deletePerson = useFamilyData((s) => s.deletePerson);
  const setParents = useFamilyData((s) => s.setParents);
  const addPartner = useFamilyData((s) => s.addPartner);
  const removePartner = useFamilyData((s) => s.removePartner);

  const centerPersonId = useTreeStore((s) => s.centerPersonId);
  const selectedPersonId = useTreeStore((s) => s.selectedPersonId);
  const activeView = useTreeStore((s) => s.activeView);
  const selectPerson = useTreeStore((s) => s.selectPerson);
  const setCenterPerson = useTreeStore((s) => s.setCenterPerson);
  const setActiveView = useTreeStore((s) => s.setActiveView);

  const [formState, setFormState] = useState<FormState | null>(null);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;

  function handleFormSubmit(values: PersonFormValues) {
    const personData = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      birthName: toOptionalField(values.birthName),
      gender: values.gender === "" ? undefined : values.gender,
      birthDate: toOptionalField(values.birthDate),
      birthPlace: toOptionalField(values.birthPlace),
      deathDate: toOptionalField(values.deathDate),
      deathPlace: toOptionalField(values.deathPlace),
      biography: toOptionalField(values.biography),
    };

    const personId = formState?.mode === "edit" ? formState.personId : addPerson(personData);
    if (formState?.mode === "edit") {
      updatePerson(personId, personData);
    }

    setParents(personId, values.fatherId || null, values.motherId || null);

    const existingPartnerFamily = families.find((f) => f.partnerIds.includes(personId));
    const existingPartnerId = existingPartnerFamily?.partnerIds.find((id) => id !== personId);
    if (existingPartnerId && existingPartnerId !== values.partnerId) {
      removePartner(personId, existingPartnerId);
    }
    if (values.partnerId && values.partnerId !== existingPartnerId) {
      addPartner(personId, values.partnerId);
    }

    setFormState(null);
  }

  function handleDelete(personId: string) {
    const fallbackPerson = people.find((p) => p.id !== personId);
    deletePerson(personId);
    selectPerson(null);
    if (centerPersonId === personId) {
      setCenterPerson(fallbackPerson ? fallbackPerson.id : "");
    }
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-900">Stammbaum</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFormState({ mode: "create" })}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            + Neue Person
          </button>
          <ViewMenu activeView={activeView} onChangeView={setActiveView} />
        </div>
      </header>

      <TreeCanvas
        people={people}
        families={families}
        centerPersonId={centerPersonId}
        layoutFn={LAYOUTS[activeView]}
        selectedPersonId={selectedPersonId}
        onSelectPerson={selectPerson}
      />

      <PersonInfoPanel
        person={selectedPerson}
        onClose={() => selectPerson(null)}
        onCenter={(personId) => {
          setCenterPerson(personId);
          selectPerson(null);
        }}
        onEdit={(personId) => setFormState({ mode: "edit", personId })}
        onDelete={handleDelete}
      />

      {formState && (
        <PersonForm
          mode={formState.mode}
          people={people}
          excludePersonId={formState.mode === "edit" ? formState.personId : undefined}
          initialValues={
            formState.mode === "edit"
              ? personToFormValues(people.find((p) => p.id === formState.personId)!, people, families)
              : emptyPersonFormValues()
          }
          onSubmit={handleFormSubmit}
          onCancel={() => setFormState(null)}
        />
      )}
    </div>
  );
}

export default App;
