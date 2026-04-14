import type { LabManifest } from "../../types/manifest";

export const cicdPipelineDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cicd-pipeline-design",
  version: 1,
  title: "CI/CD Pipeline Design",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["devops", "cicd", "pipeline", "automation", "github-actions"],
  description:
    "Design effective CI/CD pipelines by selecting the right stage order, parallelization strategies, and failure handling for real-world deployment scenarios.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Identify the optimal stage order for a CI/CD pipeline",
    "Recognize when to parallelize pipeline stages for speed",
    "Apply fail-fast principles to reduce wasted build time",
    "Match deployment strategies to pipeline requirements",
  ],
  sortOrder: 600,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "cicd-s1",
      title: "Slow Pipeline Bottleneck",
      context:
        "A team's GitHub Actions pipeline runs: lint → unit tests → integration tests → build Docker image → push to ECR → deploy to staging. Total duration is 22 minutes. Lint takes 1 min, unit tests 3 min, integration tests 12 min, Docker build 4 min, push 1 min, deploy 1 min. Developers complain the feedback loop is too slow for unit test failures.",
      displayFields: [
        { label: "Total Pipeline Duration", value: "22 minutes", emphasis: "warn" },
        { label: "Unit Test Duration", value: "3 minutes", emphasis: "normal" },
        { label: "Integration Test Duration", value: "12 minutes (sequential after unit)", emphasis: "warn" },
        { label: "Docker Build", value: "4 minutes", emphasis: "normal" },
        { label: "Failure Rate", value: "Unit tests fail 30% of runs", emphasis: "critical" },
      ],
      actions: [
        { id: "parallelize-lint-unit", label: "Run lint and unit tests in parallel as the first stage", color: "green" },
        { id: "remove-integration", label: "Remove integration tests from the pipeline to speed it up", color: "red" },
        { id: "parallelize-unit-integration", label: "Run unit tests and integration tests in parallel", color: "yellow" },
        { id: "cache-docker-layers", label: "Add Docker layer caching to speed up the build step", color: "blue" },
      ],
      correctActionId: "parallelize-lint-unit",
      rationales: [
        { id: "r-parallel-lint-unit", text: "Lint and unit tests are independent checks. Running them in parallel cuts the first-stage time to ~3 minutes, giving developers fast feedback on the most common failure type before spending time on integration tests." },
        { id: "r-remove-integration-wrong", text: "Removing integration tests trades pipeline speed for safety. Integration tests catch contract bugs and environment issues that unit tests miss — removing them increases production risk." },
        { id: "r-parallel-unit-integration-wrong", text: "Running integration tests in parallel with unit tests wastes compute on a 12-minute test suite when a 3-minute unit test might already indicate a failure. Fail-fast ordering matters." },
        { id: "r-docker-cache-minor", text: "Docker layer caching is a good optimization but saves at most 2–3 minutes on the build step, not the bottleneck. It doesn't address the slow unit test feedback loop." },
      ],
      correctRationaleId: "r-parallel-lint-unit",
      feedback: {
        perfect: "Correct. Parallelizing lint and unit tests gives developers the fastest possible feedback on the two most common failure modes before committing time to slow integration tests.",
        partial: "You improved pipeline speed, but not the right bottleneck. The core issue is that unit test failures (30% of runs) wait behind sequential stages. Fail-fast means cheap checks must run first.",
        wrong: "Pipeline optimization requires preserving test coverage while reducing time-to-feedback. Removing tests is not optimization. Focus on parallelizing independent stages early in the pipeline.",
      },
    },
    {
      type: "action-rationale",
      id: "cicd-s2",
      title: "Multi-Environment Deployment Strategy",
      context:
        "A SaaS company deploys to three environments: dev, staging, and production. Currently every push to main triggers a sequential deploy to all three. A bad deploy to staging occasionally blocks urgent production hotfixes because the pipeline is still running. The team wants production deploys to require manual approval but remain automated to dev and staging.",
      displayFields: [
        { label: "Current Flow", value: "push → dev → staging → prod (all automated)", emphasis: "warn" },
        { label: "Prod Deploy Gate", value: "None (fully automated)", emphasis: "critical" },
        { label: "Hotfix Blocker", value: "Active staging deploy blocks prod pipeline", emphasis: "critical" },
        { label: "Team Size", value: "12 engineers, 2 releases/day average", emphasis: "normal" },
      ],
      actions: [
        { id: "add-manual-approval", label: "Add a manual approval gate before production and make prod deploy a separate workflow", color: "green" },
        { id: "deploy-only-prod", label: "Only deploy to production on main, skip dev and staging", color: "red" },
        { id: "sequential-with-lock", label: "Keep sequential deploys but add a pipeline lock so only one runs at a time", color: "yellow" },
        { id: "feature-flags-only", label: "Replace environment deploys with feature flags toggled in production", color: "blue" },
      ],
      correctActionId: "add-manual-approval",
      rationales: [
        { id: "r-manual-approval", text: "Separating the production deploy into its own workflow with a manual approval gate solves both problems: staging deploys no longer block production, and human judgment is required before prod changes go live." },
        { id: "r-skip-environments-wrong", text: "Skipping dev and staging removes the safety net that catches environment-specific bugs before they reach users. This increases production incident risk significantly." },
        { id: "r-pipeline-lock-wrong", text: "A global pipeline lock serializes all deploys and makes the blocking problem worse. Engineers would wait even longer for production deploys during active staging runs." },
        { id: "r-feature-flags-incomplete", text: "Feature flags are a good complementary strategy but do not replace environment isolation. You still need staging to validate infrastructure changes, dependency upgrades, and configuration drift." },
      ],
      correctRationaleId: "r-manual-approval",
      feedback: {
        perfect: "Exactly right. Decoupling the production workflow and adding a manual gate gives you automation where it's safe and human control where risk is highest.",
        partial: "You recognized the approval need but didn't address the pipeline coupling issue. Keeping prod as part of the same workflow still allows staging runs to delay it.",
        wrong: "The goal is safer, faster production deployments — not fewer environments. Isolate the production workflow and add approval gates rather than reducing test coverage.",
      },
    },
    {
      type: "action-rationale",
      id: "cicd-s3",
      title: "Pipeline Secret Exposure Risk",
      context:
        "A security audit flags that a GitHub Actions workflow is printing environment variables to the build log using `env` commands for debugging. The workflow uses secrets for AWS credentials, a database password, and a Slack webhook. Several logs are accessible to all 80 engineers in the organization's GitHub org.",
      displayFields: [
        { label: "Secrets in Use", value: "AWS_ACCESS_KEY_ID, DB_PASSWORD, SLACK_WEBHOOK", emphasis: "critical" },
        { label: "Log Visibility", value: "All 80 org members can read workflow logs", emphasis: "critical" },
        { label: "Debug Commands", value: "`env` and `printenv` present in 3 workflow files", emphasis: "critical" },
        { label: "Secret Storage", value: "GitHub Actions Secrets (encrypted at rest)", emphasis: "normal" },
      ],
      actions: [
        { id: "remove-debug-mask-secrets", label: "Remove debug env commands, audit all workflow steps for secret exposure, and add secret masking", color: "green" },
        { id: "restrict-log-access", label: "Make all GitHub Actions logs private so only admins can read them", color: "yellow" },
        { id: "rotate-and-ignore", label: "Rotate the exposed secrets and leave the workflows unchanged", color: "red" },
        { id: "move-to-jenkins", label: "Migrate the pipelines to a self-hosted Jenkins to avoid GitHub log exposure", color: "blue" },
      ],
      correctActionId: "remove-debug-mask-secrets",
      rationales: [
        { id: "r-remove-debug-mask", text: "Eliminating the root cause (debug commands that print secrets) combined with GitHub's built-in secret masking (add:mask) is the most direct fix. It prevents future accidental exposure without restricting team visibility into builds." },
        { id: "r-restrict-logs-incomplete", text: "Hiding logs from engineers degrades their ability to debug pipeline failures and doesn't fix the underlying issue — secrets are still being printed. Security by obscurity is not sufficient." },
        { id: "r-rotate-only-wrong", text: "Rotating secrets addresses the immediate exposure but leaves the vulnerability intact. The next run will print the new secrets. You must fix the pipeline code." },
        { id: "r-migrate-jenkins-excessive", text: "Migrating CI platforms is a massive engineering effort for a problem that is solved by removing three debug commands. Platform migration introduces new risks without targeting the actual issue." },
      ],
      correctRationaleId: "r-remove-debug-mask",
      feedback: {
        perfect: "Correct. Fix the root cause first — remove the debug commands and audit for similar patterns — then add masking as a defense-in-depth measure.",
        partial: "Rotating secrets is necessary after a confirmed exposure, but it doesn't close the vulnerability. The pipeline will keep printing secrets until the debug commands are removed.",
        wrong: "Address the vulnerability at its source: the workflow code is printing secrets. Hiding logs or changing platforms doesn't fix the code that causes the exposure.",
      },
    },
  ],
  hints: [
    "In CI/CD, fail-fast means cheaper and faster checks should always run before slow, expensive ones.",
    "Separate workflows for different environments allow independent triggers and approval gates.",
    "GitHub Actions automatically masks values stored as Secrets, but only if they are never explicitly printed.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "CI/CD design is a core DevOps competency evaluated in virtually every SRE and platform engineering interview. Engineers who can articulate pipeline structure tradeoffs — parallelism, fail-fast ordering, environment promotion gates, and secret hygiene — are the ones teams rely on to build reliable delivery systems.",
  toolRelevance: ["GitHub Actions", "Jenkins", "CircleCI", "GitLab CI", "AWS CodePipeline"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
