import type { LabManifest } from "../../types/manifest";

export const awsOrganizationsScpLab: LabManifest = {
  schemaVersion: "1.1",
  id: "aws-organizations-scp",
  version: 1,
  title: "AWS Organizations & Service Control Policies",
  tier: "advanced",
  track: "aws-core",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["aws", "organizations", "scp", "governance", "guardrails", "multi-account"],
  description:
    "Design Organization Unit structures and Service Control Policies that enforce security guardrails across a multi-account AWS environment without blocking legitimate workloads.",
  estimatedMinutes: 13,
  learningObjectives: [
    "Structure Organizational Units to reflect security and compliance boundaries",
    "Write SCPs that enforce guardrails without breaking application functionality",
    "Understand SCP inheritance and the interaction between allow and deny policies",
    "Design preventive controls for common compliance requirements like region restriction and root account protection",
    "Troubleshoot access denied errors caused by SCP misconfiguration",
  ],
  sortOrder: 117,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "organizations-scp-s1",
      title: "Region Restriction SCP for Compliance",
      context:
        "Your company must comply with data residency regulations requiring all workloads to run in eu-west-1 and eu-central-1 only. You need to apply an SCP that prevents launching resources in any other region. However, several global AWS services (IAM, CloudFront, Route 53, AWS Support) must remain accessible because they only operate in us-east-1 regardless of the user's intent.",
      displayFields: [
        { label: "Allowed Regions", value: "eu-west-1, eu-central-1", emphasis: "normal" },
        { label: "Compliance", value: "Data residency — no resources outside EU", emphasis: "critical" },
        { label: "Global Services", value: "IAM, CloudFront, Route 53, Support (operate in us-east-1)", emphasis: "warn" },
        { label: "Scope", value: "All accounts in Production OU", emphasis: "normal" },
        { label: "Risk", value: "Overly broad SCP will break IAM and DNS management", emphasis: "critical" },
      ],
      actions: [
        { id: "deny-with-global-exclusions", label: "Create a Deny SCP for non-EU regions with condition key exclusions for global services using aws:RequestedRegion", color: "green" },
        { id: "allow-only-eu", label: "Replace the default FullAWSAccess SCP with an Allow-only policy listing EU regions", color: "red" },
        { id: "deny-all-non-eu", label: "Create a blanket Deny for all actions where region is not eu-west-1 or eu-central-1, with no exceptions", color: "orange" },
        { id: "tag-based-restriction", label: "Use tag-based SCPs requiring a 'region:eu' tag on all resources instead of region restriction", color: "red" },
      ],
      correctActionId: "deny-with-global-exclusions",
      rationales: [
        { id: "r-deny-with-exclusions", text: "A Deny SCP using the aws:RequestedRegion condition key blocks resource creation in non-EU regions. Adding NotAction exceptions for global services (iam:*, cloudfront:*, route53:*, support:*, sts:*) ensures these services remain functional. This is the AWS-recommended pattern for region restriction SCPs." },
        { id: "r-allow-only-breaks-global", text: "Replacing FullAWSAccess with an Allow-only policy is extremely dangerous. SCPs are evaluated as an intersection — if the Allow policy does not explicitly list every action for global services, those services become inaccessible. This approach requires maintaining an exhaustive allowlist that breaks with every new AWS feature." },
        { id: "r-blanket-deny-breaks-iam", text: "A blanket region deny without global service exceptions immediately breaks IAM operations, CloudFront distributions, Route 53 hosted zones, and AWS Support cases. Teams cannot create IAM roles or manage DNS — critical infrastructure operations that must work regardless of region restrictions." },
        { id: "r-tags-not-enforceable", text: "Tag-based SCPs cannot prevent resource creation in unauthorized regions. A user can simply omit the tag or use any value. Tags are descriptive, not preventive — they cannot replace region-level controls for compliance requirements." },
      ],
      correctRationaleId: "r-deny-with-exclusions",
      feedback: {
        perfect: "Correct. The Deny + NotAction pattern for global services is the standard approach for region restriction SCPs. It enforces data residency while keeping global services functional.",
        partial: "A blanket deny is close but the missing global service exceptions will break critical operations. Always account for IAM, CloudFront, Route 53, and other global services in region restriction SCPs.",
        wrong: "Allow-only SCPs are fragile and break constantly. Tag-based approaches cannot enforce region restrictions. The Deny + NotAction pattern is the proven approach for this compliance requirement.",
      },
    },
    {
      type: "action-rationale",
      id: "organizations-scp-s2",
      title: "Protecting the Root User Across All Accounts",
      context:
        "Your security team wants to prevent the root user from being used for day-to-day operations in all member accounts. Root should only be usable for the specific tasks that require it (like changing account-level settings). Currently, root users in member accounts have full access and several developers have used root to bypass IAM permission boundaries during incidents.",
      displayFields: [
        { label: "Problem", value: "Root users in member accounts used for day-to-day operations", emphasis: "critical" },
        { label: "Required Root Tasks", value: "Account settings, support plan changes, restoring IAM access", emphasis: "warn" },
        { label: "Scope", value: "All member accounts (not management account)", emphasis: "normal" },
        { label: "Current State", value: "No SCP restrictions on root — full access in all accounts", emphasis: "critical" },
        { label: "Incidents", value: "Developers bypassing IAM boundaries via root during outages", emphasis: "warn" },
      ],
      actions: [
        { id: "deny-root-with-exceptions", label: "Apply an SCP that denies all actions for root user except account-level tasks that require root", color: "green" },
        { id: "deny-root-all", label: "Apply an SCP that denies all actions for the root user with no exceptions", color: "orange" },
        { id: "delete-root-passwords", label: "Manually delete root user passwords and MFA in all member accounts", color: "yellow" },
        { id: "iam-policy-root", label: "Attach an IAM deny policy to the root user in each member account", color: "red" },
      ],
      correctActionId: "deny-root-with-exceptions",
      rationales: [
        { id: "r-deny-root-exceptions", text: "An SCP denying actions for aws:PrincipalArn matching the root user ARN, with exceptions for root-only tasks (like iam:CreateServiceLinkedRole for certain services, account settings changes), enforces the principle of least privilege for root. SCPs apply to member accounts but not the management account, which is the correct scope." },
        { id: "r-deny-all-root-locked", text: "Denying all root actions with no exceptions can lock you out of account-level recovery tasks that only root can perform. If IAM access is accidentally lost, root is the last resort for recovery — a blanket deny on root eliminates this safety net." },
        { id: "r-delete-passwords-manual", text: "Deleting root passwords is manual, does not scale across hundreds of accounts, and can be re-enabled. It is not a preventive control — it is an operational task that must be repeated for every new account and can be reversed." },
        { id: "r-iam-policy-on-root", text: "IAM policies attached to the root user can be removed by the root user itself. This is a self-defeating control — the very entity you are trying to restrict can undo the restriction. SCPs cannot be modified by member account users, making them the correct enforcement layer." },
      ],
      correctRationaleId: "r-deny-root-exceptions",
      feedback: {
        perfect: "Correct. SCPs with targeted root restrictions and exceptions for root-only tasks is the standard governance pattern. SCPs enforce from outside the account, making them tamper-proof from member account users.",
        partial: "Blanket root denial is too aggressive — it removes the emergency recovery path. Targeted restrictions that allow root-only operations preserve the safety net while preventing day-to-day abuse.",
        wrong: "IAM policies on root are self-defeating — root can remove them. Manual password deletion does not scale or persist. SCPs are the only tamper-proof control for member account root users.",
      },
    },
    {
      type: "action-rationale",
      id: "organizations-scp-s3",
      title: "Troubleshooting SCP Inheritance Blocking Legitimate Workloads",
      context:
        "A development team in the 'Sandbox' OU reports that they cannot launch SageMaker notebook instances. The error is 'Access Denied'. Their IAM role has full SageMaker permissions. You discover that the parent 'Development' OU has an SCP that allows only ec2:*, s3:*, lambda:*, and iam:* actions. The Sandbox OU has the default FullAWSAccess SCP attached.",
      displayFields: [
        { label: "Error", value: "Access Denied on sagemaker:CreateNotebookInstance", emphasis: "critical" },
        { label: "IAM Role", value: "Has sagemaker:* permissions", emphasis: "normal" },
        { label: "Sandbox OU SCP", value: "FullAWSAccess (allows all)", emphasis: "normal" },
        { label: "Parent Development OU SCP", value: "Allow: ec2:*, s3:*, lambda:*, iam:* only", emphasis: "critical" },
        { label: "SCP Evaluation", value: "Intersection of all SCPs in the hierarchy", emphasis: "warn" },
      ],
      actions: [
        { id: "add-sagemaker-parent", label: "Add sagemaker:* to the Development OU's allow-list SCP", color: "green" },
        { id: "override-child-scp", label: "Attach an explicit Allow SCP for sagemaker:* on the Sandbox OU to override the parent", color: "red" },
        { id: "remove-parent-scp", label: "Remove the restrictive SCP from the Development OU entirely", color: "orange" },
        { id: "move-sandbox-ou", label: "Move the Sandbox OU out of the Development OU hierarchy to escape the SCP inheritance", color: "yellow" },
      ],
      correctActionId: "add-sagemaker-parent",
      rationales: [
        { id: "r-add-to-parent", text: "SCPs are evaluated as an intersection across the entire OU hierarchy. The parent OU's allow-list SCP does not include sagemaker:*, so SageMaker is denied regardless of the child OU's FullAWSAccess. Adding sagemaker:* to the parent OU's allow-list is the correct fix — it expands the allowed service set at the right level." },
        { id: "r-child-no-override", text: "Child OU SCPs cannot override parent OU restrictions. SCPs work as an intersection, not a union. An Allow on the child does not bypass a missing Allow on the parent. The effective permission is always the intersection of all SCPs from root to the target account." },
        { id: "r-remove-scp-dangerous", text: "Removing the Development OU's SCP entirely opens all AWS services to all development accounts, removing governance guardrails. The SCP exists to limit development accounts to approved services — the fix is to add SageMaker to the approved list, not to remove the list." },
        { id: "r-move-ou-structural", text: "Moving the Sandbox OU restructures the organization hierarchy to work around a policy gap. This fixes the symptom but breaks the organizational model. If Sandbox logically belongs under Development, the SCP should be updated — not the OU structure." },
      ],
      correctRationaleId: "r-add-to-parent",
      feedback: {
        perfect: "Correct. SCP inheritance is an intersection — the parent OU must allow the service for any child to use it. Adding sagemaker:* to the parent OU's allow-list is the precise, minimal fix.",
        partial: "Moving the OU or removing the SCP would work but introduces governance gaps. The correct approach is to update the allow-list at the parent OU level.",
        wrong: "Child SCPs cannot override parent restrictions. SCP evaluation is an intersection across the full hierarchy — a missing Allow at any level in the chain results in an implicit Deny.",
      },
    },
  ],
  hints: [
    "SCPs are evaluated as an intersection across the entire OU hierarchy. A permission must be allowed at every level from the root to the target account for it to be effective.",
    "For region restriction SCPs, use Deny with aws:RequestedRegion condition and NotAction for global services like IAM, CloudFront, and Route 53 that only operate in us-east-1.",
    "SCPs apply to member accounts but never to the management account. Root user restrictions via SCP are tamper-proof because member account users cannot modify organization policies.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Multi-account governance with AWS Organizations and SCPs is a foundational skill for cloud security architects and platform engineers. Companies with mature cloud practices rely on SCPs as preventive guardrails that are tamper-proof from within member accounts — understanding SCP inheritance and the interaction between allow-list and deny-list policies is essential for these roles.",
  toolRelevance: ["AWS Organizations Console", "AWS IAM Policy Simulator", "AWS CloudTrail", "AWS CLI", "AWS Control Tower"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
