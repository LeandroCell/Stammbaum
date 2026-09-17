import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import App from "./App";
import { useTreeStore } from "./state/useTreeStore";

const initialState = useTreeStore.getState();

describe("App", () => {
  beforeEach(() => {
    useTreeStore.setState(initialState, true);
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
});
