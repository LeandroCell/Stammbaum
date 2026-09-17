import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { TreeCanvas } from "./TreeCanvas";
import { classicLayout } from "../../layout/classicLayout";
import { people, families } from "../../data/sampleData";

describe("TreeCanvas", () => {
  it("renders person cards for the center person and their relatives", () => {
    render(
      <TreeCanvas
        people={people}
        families={families}
        centerPersonId="me"
        layoutFn={classicLayout}
        selectedPersonId={null}
        onSelectPerson={() => {}}
      />
    );
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText("Thomas Berger")).toBeInTheDocument();
  });

  it("calls onSelectPerson when a card is clicked", async () => {
    const onSelectPerson = vi.fn();
    render(
      <TreeCanvas
        people={people}
        families={families}
        centerPersonId="me"
        layoutFn={classicLayout}
        selectedPersonId={null}
        onSelectPerson={onSelectPerson}
      />
    );
    await userEvent.click(screen.getByText("Thomas Berger"));
    expect(onSelectPerson).toHaveBeenCalledWith("father");
  });
});
