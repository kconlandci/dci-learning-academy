import type { LabManifest } from "../../types/manifest";

export const azureLoadBalancerLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-load-balancer",
  version: 1,
  title: "Azure Load Balancer vs. Application Gateway",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "load-balancer", "application-gateway", "waf", "traffic", "networking"],
  description:
    "Select between Azure Load Balancer (L4) and Application Gateway (L7) for different traffic routing scenarios, and configure health probes and routing rules correctly.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Differentiate Layer 4 (Azure Load Balancer) from Layer 7 (Application Gateway) load balancing capabilities",
    "Select the correct load balancing product based on routing requirements (URL path, SSL offload, WAF)",
    "Configure health probes that accurately reflect backend application health",
  ],
  sortOrder: 209,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Multi-Service Application — URL-Based Routing",
      context:
        "A microservices application has three backend service pools: /api/* routes to API servers (3 VMs), /images/* routes to image servers with CDN integration (2 VMs), and /admin/* routes to admin servers accessible only from corporate IP ranges. You need a single public frontend IP to handle all routing.",
      displayFields: [
        { label: "Frontend", value: "Single public IP address required" },
        { label: "Route 1", value: "/api/* → API VM pool (3 VMs)" },
        { label: "Route 2", value: "/images/* → Image VM pool (2 VMs)" },
        { label: "Route 3", value: "/admin/* → Admin VM pool (IP restriction required)" },
        { label: "SSL", value: "TLS termination required at the load balancer" },
        { label: "Security", value: "WAF protection required on /api/* routes" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Azure Application Gateway (Standard_v2) with URL-based routing rules, SSL termination, and WAF policy",
          color: "green",
        },
        {
          id: "action-b",
          label: "Azure Load Balancer (Standard) with three separate frontend IP configurations",
          color: "red",
        },
        {
          id: "action-c",
          label: "Azure Traffic Manager with three separate backends",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Azure Load Balancer (Standard) with custom routing scripts on each backend VM",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Application Gateway is an L7 load balancer with URL path-based routing, SSL/TLS termination, and integrated WAF (Web Application Firewall). It can inspect the HTTP URL path and route /api/*, /images/*, and /admin/* to different backend pools from a single frontend IP. WAF policies can be scoped to specific URL paths. This is exactly what Application Gateway is designed for.",
        },
        {
          id: "rationale-b",
          text: "Azure Load Balancer is an L4 (TCP/UDP) load balancer — it cannot inspect HTTP URLs. It distributes traffic based on IP/port combinations only. You cannot route /api/* differently from /images/* using only Load Balancer rules. Multiple frontend IPs on Load Balancer means multiple public IP addresses, not URL-based routing.",
        },
        {
          id: "rationale-c",
          text: "Azure Traffic Manager is DNS-based load balancing — it operates at the DNS level, not HTTP level. It routes users to different endpoints based on geographic proximity, latency, or weighted policies. It cannot route /api/* vs. /images/* from the same domain without separate subdomains.",
        },
        {
          id: "rationale-d",
          text: "Using custom routing logic on backend VMs violates the separation of concerns principle — routing belongs in the load balancer layer, not the application layer. It also means every VM handles every request to determine if it should process it, wasting resources.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Application Gateway is the Azure L7 load balancer — URL routing, SSL termination, WAF, and header manipulation are all Application Gateway capabilities that L4 Load Balancer cannot provide.",
        partial:
          "You've chosen a product that handles traffic distribution but lacks the L7 capabilities (URL routing, WAF) required by this scenario.",
        wrong:
          "Azure Load Balancer operates at L4 (TCP/UDP) and has no awareness of HTTP URLs. Custom routing scripts on VMs are fragile and operationally expensive.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Health Probe Misconfiguration — Healthy VM Reported as Down",
      context:
        "Three backend VMs are behind an Application Gateway. The application logs show that one VM (backend-vm-02) is serving traffic normally, but Application Gateway health probes mark it as unhealthy and it's excluded from the pool. The same VM passes manual HTTP checks from the Azure portal.",
      displayFields: [
        { label: "VM Status", value: "backend-vm-02: Running, application responsive" },
        { label: "Application Gateway Probe Status", value: "backend-vm-02: Unhealthy" },
        { label: "Manual HTTP Test", value: "HTTP GET http://10.0.1.5/health → 200 OK" },
        { label: "Current Health Probe Config", value: "Protocol: HTTP, Path: /healthcheck, Port: 80, Interval: 30s, Unhealthy threshold: 3" },
        { label: "Application Response", value: "GET /healthcheck returns 301 Redirect to /healthcheck/" },
      ],
      evidence: [
        "Application Gateway Backend Health: backend-vm-02 — Probe response: HTTP 301 (Redirect). Status: Unhealthy. Application Gateway health probes do not follow redirects — non-2xx responses are treated as unhealthy.",
      ],
      actions: [
        {
          id: "action-a",
          label: "Update the health probe path from /healthcheck to /healthcheck/ (trailing slash) to match the redirect target",
          color: "green",
        },
        {
          id: "action-b",
          label: "Configure the probe to accept HTTP 301 as a healthy response code",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Increase the unhealthy threshold from 3 to 10 to be more tolerant of probe failures",
          color: "red",
        },
        {
          id: "action-d",
          label: "Switch the health probe from HTTP to TCP to avoid HTTP response code issues",
          color: "yellow",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "The root cause is that /healthcheck redirects to /healthcheck/ (trailing slash added by the web server). Application Gateway probes don't follow redirects — a 301 is treated as unhealthy. Changing the probe path to /healthcheck/ (with trailing slash) means the probe hits the correct endpoint directly and gets a 200 OK. This is a one-field configuration change that immediately fixes the false-negative.",
        },
        {
          id: "rationale-b",
          text: "Application Gateway custom probes allow specifying a list of acceptable status code ranges. Accepting 301 as healthy would work, but it's masking the underlying redirect behavior rather than fixing it. If the VM were truly down and returning a custom 301 error page, this would create false-positive healthy responses.",
        },
        {
          id: "rationale-c",
          text: "Increasing the unhealthy threshold means the VM would be excluded after 10 failed probes instead of 3. This extends the time before a truly unhealthy VM is removed — making the load balancer slower to respond to real failures. Never increase thresholds to paper over misconfigurations.",
        },
        {
          id: "rationale-d",
          text: "TCP probes only verify that the port is accepting connections — they don't validate that the application is functioning correctly. A web server with a broken application but open port 80 would pass a TCP probe. HTTP probes are superior for application health validation.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. The redirect from /healthcheck to /healthcheck/ is a common misconfiguration — Application Gateway probes don't follow redirects, so fixing the probe path is the correct one-line fix.",
        partial:
          "Your fix would work but either masks the redirect (accepting 301) or reduces health probe sensitivity (TCP probe). The cleanest fix is to probe the correct path directly.",
        wrong:
          "Increasing unhealthy thresholds degrades your load balancer's ability to detect and remove genuinely failed backends. Never adjust thresholds to compensate for configuration errors.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Session Affinity — Sticky Session Requirement",
      context:
        "A legacy stateful web application stores user session data in VM memory (not a shared session store). Users are randomly assigned to different backend VMs on each request and frequently lose their shopping cart. The application team cannot be rewritten in the next quarter. You need to fix this at the load balancer layer.",
      displayFields: [
        { label: "Application Type", value: "Legacy stateful — in-memory sessions" },
        { label: "Problem", value: "Users routed to different VMs per request, losing session state" },
        { label: "Current Load Balancer", value: "Application Gateway — round-robin (no affinity)" },
        { label: "Session Store", value: "VM memory only (no Redis, no SQL session)" },
        { label: "Rewrite Timeline", value: "Cannot refactor session handling for 3+ months" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Enable cookie-based session affinity on Application Gateway to pin each user to a specific backend VM",
          color: "green",
        },
        {
          id: "action-b",
          label: "Add Azure Cache for Redis as a shared session store and update the application code",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Switch from Application Gateway to Azure Load Balancer and use IP hash distribution",
          color: "yellow",
        },
        {
          id: "action-d",
          label: "Add more backend VMs to reduce the chance of being routed to a different VM",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Application Gateway cookie-based session affinity (also called sticky sessions) inserts an 'ApplicationGatewayAffinity' cookie on the first response. Subsequent requests from the same browser carry this cookie, and Application Gateway routes them to the same backend VM. This requires zero application changes and works immediately — the right short-term fix for legacy stateful apps.",
        },
        {
          id: "rationale-b",
          text: "Redis shared session store is the correct long-term architectural fix — it makes the application truly stateless and scalable. However, the problem statement says the application cannot be rewritten for 3+ months. Redis requires application code changes; it doesn't fix the current situation.",
        },
        {
          id: "rationale-c",
          text: "IP hash on Azure Load Balancer routes based on client IP, which provides some stickiness. However, users behind NAT or VPNs share IP addresses, so many users would map to the same VM. Cookie-based affinity on Application Gateway is more accurate and reliable than IP hash.",
        },
        {
          id: "rationale-d",
          text: "Adding more VMs increases the probability of being routed to a different VM on each request — it makes the problem worse, not better. More backends means more possible 'wrong' destinations for each stateful user.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Cookie-based session affinity is the right immediate fix — it requires no application changes and provides reliable per-user routing to the same backend.",
        partial:
          "Your solution addresses the root cause but requires either application changes (Redis) or provides less reliable stickiness (IP hash) compared to cookie-based affinity.",
        wrong:
          "Adding more VMs to a stateful round-robin load balancer makes session loss more frequent, not less. More backends means a higher probability of any given request landing on the wrong server.",
      },
    },
  ],
  hints: [
    "Azure Load Balancer (L4) distributes TCP/UDP connections by IP and port — it cannot inspect HTTP URLs, headers, or cookies. Application Gateway (L7) can route based on URL paths, host headers, and cookies.",
    "Application Gateway health probes do not follow HTTP redirects — a 301 response from the probe path marks the backend as unhealthy. Probe the exact path that returns a 200 OK.",
    "Cookie-based session affinity on Application Gateway is a zero-code-change solution for legacy stateful apps — enable it to pin users to the same backend VM while the team migrates to a shared session store.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Choosing between Azure Load Balancer and Application Gateway is a foundational architecture decision. Almost every multi-tier Azure application uses one or both. Understanding when L4 is sufficient vs. when L7 features are required — and knowing the health probe edge cases — directly improves your ability to design reliable and cost-effective architectures.",
  toolRelevance: ["Azure Portal", "Azure CLI", "Azure Application Gateway", "Azure Load Balancer", "Azure Monitor"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
