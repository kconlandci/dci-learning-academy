import type { LabManifest } from "../../types/manifest";

export const databaseSelectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "database-selection",
  version: 1,
  title: "Cloud Database Selection",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["database", "nosql", "relational", "data-modeling", "cap-theorem"],
  description:
    "Investigate workload characteristics, data models, and consistency requirements to select the most appropriate database technology for each scenario.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Map access patterns and data models to the appropriate database category",
    "Explain the CAP theorem trade-offs in the context of database selection",
    "Distinguish between OLTP and OLAP workload requirements",
    "Identify when a graph, time-series, or document database outperforms a relational store",
  ],
  sortOrder: 406,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "db-social-graph",
      title: "Database for a Social Network's Relationship Graph",
      objective:
        "A social networking feature needs to support friend-of-friend recommendations, mutual connection counts, and shortest-path queries between users. Investigate the access patterns and data model to select the best database type.",
      investigationData: [
        {
          id: "inv-query-patterns",
          label: "Query Pattern Analysis",
          content:
            "Required queries: (1) Find all users within 3 degrees of connection for recommendations. (2) Count mutual friends between two users. (3) Shortest path between User A and User B. (4) Suggest 'People You May Know' based on shared connections. All queries traverse relationships, not just individual rows.",
          isCritical: true,
        },
        {
          id: "inv-data-model",
          label: "Data Model",
          content:
            "Entities: User (id, name, profile_data). Relationships: FRIENDS_WITH (since, source), FOLLOWS (since), BLOCKED. Current relational schema uses a self-referential friends table with 2.4 billion rows. A 3-hop traversal query currently takes 45 seconds.",
          isCritical: true,
        },
        {
          id: "inv-scale",
          label: "Scale Requirements",
          content:
            "500 million user records. 12 billion relationship edges. Read/write ratio: 95/5. Recommendation queries run continuously for 80 million daily active users. Relationship writes (new friendships) occur at ~2,000/second at peak.",
          isCritical: false,
        },
        {
          id: "inv-consistency",
          label: "Consistency Requirements",
          content:
            "Friend recommendations can be eventually consistent — a new friendship taking up to 5 minutes to appear in recommendations is acceptable. Explicit friend acceptance must be strongly consistent to avoid duplicate processing.",
        },
      ],
      actions: [
        { id: "graph-db", label: "Graph database with native relationship traversal (e.g., Neo4j, Amazon Neptune)", color: "green" },
        { id: "relational", label: "Relational database with optimized self-join queries and covering indexes", color: "yellow" },
        { id: "document-db", label: "Document database storing each user's friend list as an embedded array", color: "orange" },
        { id: "wide-column", label: "Wide-column store with adjacency list modeling for relationship lookups", color: "blue" },
      ],
      correctActionId: "graph-db",
      rationales: [
        { id: "r-graph", text: "Graph databases store relationships as first-class citizens, enabling O(1) edge traversal regardless of graph size. Multi-hop traversal queries that take 45 seconds in a relational self-join complete in milliseconds in a native graph store — this is exactly the use case graph databases are designed for." },
        { id: "r-relational", text: "Relational databases perform multi-hop joins by scanning large tables. At 12 billion edges, a 3-hop traversal generates billions of intermediate rows. Even with optimal indexing, join fan-out makes this approach unscalable for real-time recommendation queries." },
        { id: "r-document", text: "Storing friend lists as embedded arrays works for direct friend lookups but requires loading and intersecting entire friend lists in application memory for mutual-connection and multi-hop queries. Performance degrades badly at 500 million users." },
        { id: "r-wide-column", text: "Wide-column stores can model adjacency lists efficiently for single-hop lookups but multi-hop traversals require multiple round-trips to the database for each degree of separation, adding latency and complexity versus native graph traversal." },
      ],
      correctRationaleId: "r-graph",
      feedback: {
        perfect: "Correct. When the primary query patterns are relationship traversals (friends-of-friends, shortest path, mutual connections), graph databases are the purpose-built solution.",
        partial: "Your choice can technically store relationship data but won't perform well for multi-hop traversal queries at this scale. Check the query pattern data.",
        wrong: "The 45-second relational query time is the key clue. Traversal-heavy queries do not benefit from indexes in the way point lookups do — graph databases handle this fundamentally differently.",
      },
    },
    {
      type: "investigate-decide",
      id: "db-iot-timeseries",
      title: "Database for IoT Sensor Telemetry",
      objective:
        "An industrial IoT platform ingests sensor readings from 50,000 devices every 10 seconds. The primary use cases are real-time dashboards and anomaly detection over rolling time windows. Investigate requirements and select the optimal database.",
      investigationData: [
        {
          id: "inv-ingestion",
          label: "Ingestion Characteristics",
          content:
            "Write volume: 5,000 data points/second (50,000 devices × 1 reading per 10 seconds). Each data point: device_id, timestamp, metric_name, value (float). Data is always appended — no updates to historical readings. Ingestion must not fall behind during traffic spikes.",
          isCritical: true,
        },
        {
          id: "inv-query-types",
          label: "Query Patterns",
          content:
            "Dashboard queries: Average, min, max over last 5/15/60 minutes per device or device group. Anomaly detection: Standard deviation over a rolling 30-minute window, compared across all devices. Time range scans dominate — no random point lookups by device ID outside a time range. 90% of queries access data from the last 7 days.",
          isCritical: true,
        },
        {
          id: "inv-retention",
          label: "Data Retention Policy",
          content:
            "Hot data (last 30 days): Sub-second query response required. Warm data (30–365 days): Up to 5-second query response acceptable. Cold data (>1 year): Accessible within 60 seconds, low-cost storage. Automatic downsampling of warm and cold data to 1-minute and 1-hour resolution acceptable.",
          isCritical: false,
        },
        {
          id: "inv-existing-db",
          label: "Current Setup",
          content:
            "Currently using a relational database. Table has 48 billion rows after 3 years of data. INSERT latency has grown to 180ms average (up from 8ms at launch). Disk usage 14 TB. Dashboard queries take 12–45 seconds. Index maintenance consumes 40% of database CPU.",
        },
      ],
      actions: [
        { id: "tsdb", label: "Time-series database with automatic retention tiers and built-in downsampling", color: "green" },
        { id: "relational-partitioned", label: "Relational database with time-based table partitioning and partition pruning", color: "yellow" },
        { id: "document-append", label: "Document database with one document per device per hour containing an array of readings", color: "orange" },
        { id: "columnar-warehouse", label: "Columnar analytics warehouse optimized for aggregate queries", color: "blue" },
      ],
      correctActionId: "tsdb",
      rationales: [
        { id: "r-tsdb", text: "Time-series databases compress time-ordered data using delta encoding, provide built-in downsampling, automatic retention tier transitions, and execute rolling window aggregations as first-class operations — delivering sub-second dashboard queries at 5,000 writes/second that relational databases cannot match at this scale." },
        { id: "r-relational-part", text: "Partitioning helps but the current evidence shows relational is already failing at 48 billion rows with 12–45 second queries and 40% CPU on index maintenance. Partitioning optimizes range scans but does not provide column-oriented storage or delta compression, which are necessary for this write volume and query pattern." },
        { id: "r-document", text: "Hourly document buckets reduce document count but aggregating across documents (e.g., rolling 30-minute standard deviation) requires scanning many documents and computing in application memory. Write throughput for a document store under this pattern is also high." },
        { id: "r-columnar", text: "Columnar warehouses excel at aggregate queries but are not designed for 5,000/second continuous writes. They are better suited for batch-loaded analytical workloads rather than real-time sensor ingestion with sub-second dashboard latency requirements." },
      ],
      correctRationaleId: "r-tsdb",
      feedback: {
        perfect: "Correct. Time-series databases are designed precisely for append-only high-throughput telemetry with rolling window queries and automated retention management.",
        partial: "Your choice handles one dimension well (either writes or queries) but doesn't address both the ingestion volume and the sub-second query requirement simultaneously.",
        wrong: "The current relational database performance data is the key signal. The query and write patterns here are time-series workloads that require a purpose-built engine.",
      },
    },
    {
      type: "investigate-decide",
      id: "db-product-catalog",
      title: "Database for a Flexible Product Catalog",
      objective:
        "An e-commerce platform sells products across 500 categories, each with different attribute schemas. Electronics have voltage/wattage; clothing has size/color/material; books have ISBN/author/publisher. Investigate the data model requirements and choose the best database.",
      investigationData: [
        {
          id: "inv-schema-variance",
          label: "Schema Variability",
          content:
            "500 product categories, each with 5–40 unique attributes. Only 6 attributes are common across all products (id, name, price, sku, category_id, created_at). A product can belong to multiple categories. New product categories are added monthly, each with new custom attributes. Schema changes cannot require downtime.",
          isCritical: true,
        },
        {
          id: "inv-access-patterns",
          label: "Access Patterns",
          content:
            "Primary reads: Fetch a single product by ID (80% of reads). Secondary: Full-text search within a category by attribute filters. Writes: Product create/update by catalog managers — not high frequency (500/day). No cross-product aggregate queries required in this service. Search is handled by a separate search index.",
          isCritical: true,
        },
        {
          id: "inv-existing-relational",
          label: "Current Relational Schema Problems",
          content:
            "Current approach: One table per category (500+ tables) plus a sparse EAV (Entity-Attribute-Value) table with 200M rows for custom attributes. EAV queries require 10+ joins to reconstruct a product. ALTER TABLE for new attributes causes 30-minute table locks. Adding a new category requires 3 days of schema migration work.",
          isCritical: true,
        },
        {
          id: "inv-consistency",
          label: "Consistency & Transaction Requirements",
          content:
            "Product updates are transactional within a single product (e.g., price + inventory must update atomically). No cross-product transactions needed. Catalog managers are tolerant of up to 30-second read-your-own-write delay after editing a product.",
        },
      ],
      actions: [
        { id: "document-store", label: "Document database storing each product as a flexible JSON document", color: "green" },
        { id: "relational-jsonb", label: "Relational database with a JSONB column for variable attributes alongside fixed columns", color: "blue" },
        { id: "eav-optimized", label: "Optimize the existing EAV relational model with better indexing and caching", color: "red" },
        { id: "wide-column-catalog", label: "Wide-column store with one row per product and dynamic columns per category", color: "yellow" },
      ],
      correctActionId: "document-store",
      rationales: [
        { id: "r-document", text: "Document databases store each product as a self-contained JSON document with arbitrary attributes, eliminating the EAV join complexity, enabling schema-free evolution for new categories, and providing single-document reads for the primary access pattern (product by ID)." },
        { id: "r-jsonb", text: "JSONB in a relational database is a pragmatic hybrid — it eliminates EAV joins for the variable attributes while keeping structured columns for shared fields. This is a valid approach and avoids a full migration, though document databases are more operationally optimized for this pattern." },
        { id: "r-eav", text: "The EAV model is the root cause of the 10+ join reconstruction queries and 30-minute schema lock issues. Optimizing it with indexes and caching addresses symptoms but not the structural problem — query complexity and schema evolution pain persist." },
        { id: "r-wide-column-catalog", text: "Wide-column stores allow dynamic columns but are optimized for high-throughput time-ordered writes, not for flexible document retrieval by ID. The operational model and query API are less natural for catalog management use cases." },
      ],
      correctRationaleId: "r-document",
      feedback: {
        perfect: "Correct. Flexible schemas with highly variable per-category attributes and a primary access pattern of single-entity reads are the core use case for document databases.",
        partial: "Your choice reduces some of the schema complexity but may not fully eliminate the EAV join overhead or schema migration pain for new categories.",
        wrong: "The EAV problem and schema migration pain are the key clues. Review what database type is designed for flexible, schema-free data models where each entity has a variable set of attributes.",
      },
    },
  ],
  hints: [
    "Match the database type to the primary access pattern: graph traversals need graph DBs, time-range scans need time-series DBs, flexible schemas need document DBs.",
    "If your relational query already takes 45 seconds with 2.4 billion rows, adding indexes won't save you — the data model itself is wrong for that query type.",
    "The CAP theorem matters: if consistency is negotiable (eventually consistent acceptable), you have more database options than if you require strong consistency.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Database selection is one of the most consequential architectural decisions — it shapes query capabilities, scaling strategies, and migration costs for years. Architects who understand the full polyglot persistence landscape and can justify database choices against specific workload characteristics are highly effective in data-intensive architecture reviews.",
  toolRelevance: [
    "Amazon DynamoDB",
    "Amazon Neptune",
    "InfluxDB",
    "MongoDB",
    "PostgreSQL",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
