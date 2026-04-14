import type { LabManifest } from "../../types/manifest";

export const haArchitectureDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ha-architecture-design",
  version: 1,
  title: "High Availability Architecture",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["architecture", "high-availability", "resilience", "fault-tolerance"],
  description:
    "Design and evaluate high-availability architectures by choosing the right redundancy patterns, failover strategies, and load balancing approaches for real-world production workloads.",
  estimatedMinutes: 20,
  learningObjectives: [
    "Identify single points of failure in a given architecture",
    "Select appropriate redundancy patterns for stateful and stateless services",
    "Evaluate trade-offs between active-active and active-passive failover",
    "Apply health-check and circuit-breaker patterns to prevent cascading failures",
  ],
  sortOrder: 400,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "ha-spof-database",
      title: "Eliminating a Database Single Point of Failure",
      context:
        "Your e-commerce platform runs a single primary relational database instance handling all reads and writes. During a recent maintenance window the instance became unavailable for 45 minutes, costing significant revenue. Leadership demands 99.9% uptime. You must redesign the data tier.",
      displayFields: [
        { label: "Current Uptime", value: "98.7%", emphasis: "warn" },
        { label: "Downtime Cost", value: "$4,200/hr", emphasis: "critical" },
        { label: "Read/Write Ratio", value: "80% reads / 20% writes", emphasis: "normal" },
        { label: "Data Consistency Req.", value: "Strong consistency required", emphasis: "warn" },
      ],
      actions: [
        { id: "read-replicas", label: "Add read replicas with automatic failover to a standby primary", color: "green" },
        { id: "cache-only", label: "Place a caching layer in front of the single database instance", color: "yellow" },
        { id: "sharding", label: "Shard the database horizontally across three independent nodes", color: "blue" },
        { id: "eventual", label: "Switch to an eventually consistent NoSQL store to remove the bottleneck", color: "orange" },
      ],
      correctActionId: "read-replicas",
      rationales: [
        { id: "r-replicas", text: "Read replicas absorb the 80% read load while the standby primary enables sub-minute automated failover, meeting the 99.9% SLA without changing consistency guarantees." },
        { id: "r-cache", text: "Caching reduces load but does not eliminate the SPOF. A cache miss still routes to the single database, and a database failure still causes an outage." },
        { id: "r-sharding", text: "Sharding improves throughput and partially limits blast radius, but coordinating cross-shard transactions adds complexity and does not directly address failover for a given shard." },
        { id: "r-nosql", text: "Switching consistency models is a significant architectural change that may violate the strong-consistency requirement and introduces migration risk without directly solving the HA problem." },
      ],
      correctRationaleId: "r-replicas",
      feedback: {
        perfect: "Correct. Standby replicas with automated failover directly addresses the SPOF while preserving the consistency model the application relies on.",
        partial: "You identified a redundancy strategy, but it does not fully address automatic failover within the required SLA window.",
        wrong: "This approach does not eliminate the single point of failure. The primary database remains a critical dependency.",
      },
    },
    {
      type: "action-rationale",
      id: "ha-load-balancer-placement",
      title: "Load Balancer Tier Redundancy",
      context:
        "Your three-tier web application uses a single hardware load balancer in front of eight application servers. The load balancer vendor's SLA is 99.5%. Your overall application SLA target is 99.95%. The load balancer itself has become the reliability bottleneck.",
      displayFields: [
        { label: "Load Balancer SLA", value: "99.5%", emphasis: "critical" },
        { label: "App Server Count", value: "8 instances", emphasis: "normal" },
        { label: "Target App SLA", value: "99.95%", emphasis: "warn" },
        { label: "Traffic Pattern", value: "Stateless HTTP/HTTPS", emphasis: "normal" },
      ],
      actions: [
        { id: "active-active-lb", label: "Deploy two load balancers in active-active mode behind an anycast IP with health checks", color: "green" },
        { id: "upgrade-lb", label: "Upgrade to a higher-tier load balancer with a better vendor SLA", color: "yellow" },
        { id: "dns-only", label: "Use DNS round-robin across application servers and remove the load balancer entirely", color: "orange" },
        { id: "active-passive-lb", label: "Add a cold-standby load balancer that requires manual promotion", color: "blue" },
      ],
      correctActionId: "active-active-lb",
      rationales: [
        { id: "r-aa-lb", text: "Active-active load balancers share traffic continuously and can absorb a failure of one node instantly without any manual intervention, pushing availability above 99.95%." },
        { id: "r-upgrade", text: "Even an upgraded vendor SLA may not reach 99.95%, and it still represents a single physical failure domain. Redundancy, not better hardware, is the right lever." },
        { id: "r-dns", text: "DNS round-robin has no health awareness and propagation delays mean failed servers continue receiving traffic for minutes. This reduces, not improves, availability." },
        { id: "r-ap-lb", text: "Cold-standby with manual promotion cannot achieve 99.95% because human response time makes the failover window too wide and introduces operator error risk." },
      ],
      correctRationaleId: "r-aa-lb",
      feedback: {
        perfect: "Correct. Active-active load balancers eliminate the SPOF and provide instantaneous failover, satisfying the 99.95% SLA target.",
        partial: "You selected a redundancy approach but it still relies on manual intervention or a single vendor SLA, which cannot reliably meet 99.95%.",
        wrong: "This choice does not eliminate the load balancer as a single point of failure or cannot reliably achieve the 99.95% target.",
      },
    },
    {
      type: "action-rationale",
      id: "ha-stateful-sessions",
      title: "Stateful Session Management Under Horizontal Scaling",
      context:
        "Your authentication service stores user session tokens in application server memory. You need to scale from 2 to 10 servers to handle load, but sticky sessions are causing uneven distribution — one server handles 60% of traffic. A server restart invalidates all sessions on that node.",
      displayFields: [
        { label: "Session Duration", value: "8 hours (average)", emphasis: "normal" },
        { label: "Active Sessions", value: "~50,000 concurrent", emphasis: "warn" },
        { label: "Hot Server Load", value: "60% of requests", emphasis: "critical" },
        { label: "Restart Impact", value: "All sticky sessions lost", emphasis: "critical" },
      ],
      actions: [
        { id: "external-session", label: "Move sessions to a distributed in-memory store shared by all app servers", color: "green" },
        { id: "more-sticky", label: "Increase sticky session timeout and add more servers to the sticky group", color: "red" },
        { id: "jwt-stateless", label: "Replace server-side sessions with signed stateless tokens validated at each request", color: "blue" },
        { id: "db-sessions", label: "Write sessions to the primary relational database on every request", color: "yellow" },
      ],
      correctActionId: "external-session",
      rationales: [
        { id: "r-ext-sess", text: "A distributed in-memory store decouples session state from any individual server, enabling true load balancing and surviving single-node restarts without session loss." },
        { id: "r-sticky", text: "More sticky sessions deepen the uneven distribution problem and do not solve the session-loss-on-restart failure mode. This makes the hot-server problem worse." },
        { id: "r-jwt", text: "JWT can work but shifts revocation complexity to the client and cannot easily invalidate individual sessions server-side, which is a security concern for an auth service." },
        { id: "r-db-sess", text: "Writing sessions to a relational database on every request creates high-frequency synchronous writes that will bottleneck the database under 50,000 concurrent sessions." },
      ],
      correctRationaleId: "r-ext-sess",
      feedback: {
        perfect: "Correct. Externalizing sessions to a distributed in-memory store is the standard HA pattern for stateful web applications at scale.",
        partial: "Your choice moves some state out of the app server but introduces other availability or performance trade-offs that undermine the HA goal.",
        wrong: "This approach keeps session state tied to individual application servers or introduces a new bottleneck, which prevents true high availability.",
      },
    },
  ],
  hints: [
    "Think about where state lives — stateless components are much easier to make highly available than stateful ones.",
    "Availability math multiplies: a 99.5% LB in front of a 99.9% app tier yields only ~99.4% combined availability.",
    "Active-active always outperforms active-passive for RTO; consider which failure modes each pattern actually covers.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Solutions architects and site reliability engineers are routinely asked to calculate availability budgets and justify redundancy spend in design reviews. Knowing the math behind nines — and which failure domains each pattern covers — is a core differentiator in senior cloud roles.",
  toolRelevance: [
    "AWS Well-Architected Framework",
    "Azure Architecture Center",
    "Google Cloud Architecture Framework",
    "NGINX Plus",
    "HAProxy",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
