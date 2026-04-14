import type { LabManifest } from "../../types/manifest";

export const ecsTaskScalingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ecs-task-scaling",
  version: 1,
  title: "ECS Task Auto Scaling",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "ecs", "auto-scaling", "containers", "capacity"],
  description:
    "Configure ECS service auto scaling policies and capacity settings to handle traffic spikes without over-provisioning during quiet periods.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Configure target tracking scaling policies for ECS services",
    "Set appropriate minimum and maximum task counts for cost and availability",
    "Diagnose why ECS scaling is not responding to load as expected",
    "Choose between step scaling and target tracking for different workload patterns",
  ],
  sortOrder: 108,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "ecs-scaling-s1",
      title: "Traffic Spike Not Triggering Scale-Out",
      context:
        "Your ECS service handles API traffic. During a product launch, CPU hit 90% for 15 minutes but no new tasks were launched. The service degraded under load. The current auto scaling policy is: Target Tracking on CPU, target 50%, scale-out cooldown 300s, scale-in cooldown 300s. Min: 2, Max: 10.",
      displayFields: [
        { label: "Scaling Policy", value: "Target Tracking, CPU 50% target", emphasis: "normal" },
        { label: "CPU During Spike", value: "90% for 15 minutes", emphasis: "critical" },
        { label: "Tasks Launched During Spike", value: "0 additional tasks", emphasis: "critical" },
        { label: "Scale-Out Cooldown", value: "300 seconds (5 min)", emphasis: "warn" },
        { label: "Current Task Count", value: "2 (minimum)", emphasis: "normal" },
        { label: "Max Tasks", value: "10", emphasis: "normal" },
      ],
      actions: [
        { id: "reduce-cooldown", label: "Reduce scale-out cooldown from 300s to 60s", color: "green" },
        { id: "lower-cpu-target", label: "Lower CPU target from 50% to 30% so scaling triggers earlier", color: "yellow" },
        { id: "switch-step-scaling", label: "Switch to Step Scaling with immediate scale-out at CPU > 70%", color: "orange" },
        { id: "increase-max-tasks", label: "Increase max task count from 10 to 50", color: "blue" },
      ],
      correctActionId: "reduce-cooldown",
      rationales: [
        { id: "r-cooldown-blocks", text: "The 300s scale-out cooldown prevents new scaling actions for 5 minutes after the last one. If the first scale-out action doesn't fully address the load, subsequent scale-outs are blocked for the cooldown duration. Reducing to 60s allows the auto scaler to respond in smaller increments more frequently." },
        { id: "r-lower-target-premature", text: "Lowering the target to 30% means scaling triggers at lower CPU, which wastes capacity during normal traffic. The issue is cooldown blocking the scale-out, not the trigger threshold." },
        { id: "r-step-scaling-valid", text: "Step Scaling can work but adds configuration complexity. For most ECS workloads, fixing the Target Tracking cooldown is simpler and sufficient." },
        { id: "r-max-tasks-irrelevant", text: "The maximum task count (10) was never reached — the problem is that no additional tasks were launched at all. Max task count is not the bottleneck here." },
      ],
      correctRationaleId: "r-cooldown-blocks",
      feedback: {
        perfect: "Correct. A 5-minute scale-out cooldown means the auto scaler can only attempt to add capacity every 5 minutes. During a sustained spike, this prevents adequate scale-out. 60 seconds is a better default for API workloads.",
        partial: "Your change may help but doesn't address the root cause. The 300s cooldown is what prevents the auto scaler from adding tasks during a sustained spike. Threshold changes affect when scaling triggers, not how fast it can iterate.",
        wrong: "The maximum task count of 10 was never approached — the scaler never even tried to launch new tasks. Review the cooldown configuration, which prevents multiple scale-out actions in quick succession.",
      },
    },
    {
      type: "action-rationale",
      id: "ecs-scaling-s2",
      title: "Fargate Task CPU and Memory Sizing",
      context:
        "An ECS Fargate service runs a Java Spring Boot application. Tasks are configured with 512 CPU units (0.5 vCPU) and 1 GB memory. CloudWatch shows: CPU 8% average, memory 89% average, and the service receives frequent OOM kills (exit code 137) at peak traffic.",
      displayFields: [
        { label: "Current CPU Allocation", value: "512 CPU units (0.5 vCPU)", emphasis: "normal" },
        { label: "Current Memory Allocation", value: "1 GB", emphasis: "warn" },
        { label: "CPU Utilization", value: "8% average", emphasis: "normal" },
        { label: "Memory Utilization", value: "89% average", emphasis: "critical" },
        { label: "OOM Kills", value: "Frequent at peak traffic (exit code 137)", emphasis: "critical" },
      ],
      actions: [
        { id: "increase-memory-fargate", label: "Change to 512 CPU units, 2 GB memory", color: "green" },
        { id: "increase-cpu-memory", label: "Change to 2048 CPU units, 4 GB memory", color: "yellow" },
        { id: "reduce-tasks-more-memory", label: "Reduce task count and allocate all memory to fewer tasks", color: "orange" },
        { id: "add-jvm-flags", label: "Add JVM heap flags (-Xmx512m) to limit Java heap within 1 GB", color: "blue" },
      ],
      correctActionId: "increase-memory-fargate",
      rationales: [
        { id: "r-memory-only-needed", text: "CPU is at 8% — clearly not the bottleneck. Increasing only memory (keeping 0.5 vCPU) directly addresses the OOM kills without paying for unnecessary CPU. Spring Boot's JVM overhead typically needs 1.5–2 GB for a healthy headroom." },
        { id: "r-cpu-memory-overprovisioned", text: "Increasing to 4x the CPU when CPU is at 8% is wasteful. Fargate pricing is based on both CPU and memory, so over-allocating CPU significantly increases cost without benefit." },
        { id: "r-fewer-tasks-wrong", text: "Reducing task count to give more memory per task contradicts horizontal scaling — fewer tasks means less redundancy and higher per-task load, making OOM kills more likely." },
        { id: "r-jvm-flags-risky", text: "Setting -Xmx512m caps Java heap below what the application needs. This would cause OutOfMemoryErrors at the JVM level (java.lang.OutOfMemoryError) before the container gets OOM killed — same result, different error." },
      ],
      correctRationaleId: "r-memory-only-needed",
      feedback: {
        perfect: "Correct. CPU is clearly underutilized — doubling memory while keeping CPU constant is the right-sized change. This directly addresses OOM kills at minimum additional cost.",
        partial: "You've identified memory as the bottleneck, but increasing CPU alongside memory wastes budget. Fargate charges for both independently — increase only what's actually constrained.",
        wrong: "The metrics show CPU at 8% and memory at 89% with OOM kills. The resource that needs to increase is memory, not CPU. Capping JVM heap doesn't solve the problem — it just moves the error.",
      },
    },
    {
      type: "action-rationale",
      id: "ecs-scaling-s3",
      title: "Service Discovery and Load Balancer Target Group Health",
      context:
        "A new ECS service deployment is failing. Tasks start successfully, run for ~30 seconds, then get terminated and replaced in a loop. The ECS events log shows: 'Task stopped. Essential container exited with code 1'. The ALB target group shows all targets as 'draining' or 'unhealthy'.",
      displayFields: [
        { label: "Task Status", value: "Starting → Running (30s) → Stopped (loop)", emphasis: "critical" },
        { label: "Exit Code", value: "1 (non-zero — application error)", emphasis: "critical" },
        { label: "ALB Target Health", value: "All unhealthy / draining", emphasis: "critical" },
        { label: "Health Check Path", value: "/health (HTTP 200 expected)", emphasis: "warn" },
        { label: "Deployment Type", value: "Rolling update — replacing old tasks", emphasis: "normal" },
      ],
      actions: [
        { id: "check-container-logs", label: "Check CloudWatch Logs for the container to read the application error", color: "green" },
        { id: "increase-health-check-grace", label: "Increase the ECS health check grace period to 120 seconds", color: "yellow" },
        { id: "rollback-deployment", label: "Immediately roll back to the previous task definition", color: "orange" },
        { id: "increase-task-count", label: "Increase desired task count to force more healthy tasks", color: "red" },
      ],
      correctActionId: "check-container-logs",
      rationales: [
        { id: "r-logs-first", text: "Exit code 1 means the application itself is crashing — this is not a health check timing issue. The application is failing at startup. CloudWatch Logs will show the exact error message, which is required to diagnose and fix the actual problem before any other action." },
        { id: "r-grace-period-wrong", text: "The health check grace period applies when the container starts before health checks begin. But exit code 1 means the application exited — no grace period helps a crashed process." },
        { id: "r-rollback-premature", text: "Rollback is the right action if this is a bad deployment, but you need to confirm that first. The exit code could be a missing environment variable, failed secret fetch, or misconfigured startup command — rolling back without knowing the cause means deploying the same broken config next time." },
        { id: "r-more-tasks-cycles", text: "All new tasks will crash the same way — increasing desired count just creates more crash loops without fixing anything." },
      ],
      correctRationaleId: "r-logs-first",
      feedback: {
        perfect: "Correct incident response. Exit code 1 is an application error — the logs will tell you exactly why it's crashing. Diagnose before acting: it could be a missing secret, wrong environment variable, or a database connection failure.",
        partial: "Rolling back is sometimes the right move, but it should follow diagnosis, not precede it. If the deployment had a configuration change (new env var, secret ARN), rollback won't help.",
        wrong: "Increasing task count or adjusting the grace period doesn't help a crashing application. Exit code 1 means the application code or configuration is wrong. Read the logs first.",
      },
    },
  ],
  hints: [
    "Scale-out cooldown is the minimum time between scale-out actions. If cooldown is 300s and demand doubles in 60s, you can only add capacity once every 5 minutes — plan accordingly.",
    "Fargate CPU and memory are billed independently. When a metric shows one at 8% and another at 89%, increase only the constrained resource.",
    "Exit code 137 = OOM kill (out of memory). Exit code 1 = application error. Exit code 0 = clean exit. Reading exit codes tells you whether to look at memory limits or application logs.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "ECS auto scaling issues are among the most common on-call incidents at companies running containerized workloads. The combination of understanding scaling policy mechanics (cooldowns, thresholds), Fargate resource allocation, and the ability to read container exit codes makes an engineer highly effective during production incidents.",
  toolRelevance: ["AWS Console", "ECS Console", "CloudWatch", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
