import { useEffect, useMemo, useState } from "react";
import {
  getAllStudentsProgress,
  MODULES,
  type LabCompletion,
  type StudentProgress,
} from "@dci/shared";
import { Footer } from "./Footer";

interface InstructorDashboardProps {
  onSignOut: () => void;
}

interface StudentRow {
  studentId: string;
  displayName: string;
  createdAtMs: number | null;
  lastActivityMs: number | null;
  perModule: Record<string, number>;
}

function timestampToMs(
  value: StudentProgress["createdAt"] | LabCompletion["completedAt"] | null,
): number | null {
  if (!value) return null;
  try {
    const date = (value as { toDate?: () => Date }).toDate?.();
    return date ? date.getTime() : null;
  } catch {
    return null;
  }
}

function formatDate(ms: number | null): string {
  if (ms === null) return "\u2014";
  return new Date(ms).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function toRow(student: StudentProgress): StudentRow {
  const perModule: Record<string, number> = {};
  for (const mod of MODULES) perModule[mod.slug] = 0;
  let lastActivityMs: number | null = null;
  for (const completion of student.completions) {
    if (completion.module in perModule) {
      perModule[completion.module] = (perModule[completion.module] ?? 0) + 1;
    }
    const ms = timestampToMs(completion.completedAt);
    if (ms !== null && (lastActivityMs === null || ms > lastActivityMs)) {
      lastActivityMs = ms;
    }
  }
  return {
    studentId: student.studentId,
    displayName: student.displayName,
    createdAtMs: timestampToMs(student.createdAt),
    lastActivityMs,
    perModule,
  };
}

export function InstructorDashboard({ onSignOut }: InstructorDashboardProps) {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getAllStudentsProgress();
        if (cancelled) return;
        setRows(raw.map(toRow));
      } catch (err) {
        console.error("[instructor-dashboard] load failed:", err);
        if (!cancelled) {
          setError("Couldn't load student data. Check your connection and try again.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const sorted = useMemo(() => {
    if (!rows) return null;
    return [...rows].sort((a, b) => {
      // Most recent activity first; students with no activity fall to the
      // bottom, ordered by createdAt desc among themselves.
      const aKey = a.lastActivityMs ?? a.createdAtMs ?? 0;
      const bKey = b.lastActivityMs ?? b.createdAtMs ?? 0;
      return bKey - aKey;
    });
  }, [rows]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-amber-400">
              Instructor
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Class Dashboard
            </h1>
          </div>
          <p className="text-sm text-slate-400">
            {sorted ? `${sorted.length} student${sorted.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 mb-6"
          >
            {error}
          </div>
        )}

        {!sorted && !error && (
          <p className="text-sm text-slate-500">Loading students\u2026</p>
        )}

        {sorted && sorted.length === 0 && !error && (
          <p className="text-sm text-slate-500">
            No students yet. They&rsquo;ll appear here once the first one signs in.
          </p>
        )}

        {sorted && sorted.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Display Name</th>
                  <th className="px-4 py-3 font-semibold">Joined</th>
                  <th className="px-4 py-3 font-semibold">Last Activity</th>
                  {MODULES.map((mod) => (
                    <th
                      key={mod.slug}
                      className="px-4 py-3 font-semibold whitespace-nowrap"
                      title={mod.name}
                    >
                      {mod.name.replace(/^DCI\s+/, "").replace(/\s+Labs$/, "")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.studentId}
                    className="border-t border-slate-800 hover:bg-slate-900/40"
                  >
                    <td className="px-4 py-3 font-medium text-slate-100">
                      {row.displayName}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(row.createdAtMs)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatDate(row.lastActivityMs)}
                    </td>
                    {MODULES.map((mod) => {
                      const done = row.perModule[mod.slug] ?? 0;
                      const zero = done === 0;
                      return (
                        <td
                          key={mod.slug}
                          className={`px-4 py-3 whitespace-nowrap ${
                            zero ? "text-slate-600" : "text-slate-200"
                          }`}
                        >
                          {done}/{mod.labCount}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      <Footer onSignOut={onSignOut} label="Sign out (instructor)" />
    </div>
  );
}
