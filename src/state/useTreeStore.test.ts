import { describe, it, expect, beforeEach } from "vitest";
import { useTreeStore } from "./useTreeStore";

const initialState = useTreeStore.getState();

describe("useTreeStore", () => {
  beforeEach(() => {
    useTreeStore.setState(initialState, true);
  });

  it("starts centered on 'me' with the classic view and no selection", () => {
    const state = useTreeStore.getState();
    expect(state.centerPersonId).toBe("me");
    expect(state.selectedPersonId).toBeNull();
    expect(state.activeView).toBe("classic");
  });

  it("updates the center person", () => {
    useTreeStore.getState().setCenterPerson("father");
    expect(useTreeStore.getState().centerPersonId).toBe("father");
  });

  it("selects and clears a person", () => {
    useTreeStore.getState().selectPerson("mother");
    expect(useTreeStore.getState().selectedPersonId).toBe("mother");
    useTreeStore.getState().selectPerson(null);
    expect(useTreeStore.getState().selectedPersonId).toBeNull();
  });

  it("switches the active view", () => {
    useTreeStore.getState().setActiveView("radial");
    expect(useTreeStore.getState().activeView).toBe("radial");
  });

  it("toggles the panel collapsed state", () => {
    useTreeStore.getState().togglePanelCollapsed();
    expect(useTreeStore.getState().isPanelCollapsed).toBe(true);
    useTreeStore.getState().togglePanelCollapsed();
    expect(useTreeStore.getState().isPanelCollapsed).toBe(false);
  });

  it("re-selecting the already-selected person un-collapses the panel", () => {
    useTreeStore.getState().selectPerson("father");
    useTreeStore.getState().togglePanelCollapsed();
    expect(useTreeStore.getState().isPanelCollapsed).toBe(true);

    useTreeStore.getState().selectPerson("father");
    expect(useTreeStore.getState().isPanelCollapsed).toBe(false);
  });

  it("deselecting keeps the collapsed flag untouched", () => {
    useTreeStore.getState().togglePanelCollapsed();
    useTreeStore.getState().selectPerson(null);
    expect(useTreeStore.getState().isPanelCollapsed).toBe(true);
  });

  it("shows siblings by default and toggles the flag", () => {
    expect(useTreeStore.getState().showSiblings).toBe(true);
    useTreeStore.getState().toggleShowSiblings();
    expect(useTreeStore.getState().showSiblings).toBe(false);
    useTreeStore.getState().toggleShowSiblings();
    expect(useTreeStore.getState().showSiblings).toBe(true);
  });
});
