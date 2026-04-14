import type { LabManifest } from "../../types/manifest";

export const vpcSubnetDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "vpc-subnet-design",
  version: 1,
  title: "VPC Subnet Design",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "vpc", "networking", "subnets", "security"],
  description:
    "Design VPC subnet architecture for a three-tier web application, making routing, NAT, and security group decisions that balance security with operational requirements.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Distinguish between public, private, and isolated subnet use cases",
    "Decide when NAT Gateway is required versus unnecessary cost",
    "Apply security group layering for defense-in-depth in multi-tier architectures",
    "Evaluate CIDR block sizing for subnet growth requirements",
  ],
  sortOrder: 105,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "vpc-subnet-s1",
      title: "Database Tier Subnet Placement",
      context:
        "You're designing a three-tier architecture: web tier (ALB), app tier (EC2 Auto Scaling), and database tier (RDS MySQL). The database must not be accessible from the internet under any circumstances. Application servers need to reach the database. Where do you place the RDS instances?",
      displayFields: [
        { label: "Architecture", value: "Web → App → RDS (three-tier)", emphasis: "normal" },
        { label: "Internet Access Required", value: "No — RDS must be isolated", emphasis: "critical" },
        { label: "App Tier Location", value: "Private subnets (no direct internet)", emphasis: "normal" },
        { label: "RDS Engine", value: "MySQL 8.0 Multi-AZ", emphasis: "normal" },
      ],
      actions: [
        { id: "isolated-subnet", label: "Place RDS in isolated subnets (no route to internet or NAT)", color: "green" },
        { id: "private-subnet-rds", label: "Place RDS in private subnets (same as app tier, with NAT route)", color: "yellow" },
        { id: "public-subnet-sg", label: "Place RDS in public subnets but restrict access with Security Groups", color: "red" },
        { id: "private-different-az", label: "Place RDS in private subnets in different AZs from the app tier", color: "orange" },
      ],
      correctActionId: "isolated-subnet",
      rationales: [
        { id: "r-isolated-rds", text: "Isolated subnets have no route table entry to a NAT Gateway or Internet Gateway — they are completely network-isolated. RDS instances in isolated subnets are unreachable from the internet even if a Security Group is misconfigured, providing defense-in-depth." },
        { id: "r-private-unnecessary-nat", text: "Placing RDS in private subnets with NAT adds an unnecessary egress path. RDS doesn't initiate outbound connections to the internet. The NAT route is unused cost and a potential lateral movement path." },
        { id: "r-public-sg-insufficient", text: "Security Groups can block traffic, but placing a database in a public subnet means its IP is internet-routable. A single Security Group misconfiguration would expose it directly. Defense-in-depth requires network isolation, not just firewall rules." },
        { id: "r-different-az-misunderstood", text: "Multi-AZ RDS already places the replica in a different AZ automatically. Subnet AZ distribution is important for availability, but doesn't address the fundamental question of internet isolation." },
      ],
      correctRationaleId: "r-isolated-rds",
      feedback: {
        perfect: "Correct. Isolated subnets enforce network-level isolation regardless of Security Group configuration. For a database tier, this is the recommended architecture in AWS Well-Architected Framework.",
        partial: "Private subnets are better than public, but they still have a NAT route that's unnecessary for RDS. Isolated subnets (no route table entries at all) are the correct choice for database tiers.",
        wrong: "Never place a production database in a public subnet and rely solely on Security Groups for protection. Defense-in-depth requires multiple independent layers. Network isolation + Security Groups is the correct approach.",
      },
    },
    {
      type: "action-rationale",
      id: "vpc-subnet-s2",
      title: "NAT Gateway Cost Optimization",
      context:
        "Your AWS bill shows $340/month in NAT Gateway data processing charges. The architecture has 3 NAT Gateways (one per AZ) in a VPC with: web servers (public subnets), app servers (private subnets), RDS (private subnets), and a Lambda function that only calls AWS services (DynamoDB, SQS, S3). The Lambda is in a private subnet and routes all traffic through NAT.",
      displayFields: [
        { label: "NAT Gateway Cost", value: "$340/month data processing", emphasis: "critical" },
        { label: "Lambda Traffic", value: "~15 GB/month through NAT to AWS services", emphasis: "warn" },
        { label: "NAT Gateways", value: "3 (one per AZ)", emphasis: "normal" },
        { label: "Lambda Targets", value: "DynamoDB, SQS, S3 — all AWS services", emphasis: "warn" },
      ],
      actions: [
        { id: "vpc-endpoints", label: "Create VPC Interface/Gateway endpoints for DynamoDB, SQS, and S3", color: "green" },
        { id: "move-lambda-public", label: "Move Lambda to a public subnet to bypass NAT", color: "orange" },
        { id: "reduce-to-one-nat", label: "Consolidate to 1 NAT Gateway instead of 3", color: "yellow" },
        { id: "compress-data", label: "Enable response compression in the Lambda to reduce data volume", color: "red" },
      ],
      correctActionId: "vpc-endpoints",
      rationales: [
        { id: "r-vpc-endpoints-free", text: "Traffic between a VPC and AWS services via VPC endpoints is free — it doesn't traverse the NAT Gateway. Gateway endpoints (S3, DynamoDB) are free. Interface endpoints (SQS) cost ~$7/month per endpoint, far less than $340 in NAT data charges." },
        { id: "r-lambda-public-insecure", text: "Moving Lambda to a public subnet means assigning it a public IP or routing through an IGW. This removes the network isolation that makes private subnets valuable for application logic." },
        { id: "r-one-nat-az-risk", text: "Reducing to 1 NAT Gateway saves the hourly cost ($0.045/hr) but creates a cross-AZ data transfer charge and single-AZ failure risk. It also doesn't address the root cause — the traffic going through NAT at all." },
        { id: "r-compression-wrong", text: "Compression reduces data volume but doesn't eliminate the data processing charge. The problem is routing to AWS services via NAT at all, not the data size." },
      ],
      correctRationaleId: "r-vpc-endpoints-free",
      feedback: {
        perfect: "Correct. VPC endpoints are the standard solution for this exact problem. AWS-to-AWS traffic via VPC endpoints bypasses NAT entirely and is free for Gateway endpoints (S3, DynamoDB).",
        partial: "Reducing NAT Gateways addresses availability and some costs, but the core issue is that AWS service traffic is being charged NAT data processing fees unnecessarily. VPC endpoints eliminate this traffic from NAT entirely.",
        wrong: "The cost driver is NAT data processing for traffic that should never go through NAT in the first place. Traffic between a VPC and AWS services can use VPC endpoints, which are free or very cheap.",
      },
    },
    {
      type: "action-rationale",
      id: "vpc-subnet-s3",
      title: "Security Group Design for App Tier",
      context:
        "The app tier EC2 instances receive traffic from an ALB and need to call an external payment API (api.stripe.com:443) and write to RDS on port 3306. You need to configure the outbound rules for the app tier security group. The current outbound rule is: Allow ALL traffic to 0.0.0.0/0.",
      displayFields: [
        { label: "Inbound Source", value: "ALB Security Group (port 8080)", emphasis: "normal" },
        { label: "Outbound Targets", value: "Stripe API (HTTPS), RDS (MySQL 3306)", emphasis: "normal" },
        { label: "Current Outbound Rule", value: "Allow ALL to 0.0.0.0/0", emphasis: "warn" },
        { label: "Defense Objective", value: "Restrict lateral movement if instance is compromised", emphasis: "warn" },
      ],
      actions: [
        { id: "scoped-outbound", label: "Allow 443 to 0.0.0.0/0, Allow 3306 to RDS Security Group only", color: "green" },
        { id: "keep-all-outbound", label: "Keep Allow ALL outbound — Security Groups are stateful, inbound is what matters", color: "red" },
        { id: "allow-only-rds", label: "Allow only 3306 to RDS Security Group — Stripe calls handled by NAT filtering", color: "orange" },
        { id: "fully-restricted", label: "Allow 443 to Stripe IP range, 3306 to RDS SG, block everything else", color: "yellow" },
      ],
      correctActionId: "scoped-outbound",
      rationales: [
        { id: "r-scoped-practical", text: "Allowing HTTPS (443) outbound to 0.0.0.0/0 is necessary because Stripe's IP range changes. Restricting 3306 to only the RDS security group limits database access to only the intended instances. This is the practical least-privilege balance." },
        { id: "r-all-outbound-wrong", text: "Security Groups are stateful for return traffic, but unrestricted outbound rules allow a compromised instance to reach any destination on any port — enabling data exfiltration and lateral movement." },
        { id: "r-no-https-breaks", text: "Blocking HTTPS outbound prevents Stripe API calls, breaking the payment processing functionality. You can't restrict 443 to only Stripe because their IP range is dynamic." },
        { id: "r-stripe-ip-range", text: "Restricting by Stripe's IP range is operationally fragile — their CIDRs change and need active maintenance. It also doesn't scale to other HTTPS dependencies. Per-service CIDR restriction is rarely practical." },
      ],
      correctRationaleId: "r-scoped-practical",
      feedback: {
        perfect: "Correct practical approach. HTTPS to 0.0.0.0/0 is necessary for external API calls with dynamic IPs. RDS restricted to its security group ensures database access is limited to intended consumers only.",
        partial: "Your approach has merit but either breaks functionality (blocking HTTPS) or leaves too much open (all outbound). The goal is to restrict what can be restricted without breaking legitimate traffic flows.",
        wrong: "Unrestricted outbound allows a compromised EC2 instance to exfiltrate data to any destination. Outbound rules should restrict to required destinations where possible, even if HTTPS to 0.0.0.0/0 is necessary for external APIs.",
      },
    },
  ],
  hints: [
    "The three subnet types: Public (IGW route), Private (NAT route, can reach internet outbound), Isolated (no internet route at all). Database tiers belong in isolated subnets.",
    "VPC Gateway endpoints (S3, DynamoDB) are free. Traffic using them never hits the NAT Gateway data processing charge. This is one of the most common AWS cost optimization wins.",
    "Security Groups are stateful — return traffic for allowed inbound connections is automatically permitted. But outbound rules still matter for preventing a compromised host from initiating unauthorized connections.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "VPC design questions are ubiquitous in AWS Solutions Architect exams and real architecture reviews. The isolated subnet for databases, VPC endpoints for AWS services, and Security Group least-privilege patterns appear in nearly every well-architected workload. NAT Gateway cost optimization via VPC endpoints is also one of the most common FinOps wins seen in cloud cost audits.",
  toolRelevance: ["AWS Console", "AWS CLI", "VPC Flow Logs", "AWS Network Manager"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
