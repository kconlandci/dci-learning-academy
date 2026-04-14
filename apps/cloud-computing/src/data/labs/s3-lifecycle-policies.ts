import type { LabManifest } from "../../types/manifest";

export const s3LifecyclePoliciesLab: LabManifest = {
  schemaVersion: "1.1",
  id: "s3-lifecycle-policies",
  version: 1,
  title: "S3 Lifecycle Policies",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "s3", "lifecycle", "storage-class", "cost-optimization"],
  description:
    "Configure S3 lifecycle policies to automatically transition objects through storage classes and expire old data, reducing storage costs without impacting application access patterns.",
  estimatedMinutes: 9,
  learningObjectives: [
    "Match S3 storage classes to object access frequency patterns",
    "Configure lifecycle transition rules to minimize storage costs",
    "Set expiration policies to automatically remove obsolete objects",
    "Understand minimum storage duration charges before transitioning objects",
  ],
  sortOrder: 110,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "s3-lifecycle-s1",
      title: "Application Log Archive Lifecycle",
      description:
        "An application writes daily log files to S3 Standard. Logs are actively queried for 7 days after creation, occasionally accessed for 30 days, and then never accessed after 90 days. Configure the lifecycle policy to minimize cost while maintaining accessibility.",
      targetSystem: "S3 Bucket Lifecycle: app-logs-bucket",
      items: [
        {
          id: "initial-transition",
          label: "Transition After 30 Days",
          detail: "After the active 7-day window, logs are only occasionally accessed. Choose the appropriate storage class.",
          currentState: "No transition (stays in S3 Standard)",
          correctState: "Transition to S3 Standard-IA",
          states: [
            "No transition (stays in S3 Standard)",
            "Transition to S3 Standard-IA",
            "Transition to S3 Glacier Instant Retrieval",
            "Transition to S3 Glacier Flexible Retrieval",
          ],
          rationaleId: "r-standard-ia-30days",
        },
        {
          id: "archive-transition",
          label: "Transition After 90 Days",
          detail: "After 90 days, logs are never accessed for normal operations but must be retained for compliance audits.",
          currentState: "No transition",
          correctState: "Transition to S3 Glacier Instant Retrieval",
          states: [
            "No transition (stays in S3 Standard-IA)",
            "Transition to S3 Glacier Instant Retrieval",
            "Transition to S3 Glacier Flexible Retrieval",
            "Transition to S3 Glacier Deep Archive",
          ],
          rationaleId: "r-glacier-90days",
        },
        {
          id: "expiration",
          label: "Object Expiration",
          detail: "Compliance requires logs to be retained for exactly 365 days, then deleted.",
          currentState: "No expiration (objects kept forever)",
          correctState: "Expire after 365 days",
          states: ["No expiration (objects kept forever)", "Expire after 90 days", "Expire after 365 days", "Expire after 730 days"],
          rationaleId: "r-expiration-compliance",
        },
        {
          id: "incomplete-multipart",
          label: "Incomplete Multipart Upload Cleanup",
          detail: "Failed multipart uploads can accumulate silently and incur storage charges for partial data.",
          currentState: "No rule (incomplete uploads accumulate)",
          correctState: "Abort incomplete multipart uploads after 7 days",
          states: [
            "No rule (incomplete uploads accumulate)",
            "Abort incomplete multipart uploads after 7 days",
            "Abort incomplete multipart uploads after 1 day",
          ],
          rationaleId: "r-multipart-cleanup",
        },
        {
          id: "noncurrent-versions",
          label: "Non-Current Version Lifecycle",
          detail: "Versioning is enabled. Old versions of overwritten log files accumulate.",
          currentState: "Non-current versions kept forever",
          correctState: "Expire non-current versions after 30 days",
          states: [
            "Non-current versions kept forever",
            "Expire non-current versions after 7 days",
            "Expire non-current versions after 30 days",
            "Transition non-current versions to Glacier after 30 days",
          ],
          rationaleId: "r-noncurrent-versions",
        },
      ],
      rationales: [
        {
          id: "r-standard-ia-30days",
          text: "S3 Standard-IA (Infrequent Access) costs 58% less per GB than Standard but charges per retrieval. It has a 30-day minimum storage duration, making it appropriate for objects accessed occasionally after the first 30 days.",
        },
        {
          id: "r-glacier-90days",
          text: "Glacier Instant Retrieval provides millisecond access (unlike Flexible Retrieval which takes hours). For compliance logs that may need to be retrieved during an audit without advance notice, Instant Retrieval is the right archive tier.",
        },
        {
          id: "r-expiration-compliance",
          text: "Automatic expiration after exactly 365 days satisfies the retention requirement and prevents indefinite accumulation. Without expiration, old data remains and incurs Glacier storage costs indefinitely.",
        },
        {
          id: "r-multipart-cleanup",
          text: "Incomplete multipart uploads are invisible in S3 Console but charge for the stored parts. A 7-day abort rule is a standard best practice that catches failed large-file uploads without aggressively canceling in-progress ones.",
        },
        {
          id: "r-noncurrent-versions",
          text: "When versioning is enabled, overwritten objects create non-current versions that count toward storage costs. Expiring non-current versions after 30 days keeps recent backups without unlimited accumulation.",
        },
      ],
      feedback: {
        perfect:
          "Optimal lifecycle configuration. Objects flow through Standard → Standard-IA → Glacier Instant → expiration on schedule, with multipart cleanup and version management preventing hidden cost accumulation.",
        partial:
          "Most transitions are correct but at least one configuration is missing or wrong. Incomplete multipart cleanup and non-current version expiration are frequently overlooked but important cost controls.",
        wrong:
          "The lifecycle policy has significant gaps. Without transitions, objects remain in expensive Standard storage indefinitely. Without expiration, compliance logs accumulate storage costs forever.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-lifecycle-s2",
      title: "Media Asset Storage Optimization",
      description:
        "A media streaming service stores video files in S3. Original uploaded videos (source files) are accessed heavily for the first 24 hours after upload, rarely after 30 days, and the source files beyond 1 year are never needed. Transcoded output files follow a different pattern. Configure lifecycle policies for source files.",
      targetSystem: "S3 Bucket: media-source-originals",
      items: [
        {
          id: "early-transition",
          label: "Transition Before 30 Days",
          detail: "Videos are heavily accessed in the first 24 hours after upload. What should happen after initial access dies down (7 days)?",
          currentState: "No transition",
          correctState: "No transition before 30 days (minimum IA storage duration)",
          states: [
            "Transition to Standard-IA after 7 days",
            "No transition before 30 days (minimum IA storage duration)",
            "Transition to Glacier after 7 days",
          ],
          rationaleId: "r-minimum-storage-duration",
        },
        {
          id: "30day-transition",
          label: "Transition After 30 Days",
          detail: "After 30 days, original source files are rarely accessed but could be needed for re-encoding.",
          currentState: "No transition",
          correctState: "Transition to S3 Standard-IA after 30 days",
          states: [
            "No transition (keep in Standard)",
            "Transition to S3 Standard-IA after 30 days",
            "Transition to S3 Glacier Instant Retrieval after 30 days",
          ],
          rationaleId: "r-ia-source-files",
        },
        {
          id: "1year-action",
          label: "Action After 365 Days",
          detail: "Source files beyond 1 year are never needed. Business policy allows deletion.",
          currentState: "No action",
          correctState: "Expire objects after 365 days",
          states: [
            "No action",
            "Transition to S3 Glacier Deep Archive after 365 days",
            "Expire objects after 365 days",
          ],
          rationaleId: "r-delete-not-archive",
        },
        {
          id: "intelligent-tiering",
          label: "S3 Intelligent-Tiering for Unpredictable Files",
          detail: "Some creator files have unpredictable access patterns — viral content gets accessed for months. Should Intelligent-Tiering be used?",
          currentState: "Not configured",
          correctState: "Transition viral-flagged prefix to Intelligent-Tiering",
          states: [
            "Not configured",
            "Transition viral-flagged prefix to Intelligent-Tiering",
            "Apply Intelligent-Tiering to all objects",
          ],
          rationaleId: "r-intelligent-tiering-scoped",
        },
      ],
      rationales: [
        {
          id: "r-minimum-storage-duration",
          text: "S3 Standard-IA has a 30-day minimum storage duration charge. If you transition an object to Standard-IA and delete or transition it before 30 days, you're still charged for 30 days. Transitioning at day 7 and then to Glacier at day 30 would incur the minimum IA charge even though the object was only in IA for 23 days.",
        },
        {
          id: "r-ia-source-files",
          text: "Standard-IA at 30 days is cost-effective for rarely accessed source files. The retrieval fee is acceptable when files are only accessed for re-encoding jobs, not on every user playback.",
        },
        {
          id: "r-delete-not-archive",
          text: "If source files beyond 1 year are never needed, archiving to Glacier Deep Archive still costs money ($0.00099/GB-month). Deletion is free and is the correct action when retention is not required.",
        },
        {
          id: "r-intelligent-tiering-scoped",
          text: "Intelligent-Tiering has a per-object monitoring charge ($0.0025 per 1,000 objects/month). For small objects or objects with predictable patterns, it costs more than a manual lifecycle policy. Apply it selectively where access patterns are genuinely unpredictable.",
        },
      ],
      feedback: {
        perfect:
          "Correct lifecycle strategy for media assets. Minimum duration charges are respected, Standard-IA is used for rarely-accessed source files, expired rather than archived when not needed, and Intelligent-Tiering is applied selectively.",
        partial:
          "Most settings are correct. Watch for the minimum storage duration trap — transitioning to Standard-IA before 30 days and quickly moving out incurs the full 30-day charge.",
        wrong:
          "The lifecycle policy has cost traps. Transitioning to Standard-IA before 30 days incurs minimum storage charges. Archiving files that are never needed (instead of deleting) adds ongoing Glacier costs.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-lifecycle-s3",
      title: "Backup Bucket Cost Reduction",
      description:
        "An automated backup system writes database snapshots to S3 daily. The bucket currently stores 2 years of daily backups in S3 Standard. Only backups from the last 7 days are ever needed for immediate recovery. Monthly backups from the past year may be needed for point-in-time audit. Annual backups are kept for 7 years for compliance.",
      targetSystem: "S3 Bucket: database-backups",
      items: [
        {
          id: "recent-backups",
          label: "Backups 0–7 Days Old",
          detail: "Actively used for disaster recovery. Must be immediately accessible.",
          currentState: "S3 Standard (correct)",
          correctState: "S3 Standard (correct)",
          states: ["S3 Standard (correct)", "S3 Standard-IA", "S3 Glacier Instant Retrieval"],
          rationaleId: "r-recent-standard",
        },
        {
          id: "monthly-backups",
          label: "Monthly Backups 30–365 Days Old",
          detail: "May be needed for audit (non-urgent). Retrieval time of a few hours acceptable.",
          currentState: "S3 Standard",
          correctState: "S3 Glacier Flexible Retrieval",
          states: ["S3 Standard", "S3 Standard-IA", "S3 Glacier Instant Retrieval", "S3 Glacier Flexible Retrieval"],
          rationaleId: "r-monthly-glacier",
        },
        {
          id: "annual-backups",
          label: "Annual Backups 1–7 Years Old",
          detail: "Compliance retention. Retrieved at most once per year during audits. 12-hour retrieval acceptable.",
          currentState: "S3 Standard",
          correctState: "S3 Glacier Deep Archive",
          states: ["S3 Standard", "S3 Glacier Flexible Retrieval", "S3 Glacier Deep Archive"],
          rationaleId: "r-compliance-deep-archive",
        },
        {
          id: "delete-old-daily",
          label: "Daily Backups Older Than 30 Days",
          detail: "Daily backups beyond 30 days are superseded by monthly backups. No need to keep both.",
          currentState: "Retained indefinitely",
          correctState: "Expire after 30 days",
          states: ["Retained indefinitely", "Expire after 30 days", "Transition to Glacier after 30 days"],
          rationaleId: "r-daily-expiry",
        },
      ],
      rationales: [
        {
          id: "r-recent-standard",
          text: "Backups used for active disaster recovery must be in Standard for immediate retrieval. Any retrieval delay for a recent backup during an incident is unacceptable.",
        },
        {
          id: "r-monthly-glacier",
          text: "Glacier Flexible Retrieval costs $0.0036/GB-month (vs $0.023 for Standard) — 84% cheaper. For audit use cases where hours of retrieval time is acceptable, Flexible Retrieval is ideal.",
        },
        {
          id: "r-compliance-deep-archive",
          text: "Glacier Deep Archive at $0.00099/GB-month is the lowest-cost durable storage in AWS — 96% cheaper than Standard. For compliance backups retrieved once per year, the 12-hour retrieval time is acceptable and the cost savings are enormous at scale.",
        },
        {
          id: "r-daily-expiry",
          text: "Once a monthly backup exists, the daily backups from that month are redundant. Keeping both wastes storage. Expiring daily backups at 30 days prevents indefinite accumulation while monthly backups cover the audit window.",
        },
      ],
      feedback: {
        perfect:
          "Excellent tiered backup lifecycle strategy. Recent backups stay in Standard for fast recovery, monthly backups go to Glacier Flexible Retrieval, annual compliance backups go to Deep Archive, and redundant daily backups expire cleanly.",
        partial:
          "The tiering strategy is partially correct. Ensure annual compliance backups use Deep Archive (the cheapest durable tier) and that redundant daily backups expire to avoid paying for both daily and monthly copies.",
        wrong:
          "Keeping all backups in S3 Standard is a significant cost inefficiency. 2 years of daily database backups in Standard can cost 10–20x more than a properly tiered lifecycle policy.",
      },
    },
  ],
  hints: [
    "S3 storage class minimum durations: Standard-IA = 30 days, Glacier Instant/Flexible = 90 days, Glacier Deep Archive = 180 days. Transitioning out early still incurs the full minimum charge.",
    "The cheapest S3 storage: Glacier Deep Archive at $0.00099/GB-month. Standard is $0.023/GB-month — 23x more expensive. The tradeoff is 12-hour retrieval time.",
    "Intelligent-Tiering has a per-object monitoring fee. It's only cost-effective for objects over 128 KB with unpredictable access patterns — not for uniformly accessed or small objects.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "S3 lifecycle policy optimization is one of the fastest wins in cloud cost management. Many organizations run with no lifecycle policies at all, accumulating years of objects in expensive Standard storage. Engineers who can design and implement lifecycle policies are valuable in FinOps and infrastructure roles — this is a practical skill with immediate dollar impact.",
  toolRelevance: ["AWS Console", "AWS CLI", "S3 Storage Lens", "AWS Cost Explorer"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
