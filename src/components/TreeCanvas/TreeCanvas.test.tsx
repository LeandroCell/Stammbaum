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

  it("draws a line connecting the parents to each other before branching to their children", () => {
    const { container } = render(
      <TreeCanvas
        people={people}
        families={families}
        centerPersonId="me"
        layoutFn={classicLayout}
        selectedPersonId={null}
        onSelectPerson={() => {}}
      />
    );
    const layout = classicLayout(people, families, "me");
    const nodeById = new Map(layout.nodes.map((n) => [n.personId, n]));
    const father = nodeById.get("father")!;
    const mother = nodeById.get("mother")!;

    const lines = Array.from(container.querySelectorAll("line"));
    const hasParentLine = lines.some(
      (line) =>
        Number(line.getAttribute("x1")) === father.x &&
        Number(line.getAttribute("y1")) === father.y &&
        Number(line.getAttribute("x2")) === mother.x &&
        Number(line.getAttribute("y2")) === mother.y
    );
    expect(hasParentLine).toBe(true);
  });
});
