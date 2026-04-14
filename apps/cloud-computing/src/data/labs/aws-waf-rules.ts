import type { LabManifest } from "../../types/manifest";

export const awsWafRulesLab: LabManifest = {
  schemaVersion: "1.1",
  id: "aws-waf-rules",
  version: 1,
  title: "AWS WAF Rule Configuration",
  tier: "intermediate",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "waf", "security", "web-application-firewall", "rate-limiting", "bot-control"],
  description:
    "Configure AWS WAF rule groups, rate-based rules, and bot control managed rules to protect web applications from common attacks while minimizing false positives that block legitimate traffic.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Design WAF rule priority ordering to ensure correct evaluation logic",
    "Configure rate-based rules that stop abuse without blocking legitimate high-traffic clients",
    "Deploy AWS Managed Rules for bot control with appropriate overrides",
    "Troubleshoot WAF rules that are blocking legitimate traffic due to false positives",
  ],
  sortOrder: 118,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "waf-rules-s1",
      title: "Rate Limiting Configuration for API Endpoint",
      context:
        "Your public REST API behind CloudFront + ALB is experiencing a credential stuffing attack on the /api/login endpoint. The attacker is rotating through thousands of IP addresses, each sending 20-30 requests per 5-minute window. Legitimate users send at most 5 login attempts per 5 minutes. You need to rate-limit the login endpoint without affecting other API endpoints that handle 200+ requests per minute from legitimate integrations.",
      displayFields: [
        { label: "Attack Pattern", value: "Credential stuffing — 20-30 req/5min per IP on /login", emphasis: "critical" },
        { label: "Legitimate Login Rate", value: "Max 5 attempts per 5 minutes per user", emphasis: "normal" },
        { label: "Other API Traffic", value: "200+ req/min from legitimate integrations", emphasis: "warn" },
        { label: "Attacker IPs", value: "Thousands of rotating IPs", emphasis: "normal" },
        { label: "Architecture", value: "CloudFront -> ALB -> API", emphasis: "normal" },
      ],
      actions: [
        { id: "scoped-rate-rule", label: "Create a rate-based rule scoped to /api/login URI path with a 100 request/5min threshold per IP", color: "green" },
        { id: "global-rate-rule", label: "Create a global rate-based rule with 100 request/5min threshold across all endpoints", color: "orange" },
        { id: "ip-blocklist", label: "Build an IP set rule blocking all known attacker IPs", color: "red" },
        { id: "geo-block", label: "Block all traffic from countries where attackers originate", color: "red" },
      ],
      correctActionId: "scoped-rate-rule",
      rationales: [
        { id: "r-scoped-rate", text: "A rate-based rule with a scope-down statement matching the /api/login URI path applies rate limiting only to login attempts. The 100/5min threshold (effectively 20/min) blocks the attack pattern while giving legitimate users generous headroom. Other API endpoints are completely unaffected because the scope-down statement excludes them from evaluation." },
        { id: "r-global-rate-breaks-api", text: "A global rate-based rule at 100/5min would block legitimate API integrations that send 200+ requests per minute on non-login endpoints. Rate limiting must be scoped to the specific endpoint under attack to avoid collateral impact." },
        { id: "r-ip-blocklist-futile", text: "The attacker is rotating through thousands of IPs. By the time an IP is identified and added to the blocklist, the attacker has moved on. IP-based blocking is reactive and ineffective against distributed attacks with rotating source IPs." },
        { id: "r-geo-block-collateral", text: "Geo-blocking affects all legitimate users in those countries, not just attackers. Credential stuffing attacks use distributed botnets across many countries — blocking specific countries causes significant collateral damage while the attacker routes through unblocked regions." },
      ],
      correctRationaleId: "r-scoped-rate",
      feedback: {
        perfect: "Correct. A scoped rate-based rule on /api/login precisely targets the attack surface without impacting other endpoints. This is the standard pattern for endpoint-specific rate limiting in AWS WAF.",
        partial: "Global rate limiting stops the attack but also blocks legitimate API integrations on other endpoints. Always scope rate-based rules to the specific URI path under attack.",
        wrong: "IP blocklists are reactive and ineffective against rotating IPs. Geo-blocking causes collateral damage to legitimate users. Scoped rate limiting is the precise, proportional response.",
      },
    },
    {
      type: "action-rationale",
      id: "waf-rules-s2",
      title: "WAF Rule Priority and Evaluation Order",
      context:
        "Your WAF web ACL has three rules: (1) an IP allowlist for your office and monitoring services (Allow action), (2) the AWS Managed Rules Common Rule Set (Block action), and (3) a custom SQL injection detection rule (Block action). Your office monitoring service is being blocked by the Common Rule Set because its health check requests match a rule signature. You need to fix the priority ordering so the allowlist is evaluated first.",
      displayFields: [
        { label: "Rule 1", value: "IP Allowlist — Allow (Priority: 3)", emphasis: "warn" },
        { label: "Rule 2", value: "AWS Common Rule Set — Block (Priority: 1)", emphasis: "critical" },
        { label: "Rule 3", value: "Custom SQLi Detection — Block (Priority: 2)", emphasis: "normal" },
        { label: "Problem", value: "Office monitoring blocked by Common Rule Set before allowlist is evaluated", emphasis: "critical" },
        { label: "WAF Evaluation", value: "Rules evaluated in ascending priority order (lowest number first)", emphasis: "warn" },
      ],
      actions: [
        { id: "reorder-allowlist-first", label: "Change IP Allowlist priority to 1 (lowest) so it evaluates before Block rules", color: "green" },
        { id: "remove-common-ruleset", label: "Remove the AWS Common Rule Set to stop it from blocking the monitoring service", color: "red" },
        { id: "add-monitoring-exception", label: "Add an exception within the Common Rule Set for the specific rule signature matching the health check", color: "yellow" },
        { id: "change-to-count", label: "Change the Common Rule Set action from Block to Count so it logs but never blocks", color: "orange" },
      ],
      correctActionId: "reorder-allowlist-first",
      rationales: [
        { id: "r-reorder-correct", text: "WAF evaluates rules in ascending priority order. Setting the IP Allowlist to priority 1 ensures trusted IPs are evaluated first. When a request matches an Allow rule, WAF immediately allows it and stops evaluating subsequent rules. The monitoring service's requests are allowed before the Common Rule Set can block them." },
        { id: "r-remove-ruleset-dangerous", text: "Removing the Common Rule Set eliminates protection against common web exploits (XSS, path traversal, etc.) for all traffic — not just the monitoring service. This trades a single false positive for broad security vulnerability." },
        { id: "r-exception-works-but-complex", text: "Adding a rule-label exception within the managed rule set is a valid approach but more complex than reordering. It requires identifying the exact rule ID triggering the false positive and maintaining the override across rule set version updates. Priority reordering is simpler when the allowlist already exists." },
        { id: "r-count-mode-no-protection", text: "Switching to Count mode means the Common Rule Set never blocks anything — it only logs. This removes protection for all traffic, not just the monitoring service. Count mode is useful for testing new rules, not for production protection." },
      ],
      correctRationaleId: "r-reorder-correct",
      feedback: {
        perfect: "Correct. Priority reordering is the simplest and most maintainable fix. Allow rules for trusted sources should always have the lowest priority number so they are evaluated first, before any Block rules.",
        partial: "Adding a rule exception within the managed rule set works but is more complex to maintain. When a broad IP allowlist already exists, reordering it to evaluate first is the cleaner solution.",
        wrong: "Removing the Common Rule Set or switching to Count mode eliminates protection for all traffic. The goal is to exempt trusted IPs, not to weaken security for everyone.",
      },
    },
    {
      type: "action-rationale",
      id: "waf-rules-s3",
      title: "Bot Control Managed Rule Group Deployment",
      context:
        "Your e-commerce site is experiencing inventory hoarding — bots are adding limited-edition items to carts and holding them, preventing real customers from purchasing. You want to deploy the AWS WAF Bot Control managed rule group. However, your site uses legitimate bots (Googlebot for SEO, Stripe webhooks, your own internal API clients) that must not be blocked.",
      displayFields: [
        { label: "Attack", value: "Inventory hoarding bots adding items to carts", emphasis: "critical" },
        { label: "Legitimate Bots", value: "Googlebot, Stripe webhooks, internal API clients", emphasis: "warn" },
        { label: "Bot Control Level", value: "Common (included) vs Targeted (additional cost)", emphasis: "normal" },
        { label: "Concern", value: "Blocking Googlebot harms SEO; blocking Stripe breaks payments", emphasis: "critical" },
        { label: "Traffic Volume", value: "2M requests/day, ~15% estimated bot traffic", emphasis: "normal" },
      ],
      actions: [
        { id: "targeted-with-scope-and-labels", label: "Deploy Targeted Bot Control in Count mode first, use label-based rules to Allow verified bots and Block only on /cart and /checkout paths", color: "green" },
        { id: "common-block-all-bots", label: "Deploy Common Bot Control with Block action for all detected bot categories", color: "orange" },
        { id: "captcha-all-traffic", label: "Add a CAPTCHA challenge to all pages to filter out all bots", color: "red" },
        { id: "targeted-block-immediately", label: "Deploy Targeted Bot Control with immediate Block action across all endpoints", color: "orange" },
      ],
      correctActionId: "targeted-with-scope-and-labels",
      rationales: [
        { id: "r-targeted-labels-correct", text: "Targeted Bot Control detects sophisticated bots that evade Common detection. Deploying in Count mode first generates labels without blocking, letting you verify that Googlebot and Stripe are correctly labeled as 'verified_bot'. Then, label-based rules Allow verified bots and Block unverified bot traffic only on /cart and /checkout — precisely targeting inventory hoarding without affecting SEO crawling or payment webhooks." },
        { id: "r-common-blocks-legitimate", text: "Common Bot Control categorizes all bots but does not distinguish between verified bots (Googlebot) and malicious bots by default. A blanket Block on all bot categories blocks Googlebot (harming SEO rankings) and potentially Stripe webhooks (breaking payment confirmations)." },
        { id: "r-captcha-kills-conversion", text: "CAPTCHA on all pages creates friction for every human user, reducing conversion rates. It also blocks all legitimate bot traffic including search engine crawlers. CAPTCHA should be a targeted response on specific high-risk endpoints, not a blanket measure." },
        { id: "r-targeted-immediate-risky", text: "Deploying Targeted Bot Control with immediate Block action risks blocking legitimate bot traffic before you can verify the detection labels. A Count-mode deployment phase is essential to validate that verified bots are correctly categorized before enabling enforcement." },
      ],
      correctRationaleId: "r-targeted-labels-correct",
      feedback: {
        perfect: "Correct. The phased approach — Targeted Bot Control in Count mode, verify labels, then enforce with scope-down and label-based allowlisting — protects against inventory hoarding while preserving SEO and payment integrations.",
        partial: "Immediate Block deployment is directionally correct but skipping the Count-mode validation phase risks blocking Googlebot or Stripe. Always validate bot detection labels before enforcing Block actions.",
        wrong: "Blanket CAPTCHA or blanket bot blocking causes more business damage than the bots themselves. Targeted, label-aware enforcement on specific endpoints is the proportional response.",
      },
    },
  ],
  hints: [
    "WAF rules are evaluated in ascending priority order (lowest number first). Allow rules for trusted IPs should always have the lowest priority to ensure they are evaluated before Block rules.",
    "Rate-based rules support scope-down statements that restrict evaluation to specific URI paths, headers, or query strings. Always scope rate limits to the targeted endpoint to avoid collateral impact.",
    "Deploy new WAF managed rule groups in Count mode first. Inspect the generated labels and sampled requests to validate detection accuracy before switching to Block mode.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "WAF configuration is a critical skill that sits at the intersection of security and application reliability. Engineers who can deploy WAF rules that stop attacks without creating false positives are invaluable — poorly configured WAF rules that block legitimate traffic or payment webhooks can cause more revenue loss than the attacks they are trying to prevent.",
  toolRelevance: ["AWS WAF Console", "AWS WAF Logs", "CloudWatch Metrics", "AWS Managed Rules", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
