import type { LabManifest } from "../../types/manifest";

export const multiCloudDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "multi-cloud-design",
  version: 1,
  title: "Multi-Cloud Architecture Design",
  tier: "advanced",
  track: "cloud-architecture",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["multi-cloud", "vendor-lock-in", "portability", "interoperability", "cloud-agnostic"],
  description:
    "Design multi-cloud architectures that balance vendor diversification, operational complexity, and portability, while making pragmatic decisions about where provider-specific services are acceptable.",
  estimatedMinutes: 28,
  learningObjectives: [
    "Distinguish justified multi-cloud strategies from accidental multi-cloud complexity",
    "Identify which service categories create vendor lock-in versus commodity abstraction",
    "Design a data portability strategy that doesn't sacrifice managed service benefits",
    "Evaluate the operational overhead cost of cloud-agnostic abstraction layers",
    "Apply the correct multi-cloud pattern for a given business driver (resilience, cost, best-of-breed)",
  ],
  sortOrder: 411,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "mc-vendor-lockout-risk",
      title: "Designing Against Cloud Provider Concentration Risk",
      context:
        "Your company provides critical financial infrastructure to 200 banks. A recent cloud provider outage lasted 6 hours and affected 30% of your customers. Your CISO wants to deploy across two cloud providers to eliminate provider concentration risk. Your team of 40 engineers currently has deep AWS expertise but no Azure or GCP experience.",
      displayFields: [
        { label: "Current Provider", value: "AWS (single provider)", emphasis: "warn" },
        { label: "Team Cloud Expertise", value: "AWS only — no Azure/GCP", emphasis: "critical" },
        { label: "Last Outage Impact", value: "30% of customers, 6 hours", emphasis: "critical" },
        { label: "Engineering Team Size", value: "40 engineers", emphasis: "normal" },
      ],
      actions: [
        { id: "multi-region-first", label: "Prioritize multi-region within AWS first; evaluate multi-cloud after mastering multi-region resilience", color: "green" },
        { id: "active-active-multi", label: "Deploy active-active across AWS and Azure immediately using a cloud-agnostic Kubernetes layer", color: "yellow" },
        { id: "secondary-cloud-dr", label: "Stand up a cold DR environment in a second cloud provider as a backup-only footprint", color: "blue" },
        { id: "on-prem-hybrid", label: "Return critical workloads to on-premises colocated data centers to eliminate cloud dependency", color: "red" },
      ],
      correctActionId: "multi-region-first",
      rationales: [
        { id: "r-multi-region", text: "Most cloud provider outages are regional, not global. Multi-region within a single provider addresses the root cause of the 6-hour outage at far lower operational cost than multi-cloud. With zero Azure/GCP expertise, active-active multi-cloud introduces operational complexity that a 40-person team cannot sustain safely." },
        { id: "r-active-active", text: "Active-active multi-cloud with a cloud-agnostic Kubernetes layer provides the strongest resilience but requires the team to simultaneously learn a second cloud provider's networking, IAM, storage, and managed services — doubling operational surface area with no current expertise." },
        { id: "r-cold-dr", text: "A cold DR in a second cloud gives some protection but introduces the same expertise gap as active-active while providing weaker recovery characteristics (cold start time, untested runbooks). Multi-region active-active within AWS provides faster failover with existing expertise." },
        { id: "r-on-prem", text: "Returning to on-premises eliminates cloud concentration risk by creating a new set of risks: hardware failure, colocation dependency, and the loss of cloud elasticity, managed services, and global CDN capabilities that underpin the current product." },
      ],
      correctRationaleId: "r-multi-region",
      feedback: {
        perfect: "Correct. Multi-region within a single provider solves the actual failure mode at a fraction of the operational complexity of multi-cloud, and should precede any multi-cloud expansion.",
        partial: "Your approach addresses concentration risk but introduces operational complexity that the team cannot support with current expertise. Sequence matters as much as the destination architecture.",
        wrong: "The team expertise gap is a critical constraint. Review what failure mode the 6-hour outage represented (regional vs. global) and what the lowest-complexity solution to that specific failure mode is.",
      },
    },
    {
      type: "action-rationale",
      id: "mc-portability-tradeoff",
      title: "Evaluating Managed Service Adoption vs. Portability",
      context:
        "Your platform engineering team is designing the messaging infrastructure for a new product. AWS SNS/SQS would provide a fully managed, operationally simple solution but creates AWS lock-in. Self-managed Apache Kafka on Kubernetes would be cloud-portable but requires significant operational expertise. The product has 18 months to first revenue. Team has 3 engineers for messaging infrastructure.",
      displayFields: [
        { label: "Time to Revenue", value: "18 months", emphasis: "warn" },
        { label: "Messaging Infra Team", value: "3 engineers", emphasis: "critical" },
        { label: "Managed Option", value: "AWS SNS/SQS — fully managed, provider-locked", emphasis: "normal" },
        { label: "Portable Option", value: "Self-managed Kafka — portable, high ops overhead", emphasis: "warn" },
      ],
      actions: [
        { id: "managed-service", label: "Use AWS SNS/SQS now; abstract behind an interface so Kafka can be substituted later if needed", color: "green" },
        { id: "kafka-now", label: "Deploy self-managed Kafka on Kubernetes from day one for maximum portability", color: "yellow" },
        { id: "managed-kafka", label: "Use a managed Kafka service (e.g., MSK, Confluent Cloud) to get Kafka portability without self-management", color: "blue" },
        { id: "no-broker", label: "Avoid a message broker entirely — use direct HTTP calls between services for simplicity", color: "orange" },
      ],
      correctActionId: "managed-service",
      rationales: [
        { id: "r-managed", text: "For a 3-person team with 18 months to revenue, operational simplicity is paramount. AWS SNS/SQS eliminates broker management entirely. Abstracting behind a message bus interface (port/adapter pattern) preserves portability — a Kafka implementation can be substituted later without changing consumer code." },
        { id: "r-kafka-self", text: "Self-managed Kafka requires expertise in partition management, rebalancing, storage sizing, monitoring, and upgrades. For 3 engineers focused on delivering product features in 18 months, Kafka operations would consume a disproportionate share of their capacity." },
        { id: "r-managed-kafka", text: "Managed Kafka (MSK, Confluent) is a strong option that provides Kafka compatibility without self-management overhead. The question is whether Kafka semantics are actually needed vs. simpler queue/pub-sub patterns — if SNS/SQS meets the requirements, it's still simpler operationally." },
        { id: "r-no-broker", text: "Direct HTTP calls between services create tight coupling, block producers until consumers respond, and cannot buffer traffic spikes. For an architecture with multiple async consumers, a broker provides critical decoupling that direct HTTP cannot replicate." },
      ],
      correctRationaleId: "r-managed",
      feedback: {
        perfect: "Correct. Managed services with interface abstraction provide the right balance: operational simplicity today with preserved portability for the future.",
        partial: "Your choice is technically valid but either over-invests in operational complexity for the team size and timeline, or closes off future portability options unnecessarily.",
        wrong: "Consider the team size and timeline constraints. Operational overhead is a real cost to feature delivery. Review what the interface abstraction pattern enables for future portability.",
      },
    },
    {
      type: "action-rationale",
      id: "mc-best-of-breed",
      title: "Best-of-Breed Multi-Cloud Service Selection",
      context:
        "Your data science team wants to use Google's Vertex AI for ML model training (best-in-class for your use case), while your core application runs on AWS. Your CTO is concerned about managing two cloud provider relationships, two billing systems, and two sets of network egress costs for data movement between platforms.",
      displayFields: [
        { label: "Core Platform", value: "AWS (compute, storage, databases)", emphasis: "normal" },
        { label: "ML Platform Preference", value: "Google Vertex AI (best-in-class)", emphasis: "normal" },
        { label: "Data Movement", value: "Training data: 500 GB/week from S3 to GCS", emphasis: "warn" },
        { label: "CTO Concern", value: "Dual-provider operational overhead", emphasis: "warn" },
      ],
      actions: [
        { id: "best-of-breed-accept", label: "Accept best-of-breed multi-cloud; standardize on a unified cost visibility and IAM governance layer", color: "green" },
        { id: "aws-sagemaker", label: "Use AWS SageMaker for ML to stay single-cloud, accepting potential capability trade-offs", color: "yellow" },
        { id: "avoid-multi", label: "Prohibit multi-cloud usage; require all services to use the primary provider only", color: "orange" },
        { id: "on-prem-ml", label: "Run ML training on-premises GPU cluster to avoid cloud egress costs entirely", color: "red" },
      ],
      correctActionId: "best-of-breed-accept",
      rationales: [
        { id: "r-accept", text: "Best-of-breed multi-cloud is a valid and increasingly common strategy when a specific provider has a clear capability advantage. Accepting it with governance guardrails (unified billing visibility, consistent IAM federation, egress cost monitoring) manages the CTO's concerns without sacrificing ML capability." },
        { id: "r-sagemaker", text: "SageMaker is a strong ML platform, but if the data science team has evaluated both and identifies a material capability gap, forcing single-cloud ML may reduce model quality or extend project timelines. The capability trade-off should be explicitly quantified before this decision." },
        { id: "r-prohibit", text: "A blanket prohibition on multi-cloud is an organizational policy rather than an architectural decision. It may prevent best-of-breed usage for legitimate reasons, but if enforced without exception processes it can cause teams to work around policy, creating shadow multi-cloud with less governance." },
        { id: "r-on-prem-gpu", text: "On-premises GPU clusters avoid cloud egress but require significant capital expenditure, hardware refresh cycles, and operations expertise. For a team already running on cloud, this adds operational burden exceeding the complexity of managing two cloud providers." },
      ],
      correctRationaleId: "r-accept",
      feedback: {
        perfect: "Correct. Best-of-breed multi-cloud is a defensible strategy when capability differences are material. The key is managing the operational overhead through governance, not by prohibiting it.",
        partial: "Your approach addresses the single-cloud preference but may sacrifice material capability advantages or creates governance gaps that make multi-cloud harder to manage over time.",
        wrong: "The ML capability advantage and the egress cost concern are both real. Review how governance layers can make multi-cloud manageable without prohibiting best-of-breed provider selection.",
      },
    },
  ],
  hints: [
    "Multi-region within one cloud solves most provider outages at far lower complexity than multi-cloud — most outages are regional, not global.",
    "Interface abstraction (adapter pattern) over managed services buys future portability without paying Kafka's operational cost today.",
    "Best-of-breed multi-cloud is defensible when capability differences are quantified — prohibiting it often drives ungoverned shadow usage instead.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Multi-cloud decisions are among the most politically charged architectural conversations at the executive level. Architects who can articulate the difference between justified multi-cloud (best-of-breed, regulatory) and accidental multi-cloud (shadow IT, lack of governance) — and quantify the operational overhead cost — are effective at both technical design and stakeholder alignment.",
  toolRelevance: [
    "Terraform",
    "Crossplane",
    "HashiCorp Vault",
    "Datadog",
    "CloudHealth by VMware",
  ],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
