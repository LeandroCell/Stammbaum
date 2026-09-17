import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonInfoPanel } from "./PersonInfoPanel";
import { people } from "../../data/sampleData";

const me = people.find((p) => p.id === "me")!;

describe("PersonInfoPanel", () => {
  it("shows the person's details when a person is given", () => {
    render(<PersonInfoPanel person={me} onClose={() => {}} onCenter={() => {}} />);
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText(/Frankfurt am Main/)).toBeInTheDocument();
  });

  it("calls onCenter with the person's id when 'Zentrieren' is clicked", async () => {
    const onCenter = vi.fn();
    render(<PersonInfoPanel person={me} onClose={() => {}} onCenter={onCenter} />);
    await userEvent.click(screen.getByText("Zentrieren"));
    expect(onCenter).toHaveBeenCalledWith("me");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<PersonInfoPanel person={me} onClose={onClose} onCenter={() => {}} />);
    await userEvent.click(screen.getByLabelText("Schließen"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays hidden when no person is selected", () => {
    render(<PersonInfoPanel person={null} onClose={() => {}} onCenter={() => {}} />);
    expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
  });

  it("shows fallback text for a person with no biography, photos, sources, or documents", () => {
    const mother = people.find((p) => p.id === "mother")!;
    render(<PersonInfoPanel person={mother} onClose={() => {}} onCenter={() => {}} />);
    expect(screen.getByText("Keine Biografie hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Bilder hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Quellen hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Dokumente hinterlegt.")).toBeInTheDocument();
  });
});
