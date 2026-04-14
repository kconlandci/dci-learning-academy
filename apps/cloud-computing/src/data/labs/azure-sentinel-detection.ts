import type { LabManifest } from "../../types/manifest"

export const azureSentinelDetectionLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-sentinel-detection",
  version: 1,
  title: "Microsoft Sentinel Detection Rules",
  tier: "advanced",
  track: "azure-fundamentals",
  difficulty: "challenging",
  accessLevel: "free",
  status: "published",
  sortOrder: 220,
  rendererType: "action-rationale",
  description:
    "Master the creation and configuration of detection rules in Microsoft Sentinel, Azure's cloud-native SIEM and SOAR platform. Learn to select appropriate rule types, craft effective KQL queries for threat detection, and orchestrate automated incident response using Logic Apps playbooks.",
  estimatedMinutes: 12,
  tags: ["microsoft-sentinel", "azure-siem", "detection-rules", "kql", "logic-apps", "soar", "threat-detection", "incident-response"],
  learningObjectives: [
    "Differentiate between Sentinel analytics rule types and select the appropriate one for a given detection scenario",
    "Construct KQL queries that identify suspicious sign-in patterns with minimal false positives",
    "Configure automated response playbooks using Logic Apps to accelerate incident triage",
    "Apply best practices for detection rule tuning and alert fatigue reduction"
  ],
  careerInsight:
    "Security Operations Center (SOC) analysts and cloud security engineers who can build and tune Sentinel detection rules are in high demand. Organizations migrating to Azure need professionals who can translate on-premises SIEM logic into cloud-native analytics rules, with median salaries for Azure security specialists exceeding $140,000 in 2026.",
  toolRelevance: [
    "Microsoft Sentinel is Azure's cloud-native SIEM/SOAR solution used by thousands of enterprises worldwide. Proficiency with its analytics rules engine, KQL query language, and Logic Apps automation directly translates to day-to-day SOC operations and is tested in the SC-200 Microsoft Security Operations Analyst certification."
  ],
  prerequisites: [],
  scenarios: [
    {
      type: "action-rationale",
      id: "sentinel-rule-type",
      title: "Choosing the Right Detection Rule Type",
      context:
        "You are a SOC analyst at a financial services company that recently deployed Microsoft Sentinel. The threat intelligence team has identified a new campaign where attackers perform brute-force attacks against Azure AD accounts, wait 24-48 hours, then exfiltrate data via compromised mailboxes. You need to create a detection rule that correlates failed sign-in bursts with subsequent suspicious mailbox activity within a 48-hour window. Which Microsoft Sentinel analytics rule type is most appropriate for detecting this multi-stage attack pattern that correlates events across a defined time window?",
      displayFields: [],
      actions: [
        {
          id: "action-scheduled",
          label:
            "Create a Scheduled analytics rule with a 48-hour lookback period and custom KQL that joins SigninLogs with OfficeActivity tables using a time-windowed correlation",
          color: "green"
        },
        {
          id: "action-nrt",
          label:
            "Create a Near-Real-Time (NRT) analytics rule to detect the brute-force attempts as they happen and trigger an immediate alert for each failed sign-in burst",
          color: "yellow"
        },
        {
          id: "action-fusion",
          label:
            "Rely on the built-in Fusion rule engine to automatically detect and correlate the multi-stage attack without any custom configuration",
          color: "orange"
        },
        {
          id: "action-ms-security",
          label:
            "Create a Microsoft Security analytics rule that imports alerts from Microsoft Defender for Cloud Apps and Defender for Identity to cover both stages",
          color: "red"
        }
      ],
      correctActionId: "action-scheduled",
      rationales: [
        {
          id: "rationale-custom-correlation",
          text: "Scheduled rules allow you to write custom KQL that correlates events across multiple data sources and time windows. By joining SigninLogs and OfficeActivity with a time-bounded let statement, you can precisely define the 48-hour correlation window, apply thresholds for failed sign-ins, and filter for specific mailbox forwarding or delegation changes that indicate exfiltration."
        },
        {
          id: "rationale-nrt-limitation",
          text: "NRT rules are designed for low-latency detection on a single table with a lookback of up to 14 minutes. They cannot perform cross-table joins or correlate events over a 48-hour window, making them unsuitable for multi-stage attack detection that spans days."
        },
        {
          id: "rationale-fusion-scope",
          text: "While Fusion uses ML to correlate multi-stage attacks, it operates on predefined attack patterns from Microsoft's threat research. It may eventually detect this pattern, but you cannot customize its correlation logic or guarantee it covers this specific campaign's TTPs without a custom rule as a backstop."
        },
        {
          id: "rationale-ms-security-passthrough",
          text: "Microsoft Security rules are pass-through rules that import alerts from other Microsoft security products. They do not perform custom correlation logic and would only surface individual alerts from each product rather than correlating the brute-force and exfiltration stages into a single incident."
        }
      ],
      correctRationaleId: "rationale-custom-correlation",
      feedback: {
        perfect:
          "Excellent. Scheduled analytics rules are the correct choice for multi-stage attack detection requiring cross-table KQL correlation over defined time windows. This gives you full control over join logic, lookback periods, and alert grouping to produce high-fidelity incidents.",
        partial:
          "You identified a valid detection mechanism, but it does not fully address the requirement. NRT rules lack cross-table correlation and Fusion cannot be customized for specific campaign TTPs. A Scheduled rule with custom KQL provides the precise correlation logic needed.",
        wrong:
          "Microsoft Security rules are pass-through alert importers from other Defender products. They cannot perform the custom cross-table, time-windowed correlation required to detect this multi-stage attack pattern spanning brute-force sign-ins and mailbox exfiltration."
      },
    },
    {
      type: "action-rationale",
      id: "sentinel-kql-query",
      title: "Crafting an Effective KQL Detection Query",
      context:
        "Your Sentinel workspace is ingesting Azure AD SigninLogs and you need to write a KQL detection query for suspicious sign-in patterns. Specifically, you must detect accounts that have more than 15 failed sign-ins from 3 or more distinct IP addresses within a 10-minute window, followed by a successful sign-in from a new IP address not seen in the account's 30-day sign-in history. The rule must be efficient and avoid false positives from legitimate password reset scenarios. Which KQL query approach will most accurately and efficiently detect this suspicious sign-in pattern while minimizing false positives?",
      displayFields: [],
      actions: [
        {
          id: "action-kql-optimized",
          label:
            "Use a let statement to define the 30-day baseline of known IPs per user, then summarize failed sign-ins by user with dcount(IPAddress) >= 3 and count() >= 15 in a 10-minute bin, join with successful sign-ins where the IP is not in the baseline set, and exclude ResultType 50140 (password reset flow)",
          color: "green"
        },
        {
          id: "action-kql-simple",
          label:
            "Query SigninLogs where ResultType != 0 and use summarize count() by UserPrincipalName with a threshold of 15, then check if any subsequent sign-in succeeded from any IP address",
          color: "orange"
        },
        {
          id: "action-kql-realtime",
          label:
            "Use a series_decompose_anomalies() function on the sign-in time series data to detect anomalous spikes in authentication failures, then alert on any anomaly score above the default threshold",
          color: "yellow"
        },
        {
          id: "action-kql-watchlist",
          label:
            "Create a Sentinel Watchlist of known malicious IP addresses and join SigninLogs against the watchlist to detect sign-ins from threat intelligence-flagged sources",
          color: "red"
        }
      ],
      correctActionId: "action-kql-optimized",
      rationales: [
        {
          id: "rationale-optimized-approach",
          text: "This approach uses a let statement to precompute each user's 30-day IP baseline, then applies bin(TimeGenerated, 10m) with dcount and count aggregations to precisely identify brute-force windows. The anti-join against the baseline ensures only truly new IPs trigger alerts, and excluding ResultType 50140 filters out legitimate self-service password reset flows that commonly generate failed sign-in bursts."
        },
        {
          id: "rationale-simple-flaws",
          text: "This simplified query fails to enforce the 10-minute time window, does not check for distinct IP address count, and does not verify the successful sign-in comes from a previously unseen IP. It would generate excessive false positives from users who accumulate 15 failures over days or from legitimate MFA retry patterns."
        },
        {
          id: "rationale-anomaly-mismatch",
          text: "Time series anomaly detection is useful for identifying unusual volume patterns but does not enforce the specific thresholds (15 failures, 3 IPs, 10-minute window) required by this detection logic. It would produce probabilistic alerts rather than deterministic matches and cannot check for the subsequent successful sign-in from a new IP."
        },
        {
          id: "rationale-watchlist-mismatch",
          text: "A watchlist-based approach only detects sign-ins from known malicious IPs. Brute-force attackers frequently use residential proxies, VPNs, or compromised infrastructure that is not yet cataloged in threat intelligence feeds. This approach would miss the behavioral pattern entirely and only catch a subset of threats."
        }
      ],
      correctRationaleId: "rationale-optimized-approach",
      feedback: {
        perfect:
          "Exactly right. The optimized KQL approach with let-based baseline computation, precise time-binned aggregation, anti-join for new IP detection, and ResultType exclusion produces a high-fidelity detection with minimal false positives. This is the standard pattern for behavioral sign-in anomaly rules in production Sentinel deployments.",
        partial:
          "Your approach addresses part of the detection requirement but misses critical precision elements. Without enforcing all three conditions (failure count, distinct IPs, time window) plus the new-IP and password-reset-exclusion logic, the rule will generate significant false positive volume in production.",
        wrong:
          "Watchlist-based detection relies on known-bad indicators and cannot detect the behavioral brute-force pattern described. Attackers routinely use infrastructure not yet in threat intelligence feeds, making this approach insufficient as a primary detection mechanism for this scenario."
      },
    },
    {
      type: "action-rationale",
      id: "sentinel-playbook-config",
      title: "Configuring Automated Response Playbooks",
      context:
        "A new Sentinel analytics rule is generating high-severity incidents for potential ransomware pre-encryption behavior (mass file renames detected via Defender for Endpoint logs). The SOC team wants to automate the initial response: isolate the affected device from the network, disable the compromised user account in Azure AD, collect a forensic investigation package from the endpoint, and notify the incident response team via Microsoft Teams. You need to configure an automated response using a Logic Apps playbook triggered by Sentinel. What is the correct approach to configure the automated response playbook for this high-severity ransomware detection scenario?",
      displayFields: [],
      actions: [
        {
          id: "action-playbook-managed",
          label:
            "Create a Logic Apps playbook with a Sentinel incident trigger, use managed identity with least-privilege RBAC roles, add conditional logic to verify incident severity is High before executing actions, call the MDE API to isolate the device and collect the investigation package, call the Microsoft Graph API to disable the user account, post an adaptive card to Teams with incident details and a manual approval step before isolation, and attach the playbook to the analytics rule's automated response tab",
          color: "green"
        },
        {
          id: "action-playbook-full-auto",
          label:
            "Create a Logic Apps playbook that automatically isolates the device, disables the user, and collects forensics immediately upon incident creation with no approval gates or severity checks, using a service principal with Global Administrator permissions for simplicity",
          color: "red"
        },
        {
          id: "action-playbook-alert-trigger",
          label:
            "Create a Logic Apps playbook using the Sentinel alert trigger instead of the incident trigger, and execute all response actions for every individual alert generated by the rule regardless of whether alerts have been grouped into an incident",
          color: "orange"
        },
        {
          id: "action-automation-rule-only",
          label:
            "Configure a Sentinel automation rule to change incident severity and assign an owner, then rely on the SOC team to manually execute the isolation, account disable, forensic collection, and Teams notification steps from their runbook documentation",
          color: "yellow"
        }
      ],
      correctActionId: "action-playbook-managed",
      rationales: [
        {
          id: "rationale-managed-identity-best",
          text: "Using a managed identity with least-privilege RBAC follows Zero Trust principles and avoids credential management overhead. The incident trigger ensures the playbook operates on correlated, deduplicated incidents rather than individual alerts. Conditional severity checking prevents the playbook from executing on incidents that may have been downgraded. The manual approval step before device isolation balances speed with human oversight for a destructive action, while automated forensic collection and Teams notification proceed without delay."
        },
        {
          id: "rationale-full-auto-risk",
          text: "Fully automated isolation without approval gates creates serious operational risk. A false positive could isolate a production-critical server or disable an executive's account during a business-critical operation. Using Global Administrator permissions violates least-privilege principles and creates an over-privileged service principal that itself becomes a high-value attack target."
        },
        {
          id: "rationale-alert-trigger-issue",
          text: "Using the alert trigger instead of the incident trigger means the playbook executes for every individual alert before Sentinel correlates and deduplicates them into incidents. This could trigger multiple isolations and account disables for the same device and user, and misses the enriched incident context (entities, timeline, related alerts) that the incident trigger provides."
        },
        {
          id: "rationale-manual-delay",
          text: "Relying on manual execution from a runbook introduces critical delay in ransomware response where every minute matters. While automation rules can change metadata, they cannot execute the complex multi-step response actions (API calls, conditional logic, approvals) that a Logic Apps playbook provides. This approach sacrifices the speed advantage of SOAR automation."
        }
      ],
      correctRationaleId: "rationale-managed-identity-best",
      feedback: {
        perfect:
          "Outstanding. This approach follows Microsoft's recommended SOAR pattern: incident-triggered playbooks with managed identity authentication, least-privilege RBAC, severity validation, human-in-the-loop approval for destructive actions like device isolation, and parallel automated actions for non-destructive steps like forensic collection and team notification.",
        partial:
          "Your approach includes some valid response elements but either introduces unnecessary risk through missing approval gates, creates duplicate actions via the wrong trigger type, or sacrifices automation speed. The recommended pattern balances automated response with human oversight for destructive actions.",
        wrong:
          "Full automation with Global Administrator permissions and no approval gates is a critical anti-pattern. It violates least-privilege principles, creates an over-privileged attack surface, and risks significant business disruption from false positives in a production environment."
      },
    }
  ],
  hints: [
    "Scheduled analytics rules give you full KQL control for cross-table correlation over custom time windows — consider this when detection requires joining multiple log sources.",
    "In KQL detection queries, use let statements to precompute baselines and bin() with summarize for time-windowed aggregation to build efficient, low-false-positive detections.",
    "For SOAR playbooks, use managed identities with least-privilege RBAC and add human approval gates before destructive actions like device isolation.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: {
      perfect: 0,
      partial: 10,
      wrong: 20
    },
    passingThresholds: {
      pass: 80,
      partial: 50
    }
  },
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28"
}
