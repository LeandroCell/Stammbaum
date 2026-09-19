import { create } from "zustand";

export type ViewMode = "classic" | "radial";

interface TreeState {
  centerPersonId: string;
  selectedPersonId: string | null;
  activeView: ViewMode;
  isPanelCollapsed: boolean;
  showSiblings: boolean;
  setCenterPerson: (personId: string) => void;
  selectPerson: (personId: string | null) => void;
  setActiveView: (view: ViewMode) => void;
  togglePanelCollapsed: () => void;
  toggleShowSiblings: () => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  centerPersonId: "me",
  selectedPersonId: null,
  activeView: "classic",
  isPanelCollapsed: false,
  showSiblings: true,
  setCenterPerson: (personId) => set({ centerPersonId: personId }),
  // Every card click un-collapses the panel, even when it re-selects the
  // already-selected person (selectedPersonId doesn't change then, so the
  // panel can't rely on that to know it should come back).
  selectPerson: (personId) =>
    set(personId === null ? { selectedPersonId: null } : { selectedPersonId: personId, isPanelCollapsed: false }),
  setActiveView: (view) => set({ activeView: view }),
  togglePanelCollapsed: () => set((s) => ({ isPanelCollapsed: !s.isPanelCollapsed })),
  toggleShowSiblings: () => set((s) => ({ showSiblings: !s.showSiblings })),
}));
