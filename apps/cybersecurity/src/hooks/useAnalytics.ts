// Stubbed by scripts/rebrand.ts — analytics removed for DCI classroom build.
// Keeps the same exports so consumers don't need edits.

interface LabsPerDayBucket {
  date: string;
  count: number;
}

interface TopLab {
  labId: string;
  count: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  labsPerDay: LabsPerDayBucket[];
  topLabs: TopLab[];
}

export function trackAppOpened(): void {}
export function trackSessionEnd(): void {}
export function trackAppResumed(): void {}
export function trackLabStarted(_labId: string): void {}
export function trackLabCompleted(
  _labId: string,
  _score: number,
  _durationSeconds: number,
): void {}
export function trackHintUsed(_labId: string, _scenarioIndex: number): void {}
export function trackPathStarted(_pathId: string): void {}

export function getAnalyticsSummary(): AnalyticsSummary {
  // Build 14 empty day buckets ending today so the chart still renders.
  const days: LabsPerDayBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    totalSessions: 0,
    avgSessionSeconds: 0,
    labsStarted: 0,
    labsCompleted: 0,
    completionRate: 0,
    avgScore: 0,
    labsPerDay: days,
    topLabs: [],
  };
}

export function clearAnalytics(): void {
  // no-op
}

export function useAnalytics() {
  return {
    trackAppOpened,
    trackSessionEnd,
    trackAppResumed,
    trackLabStarted,
    trackLabCompleted,
    trackHintUsed,
    trackPathStarted,
  };
}
