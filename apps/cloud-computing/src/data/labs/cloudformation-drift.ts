import type { LabManifest } from "../../types/manifest";

export const cloudformationDriftLab: LabManifest = {
  schemaVersion: "1.1",
  id: "cloudformation-drift",
  version: 1,
  title: "CloudFormation Drift Detection",
  tier: "beginner",
  track: "cloud-operations",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["cloudformation", "iac", "drift", "compliance", "aws"],
  description:
    "Detect and remediate infrastructure configuration drift in CloudFormation stacks by analyzing drift reports, identifying root causes, and restoring infrastructure-as-code compliance.",
  estimatedMinutes: 11,
  learningObjectives: [
    "Interpret CloudFormation drift detection reports",
    "Identify the difference between expected and actual resource configurations",
    "Choose between drift remediation strategies based on risk and urgency",
    "Prevent drift recurrence through guardrails and process changes",
  ],
  sortOrder: 606,
  status: "published",
  prerequisites: [],
  rendererType: "investigate-decide",
  scenarios: [
    {
      type: "investigate-decide",
      id: "cfn-drift-s1",
      title: "Security Group Drift in Production",
      objective:
        "A CloudFormation drift detection scan on the production stack reports DRIFTED status. Investigate the drift report to understand what changed and decide on the correct remediation approach.",
      investigationData: [
        {
          id: "drift-summary",
          label: "Drift Detection Summary",
          content: "Stack: prod-web-stack | Status: DRIFTED | Drifted Resources: 2 of 18 | Scan Time: 2026-03-28 08:00:00",
        },
        {
          id: "sg-drift-detail",
          label: "Resource Drift Detail — Security Group (sg-0abc123)",
          content: "ResourceType: AWS::EC2::SecurityGroup | DriftStatus: MODIFIED | Expected (CFN template): InboundRules: [port 443 0.0.0.0/0, port 80 0.0.0.0/0] | Actual (AWS): InboundRules: [port 443 0.0.0.0/0, port 80 0.0.0.0/0, port 22 0.0.0.0/0, port 3306 0.0.0.0/0]",
        },
        {
          id: "ec2-drift-detail",
          label: "Resource Drift Detail — EC2 Instance (i-0def456)",
          content: "ResourceType: AWS::EC2::Instance | DriftStatus: MODIFIED | Expected: InstanceType: t3.large | Actual: InstanceType: t3.xlarge | Note: Instance was stopped, type changed, then restarted",
        },
        {
          id: "change-history",
          label: "AWS Console Activity (CloudTrail Last 72h)",
          content: "2026-03-25 14:22: AuthorizeSecurityGroupIngress (port 22, 0.0.0.0/0) by ops-engineer-1 | 2026-03-26 09:15: AuthorizeSecurityGroupIngress (port 3306, 0.0.0.0/0) by ops-engineer-2 | 2026-03-27 16:40: ModifyInstanceAttribute (InstanceType: t3.xlarge) by ops-engineer-1 | No CloudFormation stack updates in last 30 days",
        },
        {
          id: "business-context",
          label: "Business Context",
          content: "The instance type change was approved to handle increased load — no change ticket exists. The security group changes were for 'temporary debugging' 3 days ago. No change was made to the CloudFormation template for any of these modifications.",
        },
      ],
      actions: [
        { id: "remediate-sg-update-cfn", label: "Remove port 22 and 3306 from the security group, add the instance type change to the CFN template, and run a stack update", color: "green" },
        { id: "update-cfn-to-match", label: "Update the CloudFormation template to match the current actual state and mark as resolved", color: "yellow" },
        { id: "ignore-drift", label: "Acknowledge the drift and schedule a review for next quarter", color: "red" },
        { id: "destroy-recreate", label: "Delete and recreate the entire CloudFormation stack from the original template", color: "red" },
      ],
      correctActionId: "remediate-sg-update-cfn",
      rationales: [
        { id: "r-cfn-s1-correct", text: "The security group changes (SSH and MySQL open to 0.0.0.0/0) represent active security vulnerabilities that must be remediated immediately, not preserved in code. The instance type change is legitimate and should be codified in CFN. The correct approach is: fix the dangerous drift (remove overly permissive rules), legitimize the intentional change (update template for instance type), then run a stack update to restore IaC governance." },
        { id: "r-cfn-s1-update-match", text: "Updating CFN to match actual state permanently codifies open-to-internet SSH and MySQL access. This 'resolves' the drift by making dangerous configurations officially managed — the wrong outcome. Drift remediation requires judgment about which changes to accept versus reject." },
        { id: "r-cfn-s1-ignore", text: "Open port 22 and 3306 to 0.0.0.0/0 in production is an active security risk. Deferring security group drift to next quarter allows attackers 3 months to exploit direct database and SSH access." },
        { id: "r-cfn-s1-destroy", text: "Destroying a production stack to fix drift is disproportionate and dangerous. Stack deletion would terminate the EC2 instance, remove the security group (affecting any dependent resources), and cause a production outage." },
      ],
      correctRationaleId: "r-cfn-s1-correct",
      feedback: {
        perfect: "Correct. Drift remediation requires evaluating each change: reject dangerous security group modifications, accept and codify the legitimate instance type upgrade.",
        partial: "You identified the right tool (CFN update) but the direction matters. Updating CFN to match actual state legitimizes dangerous open ports. Update actual state to match desired policy, then update CFN.",
        wrong: "Not all drift is equal. Some changes must be reverted (open security group rules), others should be codified (approved instance type change). Evaluate each drifted resource individually.",
      },
    },
    {
      type: "investigate-decide",
      id: "cfn-drift-s2",
      title: "Repeated Drift Pattern — Process Problem",
      objective:
        "Over the past 3 months, CloudFormation drift detection has reported the same security group modifications every 2–4 weeks. Engineers open debug ports, forget to close them, and drift is discovered during the monthly compliance scan. Investigate the pattern and decide on the systemic fix.",
      investigationData: [
        {
          id: "drift-history",
          label: "Drift Incidents — Last 3 Months",
          content: "2026-01-15: port 22 opened by ops-eng-1, found in monthly scan 2026-01-31 | 2026-02-03: port 5432 opened by ops-eng-3, found in monthly scan 2026-02-28 | 2026-02-18: port 8080 opened by ops-eng-2, found in monthly scan 2026-02-28 | 2026-03-09: port 22 and 3306 opened by ops-eng-1, found in weekly scan 2026-03-14",
        },
        {
          id: "engineer-survey",
          label: "Engineering Team Survey Results",
          content: "Q: Why are ports opened manually? A: 'Fastest way to debug production issues' (8/10 engineers) | Q: Why aren't ports closed after debugging? A: 'Forget once the issue is resolved' (9/10 engineers) | Q: Do you know how to use SSM Session Manager? A: 'No' (6/10 engineers)",
        },
        {
          id: "current-access-methods",
          label: "Current SSH Access Path",
          content: "Current: Direct SSH via public IP (requires open port 22 in SG) | IAM permissions for SSM: Already configured on all EC2 instances | SSM Session Manager: Available but not documented in runbooks | Session Manager requires: No open ports, works through AWS API",
        },
        {
          id: "iam-permissions",
          label: "IAM Permissions on EC2 Role",
          content: "ssm:StartSession: Allowed | ssm:TerminateSession: Allowed | ec2messages:*: Allowed | ssm:SendCommand: Allowed | Note: All permissions already present, no infrastructure changes required to enable SSM",
        },
      ],
      actions: [
        { id: "enable-ssm-training", label: "Document SSM Session Manager in runbooks, train engineers, and add a CloudWatch Events rule to auto-revoke port 22/3306 within 10 minutes of being opened", color: "green" },
        { id: "increase-scan-frequency", label: "Increase drift detection to hourly scans and alert on-call immediately when drift is detected", color: "yellow" },
        { id: "revoke-iam-sg-permissions", label: "Revoke IAM permissions for engineers to modify security groups in production", color: "blue" },
        { id: "manual-review-process", label: "Implement a weekly manual review of all security groups by the security team", color: "red" },
      ],
      correctActionId: "enable-ssm-training",
      rationales: [
        { id: "r-cfn-s2-correct", text: "The root cause is that engineers need production debugging access but only know how to achieve it by opening SSH ports. SSM Session Manager provides equivalent access without any open ports — eliminating the need to open port 22 at all. Training plus an automated auto-revoke guardrail addresses both the knowledge gap and the 'forgotten to close' problem. This makes secure access the path of least resistance." },
        { id: "r-cfn-s2-scan", text: "Scanning more frequently detects drift faster but doesn't prevent it. Engineers will still open ports; you'll just find out sooner. Detection without prevention is not a systemic fix." },
        { id: "r-cfn-s2-revoke-iam", text: "Revoking SG modification permissions blocks the bad behavior but also prevents legitimate emergency responses. Engineers need some ability to respond to incidents. The better path is making secure access (SSM) so easy that opening ports becomes unnecessary." },
        { id: "r-cfn-s2-manual", text: "A weekly manual security review by a separate team adds process burden, is slow to catch issues, and doesn't change engineer behavior. Manual reviews scale poorly as the team grows." },
      ],
      correctRationaleId: "r-cfn-s2-correct",
      feedback: {
        perfect: "Correct. The best security control makes the secure path the easy path. SSM + auto-revoke guardrails removes the motivation to open ports while maintaining operational capability.",
        partial: "Faster detection is good but addresses symptoms, not the root cause. Engineers open ports because it's the only access method they know. Fix the workflow, not just the detection speed.",
        wrong: "The survey data is clear: engineers open ports because SSM is not in their runbooks and they don't know how to use it. Fix the knowledge gap and you fix the drift pattern.",
      },
    },
    {
      type: "investigate-decide",
      id: "cfn-drift-s3",
      title: "IAM Role Policy Drift",
      objective:
        "Drift detection reports that an IAM role used by the application's Lambda functions has been modified. The original policy granted specific S3 and DynamoDB permissions. Investigate the drift and determine the safest remediation.",
      investigationData: [
        {
          id: "iam-drift-detail",
          label: "IAM Role Drift Report",
          content: "Role: app-lambda-execution-role | DriftStatus: MODIFIED | Expected Policy (CFN): s3:GetObject on arn:aws:s3:::app-data-bucket/* and dynamodb:GetItem,PutItem,Query on arn:aws:dynamodb:us-east-1:*:table/app-data | Actual Policy (AWS): s3:* on arn:aws:s3:::* and dynamodb:* on arn:aws:dynamodb:*:*:table/* (wildcard expansion added)",
        },
        {
          id: "change-context",
          label: "CloudTrail — Role Policy Change",
          content: "2026-03-26 11:30: PutRolePolicy by developer-5 | Console session from IP 203.0.113.45 | User agent: AWS Console | Note: developer-5 is a junior engineer onboarded 2 weeks ago",
        },
        {
          id: "lambda-behavior",
          label: "Lambda Function Behavior Since Policy Change",
          content: "No Lambda errors reported | All Lambda functions are running normally | Application appears to function correctly | No customer-facing issues detected",
        },
        {
          id: "risk-assessment",
          label: "Security Risk Assessment of Current Policy",
          content: "s3:* on arn:aws:s3:::* grants: read all S3 buckets in the account (including secrets, Terraform state, backups) | dynamodb:* on arn:aws:dynamodb:*:*:table/* grants: delete any DynamoDB table in the account | Current blast radius: Any Lambda invocation could now read all S3 data or destroy any DynamoDB table",
        },
      ],
      actions: [
        { id: "revert-to-cfn-policy", label: "Immediately revert the IAM policy to the CloudFormation-defined permissions and retrain the engineer on least-privilege IAM", color: "green" },
        { id: "keep-broad-policy", label: "Keep the broader policy since the Lambda is functioning correctly and schedule an IAM review", color: "red" },
        { id: "disable-lambda", label: "Disable all Lambda functions immediately until the policy is reviewed by the security team", color: "yellow" },
        { id: "add-scp-guard", label: "Add an AWS Organizations SCP to prevent wildcard IAM policies account-wide", color: "blue" },
      ],
      correctActionId: "revert-to-cfn-policy",
      rationales: [
        { id: "r-cfn-s3-correct", text: "Wildcard S3 and DynamoDB permissions violate least-privilege and create catastrophic blast radius if the Lambda function is ever compromised or misbehaves. The fact that the application 'works' doesn't make overly broad permissions acceptable — it means the developer granted more access than the code needs. Immediate revert to CFN-defined scoped permissions is required, followed by education on IAM least-privilege." },
        { id: "r-cfn-s3-keep", text: "Application functionality is not a security justification. The Lambda now has permissions to read every S3 bucket and destroy every DynamoDB table in the account. This is an unacceptable security posture regardless of current behavior." },
        { id: "r-cfn-s3-disable", text: "Disabling Lambda functions causes a production outage when the fix (reverting the policy) takes under 30 seconds. Disabling production services is disproportionate for a policy change that can be instantly reverted." },
        { id: "r-cfn-s3-scp", text: "Adding an SCP is an excellent preventive control but doesn't immediately fix the current overly broad policy. The SCP prevents future occurrences; reverting the policy fixes the current exposure." },
      ],
      correctRationaleId: "r-cfn-s3-correct",
      feedback: {
        perfect: "Correct. Immediately revert the over-permissive policy — application functionality is irrelevant to the security risk of wildcard IAM permissions.",
        partial: "An SCP is a good long-term control but it doesn't fix the active exposure. The Lambda currently has account-wide S3 read and DynamoDB delete permissions that must be revoked now.",
        wrong: "The application working correctly does not mean the policy is correct. Wildcard IAM permissions represent an unacceptable security risk that must be reverted immediately, regardless of current behavior.",
      },
    },
  ],
  hints: [
    "Not all drift is equal — security group and IAM drift requires immediate remediation, while instance type changes may be legitimate and need codification.",
    "The goal of drift remediation is not always to match actual state — sometimes you must restore desired state by reverting the actual state.",
    "Recurring drift patterns indicate a process problem, not just a configuration problem. Find the root behavior driving the changes.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "CloudFormation drift management is a critical compliance and security skill for engineers working in regulated environments. The ability to evaluate drift, distinguish between dangerous and legitimate changes, and implement systemic prevention demonstrates the kind of security-minded infrastructure thinking that organizations pay a premium for.",
  toolRelevance: ["AWS CloudFormation", "AWS Config", "AWS CloudTrail", "AWS SSM Session Manager", "Terraform"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
