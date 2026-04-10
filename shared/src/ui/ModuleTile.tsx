import type { DciModule } from "../modules";
import { ProgressBar } from "./ProgressBar";

interface ModuleTileProps {
  module: DciModule;
  href: string;
  completed?: number;
  total?: number;
}

export function ModuleTile({ module, href, completed, total }: ModuleTileProps) {
  const showProgress = typeof completed === "number" && typeof total === "number";
  return (
    <a
      href={href}
      className="group block p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-colors"
    >
      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
        {module.name}
      </h3>
      <p className="mt-2 text-sm text-slate-400">{module.tagline}</p>
      {showProgress && (
        <div className="mt-4">
          <ProgressBar value={completed} max={total} label="Progress" />
        </div>
      )}
    </a>
  );
}
