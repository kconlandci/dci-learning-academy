import type { LabManifest } from "../../types/manifest";

export const awsStepFunctionsDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "aws-step-functions-design",
  version: 1,
  title: "AWS Step Functions Design",
  tier: "intermediate",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "step-functions", "workflows", "orchestration", "serverless", "state-machine"],
  description:
    "Design Step Functions state machines with the correct workflow type, error handling patterns, and state transitions to orchestrate complex multi-service workflows reliably.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Choose between Standard and Express workflows based on execution duration and cost",
    "Implement error handling with Retry and Catch blocks for resilient workflows",
    "Design state machine patterns for parallel processing and conditional branching",
    "Understand execution guarantees and idempotency requirements for each workflow type",
  ],
  sortOrder: 116,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "step-functions-s1",
      title: "Workflow Type Selection for Payment Processing",
      context:
        "You are building an order payment workflow that validates the order, charges the credit card via a third-party API, updates the order database, and sends a confirmation email. The workflow executes 50,000 times per day, each execution takes 2-8 seconds, and exactly-once processing is critical because duplicate credit card charges would be unacceptable.",
      displayFields: [
        { label: "Execution Volume", value: "50,000/day", emphasis: "normal" },
        { label: "Execution Duration", value: "2-8 seconds", emphasis: "normal" },
        { label: "Processing Guarantee", value: "Exactly-once required (payment)", emphasis: "critical" },
        { label: "Steps", value: "Validate -> Charge -> Update DB -> Send Email", emphasis: "normal" },
        { label: "Cost Sensitivity", value: "Moderate — correctness over cost", emphasis: "warn" },
      ],
      actions: [
        { id: "standard-workflow", label: "Use Standard Workflow with exactly-once execution semantics", color: "green" },
        { id: "express-sync", label: "Use Express Workflow (synchronous) for lower cost at high volume", color: "orange" },
        { id: "express-async", label: "Use Express Workflow (asynchronous) for fire-and-forget processing", color: "red" },
        { id: "standard-with-express-nested", label: "Use Express Workflow nested inside a Standard Workflow for cost savings", color: "yellow" },
      ],
      correctActionId: "standard-workflow",
      rationales: [
        { id: "r-standard-exactly-once", text: "Standard Workflows guarantee exactly-once execution with full execution history and audit trail. For payment processing where duplicate charges are unacceptable, this guarantee is non-negotiable. The cost difference (~$25/day at 50K executions vs ~$5/day for Express) is trivial compared to the financial risk of duplicate payments." },
        { id: "r-express-at-least-once", text: "Express Workflows provide at-least-once execution, meaning a state transition could execute a Lambda function twice during retries. For credit card charges, this could result in double-charging a customer — an unacceptable business risk." },
        { id: "r-express-async-no-result", text: "Asynchronous Express Workflows fire-and-forget without returning a result. The calling service would not know if the payment succeeded or failed, making it impossible to confirm the order to the user." },
        { id: "r-nested-complexity", text: "Nesting Express inside Standard adds architectural complexity without meaningful benefit. The payment charge step must be exactly-once regardless, which requires the Standard Workflow. Moving other steps to Express saves pennies while creating two workflow types to maintain." },
      ],
      correctRationaleId: "r-standard-exactly-once",
      feedback: {
        perfect: "Correct. Standard Workflows are mandatory when exactly-once processing is required. The cost difference is negligible compared to the financial and reputational risk of duplicate payment charges.",
        partial: "Cost optimization is valid, but Express Workflows trade exactly-once guarantees for lower price. For payment processing, correctness must take absolute priority over cost.",
        wrong: "Express Workflows with at-least-once semantics are fundamentally unsafe for financial transactions. Asynchronous Express Workflows cannot even return success/failure to the caller.",
      },
    },
    {
      type: "action-rationale",
      id: "step-functions-s2",
      title: "Error Handling for External API Integration",
      context:
        "Your Step Functions workflow calls a third-party shipping API to generate labels. The API is unreliable — it returns HTTP 503 errors approximately 5% of the time and occasionally times out after 30 seconds. When the API fails permanently, the order should be routed to a manual fulfillment queue. Currently, any API failure causes the entire workflow execution to fail.",
      displayFields: [
        { label: "Failure Rate", value: "~5% of calls return HTTP 503", emphasis: "warn" },
        { label: "Timeout Behavior", value: "Occasional 30-second timeouts", emphasis: "warn" },
        { label: "Current Behavior", value: "Any API failure = entire workflow fails", emphasis: "critical" },
        { label: "Desired Behavior", value: "Retry transient errors, route permanent failures to manual queue", emphasis: "normal" },
        { label: "SLA", value: "Labels generated within 5 minutes for 99% of orders", emphasis: "normal" },
      ],
      actions: [
        { id: "retry-then-catch", label: "Add a Retry block with exponential backoff for 503/timeout errors, and a Catch block that routes to the manual queue on final failure", color: "green" },
        { id: "catch-only", label: "Add a Catch block that routes all errors to the manual queue immediately", color: "orange" },
        { id: "retry-infinite", label: "Add a Retry block with MaxAttempts set to 10 and no Catch block", color: "red" },
        { id: "lambda-wrapper", label: "Wrap the API call in a Lambda function that handles retries internally before Step Functions sees any error", color: "yellow" },
      ],
      correctActionId: "retry-then-catch",
      rationales: [
        { id: "r-retry-catch-pattern", text: "Retry with exponential backoff (e.g., 3 attempts, backoff rate 2.0) handles the 5% transient 503 errors automatically. After retries are exhausted, the Catch block routes to the manual fulfillment queue. This is the standard Step Functions error handling pattern — Retry for transient errors, Catch for permanent failures." },
        { id: "r-catch-only-wasteful", text: "Routing all errors to manual fulfillment immediately means 5% of orders go to manual processing unnecessarily. Most 503 errors resolve on the next attempt. Without Retry, transient failures that would self-resolve create unnecessary manual work." },
        { id: "r-retry-no-catch-fails", text: "Retrying 10 times without a Catch block means that after all retries are exhausted, the entire workflow still fails with no graceful fallback. The order is left in a broken state with no path to completion." },
        { id: "r-lambda-wrapper-antipattern", text: "Handling retries inside Lambda duplicates what Step Functions does natively. The Lambda function's execution time increases (retries consume Lambda duration billing), retry state is invisible to Step Functions execution history, and if the Lambda itself times out during retries, you lose all retry context." },
      ],
      correctRationaleId: "r-retry-catch-pattern",
      feedback: {
        perfect: "Correct. The Retry + Catch pattern is the idiomatic Step Functions approach — Retry handles transient failures automatically, and Catch provides a graceful degradation path when retries are exhausted.",
        partial: "Catch-only works but creates unnecessary manual work for transient errors that would resolve with a simple retry. Always try Retry first for known transient error types.",
        wrong: "Retry without Catch leaves no graceful fallback. Lambda-based retries duplicate Step Functions native capabilities and obscure retry state from the execution history.",
      },
    },
    {
      type: "action-rationale",
      id: "step-functions-s3",
      title: "State Machine Design for Parallel Document Processing",
      context:
        "You need to process uploaded documents through three independent services: virus scanning (Lambda, 3-5s), text extraction via OCR (Lambda, 10-30s), and metadata classification (SageMaker endpoint, 5-8s). All three must complete before the document is marked as 'processed'. If any service fails after retries, the document should be quarantined. Currently, the three services run sequentially, taking 18-43 seconds total.",
      displayFields: [
        { label: "Current Flow", value: "Sequential: scan -> OCR -> classify (18-43s total)", emphasis: "warn" },
        { label: "Service Independence", value: "All three services are independent — no data dependencies", emphasis: "critical" },
        { label: "Target Latency", value: "Under 35 seconds for 95% of documents", emphasis: "normal" },
        { label: "Failure Handling", value: "Any failure after retries = quarantine document", emphasis: "normal" },
        { label: "Volume", value: "2,000 documents/hour", emphasis: "normal" },
      ],
      actions: [
        { id: "parallel-state", label: "Use a Parallel state to run all three services concurrently, with a Catch block on the Parallel state that routes to quarantine", color: "green" },
        { id: "map-state", label: "Use a Map state to iterate over the three services as array items", color: "orange" },
        { id: "sequential-optimized", label: "Keep sequential flow but optimize each Lambda to run faster", color: "red" },
        { id: "parallel-no-catch", label: "Use a Parallel state with individual Retry on each branch but no Catch on the Parallel state", color: "yellow" },
      ],
      correctActionId: "parallel-state",
      rationales: [
        { id: "r-parallel-correct", text: "The Parallel state runs all three branches concurrently, reducing total latency from 18-43s (sequential sum) to 10-30s (longest branch, OCR). A Catch block on the Parallel state itself handles the quarantine routing — if any branch fails after its Retry attempts, the entire Parallel state transitions to the Catch, which routes to the quarantine state." },
        { id: "r-map-wrong-use", text: "Map state is designed for processing a dynamic array of identical items with the same processing logic. These three services are different services with different inputs and outputs — they are not iterations over a collection. Parallel state is the correct construct for concurrent heterogeneous operations." },
        { id: "r-sequential-ceiling", text: "Optimizing individual Lambda execution time has diminishing returns — OCR is inherently 10-30 seconds due to image processing. The sequential architecture's latency is the sum of all three services, while Parallel's latency is the maximum of the three. This is a structural improvement, not an optimization." },
        { id: "r-parallel-no-catch-gap", text: "Individual Retry blocks on each branch handle transient errors, but without a Catch on the Parallel state, a permanent failure in any branch causes the entire workflow execution to fail. The document is left unquarantined in an inconsistent state." },
      ],
      correctRationaleId: "r-parallel-correct",
      feedback: {
        perfect: "Correct. The Parallel state with a Catch block is the ideal design — it reduces latency from sequential sum to concurrent maximum, and provides a single error handling point for the quarantine path.",
        partial: "Parallel without Catch runs concurrently but lacks the quarantine fallback. Always pair Parallel branches with a Catch on the Parallel state to handle failures from any branch.",
        wrong: "Map state is for iterating over arrays, not running heterogeneous services. Sequential optimization cannot match the structural latency reduction of parallel execution.",
      },
    },
  ],
  hints: [
    "Standard Workflows guarantee exactly-once execution and support runs up to 1 year. Express Workflows are at-least-once and limited to 5 minutes, but cost significantly less at high volume.",
    "The Retry + Catch pattern is idiomatic Step Functions error handling: Retry for transient errors with backoff, Catch for routing permanent failures to a fallback path.",
    "Use Parallel state for concurrent independent operations (heterogeneous branches) and Map state for iterating over a dynamic collection with the same processing logic.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Step Functions is the backbone of serverless orchestration on AWS. Engineers who can design resilient state machines with proper error handling, choose the right workflow type, and leverage Parallel/Map states effectively are critical for building production-grade serverless architectures that handle failures gracefully.",
  toolRelevance: ["AWS Step Functions Console", "Step Functions Workflow Studio", "AWS Lambda Console", "CloudWatch Logs", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
