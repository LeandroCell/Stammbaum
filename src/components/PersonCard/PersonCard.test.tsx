import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonCard } from "./PersonCard";
import type { Person } from "../../data/types";

const person: Person = {
  id: "me",
  firstName: "Max",
  lastName: "Berger",
  birthDate: "1988-06-18",
};

describe("PersonCard", () => {
  it("shows the person's name and birth year", () => {
    render(
      <svg>
        <PersonCard person={person} x={0} y={0} isSelected={false} onSelect={() => {}} />
      </svg>
    );
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText("1988")).toBeInTheDocument();
  });

  it("calls onSelect with the person's id when clicked", async () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <PersonCard person={person} x={0} y={0} isSelected={false} onSelect={onSelect} />
      </svg>
    );
    await userEvent.click(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("me");
  });

  it("also selects the person on double-click", async () => {
    const onSelect = vi.fn();
    render(
      <svg>
        <PersonCard person={person} x={0} y={0} isSelected={false} onSelect={onSelect} />
      </svg>
    );
    await userEvent.dblClick(screen.getByRole("button"));
    expect(onSelect).toHaveBeenCalledWith("me");
  });
});
