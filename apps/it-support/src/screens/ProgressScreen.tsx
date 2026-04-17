import { useMemo } from "react";
import { Flame, Zap, Trophy, Cpu } from "lucide-react";
import { labCatalog } from "../data/catalog";
import { useProgress } from "../hooks/useProgress";
import { useAuth } from "../contexts/AuthContext";

export default function ProgressScreen() {
  const { uid } = useAuth();
  const { progress, getTotalCompleted } = useProgress(uid);
  const completedCount = getTotalCompleted();
  const totalLabs = useMemo(() => labCatalog.filter((l) => l.status === "published").length, []);
  const pct = totalLabs > 0 ? Math.round((completedCount / totalLabs) * 100) : 0;
  const level = Math.max(1, Math.floor(progress.xp / 200) + 1);
  const completedLabs = useMemo(() => Object.values(progress.labs).filter((l) => l.completed), [progress.labs]);

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <h1 className="text-xl font-bold text-[#1A1A1A] mb-6">Progress</h1>
        <div className="bg-[#F5F5F5] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2"><Zap size={18} className="text-sky-400" /><span className="text-sm font-semibold text-[#1A1A1A]">Level {level}</span></div>
            <span className="text-sm text-sky-400 font-bold">{progress.xp} XP</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${(progress.xp % 200) / 2}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{200 - (progress.xp % 200)} XP to next level</p>
        </div>
        <div className="flex gap-3 mb-4">
          <div className="flex-1 bg-[#F5F5F5] rounded-xl p-4 text-center">
            <Flame size={20} className="text-sky-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#1A1A1A]">{progress.streakDays}</div>
            <div className="text-[10px] text-gray-400 uppercase">Day Streak</div>
          </div>
          <div className="flex-1 bg-[#F5F5F5] rounded-xl p-4 text-center">
            <Trophy size={20} className="text-yellow-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-[#1A1A1A]">{progress.longestStreak}</div>
            <div className="text-[10px] text-gray-400 uppercase">Best Streak</div>
          </div>
        </div>
        <div className="bg-[#F5F5F5] rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Catalog Progress</span>
            <span className="text-sm font-bold text-[#1A1A1A]">{completedCount}/{totalLabs}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[10px] text-gray-400 mt-1">{pct}% complete</p>
        </div>
        {completedLabs.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Completed Scenarios</h2>
            <div className="space-y-2">
              {completedLabs.map((lp) => {
                const manifest = labCatalog.find((l) => l.id === lp.labId);
                return (
                  <div key={lp.labId} className="bg-[#F5F5F5] rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu size={14} className="text-green-400" />
                      <span className="text-sm text-[#1A1A1A]">{manifest?.title ?? lp.labId}</span>
                    </div>
                    <span className="text-sm font-bold text-green-400">{lp.bestScore}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {completedLabs.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Complete a scenario to see your progress here.</p>
        )}
      </div>
    </div>
  );
}
