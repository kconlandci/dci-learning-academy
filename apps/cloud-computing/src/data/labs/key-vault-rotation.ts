import type { LabManifest } from "../../types/manifest";

export const keyVaultRotationLab: LabManifest = {
  schemaVersion: "1.1",
  id: "key-vault-rotation",
  version: 1,
  title: "Azure Key Vault Secret Rotation",
  tier: "beginner",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "key-vault", "secrets", "rotation", "managed-identity", "security"],
  description:
    "Triage and remediate Azure Key Vault secret management failures including expired secrets, misconfigured access policies, and broken rotation automation.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Diagnose Key Vault access failures using error codes and audit logs",
    "Identify root causes of secret rotation failures in Function-based rotation automation",
    "Apply the correct remediation for expired secrets vs. access policy vs. network rule failures",
  ],
  sortOrder: 207,
  status: "published",
  prerequisites: [],
  rendererType: "triage-remediate",
  scenarios: [
    {
      type: "triage-remediate",
      id: "scenario-1",
      title: "Production Application — Secret Access Denied",
      description:
        "A production web application began returning 500 errors at 3:47 AM. Application logs show 'Azure.RequestFailedException: Operation returned an invalid status code 403' when retrieving the database connection string from Key Vault. The app was working fine for 6 months before this.",
      evidence: [
        {
          type: "log",
          content:
            "App Service Application Log (3:47:12 AM): Azure.RequestFailedException: Operation returned an invalid status code 'Forbidden'. Activity ID: a7f2-..., Service request ID: 9b3c-... Target: https://prod-kv.vault.azure.net/secrets/db-connection-string/current",
        },
        {
          type: "log",
          content:
            "Key Vault Diagnostic Logs (3:47:12 AM): Operation: SecretGet, Identity: webapp-prod (Object ID: 4a8b-...), ResultType: Failed, HttpStatusCode: 403, ResultDescription: 'Caller is not authorized to perform action on resource'",
        },
        {
          type: "config",
          content:
            "Key Vault Access Policies: Principal 'webapp-prod' (Object ID: 4a8b-...) — Secret permissions: none listed. Note: Access policy was last modified 3 days ago by admin@contoso.com.",
        },
        {
          type: "log",
          content:
            "Azure Activity Log (3 days ago): 'Update Key Vault access policy' — admin@contoso.com removed principal 'webapp-prod-old' (Object ID: 4a8b-...) from Key Vault access policies. Action: Microsoft.KeyVault/vaults/accessPolicies/write",
        },
      ],
      classifications: [
        {
          id: "class-expired-secret",
          label: "Expired Secret",
          description: "The secret has passed its expiration date and Key Vault is blocking access.",
        },
        {
          id: "class-access-policy",
          label: "Access Policy Misconfiguration",
          description: "The application's managed identity lacks the required Get permission on secrets.",
        },
        {
          id: "class-network-rule",
          label: "Network Firewall Rule",
          description: "A Key Vault firewall rule is blocking the application's outbound network access.",
        },
        {
          id: "class-secret-deleted",
          label: "Secret Accidentally Deleted",
          description: "The secret was deleted from Key Vault and needs to be recovered from soft-delete.",
        },
      ],
      correctClassificationId: "class-access-policy",
      remediations: [
        {
          id: "rem-restore-policy",
          label: "Re-add the webapp-prod managed identity to Key Vault access policies with Get and List permissions on Secrets",
          description: "Restore the access policy entry for the application's managed identity.",
        },
        {
          id: "rem-new-secret",
          label: "Create a new secret version with an updated expiration date",
          description: "Generate a new secret version to replace the expired one.",
        },
        {
          id: "rem-firewall",
          label: "Add the App Service outbound IP addresses to the Key Vault firewall allowlist",
          description: "Update Key Vault network rules to permit access from the application.",
        },
        {
          id: "rem-recover-secret",
          label: "Use 'az keyvault secret recover' to restore the soft-deleted secret",
          description: "Recover the deleted secret from the 90-day soft-delete retention period.",
        },
      ],
      correctRemediationId: "rem-restore-policy",
      rationales: [
        {
          id: "rationale-correct",
          text: "The audit log confirms HTTP 403 'Caller is not authorized' and the access policy shows the managed identity has no secret permissions. The activity log proves an admin removed the access policy entry 3 days ago. Re-adding Get and List permissions to the webapp-prod managed identity immediately resolves the 403.",
        },
        {
          id: "rationale-wrong-expired",
          text: "An expired secret returns HTTP 403 with a different error description: 'The secret is expired'. The error here says 'not authorized to perform action', which indicates an access control problem, not an expiration issue.",
        },
        {
          id: "rationale-wrong-network",
          text: "Network firewall blocks return a different error (403 with 'Public network access is disabled' or connection timeout). The audit log explicitly shows the request reached Key Vault and was evaluated — network blocks prevent the request from arriving at Key Vault at all.",
        },
      ],
      correctRationaleId: "rationale-correct",
      feedback: {
        perfect:
          "Correct triage and remediation. The audit log and access policy clearly point to a missing permission — an admin accidentally removed the managed identity's access 3 days ago.",
        partial:
          "You identified a real issue but the evidence doesn't support that classification. Read the audit log HTTP status code description carefully — it differentiates access policy from expired secret failures.",
        wrong:
          "The evidence trail in the change log and audit logs clearly points to an access policy change as the root cause. Cross-referencing the activity log with the audit log is the key diagnostic step.",
      },
    },
    {
      type: "triage-remediate",
      id: "scenario-2",
      title: "Secret Rotation Function — Silent Failure",
      description:
        "A Key Vault secret rotation function (Azure Functions + Event Grid) was set up to auto-rotate the storage account key every 30 days. The Key Vault expiry notification event fires correctly, but the function completes without actually updating the secret. The storage account key has been expired for 12 days.",
      evidence: [
        {
          type: "log",
          content:
            "Azure Function Log: [Information] SecretRotationFunction started for secret 'storage-account-key'. [Information] Retrieved current secret version. [Information] Requesting new storage account key. [Error] Storage.Management SDK: The client 'rotation-func-identity' with object id 'f3c9-...' does not have authorization to perform action 'Microsoft.Storage/storageAccounts/regenerateKey/action' over scope '/subscriptions/.../storageAccounts/prodstorage01'.",
        },
        {
          type: "log",
          content:
            "Function code: try { await storageClient.regenerateKey(resourceGroup, storageAccountName, 'key1'); await keyVaultClient.setSecret(secretName, newKey); } catch (ex) { log.LogError(ex.Message); } — Note: the catch block logs but does NOT re-throw the exception or set function result as failed.",
        },
        {
          type: "config",
          content:
            "RBAC assignments on prodstorage01: rotation-func-identity has role 'Storage Blob Data Contributor'. No assignment for 'Storage Account Key Operator Service Role' or 'Contributor'.",
        },
        {
          type: "metric",
          content:
            "Event Grid: 'SecretNearExpiry' event delivered successfully to function endpoint. HTTP 200 response received from function. Function appears to succeed from Event Grid's perspective.",
        },
      ],
      classifications: [
        {
          id: "class-wrong-role",
          label: "Incorrect RBAC Role — Missing Key Regeneration Permission",
          description: "The function's managed identity lacks the role required to regenerate storage account keys.",
        },
        {
          id: "class-event-grid-fail",
          label: "Event Grid Delivery Failure",
          description: "The SecretNearExpiry event is not being delivered to the function.",
        },
        {
          id: "class-kv-permission",
          label: "Key Vault Secret Write Permission Missing",
          description: "The function can regenerate the key but cannot write the new value back to Key Vault.",
        },
        {
          id: "class-silent-exception",
          label: "Silent Exception — Code Swallows Error Without Failing",
          description: "The function catches the exception, logs it, but returns HTTP 200, hiding the failure.",
        },
      ],
      correctClassificationId: "class-wrong-role",
      remediations: [
        {
          id: "rem-add-role",
          label: "Assign 'Storage Account Key Operator Service Role' to the rotation function's managed identity on the storage account",
          description: "Grant the correct RBAC role that allows key regeneration operations.",
        },
        {
          id: "rem-fix-catch",
          label: "Fix the catch block to re-throw the exception (or return HTTP 500) so function failures are visible",
          description: "Update the error handling to propagate failures visibly.",
        },
        {
          id: "rem-kv-write",
          label: "Add Set permission on secrets to the function's Key Vault access policy",
          description: "Grant the function write access to Key Vault secrets.",
        },
        {
          id: "rem-event-grid-retry",
          label: "Configure Event Grid retry policy with dead-letter destination",
          description: "Set up retry policy to handle transient Event Grid delivery failures.",
        },
      ],
      correctRemediationId: "rem-add-role",
      rationales: [
        {
          id: "rationale-correct",
          text: "The function log explicitly shows 'does not have authorization to perform action Microsoft.Storage/storageAccounts/regenerateKey'. The RBAC listing confirms the function has 'Storage Blob Data Contributor' (for blob data plane) but not 'Storage Account Key Operator Service Role' (for key management plane). Adding this role directly resolves the authorization failure. The silent exception is a secondary bug worth fixing but is not the root cause.",
        },
        {
          id: "rationale-wrong-event",
          text: "Event Grid delivery is confirmed working — the function log shows the function started and processed the event. The failure occurs inside the function during key regeneration, not at the delivery layer.",
        },
        {
          id: "rationale-wrong-kv",
          text: "The function log shows the error occurs on the regenerateKey call (storage management plane) before the setSecret call (Key Vault write) is even attempted. A Key Vault write permission issue would produce a different error at a later stage.",
        },
      ],
      correctRationaleId: "rationale-correct",
      feedback: {
        perfect:
          "Correct. The RBAC role assignment is the root cause — the function's identity has blob data access but not the management plane permission needed for key regeneration.",
        partial:
          "You identified a real problem in the code (silent exception handling) but it is a secondary issue. The primary root cause — the missing RBAC role — must be fixed for rotation to work at all.",
        wrong:
          "The function log clearly identifies the authorization error on the regenerateKey operation. Always read the full error message before selecting a classification.",
      },
    },
    {
      type: "triage-remediate",
      id: "scenario-3",
      title: "Soft-Deleted Secret — Application Cannot Start",
      description:
        "A new deployment of an application fails on startup with Key Vault secret not found errors. The secret 'api-gateway-key' was recently deleted as part of a cleanup script that mistakenly targeted the production Key Vault instead of the dev Key Vault. Soft-delete is enabled with a 90-day retention. Purge protection is also enabled.",
      evidence: [
        {
          type: "log",
          content:
            "App Service Startup Error: SecretNotFoundException: A secret with name 'api-gateway-key' was not found in https://prod-kv.vault.azure.net. StatusCode: 404. ErrorCode: SecretNotFound.",
        },
        {
          type: "log",
          content:
            "Key Vault Audit Log (2 hours ago): Operation: SecretDelete, Identity: devops-automation-sp, SecretName: api-gateway-key, ResultType: Success. Deletion Type: Soft-Delete (90-day retention).",
        },
        {
          type: "metric",
          content:
            "az keyvault secret list-deleted --vault-name prod-kv: [{name: 'api-gateway-key', id: 'https://prod-kv.vault.azure.net/deletedsecrets/api-gateway-key', deletedDate: '2026-03-28T01:15:00Z', scheduledPurgeDate: '2026-06-26T01:15:00Z', recoveryId: 'https://prod-kv.vault.azure.net/deletedsecrets/api-gateway-key'}]",
        },
        {
          type: "config",
          content:
            "Key Vault properties: softDeleteRetentionInDays: 90, enablePurgeProtection: true. Note: Purge protection prevents permanent deletion during retention period — even by Key Vault admins.",
        },
      ],
      classifications: [
        {
          id: "class-secret-deleted",
          label: "Secret Soft-Deleted — Recoverable Within Retention Period",
          description: "The secret was soft-deleted 2 hours ago and is still within the 90-day recovery window.",
        },
        {
          id: "class-secret-purged",
          label: "Secret Permanently Purged — Unrecoverable",
          description: "The secret was hard-deleted and cannot be recovered.",
        },
        {
          id: "class-wrong-vault",
          label: "Application Pointing to Wrong Key Vault",
          description: "The application is configured to use a different Key Vault than expected.",
        },
        {
          id: "class-access-revoked",
          label: "Access Policy Revoked During Cleanup",
          description: "The cleanup script also revoked the access policy for the application.",
        },
      ],
      correctClassificationId: "class-secret-deleted",
      remediations: [
        {
          id: "rem-recover",
          label: "Run 'az keyvault secret recover --name api-gateway-key --vault-name prod-kv' to restore the secret",
          description: "Recover the soft-deleted secret back to active state using the CLI.",
        },
        {
          id: "rem-recreate",
          label: "Recreate the secret manually with a new value retrieved from the team's password manager",
          description: "Create a brand new secret with the original API key value.",
        },
        {
          id: "rem-update-app",
          label: "Update the application configuration to point to the dev Key Vault where the secret still exists",
          description: "Change the Key Vault reference in the application settings.",
        },
        {
          id: "rem-purge",
          label: "Purge the deleted secret and create a new one with the same name",
          description: "Permanently delete then recreate the secret.",
        },
      ],
      correctRemediationId: "rem-recover",
      rationales: [
        {
          id: "rationale-correct",
          text: "The soft-delete audit log confirms the secret was soft-deleted 2 hours ago, the list-deleted output shows it is still in the deleted secrets store, and purge protection means it cannot be permanently deleted until the 90-day retention expires. 'az keyvault secret recover' restores it to active state in seconds, with zero data loss.",
        },
        {
          id: "rationale-wrong-purged",
          text: "The audit log shows soft-delete (not purge), the list-deleted output confirms the secret is still in the deleted state with a future scheduledPurgeDate, and purge protection is enabled. The secret is recoverable.",
        },
        {
          id: "rationale-wrong-purge-rem",
          text: "Purge protection explicitly prevents purging during the retention period — the purge command would fail. Even if it worked, purging and recreating adds unnecessary complexity when recovery is available and instantaneous.",
        },
      ],
      correctRationaleId: "rationale-correct",
      feedback: {
        perfect:
          "Correct. Soft-delete with purge protection is specifically designed for this scenario — a single CLI command recovers the secret instantly without any data loss.",
        partial:
          "Your classification or remediation is close but misses the specific recovery path that soft-delete provides. Recreating manually works but loses audit history and requires the original value.",
        wrong:
          "The evidence clearly shows the secret is soft-deleted (recoverable), not purged (unrecoverable). Purge protection also means the purge command would fail. Check the soft-delete status before concluding data is lost.",
      },
    },
  ],
  hints: [
    "Key Vault 403 errors have different descriptions: 'not authorized to perform action' = access policy/RBAC issue; 'The secret is expired' = expiration issue; 'Public network access is disabled' = firewall rule issue.",
    "When a rotation function silently succeeds but doesn't rotate, check: (1) RBAC role on the target resource, (2) Key Vault write permissions, (3) whether the catch block swallows exceptions without failing the function.",
    "If soft-delete is enabled and a secret was deleted recently, 'az keyvault secret list-deleted' will show it — recover it before reaching for manual re-creation, which requires knowing the original secret value.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Key Vault secret management is a foundational security skill in Azure. Production incidents involving expired secrets, rotation failures, and accidental deletions are surprisingly common — and every cloud security role expects you to diagnose and remediate them quickly. Key Vault audit logs are the single best diagnostic tool and are frequently underutilized.",
  toolRelevance: ["Azure Portal", "Azure Key Vault", "Azure CLI", "Azure Monitor", "Azure Functions"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
