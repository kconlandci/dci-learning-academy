import { MODULES, type DciModule, type Session } from "@dci/shared";
import { Footer } from "./Footer";

interface LandingProps {
  session: Session;
  onSignOut: () => void;
}

export function Landing({ session, onSignOut }: LandingProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800">
        <div className="mx-auto max-w-5xl px-6 py-5 flex items-center justify-between">
          <h1 className="text-lg font-semibold tracking-tight">
            DCI Learning Academy
          </h1>
          <p className="text-sm text-slate-400">
            Signed in as{" "}
            <span className="text-slate-200">{session.displayName}</span>
          </p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
          <p className="mt-1 text-sm text-slate-400">
            Choose a module to start practicing.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <ModuleCard key={mod.slug} module={mod} />
          ))}
        </div>
      </main>

      <Footer onSignOut={onSignOut} />
    </div>
  );
}

function ModuleCard({ module: mod }: { module: DciModule }) {
  if (mod.available) {
    return (
      <a
        href={`${import.meta.env.BASE_URL}${mod.slug}/`}
        className="group block p-6 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/60 hover:bg-slate-900/80 transition-colors"
      >
        <h3 className="text-lg font-semibold text-slate-100 group-hover:text-amber-400 transition-colors">
          {mod.name}
        </h3>
        <p className="mt-2 text-sm text-slate-400">{mod.tagline}</p>
        <p className="mt-4 text-xs text-amber-400/80">
          {mod.labCount} labs &rarr;
        </p>
      </a>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="relative block p-6 rounded-lg bg-slate-900/40 border border-slate-800/60 opacity-60 cursor-not-allowed select-none"
    >
      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-800 rounded-full px-2 py-0.5">
        Coming soon
      </span>
      <h3 className="text-lg font-semibold text-slate-300">{mod.name}</h3>
      <p className="mt-2 text-sm text-slate-500">{mod.tagline}</p>
    </div>
  );
}
