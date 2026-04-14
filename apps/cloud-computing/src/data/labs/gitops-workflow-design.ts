import type { LabManifest } from "../../types/manifest";

export const gitopsWorkflowDesignLab: LabManifest = {
  schemaVersion: "1.1",
  id: "gitops-workflow-design",
  version: 1,
  title: "GitOps Workflow Design",
  tier: "intermediate",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["gitops", "argocd", "flux", "kubernetes", "drift-detection", "reconciliation"],
  description:
    "Design GitOps workflows for Kubernetes deployments using declarative configuration, automated reconciliation, drift detection, and pull-based deployment models that ensure production always matches the desired state in Git.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Explain the GitOps principles and how they differ from traditional CI/CD push-based models",
    "Design a repository structure for GitOps that separates application code from deployment configuration",
    "Configure drift detection and automated reconciliation to maintain desired state",
    "Implement promotion workflows across environments using Git-based approvals",
  ],
  sortOrder: 613,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "go-s1",
      title: "GitOps Repository Structure",
      context:
        "A platform team is adopting GitOps for 8 microservices deployed across 3 environments (dev, staging, production) on a shared Kubernetes cluster. The team currently uses a CI pipeline that builds container images and runs kubectl apply directly against the cluster. They want to move to a pull-based GitOps model using ArgoCD. The first decision is how to structure the Git repositories.",
      displayFields: [
        { label: "Services", value: "8 microservices", emphasis: "normal" },
        { label: "Environments", value: "dev, staging, production", emphasis: "normal" },
        { label: "Current Model", value: "CI pipeline → kubectl apply (push-based)", emphasis: "warn" },
        { label: "Target Model", value: "ArgoCD pull-based GitOps", emphasis: "normal" },
        { label: "Cluster", value: "Shared Kubernetes cluster with namespace-per-environment", emphasis: "normal" },
      ],
      actions: [
        { id: "separate-config-repo", label: "Separate app repos (8 repos with source code) from a dedicated GitOps config repo containing Kubernetes manifests organized by environment, with Kustomize overlays for environment-specific values", color: "green" },
        { id: "mono-repo-everything", label: "Put all application source code and Kubernetes manifests in a single monorepo, with ArgoCD watching subdirectories for each service", color: "yellow" },
        { id: "per-service-config", label: "Create 8 separate config repos (one per service), each containing that service's manifests for all 3 environments", color: "orange" },
        { id: "branch-per-env", label: "Use a single config repo with branches for each environment (dev branch, staging branch, production branch) and promote changes via merge", color: "red" },
      ],
      correctActionId: "separate-config-repo",
      rationales: [
        { id: "r-go-s1-correct", text: "Separating application source code from deployment configuration is a core GitOps principle. The config repo becomes the single source of truth for what is deployed. Kustomize overlays allow a shared base manifest with environment-specific patches (replica counts, resource limits, feature flags). ArgoCD watches the config repo and reconciles the cluster state. CI pipelines update image tags in the config repo via automated commits, creating a clear audit trail of what changed and when." },
        { id: "r-go-s1-mono", text: "A monorepo coupling source code and manifests means every source code commit triggers ArgoCD reconciliation checks, even when no deployment configuration changed. It also means developers need write access to deployment manifests, reducing separation of concerns. For 8 services and 3 environments, the directory structure becomes complex and hard to navigate." },
        { id: "r-go-s1-per-service", text: "Eight separate config repos create operational overhead — PRs for cross-cutting changes (like updating a shared sidecar version) require 8 separate PRs. A single config repo with per-service directories provides the same isolation through directory-level CODEOWNERS while enabling atomic cross-service changes when needed." },
        { id: "r-go-s1-branch", text: "Branch-per-environment creates divergent histories that are difficult to audit and reconcile. Promoting from dev to staging requires cherry-picking or merging between branches, which can introduce merge conflicts in manifest files. Directory-per-environment with Kustomize overlays keeps all environments visible in a single branch, making the state of every environment inspectable at any commit." },
      ],
      correctRationaleId: "r-go-s1-correct",
      feedback: {
        perfect: "Correct. Separating app code from config with Kustomize overlays per environment is the GitOps best practice. ArgoCD watches the config repo as the single source of truth for cluster state.",
        partial: "Your approach works but introduces operational complexity. A dedicated config repo with directory-per-environment and Kustomize overlays is the most maintainable structure for multi-service GitOps.",
        wrong: "Branch-per-environment and mixed source/config repos violate GitOps principles of single source of truth and declarative configuration. Separate config repos with directory-based environment separation are the standard.",
      },
    },
    {
      type: "action-rationale",
      id: "go-s2",
      title: "Drift Detection and Reconciliation",
      context:
        "ArgoCD has been running for 3 weeks. This morning, the production namespace shows 'OutOfSync' status. Investigation reveals that a senior engineer ran kubectl scale deployment/payment-service --replicas=8 directly against the cluster at 2 AM during an incident, overriding the GitOps-declared value of 4 replicas. The incident is resolved, but the cluster state now differs from the Git-declared state. The team needs a policy for handling drift.",
      displayFields: [
        { label: "Drift Type", value: "Manual kubectl scale during incident (4 → 8 replicas)", emphasis: "critical" },
        { label: "ArgoCD Status", value: "OutOfSync", emphasis: "warn" },
        { label: "Git Declared Replicas", value: "4", emphasis: "normal" },
        { label: "Cluster Actual Replicas", value: "8", emphasis: "warn" },
        { label: "Incident Status", value: "Resolved", emphasis: "normal" },
      ],
      actions: [
        { id: "auto-reconcile-with-emergency-process", label: "Enable ArgoCD auto-sync to reconcile drift automatically, and establish an emergency change process where incident responders commit to Git first (even via fast-track PR) before applying to the cluster", color: "green" },
        { id: "manual-sync-only", label: "Keep ArgoCD in manual sync mode so engineers must explicitly click sync — never auto-reconcile, to prevent overwriting emergency changes", color: "yellow" },
        { id: "update-git-to-match-cluster", label: "Update the Git manifests to 8 replicas to match the current cluster state, accepting the incident change as the new desired state", color: "orange" },
        { id: "allow-drift-for-ops", label: "Configure ArgoCD to ignore replica count fields so operations teams can scale freely without triggering drift alerts", color: "red" },
      ],
      correctActionId: "auto-reconcile-with-emergency-process",
      rationales: [
        { id: "r-go-s2-correct", text: "Auto-sync is the GitOps ideal — the cluster should always converge to the Git-declared state. The real problem is not the drift detection but the lack of an emergency change process. A fast-track PR process (auto-approved by on-call lead, merged in minutes) lets incident responders make urgent changes through Git, which ArgoCD then applies within seconds. This preserves the audit trail, prevents drift, and still allows rapid incident response. The 2 AM kubectl command should have been a Git commit." },
        { id: "r-go-s2-manual", text: "Manual sync mode preserves emergency changes but defeats the core GitOps value proposition: automated reconciliation ensures production matches Git. Without auto-sync, drift can accumulate silently across many resources. Manual sync also requires human intervention for every legitimate deployment, slowing down normal operations to accommodate rare emergency scenarios." },
        { id: "r-go-s2-update-git", text: "Updating Git to match the cluster inverts the GitOps flow — the cluster becomes the source of truth instead of Git. The 8-replica count was an emergency measure, not a planned capacity decision. Once the incident is resolved, the correct replica count should be determined through normal capacity planning, not by accepting whatever ad-hoc value was chosen under pressure at 2 AM." },
        { id: "r-go-s2-ignore", text: "Ignoring replica count drift means the most common scaling-related misconfigurations will go undetected. If someone accidentally scales a service to 1 replica in production, ArgoCD will not alert or correct it. Carving exceptions into drift detection erodes the entire system's reliability guarantees over time." },
      ],
      correctRationaleId: "r-go-s2-correct",
      feedback: {
        perfect: "Correct. Auto-sync with a fast-track emergency PR process maintains GitOps principles while enabling rapid incident response. Git remains the source of truth, and the audit trail is preserved even for emergency changes.",
        partial: "Manual sync preserves emergency changes but weakens the GitOps model. The better solution is to make Git-based changes fast enough for emergency use through a streamlined PR process.",
        wrong: "Ignoring drift or updating Git to match ad-hoc cluster changes both undermine GitOps. The cluster should converge to Git, and emergency processes should go through Git with expedited approval.",
      },
    },
    {
      type: "action-rationale",
      id: "go-s3",
      title: "Environment Promotion Workflow",
      context:
        "The team needs to design the promotion workflow for moving changes from dev to staging to production. Currently, developers merge to main and a CI pipeline deploys to all environments sequentially. The team wants Git-based promotion with appropriate gates at each stage. Production deployments require approval from a tech lead.",
      displayFields: [
        { label: "Environments", value: "dev → staging → production", emphasis: "normal" },
        { label: "Current Flow", value: "CI pipeline deploys to all envs sequentially on merge", emphasis: "warn" },
        { label: "Production Gate", value: "Tech lead approval required", emphasis: "critical" },
        { label: "Deployment Frequency", value: "3-5 deploys per day to dev, 1-2 to production", emphasis: "normal" },
        { label: "Config Tool", value: "Kustomize overlays per environment", emphasis: "normal" },
      ],
      actions: [
        { id: "pr-based-promotion", label: "CI updates image tag in dev overlay automatically; promotion to staging and production happens via PRs to the respective environment overlays, with required reviewers for production PRs and automated integration tests as PR checks", color: "green" },
        { id: "auto-promote-all", label: "Automatically promote through all environments — dev, staging, and production — triggered by passing tests at each stage, with no manual gates", color: "red" },
        { id: "manual-yaml-edit", label: "Developers manually edit the image tag in each environment's Kustomize overlay and submit PRs for each promotion step", color: "yellow" },
        { id: "tag-based-promotion", label: "Use Git tags to mark releases: 'dev-v1.2', 'staging-v1.2', 'prod-v1.2', with ArgoCD watching for specific tag patterns per environment", color: "orange" },
      ],
      correctActionId: "pr-based-promotion",
      rationales: [
        { id: "r-go-s3-correct", text: "PR-based promotion is the GitOps standard for environment progression. CI automatically updates the dev overlay (high deployment frequency, low risk), so developers get fast feedback. Promotion to staging is a PR that triggers integration tests as checks — the PR only merges if tests pass. Production promotion is a PR with required tech lead reviewer, satisfying the approval gate. Every promotion is a Git commit with full audit trail, and ArgoCD applies changes automatically upon merge." },
        { id: "r-go-s3-auto", text: "Fully automated promotion to production removes the tech lead approval gate the team explicitly requires. While continuous deployment is aspirational, most organizations need human review for production changes — especially with 8 services where a bad interaction between services may not be caught by automated tests alone." },
        { id: "r-go-s3-manual", text: "Manual YAML editing for image tags is error-prone and slow. At 3-5 deploys per day to dev, developers would spend significant time editing manifests instead of writing code. Automating the dev overlay update and only requiring PRs for staging and production is the right balance of automation and control." },
        { id: "r-go-s3-tags", text: "Git tag-based promotion creates a parallel versioning scheme that can diverge from the actual manifest state. Tags are immutable references to commits, not living configuration — if a production hotfix is needed, you cannot update a tag. PR-based promotion on the config repo provides the same audit trail with better mutability and review semantics." },
      ],
      correctRationaleId: "r-go-s3-correct",
      feedback: {
        perfect: "Correct. Automated dev promotion with PR-based gating for staging and production provides the right balance of speed and safety. Every promotion is a Git commit with an audit trail and appropriate review.",
        partial: "Manual editing works but does not scale to 3-5 daily dev deployments. Automate the low-risk dev stage and reserve PR-based gates for staging and production promotion.",
        wrong: "Fully automated production promotion removes required approval gates, and tag-based promotion creates versioning complexity. PR-based promotion with environment-specific review requirements is the GitOps standard.",
      },
    },
  ],
  hints: [
    "In GitOps, the Git repository is the single source of truth for desired state. Separate application source code repositories from deployment configuration repositories for cleaner ownership and audit trails.",
    "Drift detection with auto-reconciliation ensures the cluster always matches Git. Emergency changes should go through a fast-track Git process rather than direct kubectl commands.",
    "PR-based environment promotion provides audit trails, approval gates, and automated test checks. Automate low-risk environments (dev) and gate high-risk environments (production) with required reviewers.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "GitOps has become the de facto deployment model for Kubernetes-based platforms. Platform engineers who can design GitOps workflows with proper repo structure, drift reconciliation, and promotion gates are essential for organizations adopting cloud-native infrastructure — and this skill set is increasingly expected in senior DevOps and platform engineering roles.",
  toolRelevance: ["ArgoCD", "Flux", "Kustomize", "Helm", "GitHub Actions", "Kubernetes"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
