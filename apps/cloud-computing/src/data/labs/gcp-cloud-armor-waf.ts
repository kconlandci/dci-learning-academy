import type { LabManifest } from "../../types/manifest";

export const gcpCloudArmorWafLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-cloud-armor-waf",
  version: 1,
  title: "Cloud Armor WAF and DDoS Protection",
  tier: "intermediate",
  track: "gcp-essentials",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["gcp", "cloud-armor", "waf", "ddos", "security-policy", "load-balancing", "owasp"],
  description:
    "Configure Google Cloud Armor security policies to protect web applications behind a global HTTP(S) load balancer. Practice writing WAF rules, tuning preconfigured OWASP ModSecurity rulesets, and applying adaptive DDoS protection to mitigate volumetric and application-layer attacks.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Configure Cloud Armor security policies with priority-ordered rules",
    "Apply preconfigured WAF rules based on OWASP Top 10 threat categories",
    "Distinguish between rate-based rules and signature-based rules for different attack vectors",
    "Enable Adaptive Protection for ML-based anomaly detection against L7 DDoS",
  ],
  sortOrder: 313,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "armor-s1-sqli-protection",
      title: "SQL Injection Attempts Hitting Public API",
      context:
        "Your team operates a public-facing REST API behind a GCP global HTTP(S) load balancer. Cloud Logging shows a spike in 500 errors originating from a single /24 subnet. Inspection reveals SQL injection payloads in query parameters targeting the /api/search endpoint. The backend Cloud SQL database has not been compromised yet, but the application is returning unhandled errors.",
      displayFields: [
        { label: "Load Balancer", value: "Global HTTP(S) LB — prod-api-lb", emphasis: "normal" },
        { label: "Attack Vector", value: "SQL injection via query parameters on /api/search", emphasis: "critical" },
        { label: "Source", value: "203.0.113.0/24 — 4,200 requests/min", emphasis: "warn" },
        { label: "Backend Impact", value: "500 errors spiking, no data breach confirmed", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Block the /24 source IP range with a deny rule at priority 1000", color: "yellow" },
        { id: "a2", label: "Enable the preconfigured WAF rule sqli-v33-stable at an appropriate priority and set action to deny(403)", color: "green" },
        { id: "a3", label: "Add a rate-limiting rule to throttle all traffic to /api/search to 100 req/min per IP", color: "orange" },
        { id: "a4", label: "Disable the /api/search endpoint at the application layer until the attack stops", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "IP-based blocking stops the current attacker but SQL injection can come from any source. The preconfigured WAF ruleset inspects request content regardless of source IP." },
        { id: "r2", text: "The sqli-v33-stable preconfigured rule evaluates request parameters against known SQL injection signatures from the OWASP ModSecurity Core Rule Set, blocking malicious payloads from any source IP." },
        { id: "r3", text: "Rate limiting reduces volume but does not inspect payload content — a slow, low-rate SQL injection attack would bypass rate limits entirely." },
        { id: "r4", text: "Disabling the endpoint causes a service outage for legitimate users and is a disproportionate response when WAF rules can surgically filter malicious requests." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Cloud Armor's preconfigured WAF rules inspect request content against OWASP signatures, blocking SQL injection from any source without impacting legitimate traffic.",
        partial: "You're mitigating the immediate attack but not the vulnerability class. IP blocking or rate limiting won't catch SQLi payloads from new sources or at low rates.",
        wrong: "This approach either causes unnecessary downtime or fails to address the actual attack vector. Content-based WAF rules are the correct defense against injection attacks.",
      },
    },
    {
      type: "action-rationale",
      id: "armor-s2-l7-ddos",
      title: "Application-Layer DDoS Against Login Page",
      context:
        "Your e-commerce site is experiencing a sustained Layer 7 DDoS attack. Attackers are sending legitimate-looking POST requests to /auth/login at 85,000 requests per second from a globally distributed botnet spanning 12,000 unique IPs. Cloud Armor's standard rules are in place but the attack traffic looks like normal login attempts. Backend authentication services are overwhelmed.",
      displayFields: [
        { label: "Attack Type", value: "HTTP flood — L7 DDoS via POST /auth/login", emphasis: "critical" },
        { label: "Volume", value: "85,000 req/s from 12,000 unique IPs", emphasis: "critical" },
        { label: "Traffic Pattern", value: "Mimics legitimate login attempts — valid headers and payloads", emphasis: "warn" },
        { label: "Backend Status", value: "Auth service at 100% CPU, response times > 30s", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Enable Cloud Armor Adaptive Protection and apply the auto-generated signature rule it recommends", color: "green" },
        { id: "a2", label: "Block all POST requests to /auth/login temporarily", color: "red" },
        { id: "a3", label: "Add a rate-limit rule of 10 requests per minute per IP for the /auth/login path", color: "yellow" },
        { id: "a4", label: "Scale up the backend authentication service to handle 85,000 req/s", color: "orange" },
      ],
      correctActionId: "a1",
      rationales: [
        { id: "r1", text: "Adaptive Protection uses ML to baseline normal traffic patterns and detect anomalies. It auto-generates a targeted signature rule that blocks botnet traffic while allowing legitimate users — ideal for distributed L7 attacks." },
        { id: "r2", text: "Blocking all POST requests to the login endpoint denies service to every legitimate user trying to sign in, which is exactly the attacker's goal." },
        { id: "r3", text: "Per-IP rate limiting at 10 req/min across 12,000 IPs still allows 120,000 requests per minute through. Distributed botnets are specifically designed to evade per-IP rate limits." },
        { id: "r4", text: "Scaling to absorb 85,000 req/s of attack traffic is prohibitively expensive and rewards the attacker — the cost of defense would far exceed the cost of attack." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Adaptive Protection uses machine learning to detect anomalous traffic patterns that signature rules miss, and auto-generates targeted rules for distributed L7 attacks.",
        partial: "Rate limiting helps but doesn't solve the distributed botnet problem. 12,000 IPs each sending a few requests per minute still overwhelms the backend.",
        wrong: "This approach either causes self-inflicted downtime or is economically unsustainable. Adaptive Protection is purpose-built for sophisticated L7 DDoS mitigation.",
      },
    },
    {
      type: "action-rationale",
      id: "armor-s3-geo-compliance",
      title: "Geo-Restriction for Regulatory Compliance",
      context:
        "Your fintech application processes payment card data and must comply with PCI DSS and local financial regulations. The compliance team requires that the application only accept traffic from approved countries (US, CA, GB, DE, FR). Cloud Armor must enforce this at the edge before traffic reaches your backend. You also need to allow a partner API integration from a Singapore-based payment processor.",
      displayFields: [
        { label: "Compliance", value: "PCI DSS + regional financial regulations", emphasis: "warn" },
        { label: "Allowed Countries", value: "US, CA, GB, DE, FR", emphasis: "normal" },
        { label: "Exception", value: "Partner API from Singapore (static IP 52.77.x.x/32)", emphasis: "normal" },
        { label: "Default Policy", value: "Must deny all other origins", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Create a deny rule for each non-approved country individually", color: "red" },
        { id: "a2", label: "Set default rule to deny, add allow rules for approved country codes at higher priority, and add an IP-based allow rule for the Singapore partner at highest priority", color: "green" },
        { id: "a3", label: "Use Cloud CDN geo-restrictions instead of Cloud Armor", color: "orange" },
        { id: "a4", label: "Allow all traffic and filter by country at the application layer using request headers", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Creating individual deny rules for every non-approved country is unmanageable, error-prone, and fails to block new or unrecognized geolocations. A default-deny model is required for compliance." },
        { id: "r2", text: "A default-deny policy with explicit allow rules for approved geolocations ensures only permitted traffic reaches the backend. The IP-based exception for the Singapore partner at highest priority overrides the geo-block precisely." },
        { id: "r3", text: "Cloud CDN geo-restrictions control content caching, not request filtering. They cannot enforce the deny-all-except compliance posture required by PCI DSS." },
        { id: "r4", text: "Filtering at the application layer means non-compliant traffic already reached the backend infrastructure, which violates the compliance requirement to block at the edge." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Default-deny with prioritized allow rules is the compliance-approved pattern. The IP exception for the partner at highest priority handles the Singapore edge case cleanly.",
        partial: "You're addressing part of the requirement but missing the default-deny posture or the partner exception. Compliance mandates that unapproved traffic never reaches the backend.",
        wrong: "This approach either fails to enforce edge-level geo-blocking or creates an unmanageable ruleset. Cloud Armor's priority-based policy with a default deny is the correct architecture.",
      },
    },
  ],
  hints: [
    "Cloud Armor security policies evaluate rules in priority order (lowest number = highest priority). Always set your default rule to the desired fallback action and add specific allow/deny rules at higher priorities.",
    "Preconfigured WAF rules like sqli-v33-stable and xss-v33-stable are based on the OWASP ModSecurity Core Rule Set and can be tuned with sensitivity levels (1-4) to balance security and false positive rates.",
    "Adaptive Protection requires at least 1 hour of baseline traffic data before it can detect anomalies. Enable it proactively before an attack occurs, not during one.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Cloud Armor is GCP's primary edge security service and is a core topic on the Google Cloud Professional Cloud Security Engineer certification. Engineers who can configure WAF policies, tune OWASP rulesets, and design geo-compliance architectures are essential for any organization running public-facing workloads on GCP.",
  toolRelevance: ["Google Cloud Armor", "Cloud Load Balancing", "Cloud Logging", "OWASP ModSecurity CRS", "Cloud Monitoring"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
