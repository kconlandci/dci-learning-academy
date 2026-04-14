import type { LabManifest } from "../../types/manifest";

export const observabilityStackDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "observability-stack-design",
  version: 1,
  title: "Observability Stack Design",
  tier: "intermediate",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["observability", "metrics", "logs", "traces", "monitoring", "opentelemetry"],
  description:
    "Design a comprehensive observability stack covering the three pillars — metrics, logs, and traces — select appropriate tooling, configure correlation between signals, and build dashboards that enable rapid incident diagnosis.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Explain the three pillars of observability and how they complement each other",
    "Select appropriate observability tools based on system architecture and scale",
    "Configure trace context propagation across service boundaries",
    "Design correlated dashboards that link metrics anomalies to relevant traces and logs",
    "Implement structured logging practices that enable effective search and aggregation",
  ],
  sortOrder: 612,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "obs-s1",
      title: "Choosing an Observability Strategy",
      context:
        "A fintech startup is migrating from a monolith to 14 microservices running on Kubernetes. The current monitoring setup is CloudWatch metrics and application logs written to files on EC2 instances. Debugging production issues currently takes 2-4 hours because engineers must SSH into instances and grep through log files. The team wants to reduce mean time to diagnosis (MTTD) to under 15 minutes.",
      displayFields: [
        { label: "Architecture", value: "14 microservices on Kubernetes (migrating from monolith)", emphasis: "normal" },
        { label: "Current Monitoring", value: "CloudWatch metrics + log files on EC2", emphasis: "warn" },
        { label: "Current MTTD", value: "2-4 hours (SSH + grep)", emphasis: "critical" },
        { label: "Target MTTD", value: "< 15 minutes", emphasis: "normal" },
        { label: "Team Size", value: "12 engineers", emphasis: "normal" },
      ],
      actions: [
        { id: "three-pillars-otel", label: "Implement all three pillars using OpenTelemetry: structured logs to centralized store, distributed traces with context propagation, and metrics with service-level dashboards — correlated via trace IDs", color: "green" },
        { id: "metrics-only", label: "Focus on metrics only — deploy Prometheus and Grafana for all 14 services with detailed dashboards", color: "yellow" },
        { id: "logs-only", label: "Centralize logs using ELK stack (Elasticsearch, Logstash, Kibana) and add structured logging to all services", color: "orange" },
        { id: "apm-vendor-lock", label: "Purchase a full APM suite from a single vendor and instrument all services with their proprietary agent", color: "blue" },
      ],
      correctActionId: "three-pillars-otel",
      rationales: [
        { id: "r-obs-s1-correct", text: "In a 14-service microservices architecture, a single request traverses multiple services. Metrics tell you something is wrong, logs tell you what happened in a single service, but only distributed traces show the full request path across all 14 services. OpenTelemetry provides vendor-neutral instrumentation for all three pillars, and correlating them via trace IDs enables the 'click from alert to trace to relevant logs' workflow that reduces MTTD from hours to minutes." },
        { id: "r-obs-s1-metrics", text: "Metrics alone show symptoms (latency spike, error rate increase) but not causes. When a payment request fails across 5 services, metrics tell you which service is slow but not why. Without traces and correlated logs, engineers still need to manually piece together the request path — keeping MTTD high." },
        { id: "r-obs-s1-logs", text: "Centralized logs are a major improvement over SSH-and-grep, but in a microservices architecture, a single user request generates log entries in multiple services. Without trace IDs to correlate them, engineers must manually search by timestamp or request ID across 14 services — better than SSH, but still slow for the 15-minute MTTD target." },
        { id: "r-obs-s1-vendor", text: "A proprietary APM suite can deliver all three pillars, but vendor lock-in is costly for a startup. OpenTelemetry provides the same instrumentation with the flexibility to switch backends as the company grows. Proprietary agents also add latency overhead and may not integrate well with the Kubernetes ecosystem." },
      ],
      correctRationaleId: "r-obs-s1-correct",
      feedback: {
        perfect: "Correct. All three pillars with OpenTelemetry correlation is the right strategy for a microservices migration targeting rapid diagnosis. Trace IDs are the glue that connects metrics alerts to traces to relevant log lines.",
        partial: "Your approach covers one pillar well but misses the cross-service correlation that microservices debugging demands. Metrics, logs, and traces each answer different questions — you need all three connected by trace IDs.",
        wrong: "A 14-service microservices architecture requires distributed tracing to follow requests across service boundaries. Single-pillar approaches cannot achieve the 15-minute MTTD target for cross-service issues.",
      },
    },
    {
      type: "action-rationale",
      id: "obs-s2",
      title: "Trace Context Propagation Design",
      context:
        "The team has deployed OpenTelemetry collectors and instrumented 10 of 14 services. Traces are flowing into Jaeger, but engineers report that traces frequently break at service boundaries — especially when requests pass through the message queue (Amazon SQS) between the order service and the fulfillment service. Spans from the fulfillment service appear as new root traces rather than children of the order service trace.",
      displayFields: [
        { label: "Instrumented Services", value: "10 of 14", emphasis: "normal" },
        { label: "Trace Backend", value: "Jaeger", emphasis: "normal" },
        { label: "Broken Boundary", value: "Order service → SQS → Fulfillment service", emphasis: "critical" },
        { label: "Symptom", value: "Fulfillment spans appear as separate root traces", emphasis: "critical" },
        { label: "Message Queue", value: "Amazon SQS (asynchronous)", emphasis: "warn" },
      ],
      actions: [
        { id: "propagate-via-message-attrs", label: "Inject the W3C traceparent header into SQS message attributes on the producer side, and extract it on the consumer side to continue the trace context across the async boundary", color: "green" },
        { id: "shared-request-id", label: "Generate a custom request ID in the order service and pass it as a message body field, then use it to manually correlate traces in Jaeger", color: "yellow" },
        { id: "skip-async-tracing", label: "Accept that async boundaries break traces and focus on making each service's traces self-contained with enough context to debug independently", color: "orange" },
        { id: "replace-sqs-with-sync", label: "Replace SQS with synchronous HTTP calls so trace context propagates automatically via HTTP headers", color: "red" },
      ],
      correctActionId: "propagate-via-message-attrs",
      rationales: [
        { id: "r-obs-s2-correct", text: "SQS message attributes support string key-value pairs, which is exactly what W3C trace context (traceparent header) needs. The OpenTelemetry SQS instrumentation library supports injecting trace context into message attributes on the producer side and extracting it on the consumer side. This creates a proper parent-child span relationship across the async boundary, preserving the full end-to-end trace without changing the architecture." },
        { id: "r-obs-s2-request-id", text: "A custom request ID enables manual correlation but does not create proper parent-child span relationships in Jaeger. Engineers must search by the custom ID rather than clicking through a connected trace waterfall. This is a workaround, not a solution — OpenTelemetry natively supports context propagation through message systems." },
        { id: "r-obs-s2-skip", text: "Accepting broken traces across async boundaries means accepting that the most complex debugging scenarios (cross-service, async workflows) remain unobservable. These are precisely the scenarios where distributed tracing provides the most value. Giving up here undermines the entire observability investment." },
        { id: "r-obs-s2-sync", text: "Replacing SQS with synchronous calls changes the system architecture to solve an instrumentation problem. SQS provides decoupling, retry semantics, and backpressure — removing it to fix tracing introduces tight coupling and removes fault tolerance. The tracing problem should be solved at the instrumentation layer, not the architecture layer." },
      ],
      correctRationaleId: "r-obs-s2-correct",
      feedback: {
        perfect: "Correct. W3C traceparent propagation via SQS message attributes is the standard approach for maintaining trace context across async boundaries. The OpenTelemetry SQS instrumentation supports this natively.",
        partial: "A custom request ID provides some correlation but does not create proper trace relationships. Use the W3C traceparent standard in message attributes for native trace continuity.",
        wrong: "Never change system architecture to solve an instrumentation problem. SQS message attributes support trace context propagation — use them to maintain end-to-end traces across async boundaries.",
      },
    },
    {
      type: "action-rationale",
      id: "obs-s3",
      title: "Building Correlated Dashboards",
      context:
        "The observability stack is fully deployed. The team is now building Grafana dashboards for the on-call rotation. The goal is a dashboard that enables an on-call engineer to go from a PagerDuty alert to root cause identification in under 10 minutes. The team is debating how to structure the primary operations dashboard.",
      displayFields: [
        { label: "Dashboard Tool", value: "Grafana", emphasis: "normal" },
        { label: "Data Sources", value: "Prometheus (metrics), Loki (logs), Jaeger (traces)", emphasis: "normal" },
        { label: "Target Audience", value: "On-call engineers (varying experience levels)", emphasis: "normal" },
        { label: "Goal", value: "Alert → root cause in < 10 minutes", emphasis: "critical" },
        { label: "Services", value: "14 microservices", emphasis: "normal" },
      ],
      actions: [
        { id: "red-method-with-drilldown", label: "Structure around the RED method (Rate, Errors, Duration) per service at the top, with click-through drill-downs to exemplar traces, then to correlated log lines filtered by trace ID", color: "green" },
        { id: "single-mega-dashboard", label: "Build one large dashboard with all metrics from all 14 services displayed simultaneously so nothing is hidden", color: "red" },
        { id: "per-service-dashboards", label: "Create 14 separate per-service dashboards, each with detailed metrics, and let engineers navigate to the right one based on the alert", color: "yellow" },
        { id: "log-search-first", label: "Build a log search interface as the primary dashboard, since logs contain the most detailed information about errors", color: "orange" },
      ],
      correctActionId: "red-method-with-drilldown",
      rationales: [
        { id: "r-obs-s3-correct", text: "The RED method (Rate, Errors, Duration) provides a consistent framework for evaluating service health at a glance. Placing all 14 services' RED metrics on the landing view lets on-call engineers immediately spot which service is degraded. Click-through to exemplar traces shows the full request path of a failing request. Clicking from the trace to correlated logs (filtered by trace ID) reveals the exact error message. This three-level drill-down — metrics overview, trace detail, log context — is the standard observability workflow that achieves the 10-minute diagnosis target." },
        { id: "r-obs-s3-mega", text: "A dashboard showing all metrics from 14 services creates information overload. Dozens of panels competing for attention makes it harder, not easier, to spot anomalies. The human eye cannot scan 50+ graphs simultaneously. Effective dashboards are layered: high-level overview first, detail on demand." },
        { id: "r-obs-s3-per-service", text: "Per-service dashboards are valuable as the drill-down layer but not as the starting point. When an alert fires, the on-call engineer may not immediately know which service is the root cause — a downstream service may be failing because an upstream service is slow. The starting dashboard must show cross-service health to identify the actual origin." },
        { id: "r-obs-s3-log-search", text: "Logs are the most detailed signal but also the noisiest. Starting with log search requires the engineer to already know what to search for. Metrics overview first identifies the anomalous service; traces reveal the failing request path; only then do logs provide the specific error detail. Inverting this order wastes time searching through irrelevant log noise." },
      ],
      correctRationaleId: "r-obs-s3-correct",
      feedback: {
        perfect: "Excellent dashboard design. RED method overview → exemplar trace drill-down → correlated log search is the gold standard observability workflow for rapid incident diagnosis.",
        partial: "Per-service dashboards are useful but not as the starting point. Begin with a cross-service RED overview so on-call engineers can identify the degraded service before drilling into details.",
        wrong: "Effective observability dashboards are layered: high-level health overview first, then trace-level detail, then log-level context. Information overload and log-first approaches both slow down diagnosis.",
      },
    },
  ],
  hints: [
    "The three pillars of observability — metrics, logs, and traces — each answer different questions. Metrics detect anomalies, traces show request flow across services, and logs provide detailed context. Correlation via trace IDs connects all three.",
    "For async message queues like SQS, propagate W3C traceparent context through message attributes to maintain end-to-end trace continuity across service boundaries.",
    "The RED method (Rate, Errors, Duration) per service provides a consistent overview dashboard structure. Use drill-downs from metrics to traces to logs for the complete diagnosis workflow.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Observability engineering is one of the fastest-growing specializations in cloud operations. Engineers who can design correlated observability stacks — connecting metrics alerts to distributed traces to log context — dramatically reduce incident resolution time and are essential hires for any organization scaling microservices.",
  toolRelevance: ["OpenTelemetry", "Grafana", "Prometheus", "Jaeger", "Loki", "Datadog", "AWS X-Ray"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
