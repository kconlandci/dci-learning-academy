import type { LabManifest } from "../../types/manifest";

export const cloudForensicsInvestigationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloud-forensics-investigation",
  version: 1,
  title: "Cloud Forensics and Evidence Collection",
  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["security", "forensics", "evidence-collection", "chain-of-custody", "ebs-snapshot", "cloud-trail", "incident-response"],
  description:
    "Perform digital forensics in cloud environments. Practice evidence preservation including EBS snapshots, CloudTrail log integrity validation, memory capture from running instances, and chain of custody documentation.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Preserve volatile and non-volatile evidence from compromised cloud instances",
    "Maintain chain of custody documentation for cloud forensic artifacts",
    "Validate CloudTrail log integrity using digest files for tamper detection",
    "Choose the correct forensic acquisition method based on the type of evidence needed",
  ],
  sortOrder: 510,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "cf-s1-evidence-preservation",
      title: "Preserving Evidence from a Compromised EC2 Instance",
      context:
        "AWS GuardDuty alerts on a compromised EC2 instance running a customer-facing application. The security team has isolated the instance with a quarantine security group. Legal counsel has been notified and may pursue legal action against the attacker. You need to collect forensic evidence that will be admissible if the case goes to court. The instance is still running.",
      displayFields: [
        { label: "Instance State", value: "Running — isolated with quarantine SG", emphasis: "normal" },
        { label: "Legal Status", value: "Legal counsel notified — evidence may be needed in court", emphasis: "critical" },
        { label: "Evidence Needed", value: "Disk artifacts, memory contents, network connections", emphasis: "warn" },
        { label: "Time Sensitivity", value: "Volatile evidence (memory, network state) degrades over time", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Create EBS snapshots of all attached volumes and terminate the instance to prevent further compromise", color: "yellow" },
        { id: "a2", label: "Capture memory dump via SSM agent first, then create EBS snapshots, document all actions with timestamps and hashes in a chain of custody log", color: "green" },
        { id: "a3", label: "SSH into the instance and run forensic tools (volatility, tcpdump) to analyze the compromise in real-time", color: "red" },
        { id: "a4", label: "Stop the instance to freeze the disk state, then create AMI for forensic analysis", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "EBS snapshots preserve disk evidence but terminating the instance immediately destroys volatile memory evidence including running processes, network connections, and encryption keys in memory." },
        { id: "r2", text: "Memory capture must happen first because it contains volatile evidence (running processes, network connections, decrypted data) that is lost on shutdown. EBS snapshots follow. Chain of custody documentation with timestamps and cryptographic hashes ensures evidence admissibility in legal proceedings." },
        { id: "r3", text: "SSHing into the compromised instance modifies filesystem timestamps, creates new log entries, and potentially alerts the attacker. This contaminates the evidence and breaks chain of custody." },
        { id: "r4", text: "Stopping the instance destroys all volatile memory evidence. While it preserves disk state, memory artifacts — often the most valuable forensic evidence — are permanently lost." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Volatile evidence first (memory dump), then non-volatile (EBS snapshots), all documented with chain of custody. This order preserves the most evidence and maintains legal admissibility.",
        partial: "You're preserving evidence but missing the volatility order. Memory evidence must be captured before any action that might modify or destroy it — including instance shutdown.",
        wrong: "This approach either destroys volatile evidence or contaminates the forensic scene. The order of volatility principle requires capturing memory before disk, with full chain of custody documentation.",
      },
    },
    {
      type: "action-rationale",
      id: "cf-s2-log-integrity",
      title: "Validating CloudTrail Log Integrity After Suspected Tampering",
      context:
        "During a security investigation, you discover gaps in CloudTrail logs for a 4-hour window during which the attacker had administrator access. The attacker could have deleted or modified CloudTrail logs to cover their tracks. You need to determine whether the logs in S3 are complete and unmodified before relying on them for the investigation timeline.",
      displayFields: [
        { label: "Log Gap", value: "4-hour window with suspected missing events", emphasis: "critical" },
        { label: "Attacker Access", value: "Administrator-level IAM access during the window", emphasis: "critical" },
        { label: "Log Delivery", value: "CloudTrail logs delivered to S3 bucket", emphasis: "normal" },
        { label: "Log File Integrity", value: "Unknown — need to verify before relying on logs", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Check S3 access logs to see if any CloudTrail log files were deleted from the bucket", color: "yellow" },
        { id: "a2", label: "Validate CloudTrail log file integrity using the digest files that CloudTrail generates with SHA-256 hashes for each log delivery", color: "green" },
        { id: "a3", label: "Compare the CloudTrail logs against CloudWatch Logs (if configured as a secondary destination) for discrepancies", color: "orange" },
        { id: "a4", label: "Assume the logs are complete if S3 versioning is enabled on the bucket", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "S3 access logs show delete operations but an attacker with administrator access could also have deleted or modified S3 access logs. They are not a tamper-proof verification mechanism." },
        { id: "r2", text: "CloudTrail digest files contain SHA-256 hashes of each log file and are cryptographically signed by AWS. Validating these digests definitively proves whether log files were modified, deleted, or are complete — this is the purpose-built integrity verification mechanism." },
        { id: "r3", text: "CloudWatch Logs comparison is useful if configured, but it's a secondary check. Digest file validation is the authoritative method because it uses cryptographic signatures from AWS that the attacker cannot forge." },
        { id: "r4", text: "S3 versioning preserves previous versions but doesn't prevent an attacker from creating modified versions that appear current. Versioning preserves history but doesn't verify integrity." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. CloudTrail digest files with SHA-256 hashes and AWS cryptographic signatures are the authoritative mechanism for verifying log integrity. This is the first step before trusting any CloudTrail evidence.",
        partial: "You're using a valid supplementary check but not the primary integrity mechanism. CloudTrail digest files are purpose-built for tamper detection and provide cryptographic proof of log completeness.",
        wrong: "This approach doesn't provide cryptographic proof of log integrity. CloudTrail digest files are the only mechanism that can definitively prove whether logs were tampered with.",
      },
    },
    {
      type: "action-rationale",
      id: "cf-s3-forensic-workstation",
      title: "Setting Up a Forensic Analysis Environment",
      context:
        "You have acquired EBS snapshots and a memory dump from a compromised production instance in us-east-1. The forensic analysis must be performed without modifying the original evidence. Your organization's forensic policy requires that analysis occurs in an isolated environment with no internet access and that all evidence access is logged.",
      displayFields: [
        { label: "Evidence", value: "EBS snapshots + memory dump stored in isolated S3 bucket", emphasis: "normal" },
        { label: "Policy", value: "Analysis must not modify original evidence", emphasis: "critical" },
        { label: "Network Requirement", value: "Forensic environment must have no internet access", emphasis: "warn" },
        { label: "Audit Requirement", value: "All evidence access must be logged", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Restore the EBS snapshots to new volumes on the original production instance for analysis", color: "red" },
        { id: "a2", label: "Create a dedicated forensic VPC with no internet gateway, launch an analysis instance from a hardened forensic AMI, attach read-only copies of the evidence volumes, and enable CloudTrail logging for all API actions", color: "green" },
        { id: "a3", label: "Download the EBS snapshot data to an on-premises forensic workstation for offline analysis", color: "orange" },
        { id: "a4", label: "Mount the original EBS snapshots directly as volumes on a new EC2 instance in the production VPC", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Attaching evidence to the compromised production instance risks cross-contamination and modifies the production environment. Evidence must never be analyzed on or near the compromised system." },
        { id: "r2", text: "A dedicated forensic VPC with no internet gateway provides network isolation. A hardened forensic AMI has pre-installed analysis tools. Read-only volume copies prevent evidence modification. CloudTrail logging satisfies the audit requirement." },
        { id: "r3", text: "Downloading to on-premises is valid for some organizations but introduces data transfer delays for large EBS volumes and moves evidence outside the cloud audit perimeter." },
        { id: "r4", text: "Mounting original snapshots directly risks modification — EBS volumes created from snapshots are read-write by default. The production VPC also lacks the required network isolation." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. An isolated forensic VPC with a hardened AMI, read-only evidence copies, and API audit logging satisfies all forensic policy requirements while keeping evidence in the cloud audit perimeter.",
        partial: "You're isolating the analysis from production but missing one or more requirements: network isolation, evidence immutability, or audit logging. All three are needed for a compliant forensic environment.",
        wrong: "This approach violates forensic best practices by either co-locating analysis with the compromised environment or failing to maintain evidence integrity and audit trails.",
      },
    },
  ],
  hints: [
    "The order of volatility determines evidence collection priority: memory and network state first (most volatile), then disk and log data (less volatile). Always capture memory before shutting down or restarting an instance.",
    "CloudTrail log file integrity validation uses digest files containing SHA-256 hashes signed by AWS. Run 'aws cloudtrail validate-logs' to verify that no log files were modified or deleted after delivery.",
    "Forensic analysis environments must be isolated (no internet), use read-only copies of evidence (never modify originals), and log all access for chain of custody documentation.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Cloud forensics is an emerging specialization that combines traditional digital forensics with cloud platform expertise. Organizations increasingly need investigators who can collect and preserve evidence from ephemeral cloud resources — a skill set valued in incident response teams, managed security service providers, and cloud security consulting firms.",
  toolRelevance: ["AWS CloudTrail", "EBS Snapshots", "AWS Systems Manager", "Amazon S3", "Volatility Framework", "AWS CloudWatch Logs"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
