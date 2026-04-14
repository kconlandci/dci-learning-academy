import type { LabManifest } from "../../types/manifest";

export const iamPolicyReviewLab: LabManifest = {
  schemaVersion: "1.1",
  id: "iam-policy-review",
  version: 1,
  title: "IAM Policy Review",
  tier: "beginner",
  track: "aws-core",
  difficulty: "easy",
  accessLevel: "free",
  tags: ["aws", "iam", "security", "least-privilege", "policy"],
  description:
    "Audit IAM policies for over-permissive access, identify least-privilege violations, and toggle settings to enforce correct access controls.",
  estimatedMinutes: 10,
  learningObjectives: [
    "Identify wildcard permissions and resource ARN overuse in IAM policies",
    "Apply least-privilege principle to IAM role and user policies",
    "Distinguish between identity-based and resource-based policy controls",
    "Recognize common IAM misconfigurations that lead to privilege escalation",
  ],
  sortOrder: 104,
  status: "published",
  prerequisites: [],
  rendererType: "toggle-config",
  scenarios: [
    {
      type: "toggle-config",
      id: "iam-review-s1",
      title: "Lambda Execution Role Audit",
      description:
        "Review the IAM role attached to a Lambda function that reads from a single DynamoDB table and writes logs to CloudWatch. The current role was cloned from a developer's admin role and needs to be reduced to least-privilege.",
      targetSystem: "IAM Role: lambda-order-processor-role",
      items: [
        {
          id: "dynamodb-permission",
          label: "DynamoDB Permission Scope",
          detail: "Current: dynamodb:* on Resource: * (all tables). Function only reads from 'orders' table.",
          currentState: "dynamodb:* on *",
          correctState: "dynamodb:GetItem,Query,Scan on orders table ARN",
          states: [
            "dynamodb:* on *",
            "dynamodb:GetItem,Query,Scan on orders table ARN",
            "dynamodb:ReadOnlyAccess on *",
          ],
          rationaleId: "r-dynamodb-least-priv",
        },
        {
          id: "s3-permission",
          label: "S3 Permission",
          detail: "Current: s3:* on *. Lambda does not use S3 at all.",
          currentState: "s3:* on *",
          correctState: "Removed (no S3 permissions)",
          states: ["s3:* on *", "s3:GetObject on *", "Removed (no S3 permissions)"],
          rationaleId: "r-remove-unused",
        },
        {
          id: "cloudwatch-permission",
          label: "CloudWatch Logs Permission",
          detail: "Lambda needs to write logs to its specific log group.",
          currentState: "logs:* on *",
          correctState: "logs:CreateLogGroup,CreateLogStream,PutLogEvents on function log group ARN",
          states: [
            "logs:* on *",
            "logs:CreateLogGroup,CreateLogStream,PutLogEvents on function log group ARN",
            "logs:PutLogEvents on *",
          ],
          rationaleId: "r-logs-scoped",
        },
        {
          id: "iam-passrole",
          label: "IAM PassRole Permission",
          detail: "Current: iam:PassRole on *. Lambda does not invoke other services that require role passing.",
          currentState: "iam:PassRole on *",
          correctState: "Removed (no PassRole needed)",
          states: ["iam:PassRole on *", "iam:PassRole on specific role ARN", "Removed (no PassRole needed)"],
          rationaleId: "r-passrole-escalation",
        },
        {
          id: "ec2-permission",
          label: "EC2 Permission",
          detail: "Current: ec2:Describe* on *. Lambda is not VPC-connected and does not manage EC2 resources.",
          currentState: "ec2:Describe* on *",
          correctState: "Removed (no EC2 permissions)",
          states: ["ec2:Describe* on *", "ec2:DescribeInstances on *", "Removed (no EC2 permissions)"],
          rationaleId: "r-remove-unused",
        },
      ],
      rationales: [
        {
          id: "r-dynamodb-least-priv",
          text: "A function that only reads from one table should have exactly the read operations it needs (GetItem, Query, Scan) scoped to that specific table's ARN. dynamodb:* grants write, delete, and admin operations the function never needs.",
        },
        {
          id: "r-remove-unused",
          text: "Permissions for services the function doesn't use should be removed entirely. Unused permissions are pure blast radius — they provide no benefit and expand the impact of a compromise.",
        },
        {
          id: "r-logs-scoped",
          text: "Lambda needs only 3 CloudWatch Logs actions scoped to its own log group. logs:* on * would allow the function to read or delete any log group in the account — a significant data exposure risk.",
        },
        {
          id: "r-passrole-escalation",
          text: "iam:PassRole is a privilege escalation vector. With it, a compromised Lambda could pass any IAM role to services like EC2 or ECS, effectively giving an attacker any privilege in the account. Remove it unless explicitly required.",
        },
      ],
      feedback: {
        perfect:
          "Excellent least-privilege configuration. The role now has exactly what the Lambda function needs: scoped DynamoDB reads, targeted CloudWatch Logs writes, and no unnecessary permissions that could be exploited.",
        partial:
          "The role is improved but still has over-permissive settings. Any remaining wildcards or unused service permissions are a security finding. Lambda roles should have surgical precision.",
        wrong:
          "The role still has significant over-permissions. Wildcard actions on wildcard resources attached to a production Lambda function represent critical security risk. A compromised function could exfiltrate or destroy any resource in the account.",
      },
    },
    {
      type: "toggle-config",
      id: "iam-review-s2",
      title: "Developer IAM User Permissions",
      description:
        "A junior developer's IAM user has been flagged in a security review. They work on a microservices application using Lambda and DynamoDB. Review and correct their permissions to follow least-privilege without blocking their work.",
      targetSystem: "IAM User: dev-user-jsmith",
      items: [
        {
          id: "admin-access",
          label: "AdministratorAccess Policy",
          detail: "Developer has the AWS managed AdministratorAccess policy attached directly.",
          currentState: "Attached",
          correctState: "Removed",
          states: ["Attached", "Removed"],
          rationaleId: "r-no-admin-dev",
        },
        {
          id: "mfa-enforcement",
          label: "MFA Requirement",
          detail: "MFA is not enforced for console login. IAM user has programmatic and console access.",
          currentState: "Not enforced",
          correctState: "Required for all actions",
          states: ["Not enforced", "Required for console only", "Required for all actions"],
          rationaleId: "r-mfa-required",
        },
        {
          id: "access-key-rotation",
          label: "Access Key Age",
          detail: "Programmatic access key was created 420 days ago and has never been rotated.",
          currentState: "420 days old, active",
          correctState: "Rotated (≤90 days)",
          states: ["420 days old, active", "Rotated (≤90 days)", "Deactivated"],
          rationaleId: "r-key-rotation",
        },
        {
          id: "permission-boundary",
          label: "IAM Permission Boundary",
          detail: "No permission boundary is set. A boundary limiting to dev environment resources would prevent accidental production changes.",
          currentState: "None",
          correctState: "dev-environment-boundary (restricts to dev- prefixed resources)",
          states: ["None", "dev-environment-boundary (restricts to dev- prefixed resources)", "ReadOnlyAccess boundary"],
          rationaleId: "r-permission-boundary",
        },
        {
          id: "console-access-prod",
          label: "Production Console Access",
          detail: "User has unfiltered access to production AWS Console across all services.",
          currentState: "Full production access",
          correctState: "Read-only production access",
          states: ["Full production access", "Read-only production access", "No production access"],
          rationaleId: "r-prod-readonly",
        },
      ],
      rationales: [
        {
          id: "r-no-admin-dev",
          text: "AdministratorAccess on a developer IAM user bypasses all least-privilege controls. Developers should have scoped permissions to the services they work with, not god-mode access to the entire account.",
        },
        {
          id: "r-mfa-required",
          text: "MFA should be required for all IAM user actions, especially with programmatic access. Without MFA, a leaked access key is immediately usable by an attacker with no second factor to block them.",
        },
        {
          id: "r-key-rotation",
          text: "Access keys older than 90 days are a CIS AWS Benchmark finding. A 420-day-old key has had 14 months of exposure opportunity. Rotation limits the impact window of a key compromise.",
        },
        {
          id: "r-permission-boundary",
          text: "Permission boundaries cap the maximum permissions a principal can have, regardless of what policies are attached. A dev-environment boundary prevents a developer from accidentally deploying to or modifying production resources.",
        },
        {
          id: "r-prod-readonly",
          text: "Developers typically need to read production logs and metrics to debug issues. Write access to production should require a break-glass process, not be permanently available in a developer's standing permissions.",
        },
      ],
      feedback: {
        perfect:
          "Well-remediated developer account. No admin access, MFA enforced, keys rotated, permission boundary applied, and production is read-only. This is a textbook least-privilege developer configuration.",
        partial:
          "Some improvements made but critical findings remain. A developer account with AdministratorAccess or no MFA is a critical security risk regardless of other controls.",
        wrong:
          "The developer account still has critical misconfigurations. AdministratorAccess attached directly to a user IAM account, with a year-old access key and no MFA, is a severe security posture failure.",
      },
    },
    {
      type: "toggle-config",
      id: "iam-review-s3",
      title: "Cross-Service Role Trust Policy",
      description:
        "An IAM role used by an ECS task to access S3 has an overly broad trust policy. The role should only be assumable by ECS tasks in your specific cluster, not by any service in any account.",
      targetSystem: "IAM Role Trust Policy: ecs-app-task-role",
      items: [
        {
          id: "trust-principal",
          label: "Trust Policy Principal",
          detail: "Current Principal: { AWS: '*' } — allows any AWS identity to assume this role.",
          currentState: "Principal: * (anyone)",
          correctState: "Principal: ecs-tasks.amazonaws.com (ECS service)",
          states: [
            "Principal: * (anyone)",
            "Principal: ecs-tasks.amazonaws.com (ECS service)",
            "Principal: ec2.amazonaws.com",
          ],
          rationaleId: "r-trust-ecs",
        },
        {
          id: "external-id-condition",
          label: "External ID Condition",
          detail: "No conditions on the trust policy. A condition limiting to specific task definitions or VPC adds defense-in-depth.",
          currentState: "No conditions",
          correctState: "Condition: aws:SourceAccount equals your account ID",
          states: [
            "No conditions",
            "Condition: aws:SourceAccount equals your account ID",
            "Condition: aws:RequestedRegion equals us-east-1",
          ],
          rationaleId: "r-source-account",
        },
        {
          id: "s3-scope",
          label: "S3 Access Scope",
          detail: "Current: s3:GetObject,PutObject on arn:aws:s3:::* (all buckets). Task only accesses 'app-uploads' bucket.",
          currentState: "s3:GetObject,PutObject on arn:aws:s3:::*",
          correctState: "s3:GetObject,PutObject on arn:aws:s3:::app-uploads/*",
          states: [
            "s3:GetObject,PutObject on arn:aws:s3:::*",
            "s3:GetObject,PutObject on arn:aws:s3:::app-uploads/*",
            "s3:* on arn:aws:s3:::app-uploads",
          ],
          rationaleId: "r-s3-scoped",
        },
        {
          id: "sts-assume-role",
          label: "STS AssumeRole Permission",
          detail: "The role has sts:AssumeRole on * attached — allowing it to assume any role in the account.",
          currentState: "sts:AssumeRole on *",
          correctState: "Removed (no role chaining needed)",
          states: ["sts:AssumeRole on *", "sts:AssumeRole on specific downstream role ARN", "Removed (no role chaining needed)"],
          rationaleId: "r-no-assume-role",
        },
      ],
      rationales: [
        {
          id: "r-trust-ecs",
          text: "The trust policy principal controls who can assume the role. Principal: '*' means any AWS identity globally can assume it. It must be scoped to ecs-tasks.amazonaws.com so only ECS can assume it.",
        },
        {
          id: "r-source-account",
          text: "Even with the correct service principal, adding aws:SourceAccount ensures the role can only be assumed by ECS tasks within your account — not by ECS in any other account that might try to assume it.",
        },
        {
          id: "r-s3-scoped",
          text: "S3 permissions should be scoped to the specific bucket and path prefix. 'app-uploads/*' ensures the task can only access its designated bucket objects, not any bucket in the account.",
        },
        {
          id: "r-no-assume-role",
          text: "sts:AssumeRole on * is a privilege escalation path. A compromised ECS task with this permission can assume any role in the account, potentially gaining admin access. Remove unless role chaining is explicitly designed.",
        },
      ],
      feedback: {
        perfect:
          "Correct trust policy configuration. ECS-scoped principal, source account condition, specific S3 bucket path, and no unnecessary role-chaining permission. This role is now properly least-privileged.",
        partial:
          "Some trust policy improvements made but at least one escalation path remains. An unconstrained trust principal or sts:AssumeRole permission can be exploited by a compromised task.",
        wrong:
          "The trust policy has critical misconfigurations. A trust Principal of '*' means any identity globally can assume this role. Combined with sts:AssumeRole on *, a compromise of any identity can lead to full account takeover.",
      },
    },
  ],
  hints: [
    "The three IAM red flags to look for: (1) wildcard Actions on wildcard Resources, (2) iam:PassRole or sts:AssumeRole without constraints, (3) trust policies with Principal: '*'.",
    "Permission boundaries are not the same as deny policies. They cap the maximum effective permissions — a user can't exceed what the boundary allows, even if attached policies grant more.",
    "Access key rotation is an operational discipline as much as a security control. Most organizations use AWS Secrets Manager or IAM Roles (for EC2/Lambda) instead of long-lived access keys.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "IAM misconfigurations are responsible for the majority of AWS security breaches. The ability to read a policy, identify the least-privilege violations, and correct them is tested in the AWS Security Specialty exam and is a daily responsibility in cloud security roles. The iam:PassRole and sts:AssumeRole escalation paths are particularly important to understand.",
  toolRelevance: ["AWS Console", "IAM Access Analyzer", "AWS CLI", "Security Hub"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
