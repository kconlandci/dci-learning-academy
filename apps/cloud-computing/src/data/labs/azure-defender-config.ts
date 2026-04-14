import type { LabManifest } from "../../types/manifest";

export const azureDefenderConfigLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-defender-config",
  version: 1,
  title: "Microsoft Defender for Cloud Configuration",
  tier: "intermediate",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "defender", "security-center", "cspm", "cwpp", "security-alerts", "recommendations"],
  description:
    "Configure Microsoft Defender for Cloud plans, triage security recommendations, and respond to security alerts across Azure subscriptions including VMs, storage accounts, and SQL databases.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Enable and configure Defender for Cloud plans (CSPM, Servers, Storage, SQL) based on workload requirements",
    "Prioritize security recommendations using secure score impact and risk severity",
    "Investigate and respond to Defender security alerts using the attack kill chain context",
    "Configure auto-provisioning of the Log Analytics agent and vulnerability assessment extensions",
  ],
  sortOrder: 216,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Defender Plans — Selecting Coverage for a Mixed Workload",
      context:
        "A company has 50 Azure VMs (Windows and Linux), 20 Azure SQL databases, 30 storage accounts, and 5 AKS clusters. The security team has budget to enable Defender plans but cannot enable everything. The highest risk findings from a recent penetration test were: (1) unpatched OS vulnerabilities on VMs, (2) SQL injection attempts on public-facing databases, and (3) malware uploaded to blob storage. AKS clusters are internal-only with no public endpoints.",
      displayFields: [
        { label: "VMs", value: "50 (Windows + Linux), internet-facing, unpatched vulnerabilities found" },
        { label: "SQL Databases", value: "20, public-facing, SQL injection attempts detected in pen test" },
        { label: "Storage Accounts", value: "30, accepting user uploads, malware found in pen test" },
        { label: "AKS Clusters", value: "5, internal only, no public endpoints, no pen test findings" },
        { label: "Budget", value: "Limited — must prioritize highest-risk workloads" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Enable Defender for Servers (P2), Defender for Azure SQL, and Defender for Storage — skip Defender for Containers since AKS clusters are internal with no findings",
          color: "green",
        },
        {
          id: "action-b",
          label: "Enable only the free Defender CSPM tier which provides secure score and basic recommendations for all resources",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Enable Defender for Containers and Defender for Servers (P1) — containers are the highest risk in any modern environment",
          color: "red",
        },
        {
          id: "action-d",
          label: "Enable all Defender plans across all resource types to maximize security coverage",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "This prioritizes based on actual risk findings: (1) Defender for Servers P2 provides vulnerability assessment, file integrity monitoring, and just-in-time VM access for the 50 internet-facing VMs with known unpatched vulnerabilities. (2) Defender for Azure SQL detects SQL injection attempts, anomalous access patterns, and data exfiltration on the 20 public-facing databases. (3) Defender for Storage detects malware uploads, suspicious access patterns, and data exfiltration on the 30 storage accounts accepting user uploads. AKS clusters are internal-only with no findings — Defender for Containers can be added later when budget allows.",
        },
        {
          id: "rationale-b",
          text: "Free CSPM provides secure score and recommendations but does NOT provide threat detection, vulnerability scanning, or real-time alerts. It tells you what's misconfigured but cannot detect active SQL injection attempts, malware uploads, or exploited VM vulnerabilities. The pen test findings require active threat protection, not just configuration recommendations.",
        },
        {
          id: "rationale-c",
          text: "Prioritizing Defender for Containers over SQL and Storage contradicts the pen test findings. The AKS clusters are internal-only with no vulnerabilities found. SQL injection on public databases and malware in storage are confirmed active threats. Security spending should address known risks first, not hypothetical ones.",
        },
        {
          id: "rationale-d",
          text: "Enabling all plans maximizes coverage but the scenario states budget is limited. Defender for Containers on 5 internal-only AKS clusters with no findings is lower priority than protecting 50 internet-facing VMs, 20 public SQL databases, and 30 storage accounts with confirmed vulnerabilities.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Prioritizing Defender plans based on pen test findings and exposure ensures budget is spent on the highest-risk workloads — internet-facing VMs, public SQL databases, and user-upload storage accounts.",
        partial:
          "Enabling all plans would provide maximum coverage, but budget constraints require prioritization. Free CSPM provides recommendations but not the active threat detection needed for confirmed vulnerabilities.",
        wrong:
          "Prioritizing Defender for Containers on internal-only AKS clusters over confirmed SQL injection and malware findings on public-facing resources misallocates limited security budget.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Security Recommendations — Prioritizing Secure Score Improvements",
      context:
        "The organization's Defender for Cloud secure score is 38/100. The CISO has mandated reaching 70/100 within 30 days. The security team has bandwidth for 3 major remediation efforts. They need to select the recommendations that provide the highest secure score improvement with the most practical impact.",
      displayFields: [
        { label: "Current Secure Score", value: "38/100" },
        { label: "Target", value: "70/100 within 30 days" },
        { label: "Recommendation A", value: "Enable MFA for all accounts with owner permissions — Score impact: +12, Affected: 15 accounts, Effort: Low" },
        { label: "Recommendation B", value: "Encrypt storage accounts with customer-managed keys — Score impact: +3, Affected: 30 accounts, Effort: High" },
        { label: "Recommendation C", value: "Apply system updates to VMs — Score impact: +10, Affected: 50 VMs, Effort: Medium" },
        { label: "Recommendation D", value: "Restrict public network access to SQL databases — Score impact: +8, Affected: 12 databases, Effort: Medium" },
        { label: "Recommendation E", value: "Enable diagnostic logging on all resources — Score impact: +4, Affected: 200 resources, Effort: Low" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Prioritize recommendations A (+12), C (+10), and D (+8) — total +30 points, reaching 68/100, then add E (+4) as a low-effort bonus to reach 72/100",
          color: "green",
        },
        {
          id: "action-b",
          label: "Prioritize recommendations A (+12), B (+3), and E (+4) — focus on the easiest to implement first",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Prioritize recommendations B (+3), C (+10), and E (+4) — skip MFA since it requires user cooperation",
          color: "red",
        },
        {
          id: "action-d",
          label: "Address all 5 recommendations simultaneously by assigning each to a different team member",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Maximizing score impact per effort: MFA for owners (+12, low effort) is the single highest-impact recommendation and addresses the most critical attack vector (compromised admin accounts). VM patching (+10, medium effort) closes known vulnerabilities on 50 internet-facing VMs. SQL network restriction (+8, medium effort) reduces the attack surface of 12 public databases. These three yield +30 points (38→68). Adding diagnostic logging (+4, low effort) reaches 72 — exceeding the 70 target. Customer-managed key encryption (+3, high effort) is deferred as low-impact relative to effort.",
        },
        {
          id: "rationale-b",
          text: "This combination yields only +19 points (38→57), falling far short of the 70 target. Customer-managed key encryption is high effort for +3 points — poor ROI when the team's bandwidth is limited. Prioritizing ease of implementation over score impact misses the 30-day deadline.",
        },
        {
          id: "rationale-c",
          text: "Skipping MFA for owner accounts sacrifices the single highest-impact recommendation (+12 points) and leaves the most critical security gap open — compromised owner accounts can disable all other security controls. MFA requires user cooperation but is a low-technical-effort change that most organizations can enforce via Conditional Access policies within days.",
        },
        {
          id: "rationale-d",
          text: "Addressing all 5 simultaneously sounds efficient but the team has bandwidth for only 3 major efforts. Customer-managed encryption (recommendation B) is high effort — assigning it alongside 4 other efforts risks none being completed properly within 30 days. Focused execution on the top 3-4 recommendations is more reliable than spreading thin across all 5.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Prioritizing by score impact relative to effort — MFA (+12), patching (+10), SQL restriction (+8), plus low-effort logging (+4) — reaches 72/100 and addresses the most critical security gaps.",
        partial:
          "Attempting all recommendations risks incomplete execution. Prioritizing by ease alone yields insufficient score improvement to meet the 70-point target.",
        wrong:
          "Skipping MFA for owner accounts leaves the highest-impact security gap open. Compromised owner accounts can undo all other security improvements.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Security Alert Triage — Suspicious VM Activity",
      context:
        "Defender for Servers has generated a high-severity alert: 'Suspicious authentication activity' on a production web server VM. The alert shows 847 failed SSH login attempts from 12 different IP addresses in the last hour, followed by 1 successful login from an IP in a country where the company has no employees. Post-login, the alert chain shows process execution of base64-encoded PowerShell commands and outbound connections to a known C2 (command and control) IP address.",
      displayFields: [
        { label: "Alert Severity", value: "High" },
        { label: "VM", value: "prod-web-03 (Ubuntu 22.04, public IP, SSH port 22 open to internet)" },
        { label: "Failed Logins", value: "847 attempts from 12 IPs in 1 hour" },
        { label: "Successful Login", value: "1 login from 185.x.x.x (Eastern Europe) at 03:47 UTC" },
        { label: "Post-Login Activity", value: "base64-encoded PowerShell, outbound connection to known C2 IP" },
        { label: "Kill Chain Stage", value: "Initial Access → Execution → Command and Control" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Immediately isolate the VM from the network (NSG deny-all), preserve the disk for forensics, revoke compromised credentials, scan other VMs for the same C2 IP in NSG flow logs, and restrict SSH to JIT access",
          color: "green",
        },
        {
          id: "action-b",
          label: "Block the 12 attacking IP addresses in the NSG and add the C2 IP to the firewall deny list, then continue monitoring",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Reset the SSH password on the VM, restart the SSH service, and close the alert as resolved",
          color: "red",
        },
        {
          id: "action-d",
          label: "Delete the VM and redeploy from a clean image to eliminate any persistence mechanisms",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "This follows incident response best practices for a confirmed compromise: (1) Network isolation (NSG deny-all) stops the active C2 connection and prevents lateral movement. (2) Disk preservation captures forensic evidence (malware, logs, persistence mechanisms) before remediation destroys it. (3) Credential revocation prevents the attacker from re-accessing using stolen credentials. (4) Scanning other VMs for C2 connections identifies potential lateral movement. (5) JIT access prevents future brute-force attacks by closing SSH except during approved maintenance windows.",
        },
        {
          id: "rationale-b",
          text: "Blocking the 12 IPs and C2 IP addresses is reactive whack-a-mole. The attacker already has a successful login session — blocking their previous IPs does not terminate the active session or remove installed malware. Attackers use rotating IPs; blocking specific addresses provides no protection against the next attack from different IPs.",
        },
        {
          id: "rationale-c",
          text: "Resetting the SSH password does not address the compromise. The attacker likely installed persistence mechanisms (cron jobs, SSH keys, backdoor processes) during their active session. Restarting SSH does not terminate running malicious processes. Closing the alert without forensics means the compromise continues undetected.",
        },
        {
          id: "rationale-d",
          text: "Deleting the VM eliminates the threat but destroys all forensic evidence — you cannot determine what data was exfiltrated, what credentials were stolen, or whether the attacker pivoted to other systems. Preserve the disk first, then redeploy from a clean image. Deleting without forensics leaves critical questions unanswered.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Isolate, preserve, revoke, scan, and harden — the standard incident response sequence for a confirmed VM compromise with active C2 communication.",
        partial:
          "Deleting and redeploying removes the threat but destroys forensic evidence needed to understand the scope of the compromise and whether lateral movement occurred.",
        wrong:
          "Resetting passwords on a compromised VM without isolation or forensics allows the attacker to maintain access through installed persistence mechanisms. Blocking specific IPs does not stop an active session.",
      },
    },
  ],
  hints: [
    "Defender plan selection should be based on actual risk exposure — prioritize plans for resource types with confirmed vulnerabilities or active threats rather than enabling everything uniformly.",
    "Secure score recommendations show the point impact of each fix — prioritize high-impact, low-effort recommendations first to maximize score improvement within time and resource constraints.",
    "When a Defender alert shows progression through multiple kill chain stages (Initial Access → Execution → C2), treat it as a confirmed compromise requiring immediate isolation, forensics, and credential revocation.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Microsoft Defender for Cloud is the central security posture management and threat protection platform for Azure. Engineers who can configure plans strategically, prioritize recommendations by impact, and respond to alerts following incident response procedures are invaluable to any security-conscious organization.",
  toolRelevance: ["Azure Portal", "Microsoft Defender for Cloud", "Azure Monitor", "Log Analytics", "Azure CLI", "Microsoft Sentinel"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
