import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFamilyData } from "./data/useFamilyData";
import { useTreeStore, type ViewMode } from "./state/useTreeStore";
import { TreeCanvas } from "./components/TreeCanvas/TreeCanvas";
import type { ConnectorStyle } from "./components/TreeCanvas/familyConnectors";
import { PersonInfoPanel } from "./components/PersonInfoPanel/PersonInfoPanel";
import { PersonBrowser } from "./components/PersonBrowser/PersonBrowser";
import { ViewMenu } from "./components/ViewMenu/ViewMenu";
import { LoginScreen } from "./components/LoginScreen/LoginScreen";
import {
  PersonForm,
  emptyPersonFormValues,
  personToFormValues,
  type PersonFormValues,
} from "./components/PersonForm/PersonForm";
import { classicLayout } from "./layout/classicLayout";
import { radialLayout } from "./layout/radialLayout";
import type { LayoutFn } from "./layout/layout.types";
import type { DocumentRef, Photo, Source } from "./data/types";
import { exportGedcom } from "./data/gedcomExport";
import { pickDefaultCenter } from "./data/familyGraph";

const LAYOUTS: Record<ViewMode, LayoutFn> = {
  classic: classicLayout,
  radial: radialLayout,
};

// Elbow (right-angled parent/child stems) matches the generation-stacked
// classic layout; the radial fan connects each parent directly to the
// child instead, without a line between the parents themselves.
const EDGE_STYLES: Record<ViewMode, ConnectorStyle> = {
  classic: "elbow",
  radial: "direct",
};

type FormState = { mode: "create" } | { mode: "edit"; personId: string };

function toOptionalField(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function cleanPhotos(photos: Photo[]): Photo[] | undefined {
  const cleaned = photos
    .filter((p) => p.url.trim() !== "")
    .map((p) => ({ id: p.id, url: p.url.trim(), caption: toOptionalField(p.caption ?? "") }));
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanSources(sources: Source[]): Source[] | undefined {
  const cleaned = sources
    .filter((s) => s.title.trim() !== "")
    .map((s) => ({
      id: s.id,
      title: s.title.trim(),
      url: toOptionalField(s.url ?? ""),
      note: toOptionalField(s.note ?? ""),
    }));
  return cleaned.length > 0 ? cleaned : undefined;
}

function cleanDocuments(documents: DocumentRef[]): DocumentRef[] | undefined {
  const cleaned = documents
    .filter((d) => d.title.trim() !== "" && d.url.trim() !== "")
    .map((d) => ({
      id: d.id,
      title: d.title.trim(),
      url: d.url.trim(),
      type: toOptionalField(d.type ?? ""),
    }));
  return cleaned.length > 0 ? cleaned : undefined;
}

function App() {
  const people = useFamilyData((s) => s.people);
  const families = useFamilyData((s) => s.families);
  const needsLogin = useFamilyData((s) => s.needsLogin);
  const isOffline = useFamilyData((s) => s.isOffline);
  const loadTree = useFamilyData((s) => s.loadTree);
  const login = useFamilyData((s) => s.login);
  const logout = useFamilyData((s) => s.logout);
  const addPerson = useFamilyData((s) => s.addPerson);
  const updatePerson = useFamilyData((s) => s.updatePerson);
  const deletePerson = useFamilyData((s) => s.deletePerson);
  const setParents = useFamilyData((s) => s.setParents);
  const addPartner = useFamilyData((s) => s.addPartner);
  const removePartner = useFamilyData((s) => s.removePartner);
  const importGedcomFile = useFamilyData((s) => s.importGedcomFile);
  const clearImportError = useFamilyData((s) => s.clearImportError);
  const isImporting = useFamilyData((s) => s.isLoading);
  const importError = useFamilyData((s) => s.error);

  const centerPersonId = useTreeStore((s) => s.centerPersonId);
  const selectedPersonId = useTreeStore((s) => s.selectedPersonId);
  const activeView = useTreeStore((s) => s.activeView);
  const selectPerson = useTreeStore((s) => s.selectPerson);
  const setCenterPerson = useTreeStore((s) => s.setCenterPerson);
  const setActiveView = useTreeStore((s) => s.setActiveView);
  const isPanelCollapsed = useTreeStore((s) => s.isPanelCollapsed);
  const togglePanelCollapsed = useTreeStore((s) => s.togglePanelCollapsed);
  const showSiblings = useTreeStore((s) => s.showSiblings);
  const toggleShowSiblings = useTreeStore((s) => s.toggleShowSiblings);

  const [formState, setFormState] = useState<FormState | null>(null);
  const [showPersonBrowser, setShowPersonBrowser] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;

  if (needsLogin) {
    return <LoginScreen onLogin={login} />;
  }

  function handleGedcomExport() {
    const text = exportGedcom(people, families);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `stammbaum-${new Date().toISOString().slice(0, 10)}.ged`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  async function handleGedcomFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    await importGedcomFile(file);
    const imported = useFamilyData.getState();
    if (!imported.error && imported.people.length > 0) {
      selectPerson(null);
      setCenterPerson(pickDefaultCenter(imported.people, imported.families) ?? imported.people[0].id);
    }
  }

  async function handleFormSubmit(values: PersonFormValues) {
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
      photos: cleanPhotos(values.photos),
      sources: cleanSources(values.sources),
      documents: cleanDocuments(values.documents),
    };

    const personId = formState?.mode === "edit" ? formState.personId : await addPerson(personData);
    if (formState?.mode === "edit") {
      await updatePerson(personId, personData);
    }

    await setParents(personId, values.fatherId || null, values.motherId || null);

    const existingPartnerFamily = families.find((f) => f.partnerIds.includes(personId));
    const existingPartnerId = existingPartnerFamily?.partnerIds.find((id) => id !== personId);
    if (existingPartnerId && existingPartnerId !== values.partnerId) {
      await removePartner(personId, existingPartnerId);
    }
    if (values.partnerId && values.partnerId !== existingPartnerId) {
      await addPartner(personId, values.partnerId);
    }

    setFormState(null);
  }

  function handleSelectFromBrowser(personId: string) {
    setCenterPerson(personId);
    selectPerson(personId);
    setShowPersonBrowser(false);
  }

  async function handleDelete(personId: string) {
    const fallbackPerson = people.find((p) => p.id !== personId);
    await deletePerson(personId);
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
          <button
            type="button"
            onClick={() => setShowPersonBrowser(true)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Alle Personen
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {isImporting ? "Importiere…" : "GEDCOM importieren"}
          </button>
          <button
            type="button"
            onClick={handleGedcomExport}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            GEDCOM exportieren
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".ged,.gedcom"
            onChange={handleGedcomFileChange}
            className="hidden"
          />
          {activeView === "classic" && (
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              <input type="checkbox" checked={showSiblings} onChange={toggleShowSiblings} className="h-4 w-4" />
              Geschwister anzeigen
            </label>
          )}
          <ViewMenu activeView={activeView} onChangeView={setActiveView} />
          {!isOffline && (
            <button
              type="button"
              onClick={() => logout()}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Abmelden
            </button>
          )}
        </div>
      </header>

      {isOffline && (
        <div className="absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-700 shadow">
          Kein Server verbunden — Änderungen werden nur lokal in diesem Tab gespeichert.
        </div>
      )}

      {importError && (
        <div className="absolute left-1/2 top-16 z-10 flex -translate-x-1/2 items-center gap-3 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 shadow">
          <span>{importError.message}</span>
          <button type="button" onClick={clearImportError} className="font-medium hover:underline" aria-label="Fehlermeldung schließen">
            ✕
          </button>
        </div>
      )}

      <TreeCanvas
        people={people}
        families={families}
        centerPersonId={centerPersonId}
        layoutFn={LAYOUTS[activeView]}
        selectedPersonId={selectedPersonId}
        onSelectPerson={selectPerson}
        showSiblings={showSiblings}
        edgeStyle={EDGE_STYLES[activeView]}
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
        isCollapsed={isPanelCollapsed}
        onToggleCollapsed={togglePanelCollapsed}
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

      {showPersonBrowser && (
        <PersonBrowser
          people={people}
          onSelect={handleSelectFromBrowser}
          onClose={() => setShowPersonBrowser(false)}
        />
      )}
    </div>
  );
}

export default App;
