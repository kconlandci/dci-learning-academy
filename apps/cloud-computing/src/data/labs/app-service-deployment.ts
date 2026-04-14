import type { LabManifest } from "../../types/manifest";

export const appServiceDeploymentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "app-service-deployment",
  version: 1,
  title: "Azure App Service Deployment Strategies",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "app-service", "deployment", "slots", "blue-green", "ci-cd"],
  description:
    "Choose the right Azure App Service deployment strategy for zero-downtime releases, canary rollouts, and rollback scenarios.",
  estimatedMinutes: 9,
  learningObjectives: [
    "Differentiate deployment slot swap, direct deploy, and container update strategies",
    "Identify when deployment slots enable zero-downtime deployment vs. when they introduce risk",
    "Configure traffic splitting for canary releases using App Service slot traffic percentage",
  ],
  sortOrder: 203,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Zero-Downtime Production Release",
      context:
        "Your team is releasing a new version of a customer-facing Node.js API running on Azure App Service (Standard S2 plan). The last deployment caused 3 minutes of downtime during the cold start period. The app serves ~2,000 requests/minute during business hours and downtime is not acceptable.",
      displayFields: [
        { label: "App Service Plan", value: "Standard S2 (2 vCPU, 3.5 GB RAM)" },
        { label: "Current Traffic", value: "~2,000 requests/minute" },
        { label: "Previous Deployment Method", value: "Direct FTP upload to production slot" },
        { label: "Previous Downtime", value: "3 minutes during cold start" },
        { label: "Deployment Slots Available", value: "Yes (Standard plan supports slots)" },
        { label: "Required Downtime", value: "Zero" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Deploy to a staging slot, warm it up, then perform a slot swap to production",
          color: "green",
        },
        {
          id: "action-b",
          label: "Deploy directly to the production slot during off-peak hours (2 AM)",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Stop the production app, deploy the new code, restart the app",
          color: "red",
        },
        {
          id: "action-d",
          label: "Create a new App Service instance with the new code and update DNS CNAME",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Deployment slots are designed for exactly this scenario. Deploy to staging, send warm-up requests until the app is fully initialized, then swap. The swap operation is near-instantaneous (a routing redirect) so production receives no cold-start period. If issues arise, swap back in seconds.",
        },
        {
          id: "rationale-b",
          text: "Deploying during off-peak hours reduces user impact but does not eliminate downtime. A 3-minute cold start still occurs and some traffic at 2 AM still hits the service. This is a workaround, not a solution.",
        },
        {
          id: "rationale-c",
          text: "Stopping the production slot creates guaranteed downtime equal to the deployment time plus cold start — worse than the current approach. This is the worst possible strategy for a zero-downtime requirement.",
        },
        {
          id: "rationale-d",
          text: "Creating a parallel App Service and switching DNS works but has a TTL propagation delay (typically 5–60 minutes depending on DNS TTL settings), doubles resource cost during the transition, and is far more complex to roll back than a slot swap.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Deployment slots with warm-up before swap is the standard Azure App Service pattern for zero-downtime deployments.",
        partial:
          "You chose a lower-impact approach but it still causes downtime. The zero-downtime requirement can only be met by pre-warming a staging slot before swapping.",
        wrong:
          "This approach guarantees downtime. Never stop a production app service for a routine deployment when slots are available.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Canary Release — Catching a Regression Early",
      context:
        "Your team wants to gradually roll out a major feature update to 5% of production traffic before a full release. The update rewrites the checkout flow which accounts for 30% of revenue. A regression in this flow 3 months ago cost $80K in lost sales. You need a way to test with real traffic while limiting blast radius.",
      displayFields: [
        { label: "Feature Risk", value: "High — checkout flow rewrite" },
        { label: "Target Canary Percentage", value: "5% of production traffic" },
        { label: "Previous Regression Impact", value: "$80K lost sales" },
        { label: "App Service Plan", value: "Premium P2v3" },
        { label: "Monitoring", value: "Application Insights attached" },
        { label: "Rollback Time Requirement", value: "< 2 minutes" },
      ],
      evidence: [
        "Azure Portal > App Service > Deployment Slots: production (100%), staging (0%). Traffic % field is editable per slot.",
      ],
      actions: [
        {
          id: "action-a",
          label: "Deploy to staging slot, set slot traffic to 5%, monitor Application Insights error rate for 24 hours, then ramp up",
          color: "green",
        },
        {
          id: "action-b",
          label: "Deploy to production and use a feature flag in code to show the new checkout to 5% of users",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Deploy to a separate App Service in a different region and route 5% via Traffic Manager",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Deploy to staging slot with 5% traffic, but skip Application Insights monitoring to reduce noise",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Deployment slot traffic splitting is the native Azure mechanism for canary releases. Setting the staging slot to 5% traffic allows real users to hit the new code while 95% remain on the stable version. Application Insights lets you compare error rates, response times, and conversion metrics between slots in real time. If a regression is detected, set the slot back to 0% immediately.",
        },
        {
          id: "rationale-b",
          text: "Feature flags in code work but mean both code versions run in the same process — a fatal error in the new checkout path could still crash the entire app process, affecting all users. Slot-based canary isolates the new code in a separate instance entirely.",
        },
        {
          id: "rationale-c",
          text: "Traffic Manager geographic/weighted routing could achieve this but requires a separate App Service plan (double cost), separate deployment pipelines, and more complex rollback. Slot-based traffic splitting is far simpler and cheaper for intra-region canary tests.",
        },
        {
          id: "rationale-d",
          text: "Skipping Application Insights during a canary defeats the purpose of the canary. Without telemetry comparison between slots, you have no signal to detect the regression that cost $80K last time. Never disable monitoring during a staged rollout.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Perfect. Slot traffic splitting with Application Insights comparison is the canonical Azure canary release pattern for App Service.",
        partial:
          "Your approach achieves partial isolation but misses either the monitoring needed to detect regressions or the clean rollback capability of slot swapping.",
        wrong:
          "Disabling monitoring during a canary release is the exact opposite of the goal. The whole point is to observe metrics in production at limited blast radius.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Configuration Not Swapping — Slot-Sticky Settings",
      context:
        "After a slot swap, your production app is using the staging database connection string instead of the production database. Investigation reveals the connection string was stored as a regular App Service application setting (not slot-specific). All staging users were hitting production data during the canary period.",
      displayFields: [
        { label: "Setting Name", value: "DATABASE_CONNECTION_STRING" },
        { label: "Setting Type", value: "Application Setting (not slot-sticky)" },
        { label: "Staging Value", value: "Server=staging-sql.database.windows.net;..." },
        { label: "Production Value Before Swap", value: "Server=prod-sql.database.windows.net;..." },
        { label: "Production Value After Swap", value: "Server=staging-sql.database.windows.net;... (WRONG)" },
        { label: "Impact", value: "Production app connected to staging DB for 47 minutes" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Mark DATABASE_CONNECTION_STRING as a deployment slot setting (sticky), then re-configure each slot with its correct value",
          color: "green",
        },
        {
          id: "action-b",
          label: "Store the connection string in code and redeploy — never use App Settings for secrets",
          color: "red",
        },
        {
          id: "action-c",
          label: "Use different App Service plans for staging and production to prevent settings from sharing",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Add a post-swap script that overwrites the connection string after every swap",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Marking a setting as a deployment slot setting (slot-sticky) means it stays with the slot when a swap occurs — it does not travel with the deployment. Each slot retains its own value for sticky settings, which is exactly what environment-specific settings like DB connection strings require.",
        },
        {
          id: "rationale-b",
          text: "Hardcoding credentials in source code is a critical security violation — it exposes secrets in version control, prevents rotation without redeployment, and removes the ability to differentiate environments at runtime. This is never the right answer.",
        },
        {
          id: "rationale-c",
          text: "Separate App Service plans do prevent settings from traveling together, but they also prevent slot swaps (slots must be in the same App Service plan). You would lose the zero-downtime swap benefit entirely.",
        },
        {
          id: "rationale-d",
          text: "A post-swap overwrite script is brittle — it runs outside the atomic swap operation, could fail, and leaves a window where production uses wrong settings. Slot-sticky settings solve this cleanly without requiring any post-deployment scripts.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Exactly right. Environment-specific settings like connection strings must always be marked as slot-sticky so they stay bound to their slot during swaps.",
        partial:
          "You identified that the current approach is broken but chose a workaround rather than the correct native solution. Post-swap scripts and separate plans introduce new failure modes.",
        wrong:
          "Hardcoding secrets in code creates far worse problems than environment-specific settings traveling during a swap. Always use App Settings with proper slot-sticky configuration.",
      },
    },
  ],
  hints: [
    "A slot swap is nearly instantaneous because it only changes the routing pointer — the new code is already running and warmed up in the staging slot before the swap occurs.",
    "Application settings that should be environment-specific (database connections, API keys, feature flags) must be marked 'Deployment slot setting' to prevent them from traveling with the code during a swap.",
    "Traffic percentage on deployment slots is the native Azure canary mechanism — set the new version slot to 5–10% traffic, observe metrics in Application Insights, then ramp up or roll back.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Deployment strategies directly affect availability SLAs and incident rates. Azure App Service deployment slots are one of the platform's most valuable features for production engineering teams — understanding slot mechanics, slot-sticky settings, and traffic splitting will make you immediately useful in any DevOps or SRE role using Azure.",
  toolRelevance: ["Azure Portal", "Azure CLI", "Azure DevOps", "Application Insights", "GitHub Actions"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
