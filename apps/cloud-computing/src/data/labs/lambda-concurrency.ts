import type { LabManifest } from "../../types/manifest";

export const lambdaConcurrencyLab: LabManifest = {
  schemaVersion: "1.1",
  id: "lambda-concurrency",
  version: 1,
  title: "Lambda Concurrency Management",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "lambda", "concurrency", "throttling", "serverless"],
  description:
    "Investigate Lambda throttling events and concurrency limit issues, and determine the correct reserved and provisioned concurrency configurations to fix them.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Distinguish between account-level concurrency limits and function-level throttling",
    "Configure reserved concurrency to protect critical functions from noisy neighbors",
    "Identify when provisioned concurrency is the right solution versus reserved concurrency",
    "Analyze CloudWatch Throttles metrics to trace the source of Lambda throttling",
  ],
  sortOrder: 112,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "lambda-concurrency-s1",
      title: "Critical Payment Function Throttling",
      objective:
        "The payment processing Lambda function started throttling during a marketing email campaign. The email campaign triggered a bulk-processing Lambda that consumed all available concurrency. Payments are failing with ThrottlingException. Determine the correct fix.",
      investigationData: [
        {
          id: "account-concurrency",
          label: "Account Concurrency Limit",
          content:
            "Region: us-east-1\nAccount concurrent execution limit: 1,000\nCurrent concurrency in use:\n  email-bulk-processor Lambda: 980 concurrent executions\n  payment-processor Lambda: 0 (throttled, can't start)\n  Other functions: 20\nThrottled invocations on payment-processor: 1,247 in last 10 minutes",
          isCritical: true,
        },
        {
          id: "function-configs",
          label: "Lambda Function Configurations",
          content:
            "payment-processor:\n  Reserved concurrency: None (uses account pool)\n  Provisioned concurrency: None\n  Avg duration: 450ms\n\nemail-bulk-processor:\n  Reserved concurrency: None (uses account pool)\n  Provisioned concurrency: None\n  Avg duration: 2,100ms\n  Trigger: SQS queue (batch size 10, 1,000 messages queued)",
        },
        {
          id: "payment-impact",
          label: "Business Impact",
          content:
            "Failed payment attempts: 1,247\nEstimated revenue impact: ~$8,700\nUser error message: 'Payment service unavailable'\nSLA breach: Yes — payment SLA requires <1% error rate",
          isCritical: true,
        },
        {
          id: "email-processor-urgency",
          label: "Email Processor Context",
          content:
            "Email bulk processor sends marketing emails.\nProcess is not time-sensitive — emails can be delayed by hours without user impact.\nSQS queue has 1,000 messages. Without throttling, processes all in ~15 minutes.",
        },
      ],
      actions: [
        { id: "reserved-payment-cap-email", label: "Set reserved concurrency on payment-processor (100) and cap email-bulk-processor (50)", color: "green" },
        { id: "increase-account-limit", label: "Request AWS to increase account concurrent execution limit to 3,000", color: "yellow" },
        { id: "reserved-payment-only", label: "Set reserved concurrency on payment-processor to 200 (no cap on email processor)", color: "orange" },
        { id: "disable-email-processor", label: "Temporarily disable the email-bulk-processor function trigger", color: "blue" },
      ],
      correctActionId: "reserved-payment-cap-email",
      rationales: [
        { id: "r-isolate-both", text: "Reserved concurrency solves the noisy-neighbor problem in two ways: (1) guaranteeing payment-processor has dedicated capacity it can always use, and (2) capping email-bulk-processor so it can't consume all shared concurrency. Without the cap on email, it could still starve other functions." },
        { id: "r-increase-limit-slow", text: "Requesting a limit increase takes time and doesn't fix the immediate incident. It also doesn't prevent a future email campaign from again consuming all concurrency." },
        { id: "r-payment-only-partial", text: "Reserving concurrency for payment is necessary, but without capping the email processor, any other function could still become a noisy neighbor and starve the rest of the account's functions." },
        { id: "r-disable-email-temporary", text: "Disabling the trigger stops the bleeding but is a blunt instrument. 1,000 emails will queue up indefinitely. Reserved concurrency is the surgical, permanent fix." },
      ],
      correctRationaleId: "r-isolate-both",
      feedback: {
        perfect: "Correct two-sided fix. Reserving concurrency for payment-processor guarantees it always has capacity. Capping email-bulk-processor prevents it from being a noisy neighbor to all other functions in the account.",
        partial: "Reserving concurrency for payment-processor is necessary but not sufficient. The email processor can still exhaust the shared pool and affect other functions. Always cap the noisy-neighbor function too.",
        wrong: "Account limit increases take time and don't prevent future starvation. Disabling functions is a blunt temporary fix. Reserved concurrency is the correct permanent mechanism for isolating critical functions.",
      },
    },
    {
      type: "investigate-decide",
      id: "lambda-concurrency-s2",
      title: "API Gateway Lambda P99 Latency Spikes",
      objective:
        "An API backed by Lambda has p99 latency spiking to 3–5 seconds during business hours despite the function running in <100ms when warm. The function has no VPC, small package size, and is a Node.js 20 runtime. Investigate and recommend the correct solution.",
      investigationData: [
        {
          id: "latency-metrics",
          label: "CloudWatch: Lambda Duration Percentiles",
          content:
            "p50 duration: 45ms\np95 duration: 120ms\np99 duration: 3,800ms\n\nConcurrency metrics:\n  Max concurrent executions: 48 (during business hours)\n  ConcurrentExecutions (average): 12\n  Throttles: 0\n  Init Duration (when present): 820ms\n\nAPI Gateway p99 latency: 4,200ms (includes Lambda init + queue time)",
          isCritical: true,
        },
        {
          id: "invocation-pattern",
          label: "Lambda Invocation Pattern",
          content:
            "Traffic pattern: Low overnight, rapid ramp-up at 09:00 UTC business hours\n09:00–09:05 UTC: Concurrent executions spike from 2 to 45 in 5 minutes\n\nCold start frequency:\n  09:00–09:10 UTC: 42 cold starts in 10-minute window\n  Rest of business hours: 1–3 cold starts per hour",
          isCritical: true,
        },
        {
          id: "function-config",
          label: "Function Configuration",
          content:
            "Memory: 512 MB\nTimeout: 30s\nReserved concurrency: None\nProvisioned concurrency: 0\nRuntime: Node.js 20.x\nPackage size: 12 MB\nVPC: None",
        },
        {
          id: "business-pattern",
          label: "Business Hours Analysis",
          content:
            "The API serves internal tooling for 200 employees who start work at 09:00 UTC.\nAll 200 employees open the app simultaneously at workday start.\nOff-hours: API receives near-zero traffic (1-2 req/min from monitoring).",
        },
      ],
      actions: [
        { id: "provisioned-concurrency-30", label: "Set Provisioned Concurrency to 30 on the Lambda function alias", color: "green" },
        { id: "increase-memory", label: "Increase function memory to 3008 MB to reduce cold start duration", color: "yellow" },
        { id: "reserved-concurrency-50", label: "Set Reserved Concurrency to 50 to limit max concurrency", color: "orange" },
        { id: "use-warmer-pings", label: "Schedule EventBridge ping every 5 minutes to keep instances warm", color: "blue" },
      ],
      correctActionId: "provisioned-concurrency-30",
      rationales: [
        { id: "r-provisioned-for-burst", text: "Provisioned Concurrency pre-initializes execution environments so they're ready to serve requests with zero cold start. With 200 employees arriving simultaneously at 09:00, provisioning 30 concurrent environments eliminates cold starts for the burst. The cost is only during business hours if you schedule it via Application Auto Scaling." },
        { id: "r-memory-minor-improvement", text: "Increasing memory reduces cold start duration somewhat but doesn't eliminate it. p99 at 3,800ms with a 820ms init duration suggests the primary issue is 42 simultaneous cold starts — more memory reduces each from 820ms to maybe 400ms, still visible in p99." },
        { id: "r-reserved-wrong-direction", text: "Reserved Concurrency of 50 would limit the function to 50 concurrent executions, potentially causing throttling instead of cold starts. This makes the p99 latency worse, not better." },
        { id: "r-warmer-one-instance", text: "A 5-minute ping keeps 1 execution environment warm. When 200 users hit the API simultaneously, 29+ cold starts still occur. Single-instance warmers don't help burst patterns." },
      ],
      correctRationaleId: "r-provisioned-for-burst",
      feedback: {
        perfect: "Correct. Provisioned Concurrency pre-initializes multiple execution environments before the business-hours burst. 30 pre-warmed instances eliminate cold starts for the initial wave of requests.",
        partial: "Memory helps cold start duration but doesn't address the simultaneous burst of 42 cold starts. Provisioned Concurrency is the correct solution for known, predictable traffic burst patterns.",
        wrong: "Reserved Concurrency limits maximum concurrency — it doesn't prevent cold starts and would make throttling worse. The problem is 42 simultaneous cold starts at 09:00, which requires Provisioned Concurrency to solve.",
      },
    },
    {
      type: "investigate-decide",
      id: "lambda-concurrency-s3",
      title: "SQS Lambda Concurrency Over-Scaling",
      objective:
        "A Lambda function triggered by SQS is causing downstream RDS database connection exhaustion. The database has a max_connections of 100, but the Lambda is creating 300+ simultaneous connections during peak SQS processing. Identify the correct mechanism to limit concurrency.",
      investigationData: [
        {
          id: "rds-error-log",
          label: "RDS Error Log",
          content:
            "ERROR: too many connections — max_connections: 100, current: 103\nERROR: Connection refused: FATAL: remaining connection slots are reserved for non-replication superuser connections\nOccurrence: Every day 14:00–15:00 UTC when SQS queue depth is highest",
          isCritical: true,
        },
        {
          id: "lambda-sqs-config",
          label: "Lambda SQS Event Source Mapping",
          content:
            "Queue: order-processing-queue\nBatch size: 10\nMaximum concurrency: Not configured (defaults to account limit)\nLambda function reserved concurrency: None\nAverage Lambda duration: 8 seconds\nPeak queue depth: 5,000 messages",
          isCritical: true,
        },
        {
          id: "connection-analysis",
          label: "Database Connection Analysis",
          content:
            "Each Lambda execution opens 1 database connection.\nConnections are not pooled (new connection per execution).\nAt 300 concurrent executions × 1 connection each = 300 connections requested.\nRDS db.t3.medium: max_connections = 100\nConnections from other services: ~20 static connections",
          isCritical: true,
        },
        {
          id: "sqs-scaling-behavior",
          label: "SQS-Lambda Scaling Behavior",
          content:
            "Lambda scales SQS processing by adding 60 concurrent executions per minute.\nWith 5,000 messages and batch size 10: Lambda will scale to 500 concurrent executions.\nThis generates 500 simultaneous RDS connection attempts.",
        },
      ],
      actions: [
        { id: "set-max-concurrency-sqs", label: "Set Maximum Concurrency on the SQS Event Source Mapping to 75", color: "green" },
        { id: "reserved-concurrency-function", label: "Set Reserved Concurrency on the Lambda function to 75", color: "yellow" },
        { id: "increase-rds-size", label: "Upgrade RDS to db.r5.large to increase max_connections to 1,000", color: "orange" },
        { id: "add-rds-proxy", label: "Add RDS Proxy to pool connections between Lambda and RDS", color: "blue" },
      ],
      correctActionId: "set-max-concurrency-sqs",
      rationales: [
        { id: "r-event-source-concurrency", text: "The SQS Event Source Mapping has a Maximum Concurrency setting that controls exactly how many concurrent Lambda executions process from this specific queue. Setting it to 75 limits Lambda to 75 connections to RDS (75 available from 100 max, leaving 25 for other services). This is the most precise control." },
        { id: "r-reserved-concurrency-blunt", text: "Reserved Concurrency at the function level works, but it limits the function's total concurrency across ALL triggers, not just SQS. If this Lambda is also invoked by other sources, reserved concurrency would throttle those too." },
        { id: "r-upgrade-rds-expensive", text: "Upgrading RDS to support more connections is treating the symptom. The Lambda is spawning hundreds of connections per second — any RDS size will eventually be overwhelmed without an application-level limit." },
        { id: "r-rds-proxy-valid", text: "RDS Proxy is a valid long-term solution that pools connections efficiently. But the SQS Event Source Mapping concurrency limit is the immediate fix that prevents connection exhaustion without changing the application architecture." },
      ],
      correctRationaleId: "r-event-source-concurrency",
      feedback: {
        perfect: "Correct. The SQS Event Source Mapping Maximum Concurrency setting is specifically designed for this scenario — it limits how many concurrent Lambda executions process from the queue without affecting other Lambda triggers.",
        partial: "Reserved Concurrency works as a blunt solution, but Event Source Mapping concurrency is more precise. It limits only SQS-triggered executions, not the function's total concurrency from all invocation paths.",
        wrong: "Upgrading RDS to handle more connections is escalating the problem, not solving it. The fix is to limit Lambda concurrency so it never requests more connections than the database can serve.",
      },
    },
  ],
  hints: [
    "Reserved Concurrency has two effects: (1) guarantees capacity for the function, (2) caps the function's maximum concurrency. Both are useful — think of it as isolation in both directions.",
    "Provisioned Concurrency keeps Lambda execution environments pre-initialized. Use it for functions with predictable traffic bursts where cold start latency is unacceptable.",
    "The SQS Event Source Mapping has its own Maximum Concurrency setting separate from the function's reserved concurrency. Use it to control how fast a queue is processed without affecting other triggers.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Lambda concurrency management is one of the most misunderstood aspects of serverless architectures. The difference between reserved concurrency (isolation + cap), provisioned concurrency (pre-warm), and event source mapping concurrency (queue-specific throttle) is tested in AWS Developer and Solutions Architect exams. In practice, getting this wrong causes cascading failures.",
  toolRelevance: ["AWS Console", "Lambda Console", "CloudWatch", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
