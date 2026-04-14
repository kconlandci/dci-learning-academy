import type { LabManifest } from "../../types/manifest";

export const gcpAnthosMulticlusterLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-anthos-multicluster",
  version: 1,
  title: "Anthos Multi-Cluster Management",
  tier: "advanced",
  track: "gcp-essentials",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["gcp", "anthos", "multi-cluster", "service-mesh", "config-sync", "gke", "fleet-management"],
  description:
    "Design and manage multi-cluster Kubernetes environments using Google Anthos. Practice fleet-level policy enforcement with Config Sync, configure Service Mesh for cross-cluster routing, and resolve networking challenges across GKE and on-prem clusters.",
  estimatedMinutes: 15,
  learningObjectives: [
    "Register heterogeneous clusters into an Anthos fleet for centralized management",
    "Configure Config Sync to enforce consistent policies across all fleet clusters",
    "Design Anthos Service Mesh routing for cross-cluster service communication",
    "Troubleshoot multi-cluster networking issues including firewall rules and connectivity",
    "Choose the correct Anthos component for a given multi-cluster operational challenge",
  ],
  sortOrder: 315,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "anthos-s1-config-drift",
      title: "Configuration Drift Across Fleet Clusters",
      context:
        "Your organization operates a fleet of 12 GKE clusters across 4 regions. A security audit reveals that 5 clusters are missing the required NetworkPolicy that restricts egress to only approved external endpoints. The other 7 clusters have the correct policy. The drift was introduced when the platform team manually applied the policy to new clusters but missed some. Management wants a guarantee this cannot happen again.",
      displayFields: [
        { label: "Fleet Size", value: "12 GKE clusters across 4 regions", emphasis: "normal" },
        { label: "Drift Detected", value: "5 clusters missing required NetworkPolicy", emphasis: "critical" },
        { label: "Root Cause", value: "Manual kubectl apply to individual clusters", emphasis: "warn" },
        { label: "Requirement", value: "Guarantee consistent policy across all clusters, current and future", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Write a script that runs kubectl apply against all 12 clusters on a cron schedule", color: "yellow" },
        { id: "a2", label: "Configure Config Sync with a Git repository as the source of truth, syncing the NetworkPolicy to all fleet clusters with drift prevention enabled", color: "green" },
        { id: "a3", label: "Use Anthos Service Mesh authorization policies instead of NetworkPolicy", color: "orange" },
        { id: "a4", label: "Create an OPA Gatekeeper constraint that audits for the NetworkPolicy and alerts on violations", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "A cron-based script can apply configurations but has no drift detection, no rollback, no approval workflow, and no guarantee of convergence if a cluster is temporarily unreachable." },
        { id: "r2", text: "Config Sync continuously reconciles cluster state to match a Git repository. Drift prevention ensures that manual changes are automatically reverted, and new clusters joining the fleet automatically receive the policy." },
        { id: "r3", text: "Service mesh authorization policies operate at L7 and complement NetworkPolicy but do not replace network-layer egress controls required by the security policy." },
        { id: "r4", text: "OPA Gatekeeper can detect policy violations but only audits — it does not remediate drift. The requirement is to guarantee consistency, not just detect violations." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Config Sync with a Git source of truth provides continuous reconciliation, drift prevention, and automatic policy application to new fleet members — exactly what a fleet-wide guarantee requires.",
        partial: "Detection and alerting are useful but the requirement is to guarantee consistency. Config Sync goes beyond detection to actively remediate drift and prevent manual changes.",
        wrong: "This approach doesn't provide the continuous reconciliation or drift prevention needed. Manual or scripted approaches cannot guarantee consistency at fleet scale.",
      },
    },
    {
      type: "action-rationale",
      id: "anthos-s2-cross-cluster-routing",
      title: "Cross-Cluster Service Routing for High Availability",
      context:
        "Your payment processing service runs in two GKE clusters: us-central1 (primary) and europe-west1 (secondary). During a regional incident, the us-central1 cluster's payment service becomes unhealthy. Traffic from the US-based API gateway must automatically fail over to the europe-west1 cluster's payment service with minimal latency impact. Both clusters are registered in the same Anthos fleet with Anthos Service Mesh enabled.",
      displayFields: [
        { label: "Primary Cluster", value: "us-central1 — payment service UNHEALTHY", emphasis: "critical" },
        { label: "Secondary Cluster", value: "europe-west1 — payment service HEALTHY", emphasis: "normal" },
        { label: "Service Mesh", value: "Anthos Service Mesh enabled on both clusters", emphasis: "normal" },
        { label: "Requirement", value: "Automatic failover with no application code changes", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Configure a Multi Cluster Ingress with a BackendConfig health check that routes to healthy clusters automatically", color: "yellow" },
        { id: "a2", label: "Configure Anthos Service Mesh with multi-cluster service discovery and locality-aware load balancing with failover priorities", color: "green" },
        { id: "a3", label: "Update DNS records to point to the europe-west1 cluster when us-central1 is unhealthy", color: "red" },
        { id: "a4", label: "Deploy the API gateway in both clusters and use Cloud Load Balancing for cluster-level failover", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Multi Cluster Ingress handles north-south traffic failover at the ingress layer but does not provide service-to-service (east-west) cross-cluster routing that the mesh enables." },
        { id: "r2", text: "Anthos Service Mesh with multi-cluster service discovery enables transparent cross-cluster routing. Locality-aware load balancing prefers the local cluster but automatically fails over to the remote cluster when health checks fail — with no application changes." },
        { id: "r3", text: "DNS failover has propagation delays of minutes to hours depending on TTL settings, which is unacceptable for payment processing that requires sub-second failover." },
        { id: "r4", text: "Deploying the API gateway in both clusters adds redundancy at the edge but doesn't solve the payment service's east-west cross-cluster routing requirement." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Anthos Service Mesh's multi-cluster service discovery with locality-aware failover provides automatic, transparent cross-cluster routing without application changes.",
        partial: "You're addressing failover but at the wrong layer. The requirement is service-to-service routing that automatically redirects when a specific service is unhealthy, not just cluster-level failover.",
        wrong: "This approach introduces unacceptable latency or doesn't address the cross-cluster service discovery requirement. The service mesh is the correct layer for transparent failover.",
      },
    },
    {
      type: "action-rationale",
      id: "anthos-s3-hybrid-onprem",
      title: "Registering On-Premises Cluster into Anthos Fleet",
      context:
        "Your organization runs a bare-metal Kubernetes cluster in a private data center that hosts legacy workloads that cannot migrate to the cloud. The platform team wants to manage this cluster alongside 8 GKE clusters using Anthos. The on-premises network has no direct connectivity to GCP — all communication goes through the public internet via a corporate proxy. The cluster runs Kubernetes 1.28.",
      displayFields: [
        { label: "On-Prem Cluster", value: "Bare-metal Kubernetes 1.28 — private data center", emphasis: "normal" },
        { label: "Network", value: "No direct GCP connectivity — public internet via corporate proxy", emphasis: "warn" },
        { label: "Existing Fleet", value: "8 GKE clusters managed by Anthos", emphasis: "normal" },
        { label: "Goal", value: "Unified fleet management including on-prem cluster", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Install the Connect Agent on the on-premises cluster to register it with the Anthos fleet via a proxy-aware outbound connection", color: "green" },
        { id: "a2", label: "Set up a Cloud VPN tunnel between the data center and GCP before registering the cluster", color: "yellow" },
        { id: "a3", label: "Migrate the on-premises workloads to GKE and decommission the bare-metal cluster", color: "red" },
        { id: "a4", label: "Use Anthos on bare metal to reinstall the cluster with Anthos-managed infrastructure", color: "orange" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "The Connect Agent runs inside the on-prem cluster and establishes an outbound-only connection to GCP Fleet API through the corporate proxy. It requires no inbound firewall rules or VPN and works with existing network constraints." },
        { id: "r2", text: "A Cloud VPN would work but adds significant infrastructure complexity and cost. The Connect Agent is specifically designed for environments without direct GCP network connectivity." },
        { id: "r3", text: "The workloads explicitly cannot migrate to the cloud. This option ignores the stated constraint and would require a major re-architecture effort." },
        { id: "r4", text: "Anthos on bare metal would replace the existing cluster infrastructure, which is disruptive and unnecessary. The goal is fleet management, not infrastructure replacement." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. The Connect Agent is purpose-built for registering external clusters into an Anthos fleet. It uses outbound-only connections and supports proxy configurations, making it ideal for restricted network environments.",
        partial: "VPN connectivity would enable registration but is over-engineered for this use case. The Connect Agent was specifically designed for clusters without direct GCP connectivity.",
        wrong: "This approach either ignores stated constraints or requires unnecessary infrastructure changes. The Connect Agent is the lightweight, purpose-built solution for fleet registration.",
      },
    },
  ],
  hints: [
    "Config Sync uses a GitOps model — the Git repository is the single source of truth. Any manual changes to a synced resource are automatically reverted by the reconciler, preventing configuration drift.",
    "Anthos Service Mesh multi-cluster service discovery requires clusters to be in the same fleet and share a common root of trust. Locality-aware load balancing prefers local endpoints but fails over to remote clusters when health checks fail.",
    "The Connect Agent establishes an outbound-only gRPC connection from the external cluster to the GCP Fleet API. It does not require inbound firewall rules or VPN tunnels.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Anthos multi-cluster management skills are in high demand as enterprises adopt hybrid and multi-cloud Kubernetes strategies. Platform engineers who can manage fleet-wide policies, configure service mesh cross-cluster routing, and integrate on-premises clusters into Anthos fleets are critical hires for organizations modernizing legacy infrastructure.",
  toolRelevance: ["Google Anthos", "Config Sync", "Anthos Service Mesh", "Connect Agent", "GKE Fleet API", "Policy Controller"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
