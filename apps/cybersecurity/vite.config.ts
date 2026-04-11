import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Deployed under /dci-learning-academy/cybersecurity/ on GitHub Pages.
// Dev serves from / so `pnpm --filter @dci/cybersecurity dev` still works.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === "build" ? "/dci-learning-academy/cybersecurity/" : "/",
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
