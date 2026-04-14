import type { LabManifest } from "../../types/manifest";

export const blueGreenDeploymentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "blue-green-deployment",
  version: 1,
  title: "Blue-Green Deployment Strategy",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["deployment", "blue-green", "canary", "zero-downtime", "devops"],
  description:
    "Design and execute blue-green and canary deployment strategies for zero-downtime releases, including traffic shifting decisions, rollback triggers, and database migration handling.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Describe the blue-green deployment pattern and when to use it versus canary",
    "Configure traffic shifting percentages and rollback triggers",
    "Handle database schema changes safely during zero-downtime deployments",
    "Identify when to proceed, pause, or roll back a deployment in progress",
  ],
  sortOrder: 609,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "bg-s1",
      title: "Choosing a Deployment Strategy",
      context:
        "A team is deploying a significant update to their e-commerce checkout service. The release includes a new payment provider integration, a database schema migration adding 3 new columns, and UI changes. The service processes $50,000/hour during peak hours. A failed deployment last quarter caused 22 minutes of downtime. The team wants zero downtime this release.",
      displayFields: [
        { label: "Service", value: "E-commerce checkout ($50K/hr revenue)", emphasis: "critical" },
        { label: "Change Scope", value: "New payment provider, DB schema migration, UI changes", emphasis: "warn" },
        { label: "Previous Failure", value: "22 min downtime last quarter", emphasis: "warn" },
        { label: "Zero Downtime Required", value: "Yes", emphasis: "normal" },
        { label: "Rollback Speed Needed", value: "< 2 minutes", emphasis: "normal" },
      ],
      actions: [
        { id: "blue-green-with-backward-compat", label: "Blue-green deployment with backward-compatible DB migration run before traffic shift", color: "green" },
        { id: "in-place-rolling", label: "In-place rolling update (replace old instances one by one)", color: "yellow" },
        { id: "canary-10-percent", label: "Canary deployment starting at 10% traffic to new version", color: "blue" },
        { id: "big-bang-maintenance", label: "Schedule a 30-minute maintenance window for a big-bang deployment", color: "orange" },
      ],
      correctActionId: "blue-green-with-backward-compat",
      rationales: [
        { id: "r-bg-s1-correct", text: "Blue-green is optimal here: it maintains a complete hot-standby (blue) environment that handles all production traffic while the green environment is prepared. Running the backward-compatible DB migration first (additive columns only, no deletes) ensures both environments can read the updated schema. If the green environment fails health checks, traffic is shifted back to blue in under 2 minutes — meeting the rollback requirement." },
        { id: "r-bg-s1-rolling", text: "Rolling updates deploy to a fraction of instances at a time. During the transition, both old and new code run simultaneously, which is problematic for a DB schema migration. If the new schema is not backward-compatible with old code, rolling updates cause mixed-version issues in production traffic." },
        { id: "r-bg-s1-canary", text: "Canary deployments are valuable for validating new features with real user traffic, but they also run both code versions simultaneously. The DB migration concern applies here too. Canary is better suited for feature changes without schema dependencies." },
        { id: "r-bg-s1-bigbang", text: "A 30-minute maintenance window means 30 minutes of downtime during peak hours — $25,000 of lost revenue at $50K/hr. The whole point of the exercise is zero downtime. Big-bang with maintenance windows is the approach blue-green was designed to replace." },
      ],
      correctRationaleId: "r-bg-s1-correct",
      feedback: {
        perfect: "Correct. Blue-green with a pre-migration that is backward-compatible (add columns, don't drop) allows instant rollback to the blue environment while the schema change is already safely in place.",
        partial: "Canary is a good choice for feature validation but requires careful handling when DB migrations are involved. Blue-green is safer here because traffic to blue never touches the in-progress migration path.",
        wrong: "Rolling updates and big-bang both have significant risk here. Blue-green preserves a complete fallback environment and enables instant rollback — the right choice when downtime cost is this high.",
      },
    },
    {
      type: "action-rationale",
      id: "bg-s2",
      title: "Canary Rollback Decision",
      context:
        "A canary deployment is in progress. Version 2.3 is serving 15% of traffic; version 2.2 continues serving 85%. It's been 8 minutes since the canary was started. CloudWatch dashboards are showing the following metrics comparing v2.3 (canary) vs v2.2 (stable).",
      displayFields: [
        { label: "Error Rate — v2.3 (canary)", value: "3.2%", emphasis: "critical" },
        { label: "Error Rate — v2.2 (stable)", value: "0.2%", emphasis: "normal" },
        { label: "P99 Latency — v2.3 (canary)", value: "180ms", emphasis: "normal" },
        { label: "P99 Latency — v2.2 (stable)", value: "210ms", emphasis: "normal" },
        { label: "CPU Usage — v2.3 (canary)", value: "45%", emphasis: "normal" },
        { label: "Canary Traffic Share", value: "15%", emphasis: "normal" },
      ],
      actions: [
        { id: "rollback-canary", label: "Immediately rollback canary — shift all traffic back to v2.2", color: "green" },
        { id: "increase-canary", label: "Increase canary to 50% to get more data points on the error rate", color: "red" },
        { id: "wait-and-observe", label: "Wait another 10 minutes to see if the error rate stabilizes", color: "yellow" },
        { id: "investigate-then-decide", label: "Investigate the specific errors in v2.3 logs before deciding to roll back or proceed", color: "blue" },
      ],
      correctActionId: "rollback-canary",
      rationales: [
        { id: "r-bg-s2-correct", text: "A 16x error rate increase (0.2% → 3.2%) in the canary is a clear rollback signal. This is not a borderline case requiring more data. Increasing canary traffic would expose more users to a known-bad version. The purpose of a canary is precisely to catch this before full rollout — rollback immediately and investigate the errors against a 0% production traffic baseline." },
        { id: "r-bg-s2-increase", text: "Increasing canary traffic to a version with a 16x error rate increase deliberately exposes more users to a broken service. This is the opposite of what canary deployments are designed for." },
        { id: "r-bg-s2-wait", text: "Waiting 10 minutes while 15% of users experience 3.2% errors means approximately 3,200 failed requests for every 100,000 transactions during that window. Time spent waiting is time users spend getting errors. Roll back, then investigate." },
        { id: "r-bg-s2-investigate", text: "Investigation is important but should happen after rollback, not before. Canary rollback takes seconds. Investigation can take minutes to hours. Users are experiencing errors right now — contain first, investigate second." },
      ],
      correctRationaleId: "r-bg-s2-correct",
      feedback: {
        perfect: "Correct. A 16x error rate increase is an unambiguous rollback trigger. The canary has done its job — it caught a problem before full rollout. Roll back, then investigate safely.",
        partial: "Investigating before rollback keeps users in an error state while you gather information you could collect just as well from logs after rolling back. Always rollback first when the signal is this clear.",
        wrong: "The canary data is clear: v2.3 has a 16x worse error rate. The decision threshold for canary rollback should be 2–3x normal error rate — 16x is well past it. Never increase canary traffic on a bad signal.",
      },
    },
    {
      type: "action-rationale",
      id: "bg-s3",
      title: "Database Migration During Blue-Green Switch",
      context:
        "A team is preparing a blue-green deployment that includes removing a column `user_legacy_id` from the users table. The column is still referenced in old query code in the blue (current) environment. The migration plan proposes: 1) Deploy green environment (without legacy_id column), 2) Migrate data, 3) Drop legacy_id column from DB, 4) Shift 100% traffic to green. If something breaks they will rollback to blue.",
      displayFields: [
        { label: "DB Change", value: "DROP COLUMN user_legacy_id", emphasis: "critical" },
        { label: "Column Used In Blue", value: "Yes — present in active query code", emphasis: "critical" },
        { label: "Rollback Plan", value: "Shift traffic back to blue (references dropped column)", emphasis: "critical" },
        { label: "Migration Step Order", value: "Deploy → Migrate → Drop Column → Switch Traffic", emphasis: "warn" },
      ],
      actions: [
        { id: "expand-contract", label: "Use expand-contract pattern: deploy green without referencing legacy_id, then drop column only after blue is decommissioned", color: "green" },
        { id: "proceed-as-planned", label: "Proceed with the current plan — the blue environment won't be used after traffic switches", color: "red" },
        { id: "add-rollback-restore", label: "Proceed with the plan and add a rollback script that adds the column back if needed", color: "yellow" },
        { id: "avoid-schema-change", label: "Postpone the schema change to a separate release with a maintenance window", color: "blue" },
      ],
      correctActionId: "expand-contract",
      rationales: [
        { id: "r-bg-s3-correct", text: "The expand-contract (or parallel change) pattern is the safe approach for destructive schema changes in blue-green deployments. Phase 1 (expand): deploy green code that doesn't use legacy_id but keep the column. Traffic switches to green. Phase 2 (contract): once blue is decommissioned and no code references the column, safely drop it. Rolling back to blue while the column is already dropped would cause immediate query failures." },
        { id: "r-bg-s3-proceed", text: "The current plan drops the column before decommissioning blue. If rollback is needed after the drop, the blue environment tries to query a column that no longer exists — an instant crash. The rollback path is broken before the switch even happens." },
        { id: "r-bg-s3-restore-script", text: "A 'restore column' rollback script adds re-running DDL under incident pressure, which is error-prone and slow. Column restoration also requires repopulating data if any writes occurred to green. Expand-contract avoids the need for this entirely." },
        { id: "r-bg-s3-postpone", text: "Postponing to a maintenance window means accepting downtime for what should be a zero-downtime change. The expand-contract pattern solves this cleanly without a maintenance window." },
      ],
      correctRationaleId: "r-bg-s3-correct",
      feedback: {
        perfect: "Correct. Expand-contract is the industry-standard pattern for zero-downtime schema changes. Separate the deployment of new code from the deletion of old schema by a safe observation period.",
        partial: "A rollback restore script can work but it's fragile under incident pressure. Expand-contract removes the risk entirely by keeping the column available until it's safe to remove.",
        wrong: "Dropping a column while a rollback target still references it makes rollback impossible. The entire value of blue-green is preserved rollback capability. Never destroy the rollback path during deployment.",
      },
    },
  ],
  hints: [
    "For DB schema changes in blue-green deployments, make migrations backward-compatible first. Additive changes (add column) are safe; destructive changes (drop column) require the expand-contract pattern.",
    "A canary rollback trigger should be based on absolute metrics (error rate 2–3x baseline), not relative improvement in other metrics.",
    "The purpose of a canary is to detect problems early. When the signal is clear, roll back immediately — investigate after, not before.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Deployment strategy knowledge is a key differentiator between engineers who cause incidents and those who prevent them. Understanding blue-green, canary, and expand-contract patterns — and knowing when each applies — is a core competency for senior engineers and tech leads at any company shipping to production regularly.",
  toolRelevance: ["AWS CodeDeploy", "AWS ECS", "Kubernetes", "Argo Rollouts", "Spinnaker", "AWS Route 53"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
