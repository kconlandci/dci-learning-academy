import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { loadSession } from "@dci/shared";
import "./firebase-init";
import "./index.css";
import App from "./App";

const PORTAL_ROOT =
  import.meta.env.BASE_URL.replace(/\/networking\/?$/, "/") || "/";

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
