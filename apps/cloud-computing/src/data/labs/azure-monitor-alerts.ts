import type { LabManifest } from "../../types/manifest";

export const azureMonitorAlertsLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-monitor-alerts",
  version: 1,
  title: "Azure Monitor Alert Configuration",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "monitor", "alerts", "metrics", "log-analytics", "action-groups"],
  description:
    "Investigate noisy, missing, or misconfigured Azure Monitor alerts and determine the correct threshold, aggregation, and action group settings.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Distinguish metric alert vs. log alert use cases and configure appropriate thresholds",
    "Identify root causes of alert noise (false positives) vs. missed alerts (false negatives)",
    "Configure action groups with correct notification channels and automation runbooks",
  ],
  sortOrder: 208,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "scenario-1",
      title: "Alert Storm — Why Is Pagerduty Firing Every 5 Minutes?",
      objective:
        "The on-call team is receiving PagerDuty alerts every 5 minutes for 'High CPU on prod-web-vmss'. The alerts fire, the team investigates, CPU is normal by the time they check (averaging 35%), and the alert resolves itself. This has happened 47 times in the last 8 hours. Investigate and find the root cause.",
      investigationData: [
        {
          id: "inv-alert-rule",
          label: "Alert Rule Configuration",
          content:
            "Alert Rule: CPU Percentage > 70%, Aggregation: Maximum, Evaluation Period: 1 minute, Frequency: 1 minute, Severity: Sev1, Auto-resolve: enabled. Action Group: PagerDuty webhook.",
          isCritical: true,
        },
        {
          id: "inv-cpu-chart",
          label: "CPU Metrics Chart — Last 8 Hours",
          content:
            "Azure Monitor Metrics: VMSS CPU Percentage (Maximum aggregation): shows frequent 1-minute spikes to 75–85% followed immediately by drops to 20–40%. Average over 8 hours: 35%. Pattern: spikes appear every 5–8 minutes, last exactly 1 minute.",
          isCritical: true,
        },
        {
          id: "inv-vmss-config",
          label: "VMSS Autoscale Configuration",
          content:
            "VMSS Autoscale: Scale out when CPU (Average) > 70% for 5 minutes; Scale in when CPU (Average) < 25% for 5 minutes. Current instance count: 3. Autoscale logs: no scale events in last 8 hours.",
          isCritical: false,
        },
        {
          id: "inv-workload",
          label: "Application Performance Insights",
          content:
            "Application Insights: Request rate stable at 450 req/min. Response times normal (avg 120ms). No errors. Application health: Green. The CPU spikes don't correlate with traffic spikes.",
        },
        {
          id: "inv-process",
          label: "Process CPU Breakdown (Diagnostics Extension)",
          content:
            "Top CPU processes during spike: Windows Update Service (wuauserv): 68% CPU for 45–60 seconds every 5–8 minutes. This is the 'Check for Updates' background scan. Application processes: stable.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Change alert aggregation from Maximum to Average, extend evaluation period to 5 minutes, and increase CPU threshold to 80%",
        },
        {
          id: "action-b",
          label: "Disable automatic Windows Updates on all VMSS instances to stop the CPU spikes",
        },
        {
          id: "action-c",
          label: "Reduce the alert evaluation frequency to 15 minutes to miss the short spikes",
        },
        {
          id: "action-d",
          label: "Increase VMSS instance count from 3 to 10 to absorb the Windows Update CPU spikes",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The root cause is 'Maximum' aggregation capturing 1-minute spikes from Windows Update background scans. Switching to 'Average' over 5 minutes smooths these out — the average stays at 35% during update scans. Raising the threshold to 80% provides additional margin. The real concern is sustained high CPU (average > 80% for 5 minutes), not brief per-instance maximums from OS maintenance tasks.",
        },
        {
          id: "rationale-b",
          text: "Disabling Windows Updates creates critical security exposure — VMs would miss security patches. The alert is misconfigured, not the patching. Never disable security updates to silence alerts.",
        },
        {
          id: "rationale-c",
          text: "Reducing evaluation frequency to 15 minutes would cause you to miss real CPU incidents that last only 5–10 minutes. This trades alert noise for alert blindness — both are wrong.",
        },
        {
          id: "rationale-d",
          text: "Scaling to 10 instances to handle Windows Update scans on 3 instances is massive over-spending. The application is healthy and there is no real performance problem to solve. Fix the alert, not the infrastructure.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. 'Maximum' aggregation is highly sensitive to brief spikes — switching to 'Average' over a longer window makes alerts reflect real application health, not OS maintenance noise.",
        partial:
          "Your fix reduces noise but either creates security exposure (disabling updates) or creates blind spots (longer evaluation frequency) rather than solving the aggregation mismatch.",
        wrong:
          "The problem is alert misconfiguration, not infrastructure scale. Scaling up VMs to fix a monitoring configuration issue is a classic 'wrong fix' pattern.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-2",
      title: "Missing Alert — Why Didn't We Get Paged During the Outage?",
      objective:
        "A 22-minute outage occurred between 2:14 AM and 2:36 AM. The HTTP 5xx error rate on the API gateway hit 87% during this period. No alerts fired. The on-call engineer was not notified. The team is trying to prevent this from happening again. Investigate why the alert failed to fire.",
      investigationData: [
        {
          id: "inv-alert-rule2",
          label: "Alert Rule for HTTP 5xx Errors",
          content:
            "Alert Rule: HTTP 5xx error rate > 5% (Log Analytics query: requests | where resultCode startswith '5' | summarize count() by bin(timestamp, 5m)). Evaluation: every 5 minutes. Action Group: on-call-email.",
        },
        {
          id: "inv-action-group",
          label: "Action Group Configuration",
          content:
            "Action Group 'on-call-email': Notification type: Email/SMS/Push/Voice. Email: oncall-team@contoso.com. SMS: +1-555-0100. Note: This action group is also used by 14 other alert rules. Last tested: never.",
          isCritical: false,
        },
        {
          id: "inv-log-ingestion",
          label: "Log Analytics Ingestion Latency",
          content:
            "Azure Monitor Diagnostic: Log ingestion latency for Application Insights requests table: average 8–12 minutes during the outage window. Peak latency at 2:18 AM: 18 minutes. This means logs from 2:14 AM didn't appear in Log Analytics until 2:26–2:32 AM.",
          isCritical: true,
        },
        {
          id: "inv-metric-check",
          label: "Azure Monitor Metrics — HTTP 5xx during Outage",
          content:
            "Azure API Management Metrics: Failed requests (5xx): 87% from 2:14–2:36 AM. This metric was available in near-real-time (< 1 minute). No metric-based alert rule exists for this metric.",
          isCritical: true,
        },
        {
          id: "inv-alert-history",
          label: "Alert History",
          content:
            "Alert History: No alerts fired between 2:00 AM and 3:00 AM. The log-based 5xx alert rule evaluated at 2:15, 2:20, 2:25, 2:30 AM — all returned 0 results because the logs hadn't been ingested yet. Alert fired at 2:49 AM (13 minutes after the outage resolved).",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add a metric-based alert on Azure API Management 'Failed requests' metric (> 5% for 1 minute) as the primary alerting signal",
        },
        {
          id: "action-b",
          label: "Increase log ingestion speed by upgrading the Log Analytics workspace SKU",
        },
        {
          id: "action-c",
          label: "Reduce the alert evaluation frequency from 5 minutes to 1 minute",
        },
        {
          id: "action-d",
          label: "Switch from email notification to SMS in the action group for faster delivery",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The root cause is log ingestion latency (8–18 minutes) making the log-based alert fire too late. Azure Monitor metrics are near-real-time (< 1 minute). Adding a metric-based alert on APIM's 'Failed requests' metric provides alerting that fires within 1–2 minutes of the issue, long before logs are ingested. The log alert can remain as a supplementary detection method.",
        },
        {
          id: "rationale-b",
          text: "Log Analytics workspace SKU does not control ingestion latency — it is determined by the ingestion pipeline and data volume, not the workspace tier. There is no SKU upgrade that guarantees < 5 minute ingestion for high-volume logs.",
        },
        {
          id: "rationale-c",
          text: "Reducing evaluation frequency to 1 minute doesn't help because the data isn't in Log Analytics yet — the query returns 0 results at any frequency due to ingestion delay. The problem is data availability, not evaluation frequency.",
        },
        {
          id: "rationale-d",
          text: "The alert never fired at all during the outage — notification channel speed is irrelevant if the alert doesn't trigger. The root cause is a missing real-time signal, not slow notification delivery.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Log ingestion latency is a fundamental limitation of log-based alerts. Metric-based alerts on platform metrics provide near-real-time detection for availability failures.",
        partial:
          "Your fix addresses a peripheral issue but doesn't solve the core problem: the log data simply wasn't available in time for the alert to evaluate correctly.",
        wrong:
          "When an alert never fired, the notification channel is not the problem. Start by checking whether the alert rule had the data it needed to evaluate when the incident occurred.",
      },
    },
    {
      type: "investigate-decide",
      id: "scenario-3",
      title: "Cost Alert — Budget Exceeded Without Notification",
      objective:
        "An Azure subscription exceeded its $50,000 monthly budget by $18,000 before anyone was notified. A budget alert was configured. The finance team wants to understand why the alert didn't fire in time and how to prevent this again.",
      investigationData: [
        {
          id: "inv-budget-config",
          label: "Azure Cost Management Budget Configuration",
          content:
            "Budget: Monthly-Prod-Budget. Amount: $50,000. Reset period: Monthly. Alert thresholds: Actual cost > 100% ($50,000) — email to finance@contoso.com. No forecasted cost alerts configured.",
          isCritical: true,
        },
        {
          id: "inv-spend-pattern",
          label: "Daily Spend Pattern",
          content:
            "Cost analysis: Spend was normal ($1,200–1,500/day) for the first 3 weeks. On day 22, a new compute cluster was deployed by the data science team adding $2,800/day. By day 28, actual cost reached $50,000. Forecasted end-of-month cost at day 22: $72,000.",
          isCritical: true,
        },
        {
          id: "inv-email-delivery",
          label: "Budget Alert Email Delivery",
          content:
            "Email delivery logs: Budget threshold alert sent to finance@contoso.com on day 28 at 11:47 PM. Email confirmed delivered. However, by day 28 the budget was already exceeded — the team received the alert after the fact.",
        },
        {
          id: "inv-actions",
          label: "Budget Action Configuration",
          content:
            "Budget actions: None configured. The budget only sends notifications — it does not take automated action (e.g., stop VMs, deny new deployments) when thresholds are exceeded.",
        },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add forecasted cost thresholds at 80% and 90%, and configure an action group to notify both finance and the DevOps lead when forecasted spend exceeds 90%",
        },
        {
          id: "action-b",
          label: "Reduce the monthly budget to $40,000 so the 100% alert fires earlier",
        },
        {
          id: "action-c",
          label: "Configure a budget action to automatically stop all VMs when actual cost exceeds $50,000",
        },
        {
          id: "action-d",
          label: "Switch to daily budget alerts instead of monthly to detect overruns earlier",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The fundamental problem is alerting only on actual cost at 100% — by that point, the budget is already blown. Forecasted cost alerts (at 80–90%) predict end-of-month spend based on current consumption patterns and fire days before the actual threshold is breached. On day 22, the forecast was already $72,000 — an 80% forecasted alert ($40,000) would have fired 6+ days early, giving the team time to stop the cluster.",
        },
        {
          id: "rationale-b",
          text: "Reducing the budget threshold doesn't improve early warning — it just means the 100% alert fires sooner but still at the actual cost point. The team still learns about overspend after it occurs, just at a lower dollar amount.",
        },
        {
          id: "rationale-c",
          text: "Automatically stopping all VMs in response to budget overrun would cause a production outage. Cost management actions should target specific waste (dev/test VMs, orphaned resources) or send alerts, never automatically stop production workloads.",
        },
        {
          id: "rationale-d",
          text: "Daily budget alerts compare actual daily spend against a daily budget slice. They help detect day-over-day anomalies but don't predict end-of-month totals. Forecasted monthly alerts are more relevant for catching cumulative overruns.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Forecasted cost alerts are the key addition — they predict overspend before it happens rather than confirming it after the fact.",
        partial:
          "Your fix addresses something real but doesn't solve the fundamental timing issue. The goal is to receive warning with enough lead time to act — actual cost alerts at 100% don't provide that.",
        wrong:
          "Automatically stopping production VMs to control cost creates an availability incident. Cost management should inform and enable decisions, not cause outages.",
      },
    },
  ],
  hints: [
    "Use 'Average' aggregation for capacity-based alerts and 'Maximum' for spike detection only when you genuinely need to catch any single-point spike — otherwise Maximum creates alert noise from normal OS maintenance tasks.",
    "Log-based alerts have 5–15 minute ingestion latency — for availability alerting (HTTP errors, response time), use metric-based alerts on platform metrics which are near-real-time.",
    "Azure Cost Management budget alerts on 'actual' cost only fire after the money is spent — add 'forecasted' cost thresholds at 80–90% to get early warning with time to act.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Observability configuration — designing alerts that fire at the right time for the right reasons — is as important as writing the application itself. Alert fatigue from false positives degrades on-call effectiveness; missed alerts during real incidents create customer impact. Mastering Azure Monitor alert design is a high-value skill in any SRE or platform engineering role.",
  toolRelevance: ["Azure Monitor", "Azure Portal", "Log Analytics", "Application Insights", "Azure Cost Management", "PagerDuty"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
