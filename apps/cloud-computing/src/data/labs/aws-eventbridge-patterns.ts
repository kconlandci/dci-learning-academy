import type { LabManifest } from "../../types/manifest";

export const awsEventbridgePatternsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "aws-eventbridge-patterns",
  version: 1,
  title: "AWS EventBridge Event Patterns",
  tier: "intermediate",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "eventbridge", "event-driven", "rules", "patterns", "cross-account"],
  description:
    "Design EventBridge event patterns, configure rules with precise filtering, and architect cross-account event buses to build loosely coupled, event-driven architectures.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Write EventBridge event patterns with content-based filtering for precise event matching",
    "Configure rules with multiple targets and dead-letter queues for reliable event delivery",
    "Design cross-account event bus architectures for multi-team event sharing",
    "Troubleshoot event patterns that silently fail to match expected events",
  ],
  sortOrder: 120,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "eventbridge-s1",
      title: "Event Pattern Design for Order Processing",
      context:
        "You need to trigger a Lambda function only when orders over $500 are placed in the 'electronics' category. Events are published to EventBridge with a detail field containing: {\"orderTotal\": 750.00, \"category\": \"electronics\", \"status\": \"placed\"}. Your current pattern matches all orders regardless of amount or category because it only filters on status: placed.",
      displayFields: [
        { label: "Target Events", value: "Orders > $500 in electronics category only", emphasis: "critical" },
        { label: "Event Source", value: "Custom application via PutEvents", emphasis: "normal" },
        { label: "Current Pattern", value: "Matches all 'placed' orders — no amount or category filter", emphasis: "warn" },
        { label: "Lambda Invocations", value: "10,000/day (should be ~200/day for high-value electronics)", emphasis: "critical" },
        { label: "Event Detail", value: "{orderTotal: number, category: string, status: string}", emphasis: "normal" },
      ],
      actions: [
        { id: "content-filter-numeric", label: "Use content-based filtering with numeric matching (orderTotal > 500) and exact match on category: electronics", color: "green" },
        { id: "prefix-match", label: "Use prefix matching on category field and filter orderTotal in the Lambda function code", color: "orange" },
        { id: "lambda-filter", label: "Keep the broad pattern and add filtering logic at the start of the Lambda function to return early for non-matching events", color: "yellow" },
        { id: "multiple-rules", label: "Create separate rules for each category and each price threshold combination", color: "red" },
      ],
      correctActionId: "content-filter-numeric",
      rationales: [
        { id: "r-content-filter-correct", text: "EventBridge supports content-based filtering with numeric matching operators like 'numeric': ['>', 500] and exact string matching. Applying both filters in the event pattern means EventBridge only invokes the Lambda for matching events — reducing invocations from 10,000/day to ~200/day. This is both cost-effective and architecturally clean." },
        { id: "r-prefix-partial", text: "Prefix matching on category works for simple cases but does not filter by order total. Filtering in the Lambda function means all orders in electronics still invoke the function, wasting Lambda compute time on events that will be discarded. The filtering should happen at the EventBridge pattern level." },
        { id: "r-lambda-filter-wasteful", text: "Filtering in the Lambda function processes 10,000 invocations per day when only 200 are relevant. This wastes Lambda execution costs and adds unnecessary load. EventBridge content filtering is free and eliminates 98% of unnecessary invocations before they reach the function." },
        { id: "r-multiple-rules-explosion", text: "Creating separate rules for each combination creates a combinatorial explosion of rules that is impossible to maintain. EventBridge supports compound patterns with multiple filter conditions in a single rule — that is the correct approach." },
      ],
      correctRationaleId: "r-content-filter-correct",
      feedback: {
        perfect: "Correct. EventBridge content-based filtering with numeric matching handles the compound filter natively, reducing Lambda invocations by 98% without any application code changes.",
        partial: "Lambda-side filtering works functionally but wastes 98% of invocations on events that are immediately discarded. Always push filtering as close to the event source as possible.",
        wrong: "Creating separate rules for each combination is unmaintainable. EventBridge compound patterns with numeric and string matching in a single rule are the correct approach.",
      },
    },
    {
      type: "action-rationale",
      id: "eventbridge-s2",
      title: "Reliable Event Delivery with Dead-Letter Queues",
      context:
        "Your EventBridge rule triggers a Lambda function for payment webhook events. Occasionally, the Lambda function fails due to concurrency limits being reached during traffic spikes. When this happens, EventBridge retries for 24 hours and then silently drops the event. You have no visibility into dropped events, and payments are going unprocessed without any alert.",
      displayFields: [
        { label: "Failure Mode", value: "Lambda concurrency limit exceeded during spikes", emphasis: "critical" },
        { label: "Retry Policy", value: "Default — 24 hours, 185 retries", emphasis: "normal" },
        { label: "Dropped Events", value: "Silently lost after retry exhaustion — no alerting", emphasis: "critical" },
        { label: "Impact", value: "Payment webhooks lost — revenue impact", emphasis: "critical" },
        { label: "Event Volume", value: "Normal: 500/hr, Spikes: 5,000/hr", emphasis: "warn" },
      ],
      actions: [
        { id: "dlq-with-alarm", label: "Configure an SQS dead-letter queue on the EventBridge target and add a CloudWatch alarm on DLQ message count", color: "green" },
        { id: "increase-concurrency", label: "Increase Lambda reserved concurrency to handle the peak spike volume", color: "yellow" },
        { id: "reduce-retries", label: "Reduce retry attempts to 5 with 1-hour max age so failures surface faster", color: "orange" },
        { id: "add-sns-topic", label: "Add an SNS topic as a second target for the rule as a backup delivery mechanism", color: "red" },
      ],
      correctActionId: "dlq-with-alarm",
      rationales: [
        { id: "r-dlq-correct", text: "An SQS dead-letter queue captures events that exhaust all retry attempts. Combined with a CloudWatch alarm on ApproximateNumberOfMessagesVisible, the team is alerted immediately when events fail permanently. Failed events are preserved in the DLQ for inspection and reprocessing — no payment webhook is silently lost." },
        { id: "r-concurrency-doesnt-catch-all", text: "Increasing Lambda concurrency reduces the failure rate but does not eliminate it — other failure modes (throttling, timeouts, code errors) can still cause event loss. Without a DLQ, any failure that exhausts retries still results in silent event loss. Concurrency increase treats the symptom, not the architectural gap." },
        { id: "r-reduce-retries-faster-loss", text: "Reducing retries makes events fail faster but does not prevent them from being lost. Without a DLQ, the events still disappear silently after the reduced retry window. This makes the problem worse by giving transient failures less time to resolve." },
        { id: "r-sns-same-problem", text: "Adding an SNS second target doubles delivery attempts but if the underlying Lambda concurrency issue affects both targets, both fail. SNS does not provide dead-letter queue semantics for EventBridge — failed events are still eventually lost." },
      ],
      correctRationaleId: "r-dlq-correct",
      feedback: {
        perfect: "Correct. A DLQ with alerting is the standard reliability pattern for EventBridge targets. It ensures no event is silently lost and gives the team both visibility and a reprocessing mechanism for failed events.",
        partial: "Increasing concurrency helps but does not address the fundamental gap — events can still be lost without a DLQ. Always configure a DLQ for business-critical EventBridge targets.",
        wrong: "Reducing retries or adding duplicate targets does not solve the core problem. Without a dead-letter queue, exhausted retries always result in silent event loss regardless of retry configuration.",
      },
    },
    {
      type: "action-rationale",
      id: "eventbridge-s3",
      title: "Cross-Account Event Bus Architecture",
      context:
        "Your organization has three AWS accounts: a shared services account (publishes deployment events), a production account (needs deployment events for auto-scaling triggers), and a security account (needs deployment events for audit logging). Currently, each consumer account polls the shared services account via API Gateway, creating tight coupling and polling overhead.",
      displayFields: [
        { label: "Publisher", value: "Shared Services account — deployment events", emphasis: "normal" },
        { label: "Consumer 1", value: "Production account — auto-scaling triggers", emphasis: "normal" },
        { label: "Consumer 2", value: "Security account — audit logging", emphasis: "normal" },
        { label: "Current Architecture", value: "API Gateway polling — tight coupling, 30-second delay", emphasis: "critical" },
        { label: "Goal", value: "Real-time, loosely coupled event delivery across accounts", emphasis: "normal" },
      ],
      actions: [
        { id: "cross-account-bus", label: "Create a custom event bus in shared services, add resource policies allowing consumer accounts to create rules, and use PutEvents from the publisher", color: "green" },
        { id: "sns-cross-account", label: "Replace with SNS cross-account topic subscriptions in each consumer account", color: "yellow" },
        { id: "forward-events", label: "Create rules in shared services that forward events to the default bus in each consumer account via PutEvents targets", color: "yellow" },
        { id: "sqs-fanout", label: "Publish events to SQS queues in each consumer account and have them poll the queues", color: "orange" },
      ],
      correctActionId: "cross-account-bus",
      rationales: [
        { id: "r-cross-account-bus-correct", text: "A custom event bus with resource-based policies allows consumer accounts to create their own rules with their own filtering patterns. Each consumer is decoupled from the publisher — they subscribe to only the events they need. The publisher does not need to know about consumers, and adding new consumers requires no changes to the shared services account." },
        { id: "r-sns-less-flexible", text: "SNS cross-account subscriptions work for simple fan-out but lack EventBridge's content-based filtering. Each consumer receives all events and must filter locally. Adding new event types or filter conditions requires changes to the SNS topic configuration in the publisher account." },
        { id: "r-forward-events-coupling", text: "Forwarding events from shared services rules to consumer default buses works but couples the publisher account to each consumer. Every new consumer or filter change requires a rule update in the shared services account. This creates an operational bottleneck in the shared services team." },
        { id: "r-sqs-polling-same-problem", text: "SQS cross-account queues replace API Gateway polling with SQS polling — still a polling architecture. While SQS long polling is more efficient than API polling, it does not provide the real-time, push-based delivery that EventBridge offers." },
      ],
      correctRationaleId: "r-cross-account-bus-correct",
      feedback: {
        perfect: "Correct. A custom event bus with resource policies provides real-time, loosely coupled event delivery where consumers own their own rules and filtering. This is the EventBridge-native cross-account architecture.",
        partial: "SNS or event forwarding work but create tighter coupling between publisher and consumers. The custom event bus pattern lets consumers self-serve their subscriptions without publisher involvement.",
        wrong: "SQS polling replaces one polling architecture with another. The goal is push-based, real-time event delivery with consumer-owned filtering — which is exactly what EventBridge cross-account event buses provide.",
      },
    },
  ],
  hints: [
    "EventBridge content-based filtering supports numeric comparisons, prefix matching, suffix matching, and exists checks. Push filtering into the event pattern to minimize unnecessary target invocations.",
    "Always configure a dead-letter queue (SQS) on EventBridge targets for business-critical events. Without a DLQ, events that exhaust retry attempts are silently dropped.",
    "Cross-account event buses with resource policies let consumers create their own rules in the publisher's bus. This decouples the publisher from consumers — no publisher changes needed when adding new consumers.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "EventBridge is the backbone of modern event-driven architectures on AWS. Engineers who can design precise event patterns, ensure reliable delivery with dead-letter queues, and architect cross-account event buses are building the decoupled, scalable systems that companies need as they grow from monoliths to microservices.",
  toolRelevance: ["AWS EventBridge Console", "EventBridge Schema Registry", "CloudWatch Logs", "AWS SQS Console", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
