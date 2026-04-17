/**
 * Module registry — canonical list of DCI learning modules.
 *
 * Single source of truth for module slug ↔ display name ↔ deploy path.
 * Used by the portal landing page, the instructor view, and the rebrand
 * script. Adding a new module? Add it here and nowhere else.
 *
 * labCount is derived at build time from LAB_CATALOG so it can never
 * drift from the actual manifest count — see getLabCount() below.
 */

import { LAB_CATALOG } from "./generated/labCatalog";

export interface DciModule {
  /** URL slug and Firestore `module` field value */
  slug: string;
  /** Full in-module name (used inside HomeScreen/SettingsScreen headers) */
  name: string;
  /** Short subject name — used on portal tiles and any compact UI surface */
  shortName: string;
  /** One-line tagline for module tiles */
  tagline: string;
  /** Forge Labs source repo name (used by the rebrand script) */
  sourceRepo: string;
  /** Total lab count — derived from LAB_CATALOG, not hand-maintained. */
  readonly labCount: number;
  /** True once the module has been rebranded and wired into the portal. */
  available: boolean;
}

const LAB_COUNT_BY_SLUG: ReadonlyMap<string, number> = (() => {
  const map = new Map<string, number>();
  for (const entry of LAB_CATALOG) {
    map.set(entry.moduleSlug, (map.get(entry.moduleSlug) ?? 0) + 1);
  }
  return map;
})();

function getLabCount(slug: string): number {
  return LAB_COUNT_BY_SLUG.get(slug) ?? 0;
}

// Market-demand-first ordering.
export const MODULES: readonly DciModule[] = [
  {
    slug: "cybersecurity",
    name: "DCI Cybersecurity Scenarios",
    shortName: "Cybersecurity",
    tagline: "Hands-on cybersecurity fundamentals and threat analysis",
    sourceRepo: "ThreatForge",
    labCount: getLabCount("cybersecurity"),
    available: true,
  },
  {
    slug: "cloud-computing",
    name: "DCI Cloud Computing Scenarios",
    shortName: "Cloud Computing",
    tagline: "Cloud platform fundamentals and infrastructure basics",
    sourceRepo: "CloudForge",
    labCount: getLabCount("cloud-computing"),
    available: true,
  },
  {
    slug: "data-analytics",
    name: "DCI Data Analytics Scenarios",
    shortName: "Data Analytics",
    tagline: "Data exploration, analysis, and visualization practice",
    sourceRepo: "DataForge",
    labCount: getLabCount("data-analytics"),
    available: true,
  },
  {
    slug: "programming",
    name: "DCI Secure Development Scenarios",
    shortName: "Secure Dev",
    tagline: "AppSec Training",
    sourceRepo: "CodeForge",
    labCount: getLabCount("programming"),
    available: true,
  },
  {
    slug: "networking",
    name: "DCI Networking Scenarios",
    shortName: "Networking",
    tagline: "Network concepts, protocols, and troubleshooting skills",
    sourceRepo: "NetForge",
    labCount: getLabCount("networking"),
    available: true,
  },
  {
    slug: "it-support",
    name: "DCI IT Support Scenarios",
    shortName: "IT Support",
    tagline: "Help desk skills and IT support fundamentals",
    sourceRepo: "TechForge",
    labCount: getLabCount("it-support"),
    available: true,
  },
];

export function getModule(slug: string): DciModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
