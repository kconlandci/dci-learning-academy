import type { LabManifest } from "../../types/manifest";

export const twelveFactorAppReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "twelve-factor-app-review",
  version: 1,
  title: "Twelve-Factor App Methodology Review",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["architecture", "twelve-factor", "cloud-native", "microservices", "configuration", "statelessness"],
  description:
    "Evaluate cloud applications against the twelve-factor methodology to identify architectural violations and recommend improvements. Practice assessing codebase structure, configuration management, statelessness, and disposability in real-world application scenarios.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Identify violations of the twelve-factor methodology in existing application architectures",
    "Apply the config factor to externalize environment-specific settings from application code",
    "Evaluate statelessness and disposability requirements for cloud-native applications",
    "Recommend architectural changes to align legacy applications with twelve-factor principles",
  ],
  sortOrder: 413,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "12f-s1-config-in-code",
      title: "Hardcoded Configuration in Production Application",
      context:
        "During a code review, you discover that a production Node.js application has database connection strings, API keys, and feature flags hardcoded in a config.json file committed to the Git repository. The application runs on ECS Fargate across dev, staging, and production environments. Deployments require changing values in config.json and rebuilding the Docker image for each environment.",
      displayFields: [
        { label: "Violation", value: "Factor III (Config) — configuration stored in code", emphasis: "critical" },
        { label: "Impact", value: "Separate Docker builds per environment, secrets in Git", emphasis: "warn" },
        { label: "Environments", value: "Dev, Staging, Production — each with different config", emphasis: "normal" },
        { label: "Current Process", value: "Edit config.json → rebuild image → deploy", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Move configuration to environment variables injected at runtime via ECS task definition, with secrets stored in AWS Secrets Manager", color: "green" },
        { id: "a2", label: "Create separate config files (config.dev.json, config.staging.json, config.prod.json) in the repository", color: "red" },
        { id: "a3", label: "Encrypt the config.json file in the repository using git-crypt", color: "yellow" },
        { id: "a4", label: "Move config.json to an S3 bucket and download it at container startup", color: "orange" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Environment variables are the twelve-factor prescribed mechanism for configuration. They enable one build artifact to run in any environment, and Secrets Manager handles sensitive values with rotation and audit capabilities." },
        { id: "r2", text: "Multiple config files per environment still store configuration in code and still require different builds or build-time selection logic — this violates the same factor." },
        { id: "r3", text: "Encrypting the file protects secrets at rest in Git but doesn't solve the fundamental problem: configuration is still coupled to the codebase and requires rebuilds per environment." },
        { id: "r4", text: "S3 externalizes configuration but introduces a runtime dependency on S3 availability and doesn't leverage the platform's native configuration injection (ECS task definition environment variables)." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Factor III mandates strict separation of config from code. Environment variables injected at runtime enable a single build artifact across all environments — the core twelve-factor principle.",
        partial: "You're improving secrets management but not fully separating config from code. The twelve-factor approach uses environment variables so one image runs everywhere.",
        wrong: "Configuration must be completely separated from the codebase. The twelve-factor methodology specifically prescribes environment variables as the mechanism for environment-specific configuration.",
      },
    },
    {
      type: "action-rationale",
      id: "12f-s2-sticky-sessions",
      title: "Stateful Web Application Using Sticky Sessions",
      context:
        "A Java web application stores user session data in local server memory and relies on ALB sticky sessions (session affinity) to route returning users to the same EC2 instance. During a scaling event, new instances receive no existing sessions and users report being logged out. When an instance fails a health check and is terminated, all sessions on that instance are permanently lost.",
      displayFields: [
        { label: "Violation", value: "Factor VI (Processes) — stateful processes with sticky sessions", emphasis: "critical" },
        { label: "Session Storage", value: "In-memory on individual EC2 instances", emphasis: "warn" },
        { label: "Scaling Issue", value: "New instances have no sessions; terminated instances lose all sessions", emphasis: "critical" },
        { label: "Current Mitigation", value: "ALB sticky sessions (cookie-based affinity)", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Migrate session storage to Amazon ElastiCache (Redis) and remove sticky sessions from the ALB", color: "green" },
        { id: "a2", label: "Increase the health check grace period so instances have more time before being terminated", color: "red" },
        { id: "a3", label: "Replicate in-memory sessions between instances using a session replication framework", color: "orange" },
        { id: "a4", label: "Use longer sticky session cookie durations to keep users on the same instance longer", color: "yellow" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Factor VI requires processes to be stateless and share-nothing. Externalizing sessions to Redis makes every instance identical and disposable — any instance can serve any user, enabling true horizontal scaling and fault tolerance." },
        { id: "r2", text: "Extending health check timers delays failure detection and doesn't address the root cause: sessions are lost when instances terminate because state is stored locally." },
        { id: "r3", text: "Session replication between instances adds network overhead, complexity, and still fails during rapid scaling events. It's an anti-pattern that fights the stateless process model." },
        { id: "r4", text: "Longer sticky session durations increase the blast radius when an instance fails — more users lose sessions. This deepens the dependency on the anti-pattern." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Factor VI (Processes) requires stateless processes with external backing services for any persistent state. Redis-backed sessions make instances truly disposable.",
        partial: "You're reducing the impact of the problem but not solving it. As long as sessions live in process memory, scaling and failure will cause user-visible session loss.",
        wrong: "This approach deepens the dependency on sticky sessions rather than eliminating it. The twelve-factor solution is to externalize all state to a backing service.",
      },
    },
    {
      type: "action-rationale",
      id: "12f-s3-log-files",
      title: "Application Writing Logs to Local Disk",
      context:
        "A Python application running in Kubernetes pods writes structured JSON logs to /var/log/app/application.log inside the container. A sidecar container runs Fluentd to tail the file and ship logs to Elasticsearch. When pods are evicted or crash, logs written between Fluentd's flush intervals are lost. The team also reports that disk pressure from log files has caused pod evictions on nodes with limited ephemeral storage.",
      displayFields: [
        { label: "Violation", value: "Factor XI (Logs) — logs treated as files, not event streams", emphasis: "critical" },
        { label: "Log Destination", value: "/var/log/app/application.log inside container", emphasis: "warn" },
        { label: "Collection", value: "Fluentd sidecar tailing the log file", emphasis: "normal" },
        { label: "Data Loss", value: "Logs lost between Fluentd flush intervals on pod crash", emphasis: "critical" },
        { label: "Disk Pressure", value: "Log files causing pod evictions on constrained nodes", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Increase Fluentd flush frequency to reduce the data loss window", color: "yellow" },
        { id: "a2", label: "Refactor the application to write logs to stdout/stderr and use the cluster-level log collector (DaemonSet) to capture them", color: "green" },
        { id: "a3", label: "Mount a persistent volume for the log directory to survive pod restarts", color: "red" },
        { id: "a4", label: "Add log rotation to limit disk usage and increase node ephemeral storage", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Increasing flush frequency reduces the data loss window but doesn't eliminate it. It also increases network overhead and still relies on the file-based anti-pattern." },
        { id: "r2", text: "Factor XI treats logs as event streams. Writing to stdout/stderr allows the container runtime to capture logs immediately. A DaemonSet log collector is more efficient than per-pod sidecars and eliminates the file-based data loss risk." },
        { id: "r3", text: "Persistent volumes for logs add storage cost, I/O latency, and complicate pod scheduling. Logs are ephemeral event streams, not data that needs persistent storage." },
        { id: "r4", text: "Log rotation and larger disks treat symptoms, not the root cause. The application should not be managing log files at all — it should emit a stream of events." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Factor XI says applications should never concern themselves with log storage or routing. Write to stdout/stderr and let the execution environment handle collection.",
        partial: "You're reducing the impact of the file-based approach but not aligning with twelve-factor principles. Logs should be unbuffered event streams to stdout, not files.",
        wrong: "Managing log files within the application is the anti-pattern. The twelve-factor approach emits logs to stdout/stderr and delegates collection entirely to the platform.",
      },
    },
  ],
  hints: [
    "Factor III (Config) draws a strict boundary: anything that varies between deploys (credentials, resource handles, feature flags) must be stored in environment variables, not in code. A single codebase should produce one build artifact that runs in any environment.",
    "Factor VI (Processes) requires share-nothing stateless processes. Any data that must persist beyond a single request/transaction belongs in a stateful backing service like Redis, a database, or object storage.",
    "Factor XI (Logs) treats logs as time-ordered event streams written to stdout. The application should never manage log files, rotation, or shipping — that responsibility belongs to the execution environment.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "The twelve-factor methodology is the foundation of cloud-native application design and is referenced in nearly every cloud architecture interview. Understanding these principles demonstrates that you can evaluate and modernize applications for cloud platforms — a skill valued across all cloud engineering roles from SRE to solutions architect.",
  toolRelevance: ["AWS Secrets Manager", "ECS Task Definitions", "Amazon ElastiCache", "Kubernetes DaemonSets", "Fluentd", "CloudWatch Logs"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
