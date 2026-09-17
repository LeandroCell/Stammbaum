import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { ViewMenu } from "./ViewMenu";

describe("ViewMenu", () => {
  it("is closed by default, showing only the trigger button", () => {
    render(<ViewMenu activeView="classic" onChangeView={() => {}} />);
    expect(screen.queryByText("Runder Stammbaum")).not.toBeInTheDocument();
  });

  it("opens to show all three view options when clicked", async () => {
    render(<ViewMenu activeView="classic" onChangeView={() => {}} />);
    await userEvent.click(screen.getByLabelText("Darstellung wählen"));
    expect(screen.getByText(/Klassischer Stammbaum/)).toBeInTheDocument();
    expect(screen.getByText(/Runder Stammbaum/)).toBeInTheDocument();
    expect(screen.getByText(/Netzwerkansicht/)).toBeInTheDocument();
  });

  it("calls onChangeView with the selected view and closes the menu", async () => {
    const onChangeView = vi.fn();
    render(<ViewMenu activeView="classic" onChangeView={onChangeView} />);
    await userEvent.click(screen.getByLabelText("Darstellung wählen"));
    await userEvent.click(screen.getByText(/Runder Stammbaum/));
    expect(onChangeView).toHaveBeenCalledWith("radial");
    expect(screen.queryByText(/Netzwerkansicht/)).not.toBeInTheDocument();
  });

  it("marks the active view with a checkmark", async () => {
    render(<ViewMenu activeView="network" onChangeView={() => {}} />);
    await userEvent.click(screen.getByLabelText("Darstellung wählen"));
    expect(screen.getByText("Netzwerkansicht ✓")).toBeInTheDocument();
  });
});
