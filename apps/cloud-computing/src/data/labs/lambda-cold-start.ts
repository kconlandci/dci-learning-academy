import type { LabManifest } from "../../types/manifest";

export const lambdaColdStartLab: LabManifest = {
  schemaVersion: "1.1",
  id: "lambda-cold-start",
  version: 1,
  title: "Lambda Cold Start Diagnosis",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "lambda", "serverless", "performance", "cold-start"],
  description:
    "Investigate Lambda cold start problems using CloudWatch metrics and X-Ray traces, then decide on the right mitigation strategy.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify cold start signatures in CloudWatch and X-Ray traces",
    "Differentiate between cold start causes: runtime, memory, VPC, package size",
    "Select appropriate mitigations based on the cold start root cause",
    "Evaluate tradeoffs between Provisioned Concurrency cost and latency improvement",
  ],
  sortOrder: 103,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "lambda-cold-s1",
      title: "API Gateway Lambda Latency Spike",
      objective:
        "Users report intermittent 3–5 second delays on your login API. The API is backed by a Lambda function. Determine the root cause and choose the correct remediation.",
      investigationData: [
        {
          id: "cloudwatch-duration",
          label: "CloudWatch: Lambda Duration (p99)",
          content:
            "p50: 45ms | p95: 180ms | p99: 4,200ms\nThe p99 spikes occur approximately every 15–20 minutes, correlating with periods of low traffic.",
          isCritical: true,
        },
        {
          id: "xray-trace",
          label: "X-Ray Trace: Slow Request",
          content:
            "Initialization: 3,850ms\n  └─ Function initialization: 3,850ms\n     └─ Loading /var/task: 2,100ms (node_modules)\n     └─ DB connection pool init: 1,600ms\nInvocation: 350ms\nTotal: 4,200ms",
          isCritical: true,
        },
        {
          id: "lambda-config",
          label: "Lambda Configuration",
          content:
            "Runtime: Node.js 20.x\nMemory: 128 MB\nTimeout: 30s\nPackage size: 48 MB (zipped)\nVPC: Not configured\nProvisioned Concurrency: 0",
        },
        {
          id: "invocation-pattern",
          label: "CloudWatch: Invocation Pattern",
          content:
            "08:00–09:00 UTC: 2,400 invocations (business hours start)\n09:00–17:00 UTC: steady ~150/min\n17:00–18:00 UTC: drops to <5/min\n18:00–08:00 UTC: <1/min\nCold starts occur after >10min of inactivity.",
        },
        {
          id: "package-analysis",
          label: "Lambda Package Contents",
          content:
            "Total zipped: 48 MB (unzipped: 156 MB)\nLargest dependencies:\n  - aws-sdk: 38 MB (unzipped)\n  - pg (postgres driver): 4 MB\n  - express: 2 MB\n  - lodash: 1.5 MB\nNote: aws-sdk v2 is bundled — Lambda runtime includes it natively for Node.js 18 and earlier.",
        },
      ],
      actions: [
        { id: "provisioned-concurrency", label: "Enable Provisioned Concurrency (keep 2 instances warm)", color: "green" },
        { id: "increase-memory", label: "Increase Lambda memory from 128 MB to 1024 MB", color: "yellow" },
        { id: "reduce-package-size", label: "Remove bundled aws-sdk v2, switch to Lambda Layers for pg driver", color: "blue" },
        { id: "scheduled-warmer", label: "Create EventBridge rule to invoke Lambda every 5 minutes as a keep-warm ping", color: "orange" },
      ],
      correctActionId: "reduce-package-size",
      rationales: [
        { id: "r-package-root-cause", text: "X-Ray shows 2,100ms is spent loading /var/task (node_modules). The aws-sdk v2 (38 MB) is bundled unnecessarily — Node.js 20.x includes AWS SDK v3 natively. Removing it reduces package from 48 MB to ~10 MB, cutting load time by ~80%." },
        { id: "r-provisioned-expensive", text: "Provisioned Concurrency works but costs money 24/7 to keep instances warm. It's the right answer when cold starts can't be reduced further, not as a first step when the root cause is package bloat." },
        { id: "r-memory-minor", text: "Increasing memory speeds up code execution and may slightly reduce initialization time, but the bottleneck is I/O (loading a 156 MB unzipped package), not compute. It addresses a symptom, not the cause." },
        { id: "r-warmer-fragile", text: "Keep-warm pings are a fragile workaround — they don't work during traffic spikes that exceed the single warm instance, and they waste invocations when traffic is genuinely zero." },
      ],
      correctRationaleId: "r-package-root-cause",
      feedback: {
        perfect: "Excellent root cause analysis. The X-Ray trace clearly shows 2,100ms in package loading. Removing the bundled aws-sdk v2 (which is already in the Lambda runtime) is the right fix — reduce the problem, don't just mask it.",
        partial: "You've identified a valid mitigation but not the optimal one. The X-Ray trace points directly to package loading time as the primary driver of cold start latency. Fix the root cause before paying for Provisioned Concurrency.",
        wrong: "Re-read the X-Ray trace: the Initialization phase shows 2,100ms loading node_modules. This is a package size problem, not a memory or concurrency problem. Provisioned Concurrency and warmers are workarounds; reducing package size is the fix.",
      },
    },
    {
      type: "investigate-decide",
      id: "lambda-cold-s2",
      title: "VPC Lambda Startup Delay",
      objective:
        "A new Lambda function connecting to an RDS database in a private VPC is experiencing 8–12 second cold starts in production. The same code runs in <200ms when warm. Identify the cause and recommend the correct solution.",
      investigationData: [
        {
          id: "xray-vpc-trace",
          label: "X-Ray Trace: Cold Start Breakdown",
          content:
            "Initialization: 9,400ms\n  └─ ENI attachment: 8,900ms\n  └─ Function init: 500ms\nInvocation: 180ms\nTotal: 9,580ms",
          isCritical: true,
        },
        {
          id: "lambda-vpc-config",
          label: "Lambda VPC Configuration",
          content:
            "VPC: vpc-0a1b2c3d\nSubnets: 2 private subnets (us-east-1a, us-east-1b)\nSecurity Group: sg-lambda-rds\nENI pre-warming: Not configured\nRuntime: Python 3.12\nMemory: 512 MB\nPackage size: 8 MB",
          isCritical: true,
        },
        {
          id: "rds-config",
          label: "RDS Instance Configuration",
          content:
            "Engine: PostgreSQL 15.3\nInstance: db.t3.medium\nMulti-AZ: Yes\nEndpoint: prod-db.cluster-xyz.us-east-1.rds.amazonaws.com\nVPC: Same VPC as Lambda\nSecurity Group: sg-rds (allows 5432 from sg-lambda-rds)",
        },
        {
          id: "traffic-pattern",
          label: "Lambda Invocation Pattern",
          content:
            "Function invoked by API Gateway.\nConcurrency: peaks at 45 concurrent executions during business hours.\nOff-hours traffic: near-zero (1–3 invocations/hour).\nCold starts: occur at every traffic ramp-up.",
        },
      ],
      actions: [
        { id: "remove-vpc", label: "Remove Lambda from VPC and use RDS Proxy with IAM auth from public subnet", color: "orange" },
        { id: "provisioned-concurrency-vpc", label: "Enable Provisioned Concurrency to pre-attach ENIs before traffic", color: "green" },
        { id: "increase-memory-vpc", label: "Increase Lambda memory to 3008 MB to reduce ENI attachment time", color: "red" },
        { id: "rds-proxy", label: "Add RDS Proxy but keep Lambda in VPC, use Provisioned Concurrency for pre-warming", color: "yellow" },
      ],
      correctActionId: "provisioned-concurrency-vpc",
      rationales: [
        { id: "r-eni-preattach", text: "The X-Ray trace shows 8,900ms of the cold start is ENI attachment — an unavoidable cost of VPC-connected Lambdas. Provisioned Concurrency keeps pre-initialized execution environments with ENIs already attached, eliminating this overhead entirely for the pre-warmed instances." },
        { id: "r-remove-vpc-insecure", text: "Removing Lambda from the VPC defeats the purpose of private RDS networking. RDS should not be publicly accessible, and accessing it from a public subnet introduces significant security risk." },
        { id: "r-memory-irrelevant", text: "Memory allocation has no effect on ENI attachment time. ENI attachment is a network-layer operation, not a compute-bound one." },
        { id: "r-rds-proxy-partial", text: "RDS Proxy helps with connection pooling but doesn't address ENI attachment cold start time. You still need Provisioned Concurrency to eliminate the ENI wait." },
      ],
      correctRationaleId: "r-eni-preattach",
      feedback: {
        perfect: "Correct. ENI attachment is the dominant cold start cost for VPC Lambdas and cannot be reduced — only avoided by pre-initializing execution environments with Provisioned Concurrency.",
        partial: "You've identified the VPC as the problem area but the solution is incomplete. RDS Proxy doesn't help ENI attachment time. Provisioned Concurrency is the direct solution for VPC cold start latency.",
        wrong: "The X-Ray trace is the key: 8,900ms is ENI attachment, which is VPC infrastructure overhead. Memory doesn't affect this. Removing from VPC breaks security. Provisioned Concurrency is the correct fix.",
      },
    },
    {
      type: "investigate-decide",
      id: "lambda-cold-s3",
      title: "Sudden Cold Start Regression After Deployment",
      objective:
        "After deploying a new Lambda version this morning, cold starts increased from 800ms to 4,500ms. No infrastructure changes were made — only application code was updated. Find the regression and decide how to respond.",
      investigationData: [
        {
          id: "deployment-diff",
          label: "Deployment Change Summary",
          content:
            "Version 23 → Version 24\nChanged files:\n  - handler.js (minor logic fix)\n  - package.json (added 3 new dependencies)\nNew dependencies added:\n  - moment.js: 67 KB (but loads all locales at startup)\n  - axios: 89 KB\n  - sharp (image processing): 31 MB native binary",
          isCritical: true,
        },
        {
          id: "xray-compare",
          label: "X-Ray: v23 vs v24 Cold Start",
          content:
            "Version 23:\n  Initialization: 780ms\n    └─ Module loading: 380ms\n    └─ App setup: 400ms\n\nVersion 24:\n  Initialization: 4,450ms\n    └─ Module loading: 3,900ms  ← 10x increase\n    └─ App setup: 550ms",
          isCritical: true,
        },
        {
          id: "lambda-size",
          label: "Lambda Package Size Comparison",
          content:
            "Version 23: 14 MB (zipped)\nVersion 24: 47 MB (zipped)\nDelta: +33 MB — primarily the 'sharp' native binary and moment locale files.",
        },
        {
          id: "usage-analysis",
          label: "Code Usage Analysis",
          content:
            "sharp: used in 1 out of 12 handler routes (thumbnail generation)\nmoment: used for date formatting in 2 routes\naxios: used in 4 routes for external API calls\nNote: moment loads all 72 locale files on require() by default.",
        },
      ],
      actions: [
        { id: "rollback-v23", label: "Immediately rollback to Version 23 and audit dependencies before re-deploying", color: "green" },
        { id: "lazy-load-sharp", label: "Keep v24 live, refactor sharp to lazy-load only when thumbnail route is called", color: "yellow" },
        { id: "increase-memory-v24", label: "Increase memory to 2048 MB to speed up module loading in v24", color: "orange" },
        { id: "replace-moment", label: "Replace moment with date-fns and optimize sharp loading, then re-deploy", color: "blue" },
      ],
      correctActionId: "rollback-v23",
      rationales: [
        { id: "r-rollback-first", text: "The production function is degraded right now. Rolling back to v23 restores service immediately. Then the dependency audit and optimization should happen in a development environment before re-deploying. Don't optimize a broken production deployment in place." },
        { id: "r-lazy-load-inplace", text: "Lazy-loading sharp is the right long-term fix, but implementing it on a live production function that's already experiencing 4.5s cold starts adds risk. Rollback first, fix properly, test, then re-deploy." },
        { id: "r-memory-workaround", text: "More memory will speed up module loading somewhat, but 3,900ms of loading 47 MB of modules is primarily I/O — not CPU. This is a workaround for a problem that should be fixed at the code level." },
        { id: "r-optimize-inplace", text: "Optimizing date-fns and sharp is correct for the re-deployment, but doing it in place on a degraded production function is risky. Rollback restores user experience while you fix it properly." },
      ],
      correctRationaleId: "r-rollback-first",
      feedback: {
        perfect: "Correct incident response. The first priority is restoring service — rollback to v23 does that immediately. Optimizing the dependencies is important but belongs in the next deployment cycle, not in an active incident.",
        partial: "The optimization approach is technically correct but applied at the wrong time. During an active regression, rollback first to restore service. Then fix the root cause in development before re-deploying.",
        wrong: "Production is degraded right now. The correct response is to restore service (rollback) first, then fix the underlying issue. Adding memory is a band-aid that doesn't address the 33 MB package size regression.",
      },
    },
  ],
  hints: [
    "X-Ray traces break down cold starts into Initialization and Invocation phases. The Initialization phase reveals where time is actually spent — module loading, ENI attachment, or connection setup.",
    "VPC-connected Lambdas have an unavoidable ENI attachment cost on cold starts. Provisioned Concurrency is the only way to eliminate it (not reduce it — eliminate it).",
    "Package size directly impacts cold start loading time. The biggest culprits are bundled SDKs that are already in the Lambda runtime, and large native binaries like image processing libraries.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Lambda cold start optimization is a real skill gap in serverless teams. The ability to read X-Ray traces and correctly identify whether a cold start is caused by package size, VPC ENI attachment, or initialization code separates reactive troubleshooters from engineers who prevent these issues from reaching production.",
  toolRelevance: ["AWS X-Ray", "CloudWatch", "Lambda Console", "AWS CLI"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
