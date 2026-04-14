import type { LabManifest } from "../../types/manifest";

export const azureAdConditionalLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-ad-conditional",
  version: 1,
  title: "Azure AD Conditional Access Policies",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["azure", "entra-id", "conditional-access", "mfa", "security", "zero-trust"],
  description:
    "Configure Azure Active Directory Conditional Access policies to enforce the right security controls for different user scenarios without disrupting legitimate access.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify the correct grant controls (MFA, compliant device, block) for specific access scenarios",
    "Configure session controls that limit risk without preventing productivity",
    "Understand the interaction between named locations, risk policies, and Conditional Access",
  ],
  sortOrder: 202,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "scenario-1",
      title: "Baseline Conditional Access Policy — All Users",
      description:
        "Your organization is rolling out a baseline Conditional Access policy in report-only mode first, then enforcing it. Configure each policy toggle to meet the security requirements: require MFA for all users accessing cloud apps, block legacy authentication, and exclude break-glass accounts.",
      targetSystem: "Azure AD > Security > Conditional Access > New Policy",
      items: [
        {
          id: "item-policy-state",
          label: "Policy State",
          detail:
            "The security team wants to observe the impact of the policy for 2 weeks before enforcement. Some legitimate users may be blocked if the policy is misconfigured.",
          currentState: "on",
          correctState: "report-only",
          states: ["on", "off", "report-only"],
          rationaleId: "rationale-report-only",
        },
        {
          id: "item-legacy-auth",
          label: "Block Legacy Authentication Protocols (Exchange ActiveSync, IMAP, POP3)",
          detail:
            "Legacy authentication protocols do not support modern MFA challenges and account for over 99% of password spray attacks according to Microsoft telemetry.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-legacy",
        },
        {
          id: "item-breakglass",
          label: "Exclude Break-Glass Emergency Accounts from Policy",
          detail:
            "Break-glass accounts are used only in emergencies when all admin access is lost (e.g., MFA provider outage). If the CA policy blocks these accounts, the organization could be permanently locked out.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-breakglass",
        },
        {
          id: "item-grant-mfa",
          label: "Grant Control: Require Multi-Factor Authentication",
          detail:
            "The policy objective is to ensure every sign-in to cloud apps is challenged with MFA regardless of location or device.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-mfa",
        },
      ],
      rationales: [
        {
          id: "rationale-report-only",
          text: "Report-only mode logs what the policy would have done without actually blocking or granting access. This is the correct first step before enforcement — it lets you identify affected users and fix misconfigurations without causing an incident.",
        },
        {
          id: "rationale-legacy",
          text: "Blocking legacy authentication is one of the single highest-impact security controls available. Legacy protocols cannot respond to MFA challenges, so any attacker who obtains credentials can bypass MFA entirely via these protocols. This toggle must be enabled.",
        },
        {
          id: "rationale-breakglass",
          text: "Break-glass accounts must always be excluded from all Conditional Access policies. They exist precisely for scenarios where CA enforcement has broken legitimate access. Locking them out could result in complete tenant lockout requiring Microsoft support intervention.",
        },
        {
          id: "rationale-mfa",
          text: "Requiring MFA is the primary grant control of this policy. Without this enabled, the policy has no enforcement effect and provides no security value. This must be enabled to achieve the stated objective.",
        },
      ],
      feedback: {
        perfect:
          "Perfect Conditional Access configuration. The policy is correctly set to report-only for safe rollout, blocks legacy auth, protects break-glass accounts, and enforces MFA.",
        partial:
          "The policy is partially configured but missing critical elements. A policy without break-glass exclusions risks tenant lockout; one without MFA requirement has no security value.",
        wrong:
          "Critical misconfigurations detected. Review the purpose of report-only mode and the mandatory break-glass account exclusion before enforcing any CA policy.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-2",
      title: "High-Risk Sign-In Response Policy",
      description:
        "Configure a Conditional Access policy targeting high-risk sign-ins detected by Azure AD Identity Protection. The policy should require password change for high-risk users and block access for sign-ins detected as high risk, while allowing medium-risk sign-ins with MFA.",
      targetSystem: "Azure AD > Security > Conditional Access > Identity Protection Integration",
      items: [
        {
          id: "item-user-risk-high",
          label: "User Risk: HIGH — Require Password Change",
          detail:
            "When a user's account is flagged as high risk (e.g., credentials found in breach data), forcing a password change remediates the compromised credential before attackers can use it.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-user-risk",
        },
        {
          id: "item-sign-in-risk-high",
          label: "Sign-In Risk: HIGH — Block Access",
          detail:
            "A high-risk sign-in (e.g., impossible travel, anonymous IP, malware-linked IP) indicates the sign-in is almost certainly fraudulent. MFA alone is insufficient — the session should be blocked outright.",
          currentState: "mfa-only",
          correctState: "block",
          states: ["block", "mfa-only", "allow"],
          rationaleId: "rationale-signin-block",
        },
        {
          id: "item-sign-in-risk-medium",
          label: "Sign-In Risk: MEDIUM — Require MFA",
          detail:
            "Medium-risk sign-ins are suspicious but not conclusive. MFA challenge allows legitimate users to prove identity while stopping attackers who only have the password.",
          currentState: "block",
          correctState: "mfa-only",
          states: ["block", "mfa-only", "allow"],
          rationaleId: "rationale-medium-mfa",
        },
        {
          id: "item-persistent-browser",
          label: "Session Control: Disable Persistent Browser Session for Risky Sign-Ins",
          detail:
            "Persistent browser sessions allow users to stay signed in after closing the browser. For risky sign-ins, this would allow an attacker who passes MFA to maintain a long-lived session.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-persistent",
        },
      ],
      rationales: [
        {
          id: "rationale-user-risk",
          text: "High user risk means Azure AD Identity Protection has high confidence that the account's credentials are compromised. Requiring password change forces the user to create new credentials, invalidating any stolen ones. This is the standard Microsoft-recommended remediation.",
        },
        {
          id: "rationale-signin-block",
          text: "High sign-in risk means the specific sign-in event has strong signals of being fraudulent (impossible travel, threat intel match). Even if the attacker has an MFA device (e.g., SIM swap), they should be blocked. MFA alone is insufficient at this risk level.",
        },
        {
          id: "rationale-medium-mfa",
          text: "Medium risk is ambiguous — it could be a legitimate user in an unusual location or a real attack. MFA provides a proportionate response: it stops password-only attacks while allowing legitimate users who can complete MFA to proceed.",
        },
        {
          id: "rationale-persistent",
          text: "Disabling persistent browser sessions for risky sign-ins ensures that even if an attacker passes MFA once, they cannot maintain an indefinite session. It forces re-authentication on each new browser session, limiting the window of unauthorized access.",
        },
      ],
      feedback: {
        perfect:
          "Correct risk-based policy. You've applied proportionate controls — block for high-confidence attacks, MFA for uncertain cases, and session limits to reduce dwell time.",
        partial:
          "The risk levels are partially handled but the response proportionality is off. Blocking medium-risk users causes unnecessary friction; only MFA-challenging high-risk sign-ins lets attackers through.",
        wrong:
          "The configuration leaves the organization exposed. High-risk sign-ins that are almost certainly fraudulent must be blocked, not just MFA-challenged.",
      },
    },
    {
      type: "toggle-config",
      id: "scenario-3",
      title: "Device Compliance Policy for Corporate Data",
      description:
        "A healthcare organization needs to ensure that access to Microsoft 365 apps containing PHI (Protected Health Information) is only possible from compliant, Intune-managed devices. Configure the policy correctly.",
      targetSystem: "Azure AD > Conditional Access + Microsoft Intune",
      items: [
        {
          id: "item-compliant-device",
          label: "Grant Control: Require Device to be Marked as Compliant (Intune)",
          detail:
            "Only devices enrolled in Intune and passing all compliance policies (encrypted disk, PIN enforced, OS up-to-date) should access PHI. Personal devices, even with MFA, should be blocked.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-compliant",
        },
        {
          id: "item-app-restriction",
          label: "Session Control: Use Conditional Access App Control (proxy via MCAS)",
          detail:
            "For unmanaged devices that slip through, Microsoft Defender for Cloud Apps can enforce download restrictions to prevent PHI from being saved to personal devices.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-mcas",
        },
        {
          id: "item-hybrid-join",
          label: "Grant Control: Also Allow Hybrid Azure AD Joined Devices (OR condition)",
          detail:
            "The organization has on-premises domain-joined workstations that are hybrid-joined to Azure AD. These are managed by Group Policy and considered equally trusted to Intune-managed devices.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-hybrid",
        },
        {
          id: "item-sign-in-freq",
          label: "Session Control: Sign-in Frequency — Every 1 hour",
          detail:
            "HIPAA guidance recommends short session timeouts for systems with PHI access. Re-authentication every 1 hour limits the exposure window from unattended workstations.",
          currentState: "disabled",
          correctState: "enabled",
          states: ["enabled", "disabled"],
          rationaleId: "rationale-freq",
        },
      ],
      rationales: [
        {
          id: "rationale-compliant",
          text: "Requiring Intune device compliance is the primary control for PHI access. It ensures that only devices with full disk encryption, current OS patches, and enforced PIN/password policies can access sensitive healthcare data — a direct HIPAA safeguard requirement.",
        },
        {
          id: "rationale-mcas",
          text: "Conditional Access App Control via Microsoft Defender for Cloud Apps adds a download-blocking layer for any access that bypasses device compliance checks. Even if a user accesses PHI on a non-compliant device, App Control can prevent downloading or copying the data.",
        },
        {
          id: "rationale-hybrid",
          text: "Hybrid Azure AD joined devices are managed via on-premises Group Policy and are a legitimate trust anchor. Excluding them would block a large portion of the workforce on their corporate workstations. The OR condition (compliant OR hybrid-joined) correctly covers both device management paths.",
        },
        {
          id: "rationale-freq",
          text: "Short re-authentication intervals (1 hour) directly address the risk of unattended workstations in clinical environments where clinicians frequently step away from shared machines. This is a HIPAA-aligned control for automatic logoff.",
        },
      ],
      feedback: {
        perfect:
          "All controls correctly configured. The policy enforces device trust, covers both Intune and hybrid-joined devices, adds app-level data controls, and enforces frequent re-authentication.",
        partial:
          "Core device compliance is configured but you missed controls that close important gaps — either unmanaged device data exfiltration or unattended workstation access.",
        wrong:
          "The policy as configured does not adequately protect PHI. Device compliance and session controls are both required for HIPAA-aligned healthcare scenarios.",
      },
    },
  ],
  hints: [
    "Always deploy new Conditional Access policies in Report-Only mode first — it lets you see who would have been blocked without actually causing an outage.",
    "Break-glass emergency accounts must be excluded from every Conditional Access policy, no exceptions — losing access to these accounts can lock your entire organization out of Azure AD.",
    "For high sign-in risk, block is stronger than MFA — an attacker who has stolen credentials and completed a SIM swap can pass MFA, but cannot pass a block.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Conditional Access is the control plane for Zero Trust in Microsoft environments. Every security-focused Azure role — from Identity Architect to Security Engineer — is expected to design and troubleshoot CA policies. Misconfigurations here cause either widespread outages or security breaches, making this a high-stakes skill in production.",
  toolRelevance: ["Azure Portal", "Microsoft Entra Admin Center", "Microsoft Defender for Cloud Apps", "Microsoft Intune"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
