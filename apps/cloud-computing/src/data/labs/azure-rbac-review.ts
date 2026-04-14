import type { LabManifest } from "../../types/manifest";

export const azureRbacReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-rbac-review",
  version: 1,
  title: "Azure RBAC Access Review",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "rbac", "access-control", "least-privilege", "entra-id", "governance"],
  description:
    "Review and remediate over-privileged Azure RBAC role assignments to enforce least-privilege access across a production subscription.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify over-privileged role assignments and recommend the correct least-privilege role",
    "Understand the difference between Owner, Contributor, Reader, and service-specific roles",
    "Configure role assignments at the correct scope (management group, subscription, resource group, resource)",
  ],
  sortOrder: 210,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "scenario-1",
      title: "Quarterly Access Review — Production Subscription",
      description:
        "Review the current RBAC role assignments on the production subscription. Toggle each assignment to its correct least-privilege state. The principle: grant only the permissions required for the job function, at the narrowest scope possible.",
      targetSystem: "Azure Portal > Subscriptions > Production > Access control (IAM)",
      items: [
        {
          id: "item-dev-owner",
          label: "Developer Team Group → Owner (Subscription scope)",
          detail:
            "Developers need to deploy application resources (VMs, App Services, Storage) in their designated resource groups. They should not be able to manage billing, assign roles to others, or modify network security infrastructure.",
          currentState: "owner",
          correctState: "contributor-rg",
          states: ["owner", "contributor-rg", "reader", "remove"],
          rationaleId: "rationale-dev-contributor",
        },
        {
          id: "item-auditor-contributor",
          label: "External Auditor Account → Contributor (Subscription scope)",
          detail:
            "The external auditor needs to review resources, configurations, and audit logs for the annual compliance review. They must not modify any resources or deploy anything.",
          currentState: "contributor",
          correctState: "reader",
          states: ["contributor", "reader", "remove"],
          rationaleId: "rationale-auditor-reader",
        },
        {
          id: "item-backup-operator",
          label: "Backup Service Principal → Owner (Subscription scope)",
          detail:
            "The backup automation service principal only needs to trigger Azure Backup jobs and read backup status. It should have no ability to create or delete resources beyond what backup operations require.",
          currentState: "owner",
          correctState: "backup-operator",
          states: ["owner", "contributor", "backup-operator", "reader"],
          rationaleId: "rationale-backup-operator",
        },
        {
          id: "item-departed-employee",
          label: "john.smith@contoso.com (departed 45 days ago) → Contributor (Subscription scope)",
          detail:
            "John Smith left the company 45 days ago. His Azure AD account was disabled but his RBAC role assignment was not removed. Disabled accounts with active role assignments are a compliance violation.",
          currentState: "contributor",
          correctState: "remove",
          states: ["contributor", "reader", "remove"],
          rationaleId: "rationale-departed",
        },
      ],
      rationales: [
        {
          id: "rationale-dev-contributor",
          text: "Developers need Contributor on their specific resource groups (not the subscription) to deploy application resources. Owner at subscription scope grants role assignment capabilities — a privilege that could be abused to escalate access. Scope to resource group and use Contributor to enforce least-privilege.",
        },
        {
          id: "rationale-auditor-reader",
          text: "Read-only auditors need Reader role — the ability to view all resource configurations and properties. Contributor would allow them to modify or delete resources, which is inappropriate for an external auditor and creates audit independence concerns.",
        },
        {
          id: "rationale-backup-operator",
          text: "Azure Backup Operator is a purpose-built role for backup automation — it grants exactly the permissions needed for backup/restore operations without the ability to create, modify, or delete other resources. Owner at subscription scope is a massive over-grant for a backup service principal.",
        },
        {
          id: "rationale-departed",
          text: "Departed employee accounts with active RBAC assignments violate the principle of least privilege and most compliance frameworks (SOC2, ISO 27001). Even if the Azure AD account is disabled, the role assignment should be removed as a defensive measure and to pass compliance audits.",
        },
      ],
      feedback: {
        perfect:
          "Excellent access review. All over-privileged assignments are corrected and the departed employee assignment is removed.",
        partial:
          "Some assignments are correctly adjusted but others remain over-privileged. Review the scope and role level for each principal against their actual job function.",
        wrong:
          "Critical over-privilege remains. Owner at subscription scope for service accounts and Contributor for read-only auditors are common compliance failures.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-2",
      title: "Service Principal Role Assignments — Automation Accounts",
      description:
        "Review the role assignments for automation service principals. Each service principal should have only the minimum permissions required for its specific automated task. Toggle each to the correct state.",
      targetSystem: "Azure Portal > Azure AD > App Registrations > Service Principals",
      items: [
        {
          id: "item-cicd-pipeline",
          label: "CI/CD Pipeline SP → Contributor (Subscription scope)",
          detail:
            "The CI/CD pipeline deploys to a single resource group 'rg-production-app'. It needs to create/update/delete resources in that group only. It should not be able to modify network, security, or other resource groups.",
          currentState: "subscription-contributor",
          correctState: "rg-contributor",
          states: ["subscription-contributor", "rg-contributor", "rg-reader"],
          rationaleId: "rationale-cicd",
        },
        {
          id: "item-monitoring-sp",
          label: "Monitoring Agent SP → Contributor (Subscription scope)",
          detail:
            "The monitoring service principal reads metrics, diagnostic settings, and resource configurations for an observability platform. It never creates or modifies resources.",
          currentState: "subscription-contributor",
          correctState: "subscription-reader",
          states: ["subscription-contributor", "subscription-reader", "monitoring-reader"],
          rationaleId: "rationale-monitoring",
        },
        {
          id: "item-policy-sp",
          label: "Azure Policy Remediation SP → Resource Policy Contributor (Subscription scope)",
          detail:
            "This service principal is used by Azure Policy remediation tasks to apply automatic fixes to non-compliant resources (e.g., enabling diagnostic settings, adding tags). It needs to modify resources but should not create new resources or manage role assignments.",
          currentState: "subscription-reader",
          correctState: "resource-policy-contributor",
          states: ["subscription-reader", "resource-policy-contributor", "subscription-contributor"],
          rationaleId: "rationale-policy",
        },
        {
          id: "item-cost-sp",
          label: "FinOps Cost Reporting SP → Billing Reader (Subscription scope)",
          detail:
            "This service principal queries Azure Cost Management APIs to generate cost reports. It needs access to billing and cost data but nothing else.",
          currentState: "subscription-reader",
          correctState: "billing-reader",
          states: ["subscription-reader", "billing-reader", "cost-management-reader"],
          rationaleId: "rationale-cost",
        },
      ],
      rationales: [
        {
          id: "rationale-cicd",
          text: "CI/CD pipelines should operate at the minimum scope needed — Contributor on the specific resource group they deploy to, not the entire subscription. If the pipeline is compromised, subscription-scope Contributor allows an attacker to deploy malicious resources anywhere in the subscription.",
        },
        {
          id: "rationale-monitoring",
          text: "A monitoring service principal only reads data — Reader at subscription scope (or Monitoring Reader for metrics-specific access) is correct. Contributor grants write access that is never needed and creates unnecessary risk if the monitoring system is compromised.",
        },
        {
          id: "rationale-policy",
          text: "Resource Policy Contributor is specifically designed for policy remediation tasks — it allows modifying resource configurations to bring them into compliance but cannot create new resources, manage access, or perform destructive actions. Reader is too restrictive (can't make changes), Contributor is too broad.",
        },
        {
          id: "rationale-cost",
          text: "Billing Reader grants access to billing and invoice data without exposing resource configurations. Cost Management Reader is a subset that covers cost analysis but may not include all billing data. For a FinOps reporting tool, Billing Reader is the more appropriate choice.",
        },
      ],
      feedback: {
        perfect:
          "All service principal assignments are correctly scoped. Each principal has only the permissions their specific task requires, at the narrowest applicable scope.",
        partial:
          "Some assignments are correct but others are either too broad (monitoring with Contributor) or too narrow (policy remediation with Reader).",
        wrong:
          "Service principals with excessive permissions are a top attack surface for privilege escalation. Review each SP's actual operations against the permissions assigned.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-3",
      title: "Custom Role vs. Built-In Role Decision",
      description:
        "The network team needs access that doesn't map perfectly to any built-in Azure role. Review each scenario and toggle whether to use an existing built-in role or create a custom role.",
      targetSystem: "Azure Portal > Azure AD > Roles and Administrators",
      items: [
        {
          id: "item-network-config",
          label: "Network Ops: Read and update NSG rules and route tables only (no other network changes)",
          detail:
            "Built-in 'Network Contributor' grants access to all networking resources including VNets, peerings, VPN gateways. The team only needs NSG and route table management. 'Network Contributor' is too broad.",
          currentState: "network-contributor",
          correctState: "custom-role",
          states: ["network-contributor", "custom-role"],
          rationaleId: "rationale-custom-nsg",
        },
        {
          id: "item-vm-restart",
          label: "Support Ops: Restart and deallocate VMs only — no create/delete",
          detail:
            "The support team needs to restart stuck VMs and deallocate VMs for cost saving. 'Virtual Machine Contributor' grants full VM management including create and delete. The 'Virtual Machine Operator' built-in role covers exactly start/stop/restart.",
          currentState: "vm-contributor",
          correctState: "vm-operator",
          states: ["vm-contributor", "vm-operator", "custom-role"],
          rationaleId: "rationale-vm-operator",
        },
        {
          id: "item-aks-dev",
          label: "App Dev Team: Read Kubernetes cluster resources (pods, services) but not cluster config",
          detail:
            "Developers need to view Kubernetes workloads (kubectl get pods/services) but should not access cluster admin credentials or node configurations. Built-in 'Azure Kubernetes Service Cluster User Role' provides kubeconfig access. 'AKS RBAC Reader' scopes to namespace level.",
          currentState: "aks-contributor",
          correctState: "aks-rbac-reader",
          states: ["aks-contributor", "aks-rbac-reader", "custom-role"],
          rationaleId: "rationale-aks-reader",
        },
        {
          id: "item-sql-schema",
          label: "DBA Team: Deploy database schemas and stored procedures, but cannot read data",
          detail:
            "DBAs need to run DDL commands (CREATE TABLE, ALTER PROCEDURE) but must not be able to SELECT production data. No built-in Azure role provides this granularity — it requires SQL-level permissions combined with Azure RBAC.",
          currentState: "sql-contributor",
          correctState: "custom-role",
          states: ["sql-contributor", "sql-db-contributor", "custom-role"],
          rationaleId: "rationale-sql-custom",
        },
      ],
      rationales: [
        {
          id: "rationale-custom-nsg",
          text: "No built-in Azure role scopes to NSG and route tables only — Network Contributor covers all networking resources. A custom role with specific actions for Microsoft.Network/networkSecurityGroups/* and Microsoft.Network/routeTables/* is the correct least-privilege approach.",
        },
        {
          id: "rationale-vm-operator",
          text: "Azure provides a built-in 'Virtual Machine Operator' role that grants exactly start, stop, restart, and deallocate permissions without create/delete rights. Always check for a built-in role before creating a custom one — built-in roles are maintained by Microsoft and cover most common operations.",
        },
        {
          id: "rationale-aks-reader",
          text: "AKS RBAC Reader provides namespace-scoped read access to Kubernetes resources (pods, services, deployments) without cluster admin access. This is the correct built-in role for developers who need workload visibility without infrastructure access.",
        },
        {
          id: "rationale-sql-custom",
          text: "Azure RBAC roles for SQL control data plane access (CREATE, ALTER, SELECT) only at the connection level — granular DDL-without-SELECT permissions require SQL-level database roles, not just Azure RBAC. A combination of Azure RBAC for resource management and SQL GRANT/DENY for data access is required here.",
        },
      ],
      feedback: {
        perfect:
          "Correct decisions on all four. You correctly identified when built-in roles are sufficient and when custom roles are needed for fine-grained least-privilege.",
        partial:
          "Some decisions are correct but you either created unnecessary custom roles (when built-ins exist) or used overly broad built-ins (when custom roles are needed).",
        wrong:
          "Over-reliance on broad built-in roles (VM Contributor, Network Contributor) when more specific ones exist — or choosing built-ins when the granularity requires a custom role — are common access review failures.",
      },
    },
  ],
  hints: [
    "Owner includes the ability to assign roles to others — never grant Owner unless the principal needs to manage access for others. Use Contributor for resource management without role assignment capability.",
    "Before creating a custom RBAC role, check if a service-specific built-in role exists (e.g., Virtual Machine Operator, AKS RBAC Reader, Backup Operator) — these provide least-privilege without maintenance overhead.",
    "Scope role assignments to the narrowest resource (resource group or specific resource) rather than subscription level whenever possible — if a CI/CD pipeline deploys to one resource group, it should have Contributor on that group only.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "RBAC access reviews are a mandatory control in every major compliance framework (SOC 2, ISO 27001, PCI-DSS). The ability to identify over-privileged assignments and recommend least-privilege alternatives is an immediately valuable skill in any cloud governance, security, or platform engineering role. Quarterly access reviews are now a standard part of cloud operations.",
  toolRelevance: ["Azure Portal", "Microsoft Entra Admin Center", "Azure CLI", "Azure Policy", "Microsoft Defender for Cloud"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
