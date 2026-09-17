import { create } from "zustand";

export type ViewMode = "classic" | "radial" | "network";

interface TreeState {
  centerPersonId: string;
  selectedPersonId: string | null;
  activeView: ViewMode;
  setCenterPerson: (personId: string) => void;
  selectPerson: (personId: string | null) => void;
  setActiveView: (view: ViewMode) => void;
}

export const useTreeStore = create<TreeState>((set) => ({
  centerPersonId: "me",
  selectedPersonId: null,
  activeView: "classic",
  setCenterPerson: (personId) => set({ centerPersonId: personId }),
  selectPerson: (personId) => set({ selectedPersonId: personId }),
  setActiveView: (view) => set({ activeView: view }),
}));
