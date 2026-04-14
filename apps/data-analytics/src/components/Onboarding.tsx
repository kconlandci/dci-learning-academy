import { useState } from "react";
import { BarChart3, CheckCircle, Database, Workflow } from "lucide-react";

const ONBOARDING_KEY = "dci-data-analytics_onboarding_complete";

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

interface OnboardingProps {
  onComplete: () => void;
}

interface OnboardingScreen {
  title: string;
  body: string;
  icon: React.ReactNode;
  isFinal?: boolean;
  requiresConsent?: boolean;
}

const screens: OnboardingScreen[] = [
  {
    title: "Welcome to DCI Data Analytics Labs",
    body: "Practice SQL, analytics, and pipeline decisions in quick scenario-based labs.",
    icon: (
      <div className="mb-4 w-20 h-20 rounded-3xl bg-amber-500/15 border border-amber-400/20 flex items-center justify-center">
        <Database className="text-amber-600" size={36} />
      </div>
    ),
  },
  {
    title: "How It Works",
    body: "Read the situation, choose the best move, and learn from instant feedback designed for real data work.",
    icon: (
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <Database className="text-gray-500" size={24} />
        </div>
        <div className="text-gray-400 text-lg">{'->'}</div>
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <Workflow className="text-amber-600" size={24} />
        </div>
        <div className="text-gray-400 text-lg">{'->'}</div>
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <BarChart3 className="text-green-400" size={24} />
        </div>
      </div>
    ),
  },
  {
    title: "Start Your First Lab",
    body: "DCI Data Analytics Labs is for education and skills practice. Begin with a free lab, build confidence, and unlock deeper SQL and analytics drills as you go.",
    icon: (
      <div className="mb-4">
        <CheckCircle className="text-amber-600 mx-auto" size={40} />
      </div>
    ),
    isFinal: true,
    requiresConsent: true,
  },
];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [page, setPage] = useState(0);
  const [consentChecked, setConsentChecked] = useState(false);

  const finish = () => {
    markOnboardingComplete();
    onComplete();
  };

  const screen = screens[page];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6">
      {!screen.requiresConsent && (
        <button
          onClick={finish}
          className="absolute top-4 right-4 text-xs text-gray-400 min-h-[48px] min-w-[48px] flex items-center justify-center"
        >
          Skip
        </button>
      )}

      <div className="flex flex-col items-center text-center max-w-sm">
        {screen.icon}
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">{screen.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          {screen.body}
        </p>
      </div>

      {screen.requiresConsent && (
        <label className="flex items-center gap-3 mb-4 max-w-xs cursor-pointer">
          <input
            type="checkbox"
            checked={consentChecked}
            onChange={(event) => setConsentChecked(event.target.checked)}
            className="w-5 h-5 rounded accent-amber-500 shrink-0"
          />
          <span className="text-xs text-gray-500 text-left">
            I understand this app is for educational practice and simulated
            decision-making.
          </span>
        </label>
      )}

      <div className="flex gap-2 mb-6">
        {screens.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === page ? "bg-amber-400" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {screen.isFinal ? (
        <button
          onClick={finish}
          disabled={screen.requiresConsent && !consentChecked}
          className={`w-full max-w-xs py-4 rounded-xl font-semibold text-base transition-colors min-h-[48px] ${
            screen.requiresConsent && !consentChecked
              ? "bg-gray-200 text-gray-400 cursor-not-allowed"
              : "bg-amber-500 hover:bg-amber-600 text-[#1A1A1A]"
          }`}
        >
          Start Training
        </button>
      ) : (
        <button
          onClick={() => setPage((current) => current + 1)}
          className="w-full max-w-xs py-4 rounded-xl bg-[#F5F5F5] hover:bg-gray-200 text-[#1A1A1A] font-semibold text-base transition-colors min-h-[48px]"
        >
          Next
        </button>
      )}
    </div>
  );
}
