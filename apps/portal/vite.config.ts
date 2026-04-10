import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Deployed to https://kconlandci.github.io/dci-learning-academy/
// Portal lives at the root of that path; modules live under /cybersecurity, etc.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/" : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
