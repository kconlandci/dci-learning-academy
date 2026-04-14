import type { LabManifest } from "../../types/manifest";

export const gcpDataflowPipelineLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-dataflow-pipeline",
  version: 1,
  title: "Dataflow Streaming and Batch Pipelines",
  tier: "advanced",
  track: "gcp-essentials",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["gcp", "dataflow", "apache-beam", "streaming", "batch", "windowing", "autoscaling"],
  description:
    "Design and troubleshoot Google Cloud Dataflow pipelines for streaming and batch workloads. Practice windowing strategies, handle late data with allowed lateness, tune autoscaling, and choose between batch and streaming execution modes.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Select the correct windowing strategy for a given streaming analytics use case",
    "Configure allowed lateness and accumulation mode to handle out-of-order events",
    "Diagnose Dataflow pipeline bottlenecks using worker utilization and system lag metrics",
    "Choose between batch and streaming execution modes based on latency and cost requirements",
    "Tune autoscaling parameters to balance throughput and cost",
  ],
  sortOrder: 314,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "df-s1-windowing-strategy",
      title: "Choosing a Windowing Strategy for Clickstream Analytics",
      context:
        "Your team is building a real-time clickstream analytics pipeline using Dataflow. Events arrive from Pub/Sub with event-time timestamps. The product team needs per-user session metrics — total clicks, pages viewed, and session duration — where a session ends after 30 minutes of user inactivity. Events can arrive up to 10 minutes late.",
      displayFields: [
        { label: "Source", value: "Cloud Pub/Sub — clickstream events (50K events/sec)", emphasis: "normal" },
        { label: "Session Definition", value: "30-minute inactivity gap ends a session", emphasis: "warn" },
        { label: "Late Data", value: "Events arrive up to 10 minutes after event time", emphasis: "warn" },
        { label: "Output", value: "Per-user session aggregates to BigQuery", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Use fixed windows of 30 minutes with 10 minutes of allowed lateness", color: "yellow" },
        { id: "a2", label: "Use session windows with a 30-minute gap duration and 10 minutes of allowed lateness with accumulating mode", color: "green" },
        { id: "a3", label: "Use sliding windows of 30 minutes with a 1-minute slide period", color: "red" },
        { id: "a4", label: "Use global windows with periodic triggers every 30 minutes", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Fixed windows split time into rigid 30-minute blocks regardless of user activity. A user active from minute 25 to minute 35 would be split across two windows, producing incorrect session metrics." },
        { id: "r2", text: "Session windows dynamically group events per key (user_id) based on an inactivity gap. A 30-minute gap duration matches the session definition, and accumulating mode with 10-minute allowed lateness correctly incorporates late-arriving events into existing session aggregates." },
        { id: "r3", text: "Sliding windows produce overlapping results and are designed for moving averages, not session detection. Each event appears in multiple windows, inflating click counts." },
        { id: "r4", text: "Global windows with periodic triggers accumulate all events ever seen per user. Without a gap-based boundary, there is no concept of session separation." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Session windows with gap duration are the only windowing strategy that dynamically detects user session boundaries based on inactivity periods.",
        partial: "Fixed windows can approximate sessions but produce incorrect boundaries when user activity spans window edges. Session windows are the precise tool for gap-based session detection.",
        wrong: "This windowing strategy doesn't model user sessions correctly. Session windows are specifically designed for the inactivity-gap session pattern you need.",
      },
    },
    {
      type: "action-rationale",
      id: "df-s2-backlog-bottleneck",
      title: "Streaming Pipeline Falling Behind — Growing Backlog",
      context:
        "A production Dataflow streaming pipeline that processes IoT sensor readings has developed a growing system lag. The Pub/Sub subscription backlog has grown from 0 to 45 million unacknowledged messages over 6 hours. The pipeline was processing 20,000 messages/sec but throughput dropped to 3,000 messages/sec. Dataflow autoscaling is enabled but has not added workers beyond the current 8.",
      displayFields: [
        { label: "Current Workers", value: "8 (autoscaling range: 1–50)", emphasis: "normal" },
        { label: "CPU Utilization", value: "22% average across workers", emphasis: "warn" },
        { label: "System Lag", value: "6 hours and growing", emphasis: "critical" },
        { label: "Throughput", value: "Dropped from 20K to 3K msg/sec", emphasis: "critical" },
        { label: "Pipeline Step", value: "GroupByKey on device_id taking 95% of processing time", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Manually increase the number of workers to 50 to handle the backlog", color: "yellow" },
        { id: "a2", label: "Investigate and fix the hot key in the GroupByKey step causing data skew, then let autoscaling respond", color: "green" },
        { id: "a3", label: "Switch the pipeline from streaming to batch mode to process the backlog faster", color: "red" },
        { id: "a4", label: "Increase the machine type of each worker from n1-standard-4 to n1-standard-16", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Adding workers won't help because CPU is only at 22% — the bottleneck is data skew in GroupByKey, not worker count. A hot key concentrates work on a single worker regardless of total workers." },
        { id: "r2", text: "The 22% average CPU with GroupByKey consuming 95% of time indicates severe key skew — one device_id has disproportionate data. Fixing the hot key (e.g., adding a combiner or salting the key) distributes work evenly, allowing autoscaling to add workers effectively." },
        { id: "r3", text: "Streaming pipelines cannot be switched to batch mode without stopping and restarting with a different runner configuration. This would lose the current pipeline state and not address the root cause." },
        { id: "r4", text: "Larger machines don't help when the bottleneck is a single hot key — the skewed partition runs on one worker regardless of machine size." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Low CPU with high system lag and a dominant GroupByKey step is the classic signature of key skew. Fixing the hot key is the only solution that addresses the root cause.",
        partial: "Adding resources won't solve a data skew problem. When one key concentrates all work on a single worker, the fix must address the skew itself, not the cluster size.",
        wrong: "The metrics clearly indicate a hot key problem, not a resource shortage. CPU is at 22% because most workers are idle while one handles a disproportionate partition.",
      },
    },
    {
      type: "action-rationale",
      id: "df-s3-batch-vs-streaming",
      title: "Choosing Between Batch and Streaming for Daily Reports",
      context:
        "The finance team needs a daily revenue reconciliation report generated from transaction events stored in Cloud Pub/Sub. The report must include all transactions from the previous calendar day (midnight to midnight UTC) and be available by 02:00 UTC. Transaction volume is 2 million events per day. The current batch pipeline processes a BigQuery export and takes 45 minutes. A team member proposes migrating to a Dataflow streaming pipeline for lower latency.",
      displayFields: [
        { label: "Report Window", value: "Previous calendar day (00:00–23:59 UTC)", emphasis: "normal" },
        { label: "Deadline", value: "Report ready by 02:00 UTC", emphasis: "normal" },
        { label: "Volume", value: "~2 million transactions/day", emphasis: "normal" },
        { label: "Current Batch Time", value: "45 minutes (well within deadline)", emphasis: "normal" },
        { label: "Streaming Cost Estimate", value: "3.2x more expensive than batch for same workload", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Keep the batch pipeline — the 2-hour SLA is easily met and streaming adds unnecessary cost", color: "green" },
        { id: "a2", label: "Migrate to streaming for lower latency and real-time reconciliation updates", color: "orange" },
        { id: "a3", label: "Run both batch and streaming in parallel for redundancy", color: "red" },
        { id: "a4", label: "Replace the pipeline with a scheduled BigQuery SQL query using scheduled queries", color: "yellow" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "The batch pipeline completes in 45 minutes against a 2-hour SLA with 2 million events — well within tolerance. Streaming would cost 3.2x more with no business benefit since the report is only consumed once daily." },
        { id: "r2", text: "Streaming pipelines are ideal when business value depends on sub-minute latency. A daily report consumed at 02:00 UTC derives no value from real-time processing — batch is the correct execution mode." },
        { id: "r3", text: "Running parallel pipelines doubles cost and operational complexity for a workload that has a comfortable SLA margin." },
        { id: "r4", text: "A scheduled BigQuery query could work but removes the Dataflow pipeline's ability to handle data quality checks, transformations, and dead-letter routing that reconciliation reports require." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Not every pipeline should be streaming. Batch is the right choice when the SLA is comfortably met and streaming would only add cost without business value.",
        partial: "Streaming is a powerful tool but an expensive one. Always evaluate whether the business latency requirement justifies the cost difference over batch.",
        wrong: "The report is consumed once daily with a 2-hour SLA. Streaming adds 3.2x cost for zero business benefit. Match the processing model to the consumption pattern.",
      },
    },
  ],
  hints: [
    "Session windows are the only Beam windowing strategy that dynamically groups elements based on an inactivity gap. Use them when a 'session' is defined by periods of activity separated by idle time.",
    "When a Dataflow streaming pipeline has low CPU utilization but high system lag, the bottleneck is almost always data skew in a GroupByKey or CoGroupByKey step. Look for hot keys.",
    "Streaming pipelines cost more than batch for the same data volume because they maintain state and run continuously. Only use streaming when the business requires sub-minute or sub-second latency.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Dataflow and Apache Beam expertise is a differentiator for data engineering roles at GCP-centric organizations. The ability to choose between batch and streaming, diagnose pipeline bottlenecks, and design correct windowing strategies is tested on the Google Cloud Professional Data Engineer certification and valued in real-time analytics teams.",
  toolRelevance: ["Google Cloud Dataflow", "Apache Beam", "Cloud Pub/Sub", "BigQuery", "Cloud Monitoring", "Dataflow Job Metrics"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
