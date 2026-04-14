import type { LabManifest } from "../../types/manifest";

export const awsElasticacheConfigLab: LabManifest = {
  schemaVersion: "1.1",
  id: "aws-elasticache-config",
  version: 1,
  title: "AWS ElastiCache Configuration",
  tier: "intermediate",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "elasticache", "redis", "memcached", "caching", "in-memory"],
  description:
    "Choose the right ElastiCache engine, configure cluster mode, and set eviction policies to maximize cache hit rates while controlling memory usage and operational complexity.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Compare Redis and Memcached for different caching use cases",
    "Configure ElastiCache cluster mode for horizontal scaling",
    "Select appropriate eviction policies based on access patterns",
    "Design cache architectures that balance performance and resilience",
  ],
  sortOrder: 114,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "elasticache-s1",
      title: "Choosing Between Redis and Memcached for Session Storage",
      context:
        "Your team is migrating session storage from sticky sessions on EC2 to a centralized cache. The application is a multi-tier e-commerce platform with 50,000 concurrent users. Sessions contain shopping cart data, must persist across deployments, and need to survive node failures. Average session size is 8 KB with a 30-minute TTL.",
      displayFields: [
        { label: "Use Case", value: "Centralized session storage for e-commerce", emphasis: "normal" },
        { label: "Concurrent Users", value: "50,000", emphasis: "normal" },
        { label: "Session Size", value: "8 KB average", emphasis: "normal" },
        { label: "Durability Requirement", value: "Sessions must survive node failures", emphasis: "critical" },
        { label: "Data Structure", value: "Key-value with nested cart items (hashes)", emphasis: "warn" },
      ],
      actions: [
        { id: "redis-cluster-mode", label: "Deploy Redis with cluster mode enabled and Multi-AZ failover", color: "green" },
        { id: "memcached-multi-node", label: "Deploy Memcached with 3 nodes for horizontal scaling", color: "orange" },
        { id: "redis-single-node", label: "Deploy a single Redis node with no replication", color: "red" },
        { id: "memcached-single-large", label: "Deploy a single large Memcached node with enough memory for all sessions", color: "red" },
      ],
      correctActionId: "redis-cluster-mode",
      rationales: [
        { id: "r-redis-cluster", text: "Redis with cluster mode and Multi-AZ provides automatic failover, data persistence via AOF/RDB snapshots, and native support for complex data structures like hashes for cart items. Cluster mode distributes keys across shards for horizontal scaling beyond a single node's memory." },
        { id: "r-memcached-no-persistence", text: "Memcached does not support persistence or replication. If a Memcached node fails, all sessions on that node are permanently lost. For session storage that must survive failures, Memcached is fundamentally unsuitable." },
        { id: "r-redis-single-spof", text: "A single Redis node without replication is a single point of failure. Node failure means all 50,000 users lose their sessions and shopping carts simultaneously, which is unacceptable for an e-commerce platform." },
        { id: "r-memcached-single-worst", text: "A single Memcached node has no persistence, no replication, and no failover. This is the worst option for session durability — combining all the drawbacks of Memcached with a single point of failure." },
      ],
      correctRationaleId: "r-redis-cluster",
      feedback: {
        perfect: "Correct. Redis cluster mode with Multi-AZ failover provides the persistence, replication, and data structure support needed for durable session storage at scale.",
        partial: "Memcached offers simplicity and multithreaded performance but lacks persistence and replication. For sessions that must survive node failures, Redis is the only viable ElastiCache option.",
        wrong: "Any single-node deployment without replication is a single point of failure. And Memcached cannot persist data — a node restart or failure means total session loss.",
      },
    },
    {
      type: "action-rationale",
      id: "elasticache-s2",
      title: "Cluster Mode Configuration for Growing Dataset",
      context:
        "Your Redis ElastiCache cluster stores product catalog cache data that has grown to 45 GB. The current cluster uses a single shard with one primary and two read replicas (r6g.2xlarge, 52 GB memory each). Memory utilization is at 87% and growing 3 GB/month. Read throughput is fine, but write throughput is bottlenecked on the single primary node during catalog imports.",
      displayFields: [
        { label: "Current Data Size", value: "45 GB (growing 3 GB/month)", emphasis: "warn" },
        { label: "Node Type", value: "r6g.2xlarge (52 GB memory)", emphasis: "normal" },
        { label: "Memory Utilization", value: "87% on primary", emphasis: "critical" },
        { label: "Bottleneck", value: "Write throughput on single primary during imports", emphasis: "critical" },
        { label: "Read Performance", value: "Adequate via read replicas", emphasis: "normal" },
      ],
      actions: [
        { id: "enable-cluster-mode", label: "Migrate to cluster mode enabled with 3 shards, distributing data across 3 primary nodes", color: "green" },
        { id: "vertical-scale", label: "Upgrade to r6g.4xlarge nodes (105 GB memory) to buy more headroom", color: "yellow" },
        { id: "add-read-replicas", label: "Add more read replicas to the existing shard", color: "orange" },
        { id: "evict-aggressively", label: "Set a volatile-lru eviction policy with shorter TTLs to reduce memory usage", color: "red" },
      ],
      correctActionId: "enable-cluster-mode",
      rationales: [
        { id: "r-cluster-mode-sharding", text: "Cluster mode enabled distributes keys across multiple shards, each with its own primary node. This solves both problems: memory capacity scales horizontally (3 shards x 52 GB = 156 GB available), and write throughput is distributed across 3 primaries instead of bottlenecking on one." },
        { id: "r-vertical-scale-temporary", text: "Upgrading to r6g.4xlarge doubles memory but does not solve the write bottleneck — there is still only one primary node handling all writes. This buys roughly 20 months of growth but eventually hits the same ceiling." },
        { id: "r-read-replicas-wrong-problem", text: "Read replicas only help with read throughput, which is already adequate. The bottleneck is write throughput on the primary, and replicas do nothing to alleviate primary node write pressure." },
        { id: "r-eviction-data-loss", text: "Aggressively evicting product catalog data reduces cache hit rates, forcing more database queries and degrading application performance. Eviction is a last resort for memory pressure, not a substitute for proper capacity planning." },
      ],
      correctRationaleId: "r-cluster-mode-sharding",
      feedback: {
        perfect: "Correct. Cluster mode enabled with multiple shards solves both the memory capacity ceiling and the write throughput bottleneck by distributing data and write operations across multiple primary nodes.",
        partial: "Vertical scaling buys time but does not fix the write throughput bottleneck. Cluster mode is the architectural solution for both problems.",
        wrong: "Adding read replicas does not help write throughput. Aggressive eviction degrades cache performance. The root cause is a single-shard architecture that cannot scale writes horizontally.",
      },
    },
    {
      type: "action-rationale",
      id: "elasticache-s3",
      title: "Eviction Policy Selection for Mixed Workload",
      context:
        "Your ElastiCache Redis instance serves two workloads: a real-time leaderboard (sorted sets, updated every second, always accessed) and a user preferences cache (strings, accessed sporadically, set with a 24-hour TTL). Memory is at 92% and you cannot add more nodes immediately. You need to configure an eviction policy that protects the leaderboard data while allowing less critical preference data to be evicted.",
      displayFields: [
        { label: "Workload 1", value: "Real-time leaderboard (sorted sets, no TTL, always hot)", emphasis: "critical" },
        { label: "Workload 2", value: "User preferences (strings, 24h TTL, sporadic access)", emphasis: "normal" },
        { label: "Memory Utilization", value: "92% — eviction imminent", emphasis: "critical" },
        { label: "Constraint", value: "Cannot add nodes in short term", emphasis: "warn" },
        { label: "Priority", value: "Leaderboard data must never be evicted", emphasis: "critical" },
      ],
      actions: [
        { id: "volatile-lru", label: "Set eviction policy to volatile-lru (evict least recently used keys that have a TTL set)", color: "green" },
        { id: "allkeys-lru", label: "Set eviction policy to allkeys-lru (evict any least recently used key)", color: "orange" },
        { id: "noeviction", label: "Set eviction policy to noeviction (return errors when memory is full)", color: "red" },
        { id: "allkeys-random", label: "Set eviction policy to allkeys-random (evict random keys regardless of TTL)", color: "red" },
      ],
      correctActionId: "volatile-lru",
      rationales: [
        { id: "r-volatile-lru-correct", text: "volatile-lru evicts only keys that have a TTL set, using LRU ordering. The leaderboard sorted sets have no TTL and will never be evicted. The user preference keys have a 24-hour TTL and will be evicted in LRU order when memory pressure hits — starting with the least recently accessed preferences." },
        { id: "r-allkeys-lru-risky", text: "allkeys-lru considers all keys for eviction regardless of TTL. The leaderboard sorted sets, despite being frequently accessed, could still be evicted during a burst of new preference keys if the LRU algorithm momentarily deprioritizes them. This does not guarantee leaderboard protection." },
        { id: "r-noeviction-crash", text: "noeviction returns OOM errors to the application when memory is full. With memory at 92% and growing, this will cause write failures for both the leaderboard updates and preference sets — effectively breaking the application rather than gracefully degrading." },
        { id: "r-allkeys-random-worst", text: "allkeys-random evicts keys at random with no intelligence. Critical leaderboard data has an equal chance of being evicted as stale preference data. This is the worst policy for a workload with clear priority differences." },
      ],
      correctRationaleId: "r-volatile-lru-correct",
      feedback: {
        perfect: "Correct. volatile-lru elegantly solves this by using TTL as a priority signal — keys without TTL (leaderboard) are protected, while keys with TTL (preferences) are evicted in LRU order under memory pressure.",
        partial: "allkeys-lru is reasonable for general caching but does not guarantee protection of the leaderboard data. The volatile- prefix policies use TTL presence as an implicit priority mechanism.",
        wrong: "noeviction causes application errors. allkeys-random has no intelligence about key importance. Both approaches fail to protect the critical leaderboard data.",
      },
    },
  ],
  hints: [
    "Redis supports persistence (AOF/RDB), replication, and complex data structures. Memcached is simpler but offers none of these — choose based on durability and data structure requirements.",
    "Cluster mode enabled distributes data across multiple shards, each with its own primary. This scales both memory capacity and write throughput horizontally.",
    "Eviction policies with the 'volatile-' prefix only evict keys that have a TTL set. Keys without a TTL are never evicted, making TTL presence an implicit priority mechanism.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "ElastiCache is a critical component in high-traffic architectures. Engineers who understand when to use Redis vs Memcached, how cluster mode sharding works, and how eviction policies interact with mixed workloads can design caching layers that dramatically reduce database load and improve application latency.",
  toolRelevance: ["AWS ElastiCache Console", "Redis CLI", "CloudWatch Metrics", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
