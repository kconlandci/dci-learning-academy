import type { LabManifest } from "../../types/manifest";

export const dynamodbCapacityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "dynamodb-capacity",
  version: 1,
  title: "DynamoDB Capacity Troubleshooting",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "dynamodb", "capacity", "throttling", "nosql"],
  description:
    "Diagnose DynamoDB throttling events, identify whether they stem from capacity mode, hot partitions, or GSI bottlenecks, and apply the correct remediation.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Distinguish between table-level and GSI-level throttling in DynamoDB",
    "Identify hot partition patterns from CloudWatch metrics",
    "Choose between on-demand and provisioned capacity for different workload patterns",
    "Apply correct remediation for partition key design issues",
  ],
  sortOrder: 109,
  status: "published",
  prerequisites: [],
  rendererType: "triage-remediate",
  scenarios: [
    {
      type: "triage-remediate",
      id: "dynamodb-cap-s1",
      title: "E-Commerce Order Throttling During Flash Sale",
      description:
        "During a flash sale, your DynamoDB orders table is experiencing throttling on write operations. The application is returning ProvisionedThroughputExceededException errors. Triage the root cause and select the correct remediation.",
      evidence: [
        {
          type: "metric",
          content:
            "Table: orders-prod\nConsumedWriteCapacityUnits: 890/sec (avg over last 5 min)\nProvisionedWriteCapacityUnits: 1000/sec\nThrottledRequests (Write): 4,200 in last 5 min\nConsumedReadCapacityUnits: 120/sec\nProvisionedReadCapacityUnits: 500/sec",
        },
        {
          type: "metric",
          content:
            "Top write partitions by volume:\n  Partition 'order_type#FLASH_SALE': 720 writes/sec (81% of total)\n  Partition 'order_type#REGULAR': 170 writes/sec (19% of total)\n\nNote: Partition key is 'order_type'. All flash sale orders share the same partition key value.",
          icon: "warning",
        },
        {
          type: "config",
          content:
            "Capacity Mode: Provisioned\nWrite Capacity: 1,000 WCU (auto scaling: min 100, max 1,000)\nRead Capacity: 500 RCU\nPartition Key: order_type (string)\nSort Key: order_id (string)\nGSI: orders-by-customer (PK: customer_id)",
        },
        {
          type: "log",
          content:
            "ERROR: ProvisionedThroughputExceededException on PutItem\nTable: orders-prod\nPartition key value: 'FLASH_SALE'\nRate: 4,200 rejected writes in 5 minutes\nRetry attempts: 3 (exponential backoff)\nFinal error: Write failed after retries",
        },
      ],
      classifications: [
        { id: "hot-partition", label: "Hot Partition Problem", description: "The partition key design is causing uneven distribution — one key value is receiving a disproportionate share of traffic." },
        { id: "insufficient-capacity", label: "Insufficient Provisioned Capacity", description: "Total writes exceed the provisioned WCU for the table. Need to increase provisioned capacity." },
        { id: "gsi-throttle", label: "GSI Throttling Bottleneck", description: "The GSI on customer_id is the throttle point, not the base table." },
        { id: "auto-scaling-lag", label: "Auto Scaling Lag", description: "Auto scaling hasn't had time to scale up to meet the sudden demand spike." },
      ],
      correctClassificationId: "hot-partition",
      remediations: [
        { id: "add-random-suffix", label: "Add a random suffix (1–10) to the partition key (e.g., FLASH_SALE#3) and fan out writes", description: "Distribute flash sale writes across 10 partitions by appending a random number to the order_type key." },
        { id: "increase-wcu", label: "Double provisioned WCU to 2,000", description: "Increase the table's provisioned write capacity to handle the peak volume." },
        { id: "switch-on-demand", label: "Switch to On-Demand capacity mode", description: "On-Demand automatically scales to any request rate without pre-provisioning." },
        { id: "queue-writes", label: "Put a SQS queue in front of DynamoDB and process writes asynchronously", description: "Buffer writes in SQS and process them at a controlled rate to avoid exceeding capacity." },
      ],
      correctRemediationId: "add-random-suffix",
      rationales: [
        { id: "r-hot-partition-real", text: "81% of writes go to a single partition key value (FLASH_SALE). DynamoDB limits each partition to 3,000 RCU and 1,000 WCU. Even if you increase table capacity to 10,000 WCU, a single partition still can't exceed 1,000 WCU. The partition key design must be fixed." },
        { id: "r-capacity-insufficient", text: "Total writes are at 890/sec against 1,000 WCU — close to the table limit, but the core problem is that 81% hit one partition. Increasing capacity doesn't help hot partitions." },
        { id: "r-gsi-not-issue", text: "The CloudWatch metrics show throttling on the base table write operations, not on GSI. The GSI is for reads and has separate capacity." },
        { id: "r-auto-scaling-not-hot", text: "Auto scaling can address table-level capacity gaps, but cannot fix hot partition skew. A partition-level limit is architectural, not a capacity amount issue." },
      ],
      correctRationaleId: "r-hot-partition-real",
      feedback: {
        perfect: "Correct root cause and remediation. Adding a random suffix distributes writes across multiple partitions, eliminating the hot partition bottleneck. This is the DynamoDB best practice for time-bound event workloads.",
        partial: "You identified that capacity is involved but missed the distribution problem. Increasing capacity can't help when 81% of writes target a single partition — partition-level limits are independent of table-level limits.",
        wrong: "The partition distribution data is the critical clue: 81% of writes to one key value. DynamoDB partitions have hard per-partition limits. No amount of table-level capacity increase can overcome this design issue.",
      },
    },
    {
      type: "triage-remediate",
      id: "dynamodb-cap-s2",
      title: "Unexpected DynamoDB Cost Spike",
      description:
        "The AWS bill shows DynamoDB costs tripled this month to $1,800. The table has been operating normally with no traffic increase. Diagnose the cause and identify the correct remediation.",
      evidence: [
        {
          type: "metric",
          content:
            "DynamoDB costs by category (this month vs last month):\n  Read Capacity: $180 → $185 (+3%)\n  Write Capacity: $210 → $215 (+2%)\n  On-Demand Reads: $0 → $0\n  Storage: $45 → $48 (+7%)\n  Data Transfer: $12 → $14\n  Backup/Restore: $155 → $1,338 (+763%)",
          icon: "critical",
        },
        {
          type: "metric",
          content:
            "Point-in-Time Recovery (PITR): Enabled 32 days ago\nContinuous backup cost: $0.20 per GB-month\nTable size: 208 GB\nEstimated PITR monthly cost: 208 GB × $0.20 = $41.60/month\nOn-Demand Backups created this month: 42\nAverage backup size: 210 GB\nOn-Demand Backup cost: $0.10 per GB × 210 GB × 42 = $882",
          icon: "warning",
        },
        {
          type: "config",
          content:
            "Lambda function: daily-backup-job\nSchedule: EventBridge rule - runs hourly (cron: 0 * * * ? *)\nNote: Rule was modified 32 days ago. Was set to daily (0 2 * * ? *), changed to hourly.\nBackups created today: 14 (since midnight)\nBackups created this month: 42 total",
        },
        {
          type: "config",
          content:
            "On-Demand Backups: No automatic expiry configured. Backups accumulate indefinitely.\nTotal active backups: 42 (up from 1 last month)\nOldest backup: 32 days ago (when the cron was changed)",
        },
      ],
      classifications: [
        { id: "misconfigured-backup-schedule", label: "Misconfigured Backup Schedule", description: "The backup cron was accidentally changed to run hourly instead of daily, creating 42x more backups than intended." },
        { id: "pitr-cost-unexpected", label: "PITR Unexpected Cost", description: "Enabling Point-in-Time Recovery added unexpected continuous backup storage costs." },
        { id: "table-size-growth", label: "Unexpected Table Size Growth", description: "The table has grown significantly larger, increasing storage and backup costs proportionally." },
        { id: "on-demand-mode-wrong", label: "Wrong Capacity Mode", description: "The table was accidentally switched to on-demand mode, causing overconsumption billing." },
      ],
      correctClassificationId: "misconfigured-backup-schedule",
      remediations: [
        { id: "fix-cron-delete-backups", label: "Fix cron to daily schedule and delete excess on-demand backups", description: "Restore the EventBridge rule to daily frequency and delete the 41 excess backup copies." },
        { id: "disable-pitr", label: "Disable PITR to eliminate continuous backup costs", description: "Turn off Point-in-Time Recovery to stop the continuous backup storage charges." },
        { id: "fix-cron-only", label: "Fix cron to daily, keep all existing backups as safety copies", description: "Stop creating new hourly backups but retain the 42 existing ones." },
        { id: "enable-backup-lifecycle", label: "Enable backup lifecycle rules to auto-delete backups after 7 days", description: "Configure automatic deletion of backups older than 7 days to manage accumulation." },
      ],
      correctRemediationId: "fix-cron-delete-backups",
      rationales: [
        { id: "r-cron-root-cause", text: "The EventBridge rule was changed to hourly 32 days ago, creating 42 backups instead of 1. Each backup is 210 GB × $0.10 = $21. Fixing the cron stops new excess backups; deleting the 41 unnecessary ones eliminates the ongoing $882 storage cost." },
        { id: "r-pitr-not-cause", text: "PITR adds $41.60/month — notable but not the primary driver of an $1,183 increase. The on-demand backups at $882 are the main cost driver." },
        { id: "r-fix-cron-keep-backups", text: "Keeping 42 backups of the same data without a retention policy continues the $882 monthly storage cost for backups that provide no additional protection over 1 or 2." },
        { id: "r-lifecycle-incomplete", text: "A lifecycle policy prevents future accumulation but doesn't fix the immediate cost — 42 backups are accruing charges right now. Delete the excess backups immediately." },
      ],
      correctRationaleId: "r-cron-root-cause",
      feedback: {
        perfect: "Correct diagnosis and remediation. The cron misconfiguration is the root cause. Fixing it and deleting the 41 excess backups returns costs to normal immediately.",
        partial: "You found the cron issue but didn't address the accumulated backups. They continue to accrue storage costs until deleted — fixing the cron only prevents new ones.",
        wrong: "Look at the backup creation log: 42 backups in a month from a function that should run daily. The EventBridge cron was changed to hourly — that's a 30x increase in backup frequency and cost.",
      },
    },
    {
      type: "triage-remediate",
      id: "dynamodb-cap-s3",
      title: "GSI Throttling Causing Read Failures",
      description:
        "A user-profile service reads from a DynamoDB GSI (Global Secondary Index) to look up users by email address. The application is reporting intermittent 'ProvisionedThroughputExceededException' on read operations. The base table reads are healthy. Triage and remediate.",
      evidence: [
        {
          type: "metric",
          content:
            "Base Table (users):\n  ConsumedReadCapacityUnits: 45/sec\n  ProvisionedRCU: 500/sec\n  ThrottledRequests (Read): 0\n\nGSI: users-by-email:\n  ConsumedReadCapacityUnits: 195/sec\n  ProvisionedRCU: 100/sec  ← INSUFFICIENT\n  ThrottledRequests (Read): 12,400 in last 5 min",
          icon: "critical",
        },
        {
          type: "config",
          content:
            "GSI Name: users-by-email\nPartition Key: email (string)\nProjection: ALL attributes\nProvisioned RCU: 100 (manually set, not auto-scaled)\nProvisioned WCU: 50\nNote: GSI capacity is independent of base table capacity.",
          icon: "warning",
        },
        {
          type: "metric",
          content:
            "Operation: Query on GSI users-by-email\nAverage items returned: 1\nItem size: 2.8 KB → rounds up to 4 KB = 1 RCU per strongly-consistent read\nQuery rate: ~200 queries/sec during business hours\nConsistency: Strongly Consistent\nNote: Strongly consistent reads on a GSI are NOT supported by DynamoDB.",
        },
        {
          type: "log",
          content:
            "Commit 3f7a2b1 (2 days ago): Changed DynamoDB reads from Eventually Consistent to Strongly Consistent\nReason: Developer saw inconsistent data and added ConsistentRead: true\nImpact: GSI reads doubled in RCU consumption (2 RCU each instead of 0.5 RCU)",
        },
      ],
      classifications: [
        { id: "gsi-capacity-too-low", label: "GSI Provisioned Capacity Too Low", description: "The GSI RCU provision of 100 is insufficient for 200 queries/sec at current consumption rates." },
        { id: "invalid-consistent-read", label: "Invalid Strongly Consistent Read on GSI", description: "DynamoDB does not support strongly consistent reads on GSIs. The request is failing or being downgraded." },
        { id: "projection-inefficient", label: "Inefficient GSI Projection", description: "Projecting ALL attributes causes large item reads that consume excess RCU." },
        { id: "hot-gsi-partition", label: "Hot Partition on GSI", description: "Uneven distribution of email values is causing a hot partition on the GSI." },
      ],
      correctClassificationId: "gsi-capacity-too-low",
      remediations: [
        { id: "revert-consistent-increase-gsi", label: "Revert to eventually consistent reads AND increase GSI RCU to 250", description: "Fix the code to use eventually consistent reads (correct for GSI) and increase GSI capacity to handle the load." },
        { id: "increase-gsi-only", label: "Increase GSI RCU to 400 to handle the current query rate", description: "Keep strongly consistent reads but provision enough capacity to handle 200 RCU/sec." },
        { id: "revert-code-only", label: "Revert to eventually consistent reads only (no capacity change needed)", description: "Strongly consistent reads are not supported on GSIs anyway. Reverting reduces RCU to 0.5 per read — 100 RCU may then be sufficient at 200 queries/sec." },
        { id: "change-projection", label: "Change GSI projection to KEYS_ONLY to reduce item size", description: "Reduce projection to only include key attributes, then make additional GetItem calls for full data." },
      ],
      correctRemediationId: "revert-code-only",
      rationales: [
        { id: "r-gsi-no-consistent", text: "DynamoDB does not support strongly consistent reads on GSIs — the SDK will either throw an error or silently downgrade to eventually consistent. Reverting the code fixes the incorrect read type. Eventually consistent reads on a GSI cost 0.5 RCU each, so 200 reads/sec = 100 RCU — exactly at the provisioned limit without throttling." },
        { id: "r-increase-capacity-wrong", text: "Increasing GSI capacity to handle a workload that's using an unsupported read type is the wrong fix. The code bug should be fixed first." },
        { id: "r-projection-not-primary", text: "Changing projection is a valid optimization but doesn't address the immediate throttling cause. The code bug (unsupported consistent read on GSI) is the priority." },
        { id: "r-hot-partition-no-evidence", text: "There's no evidence of hot partition — the metrics show overall GSI throttling, not per-partition skew. The cause is capacity (or the code causing excess consumption)." },
      ],
      correctRationaleId: "r-gsi-no-consistent",
      feedback: {
        perfect: "Correct. GSIs don't support strongly consistent reads. The developer's change doubled RCU consumption for an operation that doesn't even work as intended. Reverting the code reduces consumption back to 0.5 RCU/read — within current provisioned limits.",
        partial: "Increasing capacity addresses the symptom but not the bug. The code is using an unsupported read consistency model on a GSI. Fix the code first — capacity may not even need to change.",
        wrong: "The application code recently changed to use strongly consistent reads on a GSI. DynamoDB doesn't support this. The fix is in the application, not the infrastructure.",
      },
    },
  ],
  hints: [
    "DynamoDB has two levels of capacity: table-level and per-partition. A hot partition can be throttled even when table-level capacity has headroom — because each partition has its own 3,000 RCU / 1,000 WCU hard limit.",
    "GSI capacity is independent of the base table. A table with 500 RCU and a GSI with 100 RCU will throttle on the GSI even though the base table has capacity to spare.",
    "Strongly consistent reads on a Global Secondary Index are not supported in DynamoDB. Only eventually consistent reads are available on GSIs.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "DynamoDB capacity issues are some of the trickiest to diagnose because the problem can be at the table, GSI, or partition level — and symptoms look similar. Knowing the distinction between hot partitions and insufficient capacity, and understanding GSI-specific limitations, is highly valued in backend engineering and cloud operations roles.",
  toolRelevance: ["AWS Console", "CloudWatch", "AWS CLI", "DynamoDB Console"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
