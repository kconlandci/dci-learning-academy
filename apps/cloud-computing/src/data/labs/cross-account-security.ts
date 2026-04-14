import type { LabManifest } from "../../types/manifest";

export const crossAccountSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cross-account-security",
  version: 1,
  title: "Cross-Account Security Architecture",
  tier: "intermediate",
  track: "cloud-security",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["security", "cross-account", "organizations", "scp", "landing-zone", "multi-account"],
  description:
    "Investigate multi-account AWS organization security configurations to identify trust boundary violations, overpermissive SCPs, and insecure cross-account role assumptions. Design guardrails that protect production from development account compromise.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Analyze AWS Organizations SCP configurations for security gaps",
    "Identify dangerous cross-account trust relationships in IAM role policies",
    "Design secure cross-account access patterns using least-privilege trust policies",
    "Understand the security implications of AWS Control Tower guardrails",
    "Detect privilege escalation paths that span multiple AWS accounts",
  ],
  sortOrder: 511,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "ca-s1-scp-gap",
      title: "SCP Guardrail Gap Analysis",
      objective:
        "A new cloud security engineer is auditing the AWS Organizations SCP configuration. Review the evidence to identify the most critical security gap and recommend the appropriate remediation.",
      investigationData: [
        {
          id: "src1",
          label: "AWS Organizations Structure",
          content:
            "Root\n├── Management Account (billing only)\n├── Security OU\n│   ├── Log Archive Account (security-log-archive)\n│   └── Security Tooling Account (security-tooling)\n├── Production OU\n│   ├── prod-app-account\n│   └── prod-data-account\n└── Development OU\n    ├── dev-account-01\n    └── dev-account-02\n\nSCPs attached to Production OU: Restrict region to us-east-1 only; Deny EC2 instance types > c5.4xlarge",
          isCritical: false,
        },
        {
          id: "src2",
          label: "Current SCP Analysis — What Is Missing",
          content:
            "Production OU SCPs currently enforce: Region restriction, instance size limits\n\nNOT enforced by any SCP:\n  - GuardDuty cannot be disabled in production accounts\n  - CloudTrail cannot be deleted or stopped in production accounts\n  - S3 Block Public Access cannot be disabled at account level\n  - Root account MFA is not enforced\n  - No restriction on IAM users being created in production accounts (service accounts should use roles only)",
          isCritical: true,
        },
        {
          id: "src3",
          label: "Recent Incident Context",
          content:
            "Last month: A developer with temporary production access (for an emergency fix) deleted a CloudTrail trail to 'reduce logging noise' during debugging. The deletion was not detected for 6 hours.\n\nLast quarter: A compromised dev account was used to pivot to production via a cross-account role that had no external ID condition and was assumable from any account in the organization.",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Cross-Account Role Trust Policy (prod-app-account)",
          content:
            "Role: prod-deployment-role\nTrust policy principal: arn:aws:iam::*:role/deploy-role\n(Allows any AWS account's deploy-role to assume this production role)\nNo external ID or condition\nPermissions: PowerUserAccess on prod-app-account",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Add region restriction SCPs only — the other gaps are lower priority", color: "yellow" },
        { id: "a2", label: "Create SCPs preventing GuardDuty/CloudTrail disablement in Production OU, and fix the prod-deployment-role trust policy to require ExternalId and specific account ID", color: "green" },
        { id: "a3", label: "Migrate all accounts to AWS Control Tower and let it handle guardrails automatically", color: "orange" },
        { id: "a4", label: "Revoke all cross-account access permanently until a full review is complete", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "The two most critical gaps are: (1) no SCP preventing deletion of security controls (CloudTrail, GuardDuty) in production, and (2) a wildcard trust policy on a PowerUser role that allows any org account to escalate to production admin." },
        { id: "r2", text: "An SCP with Deny on cloudtrail:DeleteTrail, guardduty:DisableOrganizationAdminAccount, and similar actions makes these actions impossible regardless of IAM permissions — this directly addresses the incident history." },
        { id: "r3", text: "AWS Control Tower is a long-term strategic solution but takes weeks to implement and migrate. The existing trust policy vulnerability requires immediate remediation." },
        { id: "r4", text: "Revoking all cross-account access is operationally disruptive and not proportionate. The specific vulnerable role must be fixed, not all access removed." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. SCPs preventing security control deletion and fixing the wildcard trust policy are the two highest-priority remediations that address both historical incidents.",
        partial: "You identified one critical gap but missed the other. Both the SCP gaps and the wildcard cross-account trust policy are critical and require immediate attention.",
        wrong: "The most critical issues are the ability to delete CloudTrail in production and the wildcard trust policy that allows any org account to gain PowerUserAccess in production. Both must be addressed together.",
      },
    },
    {
      type: "investigate-decide",
      id: "ca-s2-cross-account-compromise",
      title: "Cross-Account Lateral Movement Investigation",
      objective:
        "AWS GuardDuty in the production account has detected credential use from an unexpected source. Investigate the multi-account CloudTrail evidence to determine the attack path and appropriate containment.",
      investigationData: [
        {
          id: "src1",
          label: "GuardDuty Finding — Production Account",
          content:
            "Finding: UnauthorizedAccess:IAMUser/InstanceCredentialExfiltration.OutsideAWS\nSeverity: HIGH\nRole: prod-app-account/ecs-task-role\nSource IP: 203.0.113.88 (external, not AWS)\nActions performed: s3:ListBuckets, s3:GetObject (prod-data-bucket), rds:DescribeDBInstances",
          isCritical: true,
        },
        {
          id: "src2",
          label: "CloudTrail — Dev Account (24 hours before GuardDuty alert)",
          content:
            "Previous day activity in dev-account-01:\n  14:32 UTC — EC2 instance i-0dev123 launched with IAM instance profile: dev-instance-profile\n  15:10 UTC — Unusual outbound connection from i-0dev123 to 203.0.113.88:443 (VPC Flow Logs)\n  15:11 UTC — sts:AssumeRole called: dev-instance-profile assuming dev-cross-account-role (prod-app-account)\n  15:11 UTC — dev-cross-account-role in prod-app-account performing s3:ListBuckets",
          isCritical: true,
        },
        {
          id: "src3",
          label: "Cross-Account Trust Chain Analysis",
          content:
            "Dev attack path:\n  i-0dev123 (compromised EC2) → dev-instance-profile (dev account)\n    → sts:AssumeRole → dev-cross-account-role (prod-app-account)\n    → sts:AssumeRole → ecs-task-role (prod-app-account, broader permissions)\n    → s3:GetObject on prod-data-bucket\n\nKey finding: dev-cross-account-role trust policy allows assumption from ANY principal in dev-account-01, and ecs-task-role trust policy allows assumption from ANY role in prod-app-account.",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Compromised Data Scope",
          content:
            "prod-data-bucket contains: Customer PII (names, addresses, order history)\nObjects accessed by the attacker: 2,341 s3:GetObject calls (890 MB)\nTime window of unauthorized access: ~47 minutes\nAccess has been ongoing — GuardDuty finding triggered 6 hours ago",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Disable dev-cross-account-role only and monitor the production account", color: "yellow" },
        { id: "a2", label: "Immediately revoke both dev-cross-account-role and ecs-task-role in production, isolate the dev EC2 instance, then conduct a full blast radius investigation", color: "green" },
        { id: "a3", label: "Isolate the dev EC2 instance only — the production impact has already occurred", color: "orange" },
        { id: "a4", label: "Rotate the ecs-task-role credentials and update the trust policies to add ExternalId conditions", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "The attack chain spans two accounts and two role assumptions. Both the dev-cross-account-role (entry point to production) and ecs-task-role (broader permissions) must be revoked to close all active access paths." },
        { id: "r2", text: "Isolating the dev EC2 closes the C2 channel from the initial compromise. Revoking both production roles stops the data exfiltration. Full investigation determines total scope and prevents recurrence." },
        { id: "r3", text: "Disabling only one role in the chain still allows the other to be used if the attacker has already extracted credentials. Both must be revoked simultaneously." },
        { id: "r4", text: "Rotating credentials doesn't help if the attacker is actively using valid STS temporary tokens — those must be explicitly revoked by invalidating the role sessions, not rotating the underlying keys." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Multi-account attack chains require simultaneous containment at every link. Revoking one role while leaving the other active allows the attacker to continue exfiltration.",
        partial: "You identified part of the problem. In a chained cross-account compromise, containment must cover every role in the chain — partial containment leaves active attack paths open.",
        wrong: "The attacker has a live attack chain through two accounts. Any partial containment that leaves one role active allows exfiltration to continue. All links in the chain must be severed simultaneously.",
      },
    },
    {
      type: "investigate-decide",
      id: "ca-s3-log-archive-protection",
      title: "Security Log Archive Account Protection",
      objective:
        "During an architecture review, the security team discovers the log archive account has several concerning configurations. Investigate and determine the most critical protective action needed.",
      investigationData: [
        {
          id: "src1",
          label: "Log Archive Account Current State",
          content:
            "Account: security-log-archive\nPurpose: Centralized storage of all CloudTrail, Config, VPC Flow, and GuardDuty logs\nData retained: 13 months of all production activity logs\nAccess: 4 IAM users with read access; 1 IAM user (log-admin) with write access\nCross-account: All production accounts deliver logs to this account's S3 buckets",
          isCritical: false,
        },
        {
          id: "src2",
          label: "Security Assessment Findings",
          content:
            "Finding 1: log-admin IAM user has no MFA enrolled — has S3 write access to log buckets\nFinding 2: Log bucket does not have Object Lock enabled — logs can be overwritten or deleted\nFinding 3: No SCP on the security-log-archive account — an account admin could disable all controls\nFinding 4: Log bucket KMS key is managed in the same account as the logs (key compromise = log compromise)\nFinding 5: All 4 read-access users are human; no SIEM service account with scoped access",
          isCritical: true,
        },
        {
          id: "src3",
          label: "Regulatory Requirements",
          content:
            "PCI-DSS 10.5: Protect audit trails from destruction and unauthorized modification\nPCI-DSS 10.5.2: Protect audit trail files from unauthorized modifications\nSOC 2 CC7.2: Retain security event logs for a minimum of 12 months\nFinding: Current log configuration would fail both PCI-DSS 10.5 and SOC 2 CC7.2 due to lack of immutable storage",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Incident Context",
          content:
            "Hypothetical attack scenario: If an attacker compromises a production account and gains sufficient privileges, they could call s3:DeleteObject on the log archive bucket to destroy evidence of their activity — there is currently nothing preventing this from succeeding.",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Enable MFA for log-admin user only — the most immediate risk", color: "yellow" },
        { id: "a2", label: "Enable S3 Object Lock (Compliance mode, 13-month retention) on log buckets, add SCP preventing log bucket deletion, and enforce KMS key in a separate security account", color: "green" },
        { id: "a3", label: "Enable versioning on the log buckets to enable recovery from deletions", color: "orange" },
        { id: "a4", label: "Move to a third-party SIEM for log storage and eliminate the AWS log archive account", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "The highest risk is log tampering or destruction. S3 Object Lock in Compliance mode makes logs legally immutable — even the root account cannot delete them during the retention period." },
        { id: "r2", text: "Object Lock (Compliance mode) satisfies PCI-DSS 10.5 immutability requirements. An SCP preventing bucket deletion protects the archive account from admin-level tampering. Separate KMS key account prevents key and log compromise occurring together." },
        { id: "r3", text: "Versioning allows recovery from accidental deletion but does not prevent intentional deletion of all versions by someone with s3:DeleteObject permissions — it's not equivalent to immutable Object Lock." },
        { id: "r4", text: "Moving to a third-party SIEM is a long-term architectural decision that doesn't address the immediate compliance gaps and immutability requirements in the current environment." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. S3 Object Lock in Compliance mode, an SCP protecting the archive account, and a separate KMS key account together make logs truly immutable and tamper-evident.",
        partial: "You identified an important issue but the complete solution requires immutable storage. MFA for admins and versioning are good controls but don't satisfy PCI-DSS 10.5 immutability requirements.",
        wrong: "Log immutability is the critical gap. Without S3 Object Lock in Compliance mode, logs can be deleted or modified — compromising the forensic value of the entire audit trail during an incident.",
      },
    },
  ],
  hints: [
    "AWS Organizations SCPs are the strongest preventive controls available — an SCP Deny overrides any IAM Allow, even AdministratorAccess. Use them to protect security controls like CloudTrail and GuardDuty from deletion.",
    "S3 Object Lock in Compliance mode is the only AWS storage mechanism that makes data truly immutable — not even the root account can delete objects during the retention period. Governance mode allows root to override.",
    "In a cross-account attack chain, every role assumption in the path creates an STS temporary token. Revoking IAM sessions and using the 'Revoke active sessions' option in the console invalidates all outstanding tokens derived from that role.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Multi-account AWS security architecture is an advanced specialization that differentiates senior cloud security engineers. Understanding Organizations, SCPs, Control Tower, and cross-account trust is required for architect-level roles at enterprise companies managing 50+ AWS accounts.",
  toolRelevance: ["AWS Organizations", "AWS Control Tower", "AWS CloudTrail", "AWS Config", "S3 Object Lock", "AWS IAM", "Amazon GuardDuty"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
