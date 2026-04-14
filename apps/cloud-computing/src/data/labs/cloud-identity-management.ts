import type { LabManifest } from "../../types/manifest";

export const cloudIdentityManagementLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-identity-management",
  version: 1,
  title: "Cloud Identity Management",
  tier: "beginner",
  track: "cloud-security",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["security", "identity", "iam", "access-control", "aws"],
  description:
    "Learn how to make critical IAM decisions in AWS environments. Practice identifying overprivileged roles, enforcing least-privilege access, and responding to identity-based misconfigurations before they become breaches.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify overprivileged IAM roles and policies in AWS",
    "Apply the principle of least privilege to cloud identities",
    "Distinguish between role-based and attribute-based access control",
    "Recognize common IAM misconfigurations that lead to privilege escalation",
    "Select appropriate remediation actions for identity-related findings",
  ],
  sortOrder: 500,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "iam-s1-wildcard-policy",
      title: "Wildcard Policy Detected",
      context:
        "A security audit of your AWS account flags an IAM policy attached to a developer role. The policy grants `s3:*` on `*` (all resources). This role is used by 14 developers for day-to-day work. No data classification review has been performed on the S3 buckets.",
      displayFields: [
        { label: "Role Name", value: "dev-team-role", emphasis: "normal" },
        { label: "Policy Effect", value: "Allow", emphasis: "warn" },
        { label: "Action", value: "s3:*", emphasis: "critical" },
        { label: "Resource", value: "*", emphasis: "critical" },
        { label: "Attached Users", value: "14", emphasis: "normal" },
      ],
      actions: [
        { id: "a1", label: "Leave policy as-is; developers need broad access", color: "red" },
        { id: "a2", label: "Replace with scoped policy listing only required S3 actions and specific bucket ARNs", color: "green" },
        { id: "a3", label: "Delete the role entirely until a review is complete", color: "orange" },
        { id: "a4", label: "Add an explicit Deny for s3:DeleteObject only", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Broad permissions are sometimes operationally necessary, so no action is needed." },
        { id: "r2", text: "Scoping actions and resources enforces least privilege, reducing blast radius if the role is compromised." },
        { id: "r3", text: "Partial denies address only one risk vector while leaving all other destructive and exfiltration actions open." },
        { id: "r4", text: "Deleting the role disrupts 14 developers and does not address the root cause of poor policy scoping." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Scoping IAM policies to specific actions and ARNs is the foundational application of least privilege.",
        partial: "You identified a problem but the chosen action doesn't fully address the overpermissive policy.",
        wrong: "This approach either causes unnecessary disruption or leaves a significant attack surface open.",
      },
    },
    {
      type: "action-rationale",
      id: "iam-s2-unused-key",
      title: "Stale Access Key Found",
      context:
        "AWS IAM Access Analyzer reports an access key for service account `ci-deploy-svc` that has not been used in 187 days. The key has `AdministratorAccess` attached. The CI/CD pipeline it was created for was migrated to IAM Roles for EC2 six months ago.",
      displayFields: [
        { label: "Account Type", value: "Service Account", emphasis: "normal" },
        { label: "Last Used", value: "187 days ago", emphasis: "critical" },
        { label: "Policy", value: "AdministratorAccess", emphasis: "critical" },
        { label: "Key Status", value: "Active", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Disable the key and schedule deletion after a 30-day monitoring window", color: "green" },
        { id: "a2", label: "Rotate the key to generate a new secret", color: "yellow" },
        { id: "a3", label: "Keep the key active as a backup credential", color: "red" },
        { id: "a4", label: "Immediately delete the key without any monitoring window", color: "orange" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Disabling first and monitoring prevents service disruption if the key is still secretly in use, then deletion removes the dormant attack surface." },
        { id: "r2", text: "Rotating generates new credentials but doesn't eliminate the stale, overprivileged key problem." },
        { id: "r3", text: "Keeping an unused admin key active is a standing privilege escalation risk with no operational benefit." },
        { id: "r4", text: "Immediate deletion is aggressive and could break an undocumented dependency; a monitoring window is safer." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Exactly right. Disable-then-monitor-then-delete is the industry-standard safe key retirement workflow.",
        partial: "You're moving in the right direction but missing a safety step in the key retirement process.",
        wrong: "This approach either leaves a dangerous credential active or risks breaking a service with no warning period.",
      },
    },
    {
      type: "action-rationale",
      id: "iam-s3-cross-account-trust",
      title: "Overly Permissive Cross-Account Trust",
      context:
        "A new intern's pull request adds a trust policy to a production role allowing `sts:AssumeRole` from `arn:aws:iam::*:root`. The stated intent is to let a vendor tool assume the role for cost analysis. You are reviewing this PR before merge.",
      displayFields: [
        { label: "Principal", value: "arn:aws:iam::*:root", emphasis: "critical" },
        { label: "Action", value: "sts:AssumeRole", emphasis: "warn" },
        { label: "Environment", value: "Production", emphasis: "critical" },
        { label: "Condition", value: "None set", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Approve the PR; the vendor needs access and this is the easiest way", color: "red" },
        { id: "a2", label: "Request changes: scope principal to vendor's specific account ID and add ExternalId condition", color: "green" },
        { id: "a3", label: "Reject the PR and block all cross-account access permanently", color: "orange" },
        { id: "a4", label: "Approve but add an SCP to restrict the vendor account later", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "A wildcard principal allows any AWS account in the world to attempt role assumption — this is a critical misconfiguration." },
        { id: "r2", text: "Scoping to the vendor's account ID and requiring an ExternalId condition prevents the confused deputy attack and limits the trust surface." },
        { id: "r3", text: "Cross-account access is legitimate and common; blanket blocking is an overreaction that breaks valid business workflows." },
        { id: "r4", text: "SCPs operate at the organization level and don't restrict who can assume a role from outside the org; the trust policy itself must be fixed." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Perfect. Specific account ID plus ExternalId is the secure pattern for third-party cross-account role assumption.",
        partial: "You identified a concern but the proposed fix doesn't fully close the vulnerability.",
        wrong: "This either approves a world-readable trust policy or prevents a legitimate business requirement without fixing the root issue.",
      },
    },
  ],
  hints: [
    "The principle of least privilege means granting only the minimum permissions required for a task — nothing more.",
    "AWS recommends disabling access keys before deletion to allow a monitoring window that catches any unexpected usage.",
    "Cross-account trust policies should always specify an exact account ID and use the ExternalId condition to prevent confused deputy attacks.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "IAM misconfiguration is the leading cause of cloud data breaches. Security engineers and cloud architects who can audit and remediate identity policies are among the most sought-after roles in the industry. Mastery of IAM is a prerequisite for AWS Security Specialty and CCSP certifications.",
  toolRelevance: ["AWS IAM", "AWS IAM Access Analyzer", "AWS Organizations SCPs", "Terraform (aws_iam_policy)", "Prowler"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
