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
