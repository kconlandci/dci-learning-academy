import type { LabManifest } from "../../types/manifest";

export const chaosEngineeringExperimentLab: LabManifest = {
  schemaVersion: "1.1",
  id: "chaos-engineering-experiment",
  version: 1,
  title: "Chaos Engineering Experiment Design",
  tier: "advanced",
  track: "cloud-operations",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["chaos-engineering", "resilience", "fault-injection", "blast-radius", "steady-state"],
  description:
    "Design and execute chaos engineering experiments to proactively discover system weaknesses, define steady-state hypotheses, control blast radius, and interpret experiment results to improve production resilience.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Define a steady-state hypothesis that accurately captures normal system behavior",
    "Design chaos experiments with controlled blast radius and abort conditions",
    "Select appropriate fault injection methods for different failure modes",
    "Interpret experiment results to drive targeted resilience improvements",
  ],
  sortOrder: 611,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "ce-s1",
      title: "Defining the Steady-State Hypothesis",
      context:
        "Your team is planning its first chaos experiment on a microservices-based order processing platform. The system consists of an API gateway, order service, inventory service, payment service, and notification service. The platform handles 5,000 orders per hour during peak. Before injecting any faults, the team needs to define a steady-state hypothesis that will serve as the baseline for evaluating whether the system tolerates failures gracefully.",
      displayFields: [
        { label: "System", value: "Order processing platform (5 microservices)", emphasis: "normal" },
        { label: "Peak Load", value: "5,000 orders/hour", emphasis: "normal" },
        { label: "Current P99 Latency", value: "320ms", emphasis: "normal" },
        { label: "Current Error Rate", value: "0.08%", emphasis: "normal" },
        { label: "Experiment Scope", value: "First chaos experiment for the team", emphasis: "warn" },
      ],
      actions: [
        { id: "business-metric-hypothesis", label: "Define steady state as: order completion rate stays above 99.5%, P99 latency remains below 500ms, and no orders are lost or duplicated during the experiment window", color: "green" },
        { id: "infra-metric-hypothesis", label: "Define steady state as: all EC2 instances stay healthy, CPU stays below 70%, and no container restarts occur", color: "orange" },
        { id: "no-errors-hypothesis", label: "Define steady state as: zero errors across all services during the experiment", color: "red" },
        { id: "single-metric-hypothesis", label: "Define steady state as: average response time stays below 200ms", color: "yellow" },
      ],
      correctActionId: "business-metric-hypothesis",
      rationales: [
        { id: "r-ce-s1-correct", text: "A steady-state hypothesis should be expressed in terms of business-level outcomes that users care about, not infrastructure metrics. Order completion rate, latency within user-acceptable bounds, and data integrity (no lost or duplicate orders) directly measure whether the system continues to function correctly from the customer's perspective. Infrastructure metrics may fluctuate during fault injection without impacting users — that resilience is exactly what you want to validate." },
        { id: "r-ce-s1-infra", text: "Infrastructure metrics like CPU usage and container restarts describe how the system operates internally, not whether it delivers value to users. A container restarting during a chaos experiment might actually prove the system is resilient — the orchestrator detected a failure and self-healed. Treating that as a failed experiment misses the point of chaos engineering." },
        { id: "r-ce-s1-no-errors", text: "Expecting zero errors during fault injection is unrealistic and defeats the purpose of chaos engineering. The goal is not to prove the system never errors, but to prove it degrades gracefully — maintaining acceptable service levels even when components fail. A zero-error hypothesis will always fail, teaching the team nothing useful." },
        { id: "r-ce-s1-single", text: "A single metric like average response time is too narrow and can be misleading. Average latency can look acceptable even when tail latency is catastrophic, and it tells you nothing about data integrity or whether orders are actually completing. Steady-state hypotheses should cover multiple dimensions of system health." },
      ],
      correctRationaleId: "r-ce-s1-correct",
      feedback: {
        perfect: "Excellent hypothesis design. Business-level metrics — completion rate, bounded latency, and data integrity — are the right lens for evaluating system resilience under fault injection.",
        partial: "Your hypothesis captures some useful signals but misses key dimensions. A strong steady-state hypothesis should include completion rate, latency bounds, and data integrity together.",
        wrong: "Chaos engineering validates that users remain unaffected when components fail. Your hypothesis should measure business outcomes (orders completing, acceptable latency), not infrastructure internals or unrealistic zero-error expectations.",
      },
    },
    {
      type: "action-rationale",
      id: "ce-s2",
      title: "Controlling Blast Radius",
      context:
        "The team is ready to run a chaos experiment that kills a random instance of the inventory service. The inventory service runs 6 replicas behind a load balancer across 3 availability zones. The experiment will run in production during business hours because staging does not replicate real traffic patterns. The VP of Engineering has approved the experiment but emphasized that customer impact must be contained.",
      displayFields: [
        { label: "Target Service", value: "Inventory service (6 replicas, 3 AZs)", emphasis: "normal" },
        { label: "Experiment", value: "Kill one random inventory service instance", emphasis: "warn" },
        { label: "Environment", value: "Production (business hours)", emphasis: "critical" },
        { label: "VP Directive", value: "Customer impact must be contained", emphasis: "critical" },
        { label: "Traffic Pattern", value: "Cannot be replicated in staging", emphasis: "normal" },
      ],
      actions: [
        { id: "scoped-with-abort", label: "Run experiment on 1 instance only, limit to 5-minute window, set automatic abort if error rate exceeds 1% or P99 latency exceeds 600ms, and have a rollback runbook ready", color: "green" },
        { id: "kill-all-in-one-az", label: "Kill all inventory instances in one AZ to simulate a full zone failure and test cross-AZ failover", color: "red" },
        { id: "run-off-peak-only", label: "Run during off-peak hours (2 AM) to minimize blast radius even though traffic patterns differ from peak", color: "yellow" },
        { id: "canary-experiment", label: "Route 5% of traffic to a 'chaos canary' instance that is fault-injected, leaving 95% of traffic unaffected", color: "blue" },
      ],
      correctActionId: "scoped-with-abort",
      rationales: [
        { id: "r-ce-s2-correct", text: "For a first production chaos experiment, minimizing blast radius is paramount. Killing one instance out of six (16% capacity loss) is a controlled perturbation. The 5-minute time box limits exposure duration. Automatic abort conditions (error rate and latency thresholds) act as a circuit breaker — if the system does not tolerate the fault gracefully, the experiment stops before customers are meaningfully impacted. A rollback runbook ensures the team can recover manually if automation fails." },
        { id: "r-ce-s2-az-failure", text: "Killing all instances in one AZ removes 2 of 6 replicas (33% capacity) and tests a much larger failure scenario. This is a valid experiment — but not for a first run. Start with the smallest blast radius that produces useful data, then expand scope as confidence grows. Jumping to zone-level failure testing risks the customer impact the VP explicitly forbade." },
        { id: "r-ce-s2-off-peak", text: "Running at 2 AM reduces risk but also reduces the experiment's validity. The team specifically needs production traffic patterns to validate resilience. Off-peak results may not reveal problems that only manifest under load — like connection pool exhaustion or cache stampedes that occur at scale." },
        { id: "r-ce-s2-canary", text: "Traffic-based chaos (routing 5% to a faulty instance) is a sophisticated approach but adds complexity. It requires traffic splitting infrastructure and the ability to attribute errors to the canary path. For a first experiment, instance termination is simpler to execute, monitor, and abort. Canary-based chaos is better suited for teams with established chaos engineering practices." },
      ],
      correctRationaleId: "r-ce-s2-correct",
      feedback: {
        perfect: "Perfect blast radius control. Single instance, time-boxed, automatic abort conditions, and a manual fallback. This is exactly how to run a first production chaos experiment safely.",
        partial: "Your approach has merit but either introduces too much risk for a first experiment or sacrifices the validity of production traffic patterns. Start small, prove the process works, then expand.",
        wrong: "Production chaos experiments require tight blast radius controls: limit the number of affected instances, set time bounds, define automatic abort conditions, and have manual rollback ready. Never start with large-scale failure injection.",
      },
    },
    {
      type: "action-rationale",
      id: "ce-s3",
      title: "Interpreting Experiment Results",
      context:
        "The chaos experiment completed. One inventory service instance was terminated for 5 minutes. The system continued processing orders, but the experiment revealed unexpected behavior. The team must now decide how to act on the results.",
      displayFields: [
        { label: "Order Completion Rate", value: "99.7% (steady state: 99.9%)", emphasis: "warn" },
        { label: "P99 Latency", value: "480ms (steady state: 320ms)", emphasis: "warn" },
        { label: "Orders Lost", value: "0", emphasis: "normal" },
        { label: "Inventory Cache Miss Rate", value: "Spiked to 45% for 90 seconds (normal: 2%)", emphasis: "critical" },
        { label: "Load Balancer Drain Time", value: "38 seconds (expected: <5 seconds)", emphasis: "critical" },
        { label: "Auto-scaling Response", value: "New instance launched in 4 minutes 12 seconds", emphasis: "warn" },
      ],
      actions: [
        { id: "fix-drain-and-cache", label: "File two high-priority fixes: reduce load balancer drain time to under 5 seconds, and implement inventory cache warming on new instance startup to prevent cache stampede", color: "green" },
        { id: "declare-success", label: "Declare the experiment a success — steady-state hypothesis was maintained (orders > 99.5%, latency < 500ms, zero data loss)", color: "yellow" },
        { id: "increase-replicas", label: "Increase inventory service replicas from 6 to 12 to reduce per-instance impact of future failures", color: "orange" },
        { id: "disable-and-redesign", label: "Pause chaos experiments until the system is redesigned with circuit breakers and bulkheads", color: "red" },
      ],
      correctActionId: "fix-drain-and-cache",
      rationales: [
        { id: "r-ce-s3-correct", text: "The experiment technically passed the steady-state hypothesis (99.7% > 99.5%, 480ms < 500ms), but it revealed two critical weaknesses. The 38-second drain time means the load balancer continued sending requests to a dying instance for 33 seconds longer than expected — causing unnecessary errors. The 45% cache miss spike indicates no cache warming strategy exists, creating a thundering herd on the database when a new instance starts cold. These are the exact insights chaos engineering is designed to surface. Fix them now before a real failure exposes them at scale." },
        { id: "r-ce-s3-success", text: "While the hypothesis was technically maintained, declaring success and moving on wastes the experiment's most valuable output. The drain time and cache stampede issues are latent weaknesses that will compound when multiple instances fail simultaneously. Chaos engineering's value is in the fixes it drives, not just the pass/fail outcome." },
        { id: "r-ce-s3-replicas", text: "Doubling replicas masks the underlying issues rather than fixing them. With 12 replicas, losing one instance has less impact — but the 38-second drain time and cache miss spike still occur. When a real AZ failure takes out 4 instances simultaneously, these unfixed issues will cause a much larger impact than today's controlled experiment revealed." },
        { id: "r-ce-s3-pause", text: "Pausing chaos experiments removes the tool that discovered the weaknesses. The correct response to finding problems is to fix them and re-test, not to stop testing. Circuit breakers and bulkheads may be valuable additions, but they should be validated through future chaos experiments, not used as a prerequisite for running them." },
      ],
      correctRationaleId: "r-ce-s3-correct",
      feedback: {
        perfect: "Exactly right. The experiment passed its hypothesis but surfaced two actionable weaknesses. Fixing the drain time and cache warming strategy hardens the system against real failures.",
        partial: "The hypothesis was technically met, but ignoring the drain time and cache miss findings leaves known weaknesses unfixed. Chaos engineering's value is in the improvements it drives, not just pass/fail.",
        wrong: "The experiment data clearly shows two fixable weaknesses: slow load balancer draining and missing cache warming. Adding replicas or pausing experiments does not address these root causes.",
      },
    },
  ],
  hints: [
    "A steady-state hypothesis should be defined in terms of business outcomes (order completion rate, latency bounds, data integrity) rather than infrastructure metrics like CPU or instance health.",
    "For first-time production chaos experiments, minimize blast radius with single-instance scope, time-boxing, automatic abort conditions, and manual rollback readiness.",
    "Even when a chaos experiment passes its hypothesis, look for unexpected behaviors in secondary metrics — they reveal latent weaknesses that will compound during larger failures.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Chaos engineering is rapidly becoming a standard practice at organizations operating at scale. Engineers who can design controlled experiments, define meaningful hypotheses, and translate results into actionable resilience improvements are highly valued — especially in SRE, platform engineering, and reliability-focused roles where proactive failure prevention differentiates senior practitioners.",
  toolRelevance: ["AWS Fault Injection Simulator", "Gremlin", "Chaos Monkey", "LitmusChaos", "Steadybit", "Datadog"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
