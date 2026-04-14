import type { LabManifest } from "../../types/manifest";

export const multiRegionDeploymentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "multi-region-deployment",
  version: 1,
  title: "Multi-Region Deployment Patterns",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["multi-region", "global", "latency", "data-residency", "active-active"],
  description:
    "Evaluate multi-region deployment strategies, traffic routing policies, and data synchronization trade-offs to serve a globally distributed user base with low latency and regulatory compliance.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Distinguish active-active, active-passive, and follow-the-sun multi-region models",
    "Select appropriate global traffic routing policies (latency, geolocation, weighted) for a given requirement",
    "Identify data residency and sovereignty constraints that shape region selection",
    "Evaluate the consistency trade-offs of cross-region database replication",
  ],
  sortOrder: 402,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "mr-traffic-routing",
      title: "Choosing a Global Traffic Routing Policy",
      context:
        "Your SaaS platform has users in North America, Europe, and Asia-Pacific. You have deployed identical application stacks in three regions. Users in each geography report high latency when their DNS resolves to a distant region during failovers. You need to configure a global routing policy that minimizes latency under normal operation and fails over automatically when a region is unhealthy.",
      displayFields: [
        { label: "Regions", value: "us-east-1, eu-west-1, ap-southeast-1", emphasis: "normal" },
        { label: "User Distribution", value: "40% NA / 35% EU / 25% APAC", emphasis: "normal" },
        { label: "P99 Latency Target", value: "< 200ms", emphasis: "warn" },
        { label: "Failover Requirement", value: "Automatic, < 60 seconds", emphasis: "warn" },
      ],
      actions: [
        { id: "latency-routing", label: "Latency-based routing with health checks on all three origins", color: "green" },
        { id: "geo-routing", label: "Geolocation routing that hard-pins each country to a specific region", color: "yellow" },
        { id: "weighted-routing", label: "Weighted routing distributing 33% to each region regardless of user location", color: "orange" },
        { id: "dns-ttl", label: "Single-region DNS with a very low TTL for fast manual failover", color: "red" },
      ],
      correctActionId: "latency-routing",
      rationales: [
        { id: "r-latency", text: "Latency-based routing continuously measures round-trip time and routes each user to the fastest available region, satisfying the 200ms target. Combined with health checks, unhealthy regions are automatically excluded within the health-check interval." },
        { id: "r-geo", text: "Geolocation routing hard-pins users to a region and cannot automatically reroute to a healthy region in a different geography when the pinned region fails, violating the 60-second failover requirement." },
        { id: "r-weighted", text: "Weighted routing ignores user location, so APAC users might be routed to us-east-1. It does not minimize latency and will distribute a percentage of traffic to a failed region until weights are manually adjusted." },
        { id: "r-single", text: "A single origin with low TTL still forces all users through one region until DNS is manually updated, which cannot guarantee sub-60-second automated failover and does not address the latency requirement." },
      ],
      correctRationaleId: "r-latency",
      feedback: {
        perfect: "Correct. Latency-based routing with health checks is the canonical solution: it minimizes latency dynamically and provides automatic failover.",
        partial: "Your routing policy handles either latency or failover, but not both simultaneously. Consider which policy type responds to real-time network conditions.",
        wrong: "This routing policy either pins users to a region regardless of health, or ignores latency entirely. Review what each policy type optimizes for.",
      },
    },
    {
      type: "action-rationale",
      id: "mr-data-residency",
      title: "Data Residency Constraint in Region Selection",
      context:
        "You are deploying a healthcare analytics platform for a German enterprise customer. GDPR and Germany's national health data regulations require that patient-identifiable data never leave the EU. Your current architecture replicates all data globally for performance. You must redesign the data layer for this customer.",
      displayFields: [
        { label: "Regulation", value: "GDPR + German BDSG", emphasis: "critical" },
        { label: "Data Classification", value: "Patient-identifiable health records", emphasis: "critical" },
        { label: "Current Replication", value: "Global (3 regions incl. US, APAC)", emphasis: "warn" },
        { label: "Performance Req.", value: "< 100ms reads for EU users", emphasis: "normal" },
      ],
      actions: [
        { id: "eu-only-partition", label: "Partition patient data to EU-only regions; replicate only anonymized analytics globally", color: "green" },
        { id: "encrypt-global", label: "Encrypt patient data with a customer-managed key before global replication", color: "yellow" },
        { id: "us-primary-vault", label: "Keep data in a US primary with an EU read replica for low latency", color: "red" },
        { id: "contractual-only", label: "Rely on data processing agreements with non-EU cloud providers to satisfy GDPR", color: "orange" },
      ],
      correctActionId: "eu-only-partition",
      rationales: [
        { id: "r-partition", text: "Data partitioning keeps identifiable records within EU-jurisdiction regions at rest and in transit, directly satisfying GDPR data residency requirements while still allowing global replication of anonymized aggregates for analytics performance." },
        { id: "r-encrypt", text: "Encrypting before replication reduces exposure risk but the data still physically crosses to non-EU jurisdictions. Regulators generally interpret GDPR data residency as requiring physical location of data, not just encryption status." },
        { id: "r-us-primary", text: "Storing the primary in the US violates GDPR Article 44 restrictions on international transfers of health data. The EU replica would contain a copy of personal data, which constitutes a transfer." },
        { id: "r-contractual", text: "Data Processing Agreements cover processor obligations but cannot override the requirement that health data for German residents remain within the EU. Schrems II decisions have narrowed contractual exemptions significantly." },
      ],
      correctRationaleId: "r-partition",
      feedback: {
        perfect: "Correct. Data partitioning by classification tier is the industry-standard pattern for meeting data residency requirements without sacrificing global performance for non-regulated data.",
        partial: "You identified a data protection measure but the patient data may still physically reside outside EU jurisdiction, which GDPR regulators treat as a violation regardless of security controls.",
        wrong: "This approach does not prevent patient-identifiable data from residing outside EU jurisdiction. Review the difference between data security and data residency requirements.",
      },
    },
    {
      type: "action-rationale",
      id: "mr-consistency-tradeoff",
      title: "Cross-Region Write Consistency Decision",
      context:
        "Your global e-commerce platform allows customers to place orders from any region. The order service writes to a multi-region database. You are evaluating whether to use synchronous multi-region writes (strong consistency) or asynchronous replication (eventual consistency). A 5% increase in write latency will reduce checkout conversions by 2% based on A/B tests.",
      displayFields: [
        { label: "Write Latency (sync)", value: "+85ms cross-region round-trip", emphasis: "warn" },
        { label: "Conversion Impact", value: "-2% per 5% latency increase", emphasis: "critical" },
        { label: "Conflict Scenario", value: "Dual-region inventory over-sell risk", emphasis: "warn" },
        { label: "Annual Revenue", value: "$18M", emphasis: "normal" },
      ],
      actions: [
        { id: "regional-primary", label: "Route each user's writes to their nearest region's primary shard; use async replication between regions", color: "green" },
        { id: "sync-global", label: "Require synchronous two-phase commit across all regions for every order write", color: "red" },
        { id: "eventual-all", label: "Use eventual consistency globally and accept occasional inventory over-sells as a business risk", color: "yellow" },
        { id: "saga-pattern", label: "Implement a distributed saga with compensating transactions for cross-region inventory checks", color: "blue" },
      ],
      correctActionId: "regional-primary",
      rationales: [
        { id: "r-regional-primary", text: "Regional sharding confines write latency to the local region while async replication propagates state globally. Inventory conflicts between regions are rare and can be handled by a lightweight read-before-write reservation at checkout, avoiding both latency and over-sell risk." },
        { id: "r-sync-global", text: "Synchronous two-phase commit across regions adds 85ms+ to every checkout, which the A/B data indicates costs approximately 3–4% of conversions — translating to $540k–720k annual revenue loss. The consistency guarantee is bought at too high a cost." },
        { id: "r-eventual-all", text: "Pure eventual consistency eliminates write latency but inventory over-sells in peak global sales events (flash sales, Black Friday) generate customer service costs, refunds, and reputational damage that outweigh write latency gains." },
        { id: "r-saga", text: "Sagas handle long-running distributed transactions well but add significant implementation complexity and compensating-transaction latency for what is a relatively simple write pattern. Regional sharding achieves the same outcome more simply." },
      ],
      correctRationaleId: "r-regional-primary",
      feedback: {
        perfect: "Correct. Regional primary sharding with async cross-region replication optimizes the write path for latency while keeping consistency issues manageable with simple inventory reservation logic.",
        partial: "Your approach manages one of the two constraints (latency or consistency) but creates an unacceptable trade-off on the other dimension given the revenue data provided.",
        wrong: "Review the latency-conversion data and the cross-region inventory risk together — the correct answer balances both concerns rather than optimizing for only one.",
      },
    },
  ],
  hints: [
    "Latency-based routing responds to real-time network conditions; geolocation routing is static — know when you need each.",
    "GDPR data residency is about where data physically lives, not just who can read it. Encryption does not substitute for physical location control.",
    "Synchronous cross-region writes add one full network round-trip to every write — measure that latency against your conversion data before committing.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Global platform architects must balance latency, consistency, and regulatory constraints simultaneously. Companies expanding into EU markets consistently underestimate data residency complexity — architects who can articulate GDPR implications for a given data flow are highly valued during international expansion projects.",
  toolRelevance: [
    "AWS Route 53",
    "Azure Traffic Manager",
    "Google Cloud DNS",
    "Cloudflare Load Balancing",
    "AWS Global Accelerator",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
