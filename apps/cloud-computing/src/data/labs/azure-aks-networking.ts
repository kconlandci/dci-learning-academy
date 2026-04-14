import type { LabManifest } from "../../types/manifest";

export const azureAksNetworkingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-aks-networking",
  version: 1,
  title: "Azure AKS Networking Models and Ingress Design",
  tier: "advanced",
  track: "azure-fundamentals",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["azure", "aks", "kubernetes", "networking", "cni", "kubenet", "ingress", "network-policy"],
  description:
    "Evaluate AKS networking models (kubenet vs Azure CNI), configure ingress controllers for production traffic, and implement network policies to enforce pod-level segmentation.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Compare kubenet and Azure CNI networking models and select the correct one based on scale and integration requirements",
    "Configure NGINX or Application Gateway Ingress Controller for production AKS traffic routing",
    "Implement Kubernetes network policies to restrict pod-to-pod communication and enforce microsegmentation",
    "Diagnose pod connectivity failures caused by misconfigured network plugins or missing policy rules",
  ],
  sortOrder: 213,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "AKS Cluster — Kubenet vs Azure CNI Selection",
      context:
        "A team is deploying a new AKS cluster that will host 40 microservices with up to 800 pods across 20 nodes. The cluster must integrate with existing Azure VNet resources including Azure SQL via private endpoints, Azure Files via service endpoints, and on-premises servers via ExpressRoute. Pods need direct IP addresses routable from the VNet so that Azure PaaS services and on-premises servers can initiate connections to specific pods.",
      displayFields: [
        { label: "Cluster Size", value: "20 nodes, up to 800 pods" },
        { label: "VNet Integration", value: "Azure SQL private endpoint, Azure Files service endpoint, ExpressRoute to on-prem" },
        { label: "Pod Routing", value: "Pods must be directly addressable from VNet and on-prem" },
        { label: "IP Budget", value: "Subnet /21 available (2,046 usable IPs)" },
        { label: "Compliance", value: "Network-level audit logging of pod-to-pod flows required" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Deploy with Azure CNI — each pod receives a VNet IP from the subnet, making pods directly routable from VNet and on-prem resources",
          color: "green",
        },
        {
          id: "action-b",
          label: "Deploy with kubenet — pods use private 10.244.0.0/16 overlay network and NAT to VNet, keeping IP consumption low",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Deploy with Azure CNI Overlay — pods get overlay IPs but with CNI plugin features, balancing IP usage with advanced networking",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Deploy with kubenet and configure user-defined routes (UDRs) to make pod overlay IPs routable from VNet and on-prem",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Azure CNI assigns each pod a real VNet IP address from the node's subnet. This makes every pod directly routable from on-premises (via ExpressRoute), from Azure PaaS services (via private endpoints/service endpoints), and from other VNets — no NAT, no UDRs. The /21 subnet provides 2,046 IPs, which comfortably supports 20 nodes + 800 pods + growth headroom. This is the correct choice when pods must be directly addressable from the VNet.",
        },
        {
          id: "rationale-b",
          text: "Kubenet assigns pods overlay IPs (10.244.0.0/16) that are NOT routable from the VNet. On-premises servers and Azure PaaS services cannot initiate connections to kubenet pod IPs. Traffic from pods to VNet resources is NATed through the node IP. This violates the requirement for pods to be directly addressable.",
        },
        {
          id: "rationale-c",
          text: "Azure CNI Overlay assigns pods overlay IPs (not VNet IPs) while using the CNI plugin. Pods are not directly routable from VNet or on-prem — overlay IPs require SNAT to leave the cluster. This is designed for clusters that need CNI features but have limited VNet IP space. It does not meet the direct-routability requirement.",
        },
        {
          id: "rationale-d",
          text: "Kubenet pod overlay IPs (10.244.x.x) cannot be made routable through UDRs alone in production. Each node has a different pod CIDR, requiring a UDR per node — this does not scale, breaks when nodes are replaced, and is not supported for ExpressRoute route propagation. This is fragile and unsupported at scale.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Azure CNI provides native VNet IP assignment to every pod, satisfying the requirement for direct routability from on-premises and Azure PaaS services.",
        partial:
          "CNI Overlay and kubenet both use overlay IPs that are not directly routable from the VNet — they require NAT or tunneling for inbound connections to pods.",
        wrong:
          "Kubenet overlay IPs cannot be made routable from ExpressRoute or VNet resources through UDRs. This is a common misconception that leads to connectivity failures in hybrid environments.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Ingress Controller — Production Traffic Routing for Multi-Tenant SaaS",
      context:
        "A multi-tenant SaaS platform on AKS serves 200 customer domains (tenant1.app.com, tenant2.app.com, etc.) through a single ingress point. The current NGINX Ingress Controller pod is receiving 15,000 requests/second and showing 502 errors during deployments. The team needs to solve the deployment-time errors and add WAF protection for OWASP Top 10 threats without changing DNS for 200 tenants.",
      displayFields: [
        { label: "Traffic", value: "15,000 req/s across 200 tenant domains" },
        { label: "Current Ingress", value: "Single NGINX Ingress Controller pod (1 replica)" },
        { label: "Problem", value: "502 errors during rolling deployments of backend services" },
        { label: "Security Requirement", value: "WAF with OWASP Top 10 protection" },
        { label: "Constraint", value: "Cannot change DNS records for 200 tenant domains" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Scale NGINX Ingress to 3+ replicas with PodDisruptionBudget, enable NGINX ModSecurity WAF module, and configure backend service readiness gates to prevent 502s during deployments",
          color: "green",
        },
        {
          id: "action-b",
          label: "Replace NGINX Ingress with Application Gateway Ingress Controller (AGIC) which provides native WAF and handles deployment transitions",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Add Azure Front Door in front of the cluster for WAF and route traffic through Front Door to the NGINX ingress",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Deploy a second NGINX Ingress Controller as a canary and split traffic 50/50 during deployments",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Three fixes in one: (1) Scaling NGINX Ingress to 3+ replicas with a PodDisruptionBudget ensures ingress survives node drains and pod restarts. (2) ModSecurity WAF module on NGINX provides OWASP Top 10 protection without changing the ingress controller type. (3) Readiness gates on backend services prevent Kubernetes from sending traffic to pods that haven't completed startup — eliminating 502s during rolling deployments. No DNS changes needed for any tenant.",
        },
        {
          id: "rationale-b",
          text: "AGIC maps Kubernetes Ingress resources to Azure Application Gateway configurations. While Application Gateway has native WAF_v2, AGIC has limitations: it manages the entire Application Gateway config, conflicts with non-AKS rules, and 200 host-based routing rules may hit Application Gateway limits (100 listeners on Standard_v2). Migration from NGINX to AGIC also requires testing all 200 tenant routing rules.",
        },
        {
          id: "rationale-c",
          text: "Azure Front Door adds WAF and global load balancing but introduces a second hop, additional latency, and requires all 200 tenant domains to update DNS to point to Front Door (or configure Front Door to forward to the existing IP). The constraint explicitly states DNS cannot change for 200 tenants.",
        },
        {
          id: "rationale-d",
          text: "Splitting traffic between two NGINX controllers during deployments creates session inconsistency, doubles ingress resource consumption permanently, and does not address the root cause of 502s (backend pods not ready to receive traffic). Canary deployments belong at the backend service level, not the ingress controller level.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Scaling NGINX replicas, enabling ModSecurity WAF, and using readiness gates addresses all three requirements — availability, security, and zero-downtime deployments — without DNS changes.",
        partial:
          "AGIC and Front Door are valid WAF solutions but introduce migration complexity or DNS changes that violate the constraint.",
        wrong:
          "Splitting traffic at the ingress controller layer during deployments does not fix the root cause of 502s (unready backend pods) and adds permanent infrastructure overhead.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Network Policy Enforcement — Isolating Sensitive Workloads",
      context:
        "An AKS cluster runs both public-facing APIs (namespace: 'public') and internal payment processing (namespace: 'payments'). A security audit found that any pod in the cluster can reach the payments service on port 8443. The payments service must only accept traffic from the 'api-gateway' pod in the 'public' namespace and the 'payment-worker' pods in its own namespace. All other ingress to payments must be denied.",
      displayFields: [
        { label: "Cluster Network Plugin", value: "Azure CNI with Calico network policy engine" },
        { label: "Payments Namespace", value: "pods: payment-api, payment-worker, payment-db" },
        { label: "Public Namespace", value: "pods: api-gateway, web-frontend, user-service" },
        { label: "Finding", value: "Any pod can reach payment-api:8443 — no network policies exist" },
        { label: "Requirement", value: "Only api-gateway (public ns) and payment-worker (payments ns) may reach payment-api:8443" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Apply a default-deny ingress NetworkPolicy in the payments namespace, then add a second policy allowing ingress to payment-api:8443 only from pods matching api-gateway label in namespace 'public' and payment-worker label in namespace 'payments'",
          color: "green",
        },
        {
          id: "action-b",
          label: "Apply a single NetworkPolicy that denies traffic from the 'public' namespace except for the api-gateway pod",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Configure Azure NSG rules on the AKS node subnet to block traffic between the nodes hosting public and payments pods",
          color: "red",
        },
        {
          id: "action-d",
          label: "Move the payments namespace to a separate AKS cluster with its own VNet to achieve network isolation",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The defense-in-depth approach: (1) A default-deny NetworkPolicy (spec.podSelector: {}, policyTypes: ['Ingress'], no ingress rules) blocks ALL ingress to every pod in the payments namespace. (2) A second allow-list policy permits ingress to payment-api:8443 from two sources: pods with label 'app=api-gateway' in namespace 'public', and pods with label 'app=payment-worker' in namespace 'payments'. Calico enforces these policies at the pod network level. This follows the principle of least privilege.",
        },
        {
          id: "rationale-b",
          text: "This policy only blocks traffic from the 'public' namespace (except api-gateway) but does not create a default-deny. Pods from other namespaces (default, monitoring, logging) can still reach payment-api:8443. Network policies are additive — without a default-deny, any traffic not explicitly blocked is allowed.",
        },
        {
          id: "rationale-c",
          text: "Azure NSGs operate at the VM/subnet level, not the pod level. Multiple pods from different namespaces run on the same node. You cannot use NSGs to allow traffic from api-gateway but deny traffic from web-frontend when both pods may be scheduled on the same node. Pod-level network policies require a Kubernetes network policy engine (Calico, Cilium).",
        },
        {
          id: "rationale-d",
          text: "A separate cluster provides the strongest isolation but is extreme overhead — separate control plane costs, separate monitoring, cross-cluster networking complexity, and increased operational burden. Kubernetes network policies with Calico provide pod-level microsegmentation within a single cluster, which is the standard approach for namespace isolation.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Default-deny plus explicit allow-list is the standard Kubernetes network policy pattern for zero-trust pod networking. Calico on Azure CNI enforces these policies at the iptables/eBPF level.",
        partial:
          "Your approach provides some isolation but either misses the default-deny foundation or operates at the wrong layer (subnet instead of pod).",
        wrong:
          "NSGs cannot enforce pod-level access control because multiple pods share the same node IP. Separate clusters are disproportionate when network policies can achieve the same microsegmentation.",
      },
    },
  ],
  hints: [
    "Azure CNI assigns VNet IPs to pods (directly routable), kubenet uses overlay IPs with NAT (not routable from VNet) — choose based on whether external systems need to initiate connections to individual pods.",
    "502 errors during AKS deployments usually mean traffic is being sent to pods that have not finished starting — configure readiness probes and readiness gates to prevent premature traffic routing.",
    "Kubernetes network policies are additive — without a default-deny policy, all traffic is allowed. Always start with a default-deny rule in sensitive namespaces, then add explicit allow-list policies.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "AKS networking decisions (CNI model, ingress controller, network policies) are made once during cluster creation and are expensive to change later. Engineers who understand these tradeoffs upfront avoid costly cluster rebuilds and security gaps that are discovered only during production incidents or compliance audits.",
  toolRelevance: ["Azure CLI", "kubectl", "Azure Portal", "Calico", "NGINX Ingress Controller", "Azure CNI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
