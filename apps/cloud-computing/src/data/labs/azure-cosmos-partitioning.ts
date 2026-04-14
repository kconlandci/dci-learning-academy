import type { LabManifest } from "../../types/manifest";

export const azureCosmosPartitioningLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-cosmos-partitioning",
  version: 1,
  title: "Azure Cosmos DB Partition Key Design",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "cosmos-db", "partitioning", "nosql", "throughput", "hot-partition"],
  description:
    "Investigate Cosmos DB partition key design problems causing hot partitions, cross-partition queries, and throughput throttling, then select the correct remediation.",
  estimatedMinutes: 13,
  learningObjectives: [
    "Identify hot partition scenarios from Cosmos DB metrics and normalized RU consumption",
    "Select partition keys that distribute load evenly across physical partitions",
    "Diagnose cross-partition query costs and optimize with targeted single-partition queries",
  ],
  sortOrder: 211,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "scenario-1",
      title: "E-Commerce Orders Container — Hot Partition Throttling",
      objective:
        "An e-commerce platform stores all orders in a Cosmos DB container partitioned by 'status' (values: 'pending', 'processing', 'completed', 'cancelled'). 429 throttling errors are appearing for order writes during peak hours. Investigate the partition distribution and identify the fix.",
      investigationData: [
        {
          id: "inv-partition-metrics",
          label: "Cosmos DB Metrics — Partition Key Statistics",
          content:
            "Azure Portal > Cosmos DB > Insights > Partition Key Statistics: 'pending': 67% of all requests, 89% of all writes. 'processing': 28% of requests. 'completed': 4%. 'cancelled': 1%. Hot partition 'pending' consuming 94% of provisioned RU/s.",
          isCritical: true,
        },
        {
          id: "inv-throughput",
          label: "Throughput Configuration",
          content:
            "Container throughput: 10,000 RU/s (autoscale max). Normalized RU consumption: hot partition 'pending' at 100% (throttled). Other partitions: 5–15% utilization. 429 errors: 2,847 in last hour for writes to 'pending' partition.",
          isCritical: true,
        },
        {
          id: "inv-query-patterns",
          label: "Query Patterns",
          content:
            "Top queries: (1) 'SELECT * FROM c WHERE c.status = @status' — cross-partition query, returns all records with a given status. (2) 'SELECT * FROM c WHERE c.orderID = @id' — single document lookup by orderID. (3) 'SELECT * FROM c WHERE c.customerID = @cid AND c.status = @status' — filter by customer and status.",
        },
        {
          id: "inv-schema",
          label: "Document Schema",
          content:
            "Order document fields: orderID (GUID, unique), customerID (1M unique values), status (4 values), productID (50K unique values), region (12 values), createdAt (timestamp), totalAmount (numeric). Average document size: 2.1 KB.",
        },
        {
          id: "inv-cardinality",
          label: "Partition Key Cardinality Analysis",
          content:
            "Current: status → 4 unique values (very low cardinality, massive hot partition). Alternative A: customerID → 1M unique values (high cardinality, even distribution). Alternative B: orderID → UUID (highest cardinality, perfect distribution but all queries become cross-partition). Alternative C: customerID + createdAt (synthetic key) → high cardinality with temporal locality.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Change partition key from 'status' to 'customerID' — high cardinality, aligns with query pattern 3",
        },
        {
          id: "action-b",
          label: "Increase provisioned throughput from 10,000 to 50,000 RU/s to handle the hot partition",
        },
        {
          id: "action-c",
          label: "Add a secondary index on the 'status' field to speed up status-based queries",
        },
        {
          id: "action-d",
          label: "Split the container into four separate containers, one per status value",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "customerID has 1 million unique values — extremely high cardinality that distributes writes and reads evenly across physical partitions. Query pattern 3 (the most common) already filters by customerID, making it a natural partition key. Single-customer queries become efficient single-partition lookups. Status-based queries become cross-partition scans (acceptable for analytical, infrequent queries).",
        },
        {
          id: "rationale-b",
          text: "Increasing RU/s addresses the symptom (throttling) not the cause (all 'pending' writes hitting one partition). Cosmos DB distributes RU/s proportionally across partitions — the hot partition would consume its allocation and throttle regardless of how many total RU/s are provisioned. Throwing more RU/s at a hot partition is expensive and ineffective.",
        },
        {
          id: "rationale-c",
          text: "Cosmos DB indexes all fields by default — adding an index on 'status' provides no benefit since the field is already indexed. The problem is not index coverage; it's that all writes to 'status=pending' land on the same physical partition.",
        },
        {
          id: "rationale-d",
          text: "Splitting into four containers adds operational complexity (separate throughput, separate connection strings, separate lifecycle management) and doesn't solve the fundamental imbalance — the 'pending' container would still receive 67% of all writes.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. customerID provides high cardinality distribution, aligns with the primary query pattern, and eliminates the hot partition that causes throttling.",
        partial:
          "Your solution addresses the symptom but not the cause, or introduces complexity that doesn't fix the partition distribution problem.",
        wrong:
          "Adding indexes and increasing RU/s are common misconceptions for hot partition problems. The only real fix is a partition key with high cardinality and even write distribution.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-2",
      title: "IoT Device Container — Time-Series Data Hot Partition",
      objective:
        "A Cosmos DB container stores IoT sensor readings partitioned by 'deviceID'. Each of 10,000 devices writes once per second. The RU consumption pattern shows no hot partitions — distribution is even. However, cross-partition queries for 'all readings in the last hour' are consuming 45,000 RU per query and taking 8 seconds. Identify the optimization.",
      investigationData: [
        {
          id: "inv-query-cost",
          label: "Query Performance — Cross-Partition Scan",
          content:
            "Query: 'SELECT * FROM c WHERE c.timestamp >= @startTime AND c.timestamp < @endTime' — Request Charge: 45,280 RU, Items returned: 36,000, Duration: 8.2s, Fan-out: all 1,000 physical partitions.",
          isCritical: true,
        },
        {
          id: "inv-schema2",
          label: "Document Schema",
          content:
            "Sensor reading fields: readingID (GUID), deviceID (string, 10K devices), sensorType (5 types: temp/humidity/pressure/co2/motion), timestamp (epoch ms), value (float), region (12 regions), buildingID (500 buildings).",
        },
        {
          id: "inv-query-patterns2",
          label: "Top Query Patterns",
          content:
            "Query A (98% of queries): 'Get all readings for deviceID=X in time range' — single device, time range. Query B (1.5%): 'Get all temperature readings in buildingID=Y in last hour' — building-wide aggregation. Query C (0.5%): 'Get all readings across all devices in last hour' — global aggregation.",
          isCritical: true,
        },
        {
          id: "inv-ttl",
          label: "Time-To-Live Configuration",
          content:
            "Container TTL: disabled. Total data: 8.6 TB. Data older than 90 days: 97% of total storage. Queries almost never access data older than 24 hours.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Change partition key to a synthetic key combining deviceID and date (e.g., 'deviceID_YYYYMMDD') — Query A becomes single-partition; enable TTL to expire old readings",
        },
        {
          id: "action-b",
          label: "Add a composite index on (timestamp, deviceID) to speed up cross-partition time range queries",
        },
        {
          id: "action-c",
          label: "Increase container throughput to 100,000 RU/s to afford the cross-partition scans",
        },
        {
          id: "action-d",
          label: "Move time-series data to Azure Data Explorer (ADX) which is optimized for time-series queries",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "A synthetic key 'deviceID_YYYYMMDD' (e.g., 'device-001_20260328') transforms Query A (98% of all queries) from a 1,000-partition fan-out scan into a single-partition lookup — reducing cost from 45,000 RU to ~50 RU. The date component ensures even temporal distribution. Enabling TTL clears 97% of storage (data older than 90 days) that is never queried, reducing storage cost dramatically.",
        },
        {
          id: "rationale-b",
          text: "Composite indexes speed up ordering and filter combinations within a partition, but cross-partition queries must still fan out to every partition regardless of index coverage. An index on (timestamp, deviceID) would not eliminate the 1,000-partition fan-out for global time range queries.",
        },
        {
          id: "rationale-c",
          text: "100,000 RU/s provisioning makes the cross-partition scans affordable but at enormous ongoing cost. A single query currently costs 45,000 RU — at 100,000 RU/s the container's entire throughput is consumed by 2 concurrent cross-partition queries. Fix the query pattern, don't subsidize inefficiency with throughput.",
        },
        {
          id: "rationale-d",
          text: "ADX is an excellent choice for time-series analytics at petabyte scale. However, 98% of queries are single-device lookups — not the time-series analytics ADX excels at. Migrating to ADX for mostly point-lookup queries adds operational complexity without addressing the core partition key design flaw.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Synthetic partition keys that combine a high-cardinality field with a time granularity are the standard Cosmos DB pattern for time-series IoT data.",
        partial:
          "Your solution addresses symptoms (cost, storage) but doesn't fix the partition key design flaw that makes Query A — 98% of workload — unnecessarily expensive.",
        wrong:
          "Provisioning more throughput to compensate for inefficient cross-partition queries is the most expensive way to 'solve' a design problem. Fix the partition key.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-3",
      title: "User Profile Container — Fan-Out Query Optimization",
      objective:
        "A user profile container stores profiles partitioned by 'userID'. The application performs a 'get all users in org X' query that fans out across all partitions and costs 12,000 RU. This query runs 500 times per minute. The total RU cost for this query pattern alone exceeds the provisioned throughput. Investigate and select the correct fix.",
      investigationData: [
        {
          id: "inv-query-orgs",
          label: "Expensive Query Details",
          content:
            "Query: 'SELECT * FROM c WHERE c.organizationID = @orgID' — Request Charge: 12,000–18,000 RU (varies by org size). Execution count: 500/minute. Total RU from this query: 6,000,000–9,000,000 RU/min. Provisioned throughput: 50,000 RU/s (3,000,000 RU/min). Result: constant 429 throttling.",
          isCritical: true,
        },
        {
          id: "inv-query-split",
          label: "Query Pattern Analysis",
          content:
            "Query 1 (99%): 'GET /users/{userID}' — single user by ID. Direct lookup, extremely fast (< 5 RU). Query 2 (1%): 'GET /orgs/{orgID}/users' — all users in an organization. 500 requests/min seems high for 1% of queries — investigate caller.",
          isCritical: true,
        },
        {
          id: "inv-caller",
          label: "API Gateway Access Logs — Query 2 Caller",
          content:
            "GET /orgs/{orgID}/users caller analysis: 494 of 500 calls per minute originate from the 'OrgDashboard' frontend component which re-fetches the org user list on every page load, including pagination renders. No caching implemented.",
        },
        {
          id: "inv-org-size",
          label: "Organization Size Distribution",
          content:
            "org.users count: median 45 users/org, p95 320 users/org, max 4,200 users/org (1 enterprise customer). Query cost scales with org size — the enterprise org query costs 18,000 RU each time.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add organizationID as a secondary partition key path (hierarchical partitioning) and implement Redis caching for org user lists with 60-second TTL",
        },
        {
          id: "action-b",
          label: "Increase provisioned throughput to 200,000 RU/s to handle the query volume",
        },
        {
          id: "action-c",
          label: "Migrate the user profile data to Azure SQL Database which handles cross-partition queries efficiently",
        },
        {
          id: "action-d",
          label: "Add a dedicated 'orgUsers' container partitioned by organizationID for the org-user lookup pattern",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Two changes together: (1) Cosmos DB hierarchical partitioning (sub-partitioning by organizationID under userID) reduces cross-partition fan-out for org queries. (2) Redis caching for org user lists with 60s TTL eliminates 98%+ of the query volume — the org user list doesn't change every second, so 494 of 500 requests per minute are redundant fetches of the same data. Combined, these reduce RU consumption by 95%+.",
        },
        {
          id: "rationale-b",
          text: "200,000 RU/s costs approximately $19,200/month. The root cause is unnecessary repeated queries (494/500 calls fetch the same data) and missing caching. Scaling up throughput funds the waste indefinitely. Fix the caching, reduce the provisioned RU.",
        },
        {
          id: "rationale-c",
          text: "Migrating to Azure SQL is a major architectural change for a use case (user profile storage) that Cosmos DB handles well. The issue is not the database choice — it's a missing cache and inefficient query pattern. The migration cost would far exceed the cost of fixing the cache.",
        },
        {
          id: "rationale-d",
          text: "A dedicated orgUsers container is a valid design pattern (materialized view) for serving the org-user query. However, it requires maintaining two documents per user (profile + org membership), adds write complexity, and still doesn't address the 494 redundant cache-missing requests per minute from the dashboard.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. The dual fix — hierarchical partitioning plus caching — addresses both the query efficiency and the call volume, which together cause the throughput exhaustion.",
        partial:
          "Your fix addresses one dimension (database efficiency or query volume) but not both. You need to reduce the RU cost per query AND the number of identical queries being sent.",
        wrong:
          "Provisioning more throughput for a workload where 98% of queries return cached data is pure waste. Always look at caching opportunities before scaling database throughput.",
      },
    },
  ],
  hints: [
    "A good Cosmos DB partition key has high cardinality (thousands to millions of unique values) and distributes both writes and reads evenly — avoid 'status', 'type', or any field with fewer than 100 unique values.",
    "Synthetic partition keys combine two fields (e.g., 'deviceID_date') to achieve single-partition access for the most common query pattern while maintaining good cardinality for distribution.",
    "Cross-partition queries in Cosmos DB fan out to every physical partition — always check the Request Charge in the query metrics and look for caching opportunities when the same query is called repeatedly with identical parameters.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Cosmos DB partition key design is one of the highest-leverage architectural decisions in NoSQL database design. A bad partition key choice made at container creation is expensive to fix (data migration required). Understanding hot partitions, RU cost implications, and synthetic key patterns is essential for any engineer working with large-scale Azure NoSQL workloads.",
  toolRelevance: ["Azure Portal", "Azure Cosmos DB Explorer", "Azure Monitor", "Azure CLI", "Azure Cache for Redis"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
