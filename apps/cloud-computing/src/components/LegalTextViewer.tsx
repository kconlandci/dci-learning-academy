import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

function goBack(navigate: ReturnType<typeof useNavigate>) {
  if (window.history.state?.idx > 0) {
    navigate(-1);
  } else {
    navigate("/");
  }
}

interface LegalTextViewerProps {
  title: string;
  content: string;
}

export default function LegalTextViewer({ title, content }: LegalTextViewerProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => goBack(navigate)}
            aria-label="Go back"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <h1 className="text-sm font-semibold text-[#1A1A1A] truncate">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 pb-12">
        <div className="text-sm text-gray-500 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  );
}
