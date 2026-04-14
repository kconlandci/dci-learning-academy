import type { LabManifest } from "../../types/manifest";

export const azureVmScalingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-vm-scaling",
  version: 1,
  title: "Azure VM Scaling",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "vm", "scaling", "autoscale", "vmss"],
  description:
    "Determine the right scaling strategy for Azure VMs based on workload patterns and budget constraints.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Distinguish between vertical scaling (resize) and horizontal scaling (VMSS) for Azure VMs",
    "Identify when autoscale rules based on CPU or memory metrics are appropriate",
    "Select the correct scale-in/scale-out thresholds to prevent flapping",
  ],
  sortOrder: 200,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "E-commerce Flash Sale Spike",
      context:
        "Your e-commerce application runs on a single Standard_D4s_v3 VM (4 vCPUs, 16 GB RAM). During a scheduled 2-hour flash sale, CPU utilization spikes to 95% and response times exceed 8 seconds. Outside sale hours, CPU stays around 15%.",
      displayFields: [
        { label: "Current VM Size", value: "Standard_D4s_v3 (4 vCPU / 16 GB)" },
        { label: "Peak CPU Utilization", value: "95%" },
        { label: "Baseline CPU Utilization", value: "15%" },
        { label: "Peak Duration", value: "2 hours (scheduled)" },
        { label: "Response Time at Peak", value: "8.2 seconds" },
        { label: "SLA Target", value: "< 2 seconds response time" },
      ],
      evidence: [
        "Azure Monitor: CPU % over 7 days — flat at ~15%, two sharp 2-hour spikes at 95% on Tue and Fri aligned with sale windows.",
        "Azure Portal > VM > Metrics > CPU Percentage: Max 95.4%, Avg 18.2%, Min 3.1% over last 7 days.",
      ],
      actions: [
        {
          id: "action-a",
          label: "Resize VM to Standard_D16s_v3 (16 vCPU) permanently",
          color: "yellow",
        },
        {
          id: "action-b",
          label: "Deploy a VM Scale Set with autoscale rules (scale out at 70% CPU, scale in at 25% CPU)",
          color: "green",
        },
        {
          id: "action-c",
          label: "Add a second identical VM behind a load balancer with no autoscale",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Increase VM disk IOPS by switching to Premium SSD",
          color: "red",
        },
      ],
      correctActionId: "action-b",
      rationales: [
        {
          id: "rationale-a",
          text: "Permanently resizing to a 16-vCPU VM eliminates the spike but wastes ~75% of compute for the 22 hours per day the VM sits idle at 15% CPU. Monthly costs quadruple with no benefit outside sale windows.",
        },
        {
          id: "rationale-b",
          text: "A VM Scale Set with metric-based autoscale is the ideal pattern: instances scale out before peak demand (scale-out trigger at 70% gives headroom) and scale back in when the sale ends (25% scale-in avoids premature removal). Cost tracks actual demand.",
        },
        {
          id: "rationale-c",
          text: "Two static VMs halve the peak load per instance but still over-provision during idle periods. Without autoscale you pay for a second VM 24/7 while it sits unused 22 of every 24 hours.",
        },
        {
          id: "rationale-d",
          text: "The bottleneck is CPU (95%), not disk I/O. Upgrading storage tiers will not reduce CPU utilization or response time during compute-bound peaks.",
        },
      ],
      correctRationaleId: "rationale-b",
      feedback: {
        perfect:
          "Correct. VMSS autoscale is purpose-built for predictable demand spikes — it scales out before saturation and scales in to eliminate idle cost.",
        partial:
          "You identified a scaling option, but static over-provisioning or wrong bottleneck fixes will hurt cost efficiency without solving the root cause.",
        wrong:
          "Upgrading disk does not address a CPU bottleneck. Always match your scaling strategy to the actual constrained resource.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Autoscale Flapping — Too Aggressive Thresholds",
      context:
        "A VM Scale Set running a REST API has autoscale configured: scale out when CPU > 60% for 1 minute, scale in when CPU < 55% for 1 minute. Operations reports that VMs are constantly cycling on and off every few minutes, causing brief request failures during instance deprovisioning.",
      displayFields: [
        { label: "Scale-Out Threshold", value: "CPU > 60% for 1 min" },
        { label: "Scale-In Threshold", value: "CPU < 55% for 1 min" },
        { label: "Instance Count", value: "Oscillating between 2 and 5" },
        { label: "Cooldown Period", value: "1 minute" },
        { label: "Observed Behavior", value: "Scale events every 3–5 minutes" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Widen the threshold gap: scale out at 75% CPU, scale in at 30% CPU; extend cooldown to 5 minutes",
          color: "green",
        },
        {
          id: "action-b",
          label: "Reduce the cooldown to 30 seconds to react faster",
          color: "red",
        },
        {
          id: "action-c",
          label: "Remove the scale-in rule entirely so instances only ever increase",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Switch from CPU-based autoscale to a fixed schedule",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The 5% gap between 60% (out) and 55% (in) thresholds is too narrow — normal CPU variance crosses both thresholds repeatedly, causing flapping. Widening to a 45-percentage-point gap (75% out / 30% in) and extending cooldown to 5 minutes gives the system time to stabilize after each scaling event.",
        },
        {
          id: "rationale-b",
          text: "Shortening the cooldown makes flapping worse: instances scale out, the metric briefly dips, the in-rule fires before the new instance is even ready, and the cycle repeats faster.",
        },
        {
          id: "rationale-c",
          text: "Removing the scale-in rule stops flapping but leads to uncontrolled instance sprawl and runaway costs. You need both directions — just with a safe gap.",
        },
        {
          id: "rationale-d",
          text: "Schedule-based scaling works for predictable patterns but not for a REST API with variable organic traffic. Metric-based scaling with corrected thresholds is the right solution here.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Exactly right. Flapping is the classic symptom of thresholds set too close together. Widen the gap and extend the cooldown to create a stable dead-band.",
        partial:
          "You recognized the flapping problem but chose a fix that either worsens instability or ignores cost.",
        wrong:
          "Reducing cooldown periods accelerates flapping rather than resolving it. Understanding threshold gaps is essential for production autoscale.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Single VM vs. Availability Zone Resilience",
      context:
        "A finance team runs a critical reporting workload on a single Standard_D8s_v3 VM in East US. The VM suffered two unplanned outages last quarter (Azure datacenter maintenance events) totalling 4 hours of downtime. The team has a 99.9% uptime SLA with customers.",
      displayFields: [
        { label: "Current Architecture", value: "Single VM, no redundancy" },
        { label: "Azure SLA for Single VM", value: "99.9% (Premium SSD required)" },
        { label: "Azure SLA for 2+ VMs in Availability Zones", value: "99.99%" },
        { label: "Actual Downtime Last Quarter", value: "4 hours (2 incidents)" },
        { label: "Customer SLA Requirement", value: "99.9% uptime" },
        { label: "Workload Type", value: "Stateful batch reporting (not web traffic)" },
      ],
      evidence: [
        "Incident 1 (Jan 14): Host node hardware failure — VM restarted on new host after 2h 10m. Incident 2 (Feb 28): Planned host maintenance window — VM offline 1h 45m.",
      ],
      actions: [
        {
          id: "action-a",
          label: "Deploy two identical VMs across Availability Zones 1 and 2 with Azure Load Balancer",
          color: "green",
        },
        {
          id: "action-b",
          label: "Move the single VM to a Premium SSD managed disk to qualify for 99.9% SLA",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Enable Azure Backup on the current VM to recover quickly from outages",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Purchase Azure Reserved Instance to guarantee uptime",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Distributing two VMs across Availability Zones provides 99.99% SLA because each zone has independent power, cooling, and networking. A zone failure takes out at most one VM while the load balancer redirects traffic to the other — the exact failure mode that caused both incidents.",
        },
        {
          id: "rationale-b",
          text: "Premium SSD qualifies the single VM for the 99.9% SLA on paper, but this is a platform commitment — not a guarantee against host failures or maintenance windows. The actual outages would still have occurred.",
        },
        {
          id: "rationale-c",
          text: "Azure Backup enables point-in-time restore, not high availability. Restoring from backup typically takes 30–90 minutes and does not prevent downtime during an outage.",
        },
        {
          id: "rationale-d",
          text: "Reserved Instances are a billing commitment (cost discount) and have absolutely no impact on VM availability or SLA.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Availability Zones are the right tool for zone-fault resilience and the 99.99% SLA requires VMs to span at least two zones.",
        partial:
          "Your choice improves the situation but does not address the actual failure mode. SLA paperwork and backup aren't the same as active redundancy.",
        wrong:
          "Reserved Instances are a pricing model, not an availability feature. Never conflate cost commitments with uptime guarantees.",
      },
    },
  ],
  hints: [
    "Compare the cost of permanent over-provisioning against dynamic autoscale when CPU utilization is only high for a predictable 2-hour window.",
    "Autoscale flapping is caused by scale-out and scale-in thresholds being too close together — look at the gap, not just the individual values.",
    "Azure's 99.99% VM SLA requires spreading instances across at least two Availability Zones — a single VM can never achieve this regardless of disk type.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure solutions architects spend a disproportionate amount of time right-sizing compute. Demonstrating that you can match scaling strategy to workload pattern — and articulate the cost/resilience tradeoffs — is a core differentiator in cloud interviews and AZ-104/305 exam scenarios.",
  toolRelevance: ["Azure Portal", "Azure Monitor", "Azure CLI", "Azure Resource Manager"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
