import type { LabManifest } from "../../types/manifest";

export const azureFunctionsTriggersLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-functions-triggers",
  version: 1,
  title: "Azure Functions Trigger Selection",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "functions", "serverless", "triggers", "bindings", "event-driven"],
  description:
    "Select the correct Azure Functions trigger type for each event-driven workload scenario, considering scaling behavior, latency, and cost implications.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Match Azure Functions trigger types (HTTP, Timer, Queue, Event Hub, Blob, Service Bus) to workload patterns",
    "Understand how trigger type affects scaling behavior on the Consumption plan",
    "Identify when Durable Functions are required vs. single-function triggers",
  ],
  sortOrder: 205,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "High-Volume IoT Telemetry Ingestion",
      context:
        "An IoT platform receives telemetry from 50,000 sensors, each sending readings every 30 seconds. Peak throughput: ~1,700 messages/second. The processing function must normalize the data and write to Azure Cosmos DB. Latency requirement: < 500ms end-to-end. Budget: minimize cost, maximize throughput.",
      displayFields: [
        { label: "Message Volume", value: "~1,700 messages/second peak" },
        { label: "Message Size", value: "~2 KB average" },
        { label: "Latency Requirement", value: "< 500ms" },
        { label: "Processing Logic", value: "Normalize + write to Cosmos DB" },
        { label: "Ordering Required", value: "No — telemetry is independent per sensor" },
        { label: "Dead Letter Handling", value: "Required" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Event Hub trigger with batching enabled (max batch size 100), Consumption plan",
          color: "green",
        },
        {
          id: "action-b",
          label: "HTTP trigger — sensors POST to a Function endpoint directly",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Timer trigger that polls Cosmos DB for new sensor data every 30 seconds",
          color: "red",
        },
        {
          id: "action-d",
          label: "Service Bus Queue trigger with sessions enabled",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Event Hub is purpose-built for high-throughput telemetry ingestion at millions of events per second. The Functions Event Hub trigger scales by adding one function instance per partition (up to 32 partitions), enabling massive parallel throughput. Batching reduces per-message overhead. Consumption plan charges only for actual execution, minimizing cost at variable telemetry volumes.",
        },
        {
          id: "rationale-b",
          text: "HTTP triggers require each sensor to manage connections, handle retries, and implement backpressure — complexity that belongs in the infrastructure layer. At 1,700 req/s, cold starts on the Consumption plan would become a problem, and there's no built-in dead letter handling. HTTP is for interactive APIs, not bulk telemetry ingestion.",
        },
        {
          id: "rationale-c",
          text: "A timer trigger that polls Cosmos DB for new data is backwards — sensors should push data, not have the function pull from a database. This pattern creates a 30-second latency floor and generates unnecessary Cosmos DB read charges even when there's no new data.",
        },
        {
          id: "rationale-d",
          text: "Service Bus with sessions enforces message ordering per session and adds session management overhead. The problem statement explicitly says ordering is not required. Service Bus has lower throughput limits than Event Hub and is better suited for command/control messages requiring exactly-once delivery, not high-volume telemetry.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Event Hub + batched Function trigger is the standard Azure pattern for high-volume IoT telemetry processing.",
        partial:
          "Your trigger choice works functionally but won't scale to 1,700 messages/second efficiently or will miss the dead letter handling requirement.",
        wrong:
          "Timer-based polling from a database is an anti-pattern for event-driven systems — it adds latency, wastes compute, and inverts the push/pull model.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Order Processing Workflow with Human Approval",
      context:
        "An e-commerce order processing workflow: (1) validate order, (2) reserve inventory, (3) send approval email for orders > $10,000 and wait for human approval (up to 72 hours), (4) charge payment, (5) confirm order. The workflow must survive app restarts and handle partial failures at each step.",
      displayFields: [
        { label: "Workflow Steps", value: "5 sequential steps with conditional approval" },
        { label: "Human Wait Time", value: "Up to 72 hours" },
        { label: "Failure Handling", value: "Must retry each step independently" },
        { label: "State Persistence", value: "Required across restarts" },
        { label: "Order Volume", value: "~200 high-value orders/day requiring approval" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Durable Functions with Function Chaining + Human Interaction pattern using external events",
          color: "green",
        },
        {
          id: "action-b",
          label: "Five separate HTTP-triggered Functions with state stored in a database table",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Single HTTP-triggered Function with a while loop that polls for approval status every 5 minutes",
          color: "red",
        },
        {
          id: "action-d",
          label: "Logic Apps workflow with approval email connector",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Durable Functions are designed for exactly this: stateful, long-running orchestrations with human interaction patterns. The orchestrator function suspends itself while waiting for the external event (human approval), consuming zero compute during the wait. State is persisted automatically in Azure Storage. If the app restarts, the orchestration replays from checkpoints. Function chaining handles the sequential steps with automatic retry.",
        },
        {
          id: "rationale-b",
          text: "Five separate functions with custom state management is the manual implementation of what Durable Functions provide natively. You'd need to build checkpoint/replay logic, correlation IDs, timeout handling, and retry policies from scratch — significant engineering effort with more failure modes.",
        },
        {
          id: "rationale-c",
          text: "A single Function with a polling loop that waits up to 72 hours would consume compute continuously — potentially thousands of execution-minutes of cost for doing nothing. The Consumption plan has a 10-minute execution timeout, so this would fail immediately. Never use polling loops inside Azure Functions.",
        },
        {
          id: "rationale-d",
          text: "Logic Apps is a valid alternative for this pattern — it has native approval email connectors and visual workflow design. However, if the team is already using Azure Functions for other services, Durable Functions keeps the stack consistent with code-defined logic, easier testing, and lower per-execution cost for custom processing.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Durable Functions with external events is the canonical pattern for long-running workflows with human-in-the-loop steps.",
        partial:
          "Your approach could work but requires significantly more custom plumbing or violates the Consumption plan timeout constraints.",
        wrong:
          "A polling loop inside a Function with a 72-hour wait would immediately hit the 10-minute Consumption plan timeout and consume enormous compute cost. This is an explicit anti-pattern.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Image Thumbnail Generation — Blob Trigger Idempotency",
      context:
        "A media platform uses a Blob trigger on an Azure Storage container to generate thumbnails when new images are uploaded. The function occasionally runs twice for the same blob, generating duplicate thumbnails. Investigation shows the Blob trigger fires multiple times for some uploads. How do you fix this?",
      displayFields: [
        { label: "Trigger Type", value: "Blob Storage trigger (poll-based)" },
        { label: "Container", value: "media-uploads (inbound)" },
        { label: "Output", value: "Thumbnails written to media-thumbnails container" },
        { label: "Problem", value: "Duplicate thumbnail generation (function fires 2–3x per blob)" },
        { label: "Current Latency", value: "30–90 second delay before function fires" },
        { label: "Throughput", value: "~500 new images/hour" },
      ],
      evidence: [
        "Function App Logs: 'Blob trigger processed blob: uploads/img-20260328-1142.jpg Size: 2847492 bytes' — same log entry appears 3 times at 11:42:05, 11:42:07, 11:42:08 for the same blob name.",
      ],
      actions: [
        {
          id: "action-a",
          label: "Switch from Blob trigger to Event Grid trigger on the storage account BlobCreated event",
          color: "green",
        },
        {
          id: "action-b",
          label: "Add a check in the function code: if thumbnail already exists, return early (idempotent guard)",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Add a 10-second sleep at the start of the function to allow duplicate events to settle",
          color: "red",
        },
        {
          id: "action-d",
          label: "Set the function host concurrency to 1 to prevent parallel executions",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The legacy Blob trigger uses Azure Storage queue-based polling and is known to fire multiple times per blob (especially for large files) with 30–90 second latency. The Event Grid trigger is event-push based — it fires exactly once per BlobCreated event with sub-second latency and does not have the duplicate firing problem. This is the Microsoft-recommended migration path for blob processing functions.",
        },
        {
          id: "rationale-b",
          text: "An idempotency guard (check-then-skip) is a good defensive coding practice and should be added regardless — it handles duplicate events from any source. However, it is a workaround rather than a fix, and the 30–90 second polling delay remains, which may violate latency requirements.",
        },
        {
          id: "rationale-c",
          text: "Adding a sleep inside an Azure Function wastes execution time (and cost) and doesn't prevent duplicates — all three concurrent executions would sleep for 10 seconds then each try to generate the thumbnail, potentially all succeeding before any check completes.",
        },
        {
          id: "rationale-d",
          text: "Setting concurrency to 1 prevents parallel processing but creates a processing queue that would fall behind at 500 images/hour. It also doesn't prevent sequential duplicate firings of the same blob — the duplicate events are already in the queue.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. The legacy Blob trigger's poll-based mechanism causes duplicate firings; Event Grid trigger is event-push based and fires exactly once per blob event with sub-second latency.",
        partial:
          "Your fix reduces the visible impact but doesn't address the underlying duplicate-firing behavior of the legacy Blob trigger. The correct fix also improves latency from 30–90s to sub-second.",
        wrong:
          "Sleeping inside a Function wastes compute cost and doesn't prevent any duplicates — all executions would wake up and attempt the same work after sleeping.",
      },
    },
  ],
  hints: [
    "Event Hub is designed for high-throughput telemetry streams (millions of events/second) and scales horizontally by partition count — always prefer it over HTTP triggers for bulk IoT data.",
    "Durable Functions are the correct tool whenever your workflow needs to pause and wait (human approval, external events, timeouts) — they consume zero compute while waiting.",
    "The legacy Azure Blob trigger uses poll-based detection with 30–90 second latency and occasional duplicate firings — switch to Event Grid trigger for reliable, near-real-time, exactly-once blob event processing.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Serverless event-driven architecture is increasingly the default pattern for new cloud workloads. Understanding which trigger type to use for a given scenario — and how trigger choice affects scaling, cost, and reliability — is a core competency for any Azure developer or architect role.",
  toolRelevance: ["Azure Portal", "Azure Functions Core Tools", "Azure CLI", "Application Insights", "VS Code Azure Extension"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
