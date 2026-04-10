import { MODULES } from "@dci/shared";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">DCI Learning Academy</h1>
        <p className="text-slate-400">
          Portal scaffold. Access gate, module tiles, and instructor view wired in later steps.
        </p>
        <p className="text-xs text-slate-600">
          {MODULES.length} modules registered
        </p>
      </div>
    </main>
  );
}
