import type { LabManifest } from "../../types/manifest";

export const containerOrchestrationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "container-orchestration",
  version: 1,
  title: "Container Orchestration Decisions",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["containers", "kubernetes", "ecs", "docker", "orchestration"],
  description:
    "Make critical container orchestration decisions around resource requests, health checks, scheduling constraints, and failure recovery for production Kubernetes and ECS workloads.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Configure container resource requests and limits to prevent noisy-neighbor problems",
    "Design effective liveness and readiness probes for containerized services",
    "Apply pod affinity and anti-affinity rules for availability and performance",
    "Select the correct container restart and failure handling strategy",
  ],
  sortOrder: 607,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "container-s1",
      title: "OOMKilled Containers in Production",
      context:
        "A Kubernetes deployment for a Java Spring Boot service is getting OOMKilled repeatedly. The pod spec sets memory requests at 256Mi and limits at 512Mi. The application is a JVM-based service. CloudWatch Container Insights shows the container hitting the 512Mi limit, then being terminated and restarted. The JVM heap is configured with `-Xmx256m`.",
      displayFields: [
        { label: "Memory Request", value: "256Mi", emphasis: "warn" },
        { label: "Memory Limit", value: "512Mi", emphasis: "critical" },
        { label: "JVM Heap (-Xmx)", value: "256m", emphasis: "warn" },
        { label: "OOMKill Rate", value: "~3x per hour", emphasis: "critical" },
        { label: "Container Memory at Kill", value: "512Mi (at limit)", emphasis: "critical" },
      ],
      actions: [
        { id: "increase-limit-fix-jvm", label: "Increase memory limit to 1Gi and set JVM heap to -Xmx700m to account for JVM off-heap overhead", color: "green" },
        { id: "increase-limit-only", label: "Increase memory limit to 1Gi without changing JVM settings", color: "yellow" },
        { id: "decrease-jvm-heap", label: "Decrease JVM heap from -Xmx256m to -Xmx128m to leave more room in the container", color: "red" },
        { id: "set-no-limit", label: "Remove the memory limit entirely to let the JVM use what it needs", color: "orange" },
      ],
      correctActionId: "increase-limit-fix-jvm",
      rationales: [
        { id: "r-container-s1-correct", text: "JVM memory usage exceeds the -Xmx heap setting because the JVM also uses off-heap memory (metaspace, thread stacks, direct buffers, code cache) — typically 200–400 MB beyond the heap. With -Xmx256m, the JVM often uses 400–600 MB total. Setting limit to 1Gi and -Xmx to 700m leaves ~300Mi for off-heap overhead, matching actual JVM memory behavior." },
        { id: "r-container-s1-increase-only", text: "Increasing the limit without aligning the JVM heap setting means the JVM will now allocate up to 1Gi heap plus off-heap overhead, potentially consuming more than 1Gi total. The OOMKills may still occur at the new higher limit." },
        { id: "r-container-s1-decrease", text: "Decreasing the heap to 128m will cause more frequent garbage collection and out-of-heap errors inside the JVM. The container OOMKill is caused by off-heap memory, not heap size — making heap smaller doesn't fix the issue." },
        { id: "r-container-s1-no-limit", text: "Removing the memory limit allows one service to consume unlimited node memory, causing other pods on the same node to OOMKill. Kubernetes strongly recommends setting limits on all containers in production clusters." },
      ],
      correctRationaleId: "r-container-s1-correct",
      feedback: {
        perfect: "Correct. JVM containers require limits that account for both heap (-Xmx) and off-heap overhead. The limit must be larger than -Xmx, not equal to it.",
        partial: "Increasing the limit alone is insufficient — the JVM will consume up to the new limit plus off-heap, likely causing OOMKills again at 1Gi. You must set -Xmx explicitly below the container limit.",
        wrong: "JVM memory management requires understanding both heap (-Xmx) and off-heap usage. The container limit must be higher than -Xmx to accommodate JVM overhead. Never remove memory limits in shared Kubernetes clusters.",
      },
    },
    {
      type: "action-rationale",
      id: "container-s2",
      title: "Health Check Probe Misconfiguration",
      context:
        "A Kubernetes deployment for an Express.js API has a livenessProbe configured on `/health` with an initialDelaySeconds of 5 and failureThreshold of 3 (10-second period). The application takes 25–35 seconds to start (loads large ML model from S3 on startup). Every new pod is being killed and restarted 3 times before it successfully starts.",
      displayFields: [
        { label: "App Startup Time", value: "25–35 seconds (ML model load)", emphasis: "warn" },
        { label: "livenessProbe initialDelaySeconds", value: "5", emphasis: "critical" },
        { label: "livenessProbe periodSeconds", value: "10", emphasis: "normal" },
        { label: "livenessProbe failureThreshold", value: "3 (kills after 30s from first check)", emphasis: "critical" },
        { label: "Effect", value: "Pods killed during startup, restart loop", emphasis: "critical" },
      ],
      actions: [
        { id: "fix-probes-separate", label: "Set livenessProbe initialDelaySeconds to 60, add a readinessProbe with initialDelaySeconds 30 that gates traffic", color: "green" },
        { id: "remove-liveness", label: "Remove the livenessProbe entirely to stop the restart loop", color: "yellow" },
        { id: "increase-initial-delay-only", label: "Change livenessProbe initialDelaySeconds from 5 to 60", color: "blue" },
        { id: "reduce-startup-time", label: "Refactor the application to load the ML model lazily after startup", color: "orange" },
      ],
      correctActionId: "fix-probes-separate",
      rationales: [
        { id: "r-container-s2-correct", text: "Two separate probes serve different purposes: readinessProbe (initialDelay 30s) controls when traffic is routed to the pod — it gates traffic until the ML model is loaded. livenessProbe (initialDelay 60s) detects if a running pod becomes deadlocked and restarts it. Together they prevent both traffic-before-ready and zombie-pod problems." },
        { id: "r-container-s2-remove", text: "Removing the livenessProbe fixes the restart loop but leaves no mechanism to detect and recover deadlocked or frozen pods. In production, liveness probes are critical for automatic recovery from application hangs." },
        { id: "r-container-s2-initial-delay", text: "Increasing initialDelaySeconds to 60 fixes the restart loop for liveness but does nothing to prevent traffic from routing to the pod before the ML model is loaded (during seconds 0–35). Users would receive errors until the application is fully ready. A readinessProbe is needed to gate traffic." },
        { id: "r-container-s2-lazy", text: "Lazy loading is a valid architectural improvement but is a code change that takes engineering time. The probe misconfiguration can be fixed in minutes with a config change. Fix the operational problem first, then optimize the code." },
      ],
      correctRationaleId: "r-container-s2-correct",
      feedback: {
        perfect: "Correct. Liveness and readiness probes are different tools: readiness gates traffic, liveness triggers restarts. Both are needed and both need appropriate initial delays for slow-starting containers.",
        partial: "Fixing the initialDelay stops the restart loop but doesn't protect users from receiving requests before the application is ready. Always pair a readinessProbe with a livenessProbe for slow-starting services.",
        wrong: "Kubernetes probe design: livenessProbe = 'is the app alive?' (restart if no), readinessProbe = 'is the app ready for traffic?' (remove from load balancer if no). Both need initialDelaySeconds that account for startup time.",
      },
    },
    {
      type: "action-rationale",
      id: "container-s3",
      title: "Pod Scheduling Causing Single-AZ Failure",
      context:
        "A production Kubernetes deployment runs 4 replicas of a critical API. During an AZ-a outage, all 4 pods were running in AZ-a and went offline simultaneously. The deployment had no scheduling constraints. The application was completely unavailable for 8 minutes until pods rescheduled in surviving AZs.",
      displayFields: [
        { label: "Replicas", value: "4", emphasis: "normal" },
        { label: "AZ Distribution at Outage", value: "All 4 in us-east-1a", emphasis: "critical" },
        { label: "Current Scheduling Constraints", value: "None", emphasis: "critical" },
        { label: "Outage Duration", value: "8 minutes during AZ failure", emphasis: "critical" },
        { label: "Available AZs", value: "us-east-1a, us-east-1b, us-east-1c", emphasis: "normal" },
      ],
      actions: [
        { id: "pod-topology-spread", label: "Add topologySpreadConstraints to spread pods evenly across AZs with maxSkew: 1", color: "green" },
        { id: "node-affinity-multi-az", label: "Add nodeAffinity rules requiring pods to only run in specific AZs", color: "yellow" },
        { id: "increase-replicas", label: "Increase replicas from 4 to 12 to reduce the probability of all landing in one AZ", color: "blue" },
        { id: "pod-anti-affinity-hostname", label: "Add podAntiAffinity on hostname to prevent two pods from running on the same node", color: "orange" },
      ],
      correctActionId: "pod-topology-spread",
      rationales: [
        { id: "r-container-s3-correct", text: "topologySpreadConstraints with topologyKey: topology.kubernetes.io/zone and maxSkew: 1 enforces that pods are spread as evenly as possible across availability zones. With 4 replicas and 3 AZs, distribution would be 2-1-1. During an AZ failure, at least 2 pods in other AZs continue serving. This is the purpose-built Kubernetes primitive for AZ spread." },
        { id: "r-container-s3-affinity", text: "nodeAffinity rules that require specific AZs would prevent pods from running in the non-required AZs. This creates the opposite problem — you'd force pods into fewer AZs rather than spreading them." },
        { id: "r-container-s3-replicas", text: "More replicas doesn't solve the scheduling problem. With default scheduling and 12 replicas, Kubernetes can still pack all 12 into one AZ depending on node availability and resource pressure. You need an explicit spread constraint." },
        { id: "r-container-s3-hostname", text: "Anti-affinity on hostname prevents co-location on the same node but doesn't guarantee AZ spread. Nodes in the same AZ are different hostnames — 4 pods could all be on different nodes in the same AZ." },
      ],
      correctRationaleId: "r-container-s3-correct",
      feedback: {
        perfect: "Correct. topologySpreadConstraints is the modern Kubernetes mechanism for enforcing pod distribution across zones. It replaced the older podAntiAffinity zone patterns.",
        partial: "Node-level anti-affinity helps with node failures but not AZ failures. You need topology-aware constraints at the zone level, not just the node level.",
        wrong: "The failure was single-AZ concentration. The fix must explicitly control zone distribution. topologySpreadConstraints is the Kubernetes-native way to declare 'spread these pods evenly across zones'.",
      },
    },
  ],
  hints: [
    "JVM containers need memory limits higher than -Xmx because the JVM uses significant off-heap memory beyond the configured heap size.",
    "Use readinessProbe to gate traffic and livenessProbe to detect hangs — they serve different purposes and both need correct initialDelaySeconds for slow-starting apps.",
    "topologySpreadConstraints with topologyKey: topology.kubernetes.io/zone is the Kubernetes-native way to guarantee multi-AZ pod distribution.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Container orchestration depth — especially around resource management, health probes, and scheduling topology — is a strong signal of production Kubernetes experience. These exact scenarios appear in platform engineer and SRE interviews and in real incident post-mortems at every company running containers at scale.",
  toolRelevance: ["Kubernetes", "AWS ECS", "Helm", "AWS EKS", "kubectl"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
