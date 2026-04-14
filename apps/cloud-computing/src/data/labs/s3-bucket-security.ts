import type { LabManifest } from "../../types/manifest";

export const s3BucketSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "s3-bucket-security",
  version: 1,
  title: "S3 Bucket Security Configuration",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "s3", "security", "iam", "data-protection"],
  description:
    "Audit and correct S3 bucket security settings to prevent data exposure, enforce encryption, and apply least-privilege access controls.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify misconfigured S3 bucket settings that create security risks",
    "Apply block public access settings correctly based on bucket purpose",
    "Configure server-side encryption and versioning appropriately",
    "Evaluate bucket policies against least-privilege principles",
  ],
  sortOrder: 101,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "s3-security-s1",
      title: "Production Data Bucket Audit",
      description:
        "A security audit has flagged your production data bucket `prod-customer-data-7f3a` containing PII. Review each setting and toggle it to the secure state. This bucket is only accessed by backend services via IAM roles — no direct public access is ever needed.",
      targetSystem: "S3 Bucket: prod-customer-data-7f3a",
      items: [
        {
          id: "block-public-acls",
          label: "Block Public ACLs",
          detail: "Prevents new public ACLs from being set on the bucket or objects.",
          currentState: "Off",
          correctState: "On",
          states: ["On", "Off"],
          rationaleId: "r-block-public",
        },
        {
          id: "block-public-policy",
          label: "Block Public Bucket Policies",
          detail: "Blocks bucket policies that grant public access, even if explicitly written.",
          currentState: "Off",
          correctState: "On",
          states: ["On", "Off"],
          rationaleId: "r-block-public",
        },
        {
          id: "server-side-encryption",
          label: "Default Encryption (SSE)",
          detail: "Encrypts all new objects at rest. Options: SSE-S3 or SSE-KMS.",
          currentState: "Disabled",
          correctState: "SSE-KMS",
          states: ["Disabled", "SSE-S3", "SSE-KMS"],
          rationaleId: "r-encrypt-kms",
        },
        {
          id: "versioning",
          label: "Object Versioning",
          detail: "Retains previous versions of objects, enabling recovery from accidental deletes or overwrites.",
          currentState: "Suspended",
          correctState: "Enabled",
          states: ["Enabled", "Suspended"],
          rationaleId: "r-versioning",
        },
        {
          id: "access-logging",
          label: "Server Access Logging",
          detail: "Records all requests made to the bucket for audit and forensics.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-logging",
        },
      ],
      rationales: [
        {
          id: "r-block-public",
          text: "A PII production bucket should never be publicly accessible. Block Public Access is the definitive control — it overrides any bucket policy or ACL that would grant public access.",
        },
        {
          id: "r-encrypt-kms",
          text: "SSE-KMS is preferred for PII over SSE-S3 because it provides an audit trail in AWS CloudTrail for every key usage and supports customer-managed key (CMK) rotation and access revocation.",
        },
        {
          id: "r-versioning",
          text: "Versioning on a PII bucket enables recovery from accidental deletes or ransomware overwrites. Suspended versioning means existing versions are retained but new ones aren't created — a partial protection that should be fully enabled.",
        },
        {
          id: "r-logging",
          text: "Access logging is a compliance requirement for PII buckets in most frameworks (SOC 2, PCI-DSS). Without it, you cannot reconstruct who accessed or modified data during an incident.",
        },
      ],
      feedback: {
        perfect:
          "Perfect security posture. All five controls are now correctly configured: public access fully blocked, KMS encryption enforced, versioning active, and logging enabled for a complete audit trail.",
        partial:
          "Most settings are correct but at least one critical control is misconfigured. For a PII production bucket, all five settings must be in the secure state — partial security still leaves a compliance gap.",
        wrong:
          "Multiple security misconfigurations remain. A publicly accessible, unencrypted bucket containing PII is a critical finding in any security audit and a potential compliance violation.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-security-s2",
      title: "Public Static Website Bucket",
      description:
        "You're hosting a public marketing website from S3 bucket `marketing-static-site`. The site must be publicly readable but not allow public uploads or policy changes that could lead to exfiltration. Configure the settings for a secure public static website.",
      targetSystem: "S3 Bucket: marketing-static-site",
      items: [
        {
          id: "block-public-acls",
          label: "Block Public ACLs",
          detail: "Prevents any ACL from granting public access to objects.",
          currentState: "On",
          correctState: "Off",
          states: ["On", "Off"],
          rationaleId: "r-website-public",
        },
        {
          id: "block-public-policy",
          label: "Block Public Bucket Policies",
          detail: "Prevents bucket policies granting public read access.",
          currentState: "On",
          correctState: "Off",
          states: ["On", "Off"],
          rationaleId: "r-website-public",
        },
        {
          id: "restrict-public-buckets",
          label: "Restrict Public Buckets",
          detail: "Even with a public read policy, restricts non-AWS-service access.",
          currentState: "On",
          correctState: "Off",
          states: ["On", "Off"],
          rationaleId: "r-website-public",
        },
        {
          id: "static-website-hosting",
          label: "Static Website Hosting",
          detail: "Enables S3 to serve HTML/CSS/JS as a website with index and error documents.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-website-hosting",
        },
        {
          id: "versioning-website",
          label: "Object Versioning",
          detail: "Retains previous versions of deployed website files.",
          currentState: "Suspended",
          correctState: "Enabled",
          states: ["Enabled", "Suspended"],
          rationaleId: "r-website-versioning",
        },
      ],
      rationales: [
        {
          id: "r-website-public",
          text: "A static website bucket must allow public reads. Block Public Access settings need to be turned off to allow a bucket policy that grants s3:GetObject to '*'. However, public uploads are controlled by the bucket policy itself — no IAM principal outside your account has write access.",
        },
        {
          id: "r-website-hosting",
          text: "Static website hosting must be explicitly enabled. Without it, S3 serves objects as file downloads with random S3 endpoints, not as a website with index document routing and custom error pages.",
        },
        {
          id: "r-website-versioning",
          text: "Versioning for a website bucket enables instant rollback if a bad deployment goes live. You can restore the previous index.html within seconds without a redeployment pipeline.",
        },
      ],
      feedback: {
        perfect:
          "Correct configuration for a public static website. Block Public Access is disabled to allow public reads, Static Website Hosting is enabled, and versioning protects against bad deployments.",
        partial:
          "Some settings are correct but the website may not function or may have rollback limitations. Ensure Block Public Access allows reads and that Static Website Hosting is enabled.",
        wrong:
          "The bucket is either not accessible publicly (Block Public Access still on) or not configured as a website. A public marketing site needs specific S3 settings that differ from a private data bucket.",
      },
    },
    {
      type: "toggle-config",
      id: "s3-security-s3",
      title: "Cross-Account Replication Bucket",
      description:
        "Bucket `dr-replica-us-west-2` is the destination for cross-account replication from a production account. It needs to accept replicated objects from a separate AWS account (account ID: 112233445566) without allowing any other external access. Configure it correctly.",
      targetSystem: "S3 Bucket: dr-replica-us-west-2",
      items: [
        {
          id: "block-public-acls",
          label: "Block Public ACLs",
          detail: "Blocks any ACL granting public access.",
          currentState: "Off",
          correctState: "On",
          states: ["On", "Off"],
          rationaleId: "r-replica-public-block",
        },
        {
          id: "block-public-policy",
          label: "Block Public Bucket Policies",
          detail: "Prevents bucket policies that grant broad public access.",
          currentState: "Off",
          correctState: "On",
          states: ["On", "Off"],
          rationaleId: "r-replica-public-block",
        },
        {
          id: "versioning-replica",
          label: "Object Versioning",
          detail: "Cross-region replication requires versioning to be enabled on both source and destination buckets.",
          currentState: "Suspended",
          correctState: "Enabled",
          states: ["Enabled", "Suspended"],
          rationaleId: "r-replica-versioning",
        },
        {
          id: "object-lock",
          label: "S3 Object Lock",
          detail: "Prevents objects from being deleted or overwritten for a retention period (WORM storage).",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-object-lock",
        },
        {
          id: "mfa-delete",
          label: "MFA Delete",
          detail: "Requires MFA authentication for permanent object deletion or versioning state changes.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Enabled", "Disabled"],
          rationaleId: "r-mfa-delete",
        },
      ],
      rationales: [
        {
          id: "r-replica-public-block",
          text: "A DR replica bucket should never be publicly accessible. Cross-account replication access is granted via bucket policy scoped to the specific source account's replication role — not via public ACLs.",
        },
        {
          id: "r-replica-versioning",
          text: "S3 Replication requires versioning to be enabled on both source and destination buckets. Without versioning on the destination, replication will fail with a configuration error.",
        },
        {
          id: "r-object-lock",
          text: "Object Lock in Governance or Compliance mode prevents replicated disaster recovery data from being overwritten or deleted — critical protection if the production account is compromised and an attacker attempts to destroy the replica.",
        },
        {
          id: "r-mfa-delete",
          text: "MFA Delete on a DR bucket ensures that even an IAM user with full S3 permissions cannot permanently delete versions without a second authentication factor, protecting against both accidental and malicious deletion.",
        },
      ],
      feedback: {
        perfect:
          "Excellent DR bucket configuration. Public access is blocked, versioning enables replication, Object Lock prevents data destruction, and MFA Delete adds a critical deletion barrier.",
        partial:
          "The replication destination is partially configured but may have gaps in data protection. Versioning is required for replication to work, and Object Lock/MFA Delete are important for a true DR scenario.",
        wrong:
          "This bucket has critical misconfigurations for a DR destination. At minimum, versioning must be enabled for replication to function, and public access must be blocked for a sensitive replica.",
      },
    },
  ],
  hints: [
    "Block Public Access is the master switch — it overrides bucket policies and ACLs. Turn it on for any private bucket regardless of what policies say.",
    "SSE-KMS vs SSE-S3: KMS gives you CloudTrail audit logs for every key use and the ability to revoke access by disabling the key.",
    "S3 replication has a hard requirement: versioning must be enabled on BOTH source and destination buckets.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "S3 misconfiguration is the leading cause of cloud data breaches. The ability to audit and correctly configure S3 security settings is tested in AWS Security Specialty exams and is a daily responsibility for cloud security engineers. Knowing the distinction between a public website bucket and a private data bucket configuration is fundamental.",
  toolRelevance: ["AWS Console", "AWS CLI", "AWS Config", "Security Hub"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
