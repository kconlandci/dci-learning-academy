// ============================================================
// DCI IT Support Labs — Onboarding Overlay
// ============================================================

import { useState } from "react";
import { Eye, Hand, CheckCircle, Cpu } from "lucide-react";

const ONBOARDING_KEY = "dci-it-support_onboarding_complete";

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
    title: "Welcome to DCI IT Support Labs",
    body: "Practice real IT troubleshooting judgment in short, interactive scenarios.",
    icon: (
      <div className="w-20 h-20 rounded-2xl bg-sky-500/20 flex items-center justify-center mb-4">
        <Cpu className="text-sky-400" size={40} />
      </div>
    ),
  },
  {
    title: "How It Works",
    body: "Read the scenario. Make your call. Get instant expert feedback.",
    icon: (
      <div className="flex items-center gap-4 mb-4">
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <Eye className="text-gray-500" size={24} />
        </div>
        <div className="text-gray-400 text-lg">→</div>
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <Hand className="text-sky-400" size={24} />
        </div>
        <div className="text-gray-400 text-lg">→</div>
        <div className="w-14 h-14 rounded-xl bg-[#F5F5F5] flex items-center justify-center">
          <CheckCircle className="text-green-400" size={24} />
        </div>
      </div>
    ),
  },
  {
    title: "Start Your First Lab",
    body: "DCI IT Support Labs is for educational purposes only. Scenarios are simulated and designed to build IT troubleshooting judgment. Begin with a free beginner lab — no account needed.",
    icon: null,
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
        <button onClick={finish} className="absolute top-4 right-4 text-xs text-gray-400 min-h-[48px] min-w-[48px] flex items-center justify-center">Skip</button>
      )}
      <div className="flex flex-col items-center text-center max-w-sm">
        {screen.icon}
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">{screen.title}</h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">{screen.body}</p>
      </div>
      {screen.requiresConsent && (
        <label className="flex items-center gap-3 mb-4 max-w-xs cursor-pointer">
          <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} className="w-5 h-5 rounded accent-sky-500 shrink-0" />
          <span className="text-xs text-gray-500 text-left">I understand this app is for educational purposes only</span>
        </label>
      )}
      <div className="flex gap-2 mb-6">
        {screens.map((_, i) => (
          <div key={i} className={`w-2 h-2 rounded-full transition-colors ${i === page ? "bg-sky-400" : "bg-gray-200"}`} />
        ))}
      </div>
      {screen.isFinal ? (
        <button onClick={finish} disabled={screen.requiresConsent && !consentChecked}
          className={`w-full max-w-xs py-4 rounded-xl font-semibold text-base transition-colors min-h-[48px] ${
            screen.requiresConsent && !consentChecked ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-sky-500 hover:bg-sky-600 text-[#1A1A1A]"
          }`}
        >Let's Go</button>
      ) : (
        <button onClick={() => setPage((p) => p + 1)} className="w-full max-w-xs py-4 rounded-xl bg-[#F5F5F5] hover:bg-gray-200 text-[#1A1A1A] font-semibold text-base transition-colors min-h-[48px]">Next</button>
      )}
    </div>
  );
}
