import type { LabManifest } from "../../types/manifest";

export const gcpBigqueryOptimizationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-bigquery-optimization",
  version: 1,
  title: "BigQuery Query Optimization",
  tier: "beginner",
  track: "gcp-essentials",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["gcp", "bigquery", "sql", "cost-optimization", "query-performance", "partitioning"],
  description:
    "Analyze BigQuery query plans, slot utilization, and billing estimates to identify and fix inefficient queries. Practice partitioning, clustering, and avoiding full table scans.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Read BigQuery query execution plans and identify expensive steps",
    "Reduce bytes processed by using partition filters and clustering keys",
    "Distinguish on-demand versus flat-rate pricing implications for query design",
    "Apply best practices to avoid SELECT * and cross-join anti-patterns",
  ],
  sortOrder: 302,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "bq-scenario-1",
      title: "Runaway Query Cost Investigation",
      objective:
        "A single BigQuery query run by an analyst processed 2.1 TB and cost $10.50. Investigate the query plan and table metadata to determine the root cause and recommend the correct fix.",
      investigationData: [
        {
          id: "query-text",
          label: "Analyst Query (SQL)",
          content:
            "SELECT *\nFROM `prod-project.analytics.events`\nWHERE DATE(event_timestamp) = '2026-03-01'\nAND event_type = 'purchase';",
          isCritical: true,
        },
        {
          id: "table-schema",
          label: "Table Schema & Metadata",
          content:
            "Table: prod-project.analytics.events\nTotal size: 2.1 TB\nRow count: 18.4 billion\nPartitioning: NONE\nClustering: NONE\nColumns: event_id, event_timestamp, event_type, user_id, session_id, page_url, referrer, device_type, os, browser, ip_address, country, city, product_id, quantity, price, currency, ... (47 columns total)",
          isCritical: true,
        },
        {
          id: "query-plan",
          label: "Query Execution Plan (BigQuery Console)",
          content:
            "Stage 1: READ\n  Input: 2,148,320,841,600 bytes (2.1 TB)\n  Rows read: 18,400,000,000\n  Slot time: 4m 32s\n\nStage 2: FILTER\n  Condition: (DATE(event_timestamp) = '2026-03-01') AND (event_type = 'purchase')\n  Rows output: 124,382\n  Rows filtered: 18,275,617,618\n\nStage 3: OUTPUT\n  Rows: 124,382\n  Output bytes: 41.2 MB",
          isCritical: true,
        },
        {
          id: "billing-info",
          label: "Billing Estimate",
          content:
            "Pricing model: On-Demand\nBytes billed: 2.1 TB\nCost: $10.50 (at $5/TB)\nEstimated monthly queries by this analyst: ~400\nEstimated monthly cost if unchanged: ~$4,200",
        },
      ],
      actions: [
        { id: "add-partition-cluster", label: "Partition table on event_timestamp and cluster on event_type", color: "green" },
        { id: "add-index", label: "Add a secondary index on event_timestamp column", color: "yellow" },
        { id: "flat-rate-slots", label: "Switch to flat-rate slot pricing to avoid per-TB charges", color: "blue" },
        { id: "select-star-fix", label: "Replace SELECT * with only the needed columns", color: "orange" },
        { id: "materialized-view", label: "Create a materialized view pre-filtering purchase events", color: "red" },
      ],
      correctActionId: "add-partition-cluster",
      rationales: [
        {
          id: "r-partition-solves",
          text: "Partitioning on event_timestamp means BigQuery reads only the 2026-03-01 partition (~5.7 GB) instead of 2.1 TB — a 370× cost reduction. Clustering on event_type further prunes data within each partition.",
        },
        {
          id: "r-select-star-minor",
          text: "While SELECT * is wasteful and should be fixed, it doesn't reduce bytes processed — BigQuery charges based on columns read. The full table scan is the dominant cost driver.",
        },
        {
          id: "r-no-index",
          text: "BigQuery does not use traditional secondary indexes. It uses partitioning and clustering as its primary data pruning mechanisms.",
        },
        {
          id: "r-flat-rate-wrong",
          text: "Flat-rate pricing doesn't reduce compute waste — it changes the pricing model but the query still reads 2.1 TB. Fix the root cause first.",
        },
        {
          id: "r-mat-view-overkill",
          text: "A materialized view is a valid advanced optimization, but partitioning alone solves the problem at the table level for all queries — not just this one.",
        },
      ],
      correctRationaleId: "r-partition-solves",
      feedback: {
        perfect: "Correct! The table has no partitioning, so every query performs a full 2.1 TB scan. Partitioning on the timestamp column reduces this to a single day's worth of data (~5.7 GB).",
        partial: "You identified part of the problem. While SELECT * wastes column projection, the real cost driver is the full table scan — partitioning is the highest-leverage fix.",
        wrong: "The execution plan is the key clue: Stage 1 reads the full 2.1 TB before Stage 2 filters it. This means there's no partition pruning happening. The fix is to partition the table.",
      },
    },
    {
      type: "investigate-decide",
      id: "bq-scenario-2",
      title: "Slow Dashboard Query — Slot Exhaustion",
      objective:
        "A Looker Studio dashboard that runs hourly aggregation queries over a sales table has become progressively slower over 3 months — from 8 seconds to 4+ minutes. Investigate the metrics and decide the best action.",
      investigationData: [
        {
          id: "query-stats",
          label: "BigQuery Job Statistics (last 30 days)",
          content:
            "Average slot utilization during dashboard queries: 98.7%\nAverage queue wait time: 3m 12s (was 2s three months ago)\nConcurrent dashboard queries (peak): 45\nReservation type: On-Demand (2,000 slot limit)\nProject slot quota: 2,000 slots\nPeak slot demand: ~11,400 slots",
          isCritical: true,
        },
        {
          id: "table-growth",
          label: "Sales Table Growth",
          content:
            "sales table size 90 days ago: 180 GB\nSales table size today: 2.4 TB\nGrowth rate: ~25 GB/day\nPartitioned on: sale_date (DATE)\nClustered on: region, product_category\nQuery always filters on sale_date — partition pruning confirmed",
        },
        {
          id: "query-example",
          label: "Dashboard Query Pattern",
          content:
            "SELECT\n  region,\n  product_category,\n  DATE_TRUNC(sale_date, MONTH) AS month,\n  SUM(revenue) AS total_revenue,\n  COUNT(DISTINCT customer_id) AS unique_customers\nFROM `prod.sales.transactions`\nWHERE sale_date BETWEEN '2026-01-01' AND '2026-03-28'\nGROUP BY 1, 2, 3\nORDER BY 3 DESC;",
          isCritical: false,
        },
        {
          id: "concurrent-users",
          label: "Concurrent User Growth",
          content:
            "Dashboard users 90 days ago: 12\nDashboard users today: 220\nAll users refresh dashboard on the same hourly schedule\nLooker Studio caching: Disabled",
        },
      ],
      actions: [
        { id: "enable-bi-engine", label: "Enable BigQuery BI Engine with a 10 GB reservation for this dashboard", color: "green" },
        { id: "purchase-slots", label: "Purchase a flat-rate 10,000-slot reservation for the project", color: "blue" },
        { id: "add-materialized-view", label: "Create a materialized view for the monthly aggregation and enable BI Engine caching", color: "orange" },
        { id: "enable-looker-cache", label: "Enable Looker Studio query caching and schedule the underlying query as a scheduled query", color: "yellow" },
      ],
      correctActionId: "enable-looker-cache",
      rationales: [
        {
          id: "r-cache-solves-concurrency",
          text: "220 users all running the same hourly aggregation is the core problem. Enabling Looker Studio caching means the query runs once and all 220 users read from cache — eliminating 219 of 220 redundant slot demands per refresh cycle.",
        },
        {
          id: "r-bi-engine-wrong-size",
          text: "BI Engine is ideal for sub-second interactive queries, but the root problem is 45 identical concurrent queries. BI Engine without caching still runs the underlying SQL per user.",
        },
        {
          id: "r-slots-expensive",
          text: "Purchasing 10,000 slots at flat-rate pricing would cost $40,000+/month. This solves the symptom (slot exhaustion) but not the root cause (redundant concurrent identical queries).",
        },
        {
          id: "r-mat-view-partial",
          text: "A materialized view reduces per-query cost but doesn't prevent 45 concurrent identical queries from each consuming slots. Caching is the correct first fix for this access pattern.",
        },
      ],
      correctRationaleId: "r-cache-solves-concurrency",
      feedback: {
        perfect: "Exactly right! The slowdown is caused by 220 users running identical queries simultaneously. Query caching means the query executes once, and all users read the same cached result.",
        partial: "You addressed part of the problem. The query itself is efficient (partitioned, clustered). The bottleneck is 220 identical concurrent executions — caching eliminates this pattern.",
        wrong: "Look at the concurrent user growth: 12 → 220 users, all running the same hourly query. Slot exhaustion is the symptom. The cause is redundant identical queries — fix it with caching, not more slots.",
      },
    },
    {
      type: "investigate-decide",
      id: "bq-scenario-3",
      title: "Cross-Region Query Billing Surprise",
      objective:
        "An engineering team received an unexpected $3,200 BigQuery charge for a data pipeline that joins a US dataset with a Europe dataset. Investigate the billing breakdown and decide the correct architectural fix.",
      investigationData: [
        {
          id: "pipeline-description",
          label: "Pipeline Architecture",
          content:
            "Job: Daily customer enrichment pipeline\nSource table A: prod-us.customers.profiles (US multi-region, 800 GB)\nSource table B: prod-eu.gdpr.consent_records (europe-west1, 120 GB)\nDestination: prod-us.analytics.enriched_customers (US multi-region)\nQuery: JOIN on customer_id\nFrequency: Daily at 02:00 UTC",
          isCritical: true,
        },
        {
          id: "billing-breakdown",
          label: "February Billing Breakdown",
          content:
            "BigQuery Compute (query processing): $420.00\nBigQuery Data Transfer - Cross-region egress: $2,780.00\n  us-central1 → europe-west1 (data movement): 120 GB × 28 days = 3,360 GB\n  Rate: $0.827/GB cross-region\nTotal: $3,200.00",
          isCritical: true,
        },
        {
          id: "gdpr-context",
          label: "GDPR and Data Residency Notes",
          content:
            "The consent_records table is in europe-west1 due to GDPR data residency requirements.\nGDPR requires that EU personal data (consent records) not be stored outside the EU.\nThe customer profiles table in US contains non-EU and EU customer data combined.\nLegal has approved: read EU consent data from EU, but cannot replicate consent_records to US.",
        },
        {
          id: "dataset-sizes",
          label: "Dataset Cardinalities",
          content:
            "Total customers in profiles table: 42 million\nEU customers in profiles table: 3.8 million (9%)\nRows in consent_records: 3.8 million (EU customers only)\nJoin selectivity: 1:1 on customer_id",
        },
      ],
      actions: [
        { id: "move-job-to-eu", label: "Move the BigQuery job to run in europe-west1 region", color: "green" },
        { id: "replicate-consent-us", label: "Replicate consent_records to US multi-region to eliminate cross-region reads", color: "red" },
        { id: "bigquery-omni", label: "Use BigQuery Omni to query the EU table in-place without data movement", color: "blue" },
        { id: "dataflow-pipeline", label: "Replace BigQuery with a Dataflow pipeline that streams only matched customer_ids", color: "orange" },
      ],
      correctActionId: "move-job-to-eu",
      rationales: [
        {
          id: "r-run-where-data-lives",
          text: "Running the BigQuery job in europe-west1 means both tables (EU consent + EU subset of profiles) are read locally. No cross-region data movement occurs, eliminating the $2,780 egress charge.",
        },
        {
          id: "r-gdpr-blocks-replication",
          text: "GDPR explicitly prohibits replicating EU personal consent data outside the EU. This option is legally blocked.",
        },
        {
          id: "r-omni-wrong",
          text: "BigQuery Omni is for querying data in AWS S3 or Azure Blob Storage — it doesn't apply to cross-GCP-region BigQuery datasets.",
        },
        {
          id: "r-dataflow-complex",
          text: "Dataflow adds significant architectural complexity and cost. The simple fix is to co-locate the compute job with the restrictive data (EU consent records).",
        },
      ],
      correctRationaleId: "r-run-where-data-lives",
      feedback: {
        perfect: "Correct! Cross-region data movement is the most expensive BigQuery billing line item. Running the job in the same region as the constrained data eliminates the egress fees entirely.",
        partial: "You found a valid approach, but the simplest and cheapest fix is to move the BigQuery job to run in europe-west1 — where the consent_records table already lives.",
        wrong: "The $2,780 charge is cross-region data egress — BigQuery moving 120 GB/day from EU to US. The fix is to move the job to run in the same region as the data, not move the data.",
      },
    },
  ],
  hints: [
    "Always check 'Bytes processed' in the BigQuery job details before a query runs (the validator shows an estimate). Partitioned tables filtered on the partition column reduce bytes processed dramatically.",
    "Cross-region data movement in BigQuery is billed at egress rates ($0.08–$0.83/GB depending on regions). Always run your job in the same region as your largest or most constrained table.",
    "When many users run identical queries, caching is always cheaper than adding slots. BigQuery on-demand has a 2,000 slot soft limit — high concurrency on identical queries will exhaust this quickly.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "BigQuery is one of GCP's flagship services and BigQuery optimization skills are highly sought after in data engineering and analytics engineering roles. Organizations routinely overspend on BigQuery due to missing partitioning, SELECT * queries, and architecture mistakes like cross-region joins. Engineers who can audit and fix these patterns save companies significant money.",
  toolRelevance: ["BigQuery Console", "BigQuery Query Plan Visualizer", "gcloud bq CLI", "Cloud Billing", "Looker Studio"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
