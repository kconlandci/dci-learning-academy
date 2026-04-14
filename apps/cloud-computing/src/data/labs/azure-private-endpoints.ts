import type { LabManifest } from "../../types/manifest";

export const azurePrivateEndpointsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-private-endpoints",
  version: 1,
  title: "Azure Private Endpoints and Network Isolation Patterns",
  tier: "advanced",
  track: "azure-fundamentals",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["azure", "private-endpoints", "private-link", "dns", "network-isolation", "vnet", "security"],
  description:
    "Implement Azure Private Endpoints for PaaS services, configure Private DNS zones for name resolution, and design network isolation patterns that eliminate public internet exposure for storage, SQL, and Key Vault.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Deploy private endpoints for Azure PaaS services (Storage, SQL, Key Vault) and disable public access",
    "Configure Azure Private DNS zones with VNet links for automatic DNS resolution of private endpoint FQDNs",
    "Diagnose DNS resolution failures that cause applications to connect to public IPs instead of private endpoints",
    "Design hub-spoke network architectures with centralized Private DNS zones and conditional forwarders for hybrid environments",
    "Understand the relationship between private endpoints, service endpoints, and network service tags",
  ],
  sortOrder: 219,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Private Endpoint DNS — Application Connecting to Public IP Instead of Private Endpoint",
      context:
        "A team deployed a private endpoint for their Azure SQL Database (mydb.database.windows.net) in a spoke VNet. They disabled public access on the SQL server. An application running on a VM in the same VNet cannot connect to the database — the connection times out. Investigation shows the VM is resolving mydb.database.windows.net to the public IP (40.x.x.x) instead of the private endpoint IP (10.0.1.5). The private endpoint is provisioned and the NIC shows IP 10.0.1.5.",
      displayFields: [
        { label: "Private Endpoint", value: "Provisioned, NIC IP: 10.0.1.5 in spoke VNet subnet" },
        { label: "SQL Server", value: "mydb.database.windows.net — public access disabled" },
        { label: "DNS Resolution from VM", value: "nslookup mydb.database.windows.net → 40.x.x.x (public IP)" },
        { label: "Expected Resolution", value: "mydb.database.windows.net → mydb.privatelink.database.windows.net → 10.0.1.5" },
        { label: "Private DNS Zone", value: "privatelink.database.windows.net zone exists but is NOT linked to the spoke VNet" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Create a VNet link from the privatelink.database.windows.net Private DNS zone to the spoke VNet — this enables the VM to resolve the private endpoint IP through the Azure-provided DNS",
          color: "green",
        },
        {
          id: "action-b",
          label: "Add a hosts file entry on the VM mapping mydb.database.windows.net to 10.0.1.5",
          color: "red",
        },
        {
          id: "action-c",
          label: "Change the VM's DNS settings to use a custom DNS server that has a conditional forwarder for database.windows.net",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Re-enable public access on the SQL server so the current public IP resolution works, then add a firewall rule allowing only the VNet",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The Private DNS zone privatelink.database.windows.net contains the A record mapping mydb to 10.0.1.5, but the zone is not linked to the spoke VNet. Without a VNet link, VMs in that VNet use Azure's default public DNS resolution, which returns the public IP. Creating a VNet link registers the Private DNS zone with the VNet's DNS resolver — subsequent queries for mydb.database.windows.net are redirected to mydb.privatelink.database.windows.net and resolved to 10.0.1.5. This is a one-click fix in the portal.",
        },
        {
          id: "rationale-b",
          text: "A hosts file entry works for a single VM but does not scale — every VM, App Service, Function App, and container that connects to the database needs the same entry. Hosts files are not centrally managed, break when the private endpoint IP changes, and are invisible to monitoring tools. Private DNS zones provide centralized, automatic resolution for all resources in linked VNets.",
        },
        {
          id: "rationale-c",
          text: "A custom DNS server with conditional forwarder is the correct approach in hub-spoke architectures where on-premises DNS needs to resolve private endpoints. However, for a single spoke VNet with Azure VMs, linking the Private DNS zone to the VNet is simpler and does not require deploying and managing a custom DNS server. Custom DNS is appropriate for hybrid scenarios, not pure Azure-to-Azure resolution.",
        },
        {
          id: "rationale-d",
          text: "Re-enabling public access defeats the purpose of the private endpoint — the entire goal is to eliminate public internet exposure. VNet firewall rules on SQL still route traffic over the Microsoft backbone but the public endpoint remains exposed to potential attacks. Private endpoints provide true network-level isolation that firewall rules cannot match.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Linking the Private DNS zone to the VNet enables automatic resolution of the private endpoint FQDN — the most common fix for 'private endpoint deployed but application still connects to public IP' issues.",
        partial:
          "Custom DNS servers with conditional forwarders are correct for hybrid (on-prem + Azure) scenarios but are overkill for pure Azure VNet resolution where a DNS zone link suffices.",
        wrong:
          "Hosts file entries do not scale and are unmanageable across multiple VMs. Re-enabling public access eliminates the security benefit of private endpoints.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Hub-Spoke DNS Architecture — Centralized Private DNS for Multiple Spoke VNets",
      context:
        "An enterprise has a hub-spoke network with 1 hub VNet and 8 spoke VNets peered to the hub. Each spoke has applications that need private endpoint access to shared PaaS services (Storage, SQL, Key Vault). Currently, each spoke team creates their own Private DNS zones and VNet links, resulting in 24 duplicate DNS zones (3 per spoke × 8 spokes) with inconsistent configurations. The network team wants to centralize DNS management.",
      displayFields: [
        { label: "Network", value: "1 hub VNet + 8 spoke VNets (all peered to hub)" },
        { label: "PaaS Services", value: "Shared Storage, SQL, and Key Vault with private endpoints" },
        { label: "Current DNS", value: "24 Private DNS zones (3 per spoke × 8) — duplicated, inconsistent" },
        { label: "Problem", value: "DNS zone sprawl, no central management, spoke teams creating conflicting records" },
        { label: "Goal", value: "Centralize Private DNS in the hub, all spokes resolve through hub" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Create 3 Private DNS zones in the hub subscription (privatelink.blob.core.windows.net, privatelink.database.windows.net, privatelink.vaultcore.azure.net), link each zone to all 9 VNets (hub + 8 spokes), and delete the 24 duplicate spoke zones",
          color: "green",
        },
        {
          id: "action-b",
          label: "Deploy Azure DNS Private Resolver in the hub VNet and configure all spoke VNets to use the resolver's inbound endpoint as their custom DNS server",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Keep the 24 existing zones but assign Azure Policy to prevent spoke teams from creating new zones or modifying DNS records",
          color: "red",
        },
        {
          id: "action-d",
          label: "Use Azure Firewall DNS proxy in the hub to intercept all DNS queries from spokes and resolve private endpoint FQDNs centrally",
          color: "orange",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Azure Private DNS zones can be linked to multiple VNets regardless of subscription or region. Creating 3 zones in the hub and linking them to all 9 VNets provides centralized, consistent DNS resolution for all private endpoints. VMs in any spoke VNet resolve privatelink FQDNs through the linked zone — no custom DNS servers required. The hub network team manages zones centrally, and auto-registration can be enabled for hub resources. This is Microsoft's recommended architecture for hub-spoke Private DNS.",
        },
        {
          id: "rationale-b",
          text: "Azure DNS Private Resolver is needed when on-premises DNS must resolve Azure private endpoints (forwarding from on-prem DNS to Azure). For pure Azure-to-Azure resolution across peered VNets, Private DNS zone VNet links provide the same functionality without the cost and management overhead of a DNS Private Resolver. The resolver adds value only in hybrid (on-prem + Azure) DNS scenarios.",
        },
        {
          id: "rationale-c",
          text: "Keeping 24 duplicate zones with policy enforcement freezes the current inconsistent state. Existing conflicting records remain, zone configuration drift persists, and the management burden of 24 zones continues. Consolidation to 3 centrally managed zones eliminates the duplication and inconsistency at the root.",
        },
        {
          id: "rationale-d",
          text: "Azure Firewall DNS proxy can resolve private endpoint FQDNs, but it requires all spoke VNets to route DNS traffic through the firewall, adds firewall processing cost for every DNS query, and creates a single point of failure for DNS resolution. Private DNS zone VNet links are native, free, and do not require traffic to transit any intermediary.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Centralized Private DNS zones in the hub linked to all VNets is Microsoft's recommended pattern for hub-spoke private endpoint DNS — it eliminates zone duplication and provides consistent resolution across all spokes.",
        partial:
          "DNS Private Resolver and Firewall DNS proxy are valid for hybrid scenarios but add cost and complexity that is unnecessary for pure Azure hub-spoke DNS resolution.",
        wrong:
          "Keeping 24 duplicate zones with policy enforcement does not fix inconsistency — existing conflicting records remain and the operational burden of managing 24 zones persists.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Network Isolation — Eliminating Public Exposure for a Three-Tier Application",
      context:
        "A healthcare application handles PHI (Protected Health Information) and must pass a HIPAA audit. The architecture uses App Service (web tier), Azure Functions (logic tier), Azure SQL Database (data tier), Azure Storage (blob tier), and Key Vault (secrets). The auditor found that all five services have public endpoints accessible from the internet. The team must eliminate all public internet exposure while maintaining inter-service communication.",
      displayFields: [
        { label: "Web Tier", value: "App Service — must be accessible from the internet (user-facing)" },
        { label: "Logic Tier", value: "Azure Functions — called only by App Service, no internet access needed" },
        { label: "Data Tier", value: "Azure SQL Database — accessed only by Functions, no internet access needed" },
        { label: "Blob Tier", value: "Azure Storage — accessed only by Functions and App Service" },
        { label: "Secrets", value: "Key Vault — accessed only by App Service and Functions" },
        { label: "Audit Finding", value: "All 5 services have public endpoints — HIPAA violation for PHI data stores" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Deploy private endpoints for SQL, Storage, Key Vault, and Functions. Integrate App Service with the VNet using VNet Integration for outbound. Keep App Service's public endpoint (user-facing) but restrict Functions, SQL, Storage, and Key Vault to private-only access.",
          color: "green",
        },
        {
          id: "action-b",
          label: "Deploy private endpoints for all five services including App Service, and place Azure Front Door in front of App Service's private endpoint for public user access",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Use service endpoints on all five services to restrict access to the VNet subnet, and disable public access",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Move all services into an App Service Environment (ASE) v3 which provides built-in VNet isolation for all App Service and Functions resources",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "This architecture isolates each tier appropriately: (1) App Service keeps its public endpoint (users need internet access) but uses VNet Integration to route outbound traffic through the VNet to reach private endpoints. (2) Azure Functions gets a private endpoint — only accessible from within the VNet. (3) SQL Database, Storage, and Key Vault all get private endpoints with public access disabled — they are completely invisible from the internet. (4) All inter-service communication flows through private endpoints over the VNet — no PHI data traverses the public internet. This satisfies HIPAA requirements while keeping the user-facing web tier accessible.",
        },
        {
          id: "rationale-b",
          text: "Private endpoints for App Service with Front Door is architecturally valid but adds significant cost and complexity. Front Door Premium is required for private endpoint origin support, and the configuration involves custom domains, SSL certificates, and origin group management. For a user-facing web app, keeping the App Service public endpoint with VNet Integration for outbound is simpler, cheaper, and equally secure — user requests to the web tier are not PHI-sensitive; the PHI data is in the backend services.",
        },
        {
          id: "rationale-c",
          text: "Service endpoints restrict access to traffic from a specific VNet subnet but do NOT create a private IP address for the service. The service still resolves to a public IP — traffic stays on the Microsoft backbone but uses the public endpoint. HIPAA auditors increasingly require private endpoints (private IP, no public DNS resolution) over service endpoints for PHI data stores. Service endpoints also cannot be used with Azure Functions consumption plan.",
        },
        {
          id: "rationale-d",
          text: "ASE v3 provides full VNet isolation for App Service and Functions but costs significantly more (~$1,000+/month base fee before any app service plans). ASE is justified for organizations running dozens of App Services that all need VNet isolation. For a single application, private endpoints on individual services are far more cost-effective and achieve the same network isolation.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Private endpoints for backend services with VNet Integration for App Service outbound provides complete network isolation for PHI data while keeping the user-facing web tier accessible.",
        partial:
          "ASE and Front Door with private endpoint origins achieve network isolation but at significantly higher cost and complexity than targeted private endpoints on individual services.",
        wrong:
          "Service endpoints restrict access by subnet but do not assign private IPs — services still resolve to public endpoints. HIPAA compliance increasingly requires true private endpoint isolation for PHI data stores.",
      },
    },
  ],
  hints: [
    "Private endpoints require Private DNS zone VNet links to work — without the link, VMs resolve the public IP instead of the private endpoint IP. Always verify DNS resolution with nslookup from within the VNet.",
    "In hub-spoke architectures, create Private DNS zones in the hub and link them to all VNets (hub + spokes) — this centralizes DNS management and ensures consistent resolution across all spokes.",
    "Service endpoints restrict traffic by VNet subnet but use public IPs — private endpoints assign a true private IP in your VNet. For HIPAA/PCI compliance, private endpoints provide stronger isolation than service endpoints.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure Private Endpoints are the cornerstone of zero-trust network architecture in Azure. Every enterprise moving to Azure must understand private endpoint DNS resolution, hub-spoke DNS centralization, and the difference between private endpoints and service endpoints. Misconfigured DNS is the number one cause of private endpoint failures — mastering this area prevents hours of debugging.",
  toolRelevance: ["Azure Portal", "Azure Private Link", "Azure Private DNS", "Azure CLI", "Azure Network Watcher", "nslookup"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
