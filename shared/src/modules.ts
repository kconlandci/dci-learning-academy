/**
 * Module registry — canonical list of DCI learning modules.
 *
 * Single source of truth for module slug ↔ display name ↔ deploy path.
 * Used by the portal landing page, the instructor view, and the rebrand
 * script. Adding a new module? Add it here and nowhere else.
 */

export interface DciModule {
  /** URL slug and Firestore `module` field value */
  slug: string;
  /** Human-readable name shown in UI */
  name: string;
  /** One-line tagline for module tiles */
  tagline: string;
  /** Forge Labs source repo name (used by the rebrand script) */
  sourceRepo: string;
}

export const MODULES: readonly DciModule[] = [
  {
    slug: "cybersecurity",
    name: "DCI Cybersecurity Labs",
    tagline: "Hands-on cybersecurity fundamentals and threat analysis",
    sourceRepo: "ThreatForge",
  },
  {
    slug: "programming",
    name: "DCI Programming Labs",
    tagline: "Software development foundations with real coding exercises",
    sourceRepo: "CodeForge",
  },
  {
    slug: "data-analytics",
    name: "DCI Data Analytics Labs",
    tagline: "Data exploration, analysis, and visualization practice",
    sourceRepo: "DataForge",
  },
  {
    slug: "cloud-computing",
    name: "DCI Cloud Computing Labs",
    tagline: "Cloud platform fundamentals and infrastructure basics",
    sourceRepo: "CloudForge",
  },
  {
    slug: "networking",
    name: "DCI Networking Labs",
    tagline: "Network concepts, protocols, and troubleshooting skills",
    sourceRepo: "NetForge",
  },
  {
    slug: "it-support",
    name: "DCI IT Support Labs",
    tagline: "Help desk skills and IT support fundamentals",
    sourceRepo: "TechForge",
  },
] as const;

export function getModule(slug: string): DciModule | undefined {
  return MODULES.find((m) => m.slug === slug);
}
