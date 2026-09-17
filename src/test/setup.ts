import "@testing-library/jest-dom/vitest";
import { vi, beforeEach } from "vitest";

// Default: simulate "no backend reachable" (e.g. plain `vite dev` without
// the /api functions) for every test, so useFamilyData's loadTree() falls
// back to bundled sample data and persist() no-ops, matching pre-backend
// behavior. Tests that specifically exercise login/save/load against the
// API override `global.fetch` themselves.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("fetch not mocked in this test")))
  );
});
