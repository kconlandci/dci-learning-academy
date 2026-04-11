import { StrictMode } from "react";
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
  import.meta.env.BASE_URL.replace(/\/cybersecurity\/?$/, "/") || "/";

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
