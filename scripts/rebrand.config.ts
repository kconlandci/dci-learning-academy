/**
 * Rebrand configuration.
 *
 * One entry per destination module slug. The rebrand script reads this
 * file, validates inputs, and applies (in order):
 *
 *   1. copy source → dest (excluding always-ignored paths)
 *   2. deletions (glob patterns, file or dir)
 *   3. textReplacements (applied to files with text extensions only)
 *   4. stubs (overwrite specific files verbatim)
 *
 * Stubs are for files whose content needs to be gutted but whose PATH
 * must stay the same because other files import from that path. The
 * cleanest example is useAppReview.ts — consumers call useAppReview() all
 * over the codebase; stubbing it with a no-op avoids rewriting every
 * callsite.
 *
 * Deletions are for files whose path itself should vanish — nothing
 * structurally depends on them existing (after stubs reroute).
 */

export interface Replacement {
  /** Regex or literal string to search for. */
  pattern: RegExp | string;
  /** Replacement text. For regex patterns, supports $1 etc. */
  replacement: string;
}

export interface ModuleRebrand {
  /** Folder name under C:\Users\conla\OneDrive\Desktop\Forge Labs\ */
  sourceRepoName: string;
  /** Destination slug: apps/<slug>/ and part of the deployed URL path. */
  destSlug: string;
  /** Text substitutions applied to every text file in the rebranded copy. */
  textReplacements: Replacement[];
  /** Glob patterns (fast-glob syntax) relative to the dest root, matching files or directories to remove. */
  deletions: string[];
  /** Relative path → full file content. Written last, so stubs always win over replacements. */
  stubs: Record<string, string>;
}

// Always-excluded copy patterns, shared by every module.
// Script also merges these with ALWAYS_EXCLUDE from rebrand.ts.
export const MODULES: Record<string, ModuleRebrand> = {
  cybersecurity: {
    sourceRepoName: "ThreatForge",
    destSlug: "cybersecurity",
    textReplacements: [
      // Brand name — display form. Order matters: longer/more-specific first.
      { pattern: /ThreatForge/g, replacement: "DCI Cybersecurity Labs" },
      { pattern: /threatforge/g, replacement: "dci-cybersecurity" },
      { pattern: /THREATFORGE/g, replacement: "DCI_CYBERSECURITY" },
      // "Forge Labs" → "DCI Learning Academy" (catches store copy, headings)
      { pattern: /Forge Labs Pro/g, replacement: "DCI Learning Academy" },
      { pattern: /Forge Labs/g, replacement: "DCI Learning Academy" },
    ],
    deletions: [
      // Mobile shell + build artifacts
      "android/**",
      "capacitor.config.*",
      "dist/**",
      "*.jks",
      "*.pem",
      "package-lock.json",
      // Signing / release keys (never ship to DCI repo)
      "**/*release-key*",
      "**/*upload-key*",
      // Consumer marketing + store docs
      "LAUNCH-GUIDE.md",
      "PROJECT-STATUS.md",
      "store-listing-copy.md",
      "production-access-answers.md",
      // App icon + mobile-only assets
      "icon.png",
      "public/icon-512.png",
      // Consumer monetization source (nothing imports these after stubs reroute)
      "src/config/revenuecat.ts",
      "src/hooks/usePurchase.ts",
      "src/screens/UpgradeScreen.tsx",
      // Founders Pack UI (if present as standalone)
      "**/FoundersPack*",
      "**/founders-pack*",
      // In-app review (Android-only)
      "**/InAppReview*",
      "**/in-app-review*",
      // Any loose revenuecat references
      "**/*revenuecat*",
      // IDE/tool dirs that shouldn't follow the fork
      ".claude/**",
      "node_modules/**",
    ],
    stubs: {
      // NOTE: stubs for source files that other files structurally import.
      // Keeping the path stable so consumers don't need individual edits.

      "src/hooks/usePremiumStatus.ts": `// Stubbed by scripts/rebrand.ts — DCI Learning Academy unlocks all content.
// Original file consulted RevenueCat / Capacitor Preferences; neither ships here.

interface PremiumStatus {
  isPremium: boolean;
  isLoading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

export function usePremiumStatus(): PremiumStatus {
  return {
    isPremium: true,
    isLoading: false,
    refreshPremiumStatus: async () => {},
  };
}

export async function setPremiumStatus(_isPremium: boolean): Promise<void> {
  // no-op
}
`,

      "src/hooks/useAppReview.ts": `// Stubbed by scripts/rebrand.ts — no native review prompt in the classroom web build.

export function useAppReview() {
  return {
    maybeRequestReview: async (_totalCompleted: number) => {},
  };
}
`,

      "src/hooks/useAndroidBackButton.ts": `// Stubbed by scripts/rebrand.ts — no Capacitor back-button handling in web.

export function useAndroidBackButton(): void {
  // no-op
}
`,

      "src/hooks/useAnalytics.ts": `// Stubbed by scripts/rebrand.ts — analytics removed for DCI classroom build.
// Keeps the same exports so consumers don't need edits.

export function trackAppOpened(): void {}
export function trackSessionEnd(): void {}
export function trackAppResumed(): void {}
export function trackLabStarted(_labId: string): void {}
export function trackLabCompleted(
  _labId: string,
  _score: number,
  _durationSeconds: number,
): void {}
export function trackHintUsed(_labId: string, _scenarioIndex: number): void {}
export function trackPathStarted(_pathId: string): void {}

export function useAnalytics() {
  return {
    trackAppOpened,
    trackSessionEnd,
    trackAppResumed,
    trackLabStarted,
    trackLabCompleted,
    trackHintUsed,
    trackPathStarted,
  };
}
`,

      "src/contexts/AuthContext.tsx": `// Stubbed by scripts/rebrand.ts — DCI has its own access code + student ID
// flow in @dci/shared. No Firebase anonymous auth inside each module.

import { createContext, useContext, type ReactNode } from "react";

interface AuthContextType {
  uid: string | null;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType>({
  uid: null,
  isAuthReady: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthContext.Provider value={{ uid: null, isAuthReady: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
`,

      "src/config/firebase.ts": `// Stubbed by scripts/rebrand.ts — this module does not talk to Firebase
// directly. Progress tracking is wired through @dci/shared at the portal
// level (later step). Exports are kept so legacy imports still resolve.

export const app = null;
export const auth = null;
`,

      "src/App.tsx": `// Stubbed by scripts/rebrand.ts — gutted version of the original
// ThreatForge App.tsx. Removes Capacitor / RevenueCat / analytics wiring
// and drops the UpgradeScreen route. The rest of the app tree is
// preserved unchanged.

import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import HomeScreen from "./screens/HomeScreen";
import LabScreen from "./screens/LabScreen";
import ProgressScreen from "./screens/ProgressScreen";
import SettingsScreen from "./screens/SettingsScreen";
import BottomNav from "./components/BottomNav";
import ErrorBoundary from "./components/ErrorBoundary";
import { privacyPolicy, termsOfService, disclaimer } from "./data/legal";
import { IS_DEV } from "./config";
import { AuthProvider } from "./contexts/AuthContext";

const DevScreen = lazy(() => import("./screens/DevScreen"));
const AnalyticsScreen = lazy(() => import("./screens/AnalyticsScreen"));
const LegalTextViewer = lazy(() => import("./components/LegalTextViewer"));

function LazyFallback() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AppLayout() {
  const location = useLocation();

  const hideNav =
    location.pathname.startsWith("/lab/") ||
    location.pathname.startsWith("/settings/");

  return (
    <Suspense fallback={<LazyFallback />}>
      <Routes>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/lab/:labId" element={<LabScreen />} />
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/settings" element={<SettingsScreen />} />
        <Route
          path="/settings/privacy"
          element={<LegalTextViewer title="Privacy Policy" content={privacyPolicy} />}
        />
        <Route
          path="/settings/terms"
          element={<LegalTextViewer title="Terms of Service" content={termsOfService} />}
        />
        <Route
          path="/settings/disclaimer"
          element={<LegalTextViewer title="Disclaimer" content={disclaimer} />}
        />
        <Route path="/settings/analytics" element={<AnalyticsScreen />} />
        {IS_DEV && <Route path="/dev" element={<DevScreen />} />}
        <Route path="*" element={<HomeScreen />} />
      </Routes>
      {!hideNav && <BottomNav />}
    </Suspense>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter basename="/dci-learning-academy/cybersecurity">
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
`,

      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
`,

      "package.json": `{
  "name": "@dci/cybersecurity",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b --noEmit"
  },
  "dependencies": {
    "firebase": "^12.11.0",
    "lucide-react": "^0.577.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "react-router-dom": "^7.13.1",
    "zod": "^4.3.6"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.2",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "tailwindcss": "^4.2.2",
    "typescript": "~5.9.3",
    "vite": "^8.0.1"
  }
}
`,

      "vite.config.ts": `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Deployed under /dci-learning-academy/cybersecurity/ on GitHub Pages.
// Dev serves from / so \`pnpm --filter @dci/cybersecurity dev\` still works.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/cybersecurity/" : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
`,

      "tsconfig.json": `{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
`,

      "tsconfig.app.json": `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo",
    "useDefineForClassFields": true,
    "types": ["vite/client"],
    "allowImportingTsExtensions": true,
    "moduleDetection": "force",
    "noEmit": true,
    "noUncheckedSideEffectImports": true,
    "noUnusedLocals": false,
    "noUnusedParameters": false
  },
  "include": ["src"]
}
`,

      "tsconfig.node.json": `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
    "types": ["node"],
    "moduleDetection": "force",
    "noEmit": true,
    "composite": true
  },
  "include": ["vite.config.ts"]
}
`,

      "index.html": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCI Cybersecurity Labs</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
  },
};
