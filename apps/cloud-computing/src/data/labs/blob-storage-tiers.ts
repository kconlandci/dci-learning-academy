import type { LabManifest } from "../../types/manifest";

export const blobStorageTiersLab: LabManifest = {
  schemaVersion: "1.1",
  id: "blob-storage-tiers",
  version: 1,
  title: "Azure Blob Storage Access Tiers",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "storage", "blob", "tiers", "lifecycle"],
  description:
    "Configure the correct Azure Blob Storage access tiers and lifecycle policies to minimize cost while meeting data access requirements.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Distinguish Hot, Cool, Cold, and Archive blob storage tiers by cost and access latency",
    "Design lifecycle management policies that automatically transition blobs as they age",
    "Calculate the cost impact of incorrect tier placement for read-heavy vs write-heavy workloads",
  ],
  sortOrder: 201,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "scenario-1",
      title: "Media Company Archival Policy",
      description:
        "A media company stores video production assets in Azure Blob Storage. New files are actively edited for the first 30 days, occasionally referenced for 31–90 days, rarely accessed from 91–365 days, and must be retained for 7 years for compliance. Configure each blob lifecycle stage to the correct tier.",
      targetSystem: "Azure Blob Storage Lifecycle Management Policy",
      items: [
        {
          id: "item-new-files",
          label: "Days 0–30: Active Production Files",
          detail:
            "Files are read/written multiple times per day by editing workstations. High transaction volume. Low latency required.",
          currentState: "cool",
          correctState: "hot",
          states: ["hot", "cool", "cold", "archive"],
          rationaleId: "rationale-hot",
        },
        {
          id: "item-recent-files",
          label: "Days 31–90: Post-Production Review",
          detail:
            "Files are read occasionally for client review and approvals. Read operations a few times per week. Write operations rare.",
          currentState: "hot",
          correctState: "cool",
          states: ["hot", "cool", "cold", "archive"],
          rationaleId: "rationale-cool",
        },
        {
          id: "item-reference-files",
          label: "Days 91–365: Reference Archive",
          detail:
            "Files are retrieved infrequently — perhaps once a month — for re-edits or repurposing. Early retrieval penalty acceptable.",
          currentState: "hot",
          correctState: "cold",
          states: ["hot", "cool", "cold", "archive"],
          rationaleId: "rationale-cold",
        },
        {
          id: "item-compliance-files",
          label: "Days 366–7 years: Compliance Retention",
          detail:
            "Files must be retained per legal requirement but are almost never accessed. Retrieval time of hours is acceptable. Cost must be minimized.",
          currentState: "cool",
          correctState: "archive",
          states: ["hot", "cool", "cold", "archive"],
          rationaleId: "rationale-archive",
        },
      ],
      rationales: [
        {
          id: "rationale-hot",
          text: "Hot tier is optimized for frequent reads and writes with the lowest per-transaction cost and no early deletion penalty. Active production files accessed daily must be in Hot to avoid excessive transaction charges.",
        },
        {
          id: "rationale-cool",
          text: "Cool tier reduces storage cost by ~50% vs Hot with a slightly higher per-read cost. For files accessed a few times per week the read cost increase is offset by storage savings. Minimum storage duration is 30 days.",
        },
        {
          id: "rationale-cold",
          text: "Cold tier (introduced 2023) sits between Cool and Archive — lower storage cost than Cool with millisecond access latency retained. Ideal for monthly-frequency access where you need immediate retrieval but want sub-Cool storage pricing. Minimum storage duration is 90 days.",
        },
        {
          id: "rationale-archive",
          text: "Archive tier is the lowest-cost storage option (~10x cheaper than Hot) but blobs are offline and must be rehydrated (takes 1–15 hours) before reading. Perfect for compliance retention where retrieval is rare and latency is acceptable. Minimum storage duration is 180 days.",
        },
      ],
      feedback: {
        perfect:
          "Perfect tier configuration. Your lifecycle policy minimizes storage cost at every stage while respecting access latency requirements.",
        partial:
          "Some tiers are correct but others are mismatched. Check that you've aligned each stage to its actual access frequency.",
        wrong:
          "The configuration would either overspend (keeping infrequent data in Hot) or cause latency issues (archiving active files). Review each tier's cost/latency tradeoff.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-2",
      title: "Lifecycle Policy Toggle — Feature Flags",
      description:
        "An existing Azure Blob Storage lifecycle policy has several rules configured. Review each rule toggle and set it to the correct enabled/disabled state based on the business requirements described.",
      targetSystem: "Azure Portal > Storage Account > Data Management > Lifecycle Management",
      items: [
        {
          id: "item-rule-tiering",
          label: "Auto-tiering: Move blobs to Cool after 30 days of no access",
          detail:
            "The storage account holds active application logs. Log files are read by the SIEM tool daily for the first 30 days, then never accessed again. Storage cost is the primary concern.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-tiering-on",
        },
        {
          id: "item-rule-delete",
          label: "Auto-delete: Delete blobs older than 90 days",
          detail:
            "Compliance policy requires log retention for 1 year minimum. Legal has confirmed logs cannot be deleted before 365 days.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-delete-off",
        },
        {
          id: "item-rule-snapshots",
          label: "Snapshot cleanup: Delete blob snapshots older than 7 days",
          detail:
            "Blob snapshots are created automatically by the backup policy every 6 hours. The recovery point objective (RPO) is 48 hours. Snapshots older than 7 days are outside the recovery window and waste storage.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-snapshots-on",
        },
        {
          id: "item-rule-versions",
          label: "Version cleanup: Delete all previous blob versions immediately",
          detail:
            "Versioning is enabled for change tracking. The development team occasionally rolls back config blobs up to 14 days back. Immediate version deletion would break rollback capability.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-versions-off",
        },
      ],
      rationales: [
        {
          id: "rationale-tiering-on",
          text: "Enabling auto-tiering to Cool after 30 days aligns with the access pattern — logs are read daily for 30 days then never touched. Moving to Cool saves ~50% on storage cost with no operational impact since the SIEM never accesses them after day 30.",
        },
        {
          id: "rationale-delete-off",
          text: "Auto-delete at 90 days directly violates the 1-year compliance retention requirement. This rule must be disabled (or updated to delete after 365+ days). Violating retention policies can result in regulatory penalties.",
        },
        {
          id: "rationale-snapshots-on",
          text: "Since the RPO is 48 hours and backups run every 6 hours, snapshots older than 7 days (well beyond the recovery window) are safe to delete. Enabling this rule prevents snapshot accumulation that can significantly inflate storage bills.",
        },
        {
          id: "rationale-versions-off",
          text: "Immediately deleting all previous versions breaks the 14-day rollback capability the dev team relies on. This rule must remain disabled. If cost is a concern, configure the rule to delete versions older than 14 days instead.",
        },
      ],
      feedback: {
        perfect:
          "All lifecycle rules correctly configured. You balanced cost optimization with compliance and operational requirements.",
        partial:
          "Some rules are set correctly but others would either violate compliance or break operational workflows. Review each rule's business context.",
        wrong:
          "The configuration has critical issues — either deleting data before compliance retention expires or keeping unnecessary data that inflates costs.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-3",
      title: "Storage Account Redundancy and Tier Compatibility",
      description:
        "A storage account needs to be reconfigured for a new DR requirement. Toggle each setting to its correct state based on the requirements: RPO < 15 minutes for a business-critical application, GZRS redundancy, and blob access tier optimization.",
      targetSystem: "Azure Portal > Storage Account > Configuration",
      items: [
        {
          id: "item-redundancy",
          label: "Replication: Geo-Zone-Redundant Storage (GZRS)",
          detail:
            "The application needs protection against both zone failures (within region) and full regional disasters. RPO must be under 15 minutes.",
          currentState: "lrs",
          correctState: "gzrs",
          states: ["lrs", "zrs", "grs", "gzrs"],
          rationaleId: "rationale-gzrs",
        },
        {
          id: "item-default-tier",
          label: "Default Access Tier: Cool",
          detail:
            "The storage account primarily serves a CDN origin for static website assets that receive millions of requests per day. Read-heavy workload with high transaction volume.",
          currentState: "cool",
          correctState: "hot",
          states: ["hot", "cool"],
          rationaleId: "rationale-tier-hot",
        },
        {
          id: "item-ra-gzrs",
          label: "Read Access: Enable RA-GZRS (read from secondary region)",
          detail:
            "The application must remain readable even if the primary region is fully unavailable. Read access to the secondary region is required.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-ra",
        },
        {
          id: "item-blob-versioning",
          label: "Blob Versioning: Enabled",
          detail:
            "The static website assets are updated via CI/CD pipelines. Accidental overwrites have occurred twice this year. The team needs the ability to restore previous versions of any asset.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-versioning",
        },
      ],
      rationales: [
        {
          id: "rationale-gzrs",
          text: "GZRS combines ZRS (3 synchronous copies across zones in the primary region) with GRS (asynchronous replication to a secondary region). It is the only replication type that protects against both zone and regional failures, with a typical RPO under 15 minutes for the geo-replication component.",
        },
        {
          id: "rationale-tier-hot",
          text: "CDN origins serving millions of daily requests have extremely high transaction volumes. Cool tier charges per-operation fees that can vastly exceed the storage cost savings when transaction count is high. Hot tier is cheaper at high transaction volumes despite higher per-GB storage cost.",
        },
        {
          id: "rationale-ra",
          text: "Standard GZRS allows failover to the secondary region but only via manual account failover. RA-GZRS enables read access to the secondary endpoint at all times, allowing the application to serve reads during a primary region outage without waiting for failover.",
        },
        {
          id: "rationale-versioning",
          text: "Blob versioning automatically saves a copy of a blob whenever it is overwritten or deleted. This directly addresses accidental overwrites by allowing point-in-time restore of any previous version. It is the recommended solution for protecting objects from inadvertent changes.",
        },
      ],
      feedback: {
        perfect:
          "Excellent. All settings are optimally configured for the stated requirements — redundancy, read availability, tier, and data protection are all aligned.",
        partial:
          "Several settings are correct but you missed important configurations that would leave the application exposed to outages or overwrite incidents.",
        wrong:
          "The configuration does not meet the DR or data protection requirements. Review each setting against the specific requirement it must satisfy.",
      },
    },
  ],
  hints: [
    "Archive tier offers the lowest storage cost but requires 1–15 hours to rehydrate before a blob can be read — never use it for data that must be immediately accessible.",
    "Lifecycle policy auto-delete rules must always be validated against your compliance retention schedule before enabling — deleting data too early can cause regulatory violations.",
    "For high-transaction workloads like CDN origins, calculate total cost = storage cost + (transaction count × per-transaction fee) for each tier before deciding.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Storage cost optimization is one of the fastest wins available to any Azure engineer. Understanding tier economics — and building lifecycle policies that automate tier transitions — directly impacts cloud bills and is a frequent topic in both FinOps conversations and AZ-900/AZ-104 exams.",
  toolRelevance: ["Azure Portal", "Azure Storage Explorer", "Azure CLI", "Azure Policy"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
