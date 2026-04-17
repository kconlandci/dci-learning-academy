import { useEffect, useMemo, useState } from "react";
import {
  getAllStudentsProgress,
  LAB_CATALOG,
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

function formatDateTime(ms: number | null): string {
  if (ms === null) return "\u2014";
  return new Date(ms).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
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
function csvEscape(value: string): string {
  // Quote when the value contains a comma, quote, or newline; double any
  // embedded quotes per RFC 4180.
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function buildRosterCsv(rows: StudentRow[]): string {
  const header = [
    "Display Name",
    "Student ID",
    "Joined",
    "Last Activity",
    ...MODULES.map((m) => m.shortName),
  ];
  const lines = [header.map(csvEscape).join(",")];
  for (const row of rows) {
    const cells = [
      row.displayName,
      row.studentId,
      formatDate(row.createdAtMs),
      formatDate(row.lastActivityMs),
      ...MODULES.map(
        (m) => `${row.perModule[m.slug] ?? 0}/${m.labCount}`,
      ),
    ];
    lines.push(cells.map(csvEscape).join(","));
  }
  return lines.join("\r\n");
}

function downloadCsv(filename: string, csv: string): void {
  // Prepend BOM so Excel picks up UTF-8 encoding for non-ASCII display names.
  const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Title lookup keyed by `${moduleSlug}:${labId}` for O(1) render-path access.
 * Falls back to the raw labId if a completion references a lab that's no
 * longer in the catalog (rename / removal between deploys).
 */
const TITLE_BY_KEY: ReadonlyMap<string, string> = new Map(
  LAB_CATALOG.map((e) => [`${e.moduleSlug}:${e.labId}`, e.title]),
);

/** Catalog entries grouped by module slug, order preserved from generation. */
const CATALOG_BY_MODULE: ReadonlyMap<
  string,
  ReadonlyArray<(typeof LAB_CATALOG)[number]>
> = (() => {
  const map = new Map<string, (typeof LAB_CATALOG)[number][]>();
  for (const entry of LAB_CATALOG) {
    const list = map.get(entry.moduleSlug) ?? [];
    list.push(entry);
    map.set(entry.moduleSlug, list);
  }
  return map;
})();

function titleFor(moduleSlug: string, labId: string): string {
  return TITLE_BY_KEY.get(`${moduleSlug}:${labId}`) ?? labId;
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

    // Start from the full catalog so zero-completion labs surface in the
    // bottom-5 "not resonating" signal. Any completion whose labId isn't in
    // the catalog (renamed / removed lab) still gets included as a fallback.
    const catalogEntries = CATALOG_BY_MODULE.get(mod.slug) ?? [];
    const seen = new Set<string>();
    const labs: LabStat[] = [];
    for (const entry of catalogEntries) {
      seen.add(entry.labId);
      labs.push({
        labId: entry.labId,
        title: entry.title,
        count: labCounts.get(entry.labId) ?? 0,
      });
    }
    for (const [labId, count] of labCounts) {
      if (seen.has(labId)) continue;
      labs.push({ labId, title: titleFor(mod.slug, labId), count });
    }

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
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // getAllStudentsProgress() still does 1 + N reads, but the N runs
        // concurrently (Promise.all). Switch to a collectionGroup query if
        // we cross ~500 students or need date-range filtering.
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

  const selectedStudent = useMemo(
    () =>
      selectedStudentId && rows
        ? rows.find((r) => r.studentId === selectedStudentId) ?? null
        : null,
    [selectedStudentId, rows],
  );

  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="bg-[#2A7F6F] text-white">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-teal-100">
              Instructor
            </p>
            <h1 className="text-lg font-semibold tracking-tight">
              Class Dashboard
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-teal-100">
              {sorted
                ? `${sorted.length} student${sorted.length === 1 ? "" : "s"}`
                : ""}
            </p>
            {sorted && sorted.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  downloadCsv(
                    `dci-roster-${todayStamp()}.csv`,
                    buildRosterCsv(sorted),
                  )
                }
                className="text-xs font-medium bg-white/10 hover:bg-white/20 text-white rounded-md px-3 py-1.5 transition-colors"
              >
                Export CSV
              </button>
            )}
          </div>
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
                    onClick={() => setSelectedStudentId(row.studentId)}
                    className={`border-t border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      i % 2 === 1 ? "bg-[#FAFAFA]" : ""
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900 underline decoration-dotted decoration-gray-400 underline-offset-2">
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

      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudentId(null)}
        />
      )}

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
          <dt
            className="text-gray-500 underline decoration-dotted decoration-gray-300 underline-offset-2 cursor-help"
            title="Students with at least one completion in this module (all time)"
          >
            Students active
          </dt>
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
          {labs.map((lab) => {
            const zero = lab.count === 0;
            return (
              <li
                key={lab.labId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span
                  className={`truncate pr-2 ${
                    zero ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  {lab.title}
                </span>
                {zero ? (
                  <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 px-1.5 py-0.5 text-[10px] font-medium tabular-nums">
                    0
                  </span>
                ) : (
                  <span className="shrink-0 text-gray-500 tabular-nums">
                    {lab.count}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

interface TimelineEntry {
  moduleSlug: string;
  moduleShortName: string;
  labId: string;
  labTitle: string;
  completedAtMs: number | null;
}

function buildTimeline(student: StudentRow): TimelineEntry[] {
  const moduleShortNames = new Map(MODULES.map((m) => [m.slug, m.shortName]));
  return student.completions
    .map((c) => ({
      moduleSlug: c.module,
      moduleShortName: moduleShortNames.get(c.module) ?? c.module,
      labId: c.labId,
      labTitle: titleFor(c.module, c.labId),
      completedAtMs: timestampToMs(c.completedAt),
    }))
    .sort((a, b) => (b.completedAtMs ?? 0) - (a.completedAtMs ?? 0));
}

function StudentDetailModal({
  student,
  onClose,
}: {
  student: StudentRow;
  onClose: () => void;
}) {
  const timeline = useMemo(() => buildTimeline(student), [student]);
  const totalCompleted = student.completions.length;
  const shortId = `${student.studentId.slice(0, 8)}\u2026`;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Progress detail for ${student.displayName}`}
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl bg-white rounded-lg shadow-xl my-10"
      >
        <header className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {student.displayName}
            </h2>
            <p
              className="mt-1 text-[11px] font-mono text-gray-400"
              title={student.studentId}
            >
              {shortId}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close student detail"
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none px-2"
          >
            &times;
          </button>
        </header>

        <section className="px-6 py-4 border-b border-gray-200">
          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-gray-500">Joined</dt>
              <dd className="text-gray-900 font-medium">
                {formatDate(student.createdAtMs)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Last activity</dt>
              <dd className="text-gray-900 font-medium">
                {formatDate(student.lastActivityMs)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Labs completed</dt>
              <dd className="text-gray-900 font-medium">{totalCompleted}</dd>
            </div>
          </dl>
        </section>

        <section className="px-6 py-4">
          <h3 className="text-[10px] uppercase tracking-wide text-gray-500 mb-3">
            Completed labs ({timeline.length})
          </h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-gray-400">
              No completions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-gray-200">
              <table className="w-full text-xs">
                <thead className="bg-[#F5F5F5] text-left uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">When</th>
                    <th className="px-3 py-2 font-semibold">Module</th>
                    <th className="px-3 py-2 font-semibold">Lab</th>
                  </tr>
                </thead>
                <tbody>
                  {timeline.map((entry, i) => (
                    <tr
                      key={`${entry.moduleSlug}:${entry.labId}:${i}`}
                      className="border-t border-gray-200"
                    >
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {formatDateTime(entry.completedAtMs)}
                      </td>
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                        {entry.moduleShortName}
                      </td>
                      <td className="px-3 py-2 text-gray-900">
                        {entry.labTitle}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
