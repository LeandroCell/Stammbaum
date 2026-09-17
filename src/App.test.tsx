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

  it("renders the app title", () => {
    render(<App />);
    expect(screen.getByText("Stammbaum")).toBeInTheDocument();
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

  it("switches to the network view via the three-dot menu, revealing siblings the classic view hides", async () => {
    render(<App />);
    expect(screen.queryByText("Julia Berger")).not.toBeInTheDocument();

    await userEvent.click(screen.getByLabelText("Darstellung wählen"));
    await userEvent.click(screen.getByText(/Netzwerkansicht/));

    expect(screen.getByText("Julia Berger")).toBeInTheDocument();
  });

  it("adds a new person connected as a child of the center person", async () => {
    render(<App />);
    await userEvent.click(screen.getByText("+ Neue Person"));

    await userEvent.type(screen.getByLabelText(/Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/Nachname/), "Berger");
    await userEvent.selectOptions(screen.getByLabelText("Vater"), "me");
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
});
