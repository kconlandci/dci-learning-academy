# DCI Learning Academy

Unified web portal and lab platform for DCI — The Learning Academy. Six training modules (Cybersecurity, Programming, Data Analytics, Cloud Computing, Networking, IT Support) forked and rebranded from the Forge Labs consumer apps, served from a single monorepo and deployed to GitHub Pages.

## Structure

```
dci-learning-academy/
├── apps/
│   ├── portal/              # Landing page, access gate, instructor view
│   ├── cybersecurity/       # From ThreatForge
│   ├── programming/         # From CodeForge
│   ├── data-analytics/      # From DataForge
│   ├── cloud-computing/     # From CloudForge
│   ├── networking/          # From NetForge
│   └── it-support/          # From TechForge
├── shared/                  # Auth, progress, student ID, shared UI
├── scripts/                 # Rebranding automation
└── .github/workflows/       # GitHub Pages deploy
```

## Stack

React 19 · TypeScript · Vite 8 · Tailwind v4 · Firebase Firestore · pnpm workspaces · GitHub Pages

## Status

Early scaffolding — Week 1 of the fast-track build (portal + Cybersecurity module proof of concept).
