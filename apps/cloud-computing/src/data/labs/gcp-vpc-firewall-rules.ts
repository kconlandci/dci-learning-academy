import type { LabManifest } from "../../types/manifest";

export const gcpVpcFirewallRulesLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-vpc-firewall-rules",
  version: 1,
  title: "VPC Firewall Rule Triage",
  tier: "beginner",
  track: "gcp-essentials",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["gcp", "vpc", "firewall", "network-security", "ingress", "egress", "triage"],
  description:
    "Diagnose and remediate VPC firewall misconfigurations causing connectivity failures and security exposures. Analyze firewall rules, hit counts, and network topology to identify the correct fix.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Read VPC firewall rule priority, direction, and target configuration",
    "Identify which firewall rule is blocking or allowing unintended traffic",
    "Apply network tags and service accounts as firewall targets instead of IP ranges",
    "Remediate overly permissive 0.0.0.0/0 ingress rules",
  ],
  sortOrder: 305,
  status: "published",
  prerequisites: [],
  rendererType: "triage-remediate",
  scenarios: [
    {
      type: "triage-remediate",
      id: "vpc-fw-scenario-1",
      title: "Database Cannot Be Reached from App Servers",
      description:
        "Production application servers are failing to connect to the Cloud SQL proxy on port 5432 (PostgreSQL). Health checks are failing and the application is returning 500 errors. Investigate the firewall rules and identify the blocking rule and correct remediation.",
      evidence: [
        {
          type: "metric",
          content:
            "$ gcloud compute firewall-rules list --format='table(name,direction,priority,network,sourceRanges,targetTags,allowed,denied)'\n\nNAME                         DIR   PRIORITY  NETWORK  SOURCE_RANGES    TARGET_TAGS      ALLOWED         DENIED\ndefault-allow-internal       INGRESS  65534  default  10.128.0.0/9     -                tcp:0-65535     -\ndefault-allow-ssh            INGRESS  65534  default  0.0.0.0/0        -                tcp:22          -\nallow-app-to-db              INGRESS  1000   default  10.0.1.0/24      db-tier          tcp:5432        -\ndeny-all-ingress-db          INGRESS  500    default  0.0.0.0/0        db-tier          -               tcp:0-65535\nallow-health-checks          INGRESS  1000   default  35.191.0.0/16    app-tier         tcp:80,443      -",
          icon: "terminal",
        },
        {
          type: "metric",
          content:
            "App servers: 10.0.1.0/24 subnet, tagged: app-tier\nDB servers (Cloud SQL proxy VMs): 10.0.2.0/24 subnet, tagged: db-tier\nApp servers source IP when connecting to DB: 10.0.1.0/24",
          icon: "network",
        },
        {
          type: "metric",
          content:
            "DENIED — tcp:5432 — src: 10.0.1.15 → dst: 10.0.2.4 — rule: deny-all-ingress-db (priority 500)\nDENIED — tcp:5432 — src: 10.0.1.22 → dst: 10.0.2.4 — rule: deny-all-ingress-db (priority 500)\nDENIED — tcp:5432 — src: 10.0.1.31 → dst: 10.0.2.4 — rule: deny-all-ingress-db (priority 500)",
          icon: "alert",
        },
      ],
      classifications: [
        { id: "priority-conflict", label: "Priority Conflict", description: "A lower-priority (higher number) allow rule is being overridden by a higher-priority (lower number) deny rule." },
        { id: "wrong-target-tag", label: "Wrong Target Tag", description: "The allow rule targets the wrong network tag, so app server traffic is not matched." },
        { id: "wrong-source-range", label: "Wrong Source IP Range", description: "The allow rule has an incorrect source IP range that doesn't match app server IPs." },
        { id: "missing-rule", label: "Missing Allow Rule", description: "There is no firewall rule at all permitting port 5432 from app servers to db servers." },
      ],
      correctClassificationId: "priority-conflict",
      remediations: [
        { id: "lower-allow-priority", label: "Change allow-app-to-db priority from 1000 to 400", description: "Give the allow rule a lower priority number (400) so it evaluates before the deny-all rule (500)." },
        { id: "delete-deny-rule", label: "Delete the deny-all-ingress-db rule", description: "Remove the blanket deny rule, relying on GCP's default-deny to block unspecified traffic." },
        { id: "fix-source-range", label: "Change allow-app-to-db source range to 10.0.1.0/24", description: "Update the source CIDR to correctly match the app server subnet." },
        { id: "add-tag-to-vm", label: "Add db-tier tag to the Cloud SQL proxy VMs", description: "Ensure the target VMs have the db-tier tag so the allow rule applies to them." },
      ],
      correctRemediationId: "lower-allow-priority",
      rationales: [
        { id: "r-priority-wins", text: "GCP firewall rules are evaluated in ascending priority order (lowest number = highest priority). deny-all-ingress-db at priority 500 evaluates BEFORE allow-app-to-db at priority 1000, blocking all TCP to db-tier regardless of the allow rule." },
        { id: "r-allow-correct", text: "The allow-app-to-db rule already has the correct source range (10.0.1.0/24) and target tag (db-tier). Only its priority needs to change to 400 to take precedence over the deny rule." },
        { id: "r-delete-deny-risk", text: "Deleting the deny-all rule exposes the DB tier to all internal traffic. The deny rule is a good defense-in-depth layer — only the allow rule's priority needs adjustment." },
      ],
      correctRationaleId: "r-priority-wins",
      feedback: {
        perfect: "Excellent diagnosis! The priority conflict is the classic VPC firewall gotcha. The deny rule at 500 shadows the allow rule at 1000. Setting the allow rule to 400 fixes the ordering.",
        partial: "You identified a real issue, but the root cause is priority ordering. The allow rule has the correct source and target — it just evaluates too late because deny-all at 500 fires first.",
        wrong: "Read the firewall logs: every connection is denied by deny-all-ingress-db at priority 500. The allow-app-to-db rule exists but at priority 1000 — it never gets evaluated because the deny rule fires first.",
      },
    },
    {
      type: "triage-remediate",
      id: "vpc-fw-scenario-2",
      title: "Security Audit: Overly Permissive SSH Rule",
      description:
        "A security scanner has flagged your GCP project for a critical severity finding: SSH (port 22) is open to the entire internet from a production VM. You need to classify the severity and apply the correct remediation.",
      evidence: [
        {
          type: "metric",
          content:
            "Finding: OPEN_SSH_PORT\nSeverity: CRITICAL\nResource: projects/prod-project/global/firewalls/allow-ssh-prod\nDetails: Firewall rule allows ingress TCP:22 from 0.0.0.0/0 (all internet IPs)\nAffected VMs: 12 instances with tag 'ssh-enabled' in prod network\nFirst detected: 2026-01-15 (73 days ago)\nLogin attempts in last 24h: 14,872 (Cloud Logging)",
          icon: "alert",
        },
        {
          type: "metric",
          content:
            "$ gcloud compute firewall-rules describe allow-ssh-prod\nallowed:\n- IPProtocol: tcp\n  ports:\n  - '22'\ndirection: INGRESS\ndisabled: false\nlogConfig:\n  enable: false\nname: allow-ssh-prod\nnetwork: https://compute.googleapis.com/compute/v1/projects/prod-project/global/networks/prod-vpc\npriority: 1000\nsourceRanges:\n- 0.0.0.0/0\ntargetTags:\n- ssh-enabled",
          icon: "terminal",
        },
        {
          type: "metric",
          content:
            "Engineers access production VMs via SSH occasionally for debugging.\nAll engineers have static corporate VPN IP range: 203.0.113.0/24\nThe company also uses Identity-Aware Proxy (IAP) for tunneled SSH access.\nIAP TCP forwarding is currently configured but the SSH rule overrides it.",
          icon: "info",
        },
      ],
      classifications: [
        { id: "critical-exposure", label: "Critical Security Exposure", description: "Production SSH port exposed to entire internet — active brute-force attempts in progress." },
        { id: "misconfiguration", label: "Misconfiguration — No Active Threat", description: "Configuration issue but no evidence of successful breach or active exploitation." },
        { id: "false-positive", label: "False Positive", description: "The finding is incorrect; the rule is intentionally broad for operational reasons." },
        { id: "low-risk", label: "Low Risk — Public Subnet", description: "SSH exposure in a public subnet is expected for internet-facing infrastructure." },
      ],
      correctClassificationId: "critical-exposure",
      remediations: [
        {
          id: "restrict-to-iap",
          label: "Remove 0.0.0.0/0 source, restrict to IAP CIDR (35.235.240.0/20) only",
          description: "IAP TCP forwarding proxies SSH through Google's infrastructure. Only allow IAP's source range — engineers SSH via 'gcloud compute ssh' without needing any public IP.",
        },
        {
          id: "restrict-to-vpn",
          label: "Change source range to corporate VPN CIDR (203.0.113.0/24) only",
          description: "Limit SSH access to engineers' corporate VPN IP range, blocking all other internet access.",
        },
        {
          id: "disable-rule",
          label: "Disable the firewall rule immediately",
          description: "Immediately disable the rule while a proper fix is designed, with zero disruption to IAP-based access.",
        },
        {
          id: "enable-logging",
          label: "Enable firewall rule logging to monitor SSH attempts",
          description: "Turn on logging for this rule to track all SSH access attempts without changing the rule.",
        },
      ],
      correctRemediationId: "restrict-to-iap",
      rationales: [
        { id: "r-iap-best-practice", text: "IAP TCP tunneling is the GCP-recommended pattern for bastion-free SSH. Engineers run 'gcloud compute ssh instance-name' and IAP handles auth via GCP identity — no public IP needed on VMs." },
        { id: "r-vpn-ok-but-inferior", text: "Restricting to VPN IP is better than 0.0.0.0/0 but still exposes SSH if VPN credentials are compromised. IAP ties access to individual GCP identity with audit logs per user." },
        { id: "r-logging-insufficient", text: "Enabling logging without fixing the source range doesn't reduce exposure — it only improves detection after the fact." },
        { id: "r-14k-attempts", text: "14,872 login attempts in 24 hours confirms active brute-force. This is a CRITICAL severity — immediate remediation is required, not monitoring." },
      ],
      correctRationaleId: "r-iap-best-practice",
      feedback: {
        perfect: "Correct on both counts. This is a critical exposure with active brute-force. The best remediation is IAP-only SSH — it eliminates the need for any public SSH exposure entirely.",
        partial: "Classification is correct, but the optimal remediation is IAP TCP tunneling, not VPN restriction. IAP provides per-user audit logs and doesn't require managing VPN IP ranges.",
        wrong: "14,872 SSH login attempts in 24 hours is an active brute-force attack in progress. This is critical severity requiring immediate remediation — restrict the source range, preferably to IAP only.",
      },
    },
    {
      type: "triage-remediate",
      id: "vpc-fw-scenario-3",
      title: "Egress Traffic Causing Unexpected Costs",
      description:
        "Your GCP billing shows $4,200 in unexpected internet egress charges this month. Network Intelligence Center shows high egress from production VMs to external IP addresses. Triage the cause and select the correct remediation.",
      evidence: [
        {
          type: "metric",
          content:
            "Egress to internet (non-Google): $4,200\nTop source VMs: analytics-vm-01 through analytics-vm-10\nTop destination: 104.244.42.0/24 (Twitter/X API endpoints)\nEgress volume: 2.1 TB over 30 days\nExpected egress: ~50 GB/month\nAnomaly detected: 2026-03-01 (27 days ago)",
          icon: "alert",
        },
        {
          type: "metric",
          content:
            "Egress rules:\n  allow-all-egress: EGRESS, priority 65534, allow all, targets: ALL VMs\n  (No custom egress deny rules configured)\n\nNote: GCP default egress rule allows all outbound traffic unless custom deny rules are created.",
          icon: "terminal",
        },
        {
          type: "metric",
          content:
            "Investigation of analytics-vm-01:\nRunning processes: data-exporter (PID 4421) — unknown binary\nNetwork connections: analytics-vm-01 → 104.244.42.65:443 (continuous)\nFile found: /tmp/.hidden/data-exporter\nSHA256: does not match any known GCP tools\nFirst seen: 2026-03-01 (coincides with billing anomaly)",
          icon: "alert",
        },
        {
          type: "metric",
          content:
            "SSH login to analytics-vm-01 from 198.51.100.42 on 2026-02-28 23:14 UTC\n  User: admin (shared team account)\n  Source IP: 198.51.100.42 (not in corporate VPN range)\n  Action: root shell obtained via sudo\n  Files dropped: /tmp/.hidden/data-exporter",
          icon: "critical",
        },
      ],
      classifications: [
        { id: "security-incident-data-exfil", label: "Active Security Incident — Data Exfiltration", description: "Unauthorized process is exfiltrating data to external endpoints following unauthorized VM access." },
        { id: "misconfigured-app", label: "Misconfigured Application Sending Too Much Data", description: "An application is incorrectly configured to send excessive telemetry or data to external APIs." },
        { id: "billing-error", label: "Billing Error or GCP Metering Issue", description: "The charges are incorrect — GCP is miscounting egress from these VMs." },
        { id: "cost-anomaly-api", label: "Cost Anomaly from Heavy API Usage", description: "The analytics VMs are legitimately calling external APIs but the volume is unexpectedly high." },
      ],
      correctClassificationId: "security-incident-data-exfil",
      remediations: [
        {
          id: "incident-response",
          label: "Immediately isolate VMs, invoke incident response, preserve forensic evidence",
          description: "Snapshot VM disks, add an egress deny-all firewall rule targeting the affected VMs, revoke all SSH keys, escalate to security team — do NOT delete VMs until forensics are complete.",
        },
        {
          id: "delete-binary",
          label: "SSH into each VM and delete the data-exporter binary, restart",
          description: "Remove the malicious binary and restart the VMs to stop the exfiltration.",
        },
        {
          id: "add-egress-deny",
          label: "Add an egress deny rule for 104.244.42.0/24 to block the destination",
          description: "Create a VPC firewall egress deny rule blocking connections to the identified destination subnet.",
        },
        {
          id: "rotate-credentials",
          label: "Rotate all SSH keys and service account credentials for the project",
          description: "Rotate credentials to prevent further unauthorized access.",
        },
      ],
      correctRemediationId: "incident-response",
      rationales: [
        { id: "r-incident-process", text: "This is a confirmed breach: unauthorized SSH from unknown IP, root privilege escalation, unknown binary dropped, and 2.1 TB of egress. The correct response is incident response protocol — isolate, preserve, escalate. Deleting evidence (the VMs) would impede investigation." },
        { id: "r-delete-binary-wrong", text: "SSHing into a compromised VM to clean up is dangerous — the attacker may still have access and may have modified other files. It also destroys forensic evidence." },
        { id: "r-egress-deny-insufficient", text: "Blocking just one egress destination leaves the compromised VMs fully active. The attacker can pivot to other endpoints. Full isolation is required." },
        { id: "r-cred-rotation-necessary-not-sufficient", text: "Credential rotation is necessary but is step 3, not step 1. Isolation of the breached VMs must happen first to stop active exfiltration." },
      ],
      correctRationaleId: "r-incident-process",
      feedback: {
        perfect: "Correct security incident classification and response! The indicators — unauthorized login, unknown binary, sustained 2.1 TB egress — are unambiguous signs of a breach. Isolate before remediate.",
        partial: "You identified a security problem, but the remediation must start with VM isolation and forensic preservation. Deleting the binary or blocking one IP leaves the incident unresolved.",
        wrong: "The evidence trail is clear: unauthorized SSH login from unknown IP → root access → unknown binary dropped → 2.1 TB exfiltrated. This is an active security incident requiring incident response, not a configuration fix.",
      },
    },
  ],
  hints: [
    "GCP firewall rules are evaluated in strict priority order — lower numbers win. A deny rule at priority 500 blocks traffic even if an allow rule exists at priority 1000. Always check for overlapping rules with conflicting priorities.",
    "For production SSH access, use Identity-Aware Proxy (IAP) TCP tunneling instead of opening port 22 to 0.0.0.0/0. IAP requires no public IP on the VM and provides per-user audit logs.",
    "GCP has no default egress deny rule. All outbound traffic is allowed unless you explicitly create egress firewall deny rules. Monitor egress billing anomalies with Budget Alerts and Network Intelligence Center.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "VPC firewall misconfiguration is one of the top causes of both security incidents and connectivity failures on GCP. Cloud security engineers and network engineers who can read firewall rule priority logic, use network tags correctly, and identify exfiltration indicators are in constant demand. This skill transfers directly to security operations center (SOC) and cloud architecture roles.",
  toolRelevance: ["GCP Console (VPC Firewall Rules)", "gcloud compute firewall-rules", "Network Intelligence Center", "Cloud Logging", "Security Command Center"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
