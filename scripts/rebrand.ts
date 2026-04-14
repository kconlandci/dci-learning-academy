#!/usr/bin/env tsx
/**
 * DCI Learning Academy — module rebrand script.
 *
 * Deliberate, one-shot rebranding of a Forge Labs consumer module into a
 * DCI Learning Academy module. Gated by a clean working tree so every run
 * is a single reviewable commit.
 *
 * Usage:
 *   pnpm rebrand cybersecurity
 *
 * Flow (per scripts/rebrand.config.ts):
 *   1. Verify DCI repo working tree is clean.
 *   2. Resolve source repo path (must be under Forge Labs dir).
 *   3. Resolve dest path (must NOT be under Forge Labs dir).
 *   4. Read source git commit SHA + branch for provenance.
 *   5. Blow away dest if it exists (clean-slate regeneration).
 *   6. Copy source → dest, excluding always-ignored paths.
 *   7. Apply deletions (glob patterns).
 *   8. Apply text replacements across text files.
 *   9. Apply stubs (overwrite verbatim; stubs always win).
 *  10. Write .rebrand-meta.json provenance file.
 *  11. Print summary.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fg from "fast-glob";
import { MODULES, type ModuleRebrand, type Replacement } from "./rebrand.config";

const REBRAND_SCRIPT_VERSION = "1.0.0";

// -------------------------------------------------------------------
// Resolve repo + Forge Labs roots
// -------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const FORGE_LABS_ROOT = path.resolve(REPO_ROOT, "..", "Forge Labs");

// -------------------------------------------------------------------
// Always-excluded copy patterns (merged into each module's deletions)
// -------------------------------------------------------------------

const ALWAYS_EXCLUDE_DURING_COPY = [
  "node_modules",
  ".git",
  "dist",
];

// Extensions the text-replacement pass is allowed to touch.
// Anything else (images, fonts, binary) is skipped.
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".json", ".html", ".htm", ".css", ".scss", ".sass",
  ".md", ".mdx", ".txt", ".yml", ".yaml", ".toml",
  ".env", ".example", ".gitignore", ".npmrc",
]);

// -------------------------------------------------------------------
// Safety guards
// -------------------------------------------------------------------

/**
 * Refuse to run if the DCI repo has uncommitted changes — except in paths
 * that are expected to be dirty while iterating on a rebrand:
 *   - apps/<slug>/         (about to be regenerated)
 *   - scripts/rebrand.*    (the script you're actively debugging)
 *   - pnpm-lock.yaml       (shifts around as rebrand devDeps land)
 *
 * The gate's purpose is protecting OTHER work from getting clobbered by a
 * rebrand, not blocking iterative re-runs against the slug you're actively
 * rebranding. Without this carve-out, a failed rebrand would make the next
 * rebrand impossible without a manual `git clean`.
 */
function assertCleanWorkingTree(slug: string): void {
  try {
    const status = execSync("git status --porcelain", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    });
    const slugPrefix = `apps/${slug}/`;
    const alwaysAllowedExact = new Set(["pnpm-lock.yaml"]);
    const alwaysAllowedPrefixes = ["scripts/rebrand."];
    const dirty = status
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .filter((line) => {
        // Porcelain format: "XY path" (2 chars + space + path). Extract path.
        const pathPart = line.slice(3);
        // Rename entries: "R  old -> new" — check the NEW path
        const renameIdx = pathPart.indexOf(" -> ");
        const checkPath = renameIdx >= 0 ? pathPart.slice(renameIdx + 4) : pathPart;
        if (checkPath.startsWith(slugPrefix)) return false;
        if (alwaysAllowedExact.has(checkPath)) return false;
        if (alwaysAllowedPrefixes.some((p) => checkPath.startsWith(p))) return false;
        return true;
      });
    if (dirty.length > 0) {
      console.error(
        `[rebrand] FATAL: working tree has uncommitted changes outside apps/${slug}/:\n`,
      );
      console.error(dirty.join("\n"));
      console.error("\nCommit or stash before rerunning.");
      process.exit(1);
    }
  } catch (err) {
    console.error("[rebrand] FATAL: could not run `git status`. Is this a git repo?");
    console.error(err);
    process.exit(1);
  }
}

/** Refuse to write anywhere under the Forge Labs source tree. */
function assertDestOutsideForgeLabs(destPath: string): void {
  const normalizedDest = path.resolve(destPath);
  const normalizedForge = path.resolve(FORGE_LABS_ROOT);
  if (normalizedDest === normalizedForge || normalizedDest.startsWith(normalizedForge + path.sep)) {
    console.error(
      `[rebrand] FATAL: destination would write inside Forge Labs (${normalizedDest}). ` +
        `Refusing to touch consumer repos.`,
    );
    process.exit(1);
  }
}

/** Read source repo git provenance. Bails if the source isn't a git repo. */
function readSourceGitInfo(sourcePath: string): { commit: string; branch: string } {
  try {
    const commit = execSync("git rev-parse HEAD", {
      cwd: sourcePath,
      encoding: "utf8",
    }).trim();
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd: sourcePath,
      encoding: "utf8",
    }).trim();
    return { commit, branch };
  } catch (err) {
    console.error(`[rebrand] FATAL: could not read git info from ${sourcePath}`);
    console.error(err);
    process.exit(1);
  }
}

// -------------------------------------------------------------------
// Core steps
// -------------------------------------------------------------------

async function copySource(sourcePath: string, destPath: string): Promise<void> {
  // Clean slate
  if (existsSync(destPath)) {
    await rm(destPath, { recursive: true, force: true });
  }
  await mkdir(destPath, { recursive: true });

  // Copy recursively, skipping always-excluded dirs
  await cp(sourcePath, destPath, {
    recursive: true,
    force: true,
    filter: (src) => {
      const rel = path.relative(sourcePath, src);
      if (rel === "") return true;
      const parts = rel.split(path.sep);
      return !ALWAYS_EXCLUDE_DURING_COPY.includes(parts[0]!);
    },
  });
}

async function applyDeletions(destPath: string, patterns: string[]): Promise<number> {
  let removed = 0;
  const matches = await fg(patterns, {
    cwd: destPath,
    dot: true,
    onlyFiles: false,
    markDirectories: false,
    absolute: true,
  });
  // Sort deepest-first so directories don't get walked after children are gone
  matches.sort((a, b) => b.length - a.length);
  for (const match of matches) {
    try {
      await rm(match, { recursive: true, force: true });
      removed++;
    } catch (err) {
      console.warn(`[rebrand] could not remove ${match}: ${(err as Error).message}`);
    }
  }
  return removed;
}

async function applyTextReplacements(
  destPath: string,
  replacements: Replacement[],
): Promise<{ filesTouched: number; substitutions: number }> {
  if (replacements.length === 0) return { filesTouched: 0, substitutions: 0 };

  const files = await fg(["**/*"], {
    cwd: destPath,
    dot: true,
    onlyFiles: true,
    absolute: true,
    ignore: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
  });

  let filesTouched = 0;
  let substitutions = 0;

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    const basename = path.basename(file).toLowerCase();
    const isTextByExt = TEXT_EXTENSIONS.has(ext);
    // Also match dotfiles without extension that are known text (.env, .gitignore, etc.)
    const isTextByName = basename.startsWith(".") && TEXT_EXTENSIONS.has(basename);
    if (!isTextByExt && !isTextByName) continue;

    let content: string;
    try {
      content = await readFile(file, "utf8");
    } catch {
      continue; // skip unreadable files (binary, permission, etc.)
    }

    let modified = false;
    let fileSubs = 0;
    for (const { pattern, replacement } of replacements) {
      const before = content;
      if (pattern instanceof RegExp) {
        content = content.replace(pattern, replacement);
      } else {
        // Plain string — replaceAll for consistency
        content = content.split(pattern).join(replacement);
      }
      if (content !== before) {
        modified = true;
        // Approximate substitution count via length delta / pattern length
        fileSubs++;
      }
    }

    if (modified) {
      await writeFile(file, content, "utf8");
      filesTouched++;
      substitutions += fileSubs;
    }
  }

  return { filesTouched, substitutions };
}

async function applyStubs(
  destPath: string,
  stubs: Record<string, string>,
): Promise<number> {
  let written = 0;
  for (const [relPath, content] of Object.entries(stubs)) {
    const abs = path.resolve(destPath, relPath);
    // Safety: ensure stub targets stay inside dest
    if (!abs.startsWith(path.resolve(destPath) + path.sep) && abs !== path.resolve(destPath)) {
      throw new Error(`Stub path escapes dest: ${relPath}`);
    }
    await mkdir(path.dirname(abs), { recursive: true });
    await writeFile(abs, content, "utf8");
    written++;
  }
  return written;
}

async function writeProvenance(
  destPath: string,
  module: ModuleRebrand,
  sourcePath: string,
  git: { commit: string; branch: string },
): Promise<void> {
  const meta = {
    schemaVersion: 1,
    rebrandScriptVersion: REBRAND_SCRIPT_VERSION,
    module: {
      slug: module.destSlug,
      sourceRepoName: module.sourceRepoName,
    },
    source: {
      path: sourcePath,
      gitCommit: git.commit,
      gitBranch: git.branch,
    },
    rebrandedAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(destPath, ".rebrand-meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const slug = args[0];
  if (!slug) {
    console.error("Usage: pnpm rebrand <module-slug>");
    console.error(`Available modules: ${Object.keys(MODULES).join(", ")}`);
    process.exit(1);
  }

  const module = MODULES[slug];
  if (!module) {
    console.error(`[rebrand] unknown module: ${slug}`);
    console.error(`Available: ${Object.keys(MODULES).join(", ")}`);
    process.exit(1);
  }

  console.log(`[rebrand] module: ${slug}`);
  console.log(`[rebrand] source repo: ${module.sourceRepoName}`);

  // 1. Clean working tree gate (ignores changes under apps/<slug>/)
  assertCleanWorkingTree(slug);

  // 2. Resolve paths
  const sourcePath = path.resolve(FORGE_LABS_ROOT, module.sourceRepoName);
  const destPath = path.resolve(REPO_ROOT, "apps", module.destSlug);

  if (!existsSync(sourcePath)) {
    console.error(`[rebrand] FATAL: source path does not exist: ${sourcePath}`);
    process.exit(1);
  }

  // 3. Safety: dest must be inside repo, outside Forge Labs
  assertDestOutsideForgeLabs(destPath);
  if (!destPath.startsWith(REPO_ROOT + path.sep)) {
    console.error(`[rebrand] FATAL: dest path escapes repo root: ${destPath}`);
    process.exit(1);
  }

  console.log(`[rebrand] source: ${sourcePath}`);
  console.log(`[rebrand] dest:   ${destPath}`);

  // 4. Git provenance from source
  const git = readSourceGitInfo(sourcePath);
  console.log(`[rebrand] source commit: ${git.commit} (${git.branch})`);

  // 5. Verify source sanity
  const srcStat = await stat(sourcePath);
  if (!srcStat.isDirectory()) {
    console.error(`[rebrand] FATAL: source is not a directory: ${sourcePath}`);
    process.exit(1);
  }

  // 6. Copy
  console.log("[rebrand] copying source → dest (clean slate)…");
  await copySource(sourcePath, destPath);

  // 7. Deletions
  console.log("[rebrand] applying deletions…");
  const removed = await applyDeletions(destPath, module.deletions);
  console.log(`[rebrand]   removed ${removed} path${removed === 1 ? "" : "s"}`);

  // 8. Text replacements
  console.log("[rebrand] applying text replacements…");
  const { filesTouched, substitutions } = await applyTextReplacements(
    destPath,
    module.textReplacements,
  );
  console.log(
    `[rebrand]   ${substitutions} substitutions across ${filesTouched} file${filesTouched === 1 ? "" : "s"}`,
  );

  // 9. Stubs
  console.log("[rebrand] writing stubs…");
  const stubbed = await applyStubs(destPath, module.stubs);
  console.log(`[rebrand]   wrote ${stubbed} stub file${stubbed === 1 ? "" : "s"}`);

  // 10. Post-rebrand assertions
  if (module.assertions && module.assertions.length > 0) {
    console.log("[rebrand] checking post-rebrand assertions…");
    let passed = 0;
    for (const assertion of module.assertions) {
      // Expand file as a fast-glob pattern. Literal paths with no glob chars
      // resolve to [that path] if it exists, [] otherwise — which the code
      // below treats as "file not found" for presence checks.
      const matches = await fg([assertion.file], {
        cwd: destPath,
        dot: true,
        onlyFiles: true,
        absolute: true,
      });

      if (!assertion.absent && matches.length === 0) {
        console.error(
          `[rebrand] ASSERTION FAILED: no files matched: ${assertion.file}`,
        );
        console.error(`  ${assertion.description}`);
        process.exit(1);
      }

      for (const absFile of matches) {
        const rel = path.relative(destPath, absFile);
        let content: string;
        try {
          content = await readFile(absFile, "utf8");
        } catch {
          console.error(
            `[rebrand] ASSERTION FAILED: could not read ${rel}`,
          );
          console.error(`  ${assertion.description}`);
          process.exit(1);
        }
        const found = content.includes(assertion.marker);
        if (assertion.absent && found) {
          console.error(
            `[rebrand] ASSERTION FAILED: forbidden marker "${assertion.marker}" still present in ${rel}`,
          );
          console.error(`  ${assertion.description}`);
          process.exit(1);
        }
        if (!assertion.absent && !found) {
          console.error(
            `[rebrand] ASSERTION FAILED: marker "${assertion.marker}" not found in ${rel}`,
          );
          console.error(`  ${assertion.description}`);
          process.exit(1);
        }
      }
      passed++;
    }
    console.log(
      `[rebrand]   ${passed} assertion${passed === 1 ? "" : "s"} passed`,
    );
  }

  // 11. Provenance
  await writeProvenance(destPath, module, sourcePath, git);
  console.log("[rebrand] wrote .rebrand-meta.json");

  console.log("[rebrand] done. Next: pnpm install && pnpm --filter @dci/<slug> typecheck && pnpm build");
}

main().catch((err) => {
  console.error("[rebrand] FATAL:", err);
  process.exit(1);
});

// Silence "imported but unused" complaints for files that exist only for typing
void readFileSync;
void writeFileSync;
