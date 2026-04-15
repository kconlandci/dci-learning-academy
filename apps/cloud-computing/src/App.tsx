// Stubbed by scripts/rebrand.ts — gutted version of the original CloudForge App.tsx.
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
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
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
