import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  saveInstructorSession,
  validateInstructorCode,
} from "@dci/shared";
import { Button } from "@dci/shared/ui";

interface InstructorGateProps {
  onAuthed: () => void;
}

type GateError =
  | { kind: "empty" }
  | { kind: "bad-code" }
  | { kind: "network" };

function errorMessage(err: GateError): string {
  switch (err.kind) {
    case "empty":
      return "Please enter the instructor code.";
    case "bad-code":
      return "That instructor code doesn't match.";
    case "network":
      return "Couldn't reach the server. Check your connection and try again.";
  }
}

export function InstructorGate({ onAuthed }: InstructorGateProps) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GateError | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmed = code.trim();
    if (!trimmed) {
      setError({ kind: "empty" });
      return;
    }

    setBusy(true);
    try {
      const ok = await validateInstructorCode(trimmed);
      if (!ok) {
        setError({ kind: "bad-code" });
        return;
      }
      saveInstructorSession();
      onAuthed();
    } catch (err) {
      console.error("[instructor-gate] sign-in failed:", err);
      setError({ kind: "network" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-amber-400">
            Instructor
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            DCI Learning Academy
          </h1>
          <p className="text-sm text-slate-400">
            Enter your instructor code to view the class dashboard.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="instructor-code"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-400"
            >
              Instructor code
            </label>
            <input
              id="instructor-code"
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
              className="w-full rounded-md bg-slate-900 border border-slate-800 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/30 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 disabled:opacity-60"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {errorMessage(error)}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Checking\u2026" : "Enter"}
          </Button>
        </form>

        <p className="text-center text-xs text-slate-500">
          <Link
            to="/"
            className="hover:text-amber-400 underline underline-offset-4"
          >
            Back to student sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
