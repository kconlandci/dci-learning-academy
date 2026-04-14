import type { LabManifest } from "../../types/manifest";

export const azureVnetSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-vnet-security",
  version: 1,
  title: "Azure VNet Security Configuration",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "vnet", "nsg", "security", "network", "subnets", "private-endpoint"],
  description:
    "Configure Azure Virtual Network security controls including NSG rules, subnet delegation, and Private Endpoints to meet zero-trust network requirements.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Configure NSG rules with correct priorities, port ranges, and source/destination combinations",
    "Determine when Private Endpoints vs. Service Endpoints are appropriate for PaaS services",
    "Design subnet segmentation that enforces least-privilege network access between tiers",
  ],
  sortOrder: 206,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "scenario-1",
      title: "Three-Tier NSG Rule Configuration",
      description:
        "A three-tier application (web tier, app tier, data tier) needs NSG rules configured correctly. The web tier faces the internet, the app tier is internal-only, and the data tier should only be reachable from the app tier. Configure each NSG rule to its correct state.",
      targetSystem: "Azure Portal > Network Security Groups",
      items: [
        {
          id: "item-web-inbound-https",
          label: "Web Tier NSG: Allow inbound HTTPS (443) from Internet",
          detail:
            "Web servers must accept HTTPS traffic from all internet users. HTTP (80) should redirect to HTTPS at the application layer. The web tier NSG must explicitly allow 443 inbound from source 'Internet' (Azure service tag).",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-web-https",
        },
        {
          id: "item-web-inbound-ssh",
          label: "Web Tier NSG: Allow inbound SSH (22) from Internet",
          detail:
            "Web servers should be managed via Azure Bastion, not direct SSH from the internet. SSH exposed to the internet is a top attack vector.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-web-ssh",
        },
        {
          id: "item-app-inbound",
          label: "App Tier NSG: Allow inbound port 8080 from Web Tier subnet only (10.0.1.0/24)",
          detail:
            "The application API runs on port 8080. Only the web tier should call it. Allowing from 'Any' would let other subnets bypass the web tier.",
          currentState: "any-source",
          correctState: "subnet-only",
          states: ["subnet-only", "any-source", "disabled"],
          rationaleId: "rationale-app-inbound",
        },
        {
          id: "item-data-inbound",
          label: "Data Tier NSG: Allow inbound SQL (1433) from App Tier subnet only (10.0.2.0/24)",
          detail:
            "The SQL Server in the data tier must only accept connections from the app tier subnet. Any other source (including the web tier or internet) should be blocked.",
          currentState: "any-source",
          correctState: "subnet-only",
          states: ["subnet-only", "any-source", "disabled"],
          rationaleId: "rationale-data-inbound",
        },
      ],
      rationales: [
        {
          id: "rationale-web-https",
          text: "HTTPS (443) must be explicitly allowed inbound to the web tier from the 'Internet' service tag. Without this rule (and assuming the default deny-all posture), no users can reach the application. This is the expected public-facing ingress rule.",
        },
        {
          id: "rationale-web-ssh",
          text: "SSH exposed to the internet (0.0.0.0/0 → port 22) is one of the most commonly exploited attack surfaces in cloud environments. Management access should use Azure Bastion, which provides browser-based SSH/RDP without exposing a public SSH port. This rule must be disabled.",
        },
        {
          id: "rationale-app-inbound",
          text: "Restricting the app tier ingress to the web subnet IP range (10.0.1.0/24) enforces tier separation — only the web tier can call the API. Allowing 'Any' source would allow direct internal access from other subnets, bypassing the web tier security controls.",
        },
        {
          id: "rationale-data-inbound",
          text: "SQL Server should only be reachable from the app tier (10.0.2.0/24). This is the data tier protection — even if the web tier is compromised, it cannot directly query the database. Restricting by subnet CIDR is the correct control here.",
        },
      ],
      feedback: {
        perfect:
          "Perfect NSG configuration. The three tiers are correctly segmented with least-privilege network access enforced at each boundary.",
        partial:
          "Some rules are correct but you have either exposed management ports to the internet or left overly broad source ranges on internal tiers.",
        wrong:
          "The NSG configuration has critical security gaps. SSH from the internet and unrestricted database access are among the most common cloud breach entry points.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-2",
      title: "Private Endpoint vs. Service Endpoint Decision",
      description:
        "A financial services application needs to secure access to Azure services from within a VNet. Toggle each configuration to its correct state based on the security requirements for each service.",
      targetSystem: "Azure Portal > Virtual Network > Service Endpoints / Private Endpoints",
      items: [
        {
          id: "item-storage-private",
          label: "Azure Storage Account (containing PII): Use Private Endpoint",
          detail:
            "The storage account contains customer PII. Traffic must flow entirely over the private Microsoft backbone — no public internet exposure whatsoever. The storage account's public network access should be fully disabled.",
          currentState: "service-endpoint",
          correctState: "private-endpoint",
          states: ["private-endpoint", "service-endpoint", "public-access"],
          rationaleId: "rationale-storage-private",
        },
        {
          id: "item-sql-private",
          label: "Azure SQL Database (production): Use Private Endpoint",
          detail:
            "Production database must not be accessible from any public IP. Regulatory requirement: database traffic must never traverse the public internet. Requires Private DNS zone configuration.",
          currentState: "public-access",
          correctState: "private-endpoint",
          states: ["private-endpoint", "service-endpoint", "public-access"],
          rationaleId: "rationale-sql-private",
        },
        {
          id: "item-storage-dev",
          label: "Azure Storage Account (dev/test blobs): Use Service Endpoint",
          detail:
            "Dev/test storage contains non-sensitive test data. The team wants network-level isolation (VNet traffic stays on Microsoft backbone) but doesn't need the operational overhead of Private DNS zones. Cost of Private Endpoint ($7.30/month) is not justified for dev.",
          currentState: "public-access",
          correctState: "service-endpoint",
          states: ["private-endpoint", "service-endpoint", "public-access"],
          rationaleId: "rationale-storage-se",
        },
        {
          id: "item-storage-disable-public",
          label: "PII Storage Account: Disable Public Network Access",
          detail:
            "After deploying the Private Endpoint for the PII storage account, public access must be disabled. Leaving it enabled means the data is still reachable via public IP if the firewall rules are misconfigured.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-public-disable",
        },
      ],
      rationales: [
        {
          id: "rationale-storage-private",
          text: "Private Endpoints assign a private IP address from the VNet to the storage account. Traffic never leaves the Azure backbone and the storage account can have public access fully disabled. Service Endpoints still route to the public endpoint over the Microsoft backbone but the public endpoint remains exposed.",
        },
        {
          id: "rationale-sql-private",
          text: "For regulated data, Private Endpoint with public access disabled is the only architecture that guarantees the database is unreachable from the public internet. Service Endpoints route traffic over the Microsoft backbone but the SQL public endpoint is still technically accessible from authorized public IPs.",
        },
        {
          id: "rationale-storage-se",
          text: "Service Endpoints are a cost-effective middle ground for non-sensitive workloads — they route VNet traffic over the Microsoft backbone, preventing it from traversing the public internet, but don't require Private DNS zones or per-endpoint fees. Appropriate for dev/test environments.",
        },
        {
          id: "rationale-public-disable",
          text: "Deploying a Private Endpoint without disabling public access leaves the storage account still reachable via its public endpoint. Complete security requires the two-step approach: deploy Private Endpoint AND disable public network access to ensure the service is only reachable privately.",
        },
      ],
      feedback: {
        perfect:
          "Correct. Private Endpoints for regulated data, Service Endpoints for non-sensitive dev workloads, and public access disabled for fully private resources.",
        partial:
          "The endpoint type selections are partially correct but you missed disabling public access after deploying a Private Endpoint, leaving a security gap.",
        wrong:
          "Leaving production databases and PII storage on public access or using Service Endpoints for regulated data fails compliance requirements in most financial services frameworks.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-3",
      title: "Azure Bastion — Secure VM Access Configuration",
      description:
        "Configure Azure Bastion and associated network controls to enable secure browser-based RDP/SSH access to VMs without exposing any management ports to the internet.",
      targetSystem: "Azure Portal > Azure Bastion + NSG Configuration",
      items: [
        {
          id: "item-bastion-subnet",
          label: "Create dedicated AzureBastionSubnet (/26 or larger) in the VNet",
          detail:
            "Azure Bastion requires a dedicated subnet named exactly 'AzureBastionSubnet' with a minimum /27 prefix (Microsoft recommends /26). Using any other subnet name or size prevents deployment.",
          currentState: "not-configured",
          correctState: "configured",
          states: ["configured", "not-configured"],
          rationaleId: "rationale-bastion-subnet",
        },
        {
          id: "item-bastion-nsg",
          label: "Apply recommended inbound/outbound NSG rules to AzureBastionSubnet",
          detail:
            "The AzureBastionSubnet requires specific NSG rules: allow HTTPS 443 inbound from GatewayManager, allow 443+8080 inbound from AzureLoadBalancer, allow 8080+5701 inbound from VirtualNetwork (for data plane), block all else.",
          currentState: "no-nsg",
          correctState: "bastion-nsg",
          states: ["bastion-nsg", "no-nsg", "restrictive-nsg"],
          rationaleId: "rationale-bastion-nsg",
        },
        {
          id: "item-vm-rdp-public",
          label: "VM NSG: Allow inbound RDP (3389) from Internet",
          detail:
            "With Bastion deployed, VMs no longer need a public IP or RDP open to the internet. Bastion handles the RDP session via its private connection to the VM. This rule should be removed.",
          currentState: "enabled",
          correctState: "disabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-vm-rdp",
        },
        {
          id: "item-vm-public-ip",
          label: "Remove Public IP addresses from management VMs",
          detail:
            "After Bastion is deployed, VMs used only for backend processing no longer need public IP addresses. Removing public IPs eliminates a direct internet attack surface.",
          currentState: "assigned",
          correctState: "removed",
          states: ["removed", "assigned"],
          rationaleId: "rationale-vm-pip",
        },
      ],
      rationales: [
        {
          id: "rationale-bastion-subnet",
          text: "Azure Bastion will fail to deploy without a subnet named exactly 'AzureBastionSubnet'. The /26 recommendation provides room for Bastion scaling. The subnet must be in the same VNet as the VMs to manage.",
        },
        {
          id: "rationale-bastion-nsg",
          text: "The AzureBastionSubnet NSG must follow Microsoft's documented rule set to allow the control plane (GatewayManager), health probe (AzureLoadBalancer), and data plane (VirtualNetwork) traffic. An overly restrictive NSG will break Bastion connections; no NSG leaves the subnet unprotected.",
        },
        {
          id: "rationale-vm-rdp",
          text: "With Azure Bastion, RDP sessions are proxied through the Bastion host over SSL — the VM does not need to accept RDP directly from the internet. Keeping this rule enabled is unnecessary exposure. Remove it to reduce the attack surface.",
        },
        {
          id: "rationale-vm-pip",
          text: "Public IP addresses on backend VMs create a direct internet-facing attack surface. Once Bastion is deployed, management VMs don't need public IPs — Bastion connects privately. Removing public IPs eliminates entire classes of attack vectors (port scanning, brute-force, exploit attempts).",
        },
      ],
      feedback: {
        perfect:
          "Excellent Bastion deployment. VMs are now accessible securely via browser without any public IP or management port exposure.",
        partial:
          "Bastion is partially configured but open RDP ports or remaining public IPs on VMs leave residual attack surface.",
        wrong:
          "Critical misconfigurations — either Bastion won't deploy (wrong subnet name/size) or the security benefit is negated by leaving RDP/SSH open to the internet.",
      },
    },
  ],
  hints: [
    "NSG rules with 'Any' as the source are almost always wrong for internal tiers — restrict to the specific subnet CIDR of the caller to enforce tier separation.",
    "Private Endpoints give the PaaS service a private IP inside your VNet and allow you to fully disable public access — Service Endpoints only route traffic over the Microsoft backbone but the public endpoint remains live.",
    "Azure Bastion requires a subnet named exactly 'AzureBastionSubnet' — any other name causes deployment to fail, regardless of size or configuration.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Network security configuration is one of the most common sources of cloud security incidents. Understanding NSG rule design, Private vs. Service Endpoints, and Azure Bastion positions you as someone who can implement defense-in-depth network architecture — a critical skill for any cloud security or infrastructure role.",
  toolRelevance: ["Azure Portal", "Azure CLI", "Azure Network Watcher", "Microsoft Defender for Cloud"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
