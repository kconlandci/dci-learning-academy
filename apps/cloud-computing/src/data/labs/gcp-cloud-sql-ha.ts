import type { LabManifest } from "../../types/manifest";

export const gcpCloudSqlHaLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-cloud-sql-ha",
  version: 1,
  title: "Cloud SQL High Availability Design",
  tier: "beginner",
  track: "gcp-essentials",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["gcp", "cloud-sql", "high-availability", "read-replicas", "failover", "database", "postgresql"],
  description:
    "Investigate Cloud SQL instance configurations and metrics to diagnose availability failures, replication lag, and connection exhaustion. Decide the correct HA architecture for each scenario.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Distinguish between Cloud SQL HA (regional failover) and read replicas (horizontal read scaling)",
    "Diagnose connection pool exhaustion and apply pgBouncer or Cloud SQL Auth Proxy fixes",
    "Interpret replication lag metrics and identify when read replicas are stale",
    "Design a Cloud SQL architecture that meets a given RTO and RPO requirement",
  ],
  sortOrder: 308,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "sql-scenario-1",
      title: "Unexpected Database Failover Failure",
      objective:
        "A Cloud SQL PostgreSQL 15 instance went down at 03:14 UTC during a zone outage. Despite having 'HA' configured, the application was down for 48 minutes before recovery. Investigate the configuration to determine why failover took so long.",
      investigationData: [
        {
          id: "instance-config",
          label: "Cloud SQL Instance Configuration",
          content:
            "Instance: prod-postgres-01\nDatabase version: PostgreSQL 15\nTier: db-n1-standard-8 (8 vCPU, 30 GB RAM)\nRegion: us-central1\nZone: us-central1-a (primary)\nHigh Availability: Enabled\nFailover replica: us-central1-f\nAutomated backups: Enabled (02:00 UTC daily)\nPoint-in-time recovery: Enabled\nMaintenance window: Sunday 03:00–04:00 UTC",
          isCritical: true,
        },
        {
          id: "failover-timeline",
          label: "Incident Timeline",
          content:
            "03:14 UTC — Primary zone us-central1-a becomes unavailable (GCP zone incident)\n03:14 UTC — Cloud SQL detects primary unreachable\n03:14–03:52 UTC — Failover pending (38 minutes)\n03:52 UTC — Failover to us-central1-f completes\n03:52–04:02 UTC — Application reconnects (10 minutes)\nTotal downtime: 48 minutes\nExpected Cloud SQL HA failover time: 60–120 seconds",
          isCritical: true,
        },
        {
          id: "maintenance-window",
          label: "Maintenance Window Details",
          content:
            "Configured maintenance window: Sundays 03:00–04:00 UTC\nIncident occurred: Sunday 03:14 UTC (during maintenance window)\nCloud SQL behavior: Automatic failover is suppressed during the maintenance window to prevent conflicts with planned maintenance operations.\nNote: At 03:14, a routine maintenance operation had been initiated on the instance.",
          isCritical: true,
        },
        {
          id: "application-reconnect",
          label: "Application Reconnect Delay",
          content:
            "Application stack: Java Spring Boot with HikariCP connection pool\nHikariCP max-lifetime setting: 30 minutes\nHikariCP connection-timeout: Not set (default: 30 seconds)\nDNS TTL for Cloud SQL hostname: 60 seconds\nApplication reconnect behavior: Waits for HikariCP pool to detect stale connections (takes up to max-lifetime)",
        },
      ],
      actions: [
        { id: "move-maintenance-window", label: "Move maintenance window to a low-traffic period that doesn't overlap with business-critical hours", color: "green" },
        { id: "disable-ha", label: "Disable HA and use manual promotion of read replicas instead", color: "red" },
        { id: "switch-to-alloydb", label: "Migrate to AlloyDB which has faster failover (<60 seconds guaranteed)", color: "blue" },
        { id: "add-more-replicas", label: "Add cross-region read replicas to reduce failover time", color: "yellow" },
        { id: "fix-hikaricp", label: "Reduce HikariCP max-lifetime to 5 minutes and enable keepalive", color: "orange" },
      ],
      correctActionId: "move-maintenance-window",
      rationales: [
        { id: "r-maintenance-window-root", text: "The root cause is the maintenance window overlap. Cloud SQL suppresses automatic failover during maintenance to avoid conflicting operations. The zone incident happened at exactly the worst time. Moving the window to e.g. 02:00 Monday UTC resolves this." },
        { id: "r-hikaricp-secondary", text: "The 10-minute application reconnect delay is a secondary issue caused by HikariCP not detecting stale connections quickly. Reducing max-lifetime to 5 minutes and enabling TCP keepalive would fix this, but it's secondary to the main 38-minute failover delay." },
        { id: "r-alloydb-overkill", text: "AlloyDB has excellent failover performance but migrating a production database to solve a maintenance window configuration problem is excessive. Fix the window first." },
        { id: "r-cross-region-wrong", text: "Cross-region read replicas provide disaster recovery for full region failures, not zone failures. Cloud SQL HA already handles zone failures — the maintenance window was the problem." },
      ],
      correctRationaleId: "r-maintenance-window-root",
      feedback: {
        perfect: "Excellent investigation! The 38-minute failover delay was caused by the automatic failover suppression during the maintenance window. The fix is simple: move the maintenance window away from this time slot.",
        partial: "You found a real issue. The primary cause of the 48-minute outage is the maintenance window overlap — failover was suppressed for 38 minutes. The HikariCP issue accounts for the remaining 10 minutes.",
        wrong: "The timeline shows failover was pending for 38 minutes, not the expected 60–120 seconds. The investigation data reveals this happened during the configured maintenance window — Cloud SQL suppresses failover during maintenance.",
      },
    },
    {
      type: "investigate-decide",
      id: "sql-scenario-2",
      title: "Connection Exhaustion Under Load",
      objective:
        "A Cloud SQL PostgreSQL instance is reporting 'too many clients' errors during peak traffic. The application is running on GKE with 200 pod replicas. Investigate the connection patterns and choose the correct architectural fix.",
      investigationData: [
        {
          id: "error-logs",
          label: "Application Error Logs (Cloud Logging)",
          content:
            "ERROR: could not connect to server: FATAL: remaining connection slots are reserved for non-replication superuser connections\nOccurrence rate: 340 errors/minute at peak\nFirst seen: when GKE autoscaler scaled pods from 80 → 200\nError type: SQLSTATE 53300 (too_many_connections)",
          isCritical: true,
        },
        {
          id: "sql-connections",
          label: "Cloud SQL Connection Metrics",
          content:
            "Instance max_connections: 500\nCurrent active connections at peak: 497\nConnections from GKE pods: 200 pods × 5 (HikariCP min-pool-size) = 1,000 desired connections\nCloud SQL Auth Proxy: Not in use — pods connect directly via Cloud SQL hostname\nPgBouncer: Not deployed",
          isCritical: true,
        },
        {
          id: "instance-tier",
          label: "Instance Tier and Memory",
          content:
            "Current tier: db-n1-standard-4 (4 vCPU, 15 GB RAM)\nPostgreSQL max_connections formula: typically set to RAM/12 MB\n15,000 MB / 12 MB = ~1,250 max potential connections\nCurrent max_connections flag: 500 (manually set lower)\nIncreasing max_connections to 1000 would require ~12 GB RAM overhead",
          isCritical: false,
        },
        {
          id: "app-connection-pattern",
          label: "Application Connection Pattern",
          content:
            "Framework: Spring Boot with HikariCP\nHikariCP min-idle: 5 per pod\nHikariCP max-pool-size: 10 per pod\nAverage active DB connections per pod (during query): 1–2\nAverage idle connections per pod: 3–4\nTypical query duration: 20–50ms",
        },
      ],
      actions: [
        { id: "deploy-pgbouncer", label: "Deploy PgBouncer as a connection pooler between GKE pods and Cloud SQL", color: "green" },
        { id: "increase-max-connections", label: "Increase Cloud SQL max_connections flag to 2000", color: "yellow" },
        { id: "upgrade-instance-tier", label: "Upgrade to db-n1-highmem-8 to support more concurrent connections", color: "blue" },
        { id: "reduce-hikaricp-pool", label: "Reduce HikariCP min-idle to 1 and max-pool-size to 2 per pod", color: "orange" },
        { id: "use-cloud-sql-proxy", label: "Deploy Cloud SQL Auth Proxy sidecar and use Unix socket connections", color: "red" },
      ],
      correctActionId: "deploy-pgbouncer",
      rationales: [
        { id: "r-pgbouncer-multiplexes", text: "PgBouncer in transaction pooling mode multiplexes many application connections over a small number of actual PostgreSQL connections. 200 pods × 10 max-pool = 2,000 app connections can share just 50–100 real database connections." },
        { id: "r-increase-connections-bad", text: "PostgreSQL maintains a process per connection — 2,000 connections would require ~24 GB RAM for connection overhead alone and cause severe performance degradation from context switching." },
        { id: "r-cloud-sql-proxy-auth", text: "Cloud SQL Auth Proxy improves authentication security and handles IAM-based auth, but it doesn't multiplex connections — it's a secure tunnel, not a connection pooler. The connection count problem remains." },
        { id: "r-hikaricp-reduce-partial", text: "Reducing HikariCP pool size per pod reduces connection count but hurts application throughput. PgBouncer is the scalable solution — it allows the application to maintain its pool settings while multiplexing at the DB layer." },
      ],
      correctRationaleId: "r-pgbouncer-multiplexes",
      feedback: {
        perfect: "Correct! PgBouncer's transaction pooling mode is the standard solution for this GKE → Cloud SQL connection exhaustion pattern. It multiplexes thousands of app connections into tens of real PostgreSQL connections.",
        partial: "You addressed part of the problem. The sustainable fix is PgBouncer — it allows the GKE pod count to scale independently of database connection count by multiplexing in transaction mode.",
        wrong: "The problem is 200 pods × 5 minimum connections = 1,000 connections against a 500 max_connections limit. Increasing max_connections has RAM and performance limits. PgBouncer multiplexes at the protocol level — the correct architectural fix.",
      },
    },
    {
      type: "investigate-decide",
      id: "sql-scenario-3",
      title: "Read Replica Stale Data Complaint",
      objective:
        "Your application reads product catalog data from a Cloud SQL read replica to offload the primary. Users are reporting they see old product prices after an update — sometimes for up to 5 minutes. Investigate the replication metrics and choose the correct fix.",
      investigationData: [
        {
          id: "replication-lag",
          label: "Cloud Monitoring — Replication Lag Metric",
          content:
            "Metric: cloudsql.googleapis.com/database/replication/replica_lag\nAverage lag: 45 seconds\nPeak lag (during batch import): 4m 52s\nLag spikes correlate exactly with: bulk product price import jobs running on primary\nReplica tier: db-n1-standard-2 (2 vCPU, 7.5 GB RAM)\nPrimary tier: db-n1-standard-8 (8 vCPU, 30 GB RAM)",
          isCritical: true,
        },
        {
          id: "import-job",
          label: "Batch Import Job Details",
          content:
            "Job type: Product price update (CSV import via Cloud Dataflow)\nFrequency: Every 15 minutes\nRows updated per run: ~250,000 rows in products table\nMethod: UPSERT via Cloud SQL\nDuration: 3–4 minutes per run\nReplica write throughput limit: ~15 MB/s (constrained by replica tier)",
          isCritical: true,
        },
        {
          id: "read-routing",
          label: "Application Read Routing Logic",
          content:
            "Price display: reads from replica\nInventory display: reads from replica\nCheckout (order creation): reads from primary (correct)\nAdmin product edit: reads from replica (may show stale price)\nRouting library: Spring Data with custom DataSource routing based on @Transactional(readOnly=true)",
        },
        {
          id: "user-impact",
          label: "User Impact Analysis",
          content:
            "Users completing a purchase see old price during checkout flow\nConversion rate drop during import windows: ~8%\nProduct price changes are time-sensitive (flash sales, promotions)\nStale price display window: up to 5 minutes during import runs",
        },
      ],
      actions: [
        { id: "upgrade-replica-tier", label: "Upgrade replica to db-n1-standard-8 to match primary throughput", color: "green" },
        { id: "read-from-primary-price", label: "Route price-display reads to primary only; keep replica for non-critical reads", color: "blue" },
        { id: "reduce-import-frequency", label: "Reduce batch import to hourly to give replica time to catch up", color: "yellow" },
        { id: "add-second-replica", label: "Add a second read replica for additional read throughput", color: "orange" },
      ],
      correctActionId: "upgrade-replica-tier",
      rationales: [
        { id: "r-replica-tier-bottleneck", text: "The replica's 2 vCPU tier limits its write throughput to ~15 MB/s, causing it to fall behind during the 250K-row import. Upgrading to match the primary's 8 vCPU tier increases replica throughput, reducing lag from 5 minutes to seconds." },
        { id: "r-read-primary-partial", text: "Routing price reads to primary is a valid short-term workaround but doesn't fix the replica lag — it just bypasses it. The primary would then handle more load, and you're paying for a replica that's not fully utilized." },
        { id: "r-reduce-frequency-tradeoff", text: "Reducing import frequency from every 15 minutes to hourly may be unacceptable for flash-sale pricing accuracy. The correct fix is to eliminate the lag, not accept more staleness less frequently." },
        { id: "r-second-replica-wrong", text: "A second replica doesn't reduce replication lag — each replica independently replicates from the primary. The bottleneck is each replica's write throughput, not the number of replicas." },
      ],
      correctRationaleId: "r-replica-tier-bottleneck",
      feedback: {
        perfect: "Correct root cause and fix! The replica's smaller tier can't keep up with the primary's write throughput during bulk imports. Upgrading the replica to match the primary eliminates the lag.",
        partial: "Your fix helps, but the underlying issue is the replica tier mismatch. A db-n1-standard-2 simply cannot process writes as fast as a db-n1-standard-8 generates them during the import window.",
        wrong: "The replication lag spikes exactly during bulk imports because the replica (db-n1-standard-2) has insufficient write throughput to keep up with the primary (db-n1-standard-8). Match the replica tier to the primary's throughput capacity.",
      },
    },
  ],
  hints: [
    "Cloud SQL HA provides automatic failover to a standby in another zone — typical failover time is 60–120 seconds. However, automatic failover is suppressed during maintenance windows. Always schedule maintenance windows away from business-critical hours.",
    "Cloud SQL max_connections is not a free variable — each PostgreSQL connection spawns a process (~12 MB RAM). For GKE workloads, deploy PgBouncer in transaction pooling mode to multiplex thousands of app connections into dozens of real DB connections.",
    "Read replica lag is a throughput problem, not a networking problem. If your import job writes faster than your replica can apply writes, the replica falls behind. Match replica tier to primary tier for write-intensive workloads.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Database reliability is one of the highest-stakes skills in cloud engineering. Cloud SQL issues — connection exhaustion, replication lag, and failover behavior — account for a significant proportion of production incidents. Engineers who understand Cloud SQL HA, connection pooling, and replica tuning are invaluable in backend, SRE, and database reliability roles.",
  toolRelevance: ["GCP Console (Cloud SQL)", "gcloud sql CLI", "Cloud Monitoring", "PgBouncer", "Cloud SQL Auth Proxy"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
