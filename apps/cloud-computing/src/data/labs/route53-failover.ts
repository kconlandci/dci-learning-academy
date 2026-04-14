import type { LabManifest } from "../../types/manifest";

export const route53FailoverLab: LabManifest = {
  schemaVersion: "1.1",
  id: "route53-failover",
  version: 1,
  title: "Route 53 Failover Routing",
  tier: "beginner",
  track: "aws-core",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["aws", "route53", "dns", "failover", "high-availability"],
  description:
    "Diagnose Route 53 health check failures and routing policy misconfigurations that prevent proper failover between primary and secondary regions.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Configure Route 53 health checks to accurately reflect application health",
    "Identify why DNS failover is not triggering during an incident",
    "Choose the correct routing policy for different failover architectures",
    "Understand TTL implications on DNS failover speed",
  ],
  sortOrder: 107,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "route53-failover-s1",
      title: "Failover Not Triggering During Outage",
      objective:
        "Your us-east-1 primary region is down — ALB is returning 502 errors. Route 53 should fail over to us-west-2, but users are still hitting the dead primary. Investigate why failover isn't happening.",
      investigationData: [
        {
          id: "health-check-config",
          label: "Route 53 Health Check Configuration",
          content:
            "Health Check ID: hc-primary-alb\nType: HTTP\nEndpoint: ALB DNS name (not IP)\nPath: /health\nInterval: 30 seconds\nFailure Threshold: 3 consecutive failures\nStatus: HEALTHY (showing green in console)",
          isCritical: true,
        },
        {
          id: "alb-status",
          label: "ALB Monitoring: us-east-1",
          content:
            "ALB Status: Active\nHTTP 5xx Rate: 98% of requests\nHTTP 2xx Rate: 2%\nHealthy Target Count: 0\nUnhealthy Target Count: 4\nNote: ALB itself is responding — it's returning 502 because all backend targets are unhealthy.",
          isCritical: true,
        },
        {
          id: "route53-records",
          label: "Route 53 Record Configuration",
          content:
            "Record: api.example.com\nPrimary record: us-east-1 ALB | Failover: PRIMARY | Health Check: hc-primary-alb\nSecondary record: us-west-2 ALB | Failover: SECONDARY | Health Check: None\nTTL: 300 seconds",
        },
        {
          id: "health-check-probe",
          label: "Health Check Path Response",
          content:
            "GET /health HTTP/1.1\nResponse: HTTP 200 OK\nBody: {\"status\": \"ok\"}\nNote: The /health endpoint is a static file served by the ALB itself, not a dynamic check of backend targets.",
          isCritical: true,
        },
      ],
      actions: [
        { id: "fix-health-check-path", label: "Update health check path to an endpoint that verifies backend target health", color: "green" },
        { id: "reduce-ttl", label: "Reduce TTL from 300s to 60s to speed up DNS propagation", color: "yellow" },
        { id: "add-secondary-health-check", label: "Add a health check to the secondary Route 53 record", color: "orange" },
        { id: "switch-to-latency-routing", label: "Switch from Failover to Latency-based routing policy", color: "red" },
      ],
      correctActionId: "fix-health-check-path",
      rationales: [
        { id: "r-health-check-shallow", text: "The health check is probing /health which returns 200 because it's a static file served by the ALB load balancer itself — not the application. A meaningful health check must verify the actual application stack. Use an endpoint that exercises the backend (e.g., /api/status) that returns non-2xx when targets are unhealthy." },
        { id: "r-ttl-secondary", text: "TTL reduction speeds up DNS propagation once failover triggers, but doesn't fix why failover isn't triggering. The health check is still reporting healthy." },
        { id: "r-secondary-check-irrelevant", text: "The secondary record health check doesn't affect the failover trigger — that's controlled by the primary record's health check. Route 53 fails over when the PRIMARY health check fails." },
        { id: "r-latency-wrong-policy", text: "Latency routing distributes traffic based on network latency, not health. It doesn't provide failover behavior. The architecture correctly uses Failover routing — the problem is the shallow health check." },
      ],
      correctRationaleId: "r-health-check-shallow",
      feedback: {
        perfect: "Root cause identified. The health check path /health is a static file on the ALB — it stays up even when all backend targets are down. The health check must probe an application endpoint that fails when the backend fails.",
        partial: "Reducing TTL is a good improvement but doesn't fix the trigger. The fundamental problem is that the health check reports HEALTHY while the application is actually down. Fix the health check path first.",
        wrong: "The failover trigger depends entirely on the Route 53 health check. Since the health check is returning HEALTHY (because it's hitting a static file), failover never triggers regardless of TTL or secondary record configuration.",
      },
    },
    {
      type: "investigate-decide",
      id: "route53-failover-s2",
      title: "Blue-Green Deployment DNS Issue",
      objective:
        "You deployed a new version to the 'green' environment and updated Route 53 to send 100% of traffic there. But 15 minutes later, 30% of users are still hitting the old 'blue' environment. Determine why the traffic split persists.",
      investigationData: [
        {
          id: "route53-change",
          label: "Route 53 Record Change",
          content:
            "Old record: app.example.com → blue-alb.us-east-1.elb.amazonaws.com (TTL: 300s)\nNew record: app.example.com → green-alb.us-east-1.elb.amazonaws.com (TTL: 300s)\nChange applied: 15 minutes ago\nRoute 53 propagation: Complete (confirmed via Route 53 console)",
        },
        {
          id: "client-distribution",
          label: "Client Traffic Analysis",
          content:
            "Clients still on blue: ~30% — all corporate office IPs (single /24 subnet)\nClients on green: ~70% — mostly mobile and residential ISP\nObservation: The corporate users go through a corporate DNS resolver at 10.50.0.1",
          isCritical: true,
        },
        {
          id: "dns-ttl-analysis",
          label: "DNS TTL Behavior",
          content:
            "Previous TTL on the record: 300 seconds (5 minutes)\nRoute 53 change was made 15 minutes ago\nExpected: all DNS resolvers should have expired the old TTL\nBut: corporate resolver at 10.50.0.1 shows TTL still cached as 'app.example.com → blue-alb'",
          isCritical: true,
        },
        {
          id: "resolver-config",
          label: "Corporate DNS Resolver Configuration",
          content:
            "Resolver: Windows DNS Server 2019 at 10.50.0.1\nForwarding: Resolves external DNS via 8.8.8.8\nNegative TTL cache: 3600s\nNote: This resolver is honoring the maximum client TTL override of 3600s set by the IT team regardless of the record's TTL.",
          isCritical: true,
        },
      ],
      actions: [
        { id: "wait-ttl-expire", label: "Wait for the corporate resolver's 3600s TTL override to expire", color: "yellow" },
        { id: "contact-it-flush", label: "Contact IT to flush the corporate DNS resolver cache manually", color: "green" },
        { id: "reduce-route53-ttl", label: "Reduce Route 53 record TTL to 1s and wait", color: "orange" },
        { id: "use-weighted-routing", label: "Switch to Weighted Routing policy with 0 weight on blue record", color: "red" },
      ],
      correctActionId: "contact-it-flush",
      rationales: [
        { id: "r-flush-resolver", text: "The corporate DNS resolver is overriding the record TTL with a 3600s maximum. Reducing Route 53 TTL to 1s won't help — the resolver still caps at 3600s. The immediate fix is to flush the specific record on the corporate resolver." },
        { id: "r-wait-impractical", text: "Waiting up to 60 more minutes for the 3600s TTL to expire is acceptable if there's no urgency, but for a production deployment, manually flushing the resolver is the faster path to consistency." },
        { id: "r-low-ttl-too-late", text: "TTL changes only affect future caching behavior. The resolver is already caching with its 3600s override — changing Route 53 TTL now doesn't affect what's already cached." },
        { id: "r-weighted-wrong", text: "Weighted Routing with 0 weight on the blue record would eventually work, but the cached DNS entry would still point to blue until the resolver cache expires. This doesn't fix the immediate issue faster." },
      ],
      correctRationaleId: "r-flush-resolver",
      feedback: {
        perfect: "Correct diagnosis. The corporate resolver's TTL override is the cause, and flushing the resolver cache is the fastest fix. Understanding that Route 53 TTL is a 'maximum' that resolvers can override is crucial.",
        partial: "Waiting for expiry is technically correct but not the fastest response. When a specific resolver is causing the issue, direct intervention (flush) is the right operational response.",
        wrong: "Changing the Route 53 TTL doesn't help — the record is already cached with the resolver's 3600s override. The problem is at the resolver level, not at Route 53.",
      },
    },
    {
      type: "investigate-decide",
      id: "route53-failover-s3",
      title: "Multi-Region Latency Routing Degradation",
      objective:
        "Your application uses Route 53 Latency routing across us-east-1, eu-west-1, and ap-southeast-1. Users in Tokyo are now getting high latency (250ms+) even though ap-southeast-1 is healthy. Investigate and determine the correct action.",
      investigationData: [
        {
          id: "latency-routing-records",
          label: "Route 53 Latency Routing Records",
          content:
            "api.example.com (Latency):\n  us-east-1 ALB — Health: HEALTHY\n  eu-west-1 ALB — Health: HEALTHY\n  ap-southeast-1 ALB — Health: UNHEALTHY (failed health check 22 min ago)\nRoute 53 has removed ap-southeast-1 from DNS responses.",
          isCritical: true,
        },
        {
          id: "health-check-reason",
          label: "ap-southeast-1 Health Check Failure Reason",
          content:
            "Health check type: TCP port 443\nFailure reason: Connection timeout\nLast success: 22 minutes ago\nALB status in ap-southeast-1: Active, serving traffic normally\nSecurity Group on ALB: Allows 443 from VPC only — does NOT allow Route 53 health checker IPs",
          isCritical: true,
        },
        {
          id: "route53-health-checker-ips",
          label: "Route 53 Health Checker IP Ranges",
          content:
            "Route 53 health checkers use specific IP ranges from the aws.json endpoints file.\nRequired for HTTP/TCP health checks: Allow inbound from 54.183.255.128/26, 54.228.16.0/26, and ~15 other /26 ranges across regions.\nThe ap-southeast-1 ALB security group was tightened last month and these ranges were removed.",
          isCritical: true,
        },
        {
          id: "tokyo-latency-data",
          label: "User Latency from Tokyo",
          content:
            "ap-southeast-1 endpoint: ~18ms round trip (when healthy)\nus-east-1 endpoint: ~140ms round trip\neu-west-1 endpoint: ~250ms round trip\nCurrent Route 53 response for Tokyo users: eu-west-1 (Route 53 is routing to the farthest available region)",
        },
      ],
      actions: [
        { id: "fix-security-group", label: "Add Route 53 health checker IP ranges to the ALB security group", color: "green" },
        { id: "disable-health-check", label: "Disable the health check for ap-southeast-1 so Route 53 always includes it", color: "red" },
        { id: "switch-to-http-health", label: "Change health check type from TCP to HTTP and use the ALB DNS name", color: "yellow" },
        { id: "add-second-region", label: "Launch a fourth region to cover Asia-Pacific with a backup endpoint", color: "orange" },
      ],
      correctActionId: "fix-security-group",
      rationales: [
        { id: "r-fix-sg-root", text: "The health check is failing because the ALB security group is blocking Route 53 health checker IPs. The ALB is actually healthy — it's just not reachable by the health checkers. Fixing the security group restores correct health check reporting without disabling protection." },
        { id: "r-disable-health-check-bad", text: "Disabling the health check means Route 53 will route to ap-southeast-1 even if it's actually down. Health checks exist to detect real failures. Disabling them because they're incorrectly configured is the wrong fix." },
        { id: "r-http-health-same-problem", text: "Switching from TCP to HTTP health check still requires the health checker IPs to reach the ALB. The security group blocks all health checker IPs regardless of check type." },
        { id: "r-new-region-expensive", text: "Adding a fourth region is a major infrastructure change that doesn't solve the current problem. The ap-southeast-1 region is operational — it just has a misconfigured security group." },
      ],
      correctRationaleId: "r-fix-sg-root",
      feedback: {
        perfect: "Correct root cause analysis. The ALB is healthy but Route 53 health checkers can't reach it due to a security group change. Restoring the health checker IP ranges fixes the false-negative health check.",
        partial: "Changing the health check type doesn't fix the connectivity issue — the security group blocks all health checker IPs regardless of protocol. The fix must be at the security group level.",
        wrong: "Disabling health checks to fix a misconfigured security group trades one problem for a worse one. Route 53 health checks are there for real failure detection. Fix the security group, not the health check.",
      },
    },
  ],
  hints: [
    "Route 53 health checks use specific IP ranges that must be allowed through Security Groups and NACLs. These are documented in the aws.json endpoint file under ROUTE53_HEALTHCHECKS.",
    "TTL controls how long resolvers cache a record — but resolvers can override your TTL with their own maximum. Route 53 changes propagate immediately at Route 53, but cached records persist at resolvers.",
    "A shallow health check that returns 200 regardless of backend state is worse than no health check — it gives false confidence that the application is healthy when it isn't.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Route 53 is often the last line of defense during a regional outage. Engineers who understand the difference between health check types, TTL behavior at resolver layers, and common security group misconfigurations can dramatically reduce mean time to recover during incidents. These scenarios reflect real on-call situations at companies with multi-region architectures.",
  toolRelevance: ["AWS Console", "Route 53 Console", "AWS CLI", "dig/nslookup"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
