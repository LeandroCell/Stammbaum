import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { LoginScreen } from "./LoginScreen";

describe("LoginScreen", () => {
  it("calls onLogin with the entered password", async () => {
    const onLogin = vi.fn().mockResolvedValue(true);
    render(<LoginScreen onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Passwort"), "geheim123");
    await userEvent.click(screen.getByText("Anmelden"));

    expect(onLogin).toHaveBeenCalledWith("geheim123");
  });

  it("shows an error message when the login fails", async () => {
    const onLogin = vi.fn().mockResolvedValue(false);
    render(<LoginScreen onLogin={onLogin} />);

    await userEvent.type(screen.getByLabelText("Passwort"), "falsch");
    await userEvent.click(screen.getByText("Anmelden"));

    expect(await screen.findByText("Falsches Passwort.")).toBeInTheDocument();
  });

  it("shows no error message before any submit attempt", () => {
    render(<LoginScreen onLogin={vi.fn()} />);
    expect(screen.queryByText("Falsches Passwort.")).not.toBeInTheDocument();
  });
});
