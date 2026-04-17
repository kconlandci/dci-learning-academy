import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { labCatalog } from "../data/catalog";
import { RENDERERS } from "../engine/renderers";
import LabEngine from "../engine/LabEngine";
import type { GradeResult } from "../engine/LabEngine";
import { useProgress } from "../hooks/useProgress";
import { usePremiumStatus } from "../hooks/usePremiumStatus";
import { useRecommendedLab } from "../hooks/useRecommendedLab";
import { useAuth } from "../contexts/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { useAppReview } from "../hooks/useAppReview";
import { trackLabStarted, trackLabCompleted, trackHintUsed } from "../hooks/useAnalytics";
import { ArrowRight, Lock, PartyPopper } from "lucide-react";

export default function LabScreen() {
  const { labId } = useParams<{ labId: string }>();
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { progress, recordLabCompletion } = useProgress(uid);
  const { isPremium, isLoading: isPremiumLoading } = usePremiumStatus();
  const { maybeRequestReview } = useAppReview();

  const labStartTime = useRef(0);
  const hasTrackedStart = useRef(false);
  const [justCompletedId, setJustCompletedId] = useState<string | null>(null);

  useEffect(() => {
    hasTrackedStart.current = false;
    labStartTime.current = 0;
    setJustCompletedId(null);
  }, [labId]);

  useEffect(() => {
    if (labId && !hasTrackedStart.current) {
      labStartTime.current = Date.now();
      hasTrackedStart.current = true;
      trackLabStarted(labId);
    }
  }, [labId]);

  const manifest = labCatalog.find((l) => l.id === labId);
  const completedLabIds = Object.keys(progress.labs).filter(
    (id) => progress.labs[id]?.completed
  );
  const allCompletedIds =
    justCompletedId && !completedLabIds.includes(justCompletedId)
      ? [...completedLabIds, justCompletedId]
      : completedLabIds;
  const recommendation = useRecommendedLab(labId ?? "", allCompletedIds);

  if (!manifest) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Scenario not found.</p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (manifest.accessLevel === "premium" && isPremiumLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  if (manifest.accessLevel === "premium" && !isPremium) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="text-center">
          <Lock size={32} className="text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-[#1A1A1A] mb-1">Premium Scenario</p>
          <p className="text-xs text-gray-500 mb-4">
            This simulation requires Founders Pack access.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => navigate("/upgrade")}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-medium text-sm min-h-[44px]"
            >
              View Founders Pack
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 rounded-xl bg-[#F5F5F5] text-gray-600 font-medium text-sm min-h-[44px]"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  const Renderer = RENDERERS[manifest.rendererType];

  const handleLabComplete = (score: number, history: GradeResult[]) => {
    recordLabCompletion(
      manifest.id,
      score,
      history.map((h, i) => ({ scenarioIndex: i, grade: h.type }))
    );

    const durationSeconds = Math.round((Date.now() - labStartTime.current) / 1000);
    trackLabCompleted(manifest.id, score, durationSeconds);

    setJustCompletedId(manifest.id);

    const alreadyCounted = progress.labs[manifest.id]?.completed ?? false;
    const totalCompleted =
      Object.values(progress.labs).filter((l) => l.completed).length +
      (alreadyCounted ? 0 : 1);
    maybeRequestReview(totalCompleted);

    // Reset timer for potential retry
    labStartTime.current = Date.now();
    trackLabStarted(manifest.id);
  };

  const handleHintUsed = (scenarioIndex: number) => {
    if (manifest) trackHintUsed(manifest.id, scenarioIndex);
  };

  const renderUpNext = () => {
    if (!recommendation) {
      return (
        <div className="bg-[#F5F5F5] rounded-xl p-4 text-center">
          <PartyPopper size={24} className="text-[#2A7F6F] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#1A1A1A] mb-1">
            You've completed all available scenarios!
          </p>
          <p className="text-xs text-gray-500 mb-3">
            More scenarios coming soon. Keep your streak alive by replaying favorites.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium min-h-[44px]"
          >
            Browse All Scenarios
          </button>
        </div>
      );
    }

    const isRecPremium = recommendation.lab.accessLevel === "premium" && !isPremium;

    return (
      <div className="bg-[#F5F5F5] rounded-xl p-4">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">
          Up Next
        </p>
        <p className="text-sm font-semibold text-[#1A1A1A] mb-0.5">
          {recommendation.lab.title}
        </p>
        <p className="text-xs text-gray-500 mb-3">{recommendation.reason}</p>
        {isRecPremium ? (
          <button
            onClick={() => navigate("/upgrade")}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F5] text-[#2A7F6F] text-sm font-medium min-h-[44px]"
          >
            <Lock size={14} /> Unlock with Premium
          </button>
        ) : (
          <button
            onClick={() => navigate(`/lab/${recommendation.lab.id}`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium min-h-[44px]"
          >
            Start Scenario <ArrowRight size={14} />
          </button>
        )}
      </div>
    );
  };

  return (
    <ErrorBoundary>
      <LabEngine
        manifest={manifest}
        renderer={Renderer}
        onExit={() => navigate("/")}
        onLabComplete={handleLabComplete}
        onHintUsed={handleHintUsed}
        renderAfterResults={renderUpNext}
      />
    </ErrorBoundary>
  );
}
