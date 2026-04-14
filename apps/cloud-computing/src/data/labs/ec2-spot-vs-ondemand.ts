import type { LabManifest } from "../../types/manifest";

export const ec2SpotVsOndemandLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ec2-spot-vs-ondemand",
  version: 1,
  title: "EC2 Spot vs On-Demand Strategy",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "ec2", "spot", "cost-optimization", "purchasing-options"],
  description:
    "Evaluate workload characteristics to determine the optimal mix of EC2 Spot, On-Demand, and Reserved Instances, balancing cost savings against interruption risk.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify workloads that are suitable for Spot Instances versus On-Demand",
    "Design Spot Fleet configurations that minimize interruption impact",
    "Calculate cost savings potential from different purchasing strategies",
    "Apply Spot Instance best practices for fault-tolerant workloads",
  ],
  sortOrder: 111,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "spot-ondemand-s1",
      title: "Batch ML Training Job Purchasing Strategy",
      context:
        "Your team runs nightly ML model training jobs on EC2. The jobs take 4–6 hours, checkpoint progress every 30 minutes to S3, and can resume from a checkpoint if interrupted. They currently run on 20x m5.4xlarge On-Demand instances costing $1,840/night. Spot pricing for m5.4xlarge is $0.28/hr vs $0.77/hr On-Demand.",
      displayFields: [
        { label: "Job Type", value: "ML training — checkpointed every 30 min", emphasis: "normal" },
        { label: "Duration", value: "4–6 hours (nightly)", emphasis: "normal" },
        { label: "Current Cost", value: "$1,840/night (On-Demand)", emphasis: "warn" },
        { label: "Spot Price", value: "$0.28/hr (m5.4xlarge)", emphasis: "normal" },
        { label: "On-Demand Price", value: "$0.77/hr (m5.4xlarge)", emphasis: "normal" },
        { label: "Interruption Tolerance", value: "High — 30-min checkpoint recovery", emphasis: "normal" },
      ],
      actions: [
        { id: "full-spot-fleet", label: "Replace all 20 instances with Spot using a diversified Spot Fleet (3 instance types, 3 AZs)", color: "green" },
        { id: "mixed-spot-ondemand", label: "Use 15 Spot + 5 On-Demand (75/25 split)", color: "yellow" },
        { id: "single-az-spot", label: "Launch 20 Spot instances in a single AZ (cheapest current price)", color: "orange" },
        { id: "reserved-instances", label: "Purchase 1-year Reserved Instances for these 20 instances", color: "red" },
      ],
      correctActionId: "full-spot-fleet",
      rationales: [
        { id: "r-diversified-fleet", text: "A diversified Spot Fleet across multiple instance types and AZs minimizes interruption probability. When one instance type/AZ is interrupted, the fleet can rebalance to others. With 30-minute checkpoints, any individual instance interruption only loses 30 minutes of work — tolerable for this workload." },
        { id: "r-mixed-unnecessary", text: "A 75/25 mix hedges against interruption but pays full On-Demand price for 25% of the instances unnecessarily. With checkpoint recovery and fleet diversification, 100% Spot is appropriate and saves $1,280/night more." },
        { id: "r-single-az-risky", text: "Single-AZ Spot creates concentration risk. An AZ-wide Spot capacity event could interrupt all 20 instances simultaneously, losing a full 30-minute checkpoint interval across all workers and potentially failing the job." },
        { id: "r-reserved-wrong", text: "Reserved Instances suit steady-state, predictable workloads that run 24/7. A nightly 4-6 hour job uses the instance for only 17–25% of the day — Reserved Instances would be 75% idle and cost more than On-Demand annually." },
      ],
      correctRationaleId: "r-diversified-fleet",
      feedback: {
        perfect: "Correct. A diversified Spot Fleet is the ideal strategy for fault-tolerant batch jobs with checkpointing. The ~64% cost savings ($1,184/night) while tolerating interruptions is a textbook Spot use case.",
        partial: "A mixed fleet works but leaves cost savings on the table. Given the checkpointing and fault-tolerant design, there's no strong reason to pay On-Demand price for 25% of the fleet.",
        wrong: "Reserved Instances are for steady-state workloads, not nightly batch jobs. Single-AZ Spot creates catastrophic concentration risk. This workload is a perfect fit for diversified Spot Fleets.",
      },
    },
    {
      type: "action-rationale",
      id: "spot-ondemand-s2",
      title: "Web Application Auto Scaling Group Strategy",
      context:
        "A production web application runs on an ASG with 10 EC2 instances minimum. Traffic patterns show a stable base of 6 instances needed 24/7, with scaling up to 20 during peak hours. The application is stateless but user-facing — request interruptions must be invisible to end users.",
      displayFields: [
        { label: "Minimum Instances", value: "10 (6 stable base needed 24/7)", emphasis: "normal" },
        { label: "Peak Instances", value: "Up to 20 during business hours", emphasis: "normal" },
        { label: "Application Type", value: "User-facing web app (stateless)", emphasis: "warn" },
        { label: "Interruption Impact", value: "User connection dropped if instance interrupted", emphasis: "critical" },
        { label: "Connection Draining", value: "ALB deregistration delay: 30 seconds", emphasis: "normal" },
      ],
      actions: [
        { id: "base-reserved-peak-spot", label: "6 Reserved/On-Demand for base, Spot for scaling beyond 6", color: "green" },
        { id: "all-spot-asg", label: "Convert entire ASG to Spot — draining handles interruptions gracefully", color: "orange" },
        { id: "all-ondemand-reserved", label: "Keep all On-Demand, purchase Reserved Instances for baseline", color: "yellow" },
        { id: "spot-no-draining", label: "Use Spot for all instances but disable ALB draining to speed failover", color: "red" },
      ],
      correctActionId: "base-reserved-peak-spot",
      rationales: [
        { id: "r-base-reserved-smart", text: "A base of On-Demand or Reserved Instances ensures the minimum required capacity is always available. Spot Instances for the scaling-beyond portion captures cost savings during peak hours while maintaining baseline availability. This is the AWS recommended hybrid approach for stateful/user-facing workloads." },
        { id: "r-all-spot-risk", text: "Spot can be used for user-facing workloads with proper connection draining, but having the entire fleet on Spot means a correlated interruption event could drop the minimum required capacity below 6, degrading the application for all users simultaneously." },
        { id: "r-all-reserved-missed-savings", text: "All On-Demand or Reserved with no Spot misses significant savings during peak hours. The 4–14 instances used only during peaks are ideal candidates for Spot." },
        { id: "r-no-draining-bad", text: "Disabling ALB connection draining for Spot interruptions means in-flight HTTP requests are dropped instantly — users see connection reset errors. The 2-minute interruption notice from Spot should be used to drain connections gracefully before termination." },
      ],
      correctRationaleId: "r-base-reserved-smart",
      feedback: {
        perfect: "Correct hybrid strategy. Stable baseline on On-Demand/Reserved, scaling capacity on Spot. This provides cost optimization for variable load without risking baseline availability.",
        partial: "Your approach has merit but either exposes the application to full-fleet interruption risk (all Spot) or misses cost savings opportunity (all On-Demand/Reserved).",
        wrong: "Never disable connection draining for Spot interruptions. And a fully-Spot user-facing app without baseline On-Demand capacity risks taking the app below minimum capacity during correlated interruption events.",
      },
    },
    {
      type: "action-rationale",
      id: "spot-ondemand-s3",
      title: "Handling a Spot Interruption Notice",
      context:
        "Your application receives a Spot interruption notice (via EC2 Instance Metadata) for one of 8 worker instances in a Spot Fleet. The workers are processing jobs from an SQS queue. The interrupted instance is currently processing a 45-minute job that has 12 minutes remaining. The interruption will occur in 2 minutes.",
      displayFields: [
        { label: "Notice Type", value: "Spot interruption — 2 minutes until termination", emphasis: "critical" },
        { label: "Current Job Progress", value: "45-min job, 12 min remaining", emphasis: "warn" },
        { label: "Job Source", value: "SQS queue (visibility timeout: 60 min)", emphasis: "normal" },
        { label: "Fleet Size", value: "7 other Spot workers still active", emphasis: "normal" },
        { label: "Checkpointing", value: "No mid-job checkpointing implemented", emphasis: "warn" },
      ],
      actions: [
        { id: "return-to-queue", label: "Signal the SQS message back to the queue (change visibility timeout to 0) so another worker picks it up", color: "green" },
        { id: "let-terminate-sqs-auto", label: "Do nothing — SQS visibility timeout will expire after 60 min and requeue automatically", color: "yellow" },
        { id: "complete-in-2min", label: "Attempt to complete the remaining 12 minutes of work in 2 minutes by skipping validation steps", color: "red" },
        { id: "snapshot-ebs-checkpoint", label: "Take an EBS snapshot of the instance volume to checkpoint state before termination", color: "orange" },
      ],
      correctActionId: "return-to-queue",
      rationales: [
        { id: "r-requeue-immediate", text: "Returning the SQS message to the queue immediately (setting visibility timeout to 0) makes it available right away for another of the 7 active workers. The job re-starts from the beginning — 45 minutes total — but starts immediately rather than waiting 48 minutes for the visibility timeout to expire." },
        { id: "r-wait-60min-slow", text: "SQS will eventually requeue the message when the 60-minute visibility timeout expires, but that means a 48-minute delay (60 - 12 = 48 minutes of waiting) before another worker picks up the job. Proactive requeue is much faster." },
        { id: "r-rush-job-bad", text: "Skipping validation steps to rush a data processing job produces incorrect or corrupt output. The 2-minute window isn't enough for 12 minutes of remaining work, and corrupted output is worse than a retry." },
        { id: "r-ebs-snapshot-no", text: "EBS snapshots don't capture in-memory application state — they capture disk state. The in-flight SQS message and job processing state would not be recoverable from an EBS snapshot." },
      ],
      correctRationaleId: "r-requeue-immediate",
      feedback: {
        perfect: "Correct graceful interruption handling. Proactively changing visibility to 0 requeues the job immediately, avoiding 48 minutes of waiting. This is the Spot Instance graceful degradation best practice for SQS-based workers.",
        partial: "SQS auto-requeue eventually works, but 48 minutes of delay is avoidable. The interruption notice gives you 2 minutes — use them to requeue the job proactively.",
        wrong: "Rushing a job by skipping validation produces corrupted results. The correct response to a Spot interruption when work can't complete is to cleanly return the work item to the queue for another worker.",
      },
    },
  ],
  hints: [
    "Spot Instances are appropriate when workloads are: fault-tolerant, flexible on timing, and can handle 2-minute interruption notices. ML training, batch processing, and CI/CD are classic Spot use cases.",
    "For user-facing applications, keep baseline capacity On-Demand and use Spot only for scale-out above the minimum. This protects core availability while capturing cost savings on variable load.",
    "The SQS visibility timeout is your safety net for Spot interruptions. But proactively resetting the visibility to 0 when you receive an interruption notice is faster than waiting for the timeout to expire.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "EC2 Spot Instances can reduce compute costs by 60–90%. Engineers who know how to design fault-tolerant architectures that leverage Spot without risking production availability are highly valued in cloud cost optimization initiatives. This skill is commonly tested in AWS Solutions Architect exams and appears in senior infrastructure roles.",
  toolRelevance: ["AWS Console", "EC2 Spot Console", "AWS CLI", "CloudWatch"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
