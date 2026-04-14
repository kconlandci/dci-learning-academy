import type { LabManifest } from "../../types/manifest";

export const microservicesDecompositionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "microservices-decomposition",
  version: 1,
  title: "Microservices Decomposition",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["microservices", "decomposition", "domain-driven-design", "bounded-context", "monolith"],
  description:
    "Investigate a monolithic application's domain structure and operational metrics, then decide which decomposition strategy will best meet scale, team autonomy, and deployment velocity goals.",
  estimatedMinutes: 22,
  learningObjectives: [
    "Apply domain-driven design principles to identify bounded contexts",
    "Distinguish the strangler fig, parallel run, and big bang decomposition strategies",
    "Identify when a monolith-first approach is preferable to immediate microservices",
    "Evaluate shared-database anti-patterns and their impact on service independence",
  ],
  sortOrder: 403,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "md-strangler-decision",
      title: "Decomposing a Retail Monolith",
      objective:
        "A retail platform's monolithic application is experiencing deployment bottlenecks and scale issues. Investigate the application's domain structure, team topology, and operational data, then decide on the safest decomposition approach.",
      investigationData: [
        {
          id: "inv-domain-map",
          label: "Domain Model Overview",
          content:
            "The application contains: Product Catalog (read-heavy, 95% reads), Order Management (transactional, strong consistency), Inventory (write-heavy, real-time accuracy critical), User Accounts (moderate traffic), Recommendations Engine (compute-intensive, eventual consistency OK). All domains share a single PostgreSQL database with 340 tables.",
          isCritical: true,
        },
        {
          id: "inv-team-structure",
          label: "Team Structure",
          content:
            "4 development squads of 6 engineers each. Each squad owns a product area but all deploy via a single shared release pipeline. Average time from code-complete to production: 11 days. Squads block each other on database migrations 3–4 times per month.",
          isCritical: true,
        },
        {
          id: "inv-traffic-metrics",
          label: "Traffic & Scaling Metrics",
          content:
            "Product Catalog: 8,000 req/s at peak. Order Management: 200 req/s. Inventory: 1,200 write/s. Recommendations: 2 batch jobs daily, each 4 hours. The entire monolith must be vertically scaled to handle Catalog load, which is cost-inefficient for other modules.",
          isCritical: false,
        },
        {
          id: "inv-db-coupling",
          label: "Database Coupling Analysis",
          content:
            "Cross-domain joins exist in 47 stored procedures. Inventory and Order tables are joined in 12 critical transaction flows. Product and Recommendation tables share 3 tables. No service layer exists — business logic lives in stored procedures and the application layer mixes domains freely.",
          isCritical: true,
        },
        {
          id: "inv-incident-history",
          label: "Incident History (last 90 days)",
          content:
            "14 production incidents. 9 caused by deployment pipeline conflicts between squads. 3 caused by database migration regressions. 2 caused by scaling events where one module exhausted shared connection pool. MTTR: 47 minutes average.",
        },
      ],
      actions: [
        { id: "strangler-catalog", label: "Strangle the Product Catalog first — extract it as a standalone read service behind an API facade", color: "green" },
        { id: "big-bang", label: "Decompose all five domains simultaneously into microservices over a 6-month project", color: "red" },
        { id: "db-first", label: "Split the shared database first by domain schema, then extract services incrementally", color: "blue" },
        { id: "stay-monolith", label: "Remain monolithic but modularize the codebase and add horizontal read replicas", color: "yellow" },
      ],
      correctActionId: "strangler-catalog",
      rationales: [
        { id: "r-strangler", text: "The Catalog is read-heavy, has no outbound cross-domain writes, and carries the disproportionate scaling cost. Extracting it first delivers immediate scale savings, proves the decomposition pattern, and reduces monolith load without touching the complex transactional core (Orders/Inventory)." },
        { id: "r-big-bang", text: "Simultaneous decomposition of five tightly coupled domains sharing 340 tables and 47 cross-domain stored procedures carries extreme coordination risk. Big bang rewrites have a high failure rate; the strangler fig is specifically designed for this situation." },
        { id: "r-db-first", text: "Database-first decomposition is intellectually sound but breaks all 47 stored procedures and 12 critical transaction flows immediately, requiring months of refactoring before a single service can be deployed independently. It inverts the risk/reward profile." },
        { id: "r-monolith", text: "Modularization reduces internal coupling but does not resolve the deployment pipeline bottleneck that causes 9 of 14 incidents per quarter, nor does it eliminate the connection pool exhaustion issue from mixed scaling needs." },
      ],
      correctRationaleId: "r-strangler",
      feedback: {
        perfect: "Correct. Starting with the highest-traffic, lowest-coupling domain (Product Catalog) is the textbook strangler fig opening move — maximum impact with minimum risk to the transactional core.",
        partial: "Your strategy will improve some aspects of the system but either introduces significant transition risk or doesn't address the primary bottlenecks identified in the investigation data.",
        wrong: "Revisit the domain coupling analysis and incident history. The correct first step should be low-risk, high-impact, and avoid touching the complex transactional flows until the pattern is proven.",
      },
    },
    {
      type: "investigate-decide",
      id: "md-service-boundary",
      title: "Defining the Right Service Boundary",
      objective:
        "Two engineering teams are debating whether Inventory and Warehouse Management should be one service or two. Investigate the domain interactions, data ownership patterns, and operational requirements to decide the correct service boundary.",
      investigationData: [
        {
          id: "inv-domain-interaction",
          label: "Domain Interaction Map",
          content:
            "Inventory tracks stock levels by SKU across all fulfillment centers. Warehouse Management handles physical bin locations, pick-pack-ship workflows, and dock scheduling. Every inventory deduction triggers a warehouse pick task. Inventory reads warehouse capacity to determine stock placement strategy.",
          isCritical: true,
        },
        {
          id: "inv-change-freq",
          label: "Change Frequency Analysis",
          content:
            "Inventory: 2–3 deployments per week (SKU logic, pricing integrations). Warehouse Management: 1 deployment per month (physical process changes, 3PL integrations). Change causes for each domain are completely independent — no shared change drivers in the past 12 months.",
          isCritical: true,
        },
        {
          id: "inv-team-ownership",
          label: "Team Ownership",
          content:
            "Inventory is owned by the Commerce team (12 engineers, fast-moving). Warehouse Management is owned by the Operations team (4 engineers, stability-focused). Teams have different on-call rotations, SLAs, and tech stacks (Java vs. Python).",
          isCritical: false,
        },
        {
          id: "inv-data-model",
          label: "Data Model Analysis",
          content:
            "Inventory data: stock_level, reserved_qty, reorder_threshold by SKU. Warehouse data: bin_location, task_queue, dock_schedule, 3PL_manifest. Data overlap: fulfillment_center_id is a foreign key in both models but the two schemas are otherwise fully independent.",
        },
      ],
      actions: [
        { id: "separate-services", label: "Define Inventory and Warehouse Management as separate bounded contexts with async event-driven integration", color: "green" },
        { id: "one-service", label: "Keep them as one combined Fulfillment service with a shared database and internal module separation", color: "yellow" },
        { id: "inventory-sub", label: "Make Warehouse Management a sub-module of Inventory, owned by the Commerce team", color: "red" },
        { id: "shared-lib", label: "Extract a shared library for the overlapping fulfillment_center_id logic and let each team reference it", color: "orange" },
      ],
      correctActionId: "separate-services",
      rationales: [
        { id: "r-separate", text: "Different change frequencies, different teams, different tech stacks, and non-overlapping data models are the canonical signals for separate bounded contexts. Async events (e.g., InventoryDeducted → PickTaskCreated) decouple deployment cadences without losing the business interaction." },
        { id: "r-one", text: "Combining them in one service couples a fast-moving 12-person team with a slow-moving 4-person team. Every Inventory deployment risks destabilizing Warehouse Management and vice versa, exactly the problem microservices are meant to solve." },
        { id: "r-sub", text: "Making Warehouse Management a sub-module of the Commerce team ignores the Operations team's ownership, SLA, and tech stack. Org boundaries are a primary input to service boundaries in domain-driven design." },
        { id: "r-lib", text: "A shared library addresses data key consistency but does not solve the deployment coupling. Both services would still need to release together whenever the shared library changes, creating a distributed monolith." },
      ],
      correctRationaleId: "r-separate",
      feedback: {
        perfect: "Correct. Independent change rates and clear team ownership are the strongest signals for separate bounded contexts, with async events providing the necessary integration without coupling deployment schedules.",
        partial: "You identified some valid separation concerns but the proposed structure still creates deployment coupling or ignores team ownership boundaries.",
        wrong: "Consider the Conway's Law principle: service boundaries should reflect team boundaries. Review the change frequency and team ownership data in the investigation.",
      },
    },
    {
      type: "investigate-decide",
      id: "md-premature-decomposition",
      title: "Evaluating Whether to Decompose at All",
      objective:
        "A startup CTO wants to build the new payments feature as a separate microservice from day one. Investigate the team size, product maturity, and operational context to advise whether this is the right time to introduce service decomposition.",
      investigationData: [
        {
          id: "inv-team-size",
          label: "Team & Organizational Context",
          content:
            "Total engineering team: 6 developers including the CTO. Product has been live for 4 months. Tech stack: Node.js monolith deployed on a single VM. Zero dedicated DevOps — developers manage deployments manually. No service mesh, no container orchestration, no distributed tracing.",
          isCritical: true,
        },
        {
          id: "inv-product-maturity",
          label: "Product & Domain Maturity",
          content:
            "Domain model changes weekly as the team discovers what the market wants. Payments feature scope has changed 3 times in planning. The current monolith has been refactored twice in 4 months as understanding deepened. No stable API contracts exist yet.",
          isCritical: true,
        },
        {
          id: "inv-scale",
          label: "Current Scale Requirements",
          content:
            "Daily active users: 1,200. Peak requests: 45 req/s. The existing single-VM monolith uses 12% CPU and 18% memory at peak. No scaling constraints have been reached. Expected growth: 10x in 12 months if product-market fit is confirmed.",
          isCritical: false,
        },
        {
          id: "inv-cto-reasoning",
          label: "CTO's Stated Rationale",
          content:
            "CTO argues: 'Payments data must be isolated for PCI-DSS compliance. We'll need to scale independently later. It's easier to start right than to refactor later. Microservices will let the team move faster.'",
        },
      ],
      actions: [
        { id: "monolith-first", label: "Build payments as a well-isolated module in the existing monolith; defer service extraction until scale or team growth demands it", color: "green" },
        { id: "microservice-now", label: "Proceed with a separate payments microservice deployed independently from day one", color: "yellow" },
        { id: "modular-monolith", label: "Refactor the entire monolith into a modular monolith with strict package boundaries, then plan extraction in 6 months", color: "blue" },
        { id: "serverless-fn", label: "Implement payments as a serverless function to avoid operational overhead of a full service", color: "orange" },
      ],
      correctActionId: "monolith-first",
      rationales: [
        { id: "r-mono", text: "With 6 engineers, no DevOps infrastructure, a rapidly changing domain model, and no scale pressure, microservices overhead (distributed tracing, inter-service auth, network latency, contract management) outweighs the benefits. PCI-DSS isolation can be achieved within a well-bounded module without a separate deployment unit." },
        { id: "r-micro", text: "Premature decomposition with an unstable domain model creates distributed coupling — when the payment scope changes (as it has 3 times already), changes must coordinate across service boundaries. For 6 engineers, this overhead is significant." },
        { id: "r-modular", text: "A full modular monolith refactor is a large investment when the domain itself is still in flux. Waiting until the domain model stabilizes before investing in strict module boundaries is more efficient." },
        { id: "r-serverless", text: "Serverless solves operational overhead for stateless functions but payments typically involve stateful flows (retries, idempotency, webhook handling) that are awkward to manage across cold-start-sensitive functions without significant orchestration." },
      ],
      correctRationaleId: "r-mono",
      feedback: {
        perfect: "Correct. The combination of small team size, immature domain model, and absence of operational infrastructure makes this a textbook 'monolith first' situation.",
        partial: "You've correctly identified some risks but the approach still introduces more complexity than is justified by the current scale and team size.",
        wrong: "Review the team size, domain stability, and infrastructure readiness data. Martin Fowler's 'monolith first' principle applies directly to this scenario.",
      },
    },
  ],
  hints: [
    "The strangler fig pattern extracts one capability at a time behind an API facade — start with the least-coupled, highest-impact domain.",
    "Different team ownership and different change rates are the two strongest signals that a bounded context boundary is correct.",
    "Microservices trade deployment flexibility for distributed systems complexity — that trade only pays off above a certain team and scale threshold.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Senior architects are regularly asked to evaluate decomposition proposals and push back on premature complexity. Being able to articulate why a monolith-first approach is correct for a given team size and domain maturity — rather than defaulting to microservices — demonstrates architectural judgment that separates senior from principal-level engineers.",
  toolRelevance: [
    "Domain-Driven Design (Eric Evans)",
    "AWS App Mesh",
    "Istio Service Mesh",
    "Spring Boot",
    "OpenAPI Specification",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
