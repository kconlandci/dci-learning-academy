import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  computeStudentId,
  ensureStudentDoc,
  normalizeAccessCode,
  saveInstructorSession,
  saveSession,
  validateAccessCode,
  validateInstructorCode,
  type Session,
} from "@dci/shared";
import { Button } from "@dci/shared/ui";

interface GateProps {
  onAuthed: (session: Session) => void;
}

type GateError =
  | { kind: "empty-code" }
  | { kind: "empty-name" }
  | { kind: "bad-code" }
  | { kind: "network" };

function errorMessage(err: GateError): string {
  switch (err.kind) {
    case "empty-code":
      return "Please enter your access code.";
    case "empty-name":
      return "Please enter your first and last name.";
    case "bad-code":
      return "That access code doesn't match. Check with your instructor.";
    case "network":
      return "Couldn't reach the server. Check your connection and try again.";
  }
}

export function Gate({ onAuthed }: GateProps) {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<GateError | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedCode = accessCode.trim();
    const trimmedName = displayName.trim();
    if (!trimmedCode) {
      setError({ kind: "empty-code" });
      return;
    }
    if (!trimmedName) {
      setError({ kind: "empty-name" });
      return;
    }

    setBusy(true);
    try {
      const codeOk = await validateAccessCode(trimmedCode);
      if (!codeOk) {
        // Not a student code — check if it's the instructor code.
        // If it matches, save the instructor session and redirect
        // to /instructor so the dashboard loads without a second prompt.
        const isInstructor = await validateInstructorCode(trimmedCode);
        if (isInstructor) {
          saveInstructorSession();
          navigate("/instructor", { replace: true });
          return;
        }

        setError({ kind: "bad-code" });
        return;
      }

      const normalizedCode = normalizeAccessCode(trimmedCode);
      const studentId = await computeStudentId(trimmedCode, trimmedName);
      await ensureStudentDoc(studentId, trimmedName);

      const session: Session = {
        accessCode: normalizedCode,
        displayName: trimmedName,
        studentId,
      };
      saveSession(session);
      onAuthed(session);
    } catch (err) {
      console.error("[gate] sign-in failed:", err);
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
            src={`${import.meta.env.BASE_URL}logo-wide.png`}
            alt="DCI Learning Academy"
            className="mx-auto h-14 w-auto"
          />
          <p className="text-sm text-gray-500">
            Sign in with your class access code.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="access-code"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              Access code
            </label>
            <input
              id="access-code"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              disabled={busy}
              className="w-full rounded-md bg-white border border-gray-300 focus:border-[#2A7F6F] focus:outline-none focus:ring-2 focus:ring-[#2A7F6F]/30 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 disabled:opacity-60"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="display-name"
              className="block text-xs font-semibold uppercase tracking-wide text-gray-600"
            >
              First name, last name
            </label>
            <input
              id="display-name"
              type="text"
              autoComplete="off"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              disabled={busy}
              className="w-full rounded-md bg-white border border-gray-300 focus:border-[#2A7F6F] focus:outline-none focus:ring-2 focus:ring-[#2A7F6F]/30 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 disabled:opacity-60"
            />
            <p className="text-[11px] text-gray-500">
              Enter your full name as it appears on your class roster.
            </p>
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
            {busy ? "Signing in\u2026" : "Enter"}
          </Button>
        </form>
      </div>
    </main>
  );
}
