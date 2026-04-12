import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { navigateBack } from "../utils/navigation";

interface LegalTextViewerProps {
  title: string;
  content: string;
}

export default function LegalTextViewer({
  title,
  content,
}: LegalTextViewerProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button
            onClick={() => navigateBack(navigate)}
            aria-label="Go back"
            className="min-w-[48px] min-h-[48px] flex items-center justify-center -ml-2"
          >
            <ArrowLeft size={20} className="text-gray-500" />
          </button>
          <h1 className="text-sm font-semibold text-[#1A1A1A] truncate">{title}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 pb-12">
        <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </div>
    </div>
  );
}
