import type { LabManifest } from "../../types/manifest";

export const rdsBackupStrategyLab: LabManifest = {
  schemaVersion: "1.1",
  id: "rds-backup-strategy",
  version: 1,
  title: "RDS Backup Strategy",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "rds", "backup", "recovery", "database"],
  description:
    "Configure RDS automated backups, manual snapshots, and point-in-time recovery to meet RPO and RTO requirements for different business scenarios.",
  estimatedMinutes: 9,
  learningObjectives: [
    "Define appropriate backup retention periods based on RPO requirements",
    "Distinguish between automated backups and manual snapshots",
    "Configure Multi-AZ for high availability vs single-AZ for cost optimization",
    "Calculate recovery time implications for different backup strategies",
  ],
  sortOrder: 102,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "rds-backup-s1",
      title: "Financial Application RPO Requirement",
      context:
        "A fintech application stores transaction records in RDS MySQL. The compliance team requires an RPO of 1 hour (maximum data loss in a failure). The current setup has automated backups disabled and no Multi-AZ. A major incident last week caused 6 hours of data loss.",
      displayFields: [
        { label: "Engine", value: "MySQL 8.0 on RDS", emphasis: "normal" },
        { label: "Current Automated Backups", value: "Disabled", emphasis: "critical" },
        { label: "Multi-AZ", value: "No", emphasis: "warn" },
        { label: "Required RPO", value: "1 hour", emphasis: "warn" },
        { label: "Last Incident Data Loss", value: "6 hours", emphasis: "critical" },
      ],
      actions: [
        { id: "enable-backups-1day", label: "Enable automated backups with 1-day retention only", color: "yellow" },
        { id: "enable-backups-multiaz", label: "Enable automated backups with 7-day retention + enable Multi-AZ", color: "green" },
        { id: "manual-snapshots-daily", label: "Take manual snapshots daily via Lambda at midnight", color: "orange" },
        { id: "enable-backups-35day", label: "Enable automated backups with 35-day retention + no Multi-AZ", color: "yellow" },
      ],
      correctActionId: "enable-backups-multiaz",
      rationales: [
        { id: "r-pitr-multiaz", text: "Automated backups enable Point-in-Time Recovery (PITR) to any second within the retention window, directly satisfying the 1-hour RPO. Multi-AZ provides synchronous replication for near-zero RPO during AZ failures — the two work together for comprehensive protection." },
        { id: "r-manual-gap", text: "Manual daily snapshots only give you recovery to the previous midnight — a potential 24-hour data loss window. They don't satisfy a 1-hour RPO requirement." },
        { id: "r-1day-insufficient", text: "1-day retention enables PITR within the last 24 hours, which meets the RPO. But without Multi-AZ, an AZ failure still causes an outage during the recovery process." },
        { id: "r-35day-no-ha", text: "35-day retention is excessive for this RPO and costs more. Without Multi-AZ, the database still has a single point of failure that caused the original incident." },
      ],
      correctRationaleId: "r-pitr-multiaz",
      feedback: {
        perfect: "Correct. Automated backups with PITR satisfy the 1-hour RPO, and Multi-AZ addresses the high-availability gap that caused the original incident. 7-day retention balances cost with recovery flexibility.",
        partial: "You've addressed part of the problem. PITR via automated backups is needed for the RPO requirement, but without Multi-AZ, an AZ failure still leaves the database unavailable during failover recovery.",
        wrong: "Manual snapshots cannot meet a 1-hour RPO — they only capture the database state at snapshot time. Automated backups with PITR are the correct mechanism for time-based recovery objectives.",
      },
    },
    {
      type: "action-rationale",
      id: "rds-backup-s2",
      title: "Snapshot Before Major Schema Migration",
      context:
        "Your team is about to run an irreversible database migration — adding NOT NULL columns with no default to 3 tables and dropping 2 legacy tables. The migration will run during a 30-minute maintenance window tonight. If something goes wrong, you need to recover within 15 minutes.",
      displayFields: [
        { label: "Database", value: "RDS PostgreSQL 15 (db.r6g.xlarge)", emphasis: "normal" },
        { label: "Database Size", value: "120 GB", emphasis: "normal" },
        { label: "Migration Type", value: "Irreversible DDL changes", emphasis: "critical" },
        { label: "Maintenance Window", value: "Tonight 02:00–02:30 UTC", emphasis: "normal" },
        { label: "Required RTO if Failure", value: "15 minutes", emphasis: "warn" },
      ],
      actions: [
        { id: "rely-on-automated", label: "Rely on today's automated backup (PITR will work)", color: "red" },
        { id: "manual-snapshot-before", label: "Take a manual snapshot 1 hour before migration", color: "green" },
        { id: "create-read-replica", label: "Create a read replica and promote it if migration fails", color: "yellow" },
        { id: "dump-to-s3", label: "Export a pg_dump to S3 before the migration", color: "orange" },
      ],
      correctActionId: "manual-snapshot-before",
      rationales: [
        { id: "r-snapshot-cleanstate", text: "A manual snapshot taken before the migration gives you a known-good, pre-migration recovery point. Restoring from it is a predictable operation that can be completed in 10–15 minutes for a 120 GB database using RDS Restore." },
        { id: "r-pitr-wrong", text: "PITR restores to a point in time, but you'd need to restore to exactly before the migration started — and the automated backup window may not be recent enough. Manual snapshots are explicit and unambiguous." },
        { id: "r-replica-slow", text: "Promoting a read replica takes 5–10 minutes and still reflects post-migration state if it was already replicating the DDL changes. It doesn't give you a clean pre-migration state." },
        { id: "r-pgdump-slow", text: "pg_dump of 120 GB takes 20–40 minutes to complete and even longer to restore. This does not meet a 15-minute RTO." },
      ],
      correctRationaleId: "r-snapshot-cleanstate",
      feedback: {
        perfect: "Correct. A manual snapshot is the gold standard pre-migration safety net. It's faster to restore than a pg_dump, more explicit than PITR, and gives you a guaranteed clean recovery point before any changes were made.",
        partial: "Your approach could work but has timing risks. PITR is valid but requires accurately identifying the pre-migration timestamp under pressure. A manual snapshot is explicit and unambiguous.",
        wrong: "This approach doesn't guarantee a clean pre-migration recovery point. For irreversible DDL migrations, a manual snapshot taken immediately before is the most reliable and fastest recovery option.",
      },
    },
    {
      type: "action-rationale",
      id: "rds-backup-s3",
      title: "Cost-Optimizing Backup Strategy for Dev Environment",
      context:
        "A development RDS instance runs Monday–Friday during business hours. It currently has 35-day automated backup retention and Multi-AZ enabled — same as production. The dev team can tolerate losing up to 24 hours of work and can wait up to 2 hours for recovery. The database costs $800/month including backup storage.",
      displayFields: [
        { label: "Environment", value: "Development (non-production)", emphasis: "normal" },
        { label: "Current Backup Retention", value: "35 days", emphasis: "warn" },
        { label: "Multi-AZ", value: "Enabled", emphasis: "warn" },
        { label: "Acceptable Data Loss", value: "24 hours", emphasis: "normal" },
        { label: "Acceptable Recovery Time", value: "2 hours", emphasis: "normal" },
        { label: "Monthly Cost", value: "$800 (overprovisioned)", emphasis: "warn" },
      ],
      actions: [
        { id: "reduce-retention-7", label: "Reduce backup retention to 7 days, disable Multi-AZ", color: "green" },
        { id: "disable-backups-entirely", label: "Disable automated backups entirely, take weekly snapshots manually", color: "orange" },
        { id: "keep-same", label: "Keep current configuration — dev environments should mirror prod", color: "red" },
        { id: "reduce-retention-1", label: "Reduce retention to 1 day, disable Multi-AZ, schedule stop/start", color: "yellow" },
      ],
      correctActionId: "reduce-retention-7",
      rationales: [
        { id: "r-dev-rightsized", text: "7-day retention fully covers the 24-hour RPO with plenty of buffer. Disabling Multi-AZ is appropriate for dev — a 2-hour RTO is satisfied by single-AZ restore. These two changes alone can reduce backup costs by 60%+." },
        { id: "r-no-backups-risky", text: "Disabling automated backups removes PITR. Weekly manual snapshots only protect to the last Sunday — a 7-day potential data loss that exceeds the stated 24-hour tolerance." },
        { id: "r-dev-mirrors-prod-waste", text: "Dev environments should NOT mirror prod configuration for cost. Dev teams accept higher RPO/RTO tradeoffs. 35-day retention and Multi-AZ on dev is a common waste of 40–50% of the database budget." },
        { id: "r-1day-too-tight", text: "1-day retention meets the RPO but leaves only a tiny buffer. If a data corruption isn't discovered until 26 hours later, you lose all recovery options. 7 days provides a reasonable safety margin." },
      ],
      correctRationaleId: "r-dev-rightsized",
      feedback: {
        perfect: "Correct. 7-day retention and single-AZ is the right-sized configuration for this dev environment. It satisfies both the 24-hour RPO and 2-hour RTO while potentially cutting backup-related costs by more than half.",
        partial: "You've identified the right direction but either went too far (1-day retention offers too little buffer) or not far enough (keeping Multi-AZ on dev adds cost without meeting a business requirement).",
        wrong: "Dev environments should be right-sized to their actual requirements, not a copy of production. Mirroring prod configuration wastes budget. Disabling backups entirely creates unacceptable data loss risk.",
      },
    },
  ],
  hints: [
    "RPO (Recovery Point Objective) = maximum acceptable data loss. RTO (Recovery Time Objective) = maximum acceptable downtime. These are different and require different solutions.",
    "Automated backups enable PITR (Point-in-Time Recovery) to any second within the retention window. Manual snapshots only restore to the exact snapshot moment.",
    "Multi-AZ is about availability (minimizing downtime), not backup. Automated backups are about recoverability (minimizing data loss). You may need both, neither, or just one.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "RDS backup strategy questions appear in AWS Solutions Architect and Database Specialty exams. In practice, production incidents that expose backup gaps are career-defining events — in the wrong way. Understanding the difference between PITR and snapshots, and RPO vs RTO, is foundational knowledge for any cloud engineer responsible for databases.",
  toolRelevance: ["AWS Console", "AWS CLI", "AWS Backup", "RDS Console"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
