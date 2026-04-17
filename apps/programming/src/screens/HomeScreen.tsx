import { useMemo, useState, type ComponentType } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Flame,
  Globe,
  Lock,
  Play,
  Search,
  Server,
  ShieldCheck,
  Smartphone,
  Workflow,
  Zap,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { labCatalog } from "../data/catalog";
import { learningPaths } from "../data/paths";
import type { LearningPath } from "../data/paths";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { useProgress } from "../hooks/useProgress";
import { useActivePath } from "../hooks/useRecommendedLab";

const ICON_MAP: Record<
  string,
  ComponentType<{ size?: number; className?: string }>
> = {
  ShieldCheck,
  Globe,
  Search,
  Workflow,
  Server,
  Smartphone,
};

const tierOrder = ["beginner", "intermediate", "advanced"];

export default function HomeScreen() {
  const [showAllLabs, setShowAllLabs] = useState(false);
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { progress, getLabProgress, getTotalCompleted, isLabCompleted } =
    useProgress(uid);
  const { isPremium } = usePremiumStatus();

  const publishedLabs = useMemo(
    () => labCatalog.filter((lab) => lab.status === "published"),
    []
  );
  const freeLabs = useMemo(
    () => publishedLabs.filter((lab) => lab.accessLevel === "free"),
    [publishedLabs]
  );
  const premiumLabs = useMemo(
    () => publishedLabs.filter((lab) => lab.accessLevel === "premium"),
    [publishedLabs]
  );

  const completedCount = getTotalCompleted();
  const allFreeComplete =
    freeLabs.length > 0 && freeLabs.every((lab) => isLabCompleted(lab.id));
  const activePath = useActivePath(progress.labs);

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
        <div className="max-w-lg mx-auto pt-6">
          <div className="flex items-center gap-3 mb-4">
            <a href={import.meta.env.BASE_URL.replace(/\/programming\/?$/, "/") || "/"} className="flex items-center gap-3 no-underline text-inherit">
              <img
                src={`${import.meta.env.BASE_URL}logo-wide.png`}
                alt="DCI Secure Development Scenarios"
                className="h-8"
              />
              <div>
                <h1 className="text-xl font-bold text-[#1A1A1A]">
                  DCI Secure Development Scenarios
                </h1>
                <p className="text-xs text-gray-500">AppSec Training</p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-4 mb-6 px-1">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Zap size={12} className="text-[#2A7F6F]" />
              <span className="font-medium">{progress.xp} XP</span>
            </div>
            {progress.streakDays > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Flame size={12} className="text-[#2A7F6F]" />
                <span className="font-medium">
                  {progress.streakDays} day streak
                </span>
              </div>
            )}
            <div className="text-xs text-gray-400">
              {completedCount}/{publishedLabs.length} completed
            </div>
          </div>

          {activePath && (
            <section className="mb-6">
              <div className="bg-[#F5F5F5] rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-[#1A1A1A]">
                    Continue: {activePath.path.name}
                  </h2>
                  <span className="text-[10px] text-gray-500">
                    {activePath.completedCount}/{activePath.path.labIds.length}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-[#2A7F6F] rounded-full transition-all"
                    style={{
                      width: `${
                        (activePath.completedCount / activePath.path.labIds.length) *
                        100
                      }%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    {labCatalog.find((lab) => lab.id === activePath.nextLabId)
                      ?.title ?? "Next scenario"}
                  </span>
                  <button
                    onClick={() => navigate(`/lab/${activePath.nextLabId}`)}
                    aria-label="Continue learning path"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium min-h-[36px] active:bg-amber-600 transition-colors"
                  >
                    <Play size={12} /> Continue
                  </button>
                </div>
              </div>
            </section>
          )}

          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Learning Paths
            </h2>
            <div className="space-y-3">
              {learningPaths.map((path) => (
                <PathCard
                  key={path.id}
                  path={path}
                  isLabCompleted={isLabCompleted}
                  getLabProgress={getLabProgress}
                  isPremium={isPremium}
                />
              ))}
            </div>
          </section>

          {allFreeComplete && !isPremium && (
            <Link
              to="/upgrade"
              className="block bg-[#2A7F6F]/10 border border-[#2A7F6F]/30 rounded-xl p-4 mb-6 active:bg-[#2A7F6F]/20 transition-colors"
            >
              <p className="text-sm text-[#2A7F6F] text-center">
                Ready for more? Unlock the remaining {premiumLabs.length} scenarios
                with DCI Secure Development Scenarios Premium.
              </p>
            </Link>
          )}

          <section className="mb-8">
            <button
              onClick={() => setShowAllLabs(!showAllLabs)}
              className="flex items-center gap-2 w-full mb-3 min-h-[44px]"
            >
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                All Scenarios
              </h2>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  showAllLabs ? "rotate-180" : ""
                }`}
              />
              <span className="text-[10px] text-gray-400 ml-auto">
                {publishedLabs.length} scenarios
              </span>
            </button>
            {showAllLabs && (
              <>
                <h3 className="text-xs text-gray-400 mb-2 px-1">Free</h3>
                <div className="space-y-2 mb-4">
                  {freeLabs.map((lab) => (
                    <LabCard
                      key={lab.id}
                      lab={lab}
                      labProgress={getLabProgress(lab.id)}
                    />
                  ))}
                </div>
                {premiumLabs.length > 0 && (
                  <>
                    <h3 className="text-xs text-gray-400 mb-2 px-1">
                      Premium
                    </h3>
                    <div className="space-y-2">
                      {premiumLabs.map((lab) => (
                        <LabCard
                          key={lab.id}
                          lab={lab}
                          locked={!isPremium}
                          labProgress={getLabProgress(lab.id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      </div>
  );
}

function PathCard({
  path,
  isLabCompleted,
  getLabProgress,
  isPremium,
}: {
  path: LearningPath;
  isLabCompleted: (id: string) => boolean;
  getLabProgress: (id: string) => { completed: boolean; bestScore: number } | undefined;
  isPremium: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const completedCount = path.labIds.filter((id) => isLabCompleted(id)).length;
  const total = path.labIds.length;
  const Icon = ICON_MAP[path.icon] ?? ShieldCheck;

  const difficulties = path.labIds
    .map((id) => labCatalog.find((lab) => lab.id === id)?.tier)
    .filter(
      (value): value is "beginner" | "intermediate" | "advanced" =>
        value !== undefined
    )
    .sort((a, b) => tierOrder.indexOf(a) - tierOrder.indexOf(b));

  const uniqueDifficulties = [...new Set(difficulties)];
  const diffBadge =
    uniqueDifficulties.length > 1
      ? `${uniqueDifficulties[0]} \u2192 ${uniqueDifficulties[uniqueDifficulties.length - 1]}`
      : uniqueDifficulties[0] ?? "";

  return (
    <div className="bg-[#F5F5F5] rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center gap-3 min-h-[56px] active:bg-gray-100 transition-colors text-left"
      >
        <div className="w-10 h-10 rounded-lg bg-[#2A7F6F]/10 flex items-center justify-center shrink-0">
          {Icon ? <Icon size={18} className="text-[#2A7F6F]" /> : <span className="text-sm font-bold text-[#2A7F6F]">{path.title.charAt(0)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-[#1A1A1A] truncate">
            {path.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400 capitalize">
              {diffBadge}
            </span>
            <span className="text-[10px] text-gray-400">
              {completedCount}/{total}
            </span>
          </div>
          <div className="h-1 bg-gray-200 rounded-full overflow-hidden mt-1.5 w-full max-w-[120px]">
            <div
              className="h-full bg-[#2A7F6F] rounded-full transition-all"
              style={{ width: `${total > 0 ? (completedCount / total) * 100 : 0}%` }}
            />
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`text-gray-400 shrink-0 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-1.5">
          <p className="text-xs text-gray-500 mb-2">{path.description}</p>
          {path.labIds.map((labId, index) => {
            const lab = labCatalog.find((item) => item.id === labId);
            if (!lab) return null;

            const progress = getLabProgress(labId);
            const isLocked = lab.accessLevel === "premium" && !isPremium;

            return (
              <Link
                key={labId}
                to={isLocked ? "/upgrade" : `/lab/${labId}`}
                className={`flex items-center gap-2 py-2 px-2 rounded-lg min-h-[44px] ${
                  isLocked ? "opacity-60" : "active:bg-gray-100"
                } transition-colors`}
              >
                <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] text-gray-500 font-bold shrink-0">
                  {progress?.completed ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="text-xs text-[#1A1A1A] flex-1 truncate">
                  {lab.title}
                </span>
                {progress?.completed && (
                  <span className="text-[10px] text-green-400">
                    {progress.bestScore}
                  </span>
                )}
                {isLocked ? (
                  <Lock size={12} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-gray-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LabCardProps {
  lab: (typeof labCatalog)[number];
  locked?: boolean;
  labProgress?: {
    completed: boolean;
    bestScore: number;
  };
}

function LabCard({ lab, locked, labProgress }: LabCardProps) {
  const tierColor =
    lab.tier === "beginner"
      ? "text-green-400 bg-green-500/15"
      : lab.tier === "intermediate"
        ? "text-blue-400 bg-blue-500/15"
        : "text-[#2A7F6F] bg-[#2A7F6F]/15";

  return (
    <Link
      to={locked ? "/upgrade" : `/lab/${lab.id}`}
      className={`block bg-[#F5F5F5] rounded-xl p-3 transition-colors ${
        locked ? "opacity-70 active:opacity-80" : "active:bg-gray-100"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-medium text-[#1A1A1A] truncate">
              {lab.title}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${tierColor}`}
            >
              {lab.tier}
            </span>
            <span className="text-[10px] text-gray-400">
              ~{lab.estimatedMinutes} min
            </span>
            {labProgress?.completed && (
              <span className="flex items-center gap-1 text-[10px] text-green-400">
                <CheckCircle size={10} />
                {labProgress.bestScore}
              </span>
            )}
          </div>
        </div>
        {locked ? (
          <Lock size={14} className="text-gray-400 shrink-0" />
        ) : (
          <ChevronRight size={16} className="text-gray-400 shrink-0" />
        )}
      </div>
    </Link>
  );
}
