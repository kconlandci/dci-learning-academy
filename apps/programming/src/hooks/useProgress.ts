import { useCallback, useEffect, useRef, useState } from "react";
import { App as CapApp } from "../capacitor-shim";
import { Preferences } from "../capacitor-shim";
import { z } from "zod/v4";
import { recordLabCompletion as recordToFirestore } from "@dci/shared";
import { getLocalDateString } from "../utils/localDate";

const ScenarioResultSchema = z.object({
  scenarioIndex: z.number().int().min(0),
  grade: z.enum(["perfect", "partial", "wrong"]),
});

const LabProgressSchema = z.object({
  labId: z.string(),
  completed: z.boolean(),
  bestScore: z.number().min(0).default(0),
  attempts: z.number().int().min(0).default(1),
  lastAttemptDate: z.string(),
  completedAt: z.number().default(0),
  scenarioResults: z.array(ScenarioResultSchema).default([]),
});

const XpHistoryEntrySchema = z.object({
  date: z.string(),
  amount: z.number(),
  labId: z.string(),
});

const DciProgrammingProgressSchema = z.object({
  schemaVersion: z.number().int().min(0),
  userId: z.string().nullable().default(null),
  labs: z.record(z.string(), LabProgressSchema).default({}),
  xp: z.number().min(0).default(0),
  xpHistory: z.array(XpHistoryEntrySchema).default([]),
  streakDays: z.number().int().min(0).default(0),
  longestStreak: z.number().int().min(0).default(0),
  lastLabDate: z.string().nullable().default(null),
  judgmentTags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

type ScenarioResult = z.infer<typeof ScenarioResultSchema>;
type LabProgress = z.infer<typeof LabProgressSchema>;
type DciProgrammingProgress = z.infer<typeof DciProgrammingProgressSchema>;

const STORAGE_KEY = "dci-programming_progress";
const PREFS_KEY = "dci-programming_progress";
const CURRENT_SCHEMA_VERSION = 2;

function getToday(): string {
  return getLocalDateString();
}

function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return getLocalDateString(date);
}

function createDefaultProgress(): DciProgrammingProgress {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    userId: null,
    labs: {},
    xp: 0,
    xpHistory: [],
    streakDays: 0,
    longestStreak: 0,
    lastLabDate: null,
    judgmentTags: [],
    createdAt: now,
    updatedAt: now,
  };
}

function validateProgressShape(data: unknown): DciProgrammingProgress | null {
  const result = DciProgrammingProgressSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }

  console.warn("[DCI Programming Labs] Progress validation failed:", result.error.message);
  return null;
}

function migrateProgress(data: DciProgrammingProgress): DciProgrammingProgress {
  const version = data.schemaVersion || 0;

  if (version < 1) {
    for (const labId of Object.keys(data.labs)) {
      if (typeof data.labs[labId]?.completedAt !== "number") {
        data.labs[labId].completedAt = 0;
      }
    }
    data.schemaVersion = 1;
  }

  if (version < 2) {
    data.userId = data.userId ?? null;
    data.schemaVersion = 2;
  }

  return data;
}

function saveProgress(progress: DciProgrammingProgress) {
  progress.updatedAt = new Date().toISOString();

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("[DCI Programming Labs] Failed to save progress:", error);

    try {
      const minimal = {
        ...progress,
        xpHistory: progress.xpHistory.slice(-50),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    } catch {
      console.error("[DCI Programming Labs] Even minimal progress save failed.");
    }
  }
}

function loadProgress(): DciProgrammingProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createDefaultProgress();
    }

    const parsed = JSON.parse(raw);
    const validated = validateProgressShape(parsed);
    if (!validated) {
      console.warn("[DCI Programming Labs] Progress data failed validation. Resetting.");
      return createDefaultProgress();
    }

    const migrated = migrateProgress(validated);
    if ((validated.schemaVersion || 0) < CURRENT_SCHEMA_VERSION) {
      saveProgress(migrated);
    }

    return migrated;
  } catch {
    return createDefaultProgress();
  }
}

function mirrorToPreferences(progress: DciProgrammingProgress) {
  Preferences.set({
    key: PREFS_KEY,
    value: JSON.stringify(progress),
  }).catch((error) => {
    console.warn(
      "[DCI Programming Labs] Failed to mirror progress to Preferences:",
      error
    );
  });
}

async function recoverFromPreferences(
  currentUserId?: string | null
): Promise<DciProgrammingProgress | null> {
  try {
    const { value } = await Preferences.get({ key: PREFS_KEY });
    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value);
    const validated = validateProgressShape(parsed);
    if (!validated) {
      return null;
    }

    // Reject recovered progress if it belongs to a different user
    if (currentUserId && validated.userId && validated.userId !== currentUserId) {
      console.warn(
        "[DCI Programming Labs] UID mismatch during recovery — rejecting stale progress."
      );
      return null;
    }

    const migrated = migrateProgress(validated);
    console.info("[DCI Programming Labs] Recovered progress from Preferences backup.");
    return migrated;
  } catch {
    return null;
  }
}

export function useProgress(userId?: string | null) {
  const [progress, setProgress] = useState<DciProgrammingProgress>(loadProgress);
  const hasAttemptedRecovery = useRef(false);

  useEffect(() => {
    if (hasAttemptedRecovery.current) {
      return;
    }

    hasAttemptedRecovery.current = true;

    const localData = localStorage.getItem(STORAGE_KEY);
    if (!localData) {
      recoverFromPreferences(userId).then((recovered) => {
        if (recovered) {
          saveProgress(recovered);
          setProgress(recovered);
        }
      });
    }
  }, [userId]);

  useEffect(() => {
    const listener = CapApp.addListener("pause", () => {
      const current = loadProgress();
      saveProgress(current);
      mirrorToPreferences(current);
    });

    return () => {
      listener.then((handle) => handle.remove());
    };
  }, []);

  const recordLabCompletion = useCallback(
    (labId: string, score: number, scenarioResults: ScenarioResult[]) => {
      setProgress((previous) => {
        const next = {
          ...previous,
          labs: { ...previous.labs },
        };
        const today = getToday();

        if (userId && !next.userId) {
          next.userId = userId;
        }

        const existing = next.labs[labId];
        next.labs[labId] = {
          labId,
          completed: true,
          bestScore: existing ? Math.max(existing.bestScore, score) : score,
          attempts: existing ? existing.attempts + 1 : 1,
          lastAttemptDate: today,
          completedAt: Date.now(),
          scenarioResults,
        };

        const xpGain = 100 + Math.min(Math.round(score / 2), 50);
        next.xp = (next.xp || 0) + xpGain;
        next.xpHistory = [
          ...(next.xpHistory || []),
          { date: today, amount: xpGain, labId },
        ];

        if (next.lastLabDate === today) {
          // Already counted today.
        } else if (next.lastLabDate === getYesterday()) {
          next.streakDays = (next.streakDays || 0) + 1;
        } else {
          next.streakDays = 1;
        }

        next.lastLabDate = today;
        next.longestStreak = Math.max(
          next.longestStreak || 0,
          next.streakDays || 0
        );

        saveProgress(next);
        mirrorToPreferences(next);

        // ━━━ DCI PHASE B — Mirror completion to Firestore for instructor view ━━━
        // Fire-and-forget: never blocks the local state update.
        // studentId from localStorage, fires on every retake by design.
        const dciStudentId =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("dci:student-id")
            : null;
        if (dciStudentId) {
          recordToFirestore(dciStudentId, "programming", labId).catch(
            (err) => {
              console.warn(
                "[DCI] Failed to record lab completion to Firestore:",
                err,
              );
            },
          );
        } else {
          console.warn(
            "[DCI] Skipped Firestore write — dci:student-id not found in localStorage. " +
            "Student may not have signed in through the portal Gate.",
          );
        }
        // ━━━ END DCI PHASE B ━━━

        return next;
      });
    },
    [userId]
  );

  const getLabProgress = useCallback(
    (labId: string): LabProgress | undefined => progress.labs[labId],
    [progress]
  );

  const isLabCompleted = useCallback(
    (labId: string) => progress.labs[labId]?.completed ?? false,
    [progress]
  );

  const getTotalCompleted = useCallback(
    () => Object.values(progress.labs).filter((lab) => lab.completed).length,
    [progress]
  );

  const resetProgress = useCallback(() => {
    const fresh = createDefaultProgress();
    saveProgress(fresh);
    mirrorToPreferences(fresh);
    setProgress(fresh);
  }, []);

  return {
    progress,
    recordLabCompletion,
    getLabProgress,
    isLabCompleted,
    getTotalCompleted,
    resetProgress,
  };
}

export type { DciProgrammingProgress, LabProgress, ScenarioResult };
