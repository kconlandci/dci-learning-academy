import type { LabManifest } from "../../types/manifest";

export const serverlessVsContainersLab: LabManifest = {
  schemaVersion: "1.1",
  id: "serverless-vs-containers",
  version: 1,
  title: "Serverless vs. Containers",
  tier: "intermediate",
  track: "cloud-architecture",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["serverless", "containers", "functions", "compute", "cost-optimization"],
  description:
    "Decide between serverless functions and container-based deployments for real-world workloads by evaluating cold start tolerance, execution duration, traffic patterns, and operational cost.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Identify workload characteristics that favor serverless over containers",
    "Explain cold start latency and its impact on user-facing workloads",
    "Compare cost models of per-invocation versus always-on compute",
    "Recognize when container orchestration overhead is justified",
  ],
  sortOrder: 404,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "svc-image-processing",
      title: "Image Processing Pipeline Compute Choice",
      context:
        "Your platform allows users to upload photos that must be resized to five standard dimensions and stored. Uploads are unpredictable — traffic spikes 20x during product launch events. Average processing time per upload is 3 seconds. The service is idle 70% of the day.",
      displayFields: [
        { label: "Avg Processing Time", value: "3 seconds per upload", emphasis: "normal" },
        { label: "Idle Time", value: "70% of day", emphasis: "warn" },
        { label: "Peak Spike", value: "20x baseline traffic", emphasis: "warn" },
        { label: "Cold Start Tolerance", value: "Acceptable (async processing)", emphasis: "normal" },
      ],
      actions: [
        { id: "serverless-fn", label: "Serverless function triggered by upload events, auto-scaled by the platform", color: "green" },
        { id: "always-on-containers", label: "Always-on container cluster sized for peak traffic", color: "red" },
        { id: "vm-fleet", label: "Dedicated VM fleet with manual scaling rules", color: "orange" },
        { id: "min-containers", label: "Container cluster with minimum replica count of 2, scaled by CPU metrics", color: "yellow" },
      ],
      correctActionId: "serverless-fn",
      rationales: [
        { id: "r-serverless", text: "Asynchronous image processing tolerates cold starts. With 70% idle time and 20x traffic spikes, serverless per-invocation billing eliminates cost for idle periods and scales instantly to any spike without pre-provisioning." },
        { id: "r-always-on", text: "Sizing always-on containers for 20x peak means paying for peak capacity 70% of the time it sits idle. For this workload the cost is an order of magnitude higher than serverless." },
        { id: "r-vm", text: "VM fleets have slower scale-out than containers and manual scaling rules cannot respond fast enough to a 20x spike. Idle VM cost is also high at 70% idle time." },
        { id: "r-min-containers", text: "A minimum-2 auto-scaled container cluster is a reasonable approach but still carries base cost during idle periods and auto-scaling lag on sudden spikes. For pure async processing serverless is simpler and cheaper." },
      ],
      correctRationaleId: "r-serverless",
      feedback: {
        perfect: "Correct. Spiky async workloads with high idle time are the ideal serverless use case — you pay only for execution and scale instantly.",
        partial: "Your compute choice can handle the workload but doesn't optimize cost effectively for the 70% idle period or the 20x spike pattern.",
        wrong: "Consider the cost model. Paying for always-on compute when the workload is idle 70% of the day and spikes unpredictably is not cost-efficient.",
      },
    },
    {
      type: "action-rationale",
      id: "svc-low-latency-api",
      title: "Low-Latency Customer-Facing API",
      context:
        "Your mobile app's home screen makes an API call on every open. Users abandon if the response exceeds 400ms. The API aggregates data from three backend services. Traffic is relatively steady at 500 req/s baseline with a 3x morning spike. Your team has measured serverless cold starts for this runtime at 800–1,200ms.",
      displayFields: [
        { label: "Latency Budget", value: "< 400ms P99", emphasis: "critical" },
        { label: "Serverless Cold Start", value: "800–1,200ms", emphasis: "critical" },
        { label: "Baseline Traffic", value: "500 req/s steady", emphasis: "normal" },
        { label: "Morning Spike", value: "3x (1,500 req/s)", emphasis: "warn" },
      ],
      actions: [
        { id: "containers-api", label: "Containerized API service with pre-warmed replicas and horizontal pod autoscaling", color: "green" },
        { id: "serverless-warm", label: "Serverless function with provisioned concurrency to pre-warm instances", color: "yellow" },
        { id: "serverless-cold", label: "Standard serverless function without concurrency warming", color: "red" },
        { id: "edge-cdn", label: "Serve the home screen data from a CDN edge cache with a 60-second TTL", color: "orange" },
      ],
      correctActionId: "containers-api",
      rationales: [
        { id: "r-containers", text: "Steady traffic at 500 req/s justifies always-on containers. Pre-warmed replicas guarantee sub-400ms response time without cold start risk, and HPA handles the predictable 3x morning spike with minimal scale-out lag." },
        { id: "r-warm-serverless", text: "Provisioned concurrency eliminates cold starts but at a cost approaching always-on containers. For steady 500 req/s traffic, containers typically offer better cost and more predictable performance." },
        { id: "r-cold-serverless", text: "Cold starts of 800–1,200ms directly violate the 400ms latency budget. Any scale event or traffic lull causing instance recycling would degrade user experience and increase abandonment." },
        { id: "r-cdn", text: "CDN caching works well for static or semi-static content but a 60-second TTL means personalized home screen data is stale. Aggregated personalized API responses are generally not suitable for CDN caching." },
      ],
      correctRationaleId: "r-containers",
      feedback: {
        perfect: "Correct. Steady traffic with a hard latency budget below the cold start baseline makes containers the clear choice for this user-facing API.",
        partial: "Your approach can meet the latency target under some conditions but introduces cost inefficiency or latency risk during scale events.",
        wrong: "The cold start measurement is the key clue. If cold starts exceed the latency budget, standard serverless cannot reliably serve this endpoint.",
      },
    },
    {
      type: "action-rationale",
      id: "svc-batch-ml",
      title: "Nightly ML Batch Scoring Job",
      context:
        "A machine learning model scores 2 million customer records every night at 02:00 UTC. The job runs for 90 minutes. It requires 16 vCPUs and 64 GB RAM at peak. The job runs once per day and the infrastructure sits completely idle for the remaining 22.5 hours.",
      displayFields: [
        { label: "Job Duration", value: "90 minutes nightly", emphasis: "normal" },
        { label: "Compute Requirement", value: "16 vCPU / 64 GB RAM", emphasis: "warn" },
        { label: "Idle Time", value: "22.5 hours per day (94%)", emphasis: "critical" },
        { label: "Max Function Timeout", value: "15 minutes (most serverless platforms)", emphasis: "warn" },
      ],
      actions: [
        { id: "container-job", label: "Scheduled container job that spins up at 02:00, runs for 90 minutes, then terminates", color: "green" },
        { id: "serverless-fn2", label: "Serverless function invoked on a cron schedule", color: "red" },
        { id: "always-on-vm", label: "Always-on VM sized for the job's peak requirements", color: "orange" },
        { id: "managed-ml", label: "Managed ML batch compute service with on-demand job scheduling", color: "blue" },
      ],
      correctActionId: "container-job",
      rationales: [
        { id: "r-container-job", text: "A scheduled container job provides the required compute profile (16 vCPU / 64 GB), runs for the full 90 minutes, and terminates after completion — paying only for 90 minutes of compute per day. This is significantly cheaper than always-on infrastructure." },
        { id: "r-fn-batch", text: "Most serverless platforms cap execution time at 15 minutes. A 90-minute job cannot complete within this limit, making standard serverless functions architecturally incompatible with this workload." },
        { id: "r-always-vm", text: "An always-on VM paid for 24 hours to run a 90-minute job wastes 94% of its compute budget. At the required 16 vCPU / 64 GB specification, this is a significant unnecessary cost." },
        { id: "r-managed-ml", text: "Managed ML batch services (e.g., AWS Batch, Azure ML Compute) are an excellent alternative and may be the most operationally convenient choice, though they typically use containers under the hood and carry per-job overhead fees." },
      ],
      correctRationaleId: "r-container-job",
      feedback: {
        perfect: "Correct. The 90-minute duration exceeds serverless limits, and the 94% idle time makes always-on infrastructure wasteful. Scheduled container jobs are purpose-built for this pattern.",
        partial: "Your compute choice can handle the job but doesn't optimally address either the execution duration limit or the idle cost issue.",
        wrong: "Check the execution time constraint — serverless functions have maximum timeout limits that make them structurally incompatible with this job duration.",
      },
    },
  ],
  hints: [
    "If cold start latency exceeds your P99 budget, standard serverless is not viable for that endpoint — check provisioned concurrency costs against always-on containers.",
    "Serverless functions on most platforms time out at 15 minutes — any job longer than that cannot use standard serverless.",
    "Calculate idle cost: if a workload is idle more than 50% of the time, serverless per-invocation billing is almost always cheaper than always-on compute.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "The serverless-vs-containers decision appears in virtually every cloud architecture interview and design review. The ability to quickly profile a workload — execution duration, traffic pattern, latency tolerance — and map it to the right compute model signals practical cloud experience beyond certification-level knowledge.",
  toolRelevance: [
    "AWS Lambda",
    "AWS Fargate",
    "Azure Container Apps",
    "Azure Functions",
    "Google Cloud Run",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
