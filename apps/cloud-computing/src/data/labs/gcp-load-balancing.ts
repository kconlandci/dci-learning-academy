import type { LabManifest } from "../../types/manifest";

export const gcpLoadBalancingLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gcp-load-balancing",
  version: 1,
  title: "GCP Load Balancing Failure Triage",
  tier: "intermediate",
  track: "gcp-essentials",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["gcp", "load-balancing", "global-lb", "health-checks", "backend-services", "ssl", "traffic-management"],
  description:
    "Triage GCP Global HTTP(S) Load Balancer incidents including backend health failures, SSL certificate issues, traffic routing misconfigurations, and 502/503 errors under production load.",
  estimatedMinutes: 18,
  learningObjectives: [
    "Diagnose backend health check failures causing 502s on the Global HTTP(S) Load Balancer",
    "Differentiate between Google-managed SSL certificate provisioning states and failures",
    "Analyze load balancer logs to identify which backend service or URL map rule is failing",
    "Configure traffic splitting for blue-green deployments using backend service weights",
  ],
  sortOrder: 310,
  status: "published",
  prerequisites: [],
  rendererType: "triage-remediate",
  scenarios: [
    {
      type: "triage-remediate",
      id: "lb-scenario-1",
      title: "502 Bad Gateway After Deployment",
      description:
        "A new version of your API was deployed 20 minutes ago. Users are now getting intermittent 502 errors. The load balancer has two backend services: api-backend-v1 (30% weight) and api-backend-v2 (70% weight). Cloud Logging shows 502s starting immediately after the v2 deployment.",
      evidence: [
        {
          type: "metric",
          content:
            "httpRequest.status=502 count: 2,341 (last 20 min)\nhttpRequest.status=200 count: 987 (last 20 min)\nbackendTargetProjectNumber: projects/123/backendServices/api-backend-v2\nStatusDetails: 'backend_error'\njsonPayload.@type: type.googleapis.com/google.cloud.loadbalancing.type.LoadBalancerLogEntry\nTop erroring backend IP: 10.128.0.15, 10.128.0.16, 10.128.0.17 (all in api-backend-v2 instance group)",
          icon: "alert",
        },
        {
          type: "metric",
          content:
            "api-backend-v1 instance group:\n  Healthy instances: 3/3\n  Health check: /healthz → 200 OK\n\napi-backend-v2 instance group:\n  Healthy instances: 0/3\n  Health check: /healthz → connection refused (port 8080)\n  Health check configuration: TCP port 8080\n  Actual app port in v2: 8443 (changed in new deployment config)",
          icon: "critical",
        },
        {
          type: "metric",
          content:
            "v2 changes:\n  - Upgraded to TLS termination at application layer\n  - Application now listens on 8443 (HTTPS) instead of 8080 (HTTP)\n  - Health check endpoint still /healthz (unchanged)\n  - Deployment engineer forgot to update health check port in backend service",
          icon: "info",
        },
      ],
      classifications: [
        { id: "health-check-misconfigured", label: "Backend Health Check Misconfigured", description: "Health checks are probing the wrong port, marking all v2 instances as unhealthy." },
        { id: "app-crash", label: "Application Crash in v2", description: "The v2 application is crashing on startup, causing all instances to be unavailable." },
        { id: "ssl-cert-expired", label: "SSL Certificate Expired on v2 Backends", description: "The TLS certificate on v2 backends has expired, causing connection failures." },
        { id: "traffic-weight-wrong", label: "Traffic Weight Misconfigured", description: "The 70% weight on v2 is sending too much traffic to unhealthy instances." },
      ],
      correctClassificationId: "health-check-misconfigured",
      remediations: [
        {
          id: "update-health-check-port",
          label: "Update the backend service health check to probe port 8443",
          description: "Change the health check port from 8080 to 8443 in the api-backend-v2 backend service configuration. Instances will become healthy once checks pass.",
        },
        {
          id: "rollback-v2",
          label: "Immediately shift all traffic to v1 (100%) and rollback v2",
          description: "Set api-backend-v1 weight to 100% and api-backend-v2 to 0% to stop 502s while investigating.",
        },
        {
          id: "restart-instances",
          label: "Restart all v2 instances to clear the crash",
          description: "Use gcloud compute instances reset to restart all three v2 instances.",
        },
        {
          id: "add-more-v1-instances",
          label: "Scale up v1 instance group to handle full traffic",
          description: "Add instances to v1 group to absorb the full traffic load while v2 is fixed.",
        },
      ],
      correctRemediationId: "update-health-check-port",
      rationales: [
        { id: "r-port-mismatch", text: "The v2 deployment changed the application port from 8080 to 8443 but the health check was not updated. GCP marks instances unhealthy when health checks fail — all v2 traffic goes to healthy instances or returns 502 if none are healthy." },
        { id: "r-fix-root-cause", text: "Updating the health check port is the surgical fix that doesn't disrupt traffic or require a rollback. Once the check passes on 8443, GCP will mark v2 instances healthy and 502s will stop." },
        { id: "r-rollback-valid-triage", text: "Rolling back to v1 is a valid immediate triage action to stop user impact, but the root cause still needs fixing before v2 can be redeployed." },
      ],
      correctRationaleId: "r-fix-root-cause",
      feedback: {
        perfect: "Excellent! Health check port mismatch after a deployment is one of the most common load balancer incidents. Updating the health check port to 8443 fixes the root cause without a rollback.",
        partial: "You classified the issue correctly. The optimal remediation is to fix the health check port — this is a surgical fix that restores v2 immediately without a rollback or traffic shift.",
        wrong: "The logs show 0/3 healthy instances in v2 with 'connection refused' on port 8080. The deployment changelog confirms the app moved to port 8443. Update the health check port — the app is running but not being checked on the right port.",
      },
    },
    {
      type: "triage-remediate",
      id: "lb-scenario-2",
      title: "SSL Certificate Stuck in PROVISIONING State",
      description:
        "A new domain 'api.newproduct.example.com' was added to the load balancer 72 hours ago with a Google-managed SSL certificate. HTTPS traffic returns 'SSL_ERROR_NO_CYPHER_OVERLAP' to clients. The certificate has been in PROVISIONING state since creation.",
      evidence: [
        {
          type: "metric",
          content:
            "$ gcloud compute ssl-certificates describe api-newproduct-cert\nmanaged:\n  domainStatus:\n    api.newproduct.example.com: FAILED_NOT_VISIBLE\n  domains:\n  - api.newproduct.example.com\n  status: PROVISIONING\nname: api-newproduct-cert\ntype: MANAGED",
          icon: "terminal",
        },
        {
          type: "metric",
          content:
            "$ dig api.newproduct.example.com A\n;; ANSWER SECTION:\napi.newproduct.example.com. 300 IN A 198.51.100.42\n\nLoad Balancer IP: 34.120.45.88\nDNS record points to: 198.51.100.42 (old CDN IP from previous provider)\nLast DNS update: 5 days ago (before load balancer creation)\nDNS TTL: 300 seconds",
          icon: "critical",
        },
        {
          type: "metric",
          content:
            "Google-managed SSL certificates require:\n1. Domain DNS must resolve to the load balancer's IP address\n2. Load balancer must be receiving HTTP traffic on port 80 from the domain\n3. Google's certificate authority must be able to reach the load balancer to complete DV validation\nCurrent status: DNS resolves to 198.51.100.42 (not the LB IP 34.120.45.88)\nDomain validation: FAILED_NOT_VISIBLE (Google CA cannot reach the LB from this domain)",
          icon: "info",
        },
      ],
      classifications: [
        { id: "dns-misconfigured", label: "DNS Not Pointing to Load Balancer IP", description: "The domain's A record still points to an old IP, preventing Google-managed cert provisioning." },
        { id: "cert-quota-exceeded", label: "SSL Certificate Quota Exceeded", description: "The GCP project has exceeded the SSL certificate quota." },
        { id: "lb-no-http", label: "Load Balancer Missing HTTP Frontend on Port 80", description: "Google needs HTTP access on port 80 for domain validation." },
        { id: "domain-verification", label: "Domain Ownership Not Verified in Google Search Console", description: "Google requires domain verification before issuing managed certificates." },
      ],
      correctClassificationId: "dns-misconfigured",
      remediations: [
        {
          id: "update-dns-record",
          label: "Update DNS A record for api.newproduct.example.com to point to 34.120.45.88",
          description: "Change the A record to the load balancer's anycast IP. Provisioning will complete automatically within 15–30 minutes after DNS propagates.",
        },
        {
          id: "use-self-managed-cert",
          label: "Upload a self-managed SSL certificate from Let's Encrypt",
          description: "Bypass Google-managed cert by uploading a manually obtained certificate.",
        },
        {
          id: "add-http-frontend",
          label: "Add an HTTP (port 80) frontend to the load balancer",
          description: "Create an HTTP frontend on port 80 for the domain to allow Google's validation to proceed.",
        },
        {
          id: "delete-recreate-cert",
          label: "Delete and recreate the SSL certificate resource",
          description: "Force a new provisioning attempt by deleting and recreating the certificate.",
        },
      ],
      correctRemediationId: "update-dns-record",
      rationales: [
        { id: "r-dns-is-root", text: "Google-managed certificate provisioning uses Domain Validation (DV). Google's CA sends an HTTP request to the domain to verify ownership. If DNS points to a different IP, Google can't reach the load balancer, and FAILED_NOT_VISIBLE is returned. Fix DNS first." },
        { id: "r-automatic-retry", text: "Once the DNS A record is updated to the load balancer's anycast IP (34.120.45.88), Google will automatically retry DV validation. The certificate will transition from PROVISIONING to ACTIVE within 15–30 minutes." },
        { id: "r-delete-recreate-unnecessary", text: "Deleting and recreating the cert doesn't fix DNS. The new cert will also fail with FAILED_NOT_VISIBLE until the DNS record is corrected." },
      ],
      correctRationaleId: "r-dns-is-root",
      feedback: {
        perfect: "Exactly right! FAILED_NOT_VISIBLE means Google's CA cannot reach the load balancer for domain validation. The DNS A record still points to the old CDN. Update it to the LB IP and provisioning completes automatically.",
        partial: "You identified the DNS issue. The fix is straightforward: update the A record to 34.120.45.88. Google will retry provisioning automatically and the certificate will activate within 30 minutes.",
        wrong: "The gcloud output shows FAILED_NOT_VISIBLE — Google's certificate authority cannot reach the load balancer from this domain. Check the DNS: it still points to 198.51.100.42 (old CDN) instead of the LB's 34.120.45.88.",
      },
    },
    {
      type: "triage-remediate",
      id: "lb-scenario-3",
      title: "Unexpected Traffic Routing to Wrong Backend",
      description:
        "Your application has a URL map that routes /api/* to the api-backend and /static/* to the cdn-backend. Users are reporting that API calls to /api/v2/users are returning HTML (static content), not JSON. Triage the URL map configuration.",
      evidence: [
        {
          type: "metric",
          content:
            "URL Map: prod-url-map\n\nHost rules: example.com\n\nPath matchers:\n  default-matcher:\n    defaultService: cdn-backend\n    pathRules:\n    - paths: ['/static/*']\n      service: cdn-backend\n    - paths: ['/api/*']\n      service: api-backend\n\nBackend services:\n  api-backend: healthy (Cloud Run, returns JSON)\n  cdn-backend: healthy (Cloud Storage bucket, returns HTML/assets)",
          icon: "terminal",
        },
        {
          type: "metric",
          content:
            "GET /api/v2/users → HTTP 200, Content-Type: text/html (WRONG — returns index.html)\nGET /api/v1/orders → HTTP 200, Content-Type: application/json (CORRECT)\nGET /static/app.js → HTTP 200, Content-Type: application/javascript (correct)\n\nPattern: /api/v2/* always returns HTML, /api/v1/* returns JSON\nKey difference: v2 routes contain uppercase characters in some headers",
          icon: "critical",
        },
        {
          type: "metric",
          content:
            "Recent URL map change (2 days ago):\n  Added new path rule for /api/v2/* to support v2 API\n  Path rule added: paths: ['/Api/v2/*'] (capital 'A' — typo in path rule)\n  The rule with capital 'A' never matches because URL map paths are case-sensitive\n  Default service (cdn-backend) handles /api/v2/* because no rule matches",
          icon: "alert",
        },
      ],
      classifications: [
        { id: "url-map-typo", label: "URL Map Path Rule Typo (Case Mismatch)", description: "A path rule was created with incorrect capitalization, causing it to never match and fall through to the default backend." },
        { id: "backend-misconfigured", label: "api-backend Service Misconfigured", description: "The api-backend Cloud Run service is incorrectly returning HTML instead of JSON for v2 routes." },
        { id: "cdn-rules-override", label: "CDN Policy Overriding API Traffic", description: "A CDN cache policy on cdn-backend is caching and serving stale HTML for API paths." },
        { id: "path-order-priority", label: "Path Rule Order Conflict", description: "The /static/* path rule is matching before the /api/* rule due to evaluation order." },
      ],
      correctClassificationId: "url-map-typo",
      remediations: [
        {
          id: "fix-path-rule-case",
          label: "Correct the path rule from '/Api/v2/*' to '/api/v2/*' and redeploy the URL map",
          description: "Update the path rule to use lowercase 'a' in 'api' to match actual request paths. Requests to /api/v2/* will then route to api-backend.",
        },
        {
          id: "add-catch-all-api",
          label: "Change default service from cdn-backend to api-backend",
          description: "Set api-backend as the default service so unmatched paths go to the API instead of CDN.",
        },
        {
          id: "add-redirect-rule",
          label: "Add a redirect rule from /Api/* to /api/*",
          description: "Add a URL redirect rule to normalize uppercase API paths.",
        },
        {
          id: "add-case-insensitive-flag",
          label: "Enable case-insensitive path matching on the URL map",
          description: "Configure the URL map to match paths case-insensitively.",
        },
      ],
      correctRemediationId: "fix-path-rule-case",
      rationales: [
        { id: "r-typo-case-sensitive", text: "GCP URL map path rules are case-sensitive. '/Api/v2/*' never matches '/api/v2/*' (lowercase a). The surgical fix is to correct the typo — change '/Api/v2/*' to '/api/v2/*'. This takes effect immediately after URL map update." },
        { id: "r-default-service-risky", text: "Changing the default service to api-backend would break all unrecognized paths — including future static asset paths that don't have explicit rules. Fix the typo instead." },
        { id: "r-gcp-no-case-flag", text: "GCP URL maps do not have a built-in case-insensitive matching flag. The path rules must match the exact case of incoming request paths." },
      ],
      correctRationaleId: "r-typo-case-sensitive",
      feedback: {
        perfect: "Sharp diagnosis! URL map path rules are case-sensitive in GCP. '/Api/v2/*' vs '/api/v2/*' is a common typo that's easy to miss. The fix is a one-character change.",
        partial: "Correct classification. The fix is to correct the path rule typo from '/Api/v2/*' to '/api/v2/*' — URL maps in GCP use case-sensitive path matching.",
        wrong: "The evidence shows /api/v2/* goes to cdn-backend (HTML) while /api/v1/* goes correctly to api-backend. The URL map change log reveals the path rule was entered as '/Api/v2/*' (capital A) — it never matches lowercase requests.",
      },
    },
  ],
  hints: [
    "When a GCP load balancer returns 502, always check Backend Health first in the console. 0/N healthy instances means health checks are failing — verify the health check port and path match what the application actually serves.",
    "Google-managed SSL certificates fail with FAILED_NOT_VISIBLE when the domain's DNS does not resolve to the load balancer's anycast IP. Always confirm DNS is pointing to the LB before debugging certificate provisioning.",
    "URL map path rules in GCP are case-sensitive. '/api/*' and '/Api/*' are different rules. Always test URL map changes with gcloud compute url-maps export and validate path matching against real request paths.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Global HTTP(S) Load Balancer is the entry point for millions of GCP-hosted applications. Site reliability engineers and cloud engineers who can diagnose load balancer failures — from health check misconfigurations to URL map typos — are essential to keeping high-traffic applications online. This skill is directly tested in GCP Professional Cloud Architect and DevOps Engineer certifications.",
  toolRelevance: ["GCP Console (Load Balancing)", "gcloud compute url-maps", "Cloud Logging (LB logs)", "gcloud compute ssl-certificates", "Network Intelligence Center"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
