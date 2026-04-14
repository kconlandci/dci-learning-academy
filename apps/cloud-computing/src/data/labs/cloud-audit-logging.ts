import type { LabManifest } from "../../types/manifest";

export const cloudAuditLoggingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-audit-logging",
  version: 1,
  title: "Cloud Audit Logging",
  tier: "beginner",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["security", "logging", "cloudtrail", "audit", "siem", "monitoring"],
  description:
    "Investigate cloud audit log data to identify suspicious administrative activity, unauthorized access patterns, and compliance gaps. Practice reading CloudTrail events and making containment decisions based on log evidence.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Interpret AWS CloudTrail management events to identify suspicious activity",
    "Distinguish between normal administrative actions and indicators of compromise",
    "Identify gaps in audit logging coverage across cloud services",
    "Correlate multiple log sources to reconstruct an attack chain",
    "Make containment and escalation decisions based on log evidence",
  ],
  sortOrder: 508,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "audit-s1-privilege-escalation",
      title: "Suspicious IAM Privilege Escalation",
      objective:
        "CloudTrail has flagged an unusual sequence of IAM API calls in the past 2 hours. Investigate the available log evidence and decide on the appropriate response action.",
      investigationData: [
        {
          id: "src1",
          label: "CloudTrail — IAM Events (Last 2 Hours)",
          content:
            "22:14 UTC — ListPolicies (user: dev-intern-01, IP: 198.51.100.44)\n22:15 UTC — GetPolicy on AdministratorAccess policy (user: dev-intern-01, IP: 198.51.100.44)\n22:17 UTC — CreatePolicyVersion for AdministratorAccess — FAILED (user: dev-intern-01, IP: 198.51.100.44)\n22:19 UTC — AttachUserPolicy: AdministratorAccess → dev-intern-01 — FAILED (user: dev-intern-01, IP: 198.51.100.44)\n22:21 UTC — CreateAccessKey for dev-intern-01 — SUCCESS (user: dev-intern-01, IP: 198.51.100.44)\n22:23 UTC — PutUserPolicy (inline policy with sts:AssumeRole on *) — SUCCESS (user: dev-intern-01, IP: 198.51.100.44)",
          isCritical: true,
        },
        {
          id: "src2",
          label: "User Context: dev-intern-01",
          content:
            "Role: Junior Developer Intern (started 3 weeks ago)\nNormal access: Read-only to dev S3 buckets and CloudWatch\nNormal working hours: 09:00-18:00 local time (UTC-5)\nActivity time: 22:14 UTC = 17:14 local — within working hours\nLast login before today: 3 days ago from 10.0.0.45 (corporate VPN)",
          isCritical: false,
        },
        {
          id: "src3",
          label: "Network Context",
          content:
            "All today's activity from: 198.51.100.44\nThis IP is NOT in the corporate VPN range (10.0.0.0/8)\nIP geolocation: Netherlands (intern is located in Austin, TX, USA)\nNo VPN or office network usage detected today",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Current Permissions Analysis",
          content:
            "Inline policy added at 22:23 UTC grants: sts:AssumeRole on Resource: *\nThis allows dev-intern-01 to attempt assuming ANY role in the account\nHigh-value targets: prod-admin-role (AdministratorAccess), billing-role (ViewBilling+ModifyPayment)\nThe inline policy is active and has not been revoked",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Contact the intern to verify if this was authorized activity before taking action", color: "yellow" },
        { id: "a2", label: "Immediately revoke the inline policy, disable all access keys for dev-intern-01, and escalate to security leadership", color: "green" },
        { id: "a3", label: "Monitor for additional activity for 24 hours before intervening", color: "red" },
        { id: "a4", label: "Remove only the newly created access key, leave the inline policy for further investigation", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "An intern's account showing privilege escalation attempts from a foreign IP outside corporate network is a strong indicator of account compromise — immediate containment is required." },
        { id: "r2", text: "Revoking the inline policy immediately closes the active sts:AssumeRole path to admin roles. Disabling access keys stops both the original and newly created key from being used." },
        { id: "r3", text: "Contacting the intern first introduces a delay during which the active sts:AssumeRole permission could be used to assume an admin role and create persistent access." },
        { id: "r4", text: "Monitoring for 24 hours while an active privilege escalation path exists is operationally negligent when the evidence strongly indicates account compromise." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Foreign IP, off-network activity, and active sts:AssumeRole on * are clear compromise indicators. Immediate revocation of the inline policy and keys is the right call.",
        partial: "You identified the risk but the action doesn't fully contain it. The inline sts:AssumeRole policy must be explicitly revoked — just removing the new key leaves an active escalation path.",
        wrong: "While the intern may need to be contacted for the post-incident review, an active privilege escalation path from a foreign IP cannot wait. Contain immediately, investigate after.",
      },
    },
    {
      type: "investigate-decide",
      id: "audit-s2-root-account-usage",
      title: "Root Account Activity Investigation",
      objective:
        "AWS Security Hub generates a CRITICAL finding: root account API calls detected. Investigate the log evidence to determine if this is authorized emergency access or a potential account takeover.",
      investigationData: [
        {
          id: "src1",
          label: "CloudTrail — Root Account Events",
          content:
            "03:47 UTC — ConsoleLogin: root (MFA used: false, IP: 203.0.113.55)\n03:48 UTC — GetAccountSummary (root)\n03:49 UTC — ListUsers (root)\n03:51 UTC — DeleteTrail: management-trail (root) — the primary CloudTrail trail\n03:52 UTC — PutBucketPolicy on log-archive-bucket: allows public access (root)\n03:54 UTC — CreateUser: backup-admin (root)\n03:55 UTC — AttachUserPolicy: AdministratorAccess → backup-admin (root)",
          isCritical: true,
        },
        {
          id: "src2",
          label: "Root Account Protection Policy",
          content:
            "Company policy: Root account is never used for operations. Credentials are stored in a physical vault, require two-person authorization, and have hardware MFA.\nAuthorized root use cases: Billing disputes, account closure, identity verification only.\nLast authorized root use: 14 months ago for account creation.",
          isCritical: false,
        },
        {
          id: "src3",
          label: "Security Events Correlated",
          content:
            "03:45 UTC — GuardDuty finding: UnauthorizedAccess:IAMUser/ConsoleLoginSuccess.B (impossible travel for root account email address)\n03:46 UTC — Google Workspace: root account email (aws-root@company.com) accessed from 203.0.113.55 (same foreign IP) — first access from this IP ever",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Post-Incident State",
          content:
            "CloudTrail is now disabled (DeleteTrail was successful)\nLog archive S3 bucket is now publicly accessible\nNew IAM user backup-admin with AdministratorAccess has been created\nRoot account email was accessed from an IP with no prior history",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Re-enable CloudTrail only and monitor for further activity", color: "yellow" },
        { id: "a2", label: "Declare a P0 security incident: contact AWS Support for emergency account lockdown, disable backup-admin user, restore CloudTrail, block public S3 access, and reset root credentials", color: "green" },
        { id: "a3", label: "Delete the backup-admin user and re-enable CloudTrail, then investigate", color: "orange" },
        { id: "a4", label: "Wait until business hours to involve the security team to avoid false alarm escalation", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Root login without MFA from a foreign IP, deletion of the audit trail, public exposure of log archives, and creation of a backdoor admin user are unambiguous signs of a full account takeover." },
        { id: "r2", text: "A P0 account takeover requires immediate AWS Support engagement (which can reset root access), disabling the backdoor user, restoring logging, and revoking all permissions granted during the compromise window." },
        { id: "r3", text: "Partial remediation (only re-enabling CloudTrail) leaves the backdoor admin user active and does not address the root credential compromise itself." },
        { id: "r4", text: "Waiting until business hours while an attacker has active root and AdminAccess on the account is unacceptable. Cloud account takeovers can cause irreversible damage in minutes." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Root account takeover with CloudTrail deletion and backdoor user creation is a P0 incident requiring immediate AWS Support engagement and full account-level response.",
        partial: "You recognized the severity but partial remediation isn't enough. Root credential compromise requires full credential reset and AWS Support engagement, not just rolling back individual changes.",
        wrong: "This is a full AWS account takeover — one of the most severe cloud security incidents possible. Any delay in response or partial action allows the attacker to maintain or expand their foothold.",
      },
    },
    {
      type: "investigate-decide",
      id: "audit-s3-logging-coverage-gap",
      title: "Audit Logging Coverage Assessment",
      objective:
        "A new security engineer is performing a logging coverage assessment. Review the evidence to identify the most critical logging gap and recommend the priority remediation.",
      investigationData: [
        {
          id: "src1",
          label: "Current CloudTrail Configuration",
          content:
            "Trail: management-trail\n  - Management events: Enabled (Read+Write)\n  - Data events (S3): NOT enabled\n  - Data events (Lambda): NOT enabled\n  - Insights events: NOT enabled\n  - Multi-region: Yes\n  - Log file validation: Enabled\n  - Log delivery: S3 (log-archive-bucket)",
          isCritical: false,
        },
        {
          id: "src2",
          label: "Business Context",
          content:
            "Top 3 data risks:\n1. prod-customer-pii bucket: 4.2 million customer records (SSN, DOB, addresses)\n2. payment-lambda function: processes all credit card transactions\n3. healthcare-records bucket: 890,000 patient PHI records\n\nRecent incident: Macie flagged anomalous S3 access last month — investigation was hindered by lack of object-level logs.",
          isCritical: true,
        },
        {
          id: "src3",
          label: "Cost Analysis",
          content:
            "Estimated CloudTrail Data Events cost:\n  - S3 data events (all buckets): ~$180/month\n  - S3 data events (3 sensitive buckets only): ~$22/month\n  - Lambda data events: ~$45/month\n  - CloudTrail Insights: ~$35/month",
          isCritical: false,
        },
        {
          id: "src4",
          label: "Compliance Requirements",
          content:
            "Active compliance frameworks: HIPAA, PCI-DSS, SOC 2 Type II\nHIPAA requires audit logs of all access to PHI\nPCI-DSS 10.2.1 requires logging of all access to cardholder data\nSOC 2 CC7.2 requires monitoring of production systems\nCurrent gap: No object-level access logging for any S3 bucket",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Enable CloudTrail Insights only to detect anomalous API patterns", color: "yellow" },
        { id: "a2", label: "Enable S3 data events for the three sensitive buckets and Lambda data events for the payment function — addressing compliance gaps at minimum cost", color: "green" },
        { id: "a3", label: "Enable full S3 data events for all buckets and all Lambda functions", color: "orange" },
        { id: "a4", label: "The current management event logging is sufficient; no action needed", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "CloudTrail Insights detects anomalous API call rates but does not provide object-level S3 access records — it does not address the HIPAA and PCI-DSS compliance gaps." },
        { id: "r2", text: "Scoping S3 data events to only the three sensitive buckets and the payment Lambda addresses all three compliance requirements at $67/month vs $225/month for full coverage — optimal risk-cost balance." },
        { id: "r3", text: "Full coverage of all S3 and Lambda data events ($225/month) is excessive — logging for non-sensitive development and test buckets provides little compliance value at significant cost." },
        { id: "r4", text: "Management events alone do not capture which objects were accessed in S3 buckets. Object-level access logging is explicitly required by HIPAA, PCI-DSS, and SOC 2 for sensitive data." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Scoped S3 and Lambda data events for sensitive resources addresses all three compliance frameworks at minimal cost — the right balance of security coverage and cost efficiency.",
        partial: "Your recommendation addresses part of the gap. Check the compliance requirements — HIPAA and PCI-DSS require object-level S3 logging, which Insights alone doesn't provide.",
        wrong: "Management events do not capture S3 object access. Without data event logging on sensitive buckets, you have zero visibility into who accessed PHI or cardholder data.",
      },
    },
  ],
  hints: [
    "CloudTrail management events capture control plane actions (creating/deleting resources, IAM changes) but NOT data plane actions (reading S3 objects, Lambda invocations) — those require separate data event configuration.",
    "When investigating a potential account compromise, look for three anti-forensics indicators: CloudTrail trail deletion, S3 log bucket policy changes, and new IAM users/access keys created during the suspicious window.",
    "Root account activity without MFA from an unrecognized IP is always treated as a critical incident — root has unrestricted access to everything and can terminate all other sessions.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Log analysis and audit trail interpretation are daily tasks for cloud security engineers and SOC analysts. The ability to reconstruct attack chains from CloudTrail data and make rapid response decisions is one of the most valuable skills in cloud security operations.",
  toolRelevance: ["AWS CloudTrail", "AWS Security Hub", "Amazon Detective", "AWS GuardDuty", "CloudWatch Logs Insights", "Splunk", "Elastic SIEM"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
