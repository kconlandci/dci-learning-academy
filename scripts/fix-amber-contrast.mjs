#!/usr/bin/env node
// Fix amber/yellow text contrast on white DCI theme.
// text-amber-400/300 and text-yellow-400/300 → text-amber-600/text-yellow-600
// Does NOT touch bg-amber-* (backgrounds remain as CTA accents).
// Usage: node scripts/fix-amber-contrast.mjs <module-slug>
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/fix-amber-contrast.mjs <slug>"); process.exit(1); }
const ROOT = `apps/${slug}/src`;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}

const replacements = [
  [/\btext-amber-400\b/g, "text-amber-600"],
  [/\btext-amber-300\b/g, "text-amber-600"],
  [/\btext-yellow-400\b/g, "text-yellow-600"],
  [/\btext-yellow-300\b/g, "text-yellow-600"],
  [/\bhover:text-amber-400\b/g, "hover:text-amber-600"],
  [/\bhover:text-amber-300\b/g, "hover:text-amber-600"],
];

const files = walk(ROOT);
let totalHits = 0, filesChanged = 0;
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  let out = raw;
  for (const [p, r] of replacements) out = out.replace(p, r);
  if (out !== raw) {
    writeFileSync(file, out);
    const before = (raw.match(/text-(amber|yellow)-(400|300)/g) || []).length;
    const after = (out.match(/text-(amber|yellow)-(400|300)/g) || []).length;
    console.log(`${file}: ${before - after} swaps`);
    totalHits += before - after;
    filesChanged++;
  }
}
console.log(`\nTotal: ${totalHits} text-color swaps across ${filesChanged} files`);
