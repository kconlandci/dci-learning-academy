import type { LabManifest } from "../../types/manifest";

export const apiVersioningStrategyLab: LabManifest = {
  schemaVersion: "1.1",
  id: "api-versioning-strategy",
  version: 1,
  title: "API Versioning and Deprecation Strategy",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["architecture", "api-design", "versioning", "backward-compatibility", "deprecation", "rest-api", "api-gateway"],
  description:
    "Design API versioning strategies that balance backward compatibility with the ability to evolve. Practice choosing between URL path, header, and query parameter versioning, managing breaking vs. non-breaking changes, and implementing deprecation workflows that protect existing consumers.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Distinguish between breaking and non-breaking API changes and their versioning implications",
    "Select the appropriate versioning strategy (URL path, header, query parameter) for a given context",
    "Design a deprecation timeline with sunset headers, migration guides, and usage monitoring",
    "Implement backward-compatible schema evolution without forcing consumer upgrades",
  ],
  sortOrder: 415,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "api-s1-breaking-change",
      title: "Handling a Breaking Response Schema Change",
      context:
        "Your team needs to restructure the /api/v1/orders response. The current response returns a flat object with `shipping_address` as a string. The new design nests it as an object with `street`, `city`, `state`, and `zip` fields. 340 external API consumers depend on the current response format. The product team wants the change deployed within 2 weeks.",
      displayFields: [
        { label: "Change Type", value: "Breaking — response field type changed from string to object", emphasis: "critical" },
        { label: "Consumers", value: "340 external API integrations", emphasis: "warn" },
        { label: "Current Field", value: "shipping_address: \"123 Main St, City, ST 12345\"", emphasis: "normal" },
        { label: "New Field", value: "shipping_address: { street, city, state, zip }", emphasis: "normal" },
        { label: "Timeline", value: "Product wants deployment in 2 weeks", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Deploy the change to /api/v1/orders and notify consumers to update their integrations", color: "red" },
        { id: "a2", label: "Release /api/v2/orders with the new schema, keep v1 running with a 6-month deprecation timeline and Sunset header, monitor v1 usage to track migration", color: "green" },
        { id: "a3", label: "Add the nested object as a new field (shipping_address_structured) alongside the existing string field in v1", color: "yellow" },
        { id: "a4", label: "Use content negotiation (Accept header) to let consumers choose between the old and new format on the same endpoint", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Deploying a breaking change to v1 immediately breaks 340 integrations. External consumers need migration time — this violates the contract established by the versioned API." },
        { id: "r2", text: "A new major version (v2) introduces the breaking change cleanly. Running v1 in parallel with a Sunset header and deprecation timeline gives consumers 6 months to migrate while monitoring tracks adoption." },
        { id: "r3", text: "Adding a parallel field avoids breaking changes but creates a permanent dual-field response that is confusing and doubles maintenance. This works as a short-term bridge but not a long-term strategy." },
        { id: "r4", text: "Content negotiation via headers adds complexity for external consumers who may not support custom Accept types. URL-path versioning is more discoverable and cacheable for REST APIs with many consumers." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Breaking response schema changes require a new major version with a parallel deprecation period. The Sunset header and usage monitoring ensure a managed migration.",
        partial: "Adding a parallel field is a valid bridge strategy but doesn't address the long-term need for a clean schema. A new version with a deprecation timeline is the sustainable approach.",
        wrong: "Breaking 340 existing integrations without a migration period is unacceptable for a public API. Major schema changes require a new version with backward-compatible overlap.",
      },
    },
    {
      type: "action-rationale",
      id: "api-s2-additive-change",
      title: "Adding a New Optional Field to an Existing API",
      context:
        "The product team wants to add a `loyalty_points` field to the /api/v1/customers/{id} response. The field is optional and will be null for customers not enrolled in the loyalty program. The team is debating whether this requires a new API version (v2) or can be added to the existing v1 endpoint.",
      displayFields: [
        { label: "Change Type", value: "Additive — new optional field with null default", emphasis: "normal" },
        { label: "Field", value: "loyalty_points: number | null (null if not enrolled)", emphasis: "normal" },
        { label: "Existing Fields", value: "No fields removed or modified", emphasis: "normal" },
        { label: "Consumer Impact", value: "Well-behaved clients should ignore unknown fields", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Add the field directly to v1 — this is a non-breaking additive change that doesn't require a new version", color: "green" },
        { id: "a2", label: "Create /api/v2/customers/{id} with the new field to avoid any risk to existing consumers", color: "orange" },
        { id: "a3", label: "Add the field to a separate /api/v1/customers/{id}/loyalty endpoint", color: "yellow" },
        { id: "a4", label: "Return the field only if the consumer sends an opt-in header (X-Include-Loyalty: true)", color: "red" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Adding a new optional field with a null default is a non-breaking change by REST API convention. Well-designed clients using permissive deserialization ignore unknown fields. Bumping the major version for an additive change creates unnecessary version proliferation." },
        { id: "r2", text: "Creating v2 for an additive change is version inflation. If every new optional field triggers a major version, the API becomes unmanageable. Reserve major versions for breaking changes." },
        { id: "r3", text: "A separate loyalty endpoint fragments the customer resource model. An additional API call per customer for a single field is an N+1 anti-pattern." },
        { id: "r4", text: "Opt-in headers for optional fields add complexity to every consumer integration. The standard approach is to include all fields and let clients take what they need." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Additive, optional fields are non-breaking changes by REST convention. Adding them directly to the existing version avoids version proliferation while preserving backward compatibility.",
        partial: "You're being cautious, which is good, but a separate version or endpoint for an additive field creates unnecessary complexity. Reserve versioning for breaking changes.",
        wrong: "This approach over-engineers a simple additive change. Adding a new optional field to an existing version is standard REST API practice and is non-breaking by convention.",
      },
    },
    {
      type: "action-rationale",
      id: "api-s3-deprecation-enforcement",
      title: "Enforcing API Deprecation After Sunset Date",
      context:
        "API v1 was deprecated 8 months ago with a 6-month sunset period. The Sunset header has been present on every v1 response since deprecation. V2 has been available for 8 months. However, 12 consumers (out of the original 340) are still actively calling v1 endpoints with a combined 45,000 requests per day. The sunset date has passed by 2 months. Infrastructure costs for running both versions are significant.",
      displayFields: [
        { label: "V1 Status", value: "Sunset date passed 2 months ago", emphasis: "critical" },
        { label: "Remaining V1 Consumers", value: "12 consumers — 45,000 req/day", emphasis: "warn" },
        { label: "V2 Availability", value: "Available for 8 months", emphasis: "normal" },
        { label: "Infrastructure Cost", value: "Running both versions costs 1.8x single version", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Immediately shut down v1 since the sunset date has passed", color: "red" },
        { id: "a2", label: "Return HTTP 410 Gone for all v1 requests with a Location header pointing to v2 documentation", color: "yellow" },
        { id: "a3", label: "Begin returning HTTP 299 Deprecation warnings on v1 responses, contact remaining consumers directly, set a final hard cutoff 30 days out, then return 410 Gone after the cutoff", color: "green" },
        { id: "a4", label: "Keep v1 running indefinitely until all 12 consumers migrate on their own", color: "orange" },
      ],
      correctActionId: "a3",
      rationales: [
        { id: "r1", text: "Immediate shutdown without direct outreach risks breaking 12 active integrations handling 45,000 daily requests. Even though the sunset date passed, a grace period with direct communication is professional practice." },
        { id: "r2", text: "Returning 410 Gone immediately is better than silent shutdown but still disrupts active consumers without warning. A final 30-day notice with direct outreach balances urgency with responsible deprecation." },
        { id: "r3", text: "Direct consumer outreach combined with deprecation warnings (HTTP 299), a firm 30-day cutoff, and a final 410 Gone is the industry-standard deprecation enforcement pattern. It demonstrates responsible API stewardship while enforcing the migration deadline." },
        { id: "r4", text: "Running v1 indefinitely rewards non-migration and creates permanent dual-version maintenance cost. A firm deadline is necessary to complete the deprecation." },
      ],
      correctRationaleId: "r3",
      feedback: {
        perfect: "Correct. Responsible deprecation enforcement combines direct outreach, warning headers, a firm cutoff date, and eventual 410 Gone — balancing API stewardship with the need to retire old versions.",
        partial: "You're enforcing the deprecation but missing the direct outreach step. Contacting the remaining 12 consumers personally is essential for a professional deprecation process.",
        wrong: "This approach is either too abrupt or too passive. Effective deprecation enforcement requires a final warning period with direct outreach followed by a firm shutdown date.",
      },
    },
  ],
  hints: [
    "Breaking changes (removing fields, changing field types, renaming fields) require a new major version. Non-breaking changes (adding optional fields, adding new endpoints) can be made to the existing version.",
    "The HTTP Sunset header (RFC 8594) communicates the deprecation date to consumers in every response. Pair it with deprecation documentation and migration guides for a professional deprecation workflow.",
    "URL-path versioning (/api/v1/, /api/v2/) is the most common REST API versioning strategy because it is discoverable, cacheable, and requires no special header knowledge from consumers.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "API versioning and deprecation strategy is a core competency for backend engineers, API platform teams, and solutions architects. Organizations with public APIs (Stripe, Twilio, AWS) are especially rigorous about versioning discipline — demonstrating this skill set signals maturity and customer empathy in API design.",
  toolRelevance: ["Amazon API Gateway", "Kong Gateway", "Apigee", "OpenAPI Specification", "Postman", "CloudWatch API Metrics"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
