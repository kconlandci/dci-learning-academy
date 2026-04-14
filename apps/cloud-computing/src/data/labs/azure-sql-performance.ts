import type { LabManifest } from "../../types/manifest";

export const azureSqlPerformanceLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-sql-performance",
  version: 1,
  title: "Azure SQL Database Performance Tuning",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "sql", "performance", "dtu", "query-store", "indexing"],
  description:
    "Diagnose Azure SQL Database performance problems using Query Performance Insight and the Query Store, then select the correct remediation.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Interpret Azure SQL Query Performance Insight to identify top resource-consuming queries",
    "Distinguish between DTU exhaustion, missing index, and parameter sniffing root causes",
    "Select the appropriate remediation: scale up, add index, update statistics, or rewrite query",
  ],
  sortOrder: 204,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "scenario-1",
      title: "Sudden Slowdown — DTU Exhaustion",
      objective:
        "A production Azure SQL Database (Standard S3, 100 DTUs) began experiencing timeouts at 9:05 AM. Response times for the order-processing API jumped from 120ms to 8 seconds. Investigate the available evidence and determine the correct action.",
      investigationData: [
        {
          id: "inv-dtu-chart",
          label: "DTU Consumption Chart (Last 2 Hours)",
          content:
            "Azure Portal > SQL Database > Overview > DTU consumption: Flat at 32% until 9:04 AM, then spike to 99–100% sustained. No reduction observed in last 60 minutes.",
          isCritical: true,
        },
        {
          id: "inv-top-queries",
          label: "Query Performance Insight — Top CPU Queries",
          content:
            "Top query by CPU: 'SELECT o.*, c.*, p.* FROM Orders o JOIN Customers c ON o.CustomerID=c.ID JOIN Products p ON o.ProductID=p.ID WHERE o.Status=@status' — Avg duration 7.8s, Execution count: 450/min (up from 12/min at 8:50 AM).",
          isCritical: true,
        },
        {
          id: "inv-wait-stats",
          label: "Wait Statistics",
          content:
            "Top wait type: CPU (78%), PAGEIOLATCH_SH (18%), ASYNC_NETWORK_IO (4%). No blocking detected.",
        },
        {
          id: "inv-missing-index",
          label: "Missing Index Recommendations (sys.dm_db_missing_index_details)",
          content:
            "No missing index recommendations for the Orders, Customers, or Products tables. Existing indexes: Orders(CustomerID), Orders(ProductID), Orders(Status).",
        },
        {
          id: "inv-execution-plan",
          label: "Query Execution Plan",
          content:
            "Plan shows Index Seek on all three tables. No table scans. Estimated rows: 120, Actual rows: 118. Plan looks efficient. However, SELECT o.*, c.*, p.* is returning 47 columns including large NVARCHAR(MAX) fields.",
        },
        {
          id: "inv-connections",
          label: "Active Connections Count",
          content:
            "Current active connections: 487 (max allowed on S3: 400). Connection pool exhaustion errors visible in App Service logs starting 9:06 AM.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add a composite index on Orders(Status, CustomerID, ProductID)",
        },
        {
          id: "action-b",
          label: "Scale up from S3 (100 DTU) to S4 (200 DTU) immediately, then investigate query optimization",
        },
        {
          id: "action-c",
          label: "Run UPDATE STATISTICS on the Orders table",
        },
        {
          id: "action-d",
          label: "Restart the Azure SQL Database to clear the query plan cache",
        },
      ],
      correctActionId: "action-b",
      rationales: [
        {
          id: "rationale-a",
          text: "The missing index panel shows no index recommendations for these tables and the execution plan already uses Index Seeks. Adding another index will not resolve DTU exhaustion when the root cause is a 37x spike in query execution count overwhelming the DTU limit.",
        },
        {
          id: "rationale-b",
          text: "DTU consumption hit 100% sustained — the database is compute-bound. Scaling to S4 immediately restores service while the team investigates the 37x query volume spike (possibly a runaway job or traffic spike). The SELECT * pattern and connection pool exhaustion are optimization opportunities but the immediate crisis is DTU capacity.",
        },
        {
          id: "rationale-c",
          text: "Wait statistics show CPU (78%) as the dominant wait — not stale statistics causing bad plan choices. UPDATE STATISTICS addresses cardinality estimation issues, not raw compute exhaustion.",
        },
        {
          id: "rationale-d",
          text: "Clearing the plan cache on a production database under load would force all queries to recompile simultaneously, causing a 'cold cache' storm that worsens DTU exhaustion in the short term. This is not recommended during an active incident.",
        },
      ],
      correctRationaleId: "rationale-b",
      feedback: {
        perfect:
          "Correct triage. DTU at 100% is the active crisis — scale up to restore service, then work backward through the 37x query volume increase and SELECT * optimization.",
        partial:
          "You identified a real issue in the investigation data but it is not the primary cause of the current outage. DTU exhaustion must be addressed first.",
        wrong:
          "Restarting or clearing cache during a production incident under load is dangerous and will worsen the situation. Always stabilize first, optimize second.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-2",
      title: "Intermittent Slowness — Parameter Sniffing",
      objective:
        "A reporting query runs fine for most users (< 500ms) but takes 45–90 seconds for a specific set of enterprise customers. The query and schema are identical — only the parameter values differ. Investigate and identify the root cause.",
      investigationData: [
        {
          id: "inv-query",
          label: "Slow Query (from Query Store)",
          content:
            "SELECT r.*, e.EmployeeName FROM Reports r JOIN Employees e ON r.EmployeeID=e.ID WHERE r.CustomerID=@CustomerID AND r.ReportDate BETWEEN @StartDate AND @EndDate ORDER BY r.ReportDate DESC",
          isCritical: false,
        },
        {
          id: "inv-plan-comparison",
          label: "Query Store — Plan Comparison",
          content:
            "Fast plan (CustomerID=1001..9999, small customers): Index Seek on Reports(CustomerID, ReportDate) — 200–400ms. Slow plan (CustomerID=50001, enterprise): Same plan reused — but CustomerID=50001 has 2.3M rows vs avg 45 rows for small customers. Full index scan would be faster but the cached plan uses Index Seek.",
          isCritical: true,
        },
        {
          id: "inv-row-counts",
          label: "Row Count Distribution for CustomerID",
          content:
            "sys.dm_db_stats_histogram: CustomerID distribution is highly skewed. Top 3 customers (IDs 50001, 50002, 50003) each have 1.8M–2.5M rows. All other customers have 10–500 rows each.",
          isCritical: true,
        },
        {
          id: "inv-indexes",
          label: "Index on Reports Table",
          content:
            "Existing indexes: IX_Reports_CustomerDate (CustomerID, ReportDate) — used by fast path. No filtered indexes exist.",
        },
        {
          id: "inv-dtu",
          label: "DTU During Slow Query Execution",
          content:
            "DTU during enterprise queries: 15–25%. Database is not DTU-constrained. The slowness is plan-related, not resource-constrained.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add OPTION (OPTIMIZE FOR UNKNOWN) to the query to force plan re-evaluation per execution",
        },
        {
          id: "action-b",
          label: "Scale up the database tier to provide more DTUs for the slow queries",
        },
        {
          id: "action-c",
          label: "Drop and recreate the Reports table to clear the row count skew",
        },
        {
          id: "action-d",
          label: "Force a specific query plan for the enterprise customers using Query Store plan forcing",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "This is a classic parameter sniffing problem: SQL Server cached the execution plan optimized for small-customer parameters (fast index seek) and reuses it for large-customer parameters where a different plan would be optimal. OPTION (OPTIMIZE FOR UNKNOWN) prevents the optimizer from basing the plan on the first execution's parameter values, generating a more balanced plan. Alternatively, OPTION (RECOMPILE) would generate a fresh plan per execution.",
        },
        {
          id: "rationale-b",
          text: "DTU is at 15–25% during slow queries — this is not a resource issue. Scaling up would waste money without affecting plan selection. The problem is algorithmic (wrong plan), not capacity.",
        },
        {
          id: "rationale-c",
          text: "Dropping and recreating the table would delete all data, causing a catastrophic incident. Statistics skew is addressed by updating statistics or query hints, never by dropping tables.",
        },
        {
          id: "rationale-d",
          text: "Query Store plan forcing is a valid tactical fix — you can force the optimal plan for enterprise customers — but it requires identifying the correct plan ID and creates an ongoing maintenance burden as the data evolves. OPTION (OPTIMIZE FOR UNKNOWN) is a more sustainable architectural fix.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct diagnosis and solution. Parameter sniffing on skewed distributions is one of the most common Azure SQL performance problems, and OPTIMIZE FOR UNKNOWN is the standard fix.",
        partial:
          "Your answer addresses part of the problem but either wastes cost (scaling up) or creates maintenance burden (plan forcing) when a simpler query hint resolves the root cause.",
        wrong:
          "Dropping and recreating the table would destroy production data. Never use destructive DDL operations to resolve query performance issues.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-3",
      title: "Blocking Chain — Lock Contention",
      objective:
        "Multiple application threads are timing out waiting for database locks. The API is responding with 'Transaction (Process ID 57) was deadlocked' errors. Average wait time for lock acquisition exceeds 30 seconds. Investigate the blocking pattern and choose the correct remediation.",
      investigationData: [
        {
          id: "inv-blocking",
          label: "sys.dm_exec_requests — Active Blocking Chain",
          content:
            "Head blocker: SPID 57 — UPDATE Orders SET Status='Processing' WHERE Status='Pending' (no index on Status column). Running for 4m 32s. Blocked by 57: SPIDs 61, 63, 67, 71, 74 (all identical UPDATE statements). 38 total SPIDs waiting.",
          isCritical: true,
        },
        {
          id: "inv-indexes-orders",
          label: "Indexes on Orders Table",
          content:
            "Existing indexes: PK_Orders (OrderID). No index on Status column. Table has 12M rows. UPDATE on unindexed Status column performs a full table scan and takes an exclusive lock on all scanned rows.",
          isCritical: true,
        },
        {
          id: "inv-isolation",
          label: "Transaction Isolation Level",
          content:
            "Current isolation level: READ COMMITTED (default). Database does not have Read Committed Snapshot Isolation (RCSI) enabled. Writers block readers under READ COMMITTED without RCSI.",
        },
        {
          id: "inv-deadlock-graph",
          label: "Deadlock Graph (from Extended Events)",
          content:
            "Deadlock between SPID 57 (holds X lock on page 1-3721, wants X lock on page 1-3756) and SPID 61 (holds X lock on page 1-3756, wants X lock on page 1-3721). Classic circular lock dependency from concurrent UPDATEs scanning in different page orders.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add a non-clustered index on Orders(Status) and enable Read Committed Snapshot Isolation (RCSI)",
        },
        {
          id: "action-b",
          label: "Kill the head blocking SPID and increase connection pool timeout to 120 seconds",
        },
        {
          id: "action-c",
          label: "Switch to SERIALIZABLE isolation level to prevent concurrent access conflicts",
        },
        {
          id: "action-d",
          label: "Partition the Orders table by OrderID to reduce lock scope",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Two changes together solve both problems: (1) An index on Orders(Status) eliminates the full table scan, so the UPDATE only locks the rows with Status='Pending' instead of the entire table — dramatically reducing the lock footprint. (2) RCSI allows readers to see the last committed version of data without taking shared locks, preventing the read/write blocking that is amplifying the contention.",
        },
        {
          id: "rationale-b",
          text: "Killing the head blocker provides temporary relief but the root cause (full table scan + no RCSI) will recreate the blocking chain within minutes. Increasing timeout hides the symptom and slows user-visible recovery.",
        },
        {
          id: "rationale-c",
          text: "SERIALIZABLE is the most restrictive isolation level — it increases locking, not decreases it. Switching to SERIALIZABLE would make the blocking and deadlock problem dramatically worse.",
        },
        {
          id: "rationale-d",
          text: "Table partitioning can reduce lock scope in some scenarios but is a complex operation on a 12M-row production table and doesn't address the core problem: a missing index causing full-table locks and no RCSI to prevent reader/writer conflicts.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Excellent diagnosis. Adding a targeted index to eliminate full-table scans plus enabling RCSI for optimistic read concurrency is the correct two-part fix for this blocking pattern.",
        partial:
          "You identified one part of the solution but the fix is incomplete. Both the index (to reduce lock scope) and RCSI (to prevent reader/writer blocking) are needed together.",
        wrong:
          "Higher isolation levels increase locking overhead and worsen deadlock frequency. Always move toward optimistic concurrency models (RCSI/MVCC) when reducing lock contention.",
      },
    },
  ],
  hints: [
    "When DTU hits 100%, your first action is to restore service by scaling up — performance investigation is the second step after the incident is mitigated.",
    "Parameter sniffing manifests as queries that are fast for some parameter values and slow for others — compare execution plans in Query Store for the same query with different parameters.",
    "A blocking chain always has a head blocker — but killing it is only a temporary fix. The permanent fix is eliminating the cause: missing indexes that force full-table scans or missing RCSI that causes reader/writer contention.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure SQL Database performance tuning is one of the most sought-after skills in enterprise Azure roles. Query Performance Insight and the Query Store give you production-grade diagnostics without needing DBA-level SQL Server expertise — but understanding what the metrics mean and how to act on them separates cloud engineers from cloud operators.",
  toolRelevance: ["Azure Portal", "Query Performance Insight", "SQL Server Management Studio", "Azure Data Studio", "Azure Monitor"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
