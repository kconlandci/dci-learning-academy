import type { LabManifest } from "../../types/manifest";

export const azureServiceBusDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-service-bus-design",
  version: 1,
  title: "Azure Service Bus Messaging Design Patterns",
  tier: "intermediate",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "service-bus", "messaging", "queues", "topics", "dead-letter", "sessions"],
  description:
    "Design Azure Service Bus messaging architectures using queues, topics, and subscriptions. Handle dead-letter queues, implement ordered processing with sessions, and choose between competing consumer patterns.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Choose between Service Bus queues and topics based on message routing and consumer requirements",
    "Configure dead-letter queues and implement automated dead-letter processing to prevent message loss",
    "Use Service Bus sessions to guarantee ordered message processing for correlated message groups",
    "Design retry policies and duplicate detection to ensure reliable message delivery",
  ],
  sortOrder: 215,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Order Processing — Queue vs Topic Architecture",
      context:
        "An e-commerce platform processes orders through a pipeline: order-placed, payment-processed, inventory-reserved, shipping-label-created, and notification-sent. Currently, each stage directly calls the next via HTTP, creating a tightly coupled chain. When the payment service is down, orders are lost. The team wants to decouple the pipeline using Service Bus. Each stage has exactly one consumer, but the notification stage needs to receive events from BOTH payment-processed and shipping-label-created stages.",
      displayFields: [
        { label: "Pipeline", value: "order-placed → payment → inventory → shipping → notification" },
        { label: "Coupling", value: "Synchronous HTTP calls between stages — order loss when downstream fails" },
        { label: "Consumer Model", value: "One consumer per stage, except notification (listens to 2 events)" },
        { label: "Message Volume", value: "5,000 orders/hour peak, 500 orders/hour off-peak" },
        { label: "Requirement", value: "No message loss, at-least-once delivery, decouple all stages" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Use a Service Bus topic for each event type (order-placed, payment-processed, etc.) with subscriptions for each consumer — notification service subscribes to both payment-processed and shipping-label-created topics",
          color: "green",
        },
        {
          id: "action-b",
          label: "Use a single Service Bus queue for the entire pipeline — each stage reads from the queue, processes, and enqueues the next message",
          color: "red",
        },
        {
          id: "action-c",
          label: "Use separate queues between each stage (order-queue, payment-queue, inventory-queue, shipping-queue) with the notification service polling two queues",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Use Azure Event Grid to publish events and have each service subscribe to the relevant event types",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Topics with subscriptions are the correct pattern when multiple consumers need the same message or when a consumer needs messages from multiple event types. Each event type (payment-processed, shipping-label-created) becomes a topic. The notification service creates a subscription on both topics. Other consumers (inventory, shipping) each have their own subscription. This provides publish-subscribe decoupling with independent consumer scaling, dead-letter handling per subscription, and no message loss via Service Bus persistence.",
        },
        {
          id: "rationale-b",
          text: "A single queue for the entire pipeline means all message types are mixed together. Each consumer must filter for its relevant messages and abandon others — wasting receive operations, creating lock contention, and making dead-letter handling ambiguous (which stage failed?). This antipattern is called 'shared queue' and defeats the purpose of decoupling.",
        },
        {
          id: "rationale-c",
          text: "Point-to-point queues between stages work for the linear pipeline but fail for the notification requirement — the notification service must poll two separate queues, manage two receivers, and correlate messages from different sources. Topics with subscriptions handle this natively. Queues also do not support multiple consumers receiving the same message.",
        },
        {
          id: "rationale-d",
          text: "Event Grid provides at-most-once delivery with webhook push — it does not buffer messages during consumer downtime the way Service Bus does. For an order processing pipeline where message loss is unacceptable, Service Bus queues/topics with their persistence, peek-lock, and dead-letter queues provide stronger delivery guarantees than Event Grid.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Service Bus topics with subscriptions are the standard pattern for event-driven pipelines where consumers need to independently receive and process different event types.",
        partial:
          "Point-to-point queues work for linear pipelines but become cumbersome when a consumer needs messages from multiple sources. Event Grid lacks the persistence guarantees needed for transactional workflows.",
        wrong:
          "A single shared queue for multiple message types creates filter overhead, lock contention, and ambiguous dead-letter handling. Always separate message types into distinct topics or queues.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Dead-Letter Queue — Poison Messages Blocking Processing",
      context:
        "A payment processing service reads from a Service Bus queue. Over the past week, the queue depth has grown from 0 to 45,000 messages. Investigation shows the consumer is processing messages but 200 'poison' messages with malformed JSON keep failing and being retried. Each poison message is retried 10 times (max delivery count) before being dead-lettered, but new poison messages arrive daily. The dead-letter queue now has 1,400 messages that nobody is monitoring.",
      displayFields: [
        { label: "Active Queue Depth", value: "45,000 messages (growing 5,000/day)" },
        { label: "Dead-Letter Queue", value: "1,400 messages, unmonitored" },
        { label: "Max Delivery Count", value: "10 (each poison message retried 10 times before dead-lettering)" },
        { label: "Poison Message Pattern", value: "Malformed JSON from a legacy integration, ~30/day" },
        { label: "Consumer Throughput", value: "Processing stalls while retrying poison messages (lock duration: 30s × 10 retries = 5 min per poison message)" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Reduce max delivery count to 2, deploy a dead-letter queue processor that logs failed messages and alerts the team, and add input validation to the producer to reject malformed JSON before enqueuing",
          color: "green",
        },
        {
          id: "action-b",
          label: "Increase the consumer's lock duration to 5 minutes to prevent message reappearance during processing",
          color: "red",
        },
        {
          id: "action-c",
          label: "Add a try-catch in the consumer to silently complete (discard) messages that fail JSON parsing",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Scale the consumer to 10 instances to process the backlog faster and absorb the poison message retries",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Three-part fix: (1) Reducing max delivery count from 10 to 2 means poison messages are dead-lettered after 2 attempts instead of 10, reducing the time each poison message blocks the consumer from 5 minutes to 1 minute. (2) A dead-letter queue processor monitors the DLQ, logs message content for debugging, sends alerts, and optionally retries after fixing the issue. (3) Input validation at the producer prevents malformed messages from entering the queue. This addresses the symptom (backlog), the root cause (malformed input), and the monitoring gap (unmonitored DLQ).",
        },
        {
          id: "rationale-b",
          text: "Increasing lock duration does not help — the problem is that poison messages are retried 10 times, not that messages are losing their locks. A longer lock duration would actually make the problem worse by holding the message lock longer during each failed attempt, blocking other consumers from processing valid messages.",
        },
        {
          id: "rationale-c",
          text: "Silently completing (discarding) malformed messages prevents the backlog but loses the messages permanently. These messages represent real business transactions (payments) from a legacy integration. Silently dropping them means payment events are lost with no audit trail. Dead-lettering preserves them for investigation and potential reprocessing.",
        },
        {
          id: "rationale-d",
          text: "Scaling to 10 consumer instances does not fix poison messages — each instance will encounter the same poison messages and retry them. With 10 instances, the poison messages cycle through retries faster but still consume 10 × delivery attempts each. The backlog is caused by processing stalls from poison messages, not insufficient consumer throughput.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Reducing max delivery count minimizes poison message impact, DLQ monitoring ensures no messages are silently lost, and producer-side validation prevents the root cause.",
        partial:
          "Silently completing malformed messages clears the backlog but loses business data. Dead-lettering preserves messages for investigation while removing them from the active queue.",
        wrong:
          "Scaling consumers or increasing lock duration does not address poison messages — the same messages will fail on every instance regardless of scale.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Session-Based Ordering — Financial Transaction Sequencing",
      context:
        "A banking application processes account transactions (deposits, withdrawals, transfers) through a Service Bus queue. Transactions for the same account must be processed in strict FIFO order — a withdrawal must not process before its preceding deposit. Currently, 5 competing consumers process messages in parallel, causing race conditions where withdrawals process before deposits for the same account, resulting in incorrect balance calculations.",
      displayFields: [
        { label: "Message Volume", value: "50,000 transactions/hour across 10,000 accounts" },
        { label: "Consumers", value: "5 competing consumers processing in parallel" },
        { label: "Ordering Requirement", value: "Strict FIFO per account (not global)" },
        { label: "Problem", value: "Withdrawal processed before deposit for same account → negative balance errors" },
        { label: "Transaction Fields", value: "accountId, transactionType, amount, sequenceNumber, timestamp" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Enable sessions on the Service Bus queue, set the SessionId property to the accountId on each message, and use session-aware receivers that process messages within a session in FIFO order",
          color: "green",
        },
        {
          id: "action-b",
          label: "Reduce consumers to 1 to ensure global FIFO ordering across all messages",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Add a sequenceNumber to each message and have consumers reorder messages in memory before processing",
          color: "red",
        },
        {
          id: "action-d",
          label: "Partition the queue by accountId using multiple queues (one per account range) and assign one consumer per queue",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Service Bus sessions are designed exactly for this use case. Setting SessionId=accountId groups all transactions for an account into a session. Within a session, messages are delivered in FIFO order. A session-aware receiver locks an entire session (one account's transactions) and processes them sequentially. Multiple consumers can process different sessions (different accounts) in parallel — 5 consumers can each handle a different account's session simultaneously, maintaining both ordering (per account) and throughput (across accounts).",
        },
        {
          id: "rationale-b",
          text: "Reducing to 1 consumer guarantees global FIFO but reduces throughput from 5× to 1×. With 50,000 transactions/hour, a single consumer must process ~14 messages/second with zero downtime. This is a scaling bottleneck that defeats the purpose of using a message queue. Per-account ordering (sessions) provides FIFO where needed without sacrificing parallelism.",
        },
        {
          id: "rationale-c",
          text: "Client-side reordering is fragile and complex — consumers must buffer messages, handle out-of-order arrivals, manage sequence gaps (missing messages), and implement timeout logic for when a predecessor message never arrives. Service Bus sessions provide ordering at the broker level, eliminating all this complexity.",
        },
        {
          id: "rationale-d",
          text: "Manual partitioning by account range (e.g., accounts A-E to queue-1) requires predefined partition boundaries, creates hot partitions if account activity is uneven, and requires management of multiple queues. Service Bus sessions achieve the same logical partitioning dynamically without pre-partitioning or multiple queues.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Service Bus sessions provide per-group FIFO ordering while maintaining parallel processing across groups — the exact pattern for ordered processing of correlated messages.",
        partial:
          "Manual partitioning achieves per-group ordering but requires static partition definitions and multiple queues. Single consumer provides ordering but sacrifices throughput.",
        wrong:
          "Client-side reordering is error-prone and duplicates broker-level functionality that Service Bus sessions provide natively. Never implement ordering in consumer code when the broker supports it.",
      },
    },
  ],
  hints: [
    "Use Service Bus topics when multiple consumers need the same event or when a consumer needs events from multiple producers — topics with subscriptions provide publish-subscribe decoupling that queues cannot.",
    "Dead-letter queues are not just a dumping ground — deploy a DLQ processor that monitors, logs, and alerts on dead-lettered messages. Reduce max delivery count to minimize the time poison messages block consumers.",
    "Service Bus sessions guarantee FIFO ordering within a session (identified by SessionId) while allowing parallel processing across sessions — set SessionId to the correlation key (e.g., accountId, orderId) for per-entity ordering.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure Service Bus is the backbone of event-driven architectures on Azure. Engineers who understand queues vs topics, dead-letter handling, and session-based ordering can design reliable decoupled systems that handle failures gracefully — a skill that separates junior from senior cloud architects.",
  toolRelevance: ["Azure Portal", "Azure Service Bus Explorer", "Azure CLI", "Azure Monitor", "Application Insights"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
