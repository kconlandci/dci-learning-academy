#!/usr/bin/env node
/**
 * Local smoke-test server.
 *
 * Merges the portal build and every module app build into a single
 * `.test-deploy/` tree that mirrors the GitHub Pages layout:
 *
 *   .test-deploy/
 *     dci-learning-academy/            <- portal dist (root)
 *       assets/...
 *       index.html
 *       cybersecurity/                 <- apps/cybersecurity dist
 *         assets/...
 *         index.html
 *       <future-module>/               <- apps/<name> dist
 *         ...
 *
 * Then spawns `npx serve` at the repo root of that tree so the whole
 * thing is reachable at http://localhost:<port>/dci-learning-academy/.
 *
 * Assumes a fresh `pnpm build` has already run. The `pnpm smoke`
 * script in root package.json chains them together:
 *
 *     pnpm smoke === pnpm build && node scripts/smoke-serve.mjs
 *
 * Module discovery is dynamic: every directory under apps/ except
 * "portal" is treated as a module and copied to
 * .test-deploy/dci-learning-academy/<name>/. Adding a new module
 * (math, writing, etc.) requires no edits to this script.
 *
 * Why not `vite preview`? Because vite preview serves one app per
 * invocation. We need portal + modules merged under a single origin
 * so same-origin localStorage carries the session from portal gate
 * into the module, matching production behavior on GitHub Pages.
 */

import { spawn } from "node:child_process";
import { createServer } from "node:net";
import {
  cp,
  mkdir,
  readdir,
  rm,
  stat,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const APPS_DIR = join(REPO_ROOT, "apps");
const DEPLOY_DIR = join(REPO_ROOT, ".test-deploy");
const SITE_DIR = join(DEPLOY_DIR, "dci-learning-academy");
const PORTAL_APP = "portal";
const PORT_START = 3000;
const PORT_END = 3010;

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function findFreePort(start, end) {
  for (let port = start; port <= end; port++) {
    const ok = await new Promise((res) => {
      const srv = createServer();
      srv.once("error", () => res(false));
      srv.once("listening", () => srv.close(() => res(true)));
      srv.listen(port, "127.0.0.1");
    });
    if (ok) return port;
  }
  throw new Error(
    `No free port in range ${start}-${end}. Kill whatever is holding them and re-run.`,
  );
}

async function discoverModules() {
  const entries = await readdir(APPS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && e.name !== PORTAL_APP)
    .map((e) => e.name);
}

async function requireDist(appName) {
  const distPath = join(APPS_DIR, appName, "dist");
  if (!(await exists(distPath))) {
    throw new Error(
      `Missing build output: ${distPath}. Run \`pnpm build\` first (or use \`pnpm smoke\`, which chains build + serve).`,
    );
  }
  return distPath;
}

async function buildDeployTree() {
  console.log("[smoke] Rebuilding .test-deploy/ …");
  await rm(DEPLOY_DIR, { recursive: true, force: true });
  await mkdir(SITE_DIR, { recursive: true });

  // Portal dist → site root
  const portalDist = await requireDist(PORTAL_APP);
  await cp(portalDist, SITE_DIR, { recursive: true });
  console.log(`[smoke]   portal            → /dci-learning-academy/`);

  // Each module dist → /dci-learning-academy/<name>/
  const modules = await discoverModules();
  for (const name of modules) {
    const moduleDist = await requireDist(name);
    const target = join(SITE_DIR, name);
    await cp(moduleDist, target, { recursive: true });
    console.log(`[smoke]   ${name.padEnd(17)} → /dci-learning-academy/${name}/`);
  }
}

async function serveDeployTree() {
  const port = await findFreePort(PORT_START, PORT_END);
  const url = `http://localhost:${port}/dci-learning-academy/`;

  console.log("");
  console.log("━".repeat(64));
  console.log(`[smoke] Serving .test-deploy/ on port ${port}`);
  console.log(`[smoke] Open: ${url}`);
  console.log("[smoke] Press Ctrl+C to stop.");
  console.log("━".repeat(64));
  console.log("");

  // `serve` is resolved via npx so the user doesn't need it installed globally.
  // --single is NOT passed — we want real 404s on bad asset paths so the
  // smoke test catches broken base-path config. `serve` is pinned to v14 so
  // behavior is reproducible across machines.
  //
  // Windows quoting: when shell:true is passed an argv array, paths with
  // spaces get word-split by cmd.exe (the repo lives under "...DCI Learning
  // Academy/", so this matters). Passing the command as a single pre-quoted
  // string side-steps that — we wrap DEPLOY_DIR in double quotes so cmd.exe
  // keeps it as one arg, and shell:false + shell:true both take this path.
  const quotedDir = `"${DEPLOY_DIR}"`;
  const child = spawn(
    `npx --yes serve@14 ${quotedDir} -l ${port}`,
    { stdio: "inherit", shell: true },
  );

  const shutdown = () => {
    if (!child.killed) child.kill("SIGINT");
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  child.on("exit", (code) => process.exit(code ?? 0));
}

async function main() {
  await buildDeployTree();
  await serveDeployTree();
}

main().catch((err) => {
  console.error("[smoke] Failed:", err.message);
  process.exit(1);
});
