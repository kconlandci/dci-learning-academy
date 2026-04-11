import { useCallback, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import {
  clearInstructorSession,
  clearSession,
  loadInstructorSession,
  loadSession,
  type Session,
} from "@dci/shared";
import { Gate } from "./components/Gate";
import { Landing } from "./components/Landing";
import { InstructorGate } from "./components/InstructorGate";
import { InstructorDashboard } from "./components/InstructorDashboard";
import { NotFound } from "./components/NotFound";

// BrowserRouter needs the Vite base URL without its trailing slash.
// In dev this resolves to "" (root); in production to "/dci-learning-academy".
const BASENAME = import.meta.env.BASE_URL.replace(/\/$/, "") || "/";

export default function App() {
  return (
    <BrowserRouter basename={BASENAME}>
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/instructor" element={<InstructorHome />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

function StudentHome() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const handleSignOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  if (!session) {
    return <Gate onAuthed={setSession} />;
  }
  return <Landing session={session} onSignOut={handleSignOut} />;
}

function InstructorHome() {
  const [authed, setAuthed] = useState<boolean>(() => loadInstructorSession());

  const handleSignOut = useCallback(() => {
    clearInstructorSession();
    setAuthed(false);
  }, []);

  if (!authed) {
    return <InstructorGate onAuthed={() => setAuthed(true)} />;
  }
  return <InstructorDashboard onSignOut={handleSignOut} />;
}
