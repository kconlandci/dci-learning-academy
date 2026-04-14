import type { LabManifest } from "../../types/manifest";

export const dataLakeArchitectureLab: LabManifest = {
  schemaVersion: "1.1",
  id: "data-lake-architecture",
  version: 1,
  title: "Data Lake Architecture and Governance",
  tier: "advanced",
  track: "cloud-architecture",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["architecture", "data-lake", "medallion", "governance", "delta-lake", "data-mesh", "lakehouse"],
  description:
    "Design a scalable data lake architecture using the medallion pattern (bronze/silver/gold layers), implement data governance with cataloging and lineage tracking, and make critical decisions about schema enforcement, partitioning strategies, and access control for multi-team data platforms.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Design a medallion architecture with bronze, silver, and gold layers for progressive data refinement",
    "Choose the correct data format and partitioning strategy for different query patterns",
    "Implement data governance controls including cataloging, lineage, and access policies",
    "Evaluate trade-offs between schema-on-read and schema-on-write for data lake ingestion",
    "Apply data quality gates between medallion layers to prevent bad data propagation",
  ],
  sortOrder: 414,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "dl-s1-medallion-ingestion",
      title: "Bronze Layer Ingestion Strategy for Raw Event Data",
      context:
        "Your organization is building a new data lake on S3 to ingest raw event data from 45 different source systems. Events arrive in JSON, CSV, Avro, and Protobuf formats at a combined rate of 2 TB per day. The data engineering team needs to design the bronze layer ingestion strategy. Some teams want to enforce a unified schema at ingestion; others want to preserve raw data exactly as received.",
      displayFields: [
        { label: "Sources", value: "45 systems — JSON, CSV, Avro, Protobuf formats", emphasis: "normal" },
        { label: "Volume", value: "2 TB/day combined ingestion", emphasis: "normal" },
        { label: "Debate", value: "Schema enforcement at ingestion vs. raw preservation", emphasis: "warn" },
        { label: "Consumers", value: "Data engineers (silver layer), ML engineers, compliance team", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Enforce a unified Avro schema at ingestion and reject non-conforming records", color: "red" },
        { id: "a2", label: "Ingest all raw data as-is into the bronze layer, preserving original format and adding ingestion metadata (timestamp, source, batch ID)", color: "green" },
        { id: "a3", label: "Convert all data to Parquet at ingestion with a best-effort schema inference", color: "orange" },
        { id: "a4", label: "Store raw data in a relational database with a flexible JSONB column for schema diversity", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Enforcing a schema at the bronze layer rejects data that doesn't conform, creating data loss. Bronze is the raw preservation layer — schema enforcement belongs at the silver layer transition." },
        { id: "r2", text: "The bronze layer's purpose is to capture a complete, immutable record of all source data. Preserving original formats enables reprocessing if silver layer transformations change, and ingestion metadata provides lineage for governance." },
        { id: "r3", text: "Converting to Parquet at ingestion applies a schema transformation too early. If schema inference is wrong, the raw data is lost and cannot be reprocessed correctly." },
        { id: "r4", text: "A relational database is not designed for 2 TB/day of diverse, semi-structured data. Object storage (S3) with a metadata catalog is the standard data lake bronze layer." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. The bronze layer is the raw, immutable landing zone. Preserve everything as-is with ingestion metadata — schema enforcement and transformation happen at the bronze-to-silver transition.",
        partial: "You're applying the right concept (data lake) but enforcing structure too early. The medallion architecture defers schema enforcement to the silver layer to preserve raw data fidelity.",
        wrong: "The bronze layer must preserve raw data exactly as received. Any transformation or schema enforcement at ingestion risks data loss that cannot be recovered.",
      },
    },
    {
      type: "action-rationale",
      id: "dl-s2-partitioning-strategy",
      title: "Gold Layer Partitioning for Analytics Query Performance",
      context:
        "The analytics team queries the gold layer daily for regional sales dashboards. The primary query pattern filters by sale_date and region, then aggregates revenue. The gold layer table contains 3 years of sales data (1.8 TB in Delta Lake format on S3). Dashboard queries consistently scan the entire table because no partitioning or file organization has been configured. Query times average 12 minutes.",
      displayFields: [
        { label: "Table Size", value: "1.8 TB — 3 years of sales data in Delta Lake", emphasis: "normal" },
        { label: "Primary Query Pattern", value: "WHERE sale_date = X AND region = Y → SUM(revenue)", emphasis: "warn" },
        { label: "Current Partitioning", value: "None — full table scans on every query", emphasis: "critical" },
        { label: "Query Time", value: "12 minutes average (target: < 30 seconds)", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Partition by sale_date (daily) and apply Z-ordering on region", color: "green" },
        { id: "a2", label: "Partition by region only, since there are fewer distinct values", color: "yellow" },
        { id: "a3", label: "Create a separate materialized view table for each region", color: "red" },
        { id: "a4", label: "Partition by sale_date and region as a composite partition key", color: "orange" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Partitioning by sale_date provides high-cardinality partition pruning (daily granularity eliminates ~99.9% of data). Z-ordering on region physically co-locates data within each partition for efficient range scans on the secondary filter dimension." },
        { id: "r2", text: "Partitioning by region alone creates too few partitions (perhaps 10-20), so each partition is still hundreds of gigabytes. Date filtering within a partition still requires scanning all files." },
        { id: "r3", text: "Separate materialized tables per region are an operational burden to maintain, break cross-region queries, and duplicate the transformation pipeline." },
        { id: "r4", text: "Composite partitioning by date and region creates an explosion of small partitions (365 days x 15 regions = 5,475 partitions per year). This leads to the small files problem — too many tiny files degrade query planning and metadata overhead." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Partition on the highest-cardinality filter column (date) for maximum data elimination, then Z-order on the secondary dimension (region) for within-partition data skipping.",
        partial: "You're partitioning on a relevant column but not optimizing both filter dimensions. The combination of partitioning and Z-ordering addresses both the primary and secondary query filters.",
        wrong: "This approach either creates too many small partitions or doesn't address the primary query pattern. Partition on date for pruning, Z-order on region for data skipping.",
      },
    },
    {
      type: "action-rationale",
      id: "dl-s3-governance-access",
      title: "Cross-Team Data Access Governance",
      context:
        "Three teams need access to the data lake: the analytics team needs read access to gold layer aggregated data, the data engineering team needs read/write to all layers, and the compliance team needs read access to bronze layer audit logs but must NOT access silver or gold layers containing derived PII-enriched data. Currently, all teams have full S3 bucket access because governance was never implemented.",
      displayFields: [
        { label: "Analytics Team", value: "Gold layer read-only", emphasis: "normal" },
        { label: "Data Engineering", value: "All layers read/write", emphasis: "normal" },
        { label: "Compliance Team", value: "Bronze audit logs only — NO access to PII-enriched silver/gold", emphasis: "critical" },
        { label: "Current State", value: "All teams have full S3 bucket access", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Create separate S3 buckets per layer and use IAM policies to restrict bucket-level access per team", color: "yellow" },
        { id: "a2", label: "Implement AWS Lake Formation with database and table-level permissions, column-level security for PII fields, and tag-based access control per team", color: "green" },
        { id: "a3", label: "Use S3 bucket policies with IP-based restrictions per team", color: "red" },
        { id: "a4", label: "Apply S3 object-level ACLs to tag each object with the owning team", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Separate buckets per layer simplify IAM but don't provide table or column-level access control. The compliance team needs access to specific tables within bronze, not all of bronze." },
        { id: "r2", text: "Lake Formation provides fine-grained access control at the database, table, column, and row level with tag-based policies. It enables the compliance team to access only audit log tables in bronze while blocking PII columns — the granularity this scenario requires." },
        { id: "r3", text: "IP-based restrictions are not identity-aware and don't support table or column-level access. Teams access the data lake from the same network, making IP filtering ineffective." },
        { id: "r4", text: "S3 object-level ACLs are not designed for data lake governance at scale. They don't integrate with the Glue Data Catalog and cannot enforce column-level security." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Lake Formation is the purpose-built governance layer for data lakes on AWS. Its tag-based access control and column-level security provide exactly the granularity needed for multi-team governance.",
        partial: "Bucket-level separation is a start but doesn't provide the table and column-level granularity the compliance team's restrictions require. Lake Formation adds the necessary fine-grained controls.",
        wrong: "This approach lacks the granularity needed for data lake governance. Column-level and table-level access control requires a purpose-built governance tool like Lake Formation.",
      },
    },
  ],
  hints: [
    "The medallion architecture's bronze layer is an immutable, append-only raw landing zone. Never transform or enforce schemas at ingestion — preserve the original data and add metadata for lineage.",
    "When partitioning large analytical tables, choose the highest-cardinality column that appears in WHERE clauses. Use Z-ordering (or Hive-style clustering) for secondary filter dimensions to avoid the small files problem from composite partitioning.",
    "AWS Lake Formation provides centralized governance for data lakes with tag-based access control, column-level security, and row-level filtering — far more granular than S3 IAM policies alone.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Data lake architecture is a cornerstone skill for data platform engineers and cloud data architects. Organizations building modern data platforms on AWS, Azure, or GCP need engineers who understand medallion architecture, data governance, and query optimization — skills tested in AWS Data Engineer, Databricks Data Engineer, and cloud architect certifications.",
  toolRelevance: ["Amazon S3", "AWS Lake Formation", "AWS Glue Data Catalog", "Delta Lake", "Apache Spark", "Amazon Athena"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
