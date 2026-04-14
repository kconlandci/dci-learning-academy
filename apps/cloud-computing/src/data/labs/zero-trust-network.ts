import type { LabManifest } from "../../types/manifest";

export const zeroTrustNetworkLab: LabManifest = {
  schemaVersion: "1.1",
  id: "zero-trust-network",
  version: 1,
  title: "Zero Trust Network Architecture",
  tier: "beginner",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["security", "zero-trust", "bpa", "microsegmentation", "identity", "networking"],
  description:
    "Apply zero trust principles to cloud network architecture decisions. Practice replacing implicit trust with identity-verified, continuously validated access controls for workloads, users, and service-to-service communication.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Understand the core principles of zero trust: never trust, always verify",
    "Replace VPN-based remote access with identity-aware proxy solutions",
    "Implement service mesh mutual TLS for service-to-service authentication",
    "Apply microsegmentation to limit lateral movement in cloud environments",
    "Choose between network-layer and identity-layer controls for zero trust enforcement",
  ],
  sortOrder: 505,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "zt-s1-vpn-replacement",
      title: "Legacy VPN Access for Remote Developers",
      context:
        "Your company's 200 remote developers access internal cloud resources through a legacy site-to-site VPN that grants full network access to a /16 CIDR block once connected. The CISO has mandated a zero trust network access (ZTNA) initiative. You are recommending the replacement architecture.",
      displayFields: [
        { label: "Current Access Model", value: "Site-to-Site VPN → Full /16 network access", emphasis: "warn" },
        { label: "User Count", value: "200 remote developers", emphasis: "normal" },
        { label: "Resources Accessed", value: "Dev databases, CI/CD systems, internal dashboards", emphasis: "normal" },
        { label: "Current MFA", value: "Not enforced on VPN", emphasis: "critical" },
        { label: "ZTNA Mandate", value: "Board-approved initiative", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Keep VPN but enforce MFA at the VPN gateway", color: "yellow" },
        { id: "a2", label: "Deploy an identity-aware proxy (IAP) that grants per-application access based on device posture and user identity", color: "green" },
        { id: "a3", label: "Replace VPN with network firewall rules based on developer IP addresses", color: "red" },
        { id: "a4", label: "Require developers to use cloud-hosted desktops (VDI) instead of remote access", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Adding MFA to the existing VPN improves authentication but doesn't address the broad network access granted post-authentication — this is not zero trust." },
        { id: "r2", text: "An identity-aware proxy evaluates identity, device health, and context for every access request, granting minimum access to specific applications — this is the definition of zero trust." },
        { id: "r3", text: "IP-based rules are not zero trust; developers use dynamic IPs and this approach is easily bypassed through compromised developer machines." },
        { id: "r4", text: "VDI moves the access boundary but doesn't enforce zero trust principles and adds significant infrastructure cost and latency for developers." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. An identity-aware proxy is the architectural zero trust solution — it verifies identity and device posture per-request rather than granting broad network access.",
        partial: "You're improving security but not achieving zero trust. Adding controls to an implicit-trust VPN still grants broad network access after initial authentication.",
        wrong: "This approach either maintains broad network access or creates new operational problems without achieving the continuous verification that zero trust requires.",
      },
    },
    {
      type: "action-rationale",
      id: "zt-s2-service-to-service",
      title: "Service-to-Service Authentication in Microservices",
      context:
        "A Kubernetes cluster hosts 15 microservices. Currently, services communicate over the cluster network without authentication — any service can call any other service on any port. A security audit recommends mutual authentication for all inter-service communication.",
      displayFields: [
        { label: "Platform", value: "Amazon EKS", emphasis: "normal" },
        { label: "Services", value: "15 microservices, mixed trust levels", emphasis: "normal" },
        { label: "Current Auth", value: "No service-to-service authentication", emphasis: "critical" },
        { label: "Lateral Movement Risk", value: "Any compromised service can reach all others", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Implement Kubernetes NetworkPolicy rules to restrict pod-to-pod communication", color: "yellow" },
        { id: "a2", label: "Deploy a service mesh (Istio/Linkerd) with mTLS enforced between all services", color: "green" },
        { id: "a3", label: "Require all services to include a shared API key in request headers", color: "red" },
        { id: "a4", label: "Deploy each service in a separate VPC with VPC peering between allowed pairs", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "NetworkPolicy restricts network-layer connectivity but doesn't authenticate the workload identity — a compromised pod can still impersonate a legitimate service." },
        { id: "r2", text: "A service mesh with mTLS provides cryptographic workload identity verification for every request. Each service presents a certificate, enabling mutual authentication and encrypted communication." },
        { id: "r3", text: "Shared API keys are a single point of compromise — if any service is breached, all services are compromised. This is not zero trust authentication." },
        { id: "r4", text: "Separate VPCs per service is operationally impractical for 15 services, adds significant latency, and still doesn't provide workload identity authentication." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. A service mesh with enforced mTLS provides cryptographic workload identity — the gold standard for zero trust service-to-service authentication in Kubernetes.",
        partial: "You're reducing attack surface but not achieving zero trust. Network-layer controls restrict reachability but don't authenticate workload identity.",
        wrong: "This approach either doesn't authenticate workloads or introduces operational complexity that doesn't scale. Zero trust requires cryptographic identity verification.",
      },
    },
    {
      type: "action-rationale",
      id: "zt-s3-device-trust",
      title: "Unmanaged Device Accessing Cloud Resources",
      context:
        "An alert shows a finance team member is accessing the internal expense management application from an unrecognized device. The device has no MDM enrollment, no endpoint detection agent, and passed only a password-based authentication. The user's account was flagged for unusual login location last month.",
      displayFields: [
        { label: "User", value: "finance-mgr-02 (Finance Manager)", emphasis: "normal" },
        { label: "Device Status", value: "Unmanaged — no MDM, no EDR agent", emphasis: "critical" },
        { label: "Authentication", value: "Password only (no MFA)", emphasis: "critical" },
        { label: "Login Location", value: "New country — not previously seen", emphasis: "warn" },
        { label: "Application", value: "Expense Management (accesses financial data)", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Allow access since the user authenticated successfully", color: "red" },
        { id: "a2", label: "Block access, require MFA step-up, and deny until device is MDM-enrolled or access comes from a managed device", color: "green" },
        { id: "a3", label: "Send an alert email to the security team and monitor the session", color: "yellow" },
        { id: "a4", label: "Allow read-only access to the expense application from the unmanaged device", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "A successful password authentication from an unmanaged device in a new country does not constitute verified identity under zero trust — contextual risk must inform access decisions." },
        { id: "r2", text: "Zero trust requires continuously validating device health, identity, and context. An unmanaged device from a new country without MFA fails multiple trust signals and must be blocked until risk is resolved." },
        { id: "r3", text: "Monitoring while the session continues is passive response that allows potential exfiltration to proceed during the investigation window." },
        { id: "r4", text: "Read-only access still permits data exfiltration of financial records. Zero trust doesn't grant partial trust to an unverified device — access is blocked until trust is established." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Zero trust mandates that unmanaged devices with failed trust signals must be blocked regardless of initial authentication success.",
        partial: "You recognized the risk but the response doesn't fully enforce zero trust. Monitoring or partial access still permits a potentially compromised session to continue.",
        wrong: "Allowing any access from an unmanaged device with multiple failed trust signals (no MFA, new country, no MDM) violates zero trust principles and risks financial data exposure.",
      },
    },
  ],
  hints: [
    "Zero trust is summarized as 'never trust, always verify' — assume breach, verify explicitly using identity + device + context, and enforce least-privilege access for every request.",
    "Identity-aware proxies (Google BeyondCorp, Cloudflare Access, AWS Verified Access) evaluate device posture, user identity, and risk signals before granting per-application access — they are the primary ZTNA tool.",
    "Service meshes like Istio enforce mTLS by injecting sidecar proxies that handle certificate issuance and validation transparently, without requiring application code changes.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Zero trust architecture is the dominant enterprise security model for 2024-2026 cloud transformations. Security architects and cloud engineers who can design and implement ZTNA, mTLS service meshes, and continuous device trust evaluation command top-tier salaries at cloud-native companies.",
  toolRelevance: ["AWS Verified Access", "Google BeyondCorp", "Cloudflare Access", "Istio", "Linkerd", "AWS App Mesh", "Azure AD Conditional Access"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
