import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { PersonForm, emptyPersonFormValues, personToFormValues } from "./PersonForm";
import { people, families } from "../../data/sampleData";

describe("PersonForm", () => {
  it("renders empty fields in create mode", () => {
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByRole("heading", { name: "Neue Person" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Vorname/)).toHaveValue("");
  });

  it("pre-fills fields in edit mode from personToFormValues", () => {
    const me = people.find((p) => p.id === "me")!;
    render(
      <PersonForm
        mode="edit"
        people={people}
        initialValues={personToFormValues(me, people, families)}
        excludePersonId="me"
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByLabelText(/Vorname/)).toHaveValue("Max");
    expect(screen.getByLabelText(/Nachname/)).toHaveValue("Berger");
  });

  it("excludes the person being edited from the father/mother/partner pickers", async () => {
    const me = people.find((p) => p.id === "me")!;
    render(
      <PersonForm
        mode="edit"
        people={people}
        initialValues={personToFormValues(me, people, families)}
        excludePersonId="me"
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );
    await userEvent.click(screen.getByLabelText("Vater"));
    expect(screen.queryByText(/Max Berger/)).not.toBeInTheDocument();
  });

  it("calls onSubmit with the entered values", async () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    await userEvent.type(screen.getByLabelText(/Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/Nachname/), "Berger");
    await userEvent.click(screen.getByText("Speichern"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: "Nina", lastName: "Berger" })
    );
  });

  it("allows adding and removing a photo", async () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    expect(screen.getByText("Keine Bilder hinterlegt.")).toBeInTheDocument();

    await userEvent.click(screen.getByText("+ Bild hinzufügen"));
    expect(screen.queryByText("Keine Bilder hinterlegt.")).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Bild-URL/), "https://example.com/photo.jpg");
    await userEvent.type(screen.getByLabelText(/Bildunterschrift/), "Urlaub 2020");

    await userEvent.type(screen.getByLabelText(/^Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/^Nachname/), "Berger");
    await userEvent.click(screen.getByText("Speichern"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [expect.objectContaining({ url: "https://example.com/photo.jpg", caption: "Urlaub 2020" })],
      })
    );

    await userEvent.click(screen.getByLabelText("Bilder-Eintrag entfernen"));
    expect(screen.getByText("Keine Bilder hinterlegt.")).toBeInTheDocument();
  });

  it("allows adding a source and a document", async () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );

    await userEvent.click(screen.getByText("+ Quelle hinzufügen"));
    await userEvent.type(screen.getByLabelText("Titel*"), "Geburtsurkunde");

    await userEvent.click(screen.getByText("+ Dokument hinzufügen"));
    const docTitleInputs = screen.getAllByLabelText("Titel*");
    await userEvent.type(docTitleInputs[docTitleInputs.length - 1], "Pass");
    await userEvent.type(screen.getByLabelText(/Link\*/), "https://example.com/pass.pdf");

    await userEvent.type(screen.getByLabelText(/^Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/^Nachname/), "Berger");
    await userEvent.click(screen.getByText("Speichern"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        sources: [expect.objectContaining({ title: "Geburtsurkunde" })],
        documents: [expect.objectContaining({ title: "Pass", url: "https://example.com/pass.pdf" })],
      })
    );
  });

  it("fills the photo URL from an uploaded file, keeping the caption field usable", async () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    await userEvent.click(screen.getByText("+ Bild hinzufügen"));
    const file = new File(["pixel"], "urlaub.png", { type: "image/png" });
    await userEvent.upload(screen.getByLabelText("Datei hochladen"), file);
    await userEvent.type(screen.getByLabelText(/Bildunterschrift/), "Urlaub 2020");

    expect(await screen.findByDisplayValue(/^data:image\/png;base64,/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/^Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/^Nachname/), "Berger");
    await userEvent.click(screen.getByText("Speichern"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        photos: [
          expect.objectContaining({
            url: expect.stringMatching(/^data:image\/png;base64,/),
            caption: "Urlaub 2020",
          }),
        ],
      })
    );
  });

  it("fills the document link from an uploaded file and auto-detects its type", async () => {
    const onSubmit = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={onSubmit}
        onCancel={() => {}}
      />
    );
    await userEvent.click(screen.getByText("+ Dokument hinzufügen"));
    await userEvent.type(screen.getByLabelText("Titel*"), "Pass");
    const file = new File(["%PDF-1.4"], "pass.pdf", { type: "application/pdf" });
    await userEvent.upload(screen.getByLabelText("Datei hochladen"), file);

    expect(await screen.findByDisplayValue(/^data:application\/pdf;base64,/)).toBeInTheDocument();
    expect(screen.getByLabelText("Typ")).toHaveValue("application/pdf");

    await userEvent.type(screen.getByLabelText(/^Vorname/), "Nina");
    await userEvent.type(screen.getByLabelText(/^Nachname/), "Berger");
    await userEvent.click(screen.getByText("Speichern"));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        documents: [
          expect.objectContaining({
            title: "Pass",
            url: expect.stringMatching(/^data:application\/pdf;base64,/),
            type: "application/pdf",
          }),
        ],
      })
    );
  });

  it("pre-fills the photos/sources/documents lists in edit mode", () => {
    const me = people.find((p) => p.id === "me")!;
    render(
      <PersonForm
        mode="edit"
        people={people}
        initialValues={personToFormValues(me, people, families)}
        excludePersonId="me"
        onSubmit={() => {}}
        onCancel={() => {}}
      />
    );
    expect(screen.getByDisplayValue("Beispielbild")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Geburtsurkunde Standesamt Frankfurt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Einbürgerungsurkunde")).toBeInTheDocument();
  });

  it("calls onCancel when 'Abbrechen' is clicked", async () => {
    const onCancel = vi.fn();
    render(
      <PersonForm
        mode="create"
        people={people}
        initialValues={emptyPersonFormValues()}
        onSubmit={() => {}}
        onCancel={onCancel}
      />
    );
    await userEvent.click(screen.getByText("Abbrechen"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("personToFormValues", () => {
  it("resolves father/mother from the family the person is a child in", () => {
    const me = people.find((p) => p.id === "me")!;
    const values = personToFormValues(me, people, families);
    expect(values.fatherId).toBe("father");
    expect(values.motherId).toBe("mother");
  });

  it("resolves the partner from the family the person is a partner in", () => {
    const me = people.find((p) => p.id === "me")!;
    const values = personToFormValues(me, people, families);
    expect(values.partnerId).toBe("partner");
  });

  it("leaves father/mother/partner empty for a person with none on record", () => {
    const pgf = people.find((p) => p.id === "pgf")!;
    const values = personToFormValues(pgf, people, families);
    expect(values.fatherId).toBe("");
    expect(values.motherId).toBe("");
    expect(values.partnerId).toBe("pgm");
  });
});
