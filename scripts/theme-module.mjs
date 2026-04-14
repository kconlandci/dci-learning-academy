#!/usr/bin/env node
// Apply DCI white/teal theme tokens to a module app.
// Usage: node scripts/theme-module.mjs <module-slug>
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const slug = process.argv[2];
if (!slug) { console.error("usage: node scripts/theme-module.mjs <slug>"); process.exit(1); }
const ROOT = `apps/${slug}/src`;

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(e)) out.push(p);
  }
  return out;
}
const files = walk(ROOT);

const replacements = [
  [/bg-slate-900\b/g, "bg-white"],
  [/bg-slate-800\/50\b/g, "bg-[#1E293B]"],
  [/bg-slate-800\b/g, "bg-[#F5F5F5]"],
  [/bg-slate-750\b/g, "bg-gray-200"],
  [/bg-slate-700\b/g, "bg-gray-200"],
  [/bg-slate-600\b/g, "bg-gray-300"],
  [/active:bg-slate-750\b/g, "active:bg-gray-300"],
  [/active:bg-slate-700\b/g, "active:bg-gray-200"],
  [/hover:bg-slate-700\b/g, "hover:bg-gray-200"],
  [/hover:bg-slate-600\b/g, "hover:bg-gray-300"],
  [/border-slate-800\b/g, "border-gray-200"],
  [/border-slate-700\b/g, "border-gray-200"],
  [/border-slate-600\b/g, "border-gray-300"],
  [/border-slate-500\b/g, "border-gray-400"],
  [/hover:border-slate-500\b/g, "hover:border-gray-400"],
  [/text-white\b/g, "text-[#1A1A1A]"],
  [/text-slate-100\b/g, "text-[#1A1A1A]"],
  [/text-slate-200\b/g, "text-[#1A1A1A]"],
  [/text-slate-300\b/g, "text-gray-500"],
  [/text-slate-400\b/g, "text-gray-500"],
  [/text-slate-500\b/g, "text-gray-400"],
  [/bg-violet-500\/30\b/g, "bg-[#2A7F6F]/30"],
  [/bg-violet-500\/20\b/g, "bg-[#2A7F6F]/10"],
  [/bg-violet-500\/15\b/g, "bg-[#2A7F6F]/10"],
  [/bg-violet-500\/10\b/g, "bg-[#2A7F6F]/10"],
  [/bg-violet-500\b/g, "bg-[#2A7F6F]"],
  [/bg-violet-600\b/g, "bg-[#2A7F6F]"],
  [/hover:bg-violet-600\b/g, "hover:bg-[#2A7F6F]/80"],
  [/text-violet-300\b/g, "text-[#2A7F6F]"],
  [/text-violet-400\b/g, "text-[#2A7F6F]"],
  [/text-violet-500\b/g, "text-[#2A7F6F]"],
  [/border-violet-500\/30\b/g, "border-[#2A7F6F]/30"],
  [/border-violet-500\b/g, "border-[#2A7F6F]"],
  [/active:bg-violet-500\b/g, "active:bg-[#2A7F6F]/80"],
  [/active:bg-violet-600\b/g, "active:bg-[#2A7F6F]/80"],
  // Amber/yellow text contrast fix: source apps used 400/300 shades for
  // icons and accents — fine contrast on slate-900, fails WCAG AA on white.
  // Darken to 600 for text/icon usage only. bg-amber-* CTAs are untouched
  // since amber-500 + dark text has acceptable contrast.
  [/\btext-amber-400\b/g, "text-amber-600"],
  [/\btext-amber-300\b/g, "text-amber-600"],
  [/\btext-yellow-400\b/g, "text-yellow-600"],
  [/\btext-yellow-300\b/g, "text-yellow-600"],
  [/\bhover:text-amber-400\b/g, "hover:text-amber-600"],
  [/\bhover:text-amber-300\b/g, "hover:text-amber-600"],
  // Indigo (some modules used indigo instead of violet)
  [/bg-indigo-500\/30\b/g, "bg-[#2A7F6F]/30"],
  [/bg-indigo-500\/20\b/g, "bg-[#2A7F6F]/10"],
  [/bg-indigo-500\/10\b/g, "bg-[#2A7F6F]/10"],
  [/bg-indigo-500\b/g, "bg-[#2A7F6F]"],
  [/bg-indigo-600\b/g, "bg-[#2A7F6F]"],
  [/hover:bg-indigo-600\b/g, "hover:bg-[#2A7F6F]/80"],
  [/text-indigo-300\b/g, "text-[#2A7F6F]"],
  [/text-indigo-400\b/g, "text-[#2A7F6F]"],
  [/text-indigo-500\b/g, "text-[#2A7F6F]"],
  [/border-indigo-500\/30\b/g, "border-[#2A7F6F]/30"],
  [/border-indigo-500\b/g, "border-[#2A7F6F]"],
];

let totalHits = 0, filesChanged = 0;
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  let out = raw;
  for (const [p, r] of replacements) out = out.replace(p, r);
  // Fix: teal bg + dark text → teal bg + white text
  out = out
    .replace(/bg-\[#2A7F6F\](\/\d+)? text-\[#1A1A1A\]/g, (_m, o) => `bg-[#2A7F6F]${o || ""} text-white`)
    .replace(/text-\[#1A1A1A\] (bg-\[#2A7F6F\])(\/\d+)?/g, "text-white $1$2");
  if (out !== raw) {
    writeFileSync(file, out);
    const before = (raw.match(/slate-|violet-|indigo-/g) || []).length;
    const after = (out.match(/slate-|violet-|indigo-/g) || []).length;
    console.log(`${file}: ${before - after} swaps`);
    totalHits += before - after;
    filesChanged++;
  }
}
console.log(`\nTotal: ${totalHits} class swaps across ${filesChanged} files`);
