import type { LabManifest } from "../../types/manifest";

export const azureFrontDoorRoutingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-front-door-routing",
  version: 1,
  title: "Azure Front Door Routing Rules and WAF Policies",
  tier: "intermediate",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "front-door", "cdn", "waf", "routing", "origin-groups", "global-load-balancing"],
  description:
    "Configure Azure Front Door routing rules, origin groups, and WAF policies for global traffic distribution, including path-based routing, caching strategies, and threat mitigation.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Design Front Door routing rules that map frontend domains to backend origin groups using path-based and header-based matching",
    "Configure origin groups with health probes and priority/weight-based load balancing across regions",
    "Apply WAF policies with custom rules and managed rule sets to protect against OWASP threats and bot traffic",
    "Optimize caching behavior for static and dynamic content using Front Door caching rules",
  ],
  sortOrder: 214,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Global SaaS Application — Multi-Region Origin Routing",
      context:
        "A SaaS application is deployed across three Azure regions (East US, West Europe, Southeast Asia). Each region hosts an App Service with identical application code. The team wants Azure Front Door to route users to the closest healthy region, with automatic failover if a region goes down. Currently, all traffic is hitting East US regardless of user location because the routing rule is misconfigured.",
      displayFields: [
        { label: "Frontend Domain", value: "app.contoso.com" },
        { label: "Origins", value: "East US (app-eastus.azurewebsites.net), West Europe (app-westeu.azurewebsites.net), Southeast Asia (app-sea.azurewebsites.net)" },
        { label: "Current Behavior", value: "All users routed to East US — latency 280ms from Asia, 150ms from Europe" },
        { label: "Current Config", value: "Single origin group with East US priority=1, West Europe priority=5, Southeast Asia priority=5" },
        { label: "Health Probes", value: "Enabled, all origins reporting healthy" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Set all three origins to the same priority (1) and equal weight (50) in the origin group, allowing Front Door's latency-based routing to automatically direct users to the closest healthy origin",
          color: "green",
        },
        {
          id: "action-b",
          label: "Create three separate origin groups (one per region) with three routing rules matching user geography via geo-filtering",
          color: "orange",
        },
        {
          id: "action-c",
          label: "Set East US priority=1, West Europe priority=2, Southeast Asia priority=3 to create a failover chain",
          color: "red",
        },
        {
          id: "action-d",
          label: "Use Azure Traffic Manager with performance routing in front of Front Door to direct users to the nearest region",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "When all origins in a group share the same priority, Front Door uses latency-based routing — it measures the round-trip time from each Front Door POP to each origin and routes users to the origin with the lowest latency. This automatically sends Asian users to Southeast Asia, European users to West Europe, and American users to East US. If an origin fails health probes, it is removed from the rotation. This is the designed behavior of Front Door's origin group routing.",
        },
        {
          id: "rationale-b",
          text: "Separate origin groups with geo-filtering rules would work but is operationally complex — you must manually define geographic boundaries, maintain three routing rules, and handle edge cases (VPN users, travelers). Front Door's built-in latency-based routing achieves the same result automatically by measuring real network latency instead of relying on IP geolocation.",
        },
        {
          id: "rationale-c",
          text: "Priority-based routing is a failover mechanism, not a proximity mechanism. Priority 1/2/3 means ALL traffic goes to East US (priority 1) until it fails health probes, then ALL traffic switches to West Europe (priority 2). Asian users still get routed to East US when it is healthy. This is the current broken behavior with different priority numbers.",
        },
        {
          id: "rationale-d",
          text: "Placing Traffic Manager in front of Front Door adds unnecessary DNS lookup latency and operational complexity. Front Door already has latency-based routing built into its origin group configuration. Layering two global load balancers is redundant and introduces potential conflict between their routing decisions.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Equal priority and weight enables Front Door's latency-based routing, which automatically directs users to the nearest healthy origin based on measured network latency.",
        partial:
          "Geo-filtering rules can approximate proximity routing but are harder to maintain and less accurate than Front Door's built-in latency measurement.",
        wrong:
          "Priority-based routing creates a failover chain, not proximity routing. Traffic Manager in front of Front Door adds redundant complexity since Front Door already provides latency-based routing.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "WAF Policy — Blocking API Abuse While Allowing Legitimate Traffic",
      context:
        "An API behind Azure Front Door is experiencing credential stuffing attacks on the /api/auth/login endpoint. The attacker sends 500+ requests per minute from rotating IP addresses. Legitimate users make at most 10 login attempts per minute. The team needs a WAF policy that blocks the abuse without affecting normal users. The current managed rule set (OWASP 3.2) is not catching the attack because the requests are well-formed HTTP.",
      displayFields: [
        { label: "Attack Target", value: "POST /api/auth/login" },
        { label: "Attack Pattern", value: "500+ req/min from 50+ rotating IPs, valid HTTP format" },
        { label: "Legitimate Traffic", value: "Max 10 login req/min per IP, avg 2 req/min" },
        { label: "Current WAF", value: "OWASP 3.2 managed rules — not triggering (requests are valid HTTP)" },
        { label: "Impact", value: "Account lockouts for legitimate users, 30% auth service CPU spike" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Add a custom WAF rate-limit rule matching POST requests to /api/auth/login, limiting to 15 requests per minute per IP, with a 5-minute ban on violating IPs",
          color: "green",
        },
        {
          id: "action-b",
          label: "Enable the Bot Manager rule set on the WAF policy to detect and block automated bot traffic",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Switch the WAF to Prevention mode (it's currently in Detection mode) so the OWASP rules start blocking",
          color: "red",
        },
        {
          id: "action-d",
          label: "Add a geo-blocking rule to deny traffic from countries where the company has no customers",
          color: "orange",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "A custom rate-limit rule is the precise fix: it targets only POST /api/auth/login, sets a threshold (15 req/min) that is above legitimate usage (10 req/min max) but well below attack volume (500+ req/min), and applies a temporary ban on violating IPs. This surgically blocks the credential stuffing without affecting legitimate users on other endpoints. Rate-limit rules in Front Door WAF evaluate per-client-IP request counts and automatically block violators.",
        },
        {
          id: "rationale-b",
          text: "Bot Manager can detect known bot signatures and behavioral patterns, but sophisticated credential stuffing attacks use residential proxies and randomized request timing that evade bot detection heuristics. Rate limiting on the specific endpoint is more reliable because it uses a deterministic threshold regardless of how the attacker disguises their traffic.",
        },
        {
          id: "rationale-c",
          text: "The OWASP managed rules are not triggering because the attack requests are well-formed HTTP — they contain valid headers, proper content-type, and no SQL injection or XSS payloads. Switching from Detection to Prevention mode only blocks requests that match existing rules. If no rules match, Prevention mode blocks nothing more than Detection mode.",
        },
        {
          id: "rationale-d",
          text: "Geo-blocking is a blunt instrument — the attack uses rotating IPs from multiple countries, potentially including countries where legitimate customers are located. Blocking entire countries risks denying service to real users while only partially mitigating the attack (attackers can use VPNs in allowed countries).",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Custom rate-limit rules on specific endpoints are the standard defense against credential stuffing — they enforce deterministic per-IP thresholds that attackers cannot bypass without dramatically slowing their attack.",
        partial:
          "Bot Manager provides some protection but is less reliable against sophisticated attacks that mimic legitimate browser behavior. Geo-blocking is too broad and affects legitimate users.",
        wrong:
          "Switching to Prevention mode does not help when the managed rules are not matching — OWASP rules detect malformed or malicious HTTP payloads, not high-volume valid requests.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Origin Group Health Probes — Silent Failover Failure",
      context:
        "Azure Front Door is configured with two origins: primary (East US) and secondary (West Europe). When the East US App Service went down during an outage, Front Door did NOT fail over to West Europe. Instead, users received 503 errors for 45 minutes. The health probe configuration needs investigation.",
      displayFields: [
        { label: "Origin Group", value: "Primary: app-eastus.azurewebsites.net (priority 1), Secondary: app-westeu.azurewebsites.net (priority 2)" },
        { label: "Health Probe Path", value: "/health" },
        { label: "Health Probe Protocol", value: "HTTPS" },
        { label: "Health Probe Interval", value: "255 seconds (maximum)" },
        { label: "East US Outage", value: "App Service returned 503 for 45 minutes. Front Door never failed over." },
        { label: "West Europe Status", value: "Healthy and serving traffic on direct access" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Reduce health probe interval from 255 seconds to 30 seconds, verify the /health endpoint returns 200 when the app is healthy and non-200 when unhealthy, and confirm the probe is not cached",
          color: "green",
        },
        {
          id: "action-b",
          label: "Change the health probe protocol from HTTPS to HTTP to reduce probe overhead and speed up detection",
          color: "red",
        },
        {
          id: "action-c",
          label: "Remove the health probe and rely on Front Door's automatic error detection to trigger failover on 503 responses",
          color: "red",
        },
        {
          id: "action-d",
          label: "Add a third origin in a different region to increase the chances of successful failover",
          color: "orange",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The 255-second probe interval means Front Door checks origin health at most once every 4.25 minutes. If the origin went down immediately after a successful probe, it could take up to 255 seconds before the next probe detects the failure — then another probe cycle to confirm. Combined with the unhealthy threshold, total detection time could exceed 8-10 minutes. Reducing to 30 seconds means failures are detected within 1-2 probe cycles (30-60 seconds). Additionally, the /health endpoint must return accurate status codes and must not be served from cache.",
        },
        {
          id: "rationale-b",
          text: "Changing from HTTPS to HTTP does not meaningfully reduce probe latency — the difference is milliseconds for TLS handshake. Worse, if the App Service redirects HTTP to HTTPS (common), the probe would receive a 301 redirect, which Front Door may treat as unhealthy, causing false negatives on both origins.",
        },
        {
          id: "rationale-c",
          text: "Front Door does not automatically failover based on origin response codes (503) without health probes. Health probes are the mechanism Front Door uses to determine origin availability. Removing probes means Front Door has no way to know an origin is down — it will continue sending traffic to the failed origin indefinitely.",
        },
        {
          id: "rationale-d",
          text: "Adding a third origin does not fix the probe interval problem. If the probe runs every 255 seconds, Front Door is slow to detect failures on ANY origin regardless of how many origins exist. The root cause is the probe configuration, not the number of origins.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. A 255-second probe interval makes failover unacceptably slow. Reducing it to 30 seconds ensures Front Door detects origin failures within 1-2 minutes and routes traffic to the secondary origin promptly.",
        partial:
          "Adding more origins provides redundancy but does not address the root cause — the slow health probe interval that delays failure detection on any origin.",
        wrong:
          "Removing health probes eliminates Front Door's only mechanism for detecting origin failures. Switching to HTTP risks redirect issues and does not address the probe interval.",
      },
    },
  ],
  hints: [
    "In Azure Front Door origin groups, origins with equal priority use latency-based routing — Front Door measures the round-trip time from each POP to each origin and picks the fastest. Different priorities create a failover chain instead.",
    "OWASP managed WAF rules detect malformed or malicious HTTP payloads (SQLi, XSS, path traversal). They do not detect high-volume credential stuffing with well-formed requests — use custom rate-limit rules for that.",
    "Front Door health probe intervals directly affect failover speed — a 255-second interval can delay failover detection by 8+ minutes. Use 30-second intervals for production workloads requiring fast failover.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure Front Door is increasingly the default entry point for globally distributed Azure applications. Understanding routing rules, WAF rate limiting, and health probe tuning is critical for engineers building resilient multi-region architectures — misconfigured probes are the number one cause of failed failovers.",
  toolRelevance: ["Azure Portal", "Azure Front Door", "Azure WAF", "Azure CLI", "Azure Monitor"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
