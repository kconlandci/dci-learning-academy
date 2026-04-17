// ============================================================
// DCI Networking Labs — Usage Stats Screen
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Clock, Target, Trophy, Trash2 } from "lucide-react";
import { getAnalyticsSummary, clearAnalytics } from "../hooks/useAnalytics";
import { labCatalog } from "../data/catalog";
import { Dialog } from "../capacitor-shim";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function getLabTitle(labId: string): string {
  return labCatalog.find((l) => l.id === labId)?.title ?? labId;
}

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.state?.idx > 0) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

export default function AnalyticsScreen() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(() => getAnalyticsSummary());

  const maxPerDay = Math.max(...summary.labsPerDay.map((d) => d.count), 1);

  const handleClear = async () => {
    try {
      const { value } = await Dialog.confirm({
        title: "Clear Analytics?",
        message: "This will delete all usage tracking data. This cannot be undone.",
        okButtonTitle: "Clear Data",
        cancelButtonTitle: "Cancel",
      });
      if (value) {
        clearAnalytics();
        setSummary(getAnalyticsSummary());
      }
    } catch {
      const confirmed = window.confirm("Clear all analytics data? This cannot be undone.");
      if (confirmed) {
        clearAnalytics();
        setSummary(getAnalyticsSummary());
      }
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => goBack(navigate)}
            aria-label="Go back"
            className="w-10 h-10 rounded-xl bg-[#F5F5F5] flex items-center justify-center active:bg-gray-200 transition-colors"
          >
            <ArrowLeft size={18} className="text-gray-500" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1A1A1A]">Usage Stats</h1>
            <p className="text-xs text-gray-500">Local analytics data</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard
            icon={<BarChart3 size={16} className="text-blue-400" />}
            label="Sessions"
            value={String(summary.totalSessions)}
          />
          <StatCard
            icon={<Clock size={16} className="text-purple-400" />}
            label="Avg Session"
            value={formatDuration(summary.avgSessionSeconds)}
          />
          <StatCard
            icon={<Trophy size={16} className="text-[#2A7F6F]" />}
            label="Avg Score"
            value={summary.labsCompleted > 0 ? `${summary.avgScore}/100` : "\u2014"}
          />
          <StatCard
            icon={<Target size={16} className="text-green-400" />}
            label="Completion Rate"
            value={summary.labsStarted > 0 ? `${summary.completionRate}%` : "\u2014"}
          />
        </div>

        <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Scenario Funnel
          </h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <div className="text-2xl font-bold text-[#1A1A1A]">{summary.labsStarted}</div>
              <div className="text-xs text-gray-500">Started</div>
            </div>
            <div className="text-gray-500 text-lg">&rarr;</div>
            <div className="flex-1">
              <div className="text-2xl font-bold text-green-400">{summary.labsCompleted}</div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
          </div>
        </div>

        <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Scenarios Completed (Last 14 Days)
          </h2>
          <div className="flex items-end gap-1" style={{ height: 100 }}>
            {summary.labsPerDay.map((day) => {
              const height = day.count > 0 ? Math.max((day.count / maxPerDay) * 100, 4) : 2;
              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center justify-end"
                  style={{ height: "100%" }}
                >
                  <div
                    className={`w-full rounded-t ${
                      day.count > 0 ? "bg-[#2A7F6F]" : "bg-gray-200"
                    }`}
                    style={{ height: `${height}%`, minWidth: 4 }}
                    title={`${day.date}: ${day.count} scenarios`}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-gray-500">
              {summary.labsPerDay[0]?.date.slice(5)}
            </span>
            <span className="text-[9px] text-gray-500">
              {summary.labsPerDay[summary.labsPerDay.length - 1]?.date.slice(5)}
            </span>
          </div>
        </div>

        {summary.topLabs.length > 0 && (
          <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Most Played Scenarios
            </h2>
            <div className="space-y-2">
              {summary.topLabs.map((lab, i) => (
                <div key={lab.labId} className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-xs text-[#1A1A1A] flex-1 truncate">
                    {getLabTitle(lab.labId)}
                  </span>
                  <span className="text-xs text-gray-500">{lab.count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleClear}
          className="flex items-center gap-3 w-full bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors text-left"
        >
          <Trash2 size={16} className="text-red-400" />
          <span className="text-sm font-medium text-red-400">Clear Analytics Data</span>
        </button>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[#F5F5F5] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">{icon}</div>
      <div className="text-lg font-bold text-[#1A1A1A]">{value}</div>
      <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
    </div>
  );
}
