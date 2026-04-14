// ============================================================
// DCI Cloud Computing Labs — Learning Paths
// Ordered sequences of labs forming a curriculum.
// ============================================================

export interface LearningPath {
  id: string;
  title: string;
  name: string;
  description: string;
  targetAudience: string;
  labIds: string[];
  icon: string;
}

export const learningPaths: LearningPath[] = [
  {
    id: "aws-architect",
    title: "AWS Architect",
    name: "AWS Architect",
    description:
      "Master AWS services from EC2 and S3 to advanced architectures with Lambda, Aurora, and EventBridge.",
    targetAudience: "Cloud engineers pursuing AWS Solutions Architect certification",
    icon: "Cloud",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "ec2-instance-sizing",
      "s3-bucket-security",
      "rds-backup-strategy",
      "lambda-cold-start",
      "iam-policy-review",
      "s3-lifecycle-policies",
      "vpc-subnet-design",
      "cloudfront-caching",
      "route53-failover",
      "ecs-task-scaling",
      "dynamodb-capacity",
      "ec2-spot-vs-ondemand",
      "lambda-concurrency",
      "aws-elasticache-config",
      "aws-step-functions-design",
      "aws-waf-rules",
      "aws-eventbridge-patterns",
      "aws-kinesis-streaming",
      "aws-organizations-scp",
      "aws-aurora-failover",
    ],
  },
  {
    id: "azure-engineer",
    title: "Azure Engineer",
    name: "Azure Engineer",
    description:
      "Build expertise across Azure compute, networking, identity, and data services for real-world enterprise scenarios.",
    targetAudience: "Engineers pursuing Azure Administrator or Solutions Architect certification",
    icon: "Server",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "azure-vm-scaling",
      "blob-storage-tiers",
      "azure-ad-conditional",
      "app-service-deployment",
      "azure-sql-performance",
      "azure-rbac-review",
      "azure-functions-triggers",
      "azure-vnet-security",
      "key-vault-rotation",
      "azure-monitor-alerts",
      "azure-load-balancer",
      "azure-cosmos-partitioning",
      "azure-front-door-routing",
      "azure-service-bus-design",
      "azure-defender-config",
      "azure-data-factory-pipeline",
      "azure-aks-networking",
      "azure-policy-compliance",
      "azure-private-endpoints",
      "azure-sentinel-detection",
    ],
  },
  {
    id: "gcp-explorer",
    title: "GCP Explorer",
    name: "GCP Explorer",
    description:
      "Navigate Google Cloud from Compute Engine and Cloud Storage to BigQuery, GKE, and Spanner.",
    targetAudience: "Engineers exploring GCP or pursuing Google Cloud certifications",
    icon: "Cloud",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "gcp-compute-sizing",
      "gcp-cloud-storage-classes",
      "gcp-bigquery-optimization",
      "gcp-cloud-functions-design",
      "gcp-iam-service-accounts",
      "gcp-vpc-firewall-rules",
      "gcp-cloud-run-scaling",
      "gcp-gke-cluster-config",
      "gcp-cloud-sql-ha",
      "gcp-pub-sub-design",
      "gcp-load-balancing",
      "gcp-spanner-vs-sql",
      "gcp-cloud-armor-waf",
      "gcp-dataflow-pipeline",
      "gcp-anthos-multicluster",
    ],
  },
  {
    id: "cloud-security-pro",
    title: "Cloud Security Pro",
    name: "Cloud Security Pro",
    description:
      "Defend cloud infrastructure with identity management, encryption, compliance, and incident response skills.",
    targetAudience: "Security engineers and cloud architects focused on cloud security posture",
    icon: "Shield",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "cloud-identity-management",
      "encryption-at-rest",
      "network-security-groups",
      "compliance-framework-mapping",
      "secrets-manager-setup",
      "zero-trust-network",
      "cloud-waf-configuration",
      "security-incident-cloud",
      "cloud-audit-logging",
      "container-security-scanning",
      "cloud-forensics-investigation",
      "cloud-dlp-configuration",
      "cross-account-security",
      "devsecops-pipeline-security",
      "supply-chain-security-cloud",
    ],
  },
  {
    id: "devops-navigator",
    title: "DevOps Navigator",
    name: "DevOps Navigator",
    description:
      "Master CI/CD, infrastructure as code, observability, and SRE practices for cloud-native operations.",
    targetAudience: "DevOps engineers, SREs, and platform engineers",
    icon: "Wrench",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "cicd-pipeline-design",
      "cloudwatch-alarm-setup",
      "terraform-state-management",
      "auto-scaling-policies",
      "incident-response-runbook",
      "cost-anomaly-investigation",
      "cloudformation-drift",
      "container-orchestration",
      "log-aggregation-strategy",
      "blue-green-deployment",
      "sre-sli-slo-definition",
      "chaos-engineering-experiment",
      "observability-stack-design",
      "gitops-workflow-design",
      "capacity-planning-forecast",
    ],
  },
  {
    id: "cloud-architect",
    title: "Cloud Architect",
    name: "Cloud Architect",
    description:
      "Design resilient, scalable, and cost-effective cloud architectures across providers and patterns.",
    targetAudience: "Senior engineers and architects designing cloud-native systems",
    icon: "Cloud",
    labIds: [
      // --- FREE labs (easy → moderate) ---
      "serverless-vs-containers",
      "cost-optimization-review",
      "database-selection",
      "ha-architecture-design",
      "disaster-recovery-planning",
      "multi-region-deployment",
      "microservices-decomposition",
      "caching-strategy",
      "api-gateway-design",
      "event-driven-architecture",
      "twelve-factor-app-review",
      "api-versioning-strategy",
      "cloud-migration-strategy",
      "multi-cloud-design",
      "data-lake-architecture",
    ],
  },
];
