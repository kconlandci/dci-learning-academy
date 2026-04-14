import type { LabManifest } from "../../types/manifest";

export const gcpSpannerVsSqlLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-spanner-vs-sql",
  version: 1,
  title: "Cloud Spanner vs Cloud SQL Architecture Decision",
  tier: "intermediate",
  track: "gcp-essentials",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["gcp", "cloud-spanner", "cloud-sql", "database", "architecture", "global", "distributed", "transactions"],
  description:
    "Analyze production database requirements including consistency needs, global distribution, write throughput, and cost to decide between Cloud Spanner and Cloud SQL for challenging real-world workloads.",
  estimatedMinutes: 16,
  learningObjectives: [
    "Identify the characteristics that make Cloud Spanner necessary vs Cloud SQL sufficient",
    "Calculate approximate Spanner node costs against workload QPS and storage requirements",
    "Understand the strong consistency and external consistency guarantees of Cloud Spanner",
    "Apply the right database choice based on geographic distribution and transaction requirements",
  ],
  sortOrder: 311,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "spanner-scenario-1",
      title: "Global Inventory System Decision",
      objective:
        "A retail company runs flash sales globally. The current Cloud SQL (PostgreSQL) database serving inventory counts is experiencing split-brain issues — two regional deployments are showing different stock counts, causing overselling. Investigate the system requirements and decide the correct architectural direction.",
      investigationData: [
        {
          id: "current-architecture",
          label: "Current Architecture",
          content:
            "Primary Cloud SQL (us-central1): writes inventory decrements\nRead Replica (europe-west1): serves EU traffic\nRead Replica (asia-east1): serves APAC traffic\nReplication lag during flash sales: 2–8 seconds\nOversell incidents this quarter: 14\nOversell cost (refunds + ops): ~$180,000\nPeak write QPS: 8,400 inventory transactions/second during flash sales",
          isCritical: true,
        },
        {
          id: "consistency-requirement",
          label: "Business Consistency Requirement",
          content:
            "SLO: Zero overselling — 'quantity >= 1' must be globally consistent before any sale is confirmed\nCurrent issue: Read replicas serve stale inventory counts; customers in EU/APAC see stock that's already been sold in US\nTransaction type: Read-modify-write (check stock → decrement if available → confirm sale)\nConsistency model needed: Serializable, globally consistent reads\nRPO: 0 (no data loss) | RTO: 60 seconds",
          isCritical: true,
        },
        {
          id: "cloud-sql-limits",
          label: "Cloud SQL Limitations for This Use Case",
          content:
            "Cloud SQL read replicas: eventually consistent (replication lag exists)\nCloud SQL HA: single-region only — no multi-region strong consistency\nCloud SQL write scaling: limited to primary instance vCPUs (max ~100K QPS for simple writes)\nCloud SQL cross-region strong consistency: NOT supported natively\nCloud SQL max connections: limited by instance tier",
        },
        {
          id: "spanner-capabilities",
          label: "Cloud Spanner Capabilities",
          content:
            "External consistency: Globally consistent reads and writes using TrueTime\nMulti-region configs: data replicated synchronously across 3+ zones in 2+ regions\nWrite throughput: ~2,000 writes/sec per processing unit (1 node = 1,000 PUs)\nInventory table size: ~50 GB (estimated)\nSpanner nodes needed: 4-5 nodes for 8,400 QPS with headroom\nSpanner cost: ~$2,160/month for 3-node multi-region instance",
        },
      ],
      actions: [
        { id: "migrate-to-spanner", label: "Migrate inventory database to Cloud Spanner (multi-region)", color: "green" },
        { id: "add-distributed-lock", label: "Add Redis distributed lock to Cloud SQL to prevent concurrent inventory reads", color: "yellow" },
        { id: "stronger-sql-replication", label: "Upgrade to a larger Cloud SQL primary and reduce replication lag via tuning", color: "orange" },
        { id: "inventory-microservice", label: "Build an inventory microservice with in-memory state and async Cloud SQL writes", color: "red" },
      ],
      correctActionId: "migrate-to-spanner",
      rationales: [
        { id: "r-spanner-external-consistency", text: "Cloud Spanner's external consistency guarantees that any read anywhere in the world reflects all writes that committed before it. This eliminates the 2–8 second replication lag causing overselling. It's the only GCP-managed database with this guarantee." },
        { id: "r-redis-lock-fragile", text: "Redis distributed locks are complex, add latency, and can fail (lock expiry, Redis outage). They work against a single Cloud SQL primary but don't solve the multi-region stale read problem at replicas." },
        { id: "r-sql-replication-ceiling", text: "Cloud SQL replication lag is architectural — it's an eventually consistent replica model. No amount of tuning eliminates the fundamental consistency gap. The $180K/quarter in oversell costs exceed Spanner's ~$26K/year cost." },
        { id: "r-in-memory-dangerous", text: "In-memory inventory state with async writes creates durability risk — an instance crash loses pending inventory decrements, potentially causing worse overselling and data corruption." },
      ],
      correctRationaleId: "r-spanner-external-consistency",
      feedback: {
        perfect: "Correct architectural decision! Cloud Spanner's external consistency is purpose-built for exactly this problem. $26K/year in Spanner costs vs $180K/quarter in oversell refunds is a clear ROI case.",
        partial: "You identified a real improvement, but distributed locks on Cloud SQL don't solve the multi-region stale read problem. Cloud Spanner's external consistency is the only managed solution that eliminates this entirely.",
        wrong: "The fundamental problem is eventual consistency across regions — EU replicas serve stale inventory counts 2–8 seconds after US sales. Cloud SQL cannot provide strongly consistent multi-region reads. Cloud Spanner was built for exactly this requirement.",
      },
    },
    {
      type: "investigate-decide",
      id: "spanner-scenario-2",
      title: "Startup Evaluating Database for Scale",
      objective:
        "A SaaS startup is building a B2B invoicing platform. They're evaluating Cloud Spanner vs Cloud SQL PostgreSQL for their primary database. Investigate the workload characteristics and decide the right database for their current and projected needs.",
      investigationData: [
        {
          id: "current-scale",
          label: "Current Scale (Year 1)",
          content:
            "Current customers: 120 B2B clients\nCurrent database size: 8 GB\nWrite QPS (peak): 45\nRead QPS (peak): 380\nGeographic distribution: Single region (us-east1), US customers only\nTransaction complexity: Multi-table (invoice + line_items + payments + audit_log)\nDev team size: 4 engineers",
          isCritical: false,
        },
        {
          id: "projected-scale",
          label: "3-Year Growth Projection",
          content:
            "Projected customers: 4,000 B2B clients\nProjected database size: 800 GB\nProjected write QPS (peak): 2,200\nProjected read QPS (peak): 18,000\nGeographic expansion: US + EU planned in Year 2\nConsistency requirement: Strong (financial data — no stale reads acceptable)\nCompliance: SOC 2 Type II, GDPR (EU data residency by Year 2)",
          isCritical: true,
        },
        {
          id: "team-expertise",
          label: "Team Context",
          content:
            "Team PostgreSQL expertise: High (3 of 4 engineers have 5+ years PostgreSQL experience)\nTeam Spanner expertise: None\nSpanner query language: GoogleSQL (compatible with PostgreSQL dialect available)\nMigration complexity: Medium (schema changes required for Spanner interleaved tables)\nSpanner minimum cost: $65/month (1 processing unit) vs Cloud SQL $25/month (db-f1-micro)",
        },
        {
          id: "budget-constraints",
          label: "Budget and Cost Analysis",
          content:
            "Year 1 DB budget: $200/month\nYear 3 DB budget: $5,000/month\nCloud SQL PostgreSQL (db-custom-8-32768 HA + read replica): ~$820/month at Y3 scale\nCloud Spanner (3-node multi-region): ~$2,160/month at Y3 scale\nCloud Spanner (1-node single-region): ~$720/month at Y3 scale (if staying single-region)\nCloud SQL migration cost to Spanner later: Medium-high (schema refactoring)",
        },
      ],
      actions: [
        { id: "cloud-sql-now-plan-spanner", label: "Start with Cloud SQL PostgreSQL; design schema to be Spanner-compatible for future migration", color: "green" },
        { id: "spanner-from-day-1", label: "Start with Cloud Spanner from day 1 to avoid future migration", color: "blue" },
        { id: "cloud-sql-indefinitely", label: "Use Cloud SQL PostgreSQL indefinitely — projections may not materialize", color: "yellow" },
        { id: "alloydb", label: "Use AlloyDB for PostgreSQL compatibility with better scaling than Cloud SQL", color: "orange" },
      ],
      correctActionId: "cloud-sql-now-plan-spanner",
      rationales: [
        { id: "r-cloud-sql-right-now", text: "At 45 write QPS and 8 GB, Cloud Spanner is significant overkill and $65+/month minimum vs $25/month for Cloud SQL. The startup's Year 1 budget and scale clearly call for Cloud SQL." },
        { id: "r-plan-for-migration", text: "At Year 3 scale (2,200 write QPS, multi-region EU, financial consistency), Cloud SQL approaches its limits. Planning the schema now to be Spanner-compatible (avoiding serial IDs, designing for interleaving) reduces future migration cost." },
        { id: "r-spanner-day-1-premature", text: "Spanner from day 1 costs 3–6× more than Cloud SQL for current scale, requires the team to learn a new system, and provides no benefit until multi-region or scale demands justify it." },
        { id: "r-alloydb-option", text: "AlloyDB is an excellent middle path — PostgreSQL-compatible, scales better than Cloud SQL, but doesn't provide global strong consistency for multi-region writes. It's a strong contender for Year 2 if staying single-region." },
      ],
      correctRationaleId: "r-cloud-sql-right-now",
      feedback: {
        perfect: "Great pragmatic decision! Cloud SQL PostgreSQL with Spanner-compatibility planning is the right approach. Avoid premature optimization — optimize for the current scale while preparing for the future.",
        partial: "Your direction is right but the planning detail matters. Starting with Cloud SQL is correct; ensuring the schema is designed for eventual Spanner migration (no serial IDs, think interleaving) avoids costly refactoring later.",
        wrong: "At 45 write QPS, Spanner from day 1 is over-engineered and too expensive for a startup. Cloud SQL PostgreSQL is the right database for Year 1. Design for migration later by avoiding Spanner-incompatible schema patterns now.",
      },
    },
    {
      type: "investigate-decide",
      id: "spanner-scenario-3",
      title: "Spanner Node Count Sizing",
      objective:
        "Your team has decided to migrate a financial transactions database to Cloud Spanner. You need to determine the correct initial node configuration to meet performance SLOs without over-provisioning.",
      investigationData: [
        {
          id: "workload-profile",
          label: "Workload Profile (Production Metrics from Current DB)",
          content:
            "Write QPS (average): 1,200\nWrite QPS (peak): 3,400\nRead QPS (average): 8,600\nRead QPS (peak): 24,000\nAverage transaction duration: 8ms\nRead/write ratio: ~7:1\nRow size: ~2 KB average\nHot rows: Transaction log table (100 rows/sec writes to single hot partition)",
          isCritical: true,
        },
        {
          id: "spanner-capacity-guidelines",
          label: "Cloud Spanner Capacity Guidelines",
          content:
            "1 Spanner node ≈ 2,000 read QPS or 1,000 write QPS (simple operations)\nRecommended CPU utilization: <65% for reads, <45% for writes\nStorage per node: 2 TB regional, 2 TB multi-region\nHot partition problem: Serial/monotonic keys create hotspots — use UUIDs or bit-reversal\nMulti-region node count: minimum 3 nodes (quorum)\nSingle-region node count: minimum 1 node",
          isCritical: true,
        },
        {
          id: "hot-partition-risk",
          label: "Schema Analysis: Potential Hotspot",
          content:
            "Current primary key: transaction_id BIGINT AUTO_INCREMENT\nSpanner behavior with sequential keys: All new writes go to the same split (hotspot)\nRecommended Spanner key: UUID v4 OR REVERSE(CAST(UNIX_MICROS(CURRENT_TIMESTAMP()) AS STRING))\nHot partition impact: Can limit throughput to single split's capacity regardless of node count",
          isCritical: true,
        },
        {
          id: "availability-requirement",
          label: "Availability and Geographic Requirements",
          content:
            "Required SLA: 99.999% (five nines)\nRegions: Must serve US and EU\nRPO: 0 (zero data loss)\nCloud Spanner multi-region SLA: 99.999%\nCloud Spanner regional SLA: 99.99%\nRegional vs multi-region cost difference: ~3× higher for multi-region",
        },
      ],
      actions: [
        { id: "3-node-multi-region-uuid", label: "3-node multi-region config with UUID primary keys to avoid hotspots", color: "green" },
        { id: "5-node-multi-region", label: "5-node multi-region to handle peak load with 65% CPU headroom", color: "blue" },
        { id: "2-node-regional", label: "2-node single-region us-central1 to minimize cost initially", color: "yellow" },
        { id: "3-node-multi-region-serial", label: "3-node multi-region with existing AUTO_INCREMENT keys to minimize schema changes", color: "red" },
      ],
      correctActionId: "3-node-multi-region-uuid",
      rationales: [
        { id: "r-multi-region-for-sla", text: "99.999% SLA requires multi-region Spanner (regional config only provides 99.99%). The minimum multi-region config is 3 nodes. US+EU distribution confirms multi-region is necessary." },
        { id: "r-uuid-eliminates-hotspot", text: "AUTO_INCREMENT keys are the most dangerous Spanner anti-pattern — they concentrate all writes to the rightmost split. UUIDs distribute writes across all splits automatically, utilizing all node capacity." },
        { id: "r-3-nodes-sufficient", text: "3 nodes × 1,000 write QPS capacity = 3,000 write QPS, which covers the 3,400 peak at ~45% utilization with buffer. Read capacity: 3 × 2,000 = 6,000 QPS — adequate after UUID distribution eliminates the hotspot." },
        { id: "r-5-nodes-too-many", text: "5 nodes would provide excess capacity at ~$3,600/month vs $2,160 for 3 nodes. Start with 3 and scale based on actual Spanner CPU metrics after migration." },
      ],
      correctRationaleId: "r-multi-region-for-sla",
      feedback: {
        perfect: "Correct on both dimensions! Multi-region for 99.999% SLA, 3 nodes for the workload, and UUID keys to eliminate the auto-increment hotspot — all three are required for a production Spanner migration.",
        partial: "You got the node count right. The UUID key change is critical — AUTO_INCREMENT primary keys are the #1 cause of Spanner performance issues post-migration. Don't skip this schema change.",
        wrong: "Multi-region is required for 99.999% SLA (regional only provides 99.99%). 3 nodes handle the workload profile. Most importantly, the AUTO_INCREMENT key must be replaced with UUIDs — sequential keys create hotspots that cap throughput regardless of node count.",
      },
    },
  ],
  hints: [
    "The key differentiator for Cloud Spanner over Cloud SQL is external consistency — globally consistent reads across all regions with zero replication lag. If your workload requires strong consistency across multiple global regions, Cloud Spanner may be justified.",
    "AUTO_INCREMENT or SERIAL primary keys are an anti-pattern in Cloud Spanner. Sequential keys cause all inserts to go to the same hot split, limiting throughput. Always use UUID v4 or reverse-timestamp keys in Spanner.",
    "Cloud Spanner's minimum cost is ~$65/month (1 processing unit) for regional, ~$720/month for a 3-node regional, and ~$2,160/month for a 3-node multi-region. Don't use Spanner for workloads where Cloud SQL or AlloyDB is sufficient.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "The Cloud SQL vs Cloud Spanner decision is one of the most consequential architectural choices in GCP. Cloud architects who can articulate when Spanner's external consistency justifies its 3–10× cost premium over Cloud SQL are operating at a senior level. This question appears frequently in Google Cloud architecture interviews and Professional Cloud Architect certification exams.",
  toolRelevance: ["GCP Console (Spanner)", "gcloud spanner CLI", "Spanner Query Plan Visualizer", "Cloud Monitoring (Spanner CPU)", "Database Migration Service"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
