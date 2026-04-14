import { MODULES, type DciModule, type Session } from "@dci/shared";
import { Footer } from "./Footer";

interface LandingProps {
  session: Session;
  onSignOut: () => void;
}

export function Landing({ session, onSignOut }: LandingProps) {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col">
      <header className="border-b border-gray-200">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
          <img
            src={`${import.meta.env.BASE_URL}logo-wide.png`}
            alt="DCI Learning Academy"
            className="h-9 w-auto"
          />
          <p className="text-sm text-gray-500">
            Signed in as{" "}
            <span className="text-gray-900 font-medium">{session.displayName}</span>
          </p>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-5xl w-full px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
          <p className="mt-1 text-sm text-gray-500">
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
        className="group block p-6 rounded-lg bg-[#F5F5F5] border border-gray-200 hover:border-[#2A7F6F] hover:shadow-md transition-all"
      >
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#2A7F6F] transition-colors">
          {mod.shortName}
        </h3>
        <p className="mt-2 text-sm text-gray-500">{mod.tagline}</p>
        <p className="mt-4 text-xs font-medium text-[#2A7F6F]">
          {mod.labCount} labs &rarr;
        </p>
      </a>
    );
  }

  return (
    <div
      aria-disabled="true"
      className="relative block p-6 rounded-lg bg-gray-100 border border-gray-200 opacity-60 cursor-not-allowed select-none"
    >
      <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-gray-500 bg-gray-200 rounded-full px-2 py-0.5">
        Coming soon
      </span>
      <h3 className="text-lg font-semibold text-gray-600">{mod.shortName}</h3>
      <p className="mt-2 text-sm text-gray-400">{mod.tagline}</p>
    </div>
  );
}
