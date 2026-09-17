import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, afterEach } from "vitest";
import { PersonInfoPanel } from "./PersonInfoPanel";
import { people } from "../../data/sampleData";

const me = people.find((p) => p.id === "me")!;
const noop = () => {};

describe("PersonInfoPanel", () => {
  it("shows the person's details when a person is given", () => {
    render(<PersonInfoPanel person={me} onClose={noop} onCenter={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("Max Berger")).toBeInTheDocument();
    expect(screen.getByText(/Frankfurt am Main/)).toBeInTheDocument();
  });

  it("calls onCenter with the person's id when 'Zentrieren' is clicked", async () => {
    const onCenter = vi.fn();
    render(<PersonInfoPanel person={me} onClose={noop} onCenter={onCenter} onEdit={noop} onDelete={noop} />);
    await userEvent.click(screen.getByText("Zentrieren"));
    expect(onCenter).toHaveBeenCalledWith("me");
  });

  it("calls onClose when the close button is clicked", async () => {
    const onClose = vi.fn();
    render(<PersonInfoPanel person={me} onClose={onClose} onCenter={noop} onEdit={noop} onDelete={noop} />);
    await userEvent.click(screen.getByLabelText("Schließen"));
    expect(onClose).toHaveBeenCalled();
  });

  it("stays hidden when no person is selected", () => {
    render(<PersonInfoPanel person={null} onClose={noop} onCenter={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.queryByText("Zentrieren")).not.toBeInTheDocument();
  });

  it("shows fallback text for a person with no biography, photos, sources, or documents", () => {
    const mother = people.find((p) => p.id === "mother")!;
    render(<PersonInfoPanel person={mother} onClose={noop} onCenter={noop} onEdit={noop} onDelete={noop} />);
    expect(screen.getByText("Keine Biografie hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Bilder hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Quellen hinterlegt.")).toBeInTheDocument();
    expect(screen.getByText("Keine Dokumente hinterlegt.")).toBeInTheDocument();
  });

  it("calls onEdit with the person's id when 'Bearbeiten' is clicked", async () => {
    const onEdit = vi.fn();
    render(<PersonInfoPanel person={me} onClose={noop} onCenter={noop} onEdit={onEdit} onDelete={noop} />);
    await userEvent.click(screen.getByText("Bearbeiten"));
    expect(onEdit).toHaveBeenCalledWith("me");
  });

  describe("Löschen", () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("calls onDelete with the person's id after the user confirms", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(true);
      const onDelete = vi.fn();
      render(<PersonInfoPanel person={me} onClose={noop} onCenter={noop} onEdit={noop} onDelete={onDelete} />);
      await userEvent.click(screen.getByText("Löschen"));
      expect(window.confirm).toHaveBeenCalledWith("Max Berger wirklich löschen?");
      expect(onDelete).toHaveBeenCalledWith("me");
    });

    it("does not call onDelete when the user cancels the confirmation", async () => {
      vi.spyOn(window, "confirm").mockReturnValue(false);
      const onDelete = vi.fn();
      render(<PersonInfoPanel person={me} onClose={noop} onCenter={noop} onEdit={noop} onDelete={onDelete} />);
      await userEvent.click(screen.getByText("Löschen"));
      expect(onDelete).not.toHaveBeenCalled();
    });
  });
});
