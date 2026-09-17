import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonPicker, personLabel } from "./PersonPicker";
import { people } from "../../data/sampleData";

describe("PersonPicker", () => {
  it("shows the currently selected person's label", () => {
    render(<PersonPicker label="Vater" people={people} value="father" onChange={vi.fn()} clearLabel="— keiner —" />);
    expect(screen.getByLabelText("Vater")).toHaveValue("Thomas Berger (1958)");
  });

  it("shows a placeholder when nothing is selected", () => {
    render(<PersonPicker label="Vater" people={people} value="" onChange={vi.fn()} clearLabel="— keiner —" />);
    expect(screen.getByLabelText("Vater")).toHaveValue("");
    expect(screen.getByLabelText("Vater")).toHaveAttribute("placeholder", "— keiner —");
  });

  it("filters the dropdown as the user types", async () => {
    render(<PersonPicker label="Vater" people={people} value="" onChange={vi.fn()} clearLabel="— keiner —" />);
    await userEvent.type(screen.getByLabelText("Vater"), "Julia");

    expect(screen.getByText("Julia Berger (1990)")).toBeInTheDocument();
    expect(screen.queryByText(/Thomas Berger/)).not.toBeInTheDocument();
  });

  it("calls onChange with the selected person's id and closes the dropdown", async () => {
    const onChange = vi.fn();
    render(<PersonPicker label="Vater" people={people} value="" onChange={onChange} clearLabel="— keiner —" />);
    await userEvent.type(screen.getByLabelText("Vater"), "Julia");
    await userEvent.click(screen.getByText("Julia Berger (1990)"));

    expect(onChange).toHaveBeenCalledWith("sibling1");
    expect(screen.queryByText("Julia Berger (1990)")).not.toBeInTheDocument();
  });

  it("clears the selection when the clear option is clicked", async () => {
    const onChange = vi.fn();
    render(<PersonPicker label="Vater" people={people} value="father" onChange={onChange} clearLabel="— keiner —" />);
    await userEvent.click(screen.getByLabelText("Vater"));
    await userEvent.click(screen.getByText("— keiner —"));

    expect(onChange).toHaveBeenCalledWith("");
  });

  it("reverts unmatched typed text back to the current selection on blur", async () => {
    render(
      <>
        <PersonPicker label="Vater" people={people} value="father" onChange={vi.fn()} clearLabel="— keiner —" />
        <button type="button">Outside</button>
      </>
    );
    const input = screen.getByLabelText("Vater");
    await userEvent.clear(input);
    await userEvent.type(input, "asdf nonsense");
    await userEvent.click(screen.getByText("Outside"));

    expect(input).toHaveValue("Thomas Berger (1958)");
  });

  it("shows a 'no results' hint when nothing matches", async () => {
    render(<PersonPicker label="Vater" people={people} value="" onChange={vi.fn()} clearLabel="— keiner —" />);
    await userEvent.type(screen.getByLabelText("Vater"), "zzzzz");
    expect(screen.getByText("Keine Treffer")).toBeInTheDocument();
  });
});

describe("personLabel", () => {
  it("includes the birth year to disambiguate people with the same name", () => {
    const person = people.find((p) => p.id === "me")!;
    expect(personLabel(person)).toBe("Max Berger (1988)");
  });

  it("omits the year when the birth date is unknown", () => {
    const person = { id: "x", firstName: "Test", lastName: "Person" };
    expect(personLabel(person)).toBe("Test Person");
  });
});
