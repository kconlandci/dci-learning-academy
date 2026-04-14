import type { LabManifest } from "../../types/manifest";

export const azurePolicyComplianceLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-policy-compliance",
  version: 1,
  title: "Azure Policy Definitions, Initiatives, and Remediation",
  tier: "advanced",
  track: "azure-fundamentals",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["azure", "policy", "compliance", "governance", "initiatives", "remediation", "deny", "audit"],
  description:
    "Design Azure Policy definitions and initiatives to enforce organizational compliance standards, configure policy effects (deny, audit, modify, deployIfNotExists), and create remediation tasks to bring non-compliant resources into compliance.",
  estimatedMinutes: 13,
  learningObjectives: [
    "Author custom Azure Policy definitions with appropriate effects (deny, audit, modify, deployIfNotExists) based on enforcement requirements",
    "Organize policies into initiatives and assign them at the correct scope (management group, subscription, resource group)",
    "Create and monitor remediation tasks that fix non-compliant resources using deployIfNotExists and modify policies",
    "Handle policy exemptions for legitimate exceptions without weakening the overall compliance posture",
    "Diagnose policy evaluation failures and understand the policy evaluation order",
  ],
  sortOrder: 217,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Policy Effect Selection — Enforcing Encryption on Storage Accounts",
      context:
        "The compliance team requires that all storage accounts across the organization use infrastructure encryption (double encryption) and customer-managed keys (CMK). There are currently 120 storage accounts — 85 already comply, 35 do not. New storage accounts must be blocked if they don't meet the encryption requirements. Existing non-compliant accounts need to be flagged for remediation but NOT deleted or disrupted.",
      displayFields: [
        { label: "Requirement", value: "All storage accounts must use infrastructure encryption + CMK" },
        { label: "Existing Compliant", value: "85 storage accounts (already using infrastructure encryption + CMK)" },
        { label: "Existing Non-Compliant", value: "35 storage accounts (missing infrastructure encryption or CMK)" },
        { label: "New Resources", value: "Must be blocked at creation time if non-compliant" },
        { label: "Existing Resources", value: "Must be flagged, not disrupted" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Create two policies: (1) a 'deny' effect policy that blocks creation of storage accounts without infrastructure encryption and CMK, and (2) an 'audit' effect policy that flags existing non-compliant storage accounts for manual remediation",
          color: "green",
        },
        {
          id: "action-b",
          label: "Create a single 'deny' effect policy that blocks both creation and updates of non-compliant storage accounts",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Create a 'deployIfNotExists' policy that automatically enables infrastructure encryption on all storage accounts",
          color: "red",
        },
        {
          id: "action-d",
          label: "Create an 'audit' effect policy for all storage accounts and rely on the compliance dashboard to track violations",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Two separate policies with different effects handle the two requirements precisely: (1) The 'deny' policy intercepts ARM resource creation/update operations and blocks non-compliant new storage accounts at deployment time — this is a preventive control. (2) The 'audit' policy evaluates existing resources and marks the 35 non-compliant accounts as non-compliant in the compliance dashboard without affecting their operation. The compliance team can then plan manual remediation (enabling CMK requires key vault setup and cannot be fully automated).",
        },
        {
          id: "rationale-b",
          text: "A single 'deny' policy blocks creation AND updates of non-compliant storage accounts. This means the 35 existing non-compliant accounts cannot be modified at all (no configuration changes, no access tier changes, nothing) until encryption is fixed. This causes operational disruption — teams cannot make urgent changes to production storage accounts that happen to be non-compliant.",
        },
        {
          id: "rationale-c",
          text: "Infrastructure encryption must be enabled at storage account creation time — it cannot be toggled on existing storage accounts. 'deployIfNotExists' cannot retroactively enable infrastructure encryption on the 35 existing accounts. Additionally, CMK configuration requires a Key Vault key URI specific to each team's key management, which cannot be auto-configured by policy.",
        },
        {
          id: "rationale-d",
          text: "Audit-only provides visibility but no prevention. New non-compliant storage accounts can still be created freely, and the number of non-compliant resources grows. Audit is the right effect for existing resources but insufficient for preventing new violations.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Combining 'deny' for prevention with 'audit' for detection provides both enforcement for new resources and visibility for existing non-compliant resources without operational disruption.",
        partial:
          "Audit-only provides visibility but no enforcement on new resources. Deny-only blocks both new creation and existing resource updates, causing operational disruption.",
        wrong:
          "Infrastructure encryption cannot be enabled on existing storage accounts via deployIfNotExists — it is an immutable property set at creation time.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Initiative Assignment — Multi-Subscription Governance",
      context:
        "An enterprise has 3 management groups: Production, Development, and Sandbox. The security team has created a compliance initiative containing 15 policies covering network security (NSGs required, no public IPs on VMs), encryption (CMK, TLS 1.2), and tagging (cost-center, environment tags required). Production needs full enforcement (deny), Development needs auditing only, and Sandbox should be exempt from all policies.",
      displayFields: [
        { label: "Management Groups", value: "Production (12 subscriptions), Development (8 subscriptions), Sandbox (3 subscriptions)" },
        { label: "Initiative", value: "15 policies: network security, encryption, tagging" },
        { label: "Production", value: "Full enforcement — deny non-compliant resources" },
        { label: "Development", value: "Audit only — flag but do not block" },
        { label: "Sandbox", value: "No policies — complete freedom for experimentation" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Create two versions of the initiative with parameterized effects: assign the 'deny' version to Production management group and 'audit' version to Development management group. Do not assign to Sandbox.",
          color: "green",
        },
        {
          id: "action-b",
          label: "Assign the initiative at the root management group with 'deny' effect, then create policy exemptions for all Development and Sandbox subscriptions",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Assign the initiative to each of the 20 individual subscriptions in Production and Development with the appropriate effect per subscription",
          color: "red",
        },
        {
          id: "action-d",
          label: "Assign the initiative to Production with 'deny', assign to Development with 'deny' but set enforcement mode to 'DoNotEnforce', and skip Sandbox",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Parameterized policy effects allow a single initiative definition with effect parameters (e.g., 'effect': '[parameters(\"effectAction\")]') that default to 'deny' but can be overridden to 'audit' at assignment time. Assigning at the management group level automatically covers all subscriptions within that group — new subscriptions added to Production automatically inherit deny enforcement, new subscriptions in Development inherit audit. Sandbox gets no assignment, maintaining complete freedom. This is the Azure governance best practice for multi-environment policy management.",
        },
        {
          id: "rationale-b",
          text: "Assigning at the root with deny and exempting Development/Sandbox creates maintenance burden — every new subscription in Development or Sandbox must be manually exempted. Exemptions should be used for specific, documented exceptions (e.g., a single resource with a business justification), not as a blanket mechanism for entire management groups.",
        },
        {
          id: "rationale-c",
          text: "Assigning to 20 individual subscriptions creates 20 separate policy assignments to maintain. When the initiative is updated (new policy added), all 20 assignments must be verified. When a new subscription is created, someone must remember to assign the initiative. Management group-level assignment automatically inherits to child subscriptions — this is why management groups exist.",
        },
        {
          id: "rationale-d",
          text: "DoNotEnforce mode on Development is close to correct — it evaluates compliance without blocking. However, it still shows 'deny' as the effect in the assignment, which confuses compliance reporting (resources show as 'would be denied' rather than 'audited'). Using a parameterized 'audit' effect provides cleaner compliance reporting and clearer intent. DoNotEnforce is better suited for testing new policies before enforcement.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Parameterized initiatives with management group-level assignment provide clean, scalable governance — deny for Production, audit for Development, and automatic inheritance for new subscriptions.",
        partial:
          "DoNotEnforce mode works for Development but produces confusing compliance reports. Per-subscription assignment does not scale and misses new subscriptions.",
        wrong:
          "Assigning to individual subscriptions defeats the purpose of management groups and creates a maintenance burden that grows with every new subscription.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Remediation Task — Fixing Non-Compliant Resources at Scale",
      context:
        "A 'deployIfNotExists' policy requires all VMs to have the Azure Monitor Agent (AMA) extension installed. After assigning the policy, the compliance dashboard shows 200 existing VMs as non-compliant. New VMs automatically get AMA installed via the policy, but existing VMs remain non-compliant because 'deployIfNotExists' only triggers on resource creation/update events. The team needs to bring the 200 existing VMs into compliance.",
      displayFields: [
        { label: "Policy Effect", value: "deployIfNotExists — installs AMA extension on VMs" },
        { label: "Non-Compliant VMs", value: "200 existing VMs missing AMA extension" },
        { label: "New VMs", value: "Automatically compliant (policy triggers on create)" },
        { label: "Constraint", value: "Cannot manually SSH into 200 VMs to install the agent" },
        { label: "Deadline", value: "All VMs must be compliant within 7 days" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Create a remediation task for the policy assignment — this triggers the deployIfNotExists template against all 200 non-compliant resources, installing AMA without manual intervention",
          color: "green",
        },
        {
          id: "action-b",
          label: "Touch (update a tag) on each of the 200 VMs to trigger an ARM update event, which will cause the deployIfNotExists policy to evaluate and install AMA",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Write an Azure CLI script to install the AMA extension on all 200 VMs using az vm extension set in a loop",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Delete the policy assignment and reassign it — the reassignment triggers evaluation on all existing resources",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Remediation tasks are the purpose-built mechanism for deploying deployIfNotExists templates to existing non-compliant resources. Creating a remediation task triggers an ARM deployment for each non-compliant resource, executing the policy's deployment template (which installs AMA). Remediation tasks run in parallel (configurable concurrency), track progress per resource, handle failures with retry, and provide completion reporting in the Azure Portal. This is exactly what remediation tasks were designed for.",
        },
        {
          id: "rationale-b",
          text: "Touching VMs (updating a tag) technically triggers an ARM update event that causes deployIfNotExists to evaluate. However, this requires scripting tag updates on 200 VMs, adds unnecessary tag clutter, and is a workaround for a feature (remediation tasks) that already exists. It also lacks the built-in progress tracking and failure handling that remediation tasks provide.",
        },
        {
          id: "rationale-c",
          text: "A CLI script installs AMA but bypasses the policy framework entirely. The extensions are installed but the policy remediation state is not updated — resources may still show as non-compliant until the next policy evaluation cycle. Also, the script must handle errors, retries, and parallelism manually, duplicating functionality that remediation tasks provide natively.",
        },
        {
          id: "rationale-d",
          text: "Deleting and reassigning the policy triggers a new compliance evaluation but does NOT automatically deploy the deployIfNotExists template to existing resources. Policy reassignment evaluates compliance status only — it marks resources as non-compliant but does not execute the remediation deployment. A remediation task is still required after reassignment.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Remediation tasks are the native Azure Policy mechanism for applying deployIfNotExists and modify policies to existing non-compliant resources — they handle parallelism, progress tracking, and failure retry automatically.",
        partial:
          "CLI scripts and tag-touching are workarounds that achieve the goal but bypass the policy framework's built-in remediation tracking and error handling.",
        wrong:
          "Deleting and reassigning a policy does not trigger deployIfNotExists deployments on existing resources — it only re-evaluates compliance status. A remediation task is always required for existing resources.",
      },
    },
  ],
  hints: [
    "Use 'deny' to prevent non-compliant resource creation and 'audit' to flag existing non-compliant resources without disruption — combine both effects for a complete compliance strategy.",
    "Azure Policy initiatives with parameterized effects allow a single definition to be assigned with different enforcement levels (deny, audit) at different scopes (management groups, subscriptions).",
    "Remediation tasks are required to apply deployIfNotExists policies to EXISTING resources — the policy only auto-triggers on new resource creation/update events, not on existing resources at assignment time.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure Policy is the foundation of cloud governance at scale. Engineers who can author custom policies, design initiative hierarchies, and manage remediation workflows enable organizations to enforce security and compliance standards across hundreds of subscriptions — a skill that is increasingly required in enterprise cloud architect roles.",
  toolRelevance: ["Azure Portal", "Azure Policy", "Azure CLI", "Azure Resource Manager", "Azure Monitor", "Azure Management Groups"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
