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

export interface PostRebrandAssertion {
  /**
   * File path or fast-glob pattern, relative to the dest root. Literal paths
   * (no glob chars) match a single file; globs are expanded and every match
   * is checked.
   */
  file: string;
  /** Substring to search for. */
  marker: string;
  /** Human-readable description for the error message. */
  description: string;
  /**
   * When true, the assertion FAILS if `marker` is found in any matched file.
   * When false / undefined (default), the assertion fails if `marker` is
   * missing from any matched file (or if no files match).
   */
  absent?: boolean;
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
  /** Post-rebrand invariants: checked after all transforms, fail the run if missing. */
  assertions?: PostRebrandAssertion[];
}

// Always-excluded copy patterns, shared by every module.
// Script also merges these with ALWAYS_EXCLUDE from rebrand.ts.
export const MODULES: Record<string, ModuleRebrand> = {
  cybersecurity: {
    sourceRepoName: "ThreatForge",
    destSlug: "cybersecurity",
    textReplacements: [
      // Identifier form FIRST — must run before the display-form replacement
      // below, because "ThreatForgeProgress" would otherwise become
      // "DCI Cybersecurity LabsProgress" (space inside identifier = syntax error).
      // The lookahead matches only when followed by a word character, so
      // standalone `ThreatForge` still hits the next rule.
      { pattern: /ThreatForge(?=[A-Za-z0-9_])/g, replacement: "DciCybersecurity" },
      // Brand name — display form.
      { pattern: /ThreatForge/g, replacement: "DCI Cybersecurity Labs" },
      { pattern: /threatforge/g, replacement: "dci-cybersecurity" },
      { pattern: /THREATFORGE/g, replacement: "DCI_CYBERSECURITY" },
      // "Forge Labs" → "DCI Learning Academy" (catches store copy, headings)
      { pattern: /Forge Labs Pro/g, replacement: "DCI Learning Academy" },
      { pattern: /Forge Labs/g, replacement: "DCI Learning Academy" },
      // Redirect Capacitor imports to a local web-only shim. Importers live
      // in src/hooks/ and src/screens/ (depth 2), so ../capacitor-shim
      // resolves for both. If a future module imports Capacitor from a
      // different depth, add a per-file replacement instead of widening this.
      {
        pattern: /from ["']@capacitor\/(app|preferences|dialog|browser)["']/g,
        replacement: 'from "../capacitor-shim"',
      },
      // Replace broken icon-512.png ref (deleted during rebrand) with DCI logo
      // mark. Uses import.meta.env.BASE_URL so the path resolves under the
      // production subpath (/dci-learning-academy/cybersecurity/).
      {
        pattern: /src="\/icon-512\.png"/g,
        replacement: 'src={`${import.meta.env.BASE_URL}logo-mark.png`}',
      },
      // Phase B: .gitignore must not swallow .env.example (upstream ignore
      // rule `.env.*` catches it otherwise). Append an un-ignore exception.
      // Idempotent because the replacement result no longer matches the
      // original pattern — a second rebrand pass is a no-op.
      {
        pattern: /^\.env\.\*\r?\n(?!!\.env\.example)/m,
        replacement: ".env.*\n!.env.example\n",
      },
      // Strip premium access gating — DCI Learning Academy unlocks all
      // content for classroom use, so lab metadata should read "free", and
      // the paywall section comments in paths.ts should disappear. Kept as
      // text replacements (rather than a sed in the source repo) so future
      // DataForge / CloudForge / TechForge rebrands inherit the fix for free.
      { pattern: /accessLevel: "premium"/g, replacement: 'accessLevel: "free"' },
      { pattern: /accessLevel: 'premium'/g, replacement: "accessLevel: 'free'" },
      { pattern: /^[ \t]*\/\/ --- PREMIUM.*\r?\n/gm, replacement: "" },
      // Phase B: inject @dci/shared import into useProgress.ts for the
      // Firestore progress mirror. Anchors on the localDate import (unique
      // to useProgress.ts). If upstream ever removes that import, the
      // post-rebrand assertion below catches the break.
      {
        pattern: /import \{ getLocalDateString \} from "\.\.\/utils\/localDate";/,
        replacement:
          'import { recordLabCompletion as recordToFirestore } from "@dci/shared";\n' +
          'import { getLocalDateString } from "../utils/localDate";',
      },
      // Phase B: inject fire-and-forget Firestore mirror after the local
      // mirrorToPreferences write inside recordLabCompletion. $1 captures
      // the indentation so the block aligns with surrounding code.
      {
        pattern: /mirrorToPreferences\(next\);\r?\n(\s+)return next;/,
        replacement:
          "mirrorToPreferences(next);\n\n" +
          "$1// ━━━ DCI PHASE B — Mirror completion to Firestore for instructor view ━━━\n" +
          "$1// Fire-and-forget: never blocks the local state update.\n" +
          "$1// studentId from localStorage, fires on every retake by design.\n" +
          "$1const dciStudentId =\n" +
          "$1  typeof localStorage !== \"undefined\"\n" +
          "$1    ? localStorage.getItem(\"dci:student-id\")\n" +
          "$1    : null;\n" +
          "$1if (dciStudentId) {\n" +
          "$1  recordToFirestore(dciStudentId, \"cybersecurity\", labId).catch(\n" +
          "$1    (err) => {\n" +
          "$1      console.warn(\n" +
          "$1        \"[DCI] Failed to record lab completion to Firestore:\",\n" +
          "$1        err,\n" +
          "$1      );\n" +
          "$1    },\n" +
          "$1  );\n" +
          "$1}\n" +
          "$1// ━━━ END DCI PHASE B ━━━\n\n" +
          "$1return next;",
      },
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
      // Consumer monetization source (nothing imports these after stubs reroute).
      // usePurchase.ts is NOT deleted — SettingsScreen imports it, so it's
      // stubbed below with a no-op that keeps the interface.
      "src/config/revenuecat.ts",
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

      "src/hooks/usePurchase.ts": `// Stubbed by scripts/rebrand.ts — no monetization in the DCI classroom build.
// Kept so SettingsScreen imports still resolve; the restore button is dead code.

export type PurchaseError = "cancelled" | "already_owned" | "network" | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  return {
    purchase: async () => ({ success: false, error: "unknown" }),
    restore: async () => ({ success: false, error: "unknown" }),
    isPurchasing: false,
    isRestoring: false,
  };
}
`,

      // Verbatim re-implementation of the original ErrorBoundary with `override`
      // modifiers added. DCI's tsconfig.base has `noImplicitOverride: true`, which
      // the ThreatForge tsconfig did not, so the inherited methods fail to compile
      // without this annotation. Stubbing is cheaper than a surgical regex.
      "src/components/ErrorBoundary.tsx": `import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DCI Cybersecurity Labs] Lab error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">\u26A0\uFE0F</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              This lab encountered an issue
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Something went wrong loading this lab. This has been logged and
              we'll look into it.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] leading-[48px]"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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

interface LabsPerDayBucket {
  date: string;
  count: number;
}

interface TopLab {
  labId: string;
  count: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  labsPerDay: LabsPerDayBucket[];
  topLabs: TopLab[];
}

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

export function getAnalyticsSummary(): AnalyticsSummary {
  // Build 14 empty day buckets ending today so the chart still renders.
  const days: LabsPerDayBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    totalSessions: 0,
    avgSessionSeconds: 0,
    labsStarted: 0,
    labsCompleted: 0,
    completionRate: 0,
    avgScore: 0,
    labsPerDay: days,
    topLabs: [],
  };
}

export function clearAnalytics(): void {
  // no-op
}

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

      // Web-only shim for the handful of @capacitor/* modules ThreatForge
      // imports. Imports get rewritten by textReplacements to point here.
      "src/capacitor-shim.ts": `// Stubbed by scripts/rebrand.ts — web fallbacks for the @capacitor/* modules
// used by the rebranded source (App, Preferences, Dialog, Browser).
//
// The handful of files that used these plugins (useProgress, SettingsScreen,
// AnalyticsScreen) have their import paths rewritten to this shim so their
// call sites keep working without edits. Semantics:
//
//   - Preferences → localStorage (same key-value shape)
//   - Dialog.confirm → window.confirm (returns { value })
//   - Browser.open → window.open
//   - App.addListener("pause", cb) → visibilitychange + beforeunload, which
//     cover the same "user backgrounded the tab" signal in a browser.

interface ListenerHandle {
  remove: () => void;
}

type AppEvent = "pause" | "resume" | "backButton";

type AppListener = (...args: unknown[]) => void;

function addAppListener(event: AppEvent, callback: AppListener): Promise<ListenerHandle> {
  if (event === "pause") {
    const visHandler = () => {
      if (document.visibilityState === "hidden") callback();
    };
    const unloadHandler = () => callback();
    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("beforeunload", unloadHandler);
    return Promise.resolve({
      remove: () => {
        document.removeEventListener("visibilitychange", visHandler);
        window.removeEventListener("beforeunload", unloadHandler);
      },
    });
  }
  if (event === "resume") {
    const visHandler = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", visHandler);
    return Promise.resolve({
      remove: () => document.removeEventListener("visibilitychange", visHandler),
    });
  }
  // Unknown events — no-op handle
  return Promise.resolve({ remove: () => {} });
}

export const App = {
  addListener: addAppListener,
  exitApp: () => {},
};

export const Preferences = {
  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: typeof localStorage !== "undefined" ? localStorage.getItem(key) : null };
  },
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async remove({ key }: { key: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const Dialog = {
  async confirm({ message }: ConfirmOptions): Promise<{ value: boolean }> {
    const value = typeof window !== "undefined" ? window.confirm(message) : false;
    return { value };
  },
  async alert({ message }: { title?: string; message: string }): Promise<void> {
    if (typeof window !== "undefined") window.alert(message);
  },
};

export const Browser = {
  async open({ url }: { url: string }): Promise<void> {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  },
  async close(): Promise<void> {},
};
`,

      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "@dci/shared";
import "./firebase-init";
import "./index.css";
import App from "./App";

// Derive the portal root from Vite's BASE_URL. In dev this is "/"; in prod
// under GitHub Pages the cybersecurity app is served at
// "/dci-learning-academy/cybersecurity/", so stripping the trailing module
// segment lands us at the portal root "/dci-learning-academy/".
const PORTAL_ROOT =
  import.meta.env.BASE_URL.replace(/\\/cybersecurity\\/?$/, "/") || "/";

if (!loadSession()) {
  // Student hit the cybersecurity app without going through the portal gate.
  // Bounce them to the portal so they sign in, then come back here.
  window.location.replace(PORTAL_ROOT);
} else {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`,

      "src/firebase-init.ts": `/**
 * Cybersecurity-side Firebase bootstrap.
 *
 * Reads the Firebase Web config from Vite env vars (VITE_FIREBASE_*) at
 * build time and calls initFirebase() from @dci/shared once. Imported by
 * main.tsx before React mounts, so any shared/* module that calls getDb()
 * after that point is safe.
 */

import { initFirebase } from "@dci/shared";

const env = import.meta.env;

function required(key: keyof ImportMetaEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      \`Missing required env var \${key}. Copy apps/cybersecurity/.env.example to apps/cybersecurity/.env and fill in the Firebase console values.\`,
    );
  }
  return value;
}

initFirebase({
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
});
`,

      "src/vite-env.d.ts": `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,

      ".env.example": `# Firebase Web SDK config — copy to .env and fill in from the Firebase console.
# These values are safe to ship in the client bundle; Firestore access is
# enforced by security rules, not by hiding this config. They live in env
# vars for tidiness and to make rotation cleaner.
#
# Project: dci-learning-academy
# Where to find: Firebase console \u2192 Project settings \u2192 Your apps \u2192 SDK setup
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
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
    "@dci/shared": "workspace:*",
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
    <link rel="icon" type="image/png" href="/logo-mark.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCI Cybersecurity Labs</title>
    <script>
      // SPA deep-link decoder — companion to the repo-root 404.html redirect.
      // See scripts/pages/spa-decode.html for the canonical source and rationale.
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search.slice(1).split("&").map(function (s) {
            return s.replace(/~and~/g, "&");
          }).join("?");
          window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
        }
      })(window.location);
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    assertions: [
      {
        file: "src/hooks/useProgress.ts",
        marker: "DCI PHASE B",
        description:
          "Firestore progress mirror hook must survive rebrand. " +
          "If this assertion fires, the upstream anchor changed — " +
          "check the import and mirrorToPreferences text replacements " +
          "in rebrand.config.ts.",
      },
      {
        file: "src/data/**/*.ts",
        marker: 'accessLevel: "premium"',
        absent: true,
        description:
          "Premium access gating must not survive rebrand. DCI unlocks " +
          "all labs — if this fires, the premium-stripping text " +
          "replacement missed a new quote style or the source added a " +
          "new gating mechanism.",
      },
    ],
  },

  programming: {
    sourceRepoName: "CodeForge",
    destSlug: "programming",
    textReplacements: [
      // Identifier form FIRST — CodeForgeProgress etc.
      { pattern: /CodeForge(?=[A-Za-z0-9_])/g, replacement: "DciProgramming" },
      // Brand name — display form.
      { pattern: /CodeForge/g, replacement: "DCI Programming Labs" },
      { pattern: /codeforge/g, replacement: "dci-programming" },
      { pattern: /CODEFORGE/g, replacement: "DCI_PROGRAMMING" },
      // "Forge Labs" → "DCI Learning Academy"
      { pattern: /Forge Labs Pro/g, replacement: "DCI Learning Academy" },
      { pattern: /Forge Labs/g, replacement: "DCI Learning Academy" },
      // Redirect Capacitor imports to local web-only shim
      {
        pattern: /from ["']@capacitor\/(app|preferences|dialog|browser)["']/g,
        replacement: 'from "../capacitor-shim"',
      },
      // Replace broken icon-512.png ref with DCI logo mark
      {
        pattern: /src="\/icon-512\.png"/g,
        replacement: 'src={`${import.meta.env.BASE_URL}logo-mark.png`}',
      },
      // .gitignore: don't swallow .env.example
      {
        pattern: /^\.env\.\*\r?\n(?!!\.env\.example)/m,
        replacement: ".env.*\n!.env.example\n",
      },
      // Strip premium access gating — see cybersecurity module for rationale.
      { pattern: /accessLevel: "premium"/g, replacement: 'accessLevel: "free"' },
      { pattern: /accessLevel: 'premium'/g, replacement: "accessLevel: 'free'" },
      { pattern: /^[ \t]*\/\/ --- PREMIUM.*\r?\n/gm, replacement: "" },
      // Phase B: inject @dci/shared import into useProgress.ts
      {
        pattern: /import \{ getLocalDateString \} from "\.\.\/utils\/localDate";/,
        replacement:
          'import { recordLabCompletion as recordToFirestore } from "@dci/shared";\n' +
          'import { getLocalDateString } from "../utils/localDate";',
      },
      // Phase B: inject Firestore mirror after mirrorToPreferences
      {
        pattern: /mirrorToPreferences\(next\);\r?\n(\s+)return next;/,
        replacement:
          "mirrorToPreferences(next);\n\n" +
          "$1// ━━━ DCI PHASE B — Mirror completion to Firestore for instructor view ━━━\n" +
          "$1// Fire-and-forget: never blocks the local state update.\n" +
          "$1// studentId from localStorage, fires on every retake by design.\n" +
          "$1const dciStudentId =\n" +
          "$1  typeof localStorage !== \"undefined\"\n" +
          "$1    ? localStorage.getItem(\"dci:student-id\")\n" +
          "$1    : null;\n" +
          "$1if (dciStudentId) {\n" +
          "$1  recordToFirestore(dciStudentId, \"programming\", labId).catch(\n" +
          "$1    (err) => {\n" +
          "$1      console.warn(\n" +
          "$1        \"[DCI] Failed to record lab completion to Firestore:\",\n" +
          "$1        err,\n" +
          "$1      );\n" +
          "$1    },\n" +
          "$1  );\n" +
          "$1}\n" +
          "$1// ━━━ END DCI PHASE B ━━━\n\n" +
          "$1return next;",
      },
    ],
    deletions: [
      "android/**",
      "capacitor.config.*",
      "dist/**",
      "*.jks",
      "*.pem",
      "package-lock.json",
      "**/*release-key*",
      "**/*upload-key*",
      "LAUNCH-GUIDE.md",
      "PROJECT-STATUS.md",
      "store-listing-copy.md",
      "production-access-answers.md",
      "icon.png",
      "public/icon-512.png",
      "src/config/revenuecat.ts",
      "src/screens/UpgradeScreen.tsx",
      "**/FoundersPack*",
      "**/founders-pack*",
      "**/InAppReview*",
      "**/in-app-review*",
      "**/*revenuecat*",
      ".claude/**",
      "node_modules/**",
      ".codeforge-validate/**",
      "scripts/**",
    ],
    stubs: {
      "src/hooks/usePremiumStatus.ts": `// Stubbed by scripts/rebrand.ts — DCI Learning Academy unlocks all content.
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

      "src/hooks/usePurchase.ts": `// Stubbed by scripts/rebrand.ts — no monetization in the DCI classroom build.
export type PurchaseError = "cancelled" | "already_owned" | "network" | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  return {
    purchase: async () => ({ success: false, error: "unknown" }),
    restore: async () => ({ success: false, error: "unknown" }),
    isPurchasing: false,
    isRestoring: false,
  };
}
`,

      "src/components/ErrorBoundary.tsx": `import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DCI Programming Labs] Lab error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">\u26A0\uFE0F</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              This lab encountered an issue
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Something went wrong loading this lab. This has been logged and
              we'll look into it.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] leading-[48px]"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
interface LabsPerDayBucket {
  date: string;
  count: number;
}

interface TopLab {
  labId: string;
  count: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  labsPerDay: LabsPerDayBucket[];
  topLabs: TopLab[];
}

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

export function getAnalyticsSummary(): AnalyticsSummary {
  const days: LabsPerDayBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    totalSessions: 0,
    avgSessionSeconds: 0,
    labsStarted: 0,
    labsCompleted: 0,
    completionRate: 0,
    avgScore: 0,
    labsPerDay: days,
    topLabs: [],
  };
}

export function clearAnalytics(): void {
  // no-op
}

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

      "src/contexts/AuthContext.tsx": `// Stubbed by scripts/rebrand.ts — DCI has its own access code + student ID flow.
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

      "src/config/firebase.ts": `// Stubbed by scripts/rebrand.ts — progress tracking wired through @dci/shared.
export const app = null;
export const auth = null;
`,

      "src/App.tsx": `// Stubbed by scripts/rebrand.ts — gutted version of the original CodeForge App.tsx.
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
        <BrowserRouter basename="/dci-learning-academy/programming">
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
`,

      "src/capacitor-shim.ts": `// Stubbed by scripts/rebrand.ts — web fallbacks for @capacitor/* modules.
interface ListenerHandle {
  remove: () => void;
}

type AppEvent = "pause" | "resume" | "backButton";
type AppListener = (...args: unknown[]) => void;

function addAppListener(event: AppEvent, callback: AppListener): Promise<ListenerHandle> {
  if (event === "pause") {
    const visHandler = () => {
      if (document.visibilityState === "hidden") callback();
    };
    const unloadHandler = () => callback();
    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("beforeunload", unloadHandler);
    return Promise.resolve({
      remove: () => {
        document.removeEventListener("visibilitychange", visHandler);
        window.removeEventListener("beforeunload", unloadHandler);
      },
    });
  }
  if (event === "resume") {
    const visHandler = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", visHandler);
    return Promise.resolve({
      remove: () => document.removeEventListener("visibilitychange", visHandler),
    });
  }
  return Promise.resolve({ remove: () => {} });
}

export const App = {
  addListener: addAppListener,
  exitApp: () => {},
};

export const Preferences = {
  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: typeof localStorage !== "undefined" ? localStorage.getItem(key) : null };
  },
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async remove({ key }: { key: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const Dialog = {
  async confirm({ message }: ConfirmOptions): Promise<{ value: boolean }> {
    const value = typeof window !== "undefined" ? window.confirm(message) : false;
    return { value };
  },
  async alert({ message }: { title?: string; message: string }): Promise<void> {
    if (typeof window !== "undefined") window.alert(message);
  },
};

export const Browser = {
  async open({ url }: { url: string }): Promise<void> {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  },
  async close(): Promise<void> {},
};
`,

      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "@dci/shared";
import "./firebase-init";
import "./index.css";
import App from "./App";

const PORTAL_ROOT =
  import.meta.env.BASE_URL.replace(/\\/programming\\/?$/, "/") || "/";

if (!loadSession()) {
  window.location.replace(PORTAL_ROOT);
} else {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`,

      "src/firebase-init.ts": `/**
 * Programming-side Firebase bootstrap.
 */
import { initFirebase } from "@dci/shared";

const env = import.meta.env;

function required(key: keyof ImportMetaEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      \`Missing required env var \${key}. Copy apps/programming/.env.example to apps/programming/.env and fill in the Firebase console values.\`,
    );
  }
  return value;
}

initFirebase({
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
});
`,

      "src/vite-env.d.ts": `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,

      ".env.example": `# Firebase Web SDK config — copy to .env and fill in from the Firebase console.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
`,

      "package.json": `{
  "name": "@dci/programming",
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
    "@dci/shared": "workspace:*",
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

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/programming/" : "/",
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
    <link rel="icon" type="image/png" href="/logo-mark.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCI Programming Labs</title>
    <script>
      // SPA deep-link decoder — companion to the repo-root 404.html redirect.
      // See scripts/pages/spa-decode.html for the canonical source and rationale.
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search.slice(1).split("&").map(function (s) {
            return s.replace(/~and~/g, "&");
          }).join("?");
          window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
        }
      })(window.location);
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    assertions: [
      {
        file: "src/hooks/useProgress.ts",
        marker: "DCI PHASE B",
        description:
          "Firestore progress mirror hook must survive rebrand. " +
          "If this assertion fires, the upstream anchor changed — " +
          "check the import and mirrorToPreferences text replacements " +
          "in rebrand.config.ts.",
      },
      {
        file: "src/data/**/*.ts",
        marker: 'accessLevel: "premium"',
        absent: true,
        description:
          "Premium access gating must not survive rebrand. DCI unlocks " +
          "all labs — if this fires, the premium-stripping text " +
          "replacement missed a new quote style or the source added a " +
          "new gating mechanism.",
      },
    ],
  },

  networking: {
    sourceRepoName: "NetForge",
    destSlug: "networking",
    textReplacements: [
      // Identifier form FIRST — NetForgeProgress etc.
      { pattern: /NetForge(?=[A-Za-z0-9_])/g, replacement: "DciNetworking" },
      // Brand name — display form.
      { pattern: /NetForge/g, replacement: "DCI Networking Labs" },
      { pattern: /netforge/g, replacement: "dci-networking" },
      { pattern: /NETFORGE/g, replacement: "DCI_NETWORKING" },
      // "Forge Labs" → "DCI Learning Academy"
      { pattern: /Forge Labs Pro/g, replacement: "DCI Learning Academy" },
      { pattern: /Forge Labs/g, replacement: "DCI Learning Academy" },
      // Redirect Capacitor imports to local web-only shim
      {
        pattern: /from ["']@capacitor\/(app|preferences|dialog|browser)["']/g,
        replacement: 'from "../capacitor-shim"',
      },
      // Replace broken icon-512.png ref with DCI logo mark
      {
        pattern: /src="\/icon-512\.png"/g,
        replacement: 'src={`${import.meta.env.BASE_URL}logo-mark.png`}',
      },
      // .gitignore: don't swallow .env.example
      {
        pattern: /^\.env\.\*\r?\n(?!!\.env\.example)/m,
        replacement: ".env.*\n!.env.example\n",
      },
      // Strip premium access gating — see cybersecurity module for rationale.
      { pattern: /accessLevel: "premium"/g, replacement: 'accessLevel: "free"' },
      { pattern: /accessLevel: 'premium'/g, replacement: "accessLevel: 'free'" },
      { pattern: /^[ \t]*\/\/ --- PREMIUM.*\r?\n/gm, replacement: "" },
      // Phase B: inject @dci/shared import into useProgress.ts
      {
        pattern: /import \{ getLocalDateString \} from "\.\.\/utils\/localDate";/,
        replacement:
          'import { recordLabCompletion as recordToFirestore } from "@dci/shared";\n' +
          'import { getLocalDateString } from "../utils/localDate";',
      },
      // Phase B: inject Firestore mirror after mirrorToPreferences
      {
        pattern: /mirrorToPreferences\(next\);\r?\n(\s+)return next;/,
        replacement:
          "mirrorToPreferences(next);\n\n" +
          "$1// ━━━ DCI PHASE B — Mirror completion to Firestore for instructor view ━━━\n" +
          "$1// Fire-and-forget: never blocks the local state update.\n" +
          "$1// studentId from localStorage, fires on every retake by design.\n" +
          "$1const dciStudentId =\n" +
          "$1  typeof localStorage !== \"undefined\"\n" +
          "$1    ? localStorage.getItem(\"dci:student-id\")\n" +
          "$1    : null;\n" +
          "$1if (dciStudentId) {\n" +
          "$1  recordToFirestore(dciStudentId, \"networking\", labId).catch(\n" +
          "$1    (err) => {\n" +
          "$1      console.warn(\n" +
          "$1        \"[DCI] Failed to record lab completion to Firestore:\",\n" +
          "$1        err,\n" +
          "$1      );\n" +
          "$1    },\n" +
          "$1  );\n" +
          "$1}\n" +
          "$1// ━━━ END DCI PHASE B ━━━\n\n" +
          "$1return next;",
      },
    ],
    deletions: [
      "android/**",
      "capacitor.config.*",
      "dist/**",
      "*.jks",
      "*.pem",
      "package-lock.json",
      "**/*release-key*",
      "**/*upload-key*",
      "LAUNCH-GUIDE.md",
      "PROJECT-STATUS.md",
      "store-listing-copy.md",
      "production-access-answers.md",
      "icon.png",
      "public/icon-512.png",
      "src/config/revenuecat.ts",
      "src/screens/UpgradeScreen.tsx",
      "**/FoundersPack*",
      "**/founders-pack*",
      "**/InAppReview*",
      "**/in-app-review*",
      "**/*revenuecat*",
      ".claude/**",
      "node_modules/**",
    ],
    stubs: {
      "src/hooks/usePremiumStatus.ts": `// Stubbed by scripts/rebrand.ts — DCI Learning Academy unlocks all content.
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

      "src/hooks/usePurchase.ts": `// Stubbed by scripts/rebrand.ts — no monetization in the DCI classroom build.
export type PurchaseError = "cancelled" | "already_owned" | "network" | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  return {
    purchase: async () => ({ success: false, error: "unknown" }),
    restore: async () => ({ success: false, error: "unknown" }),
    isPurchasing: false,
    isRestoring: false,
  };
}
`,

      "src/components/ErrorBoundary.tsx": `import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DCI Networking Labs] Lab error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">\u26A0\uFE0F</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              This lab encountered an issue
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Something went wrong loading this lab. This has been logged and
              we'll look into it.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] leading-[48px]"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
interface LabsPerDayBucket {
  date: string;
  count: number;
}

interface TopLab {
  labId: string;
  count: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  labsPerDay: LabsPerDayBucket[];
  topLabs: TopLab[];
}

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

export function getAnalyticsSummary(): AnalyticsSummary {
  const days: LabsPerDayBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    totalSessions: 0,
    avgSessionSeconds: 0,
    labsStarted: 0,
    labsCompleted: 0,
    completionRate: 0,
    avgScore: 0,
    labsPerDay: days,
    topLabs: [],
  };
}

export function clearAnalytics(): void {
  // no-op
}

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

      "src/contexts/AuthContext.tsx": `// Stubbed by scripts/rebrand.ts — DCI has its own access code + student ID flow.
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

      "src/config/firebase.ts": `// Stubbed by scripts/rebrand.ts — progress tracking wired through @dci/shared.
export const app = null;
export const auth = null;
`,

      "src/App.tsx": `// Stubbed by scripts/rebrand.ts — gutted version of the original NetForge App.tsx.
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
        <BrowserRouter basename="/dci-learning-academy/networking">
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
`,

      "src/capacitor-shim.ts": `// Stubbed by scripts/rebrand.ts — web fallbacks for @capacitor/* modules.
interface ListenerHandle {
  remove: () => void;
}

type AppEvent = "pause" | "resume" | "backButton";
type AppListener = (...args: unknown[]) => void;

function addAppListener(event: AppEvent, callback: AppListener): Promise<ListenerHandle> {
  if (event === "pause") {
    const visHandler = () => {
      if (document.visibilityState === "hidden") callback();
    };
    const unloadHandler = () => callback();
    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("beforeunload", unloadHandler);
    return Promise.resolve({
      remove: () => {
        document.removeEventListener("visibilitychange", visHandler);
        window.removeEventListener("beforeunload", unloadHandler);
      },
    });
  }
  if (event === "resume") {
    const visHandler = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", visHandler);
    return Promise.resolve({
      remove: () => document.removeEventListener("visibilitychange", visHandler),
    });
  }
  return Promise.resolve({ remove: () => {} });
}

export const App = {
  addListener: addAppListener,
  exitApp: () => {},
};

export const Preferences = {
  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: typeof localStorage !== "undefined" ? localStorage.getItem(key) : null };
  },
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async remove({ key }: { key: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const Dialog = {
  async confirm({ message }: ConfirmOptions): Promise<{ value: boolean }> {
    const value = typeof window !== "undefined" ? window.confirm(message) : false;
    return { value };
  },
  async alert({ message }: { title?: string; message: string }): Promise<void> {
    if (typeof window !== "undefined") window.alert(message);
  },
};

export const Browser = {
  async open({ url }: { url: string }): Promise<void> {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  },
  async close(): Promise<void> {},
};
`,

      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "@dci/shared";
import "./firebase-init";
import "./index.css";
import App from "./App";

const PORTAL_ROOT =
  import.meta.env.BASE_URL.replace(/\\/networking\\/?$/, "/") || "/";

if (!loadSession()) {
  window.location.replace(PORTAL_ROOT);
} else {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`,

      "src/firebase-init.ts": `/**
 * Networking-side Firebase bootstrap.
 */
import { initFirebase } from "@dci/shared";

const env = import.meta.env;

function required(key: keyof ImportMetaEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      \`Missing required env var \${key}. Copy apps/networking/.env.example to apps/networking/.env and fill in the Firebase console values.\`,
    );
  }
  return value;
}

initFirebase({
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
});
`,

      "src/vite-env.d.ts": `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,

      ".env.example": `# Firebase Web SDK config — copy to .env and fill in from the Firebase console.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
`,

      "package.json": `{
  "name": "@dci/networking",
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
    "@dci/shared": "workspace:*",
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

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/networking/" : "/",
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
    <link rel="icon" type="image/png" href="/logo-mark.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCI Networking Labs</title>
    <script>
      // SPA deep-link decoder — companion to the repo-root 404.html redirect.
      // See scripts/pages/spa-decode.html for the canonical source and rationale.
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search.slice(1).split("&").map(function (s) {
            return s.replace(/~and~/g, "&");
          }).join("?");
          window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
        }
      })(window.location);
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    assertions: [
      {
        file: "src/hooks/useProgress.ts",
        marker: "DCI PHASE B",
        description:
          "Firestore progress mirror hook must survive rebrand. " +
          "If this assertion fires, the upstream anchor changed — " +
          "check the import and mirrorToPreferences text replacements " +
          "in rebrand.config.ts.",
      },
      {
        file: "src/data/**/*.ts",
        marker: 'accessLevel: "premium"',
        absent: true,
        description:
          "Premium access gating must not survive rebrand. DCI unlocks " +
          "all labs — if this fires, the premium-stripping text " +
          "replacement missed a new quote style or the source added a " +
          "new gating mechanism.",
      },
    ],
  },
  "cloud-computing": {
    sourceRepoName: "CloudForge",
    destSlug: "cloud-computing",
    textReplacements: [
      // Identifier form FIRST — CloudForgeProgress etc.
      { pattern: /CloudForge(?=[A-Za-z0-9_])/g, replacement: "DciCloudComputing" },
      // Brand name — display form.
      { pattern: /CloudForge/g, replacement: "DCI Cloud Computing Labs" },
      { pattern: /cloudforge/g, replacement: "dci-cloud-computing" },
      { pattern: /CLOUDFORGE/g, replacement: "DCI_CLOUD_COMPUTING" },
      // "Forge Labs" → "DCI Learning Academy"
      { pattern: /Forge Labs Pro/g, replacement: "DCI Learning Academy" },
      { pattern: /Forge Labs/g, replacement: "DCI Learning Academy" },
      // Redirect Capacitor imports to local web-only shim
      {
        pattern: /from ["']@capacitor\/(app|preferences|dialog|browser)["']/g,
        replacement: 'from "../capacitor-shim"',
      },
      // Replace broken icon-512.png ref with DCI logo mark
      {
        pattern: /src="\/icon-512\.png"/g,
        replacement: 'src={`${import.meta.env.BASE_URL}logo-mark.png`}',
      },
      // .gitignore: don't swallow .env.example
      {
        pattern: /^\.env\.\*\r?\n(?!!\.env\.example)/m,
        replacement: ".env.*\n!.env.example\n",
      },
      // Strip premium access gating — see cybersecurity module for rationale.
      { pattern: /accessLevel: "premium"/g, replacement: 'accessLevel: "free"' },
      { pattern: /accessLevel: 'premium'/g, replacement: "accessLevel: 'free'" },
      { pattern: /^[ \t]*\/\/ --- PREMIUM.*\r?\n/gm, replacement: "" },
      // Phase B: inject @dci/shared import into useProgress.ts
      {
        pattern: /import \{ getLocalDateString \} from "\.\.\/utils\/localDate";/,
        replacement:
          'import { recordLabCompletion as recordToFirestore } from "@dci/shared";\n' +
          'import { getLocalDateString } from "../utils/localDate";',
      },
      // Phase B: inject Firestore mirror after mirrorToPreferences
      {
        pattern: /mirrorToPreferences\(next\);\r?\n(\s+)return next;/,
        replacement:
          "mirrorToPreferences(next);\n\n" +
          "$1// ━━━ DCI PHASE B — Mirror completion to Firestore for instructor view ━━━\n" +
          "$1// Fire-and-forget: never blocks the local state update.\n" +
          "$1// studentId from localStorage, fires on every retake by design.\n" +
          "$1const dciStudentId =\n" +
          "$1  typeof localStorage !== \"undefined\"\n" +
          "$1    ? localStorage.getItem(\"dci:student-id\")\n" +
          "$1    : null;\n" +
          "$1if (dciStudentId) {\n" +
          "$1  recordToFirestore(dciStudentId, \"cloud-computing\", labId).catch(\n" +
          "$1    (err) => {\n" +
          "$1      console.warn(\n" +
          "$1        \"[DCI] Failed to record lab completion to Firestore:\",\n" +
          "$1        err,\n" +
          "$1      );\n" +
          "$1    },\n" +
          "$1  );\n" +
          "$1}\n" +
          "$1// ━━━ END DCI PHASE B ━━━\n\n" +
          "$1return next;",
      },
    ],
    deletions: [
      "android/**",
      "capacitor.config.*",
      "dist/**",
      "*.jks",
      "*.pem",
      "package-lock.json",
      "**/*release-key*",
      "**/*upload-key*",
      "LAUNCH-GUIDE.md",
      "PROJECT-STATUS.md",
      "store-listing-copy.md",
      "production-access-answers.md",
      "icon.png",
      "public/icon-512.png",
      "src/config/revenuecat.ts",
      "src/screens/UpgradeScreen.tsx",
      "**/FoundersPack*",
      "**/founders-pack*",
      "**/InAppReview*",
      "**/in-app-review*",
      "**/*revenuecat*",
      ".claude/**",
      "node_modules/**",
    ],
    stubs: {
      "src/hooks/usePremiumStatus.ts": `// Stubbed by scripts/rebrand.ts — DCI Learning Academy unlocks all content.
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

      "src/hooks/usePurchase.ts": `// Stubbed by scripts/rebrand.ts — no monetization in the DCI classroom build.
export type PurchaseError = "cancelled" | "already_owned" | "network" | "unknown";

interface PurchaseResult {
  success: boolean;
  error?: PurchaseError;
}

interface UsePurchase {
  purchase: (productId: string, isSubscription?: boolean) => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
  isPurchasing: boolean;
  isRestoring: boolean;
}

export function usePurchase(): UsePurchase {
  return {
    purchase: async () => ({ success: false, error: "unknown" }),
    restore: async () => ({ success: false, error: "unknown" }),
    isPurchasing: false,
    isRestoring: false,
  };
}
`,

      "src/components/ErrorBoundary.tsx": `import { Component, type ReactNode, type ErrorInfo } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[DCI Cloud Computing Labs] Lab error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">\u26A0\uFE0F</span>
            </div>
            <h2 className="text-lg font-bold text-white mb-2">
              This lab encountered an issue
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Something went wrong loading this lab. This has been logged and
              we'll look into it.
            </p>
            <a
              href="/"
              className="inline-block px-6 py-3 rounded-xl bg-orange-500 text-white font-semibold text-sm min-h-[48px] leading-[48px]"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
interface LabsPerDayBucket {
  date: string;
  count: number;
}

interface TopLab {
  labId: string;
  count: number;
}

interface AnalyticsSummary {
  totalSessions: number;
  avgSessionSeconds: number;
  labsStarted: number;
  labsCompleted: number;
  completionRate: number;
  avgScore: number;
  labsPerDay: LabsPerDayBucket[];
  topLabs: TopLab[];
}

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

export function getAnalyticsSummary(): AnalyticsSummary {
  const days: LabsPerDayBucket[] = [];
  const now = new Date();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return {
    totalSessions: 0,
    avgSessionSeconds: 0,
    labsStarted: 0,
    labsCompleted: 0,
    completionRate: 0,
    avgScore: 0,
    labsPerDay: days,
    topLabs: [],
  };
}

export function clearAnalytics(): void {
  // no-op
}

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

      "src/contexts/AuthContext.tsx": `// Stubbed by scripts/rebrand.ts — DCI has its own access code + student ID flow.
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

      "src/config/firebase.ts": `// Stubbed by scripts/rebrand.ts — progress tracking wired through @dci/shared.
export const app = null;
export const auth = null;
`,

      "src/App.tsx": `// Stubbed by scripts/rebrand.ts — gutted version of the original CloudForge App.tsx.
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
        <BrowserRouter basename="/dci-learning-academy/cloud-computing">
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
`,

      "src/capacitor-shim.ts": `// Stubbed by scripts/rebrand.ts — web fallbacks for @capacitor/* modules.
interface ListenerHandle {
  remove: () => void;
}

type AppEvent = "pause" | "resume" | "backButton";
type AppListener = (...args: unknown[]) => void;

function addAppListener(event: AppEvent, callback: AppListener): Promise<ListenerHandle> {
  if (event === "pause") {
    const visHandler = () => {
      if (document.visibilityState === "hidden") callback();
    };
    const unloadHandler = () => callback();
    document.addEventListener("visibilitychange", visHandler);
    window.addEventListener("beforeunload", unloadHandler);
    return Promise.resolve({
      remove: () => {
        document.removeEventListener("visibilitychange", visHandler);
        window.removeEventListener("beforeunload", unloadHandler);
      },
    });
  }
  if (event === "resume") {
    const visHandler = () => {
      if (document.visibilityState === "visible") callback();
    };
    document.addEventListener("visibilitychange", visHandler);
    return Promise.resolve({
      remove: () => document.removeEventListener("visibilitychange", visHandler),
    });
  }
  return Promise.resolve({ remove: () => {} });
}

export const App = {
  addListener: addAppListener,
  exitApp: () => {},
};

export const Preferences = {
  async get({ key }: { key: string }): Promise<{ value: string | null }> {
    return { value: typeof localStorage !== "undefined" ? localStorage.getItem(key) : null };
  },
  async set({ key, value }: { key: string; value: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
  },
  async remove({ key }: { key: string }): Promise<void> {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  },
};

interface ConfirmOptions {
  title?: string;
  message: string;
  okButtonTitle?: string;
  cancelButtonTitle?: string;
}

export const Dialog = {
  async confirm({ message }: ConfirmOptions): Promise<{ value: boolean }> {
    const value = typeof window !== "undefined" ? window.confirm(message) : false;
    return { value };
  },
  async alert({ message }: { title?: string; message: string }): Promise<void> {
    if (typeof window !== "undefined") window.alert(message);
  },
};

export const Browser = {
  async open({ url }: { url: string }): Promise<void> {
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  },
  async close(): Promise<void> {},
};
`,

      "src/main.tsx": `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "@dci/shared";
import "./firebase-init";
import "./index.css";
import App from "./App";

const PORTAL_ROOT =
  import.meta.env.BASE_URL.replace(/\\/cloud-computing\\/?$/, "/") || "/";

if (!loadSession()) {
  window.location.replace(PORTAL_ROOT);
} else {
  const root = document.getElementById("root");
  if (!root) throw new Error("Root element not found");

  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
`,

      "src/firebase-init.ts": `/**
 * Networking-side Firebase bootstrap.
 */
import { initFirebase } from "@dci/shared";

const env = import.meta.env;

function required(key: keyof ImportMetaEnv): string {
  const value = env[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      \`Missing required env var \${key}. Copy apps/cloud-computing/.env.example to apps/cloud-computing/.env and fill in the Firebase console values.\`,
    );
  }
  return value;
}

initFirebase({
  apiKey: required("VITE_FIREBASE_API_KEY"),
  authDomain: required("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: required("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: required("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: required("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: required("VITE_FIREBASE_APP_ID"),
});
`,

      "src/vite-env.d.ts": `/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
`,

      ".env.example": `# Firebase Web SDK config — copy to .env and fill in from the Firebase console.
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
`,

      "package.json": `{
  "name": "@dci/cloud-computing",
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
    "@dci/shared": "workspace:*",
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

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/cloud-computing/" : "/",
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
    <link rel="icon" type="image/png" href="/logo-mark.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DCI Cloud Computing Labs</title>
    <script>
      // SPA deep-link decoder — companion to the repo-root 404.html redirect.
      // See scripts/pages/spa-decode.html for the canonical source and rationale.
      (function (l) {
        if (l.search[1] === "/") {
          var decoded = l.search.slice(1).split("&").map(function (s) {
            return s.replace(/~and~/g, "&");
          }).join("?");
          window.history.replaceState(null, null, l.pathname.slice(0, -1) + decoded + l.hash);
        }
      })(window.location);
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`,
    },
    assertions: [
      {
        file: "src/hooks/useProgress.ts",
        marker: "DCI PHASE B",
        description:
          "Firestore progress mirror hook must survive rebrand. " +
          "If this assertion fires, the upstream anchor changed — " +
          "check the import and mirrorToPreferences text replacements " +
          "in rebrand.config.ts.",
      },
      {
        file: "src/data/**/*.ts",
        marker: 'accessLevel: "premium"',
        absent: true,
        description:
          "Premium access gating must not survive rebrand. DCI unlocks " +
          "all labs — if this fires, the premium-stripping text " +
          "replacement missed a new quote style or the source added a " +
          "new gating mechanism.",
      },
    ],
  },
};
