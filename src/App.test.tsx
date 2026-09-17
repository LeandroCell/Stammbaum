import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import App from "./App";
import { useTreeStore } from "./state/useTreeStore";
import { useFamilyData } from "./data/useFamilyData";

const initialTreeState = useTreeStore.getState();
const initialFamilyState = useFamilyData.getState();

describe("App", () => {
  beforeEach(() => {
    useTreeStore.setState(initialTreeState, true);
    useFamilyData.setState(initialFamilyState, true);
  });

  it("renders the app title", async () => {
    render(<App />);
    expect(screen.getByText("Stammbaum")).toBeInTheDocument();
    // Let the mount-time loadTree() (which falls back to sample data
    // against the mocked, rejecting fetch) settle before the test ends, so
    // its state update isn't left dangling outside of act().
    await screen.findByText(/Kein Server verbunden/);
  });

  it("opens the info panel with the clicked person's details", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Thomas Berger"));
    expect(screen.getByText("Zentrieren")).toBeInTheDocument();
    expect(screen.getByText("Geburtsort: München")).toBeInTheDocument();
  });

  it("re-centers the tree on the selected person", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Thomas Berger"));
    await userEvent.click(screen.getByText("Zentrieren"));
    expect(screen.getByText("Julia Berger")).toBeInTheDocument();
    expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
  });

  it("switches to the radial view via the three-dot menu, hiding descendants that the classic view shows", async () => {
    render(<App />);
    expect(screen.getByText("Ben Berger")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Darstellung wählen"));
    await userEvent.click(screen.getByText(/Runder Stammbaum/));

    expect(screen.queryByText("Ben Berger")).not.toBeInTheDocument();
  });

  it("adds a new person connected as a child of the center person", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("+ Neue Person"));

    await userEvent.type(screen.getByLabelText(/Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/Nachname/), "Berger");
    await userEvent.type(screen.getByLabelText("Vater"), "Max");
    await userEvent.click(screen.getByText("Max Berger (1988)"));
    await userEvent.click(screen.getByText("Speichern"));

    expect(screen.queryByRole("heading", { name: "Neue Person" })).not.toBeInTheDocument();
    expect(screen.getByText("Nina Berger")).toBeInTheDocument();
  });

  it("edits an existing person's details via the info panel", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("Thomas Berger"));
    await userEvent.click(screen.getByText("Bearbeiten"));

    const birthPlaceInput = screen.getByLabelText("Geburtsort");
    await userEvent.clear(birthPlaceInput);
    await userEvent.type(birthPlaceInput, "Stuttgart");
    await userEvent.click(screen.getByText("Speichern"));

    expect(screen.queryByRole("heading", { name: "Person bearbeiten" })).not.toBeInTheDocument();
    expect(screen.getByText("Geburtsort: Stuttgart")).toBeInTheDocument();
  });

  describe("deleting a person", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("removes the person from the tree after confirming deletion", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      render(<App />);
      await userEvent.click(screen.getByText("Thomas Berger"));
      await userEvent.click(screen.getByText("Löschen"));

      expect(screen.queryByText("Thomas Berger")).not.toBeInTheDocument();
      expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
    });
  });

  describe("GEDCOM-Import", () => {
    it("replaces the tree with the imported people and centers on the first one", async () => {
      render(<App />);
      const file = new File(
        ["0 HEAD\n0 @I1@ INDI\n1 NAME Erika /Muster/\n1 SEX F\n0 TRLR"],
        "test.ged",
        { type: "text/plain" }
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      expect(await screen.findByText("Erika Muster")).toBeInTheDocument();
      expect(screen.queryByText("Max Berger")).not.toBeInTheDocument();
    });

    it("shows a dismissible error and keeps the current tree when the file is invalid", async () => {
      render(<App />);
      const file = new File(["0 HEAD\n0 TRLR"], "empty.ged", { type: "text/plain" });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      await userEvent.upload(fileInput, file);

      expect(await screen.findByText(/Keine Personen/)).toBeInTheDocument();
      expect(screen.getByText("Max Berger")).toBeInTheDocument();

      await userEvent.click(screen.getByLabelText("Fehlermeldung schließen"));
      expect(screen.queryByText(/Keine Personen/)).not.toBeInTheDocument();
    });
  });

  describe("GEDCOM-Export", () => {
    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("builds a GEDCOM blob and triggers a file download", async () => {
      const objectUrl = "blob:mock-url";
      vi.stubGlobal("URL", {
        ...URL,
        createObjectURL: vi.fn(() => objectUrl),
        revokeObjectURL: vi.fn(),
      });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

      render(<App />);
      await userEvent.click(screen.getByText("GEDCOM exportieren"));

      expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(clickSpy).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(objectUrl);
    });
  });
});
