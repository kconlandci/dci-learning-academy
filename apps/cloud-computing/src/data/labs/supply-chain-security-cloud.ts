import type { LabManifest } from "../../types/manifest";

export const supplyChainSecurityCloudLab: LabManifest = {
  schemaVersion: "1.1",
  id: "supply-chain-security-cloud",
  version: 1,
  title: "Software Supply Chain Security in the Cloud",
  tier: "intermediate",
  track: "cloud-security",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["security", "supply-chain", "sbom", "artifact-signing", "sigstore", "slsa", "container-registry", "provenance"],
  description:
    "Secure the software supply chain for cloud-native applications. Practice generating SBOMs, signing container images with Sigstore, implementing SLSA framework controls, and configuring admission policies that enforce provenance verification.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Generate and interpret Software Bills of Materials (SBOMs) for container images",
    "Sign container images using keyless signing with Sigstore Cosign",
    "Implement admission control policies that verify image signatures and provenance before deployment",
    "Apply SLSA framework levels to evaluate the integrity of a build pipeline",
  ],
  sortOrder: 514,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scs-s1-unsigned-images",
      title: "Preventing Deployment of Unsigned Container Images",
      context:
        "Your organization runs 60 microservices on GKE. A security audit reveals that any container image — including images from public registries with no verification — can be deployed to the production cluster. An attacker who compromises a developer's kubectl access could deploy a malicious image. The security team wants to ensure only images signed by the CI/CD pipeline can run in production.",
      displayFields: [
        { label: "Platform", value: "GKE — 60 microservices in production", emphasis: "normal" },
        { label: "Current Policy", value: "No image verification — any image can be deployed", emphasis: "critical" },
        { label: "Risk", value: "Compromised kubectl access could deploy malicious images", emphasis: "critical" },
        { label: "Goal", value: "Only CI/CD-signed images allowed in production", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Restrict image pulls to a private Artifact Registry and block all public registry access", color: "yellow" },
        { id: "a2", label: "Enable Binary Authorization with an attestation policy requiring a CI/CD pipeline attestor signature verified by Cosign before any image can be deployed to the production cluster", color: "green" },
        { id: "a3", label: "Use OPA Gatekeeper to enforce that all pod specs reference images with a specific tag naming convention (e.g., :prod-verified)", color: "red" },
        { id: "a4", label: "Scan all images with Trivy in an admission webhook and block images with critical vulnerabilities", color: "orange" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "Private registry restriction limits the source but doesn't verify that images were built by the CI/CD pipeline. A compromised developer could push a malicious image to the private registry and deploy it." },
        { id: "r2", text: "Binary Authorization with attestation requires a cryptographic signature from the CI/CD pipeline attestor. Only images that passed the build pipeline can be deployed — even images in the private registry are blocked without the attestation. Cosign provides keyless signing tied to the CI identity." },
        { id: "r3", text: "Tag naming conventions are trivially bypassed — anyone with push access to the registry can tag any image as :prod-verified. Tags are mutable pointers, not cryptographic proof of provenance." },
        { id: "r4", text: "Vulnerability scanning verifies image safety but not provenance. A malicious image with no known CVEs would pass the scan. The requirement is to verify that the CI/CD pipeline built the image." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. Binary Authorization with CI/CD attestation provides cryptographic proof of provenance. Only images built and signed by the pipeline can deploy — this is the industry standard for supply chain admission control.",
        partial: "You're adding a layer of defense but not verifying provenance. The requirement is to prove that the CI/CD pipeline built the image, which requires cryptographic attestation, not just registry restrictions or scanning.",
        wrong: "This approach doesn't verify that images were built by the CI/CD pipeline. Supply chain security requires cryptographic proof of provenance, not just source restrictions or vulnerability scanning.",
      },
    },
    {
      type: "action-rationale",
      id: "scs-s2-sbom-incident",
      title: "Using SBOMs to Assess Blast Radius of a Zero-Day CVE",
      context:
        "A critical zero-day CVE (CVSS 10.0) is published for a widely-used open-source library (libxml2). Your organization runs 200+ container images across multiple clusters. The CISO needs to know within 1 hour which production services are affected. The team has never tracked dependency inventories — engineers manually check each service's package.json or requirements.txt files.",
      displayFields: [
        { label: "CVE", value: "Zero-day in libxml2 — CVSS 10.0, actively exploited", emphasis: "critical" },
        { label: "Time Constraint", value: "CISO needs affected service list within 1 hour", emphasis: "critical" },
        { label: "Inventory", value: "200+ container images — no centralized dependency tracking", emphasis: "warn" },
        { label: "Current Process", value: "Manual check of each service's dependency files", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Have each team manually check their services and report back to the security team", color: "red" },
        { id: "a2", label: "Implement SBOM generation in the CI/CD pipeline immediately and scan all SBOMs against the CVE advisory using a centralized SBOM repository and query tool", color: "green" },
        { id: "a3", label: "Run a container scanner (Trivy/Grype) against all 200+ images in the registry right now", color: "yellow" },
        { id: "a4", label: "Search the Git repositories for libxml2 references using code search", color: "orange" },
      ],
      correctActionId: "a3",
      rationales: [
        { id: "r1", text: "Manual team-by-team checking for 200+ services cannot complete within 1 hour. Teams may miss transitive dependencies, and the process has no guarantee of completeness." },
        { id: "r2", text: "Implementing SBOM generation now is the correct long-term solution but cannot be completed within the 1-hour constraint. SBOMs should have been generated during the build process. For the immediate crisis, scanning existing images is faster." },
        { id: "r3", text: "Running a container scanner against all registry images immediately is the fastest way to identify affected services within the 1-hour window. Scanners like Trivy check OS packages and application dependencies against CVE databases, catching both direct and transitive dependencies." },
        { id: "r4", text: "Code search finds direct dependencies in manifest files but misses transitive dependencies and OS-level packages installed in container base images. libxml2 is often a transitive dependency of XML processing libraries." },
      ],
      correctRationaleId: "r3",
      feedback: {
        perfect: "Correct for the immediate crisis. Container scanning against existing images is the fastest path to identifying affected services. However, the follow-up action must be implementing SBOM generation in CI/CD so future zero-days can be assessed by querying SBOMs instead of re-scanning.",
        partial: "SBOM generation is the right long-term answer but can't be implemented within the 1-hour constraint. For the immediate crisis, scanning existing images in the registry provides the fastest results.",
        wrong: "This approach is either too slow for the 1-hour constraint or too incomplete to identify transitive dependencies. Container scanning against existing registry images is the fastest reliable method.",
      },
    },
    {
      type: "action-rationale",
      id: "scs-s3-slsa-build-integrity",
      title: "Achieving SLSA Level 3 for a Critical Build Pipeline",
      context:
        "Your organization wants to achieve SLSA Level 3 for the build pipeline of its core payment processing service. The current pipeline runs on shared GitHub Actions runners. Developers can modify the workflow YAML file through pull requests. Build artifacts are uploaded to Artifact Registry but no provenance metadata is generated. The compliance team requires tamper-proof build provenance.",
      displayFields: [
        { label: "Current SLSA Level", value: "Level 0 — no provenance, no build isolation", emphasis: "critical" },
        { label: "Target", value: "SLSA Level 3 — tamper-proof build provenance", emphasis: "warn" },
        { label: "Build System", value: "GitHub Actions — shared runners, editable workflow", emphasis: "warn" },
        { label: "Artifact Registry", value: "Images pushed without provenance metadata", emphasis: "warn" },
      ],
      actions: [
        { id: "a1", label: "Add a SHA-256 checksum to the build artifact and store it in the artifact metadata", color: "yellow" },
        { id: "a2", label: "Use a hardened SLSA GitHub Actions generator that runs on isolated runners, generates non-forgeable provenance attestations signed by the build service identity, and restricts workflow file modifications to a protected branch with required reviews", color: "green" },
        { id: "a3", label: "Migrate to a self-hosted Jenkins server to control the build environment completely", color: "orange" },
        { id: "a4", label: "Pin all GitHub Actions to specific commit SHAs instead of version tags", color: "red" },
      ],
      correctActionId: "a2",
      rationales: [
        { id: "r1", text: "SHA-256 checksums verify artifact integrity but don't provide provenance — they don't prove where, when, or how the artifact was built. SLSA Level 3 requires authenticated, non-forgeable provenance." },
        { id: "r2", text: "The SLSA GitHub Actions generator produces non-forgeable provenance attestations that include the source repository, commit, builder identity, and build instructions. Isolated runners prevent tampering during the build. Protected workflow files prevent unauthorized pipeline modifications — all SLSA Level 3 requirements." },
        { id: "r3", text: "Self-hosted Jenkins provides build environment control but doesn't automatically generate SLSA-compliant provenance. It shifts the trust boundary without solving the provenance problem." },
        { id: "r4", text: "Pinning Actions to commit SHAs is a good supply chain hygiene practice but only addresses one aspect (dependency integrity). It doesn't generate provenance or provide build isolation." },
      ],
      correctRationaleId: "r2",
      feedback: {
        perfect: "Correct. SLSA Level 3 requires non-forgeable provenance from an isolated build process with a tamper-proof build definition. The SLSA GitHub Actions generator satisfies all three requirements.",
        partial: "You're improving build security but not meeting all SLSA Level 3 requirements. Level 3 specifically requires non-forgeable provenance attestations, isolated builds, and protected build definitions.",
        wrong: "This approach addresses an important security concern but doesn't satisfy SLSA Level 3 requirements. Level 3 demands provenance, build isolation, and definition integrity as a complete set.",
      },
    },
  ],
  hints: [
    "Binary Authorization and Cosign attestation verify that a container image was built by a trusted CI/CD pipeline. They operate on image digests (not tags), providing cryptographic proof of provenance that tags alone cannot provide.",
    "SBOMs (Software Bills of Materials) should be generated during the build process and stored alongside artifacts. When a zero-day CVE is published, you can query SBOMs to identify affected services in minutes instead of hours.",
    "SLSA Level 3 requires three properties: non-forgeable provenance (cryptographically signed by the build service), isolated builds (the build runs on infrastructure the developer cannot influence), and a tamper-proof build definition (workflow files are protected from unauthorized modification).",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Software supply chain security has become a board-level concern after high-profile attacks (SolarWinds, Log4Shell, xz-utils). Engineers who understand SBOMs, artifact signing, SLSA frameworks, and admission control policies are in exceptional demand at organizations building secure software delivery platforms.",
  toolRelevance: ["Sigstore Cosign", "Binary Authorization", "Trivy", "Syft", "SLSA Framework", "GitHub Actions", "GKE Admission Controller"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
