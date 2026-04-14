import { useNavigate, Link } from "react-router-dom";
import { ChevronRight, Crown, FileText, Scale, AlertTriangle, Trash2, Mail, Star, BarChart3 } from "lucide-react";
import { useProgress } from "../hooks/useProgress";
import { useAuth } from "../contexts/AuthContext";
import { Dialog } from "../capacitor-shim";

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { uid } = useAuth();
  const { resetProgress } = useProgress(uid);

  const handleResetProgress = async () => {
    let confirmed = false;
    try {
      const { value } = await Dialog.confirm({
        title: "Reset All Progress?",
        message: "This will clear all completed labs, scores, streaks, and XP. This cannot be undone.",
        okButtonTitle: "Reset Everything",
        cancelButtonTitle: "Cancel",
      });
      confirmed = value;
    } catch {
      confirmed = window.confirm("Reset All Progress?\n\nThis will clear all completed labs, scores, streaks, and XP. This cannot be undone.");
    }
    if (confirmed) { resetProgress(); navigate("/"); }
  };

  const handleSendFeedback = () => {
    window.open("mailto:dci-it-support.app@gmail.com?subject=DCI IT Support Labs%20Feedback", "_self");
  };

  return (
    <div className="min-h-screen bg-white p-4 pb-24">
      <div className="max-w-lg mx-auto pt-6">
        <div className="text-center mb-8">
          <img
            src={`${import.meta.env.BASE_URL}logo-mark.png`}
            alt="DCI IT Support Labs"
            className="w-14 h-14 rounded-2xl mx-auto mb-3"
          />
          <h1 className="text-xl font-bold text-[#1A1A1A]">DCI IT Support Labs</h1>
          <p className="text-xs text-gray-500 mt-1">IT Decision Training</p>
          <p className="text-[10px] text-gray-400 mt-1">v0.1.0</p>
          <p className="text-xs text-gray-500 mt-3 max-w-xs mx-auto leading-relaxed">Practice real-world IT troubleshooting judgment through interactive workplace simulations.</p>
        </div>
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Premium</h2>
          <Link to="/upgrade" className="flex items-center justify-between bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors">
            <div className="flex items-center gap-3"><Crown size={18} className="text-sky-400" /><span className="text-sm font-medium text-[#1A1A1A]">DCI IT Support Labs Premium</span></div>
            <ChevronRight size={18} className="text-gray-400" />
          </Link>
        </section>
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Data</h2>
          <div className="space-y-1"><SettingsRow icon={<BarChart3 size={16} />} label="Usage Stats" to="/settings/analytics" /></div>
        </section>
        <section className="mb-6">
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Legal</h2>
          <div className="space-y-1">
            <SettingsRow icon={<FileText size={16} />} label="Privacy Policy" to="/settings/privacy" />
            <SettingsRow icon={<Scale size={16} />} label="Terms of Service" to="/settings/terms" />
            <SettingsRow icon={<AlertTriangle size={16} />} label="Disclaimer" to="/settings/disclaimer" />
          </div>
        </section>
        <section>
          <h2 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Actions</h2>
          <div className="space-y-1">
            <button onClick={handleResetProgress} className="flex items-center gap-3 w-full bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors text-left">
              <Trash2 size={16} className="text-red-400" /><span className="text-sm font-medium text-red-400">Reset Progress</span>
            </button>
            <button onClick={handleSendFeedback} className="flex items-center gap-3 w-full bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors text-left">
              <Mail size={16} className="text-gray-500" /><span className="text-sm font-medium text-[#1A1A1A]">Send Feedback</span>
            </button>
            <button onClick={() => window.open("https://play.google.com/store/apps/details?id=com.dci-it-support.app", "_blank")}
              className="flex items-center gap-3 w-full bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors text-left">
              <Star size={16} className="text-sky-400" /><span className="text-sm font-medium text-[#1A1A1A]">Rate This App</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function SettingsRow({ icon, label, to }: { icon: React.ReactNode; label: string; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between bg-[#F5F5F5] rounded-xl p-4 min-h-[48px] active:bg-gray-200 transition-colors">
      <div className="flex items-center gap-3"><span className="text-gray-500">{icon}</span><span className="text-sm font-medium text-[#1A1A1A]">{label}</span></div>
      <ChevronRight size={18} className="text-gray-400" />
    </Link>
  );
}
