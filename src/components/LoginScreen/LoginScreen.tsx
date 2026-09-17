import { useState, type FormEvent } from "react";

interface LoginScreenProps {
  onLogin: (password: string) => Promise<boolean>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const success = await onLogin(password);
    setIsSubmitting(false);
    if (!success) {
      setError("Falsches Passwort.");
    }
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h1 className="text-lg font-semibold text-slate-900">Stammbaum</h1>
        <p className="mt-1 text-sm text-slate-500">Bitte Passwort eingeben.</p>

        <label className="mt-4 block text-sm text-slate-700">
          Passwort
          <input
            type="password"
            required
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
          />
        </label>

        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-4 w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {isSubmitting ? "Anmelden…" : "Anmelden"}
        </button>
      </form>
    </div>
  );
}
