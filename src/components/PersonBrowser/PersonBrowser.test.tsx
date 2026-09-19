import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonBrowser } from "./PersonBrowser";
import { people } from "../../data/sampleData";

describe("PersonBrowser", () => {
  it("lists every person, sorted alphabetically", () => {
    render(<PersonBrowser people={people} onSelect={() => {}} onClose={() => {}} />);
    const items = screen.getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toHaveLength(people.length);
    expect(items).toEqual([...items].sort((a, b) => a!.localeCompare(b!)));
  });

  it("filters the list as the user types", async () => {
    render(<PersonBrowser people={people} onSelect={() => {}} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Person suchen"), "Julia");
    expect(screen.getByText(/Julia Berger/)).toBeInTheDocument();
    expect(screen.queryByText(/Max Berger/)).not.toBeInTheDocument();
  });

  it("shows a no-results message when nothing matches", async () => {
    render(<PersonBrowser people={people} onSelect={() => {}} onClose={() => {}} />);
    await userEvent.type(screen.getByLabelText("Person suchen"), "xyz-nobody");
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });

  it("calls onSelect with the clicked person's id", async () => {
    const onSelect = vi.fn();
    render(<PersonBrowser people={people} onSelect={onSelect} onClose={() => {}} />);
    await userEvent.click(screen.getByText(/Julia Berger/));
    expect(onSelect).toHaveBeenCalledWith("sibling1");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<PersonBrowser people={people} onSelect={() => {}} onClose={onClose} />);
    await userEvent.click(screen.getByLabelText("Schließen"));
    expect(onClose).toHaveBeenCalled();
  });
});
