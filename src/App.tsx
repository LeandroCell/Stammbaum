import { useFamilyData } from "./data/useFamilyData";
import { useTreeStore, type ViewMode } from "./state/useTreeStore";
import { TreeCanvas } from "./components/TreeCanvas/TreeCanvas";
import { PersonInfoPanel } from "./components/PersonInfoPanel/PersonInfoPanel";
import { ViewMenu } from "./components/ViewMenu/ViewMenu";
import { classicLayout } from "./layout/classicLayout";
import { radialLayout } from "./layout/radialLayout";
import { networkLayout } from "./layout/networkLayout";
import type { LayoutFn } from "./layout/layout.types";

const LAYOUTS: Record<ViewMode, LayoutFn> = {
  classic: classicLayout,
  radial: radialLayout,
  network: networkLayout,
};

function App() {
  const { people, families } = useFamilyData();
  const centerPersonId = useTreeStore((s) => s.centerPersonId);
  const selectedPersonId = useTreeStore((s) => s.selectedPersonId);
  const activeView = useTreeStore((s) => s.activeView);
  const selectPerson = useTreeStore((s) => s.selectPerson);
  const setCenterPerson = useTreeStore((s) => s.setCenterPerson);
  const setActiveView = useTreeStore((s) => s.setActiveView);

  const selectedPerson = people.find((p) => p.id === selectedPersonId) ?? null;

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-slate-100">
      <header className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-white/80 px-4 py-3 backdrop-blur">
        <h1 className="text-lg font-semibold text-slate-900">Stammbaum</h1>
        <ViewMenu activeView={activeView} onChangeView={setActiveView} />
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
      />
    </div>
  );
}

export default App;
