import type { LabManifest } from "../../types/manifest";

export const containerSecurityScanningLab: LabManifest = {
  schemaVersion: "1.1",
  id: "container-security-scanning",
  version: 1,
  title: "Container Security Scanning",
  tier: "beginner",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["security", "containers", "docker", "ecr", "kubernetes", "cve", "supply-chain"],
  description:
    "Investigate container image vulnerability scan results and CI/CD pipeline security findings to make deployment decisions. Practice interpreting CVE severity, evaluating base image choices, and enforcing security gates in container pipelines.",
  estimatedMinutes: 14,
  learningObjectives: [
    "Interpret container image vulnerability scan reports from Amazon ECR",
    "Distinguish between exploitable and theoretical CVE risks in container context",
    "Apply security gate thresholds for container image promotion to production",
    "Identify insecure Dockerfile patterns that introduce vulnerabilities",
    "Evaluate base image selection decisions for security and maintenance impact",
  ],
  sortOrder: 509,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "ccs-s1-ecr-scan-results",
      title: "ECR Image Scan Before Production Deployment",
      objective:
        "A new Docker image `payment-service:v2.3.1` has passed functional testing and is ready for production deployment. Review the ECR scan results and decide whether to promote to production, hold for remediation, or block entirely.",
      investigationData: [
        {
          id: "src1",
          label: "Amazon ECR Enhanced Scanning Results",
          content:
            "Image: payment-service:v2.3.1\nBase: node:18-alpine\nScan date: 2026-03-28\n\nCRITICAL (2):\n  - CVE-2024-21626 (runc): CVSS 8.6 — Container escape via /proc/self/cwd manipulation. IN-PACKAGE: runc 1.1.11. FIX AVAILABLE: 1.1.12\n  - CVE-2023-44487 (HTTP/2 Rapid Reset): CVSS 7.5 — DoS via HTTP/2 stream manipulation. IN-PACKAGE: node 18.18.0. FIX AVAILABLE: node 18.20.4\n\nHIGH (7): Multiple OpenSSL and zlib vulnerabilities, fixes available for 5/7\nMEDIUM (23): Miscellaneous library vulnerabilities\nLOW (41): Informational",
          isCritical: true,
        },
        {
          id: "src2",
          label: "Application Context",
          content:
            "Service: payment-service\nFunction: Processes credit card authorizations via external payment gateway\nExposure: Internet-facing via ALB + AWS WAF\nData handled: Payment card tokens, transaction amounts\nCompliance: PCI-DSS in scope\nDeployment urgency: Feature freeze in 2 days; release manager requesting immediate promotion",
          isCritical: false,
        },
        {
          id: "src3",
          label: "CVE Exploitability Assessment",
          content:
            "CVE-2024-21626 (runc): Exploit PoC publicly available. Requires local file system access or malicious container image. Risk in Kubernetes: HIGH if attacker gains code execution in the container.\n\nCVE-2023-44487: Exploitable by any HTTP/2 client sending rapid stream resets. AWS WAF has a managed rule for mitigation. Service does use HTTP/2 for external clients.",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Security Gate Policy (Company Policy)",
          content:
            "Production promotion gates:\n  - CRITICAL vulnerabilities with public exploits: BLOCK (must remediate before promotion)\n  - CRITICAL vulnerabilities without public exploit: HOLD (security team exception required)\n  - HIGH vulnerabilities: Exception required for >3 unfixed HIGH CVEs\n  - Release deadline exceptions: Require VP Engineering + CISO sign-off",
          isCritical: false,
        },
      ],
      actions: [
        { id: "a1", label: "Approve for production deployment — WAF mitigates the HTTP/2 CVE and the runc CVE requires local access", color: "red" },
        { id: "a2", label: "Block promotion — rebuild image with updated runc and node 18.20.4 base, rescan before resubmitting", color: "green" },
        { id: "a3", label: "Approve with exceptions documented — production release cannot be delayed", color: "orange" },
        { id: "a4", label: "Deploy to staging only and monitor for 7 days before production promotion", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "CVE-2024-21626 has a publicly available exploit. Company policy explicitly requires blocking images with exploitable CRITICAL CVEs. The fix (runc 1.1.12) is available — there is no reason not to remediate." },
        { id: "r2", text: "Rebuilding with updated base image packages resolves both CRITICAL CVEs. Node 18.20.4 is an LTS release that can be dropped in with a one-line Dockerfile change." },
        { id: "r3", text: "WAF mitigation reduces but does not eliminate the HTTP/2 CVE risk. The runc CVE enabling container escape is not mitigated by WAF. PCI-DSS scope makes this higher risk." },
        { id: "r4", text: "Staging deployment doesn't address the blocking issue. The CVEs are present in the image regardless of environment." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Company policy is clear: CRITICAL CVEs with public exploits block production promotion. The fix is a one-line base image update — remediation is straightforward.",
        partial: "You recognized the risk but the response doesn't enforce the security gate. Documenting exceptions for exploitable CRITICAL CVEs on a PCI-DSS in-scope service is insufficient.",
        wrong: "An exploitable container escape CVE (runc) on an internet-facing PCI-DSS service is a blocker. Release deadlines do not override security gates for exploitable CRITICAL vulnerabilities.",
      },
    },
    {
      type: "investigate-decide",
      id: "ccs-s2-dockerfile-review",
      title: "Dockerfile Security Review",
      objective:
        "A developer submitted a Dockerfile for a new microservice for your review. Identify the most critical security issue in the Dockerfile configuration and recommend the correct remediation.",
      investigationData: [
        {
          id: "src1",
          label: "Dockerfile Under Review",
          content:
            "FROM ubuntu:latest\n\nRUN apt-get update && apt-get install -y curl wget python3 pip nodejs npm git\n\n# Copy application files\nCOPY . /app\nWORKDIR /app\n\n# Install dependencies\nRUN pip install -r requirements.txt\nRUN npm install\n\n# Set environment variables\nENV DATABASE_URL=postgres://admin:Sup3rS3cr3t@prod-db.internal:5432/app\nENV API_KEY=sk-live-abc123def456\n\n# Expose application port\nEXPOSE 8080\n\n# Run as root\nCMD [\"python3\", \"app.py\"]",
          isCritical: true,
        },
        {
          id: "src2",
          label: "Static Analysis Results (Hadolint)",
          content:
            "DL3007: Using latest is best avoided; use specific image tags\nDL3008: Pin versions in apt-get install\nDL3042: Avoid use of pip without hash checking\nSC2086: Double quote ENV values\nSEC001: Credentials detected in ENV instructions (line 15, 16)\nSEC002: Container running as root (no USER instruction)",
          isCritical: true,
        },
        {
          id: "src3",
          label: "Runtime Context",
          content:
            "This service will run in EKS production namespace\nPod Security Policy: Restricts privileged containers but not root-running containers\nKubernetes RBAC: Service account has read access to ConfigMaps and Secrets\nImage registry: Amazon ECR (private)\nCI/CD: GitHub Actions — Dockerfile stored in public-facing repository",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Developer's Justification",
          content:
            "Developer comment: 'The credentials are internal endpoints only, not exposed to the internet. Using ubuntu:latest makes updates automatic. Running as root is needed for port binding on 8080.'",
          isCritical: false,
        },
      ],
      actions: [
        { id: "a1", label: "Approve with a note to fix the tag pinning before the next release", color: "red" },
        { id: "a2", label: "Reject — require removal of hardcoded credentials (use Secrets Manager), add non-root USER, pin base image tag, and move secrets to build-time injection", color: "green" },
        { id: "a3", label: "Approve with a comment that the developer should consider removing credentials eventually", color: "red" },
        { id: "a4", label: "Reject only for the ubuntu:latest tag issue and re-review after pinning", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Hardcoded credentials in a Dockerfile that is stored in a repository — even if currently private — are a critical security issue. If the repo is ever made public or cloned, credentials are exposed in plaintext and in git history." },
        { id: "r2", text: "The Dockerfile has three blocking issues that all must be addressed together: hardcoded credentials (critical), root execution (high), and unpinned base image (high). All three must be remediated before approval." },
        { id: "r3", text: "Port 8080 does not require root in Linux. The developer's justification is incorrect — unprivileged processes can bind to ports above 1024." },
        { id: "r4", text: "The unpinned tag is a significant issue but secondary to hardcoded database passwords and API keys being committed to source control." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Three critical Dockerfile issues all require remediation: hardcoded credentials are the most urgent, root execution is a privilege escalation risk, and unpinned base images cause supply chain drift.",
        partial: "You identified some issues but didn't block on all critical findings. Hardcoded credentials in a Dockerfile are a blocker regardless of whether the repo is currently private.",
        wrong: "Approving a Dockerfile with hardcoded production database credentials and API keys — even with a comment to fix later — is unacceptable. Credentials committed to source control cannot be 'fixed later'; they must be considered compromised.",
      },
    },
    {
      type: "investigate-decide",
      id: "ccs-s3-runtime-threat",
      title: "Suspicious Container Runtime Activity",
      objective:
        "Falco (runtime security monitoring) has generated alerts for a container in the production Kubernetes cluster. Investigate the evidence and decide on the appropriate response.",
      investigationData: [
        {
          id: "src1",
          label: "Falco Runtime Alerts",
          content:
            "2026-03-28T02:33:11Z CRITICAL: A shell was spawned in a container (pod: api-service-7d9f-xkp2q, container: api-server, shell: /bin/bash, parent: python3)\n2026-03-28T02:33:45Z HIGH: Sensitive file read in container (file: /etc/shadow, pod: api-service-7d9f-xkp2q)\n2026-03-28T02:34:02Z HIGH: Network tool executed (tool: curl, pod: api-service-7d9f-xkp2q, destination: 198.51.100.88:4444)\n2026-03-28T02:34:18Z CRITICAL: File written outside known paths (path: /tmp/.evil, pod: api-service-7d9f-xkp2q)",
          isCritical: true,
        },
        {
          id: "src2",
          label: "Application Baseline",
          content:
            "api-service is a Python REST API. Normal behavior:\n  - Runs python3 app.py (no shell processes)\n  - Only outbound connections to internal services (10.0.0.0/8)\n  - Never reads /etc/shadow\n  - Never writes to /tmp\n\nLast deployment: 6 days ago (no code changes since)",
          isCritical: false,
        },
        {
          id: "src3",
          label: "Pod Network Activity",
          content:
            "Recent connections from api-service-7d9f-xkp2q:\n  10.0.1.45:5432 (expected — database)\n  10.0.2.88:6379 (expected — Redis)\n  198.51.100.88:4444 (UNEXPECTED — external IP, reverse shell port)\n  198.51.100.88 geolocates to: Known threat actor infrastructure (per threat intel feed)",
          isCritical: true,
        },
        {
          id: "src4",
          label: "Recent CVE Context",
          content:
            "CVE-2026-1234 (hypothetical): Critical RCE in the Python library 'webframework' version 2.1.3, which is used by api-service. PoC exploit published 72 hours ago. api-service is using webframework 2.1.3. Exploit delivers a reverse shell via a crafted HTTP request.",
          isCritical: true,
        },
      ],
      actions: [
        { id: "a1", label: "Restart the affected pod to clear the active shell session", color: "yellow" },
        { id: "a2", label: "Isolate the pod (NetworkPolicy deny-all), preserve forensics (container snapshot), then kill the pod and redeploy from clean image with patched library", color: "green" },
        { id: "a3", label: "Alert the development team to patch the library and redeploy during next maintenance window", color: "red" },
        { id: "a4", label: "Kill the pod immediately and redeploy from the existing image", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "The Falco alerts show an active reverse shell (bash spawned by python3, connection to known threat actor IP on port 4444), credential access attempt (/etc/shadow), and dropper file creation (/tmp/.evil) — this is an active exploitation of CVE-2026-1234." },
        { id: "r2", text: "Isolating the pod immediately cuts the reverse shell C2 channel. Forensic snapshot preserves memory and disk artifacts. Killing and redeploying from a patched image eliminates the vulnerability." },
        { id: "r3", text: "Restarting without isolation first allows the reverse shell to re-establish from the new pod instance since the vulnerable code is still running." },
        { id: "r4", text: "Redeploying from the existing (unpatched) image reintroduces the same vulnerability. The new pod will be re-exploited within minutes using the same CVE." },
      ],
      correctRationaleId: "r1",
      feedback: {
        perfect: "Correct. Isolate the active C2 channel, preserve forensics, then redeploy from a patched image. Redeploying from an unpatched image just restarts the attack cycle.",
        partial: "Your containment is partially correct. Check whether redeploying from the existing image addresses the root cause — redeploying without patching means the pod will be immediately re-exploited.",
        wrong: "An active reverse shell to known threat actor infrastructure requires immediate isolation and patching. Scheduling remediation for a maintenance window during active exploitation is unacceptable.",
      },
    },
  ],
  hints: [
    "CVE severity (CVSS score) must be combined with exploitability context — a CVSS 9.8 CVE that requires physical access is less urgent than a CVSS 7.5 CVE with a public PoC exploit and network access.",
    "Credentials in Dockerfile ENV instructions are baked into every image layer and visible in `docker history` — they must be treated as compromised and rotated even if the registry is private.",
    "A reverse shell connection from a container to an external IP on port 4444 is one of the most definitive runtime indicators of container compromise — isolate immediately, don't just restart.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Container security is one of the fastest-growing disciplines in cloud security. Engineers who understand image scanning, Dockerfile hardening, and Kubernetes runtime security are sought for DevSecOps, platform security, and cloud-native application security roles.",
  toolRelevance: ["Amazon ECR", "Amazon Inspector", "Trivy", "Snyk", "Hadolint", "Falco", "OPA Gatekeeper", "AWS GuardDuty EKS Protection"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
