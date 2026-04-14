// ============================================================
// Renderer: Toggle / Config
// ============================================================

import { useState } from "react";
import { CheckCircle, XCircle } from "lucide-react";
import type { RendererProps } from "../LabEngine";
import type { ToggleConfigScenario } from "../../types/manifest";

export default function ToggleConfigRenderer({ scenario, onSubmit, phase, feedbackResult }: RendererProps) {
  const s = scenario as ToggleConfigScenario;
  const [itemStates, setItemStates] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const item of s.items) init[item.id] = item.currentState;
    return init;
  });

  const isLocked = phase === "feedback";

  const cycleState = (itemId: string, states: string[]) => {
    if (isLocked) return;
    setItemStates((prev) => {
      const current = prev[itemId];
      const idx = states.indexOf(current);
      const next = states[(idx + 1) % states.length];
      return { ...prev, [itemId]: next };
    });
  };

  const handleSubmit = () => {
    let correctCount = 0;
    for (const item of s.items) {
      if (itemStates[item.id] === item.correctState) correctCount++;
    }
    const total = s.items.length;
    if (correctCount === total) {
      onSubmit({ type: "perfect", penalty: 0, message: s.feedback.perfect });
    } else if (correctCount >= Math.ceil(total / 2)) {
      onSubmit({ type: "partial", penalty: 10, message: s.feedback.partial });
    } else {
      onSubmit({ type: "wrong", penalty: 20, message: s.feedback.wrong });
    }
  };

  const rationaleMap = new Map(s.rationales.map((r) => [r.id, r.text]));

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-[#1A1A1A]">{s.title}</h2>
      <div className="bg-[#F5F5F5] rounded-xl p-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-500">Target System</span>
          <span className="text-sky-300 font-mono">{s.targetSystem}</span>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{s.description}</p>
      </div>
      <div className="space-y-3">
        {s.items.map((item) => {
          const currentVal = itemStates[item.id];
          const isCorrect = currentVal === item.correctState;
          const showResult = phase === "feedback";
          return (
            <div key={item.id} className={`rounded-xl border-2 p-4 transition-all ${
              showResult ? isCorrect ? "border-green-500/40 bg-green-500/5" : "border-red-500/40 bg-red-500/5" : "border-gray-200 bg-[#F5F5F5]"
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-[#1A1A1A]">{item.label}</span>
                <button onClick={() => cycleState(item.id, item.states)} disabled={isLocked}
                  className={`min-w-[88px] min-h-[44px] px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                    currentVal === item.states[0] ? "bg-yellow-500/20 border border-yellow-500/50 text-yellow-600" : "bg-gray-200 border border-gray-300 text-gray-500"
                  } ${isLocked ? "opacity-70 cursor-default" : "cursor-pointer active:scale-95"}`}
                >{currentVal}</button>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">{item.detail}</p>
              {showResult && (
                <div className="mt-2 flex items-start gap-2">
                  {isCorrect ? <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />}
                  <span className="text-xs text-gray-500">
                    {isCorrect ? rationaleMap.get(item.rationaleId) ?? "Correct." : `Should be ${item.correctState}. ${rationaleMap.get(item.rationaleId) ?? ""}`}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {phase === "active" && (
        <button onClick={handleSubmit} className="w-full py-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-[#1A1A1A] font-semibold transition-colors">
          Submit Configuration
        </button>
      )}
      {phase === "feedback" && feedbackResult && (
        <div className={`rounded-xl p-4 border-2 ${
          feedbackResult.type === "perfect" ? "bg-green-500/10 border-green-500/40" :
          feedbackResult.type === "partial" ? "bg-yellow-500/10 border-yellow-500/40" :
          "bg-red-500/10 border-red-500/40"
        }`}>
          <div className="flex items-center gap-2 mb-2">
            {feedbackResult.type === "perfect" ? <CheckCircle size={18} className="text-green-400" /> :
             feedbackResult.type === "partial" ? <CheckCircle size={18} className="text-yellow-600" /> :
             <XCircle size={18} className="text-red-400" />}
            <span className={`text-sm font-semibold capitalize ${
              feedbackResult.type === "perfect" ? "text-green-400" : feedbackResult.type === "partial" ? "text-yellow-600" : "text-red-400"
            }`}>
              {feedbackResult.type === "perfect" ? "Correct!" : feedbackResult.type === "partial" ? "Partially Correct" : "Incorrect"}
            </span>
          </div>
          <p className="text-sm text-gray-500">{feedbackResult.message}</p>
        </div>
      )}
    </div>
  );
}
