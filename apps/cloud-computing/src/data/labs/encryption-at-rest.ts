import type { LabManifest } from "../../types/manifest";

export const encryptionAtRestLab: LabManifest = {
  schemaVersion: "1.1",
  id: "encryption-at-rest",
  version: 1,
  title: "Encryption at Rest",
  tier: "beginner",
  track: "cloud-security",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["security", "encryption", "kms", "s3", "rds", "data-protection"],
  description:
    "Configure encryption-at-rest controls across AWS storage services. Practice enabling KMS encryption on S3 buckets, RDS instances, and EBS volumes while understanding key management best practices.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Enable server-side encryption on S3 buckets using AWS KMS",
    "Configure encryption for RDS instances at creation and after launch",
    "Understand the difference between AWS-managed and customer-managed KMS keys",
    "Identify unencrypted storage resources during a security audit",
    "Apply encryption controls that meet common compliance requirements",
  ],
  sortOrder: 501,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "enc-s1-s3-bucket",
      title: "S3 Bucket Encryption Hardening",
      description:
        "A new S3 bucket named `prod-customer-data` has been provisioned for storing PII. A compliance scan shows several encryption and access settings are misconfigured. Toggle each setting to its secure state.",
      targetSystem: "S3 Bucket: prod-customer-data",
      items: [
        {
          id: "i1",
          label: "Default Server-Side Encryption",
          detail: "Encrypts all new objects stored in the bucket automatically.",
          currentState: "Disabled",
          correctState: "AES-256 (SSE-S3)",
          states: ["Disabled", "AES-256 (SSE-S3)", "AWS KMS (SSE-KMS)"],
          rationaleId: "r1",
        },
        {
          id: "i2",
          label: "Bucket Versioning",
          detail: "Retains previous versions of objects, enabling recovery from accidental overwrites.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Disabled", "Enabled", "Suspended"],
          rationaleId: "r2",
        },
        {
          id: "i3",
          label: "Block Public Access",
          detail: "Prevents ACLs or bucket policies from ever making objects publicly readable.",
          currentState: "Off",
          correctState: "On",
          states: ["Off", "On"],
          rationaleId: "r3",
        },
        {
          id: "i4",
          label: "Enforce TLS in Transit (Bucket Policy)",
          detail: "Adds a bucket policy Deny for all requests not using aws:SecureTransport.",
          currentState: "Not Enforced",
          correctState: "Enforced",
          states: ["Not Enforced", "Enforced"],
          rationaleId: "r4",
        },
      ],
      rationales: [
        {
          id: "r1",
          text: "SSE-S3 encrypts all objects at rest using AES-256, satisfying baseline compliance requirements with no key management overhead.",
        },
        {
          id: "r2",
          text: "Versioning protects PII data from accidental or malicious deletion and is required for S3 Object Lock compliance mode.",
        },
        {
          id: "r3",
          text: "Block Public Access is the strongest S3 safeguard against accidental data exposure and should always be enabled on buckets holding PII.",
        },
        {
          id: "r4",
          text: "Enforcing TLS ensures data is encrypted in transit, satisfying requirements like PCI-DSS 4.2 and HIPAA 164.312(e)(1).",
        },
      ],
      feedback: {
        perfect: "All four controls correctly configured. This bucket now meets baseline encryption and access hardening for PII storage.",
        partial: "Some controls are correct but you missed at least one critical setting. Review each item's compliance impact.",
        wrong: "Several misconfigured controls leave this bucket exposed. Encryption at rest and public access blocking are non-negotiable for PII data.",
      },
    },
    {
      type: "toggle-config",
      id: "enc-s2-rds",
      title: "RDS Instance Encryption Settings",
      description:
        "An RDS PostgreSQL instance `prod-db-01` stores financial records. A quarterly compliance check reveals unencrypted storage and inadequate backup settings. Correct the configuration.",
      targetSystem: "RDS Instance: prod-db-01 (PostgreSQL 15)",
      items: [
        {
          id: "i1",
          label: "Storage Encryption",
          detail: "Encrypts the underlying EBS storage volume for the RDS instance.",
          currentState: "Disabled",
          correctState: "Enabled (AWS KMS)",
          states: ["Disabled", "Enabled (AWS KMS)", "Enabled (Default Key)"],
          rationaleId: "r1",
        },
        {
          id: "i2",
          label: "Automated Backups",
          detail: "Enables point-in-time recovery with a configurable retention window.",
          currentState: "Disabled",
          correctState: "Enabled (7-day retention)",
          states: ["Disabled", "Enabled (1-day retention)", "Enabled (7-day retention)", "Enabled (35-day retention)"],
          rationaleId: "r2",
        },
        {
          id: "i3",
          label: "Multi-AZ Deployment",
          detail: "Maintains a synchronous standby replica in a different Availability Zone.",
          currentState: "Single-AZ",
          correctState: "Multi-AZ",
          states: ["Single-AZ", "Multi-AZ"],
          rationaleId: "r3",
        },
        {
          id: "i4",
          label: "Deletion Protection",
          detail: "Prevents accidental deletion of the RDS instance via console or API.",
          currentState: "Disabled",
          correctState: "Enabled",
          states: ["Disabled", "Enabled"],
          rationaleId: "r4",
        },
      ],
      rationales: [
        {
          id: "r1",
          text: "RDS encryption using a KMS customer-managed key provides encryption at rest and enables fine-grained key policy control and audit trails.",
        },
        {
          id: "r2",
          text: "A 7-day retention window meets most regulatory requirements and allows recovery from ransomware or accidental data corruption.",
        },
        {
          id: "r3",
          text: "Multi-AZ ensures database availability during AZ outages and is a resilience requirement for production financial systems.",
        },
        {
          id: "r4",
          text: "Deletion protection is a simple safeguard that prevents data loss from human error or compromised credentials.",
        },
      ],
      feedback: {
        perfect: "All RDS settings correctly hardened. This configuration meets encryption-at-rest and availability requirements for financial data.",
        partial: "Some settings are correct but at least one critical control is still misconfigured. Check encryption and backup settings especially.",
        wrong: "Multiple critical settings remain in their insecure default state. Financial record databases require encryption, backups, and deletion protection.",
      },
    },
    {
      type: "toggle-config",
      id: "enc-s3-ebs",
      title: "EBS Volume Encryption Audit",
      description:
        "Three EBS volumes are attached to an EC2 instance running a healthcare application. A HIPAA readiness audit flagged these volumes as non-compliant. Configure each volume's encryption to meet PHI protection requirements.",
      targetSystem: "EC2 Instance: hipaa-app-server (us-east-1)",
      items: [
        {
          id: "i1",
          label: "Root Volume Encryption",
          detail: "The OS root volume (/dev/xvda) containing application binaries and config.",
          currentState: "Unencrypted",
          correctState: "Encrypted (CMK)",
          states: ["Unencrypted", "Encrypted (Default AWS Key)", "Encrypted (CMK)"],
          rationaleId: "r1",
        },
        {
          id: "i2",
          label: "Data Volume Encryption",
          detail: "The secondary volume (/dev/xvdb) storing PHI database files.",
          currentState: "Unencrypted",
          correctState: "Encrypted (CMK)",
          states: ["Unencrypted", "Encrypted (Default AWS Key)", "Encrypted (CMK)"],
          rationaleId: "r2",
        },
        {
          id: "i3",
          label: "Account-Level EBS Encryption Default",
          detail: "Forces encryption on all newly created EBS volumes in this AWS region.",
          currentState: "Off",
          correctState: "On",
          states: ["Off", "On"],
          rationaleId: "r3",
        },
      ],
      rationales: [
        {
          id: "r1",
          text: "Encrypting the root volume prevents forensic extraction of configuration secrets, application code, and cached credentials if physical media is ever removed.",
        },
        {
          id: "r2",
          text: "PHI stored on an unencrypted volume is a direct HIPAA violation. Customer-managed keys provide audit trails via AWS CloudTrail.",
        },
        {
          id: "r3",
          text: "Enabling encryption by default at the account level ensures all future volumes are encrypted, preventing compliance drift as infrastructure scales.",
        },
      ],
      feedback: {
        perfect: "All EBS encryption controls are correctly set. This configuration satisfies HIPAA encryption-at-rest requirements for PHI.",
        partial: "Some volumes are encrypted but you missed an important setting. Encryption defaults prevent future compliance drift.",
        wrong: "Unencrypted volumes storing PHI create direct HIPAA violations and expose patient data if media is ever compromised.",
      },
    },
  ],
  hints: [
    "AWS KMS customer-managed keys (CMKs) provide full audit trails via CloudTrail and support key rotation — prefer them over default AWS-managed keys for regulated data.",
    "Note that RDS encryption must be enabled at instance creation time — you cannot encrypt an existing unencrypted instance in-place; you must create a snapshot, copy it with encryption, and restore.",
    "The account-level 'EBS Encryption by Default' setting is a free, one-click control that prevents any future unencrypted volume from being created in that region.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Encryption-at-rest configuration is one of the first things auditors check during SOC 2, HIPAA, and PCI-DSS assessments. Cloud engineers who understand KMS key management and storage encryption patterns are essential for any company handling regulated data.",
  toolRelevance: ["AWS KMS", "AWS S3", "Amazon RDS", "Amazon EBS", "AWS Config", "Prowler", "ScoutSuite"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
