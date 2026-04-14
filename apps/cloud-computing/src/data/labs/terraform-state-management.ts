import type { LabManifest } from "../../types/manifest";

export const terraformStateManagementLab: LabManifest = {
  schemaVersion: "1.1",
  id: "terraform-state-management",
  version: 1,
  title: "Terraform State Management",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["terraform", "iac", "state", "s3", "dynamodb"],
  description:
    "Make the right decisions around Terraform remote state configuration, state locking, workspace isolation, and safe state manipulation to prevent infrastructure corruption.",
  estimatedMinutes: 8,
  learningObjectives: [
    "Configure Terraform remote state with S3 and DynamoDB locking",
    "Understand the risks of concurrent state modifications",
    "Apply workspace and state isolation strategies for multiple environments",
    "Safely perform state manipulation commands without data loss",
  ],
  sortOrder: 602,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "tf-state-s1",
      title: "Concurrent Apply Conflict",
      context:
        "Two engineers on the same team run `terraform apply` simultaneously against the same environment. The S3 remote backend is configured but the DynamoDB lock table is not. Both applies start at the same time. 30 seconds later, both complete with exit code 0 but the resulting infrastructure has duplicate security groups and a missing load balancer listener.",
      displayFields: [
        { label: "Backend", value: "S3 (no DynamoDB lock table)", emphasis: "critical" },
        { label: "Concurrent Applies", value: "2 simultaneous runs", emphasis: "critical" },
        { label: "Result", value: "Duplicate resources, missing listener", emphasis: "critical" },
        { label: "State File", value: "Corrupted — reflects only one apply's changes", emphasis: "critical" },
      ],
      actions: [
        { id: "add-dynamodb-lock", label: "Add a DynamoDB table as the lock mechanism in the S3 backend config", color: "green" },
        { id: "use-workspaces", label: "Create separate Terraform workspaces for each engineer", color: "yellow" },
        { id: "use-local-state", label: "Switch to local state to avoid conflicts on S3", color: "red" },
        { id: "serial-apply-policy", label: "Implement a team policy that only one person runs apply at a time", color: "blue" },
      ],
      correctActionId: "add-dynamodb-lock",
      rationales: [
        { id: "r-dynamodb-lock", text: "DynamoDB state locking is the built-in Terraform mechanism for preventing concurrent applies. When configured, Terraform acquires a lock before reading state, blocking any other apply until the lock is released. This is the correct technical solution." },
        { id: "r-workspaces-wrong", text: "Workspaces create separate state files per workspace, not per engineer. Two engineers running against the same workspace still have no locking. Workspaces solve environment isolation, not concurrent access." },
        { id: "r-local-state-wrong", text: "Local state is worse for team collaboration — each engineer has their own copy of state with no shared truth. This guarantees state drift and makes team collaboration impossible." },
        { id: "r-policy-wrong", text: "A human policy is fragile and does not prevent the scenario when two engineers happen to run apply at the same moment. Technical controls are required to enforce mutual exclusion reliably." },
      ],
      correctRationaleId: "r-dynamodb-lock",
      feedback: {
        perfect: "Correct. DynamoDB provides atomic lock acquisition that S3 alone cannot. Adding the `dynamodb_table` parameter to the S3 backend block is a one-line fix that prevents state corruption permanently.",
        partial: "You addressed team process but not the technical root cause. State locking must be enforced by Terraform itself — a human policy cannot prevent simultaneous runs in practice.",
        wrong: "The root cause is missing state locking, not the choice of backend or team workflow. Remote state on S3 without DynamoDB locking is missing a critical safety mechanism.",
      },
    },
    {
      type: "action-rationale",
      id: "tf-state-s2",
      title: "Accidental Resource Deletion in State",
      context:
        "An engineer accidentally runs `terraform state rm aws_rds_instance.primary` on the production state file. The RDS instance still exists in AWS but Terraform no longer tracks it. The next `terraform plan` shows the RDS instance as a new resource to be created, which would fail because it already exists — or worse, destroy and recreate it if someone runs apply.",
      displayFields: [
        { label: "State Command Run", value: "terraform state rm aws_rds_instance.primary", emphasis: "critical" },
        { label: "AWS Resource Status", value: "RDS instance EXISTS in AWS", emphasis: "normal" },
        { label: "Terraform State Status", value: "Resource REMOVED from state", emphasis: "critical" },
        { label: "Next Plan Output", value: "Will attempt to CREATE aws_rds_instance.primary", emphasis: "critical" },
      ],
      actions: [
        { id: "terraform-import", label: "Run `terraform import aws_rds_instance.primary <db-identifier>` to re-add the resource to state", color: "green" },
        { id: "run-apply", label: "Run `terraform apply` to let Terraform recreate the resource as planned", color: "red" },
        { id: "restore-state-backup", label: "Restore the previous state file from the S3 versioned backup", color: "yellow" },
        { id: "delete-and-recreate", label: "Manually delete the RDS instance in AWS and run a fresh apply", color: "red" },
      ],
      correctActionId: "terraform-import",
      rationales: [
        { id: "r-import", text: "`terraform import` maps an existing AWS resource to a Terraform state address without touching the resource. It's the purpose-built command for re-associating existing infrastructure with state after accidental removal." },
        { id: "r-apply-wrong", text: "Running apply after the state removal will attempt to create a new RDS instance with the same identifier, which fails because the resource already exists. If the config has `create_before_destroy`, it could trigger a destructive replace." },
        { id: "r-restore-backup", text: "Restoring from S3 versioned backup is a valid alternative if no other changes have been made to state since the incident. However, if other resources were modified between the incident and now, restoring the backup would revert those changes too. Import is more surgical." },
        { id: "r-delete-recreate-wrong", text: "Deleting a production RDS instance to fix a state file issue is a catastrophic overreaction. There is zero justification for destroying production data to fix a metadata problem." },
      ],
      correctRationaleId: "r-import",
      feedback: {
        perfect: "Correct. `terraform import` is the surgical tool for this exact situation — it reconciles state with reality without touching the infrastructure.",
        partial: "Restoring a backup can work in simple cases, but it's risky if other state changes occurred after the incident. Import is always safer because it operates on a single resource without reverting unrelated changes.",
        wrong: "Never run apply when state is known to be out of sync with reality. Always reconcile state first using import or backup restore, then verify with plan before any apply.",
      },
    },
    {
      type: "action-rationale",
      id: "tf-state-s3",
      title: "Multi-Environment State Isolation",
      context:
        "A startup is growing from one environment (production) to three (dev, staging, production). They currently have a single Terraform configuration with a single S3 state file. The infrastructure team wants to spin up dev and staging environments without risking the production state file.",
      displayFields: [
        { label: "Current Setup", value: "Single workspace, single state file", emphasis: "warn" },
        { label: "Target", value: "3 isolated environments: dev, staging, prod", emphasis: "normal" },
        { label: "Risk", value: "Any apply to wrong env could modify production", emphasis: "critical" },
        { label: "Team Size", value: "3 engineers (growing)", emphasis: "normal" },
      ],
      actions: [
        { id: "separate-state-keys", label: "Use separate S3 key paths per environment in the backend config with separate DynamoDB lock entries", color: "green" },
        { id: "terraform-workspaces", label: "Use Terraform workspaces (terraform workspace new dev)", color: "yellow" },
        { id: "single-state-variables", label: "Use a variable `env = dev/staging/prod` in the same state file to control which resources get created", color: "red" },
        { id: "copy-state-file", label: "Copy the production state file to dev.tfstate and staging.tfstate manually", color: "blue" },
      ],
      correctActionId: "separate-state-keys",
      rationales: [
        { id: "r-separate-keys", text: "Separate S3 key paths (e.g., env/prod/terraform.tfstate, env/dev/terraform.tfstate) with separate backend configurations per environment gives complete state isolation. A misconfigured apply to dev cannot touch the prod state file because they live at different S3 paths." },
        { id: "r-workspaces-partial", text: "Terraform workspaces do separate state files per workspace, but share the same backend configuration and Terraform code. For true environment isolation — especially for production — separate backend configs in separate directories or repos is the safer industry pattern." },
        { id: "r-single-state-wrong", text: "A single state file for all environments means every plan and apply must process all three environments. A mistake in a variable value could modify production resources. This pattern violates the principle of environment isolation." },
        { id: "r-copy-state-wrong", text: "Manually copying state files creates mismatched resource IDs and providers. Dev state would reference production ARNs and resource IDs, causing immediate plan errors or silent resource conflicts." },
      ],
      correctRationaleId: "r-separate-keys",
      feedback: {
        perfect: "Correct. Separate S3 state key paths with dedicated backend configs per environment is the industry-standard approach for environment isolation in Terraform.",
        partial: "Workspaces are better than a single state file, but the best practice for teams managing production infrastructure is fully separate backend configurations — it makes accidental cross-environment applies structurally impossible.",
        wrong: "Environment isolation in Terraform requires separate state files. Sharing state between environments — whether in one file or by copying — creates risk of cross-environment resource contamination.",
      },
    },
  ],
  hints: [
    "Terraform state locking requires both S3 (storage) and DynamoDB (locking) — S3 alone cannot provide atomic locks.",
    "`terraform import` is for re-associating existing AWS resources with state without recreating them.",
    "For production-grade isolation, separate backend configurations per environment are safer than Terraform workspaces.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Terraform state management mistakes are one of the top causes of production infrastructure incidents. Engineers who deeply understand state locking, import, and isolation patterns are trusted to manage critical infrastructure. This knowledge is heavily tested in infrastructure-focused interviews at cloud-native companies.",
  toolRelevance: ["Terraform", "AWS S3", "AWS DynamoDB", "Terraform Cloud", "Atlantis"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
