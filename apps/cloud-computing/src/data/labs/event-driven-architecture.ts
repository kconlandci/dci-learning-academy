import type { LabManifest } from "../../types/manifest";

export const eventDrivenArchitectureLab: LabManifest = {
  schemaVersion: "1.1",
  id: "event-driven-architecture",
  version: 1,
  title: "Event-Driven Architecture",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["event-driven", "messaging", "kafka", "pub-sub", "saga", "idempotency"],
  description:
    "Investigate message broker configurations, event flow designs, and failure scenarios, then decide on the correct event-driven patterns to ensure reliable, decoupled, and scalable asynchronous processing.",
  estimatedMinutes: 22,
  learningObjectives: [
    "Distinguish pub/sub, point-to-point queue, and event streaming patterns",
    "Design idempotent event consumers to handle duplicate message delivery",
    "Apply the saga pattern to manage distributed transactions across services",
    "Select appropriate message delivery guarantees (at-most-once, at-least-once, exactly-once)",
  ],
  sortOrder: 409,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "eda-order-processing",
      title: "Designing a Reliable Order Processing Flow",
      objective:
        "An order processing system needs to coordinate inventory reservation, payment charging, and shipment scheduling after a customer places an order. Investigate the failure modes and consistency requirements, then choose the correct distributed coordination pattern.",
      investigationData: [
        {
          id: "inv-current-design",
          label: "Current Synchronous Design",
          content:
            "Current flow: Order Service calls Inventory Service (HTTP), then calls Payment Service (HTTP), then calls Shipping Service (HTTP) — all synchronously in sequence. If any step fails, the order is placed in an error state and requires manual intervention. Payment has been charged 23 times without inventory confirmation over the last quarter.",
          isCritical: true,
        },
        {
          id: "inv-failure-modes",
          label: "Observed Failure Modes",
          content:
            "Inventory timeout (network): payment charged, inventory not reserved → oversell + payment dispute. Payment service down: inventory reserved but never released → stock locked for 24 hours. Shipping crash: payment charged, inventory reserved, shipment never created → manual rescue required. All failures require manual database corrections.",
          isCritical: true,
        },
        {
          id: "inv-sla",
          label: "Business Requirements",
          content:
            "Order confirmation to customer: within 500ms (user-facing). Actual fulfillment: within 2 hours. Strong consistency required: a customer must never be charged for an out-of-stock item. Compensating transaction acceptable: if payment fails after inventory reservation, inventory must be released automatically.",
          isCritical: true,
        },
        {
          id: "inv-team-capability",
          label: "Team Infrastructure",
          content:
            "Message broker: Apache Kafka deployed and operational. Teams have experience with event publishing but no experience implementing distributed sagas. Each service has its own database. No shared database between services.",
        },
      ],
      actions: [
        { id: "choreography-saga", label: "Choreography-based saga: each service publishes events and reacts to events from other services, with compensating transactions on failure", color: "green" },
        { id: "orchestrated-saga", label: "Orchestration-based saga: a central Order Orchestrator service coordinates steps and issues compensating commands on failure", color: "blue" },
        { id: "2pc", label: "Implement two-phase commit (2PC) across Inventory, Payment, and Shipping databases", color: "red" },
        { id: "sync-retry", label: "Add retry logic with exponential backoff to the existing synchronous HTTP calls", color: "yellow" },
      ],
      correctActionId: "orchestrated-saga",
      rationales: [
        { id: "r-orchestrated", text: "An orchestration-based saga gives the Order Orchestrator explicit visibility into each step's state, making failure handling and compensating transactions (release inventory, refund payment) deterministic. For a team new to sagas, the centralized flow is easier to reason about, debug, and audit than distributed choreography." },
        { id: "r-choreography", text: "Choreography sagas work well when the team has saga experience and flows are simple. For a new team managing a 3-step flow with compensating transactions on multiple failure paths, choreography's distributed state makes debugging the exact failure modes observed (23 double-charges) harder to trace." },
        { id: "r-2pc", text: "Two-phase commit requires all participating databases to support the XA protocol and the coordinator to be highly available. It adds significant operational complexity, reduces throughput, and creates blocking scenarios where a crashed coordinator locks all participants indefinitely." },
        { id: "r-sync-retry", text: "Retry logic helps with transient failures but does not solve the fundamental problem: charging payment before confirming inventory. A successful payment retry after an inventory timeout still results in a charged customer with no reserved stock." },
      ],
      correctRationaleId: "r-orchestrated",
      feedback: {
        perfect: "Correct. For a team implementing sagas for the first time with complex compensating transaction requirements, an orchestration-based saga provides the visibility and control needed to manage all failure paths safely.",
        partial: "Your choice improves coordination reliability but may not fully address the compensating transaction flows or may be too complex for the team's current saga experience level.",
        wrong: "The key issue is that the current flow can charge payment without confirming inventory. Review which coordination pattern provides explicit control over compensating transactions when individual steps fail.",
      },
    },
    {
      type: "investigate-decide",
      id: "eda-duplicate-processing",
      title: "Handling Duplicate Message Delivery",
      objective:
        "A payment processing consumer is receiving duplicate Kafka messages due to at-least-once delivery semantics. Investigate the duplicate event scenarios and decide on the correct idempotency strategy.",
      investigationData: [
        {
          id: "inv-kafka-config",
          label: "Kafka Consumer Configuration",
          content:
            "Consumer group: payment-processor. Auto-commit offset: enabled, every 5 seconds. Consumer crashed after processing a PaymentRequested event but before committing the offset. On restart, Kafka redelivered the same event. The payment was charged twice — customer received two receipts and their bank shows two charges.",
          isCritical: true,
        },
        {
          id: "inv-event-schema",
          label: "Event Schema",
          content:
            "PaymentRequested event fields: event_id (UUID, unique per event), order_id, customer_id, amount, currency, payment_method_token, timestamp. The event_id is generated by the publisher and is stable — the same logical event always has the same event_id if redelivered.",
          isCritical: true,
        },
        {
          id: "inv-payment-provider",
          label: "Payment Provider Capabilities",
          content:
            "Payment provider API supports idempotency keys: sending the same idempotency_key value in the payment request header causes the provider to return the original transaction result without charging again. Idempotency keys expire after 24 hours.",
          isCritical: true,
        },
        {
          id: "inv-volume",
          label: "Processing Volume",
          content:
            "Payment events: 800/minute at peak. Consumer restarts: 2–3 per week (deployments + occasional crashes). Each restart can redeliver up to 5 minutes of messages (5 seconds commit interval × offset lag). Estimated duplicate exposure: up to 4,000 messages per restart event.",
        },
      ],
      actions: [
        { id: "idempotency-key", label: "Use event_id as the payment provider idempotency key; deduplicate at the provider level", color: "green" },
        { id: "dedup-db", label: "Store processed event_ids in a deduplication table; check before processing each event", color: "blue" },
        { id: "manual-commit", label: "Switch to manual offset commit after successful payment confirmation; disable auto-commit", color: "yellow" },
        { id: "exactly-once", label: "Configure Kafka exactly-once semantics (EOS) with transactional producers", color: "orange" },
      ],
      correctActionId: "idempotency-key",
      rationales: [
        { id: "r-idempotency-key", text: "Using event_id as the payment provider idempotency key is the simplest and most robust solution. The provider handles deduplication natively — redelivered events with the same event_id return the original transaction result without a second charge. This requires zero additional infrastructure." },
        { id: "r-dedup-db", text: "A deduplication table works but adds a database read on every payment event (800/min), introduces a race condition if two consumers process the same event simultaneously, and requires managing table size/cleanup. Provider idempotency keys solve this more elegantly for the payment use case." },
        { id: "r-manual-commit", text: "Manual offset commit after confirmation reduces (but does not eliminate) duplicate delivery — the commit could still fail after payment confirmation, causing a redeliver. It also does not protect against duplicates from other causes (network retries to the payment provider)." },
        { id: "r-exactly-once", text: "Kafka exactly-once semantics prevents duplicate writes to Kafka topics but does not prevent the payment consumer from calling the payment provider twice if processing fails after the provider call but before offset commit. EOS is a Kafka-internal guarantee, not an end-to-end guarantee." },
      ],
      correctRationaleId: "r-idempotency-key",
      feedback: {
        perfect: "Correct. Leveraging the payment provider's built-in idempotency key mechanism is the standard approach — it requires no additional infrastructure and provides the strongest deduplication guarantee at the point where it matters most.",
        partial: "Your approach reduces duplicate processing risk but doesn't leverage the most direct deduplication mechanism available. Consider what the payment provider already offers.",
        wrong: "The duplicate charge happens at the payment provider call, not in Kafka. Kafka-side solutions reduce redelivery frequency but don't prevent double-charges if the provider is called twice. Check what the provider's idempotency key feature offers.",
      },
    },
    {
      type: "investigate-decide",
      id: "eda-broker-selection",
      title: "Message Broker Selection for Notification Service",
      objective:
        "A notification service needs to fan out order status updates to email, SMS, push notification, and webhook consumers. Investigate the fan-out requirements and consumer characteristics to select the right messaging pattern.",
      investigationData: [
        {
          id: "inv-fan-out-req",
          label: "Fan-Out Requirements",
          content:
            "When an OrderShipped event occurs, it must be delivered to: EmailConsumer (send shipping confirmation), SMSConsumer (send tracking SMS if opted in), PushConsumer (send mobile push notification), WebhookConsumer (POST to merchant's configured endpoint). All four consumers must receive every event independently.",
          isCritical: true,
        },
        {
          id: "inv-consumer-independence",
          label: "Consumer Independence",
          content:
            "Each notification channel has an independent failure mode. Email service is occasionally rate-limited. SMS provider has scheduled maintenance windows. Webhook consumers are merchant-controlled and unreliable (5% failure rate). A failure in one channel must not block delivery to other channels.",
          isCritical: true,
        },
        {
          id: "inv-replay",
          label: "Replay & Audit Requirements",
          content:
            "Compliance requires that all notification attempts be auditable for 90 days. Occasionally, a notification channel is disabled for maintenance and needs to replay missed events when re-enabled. Events must be replayable by consumer, not just available to new consumers.",
          isCritical: false,
        },
        {
          id: "inv-current",
          label: "Current Architecture",
          content:
            "Currently using a single SQS queue shared by all notification consumers. Email processing delay occasionally causes SMS and push notifications to back up behind email in the same queue. One slow consumer blocks all others.",
        },
      ],
      actions: [
        { id: "pub-sub-topics", label: "Publish OrderShipped events to a topic; each notification channel subscribes with an independent queue/subscription", color: "green" },
        { id: "single-queue", label: "Keep the single shared queue but add consumer priority configuration to order message processing", color: "red" },
        { id: "event-streaming", label: "Use an event streaming platform (e.g., Kafka) with each consumer in its own consumer group", color: "blue" },
        { id: "direct-api", label: "Call all four notification APIs synchronously from the order service before confirming shipment", color: "orange" },
      ],
      correctActionId: "pub-sub-topics",
      rationales: [
        { id: "r-pubsub", text: "Pub/sub with independent per-channel subscriptions and queues provides complete consumer isolation — a backed-up email queue does not delay SMS delivery. Each subscription has independent retry, dead-letter, and scaling policies. This directly solves the shared-queue bottleneck." },
        { id: "r-event-streaming", text: "Kafka with consumer groups is an excellent solution for this use case and provides replay capability. For a pure notification fan-out without extremely high throughput requirements, managed pub/sub services (SNS+SQS, Google Pub/Sub) offer the same isolation with less operational overhead." },
        { id: "r-single-queue", text: "Priority queuing on a shared queue does not provide consumer isolation. A slow consumer (email) still competes for worker threads. Separate queues per consumer is the correct fix, not prioritization within a shared queue." },
        { id: "r-direct-api", text: "Synchronous calls to four external APIs from the critical order confirmation path makes order confirmation latency dependent on the slowest notification service. A 5% webhook failure rate would cause 5% of order confirmations to fail — unacceptable." },
      ],
      correctRationaleId: "r-pubsub",
      feedback: {
        perfect: "Correct. Pub/sub with independent per-consumer subscriptions provides the fan-out, isolation, and independent retry semantics needed for this notification architecture.",
        partial: "Your choice provides fan-out but may not fully isolate consumer failure modes or may add unnecessary operational complexity for this use case.",
        wrong: "The shared queue is the root cause of channel interference. The solution requires independent queues per consumer. Review which messaging pattern provides topic-based fan-out with isolated consumer subscriptions.",
      },
    },
  ],
  hints: [
    "If a consumer failure in one channel must not block others, they need independent queues — a shared queue creates coupling no matter how it's configured.",
    "Payment provider idempotency keys solve duplicate charge problems more elegantly than application-level deduplication tables.",
    "Orchestration sagas are easier to debug than choreography when a team is implementing sagas for the first time — centralized flow state is more visible.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Event-driven systems are common in modern cloud platforms, and the most frequent production bugs involve duplicate message processing and silent data inconsistency from failed distributed transactions. Architects who design for at-least-once delivery and idempotent consumers from the start avoid entire categories of production incidents.",
  toolRelevance: [
    "Apache Kafka",
    "AWS SNS/SQS",
    "Azure Service Bus",
    "Google Cloud Pub/Sub",
    "RabbitMQ",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
