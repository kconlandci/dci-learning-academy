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
    <main className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <header className="text-center space-y-4">
          <img
            src={`${import.meta.env.BASE_URL}logo-wide.png.png`}
            alt="DCI Learning Academy"
            className="mx-auto h-14 w-auto"
          />
          <p className="text-xs uppercase tracking-widest text-[#2A7F6F] font-semibold">
            Instructor
          </p>
          <p className="text-sm text-gray-500">
            Enter your instructor code to view the class dashboard.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="instructor-code"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
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
              className="w-full rounded-md bg-white border border-gray-300 focus:border-[#2A7F6F] focus:outline-none focus:ring-2 focus:ring-[#2A7F6F]/30 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600"
            >
              {errorMessage(error)}
            </div>
          )}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? "Checking\u2026" : "Enter"}
          </Button>
        </form>

        <p className="text-center text-xs text-gray-500">
          <Link
            to="/"
            className="hover:text-[#2A7F6F] underline underline-offset-4 transition-colors"
          >
            Back to student sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
