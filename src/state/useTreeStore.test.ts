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
});
