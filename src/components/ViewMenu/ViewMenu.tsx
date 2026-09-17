import { useState } from "react";
import type { ViewMode } from "../../state/useTreeStore";

interface ViewMenuProps {
  activeView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

const VIEW_LABELS: Record<ViewMode, string> = {
  classic: "Klassischer Stammbaum",
  radial: "Runder Stammbaum",
  network: "Netzwerkansicht",
};

const VIEW_ORDER: ViewMode[] = ["classic", "radial", "network"];

export function ViewMenu({ activeView, onChangeView }: ViewMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Darstellung wählen"
        aria-expanded={isOpen}
        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      >
        ⋮
      </button>

      {isOpen && (
        <ul className="absolute right-0 mt-1 w-56 rounded-md border border-slate-200 bg-white py-1 shadow-lg">
          {VIEW_ORDER.map((view) => (
            <li key={view}>
              <button
                type="button"
                onClick={() => {
                  onChangeView(view);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                  view === activeView ? "font-semibold text-slate-900" : "text-slate-600"
                }`}
              >
                {VIEW_LABELS[view]}
                {view === activeView ? " ✓" : ""}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
