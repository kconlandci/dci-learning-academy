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
  completions: LabCompletion[];
}

interface LabStat {
  labId: string;
  title: string;
  count: number;
}

interface ModuleStats {
  slug: string;
  name: string;
  shortName: string;
  labCount: number;
  studentsTouched: number;
  avgCompletionPct: number;
  top5: LabStat[];
  bottom5: LabStat[];
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

/**
 * Best-effort lab title from a slug-style labId.
 *
 * The portal doesn't import any module's labCatalog (cross-app boundary),
 * so instructor surfaces that need lab titles slug-titleize the labId.
 * For "phishing-email-triage" that yields "Phishing Email Triage" — good
 * enough for a pilot readout.
 */
function slugToTitle(labId: string): string {
  return labId
    .split(/[-_]/g)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
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
    completions: student.completions,
  };
}

function computeModuleStats(rows: StudentRow[]): ModuleStats[] {
  return MODULES.map((mod) => {
    const touched = rows.filter((r) => (r.perModule[mod.slug] ?? 0) > 0);
    const avgCompletionPct =
      touched.length === 0
        ? 0
        : touched.reduce(
            (sum, r) =>
              sum + ((r.perModule[mod.slug] ?? 0) / mod.labCount) * 100,
            0,
          ) / touched.length;

    // Aggregate labId -> completion count across all students in this module.
    const labCounts = new Map<string, number>();
    for (const r of rows) {
      for (const c of r.completions) {
        if (c.module !== mod.slug) continue;
        labCounts.set(c.labId, (labCounts.get(c.labId) ?? 0) + 1);
      }
    }
    const labs: LabStat[] = [...labCounts.entries()].map(([labId, count]) => ({
      labId,
      title: slugToTitle(labId),
      count,
    }));
    // Stable title tiebreaker keeps the list deterministic turn-to-turn.
    const sortedDesc = [...labs].sort(
      (a, b) => b.count - a.count || a.title.localeCompare(b.title),
    );
    const sortedAsc = [...labs].sort(
      (a, b) => a.count - b.count || a.title.localeCompare(b.title),
    );

    return {
      slug: mod.slug,
      name: mod.name,
      shortName: mod.shortName,
      labCount: mod.labCount,
      studentsTouched: touched.length,
      avgCompletionPct,
      top5: sortedDesc.slice(0, 5),
      bottom5: sortedAsc.slice(0, 5),
    };
  });
}

export function InstructorDashboard({ onSignOut }: InstructorDashboardProps) {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overviewOpen, setOverviewOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // NOTE: getAllStudentsProgress() is N+1 (one getDocs per student).
        // Fine at pilot scale (~30 students); revisit when we cross ~100.
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

  const moduleStats = useMemo(
    () => (rows ? computeModuleStats(rows) : null),
    [rows],
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="bg-[#2A7F6F] text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-100">
              Instructor
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Class Dashboard
            </h1>
          </div>
          <p className="text-sm text-teal-100">
            {sorted ? `${sorted.length} student${sorted.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-10">
        {error && (
          <div
            role="alert"
            className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600 mb-6"
          >
            {error}
          </div>
        )}

        {!sorted && !error && (
          <p className="text-sm text-gray-500">Loading students\u2026</p>
        )}

        {sorted && sorted.length === 0 && !error && (
          <p className="text-sm text-gray-500">
            No students yet. They&rsquo;ll appear here once the first one signs in.
          </p>
        )}

        {moduleStats && sorted && sorted.length > 0 && (
          <section className="mb-8">
            <button
              type="button"
              onClick={() => setOverviewOpen((v) => !v)}
              className="flex items-center gap-2 w-full text-left mb-3"
              aria-expanded={overviewOpen}
            >
              <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Module overview
              </h2>
              <span
                className={`text-gray-400 transition-transform ${
                  overviewOpen ? "rotate-90" : ""
                }`}
                aria-hidden="true"
              >
                &rsaquo;
              </span>
            </button>
            {overviewOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {moduleStats.map((stat) => (
                  <ModuleCard key={stat.slug} stat={stat} />
                ))}
              </div>
            )}
          </section>
        )}

        {sorted && sorted.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-[#F5F5F5] text-left text-xs uppercase tracking-wide text-gray-600">
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
                      {mod.shortName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr
                    key={row.studentId}
                    className={`border-t border-gray-200 hover:bg-gray-50 ${
                      i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {row.displayName}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(row.createdAtMs)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDate(row.lastActivityMs)}
                    </td>
                    {MODULES.map((mod) => {
                      const done = row.perModule[mod.slug] ?? 0;
                      const zero = done === 0;
                      return (
                        <td
                          key={mod.slug}
                          className={`px-4 py-3 whitespace-nowrap ${
                            zero ? "text-gray-400" : "text-gray-900"
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

function ModuleCard({ stat }: { stat: ModuleStats }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-[#FAFAFA] p-4">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">{stat.shortName}</h3>
        <span className="text-[10px] text-gray-400">{stat.labCount} labs</span>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-xs mb-3">
        <div>
          <dt className="text-gray-500">Students active</dt>
          <dd className="text-gray-900 font-medium">{stat.studentsTouched}</dd>
        </div>
        <div>
          <dt className="text-gray-500">Avg completion</dt>
          <dd className="text-gray-900 font-medium">
            {stat.avgCompletionPct.toFixed(1)}%
          </dd>
        </div>
      </dl>

      <LabList title="Top 5 completed" labs={stat.top5} emptyHint="No completions yet" />
      {stat.bottom5.length > 0 && (
        <LabList title="Bottom 5 (with activity)" labs={stat.bottom5} />
      )}
    </div>
  );
}

function LabList({
  title,
  labs,
  emptyHint,
}: {
  title: string;
  labs: LabStat[];
  emptyHint?: string;
}) {
  return (
    <div className="mt-2">
      <p className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">
        {title}
      </p>
      {labs.length === 0 ? (
        <p className="text-xs text-gray-400">{emptyHint ?? "\u2014"}</p>
      ) : (
        <ul className="space-y-0.5">
          {labs.map((lab) => (
            <li
              key={lab.labId}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-gray-700 truncate pr-2">{lab.title}</span>
              <span className="text-gray-500 tabular-nums">{lab.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
