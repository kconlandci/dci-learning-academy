import type { LabManifest } from "../../types/manifest";

export const devsecopsPipelineSecurityLab: LabManifest = {
  schemaVersion: "1.1",
  id: "devsecops-pipeline-security",
  version: 1,
  title: "DevSecOps Pipeline Security Integration",
  tier: "advanced",
  track: "cloud-security",
  difficulty: "challenging",
  accessLevel: "free",
  tags: ["security", "devsecops", "sast", "dast", "dependency-scanning", "shift-left", "cicd", "container-scanning"],
  description:
    "Integrate security scanning into CI/CD pipelines using the shift-left approach. Practice configuring SAST, DAST, dependency vulnerability scanning, and container image scanning at the correct pipeline stages, balancing security coverage with developer velocity and build time constraints.",
  estimatedMinutes: 13,
  learningObjectives: [
    "Place SAST, DAST, dependency scanning, and container scanning at the correct CI/CD pipeline stages",
    "Configure quality gates that block deployments for critical vulnerabilities without creating excessive friction",
    "Distinguish between SAST (static) and DAST (dynamic) scanning capabilities and limitations",
    "Design a secrets detection strategy that prevents credential leaks before they reach the repository",
    "Balance security scan thoroughness with pipeline execution time constraints",
  ],
  sortOrder: 513,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "dso-s1-sast-placement",
      title: "Placing SAST Scanning in the CI Pipeline",
      context:
        "Your team is adding static application security testing (SAST) to the CI/CD pipeline for a Java Spring Boot application. The pipeline has four stages: code commit, build, integration test, and deploy to staging. SAST scans take 8 minutes for the full codebase. Developers are concerned about pipeline slowdown. The security team requires that no code with critical SAST findings reaches the staging environment.",
      displayFields: [
        { label: "Application", value: "Java Spring Boot — 180K lines of code", emphasis: "normal" },
        { label: "SAST Scan Time", value: "8 minutes full scan, 90 seconds incremental", emphasis: "warn" },
        { label: "Pipeline Stages", value: "Commit → Build → Integration Test → Deploy to Staging", emphasis: "normal" },
        { label: "Requirement", value: "Block critical findings before staging deployment", emphasis: "critical" },
      ],
      actions: [
        { id: "a1", label: "Run a full SAST scan on every commit as a pre-commit hook before code enters the repository", color: "red" },
        { id: "a2", label: "Run incremental SAST on the build stage (scanning only changed files) and a full scan as a parallel job during integration testing, with a quality gate blocking deploy on critical findings", color: "green" },
        { id: "a3", label: "Run SAST only in a nightly scheduled pipeline to avoid slowing down developer workflows", color: "orange" },
        { id: "a4", label: "Run a full SAST scan after deployment to staging and roll back if critical findings are detected", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "An 8-minute pre-commit hook blocks every developer on every commit, creating unacceptable friction. Pre-commit hooks should be reserved for sub-second checks like linting and secrets detection." },
        { id: "r2", text: "Incremental SAST on build provides fast feedback (90 seconds) on changed code. A parallel full scan during integration testing covers the complete codebase without adding to the critical path. The quality gate before deploy ensures critical findings never reach staging." },
        { id: "r3", text: "Nightly-only scanning means developers discover vulnerabilities a day after introducing them, when context is lost. The requirement to block critical findings before staging is not met by a nightly schedule." },
        { id: "r4", text: "Scanning after deployment to staging means vulnerable code is already running in a staging environment. The requirement is to prevent code with critical findings from reaching staging at all." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Incremental SAST on build gives fast developer feedback, while a full parallel scan during integration testing provides complete coverage. The quality gate enforces the staging deployment requirement.",
        partial: "You're integrating SAST but not optimizing for both speed and coverage. Incremental scans on changed files plus full parallel scans provide the best balance.",
        wrong: "This placement either creates too much developer friction or fails to meet the requirement of blocking critical findings before staging. The correct placement balances speed and coverage.",
      },
    },
    {
      type: "action-rationale",
      id: "dso-s2-dependency-vulnerability",
      title: "Critical Dependency Vulnerability Blocking Production Deploy",
      context:
        "Your dependency scanner has detected a critical CVE (CVSS 9.8) in a transitive dependency (log4j 2.14.1) during the build stage of a production hotfix pipeline. The hotfix fixes a customer-impacting production bug. The vulnerable dependency is pulled in by a third-party SDK that has not released a patched version. The CVE allows remote code execution but requires the JNDI lookup feature which your application has disabled via JVM flags.",
      displayFields: [
        { label: "CVE", value: "CVE-2021-44228 — CVSS 9.8 (Critical RCE)", emphasis: "critical" },
        { label: "Dependency", value: "log4j 2.14.1 — transitive via third-party SDK", emphasis: "warn" },
        { label: "Mitigation", value: "JNDI lookup disabled via -Dlog4j2.formatMsgNoLookups=true", emphasis: "normal" },
        { label: "Pipeline Status", value: "Hotfix blocked by dependency scan quality gate", emphasis: "critical" },
        { label: "Business Impact", value: "Customer-impacting production bug waiting for fix", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Disable the dependency scanner quality gate to deploy the hotfix immediately", color: "red" },
        { id: "a2", label: "Document the existing JVM flag mitigation, add a time-boxed exception to the quality gate for this CVE with a 14-day remediation ticket, and deploy the hotfix", color: "green" },
        { id: "a3", label: "Wait for the third-party SDK to release a patched version before deploying the hotfix", color: "orange" },
        { id: "a4", label: "Fork the third-party SDK and manually patch log4j to 2.17.1 before deploying", color: "yellow" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Disabling the quality gate entirely removes the security control for all vulnerabilities, not just this one. Future deployments with unmitigated critical CVEs would pass without review." },
        { id: "r2", text: "The JVM flag mitigation effectively neutralizes the JNDI lookup attack vector. A documented, time-boxed exception acknowledges the risk, tracks remediation, and allows the customer-impacting hotfix to deploy. This balances security rigor with business impact." },
        { id: "r3", text: "Waiting for a third-party patch leaves customers impacted by the production bug indefinitely. The vulnerability is already mitigated by the JVM flag — the business risk of not deploying exceeds the residual security risk." },
        { id: "r4", text: "Forking a third-party SDK creates a permanent maintenance burden and delays the hotfix. This is an overreaction when the vulnerability is already mitigated at the JVM level." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. A documented, time-boxed exception with an existing mitigation is the mature DevSecOps approach. It balances security rigor with business urgency without permanently weakening the quality gate.",
        partial: "You're addressing the vulnerability but the approach is either too permissive (disabling the gate) or too rigid (blocking the hotfix). A time-boxed exception with documented mitigation is the balanced approach.",
        wrong: "This approach either removes security controls entirely or blocks a critical business fix unnecessarily. DevSecOps maturity means making risk-based decisions with documentation and accountability.",
      },
    },
    {
      type: "action-rationale",
      id: "dso-s3-secrets-detection",
      title: "Preventing Secrets from Entering the Repository",
      context:
        "A post-incident review reveals that an AWS access key was committed to the main branch 3 weeks ago and was only discovered when AWS emailed an abuse notification. The key had been active for 3 weeks with administrator access. The team wants to prevent secrets from entering the repository in the future. The repository uses GitHub with branch protection requiring PR reviews.",
      displayFields: [
        { label: "Incident", value: "AWS access key committed to main — active for 3 weeks before detection", emphasis: "critical" },
        { label: "Detection", value: "AWS abuse notification (external) — not internal detection", emphasis: "critical" },
        { label: "Repository", value: "GitHub with branch protection and required PR reviews", emphasis: "normal" },
        { label: "Goal", value: "Prevent secrets from entering the repository at any point", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Rely on GitHub's built-in secret scanning to detect secrets after push and alert the team", color: "yellow" },
        { id: "a2", label: "Install a pre-commit hook (e.g., detect-secrets, gitleaks) on developer machines AND enable GitHub push protection to block pushes containing detected secrets at the server level", color: "green" },
        { id: "a3", label: "Add a secrets detection step in the CI pipeline that fails the build if secrets are found", color: "orange" },
        { id: "a4", label: "Require all developers to use environment variables and add .env to .gitignore", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "GitHub secret scanning detects secrets after they are pushed to the repository. At that point, the secret is in Git history and must be rotated. The goal is prevention, not detection after the fact." },
        { id: "r2", text: "Pre-commit hooks catch secrets before they enter local Git history (earliest possible detection). GitHub push protection provides a server-side safety net that blocks pushes even if the pre-commit hook is bypassed. This defense-in-depth approach prevents secrets from ever reaching the repository." },
        { id: "r3", text: "CI pipeline detection happens after the push — the secret is already in the repository and Git history. While better than no detection, it fails the prevention requirement." },
        { id: "r4", text: "Guidelines and .gitignore are process controls, not technical controls. They depend on developer compliance and don't prevent accidental commits of hardcoded secrets in source files." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Defense in depth with pre-commit hooks (client-side) and push protection (server-side) prevents secrets from entering the repository at any point. Both layers are needed because either alone can be bypassed.",
        partial: "You're detecting secrets but at the wrong stage. Detection after push means the secret is in Git history and must be rotated. Prevention requires catching secrets before they reach the repository.",
        wrong: "This approach either detects too late or relies on process rather than technical controls. Secrets must be caught before entering the repository using pre-commit hooks and server-side push protection.",
      },
    },
  ],
  hints: [
    "The shift-left principle means moving security checks as early as possible in the development lifecycle. Pre-commit hooks are the earliest automated check, followed by build-stage scanning, then integration testing.",
    "Quality gate exceptions should be time-boxed, documented with the risk acceptance rationale and existing mitigations, and tracked with a remediation ticket. Never disable a quality gate entirely to work around a single finding.",
    "Secrets detection must operate at two levels: pre-commit hooks on developer machines (prevention) and server-side push protection (safety net). Detection after push is valuable but the secret is already exposed in Git history.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "DevSecOps engineering is one of the fastest-growing cloud security specializations. Organizations building mature CI/CD pipelines need engineers who can integrate SAST, DAST, SCA, and secrets detection without crippling developer velocity. This skill set bridges the security and platform engineering gap that most companies struggle to fill.",
  toolRelevance: ["SonarQube", "Snyk", "Trivy", "gitleaks", "GitHub Advanced Security", "OWASP ZAP", "AWS CodePipeline", "detect-secrets"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
