import type { LabManifest } from "../../types/manifest";

export const ec2InstanceSizingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "ec2-instance-sizing",
  version: 1,
  title: "EC2 Instance Sizing",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "ec2", "compute", "sizing", "cost-optimization"],
  description:
    "Choose the right EC2 instance type and size for different workloads based on CPU, memory, and cost requirements.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Evaluate workload requirements to select appropriate instance families",
    "Balance performance needs against cost constraints",
    "Justify instance choices with technical reasoning",
    "Identify when to scale vertically versus horizontally",
  ],
  sortOrder: 100,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "ec2-sizing-s1",
      title: "Underpowered Web Server",
      context:
        "A Node.js API serving 200 concurrent users is running on a t3.micro. CloudWatch shows CPU consistently at 95% with 400ms average response times. Memory usage is at 40%. Users are reporting timeouts during peak hours.",
      displayFields: [
        { label: "Instance Type", value: "t3.micro (2 vCPU, 1 GB RAM)", emphasis: "warn" },
        { label: "CPU Utilization", value: "95% sustained", emphasis: "critical" },
        { label: "Memory Utilization", value: "40%", emphasis: "normal" },
        { label: "Network In/Out", value: "12 MB/s / 8 MB/s", emphasis: "normal" },
        { label: "Avg Response Time", value: "400ms (target: <100ms)", emphasis: "critical" },
      ],
      actions: [
        { id: "upgrade-c5-large", label: "Upgrade to c5.large (2 vCPU, 4 GB RAM)", color: "green" },
        { id: "upgrade-m5-large", label: "Upgrade to m5.large (2 vCPU, 8 GB RAM)", color: "yellow" },
        { id: "upgrade-r5-large", label: "Upgrade to r5.large (2 vCPU, 16 GB RAM)", color: "orange" },
        { id: "add-more-t3-micro", label: "Add 3 more t3.micro behind a load balancer", color: "blue" },
      ],
      correctActionId: "upgrade-c5-large",
      rationales: [
        { id: "r-cpu-bound", text: "The bottleneck is CPU (95%), not memory (40%). The c5 family is compute-optimized, offering the best CPU performance per dollar for this workload." },
        { id: "r-memory-overkill", text: "Memory is only at 40%, so moving to r5 (memory-optimized) wastes budget on RAM the application doesn't need." },
        { id: "r-horizontal-complex", text: "Horizontal scaling adds operational complexity (sticky sessions, state management) and may not be cost-effective at this traffic level." },
        { id: "r-m5-balanced", text: "m5 is a good general-purpose choice but costs more than c5 for workloads that are purely CPU-constrained." },
      ],
      correctRationaleId: "r-cpu-bound",
      feedback: {
        perfect: "Correct. CPU saturation with low memory usage is the textbook case for a compute-optimized instance. The c5.large doubles the effective CPU headroom without paying for excess memory.",
        partial: "You identified the right problem but chose a more expensive path. When the bottleneck is clearly CPU and memory is underutilized, compute-optimized (c5) beats general-purpose (m5) on cost.",
        wrong: "Review the metrics: CPU is the constraint at 95%, not memory. r5 and m5 both overprovision memory. Horizontal scaling with t3.micro would just replicate the CPU bottleneck across more instances.",
      },
    },
    {
      type: "action-rationale",
      id: "ec2-sizing-s2",
      title: "In-Memory Cache Server",
      context:
        "An application uses a self-managed Redis-compatible cache on EC2. The instance is an m5.xlarge. CloudWatch shows CPU at 12%, but the application logs report frequent OOM (out-of-memory) errors and cache eviction rates have spiked to 8,000/min. The dataset being cached is 28 GB.",
      displayFields: [
        { label: "Instance Type", value: "m5.xlarge (4 vCPU, 16 GB RAM)", emphasis: "warn" },
        { label: "CPU Utilization", value: "12%", emphasis: "normal" },
        { label: "Memory Utilization", value: "98%", emphasis: "critical" },
        { label: "Cache Eviction Rate", value: "8,000/min", emphasis: "critical" },
        { label: "Dataset Size", value: "~28 GB", emphasis: "warn" },
      ],
      actions: [
        { id: "upgrade-m5-4xlarge", label: "Upgrade to m5.4xlarge (16 vCPU, 64 GB RAM)", color: "yellow" },
        { id: "upgrade-r5-xlarge", label: "Upgrade to r5.xlarge (4 vCPU, 32 GB RAM)", color: "green" },
        { id: "upgrade-c5-4xlarge", label: "Upgrade to c5.4xlarge (16 vCPU, 32 GB RAM)", color: "orange" },
        { id: "add-ssd-swap", label: "Add EBS swap space to extend virtual memory", color: "red" },
      ],
      correctActionId: "upgrade-r5-xlarge",
      rationales: [
        { id: "r-mem-optimized", text: "CPU is idle at 12% — the only constraint is RAM. The r5 family is memory-optimized, giving 32 GB at the xlarge size for less cost than an m5.4xlarge with 16x the CPU." },
        { id: "r-m5-overprovisioned", text: "m5.4xlarge gives 16 vCPU which the workload doesn't need. You pay a premium for CPU capacity that sits at 12% utilization." },
        { id: "r-swap-harmful", text: "EBS swap for in-memory caches causes severe latency degradation. Cache performance depends on RAM access speeds, not disk speeds." },
        { id: "r-c5-wrong-family", text: "c5 is compute-optimized — the opposite of what's needed here. It would give 32 GB RAM but at a higher price than r5 for the same memory." },
      ],
      correctRationaleId: "r-mem-optimized",
      feedback: {
        perfect: "Excellent. Memory-optimized instances (r5) are designed exactly for this: high memory, low CPU ratio. You get 32 GB of RAM at a lower cost than scaling the m5 family for memory alone.",
        partial: "You addressed the memory problem but not efficiently. The r5.xlarge provides 32 GB RAM at the same vCPU count as the current instance, with better memory-to-cost ratio than m5.4xlarge.",
        wrong: "The problem is clearly memory exhaustion, not CPU. EBS swap is catastrophic for cache workloads. Match the instance family to the bottleneck: memory-constrained workloads belong on r5.",
      },
    },
    {
      type: "action-rationale",
      id: "ec2-sizing-s3",
      title: "Batch Processing Job",
      context:
        "A nightly ETL job processes 500 GB of CSV files using a Python script. The job currently runs on an m5.2xlarge and takes 6 hours. It needs to complete within 2 hours to meet a business SLA. The job is CPU-bound during transformation and runs only from 11pm–5am.",
      displayFields: [
        { label: "Instance Type", value: "m5.2xlarge (8 vCPU, 32 GB RAM)", emphasis: "normal" },
        { label: "Job Duration", value: "6 hours (SLA: 2 hours)", emphasis: "critical" },
        { label: "CPU Profile", value: "CPU-bound transformation, single-threaded", emphasis: "warn" },
        { label: "Run Schedule", value: "11pm–5am nightly", emphasis: "normal" },
        { label: "Data Volume", value: "500 GB CSV input", emphasis: "normal" },
      ],
      actions: [
        { id: "upgrade-m5-16xlarge", label: "Upgrade to m5.16xlarge (64 vCPU, 256 GB RAM)", color: "orange" },
        { id: "refactor-parallel", label: "Refactor job to parallelize across 8 workers on the same instance", color: "green" },
        { id: "use-spot-fleet", label: "Move to a Spot Fleet with 4x m5.2xlarge instances", color: "yellow" },
        { id: "upgrade-c5n-18xlarge", label: "Upgrade to c5n.18xlarge for maximum single-instance throughput", color: "red" },
      ],
      correctActionId: "refactor-parallel",
      rationales: [
        { id: "r-parallelize", text: "The job is single-threaded on an 8-vCPU instance — CPU utilization is effectively 12.5% of available capacity. Parallelizing the transformation across all 8 cores can reduce runtime by up to 7x without any instance change." },
        { id: "r-more-cores-wasted", text: "Upgrading to a larger instance without fixing the single-threaded bottleneck just means more idle vCPUs at higher cost. The limiting factor is the code, not the hardware." },
        { id: "r-spot-coordination", text: "A Spot Fleet adds distributed coordination complexity (data partitioning, failure handling) and Spot interruption risk. Parallelism on the existing instance is simpler and free." },
        { id: "r-c5n-overkill", text: "The c5n family is optimized for network throughput. This job is CPU-bound during transformation, not network-bound reading local data." },
      ],
      correctRationaleId: "r-parallelize",
      feedback: {
        perfect: "Spot on. The instance already has 8 vCPUs that a single-threaded job barely uses. Parallelizing is the highest-ROI fix — zero cost increase, potentially 6x+ speedup to comfortably meet the 2-hour SLA.",
        partial: "Scaling hardware can work, but it ignores the root cause: a single-threaded job can't use extra cores. Fix the code first, then right-size hardware if needed.",
        wrong: "More vCPUs don't help a single-threaded workload. The job is using roughly 1/8th of available CPU. The fix is in the application code, not the instance size.",
      },
    },
  ],
  hints: [
    "Look at which resource (CPU, memory, network) is actually saturated before choosing an instance family.",
    "Instance families are specialized: c5=compute, m5=general, r5=memory, i3=storage. Match the bottleneck to the family.",
    "Adding more instances (horizontal scaling) only helps if the bottleneck is throughput, not single-process resource limits.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Instance sizing is one of the most common cost optimization levers in AWS. Engineers who can read CloudWatch metrics and map them to the right instance family save their companies thousands of dollars monthly. This skill shows up constantly in AWS Well-Architected reviews and FinOps discussions.",
  toolRelevance: ["AWS Console", "AWS CLI", "CloudWatch", "AWS Compute Optimizer"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
