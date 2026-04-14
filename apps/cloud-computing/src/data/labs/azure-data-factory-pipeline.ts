import type { LabManifest } from "../../types/manifest";

export const azureDataFactoryPipelineLab: LabManifest = {
  schemaVersion: "1.1",
  id: "azure-data-factory-pipeline",
  version: 1,
  title: "Azure Data Factory Pipeline Design and Integration Runtime",
  tier: "intermediate",
  track: "azure-fundamentals",
  difficulty: "moderate",
  accessLevel: "free",
  tags: ["azure", "data-factory", "etl", "pipeline", "linked-services", "integration-runtime", "data-flow"],
  description:
    "Design Azure Data Factory pipelines for data ingestion and transformation, configure linked services for diverse data sources, and select the appropriate integration runtime for hybrid and cloud-native scenarios.",
  estimatedMinutes: 12,
  learningObjectives: [
    "Design ADF pipelines with appropriate activities (Copy, Data Flow, Stored Procedure, Web) for ETL/ELT patterns",
    "Configure linked services to connect securely to on-premises, cloud, and SaaS data sources",
    "Select between Azure IR, Self-Hosted IR, and Azure-SSIS IR based on data source location and workload type",
    "Implement pipeline triggers, dependency chains, and error handling for production data workflows",
  ],
  sortOrder: 218,
  status: "published",
  prerequisites: [],
  rendererType: "action-rationale",
  scenarios: [
    {
      type: "action-rationale",
      id: "scenario-1",
      title: "Integration Runtime Selection — Hybrid Data Ingestion",
      context:
        "A retail company needs to ingest daily sales data from three sources into Azure Data Lake Storage Gen2: (1) an on-premises SQL Server 2019 behind a corporate firewall with no public endpoint, (2) a Salesforce CRM API in the cloud, and (3) CSV files from an SFTP server hosted by a third-party partner. The data engineer needs to select the correct integration runtime configuration for each source.",
      displayFields: [
        { label: "Source 1", value: "On-premises SQL Server 2019 — behind firewall, no public IP, 500GB database" },
        { label: "Source 2", value: "Salesforce CRM API — cloud-hosted REST API with OAuth authentication" },
        { label: "Source 3", value: "SFTP server — partner-hosted, accessible via public IP on port 22" },
        { label: "Destination", value: "Azure Data Lake Storage Gen2 (Parquet format)" },
        { label: "Network", value: "Corporate firewall blocks all inbound connections; outbound HTTPS allowed" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Self-Hosted IR for on-premises SQL Server (installed on a VM inside the corporate network), Azure IR for Salesforce API and SFTP server (both accessible from the cloud)",
          color: "green",
        },
        {
          id: "action-b",
          label: "Azure IR for all three sources — configure VNet integration on Azure IR to reach the on-premises SQL Server via ExpressRoute",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Self-Hosted IR for all three sources — install on a corporate VM that can reach all three data sources",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Azure-SSIS IR for the SQL Server source (it supports SQL Server connections natively), Azure IR for Salesforce and SFTP",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Self-Hosted IR is required for the on-premises SQL Server because it sits behind a firewall with no public endpoint. The Self-Hosted IR agent is installed on a VM inside the corporate network, connects outbound to ADF over HTTPS (allowed by the firewall), and reads data from the local SQL Server. Salesforce API and the partner SFTP server are both accessible from the public internet, so Azure IR (the managed cloud runtime) handles them without any additional infrastructure. This minimizes Self-Hosted IR usage to only the source that requires it.",
        },
        {
          id: "rationale-b",
          text: "Azure IR with Managed VNet can access resources via private endpoints within Azure, but it cannot reach an on-premises SQL Server behind a corporate firewall unless ExpressRoute or VPN is already configured with private endpoint connectivity to Azure. The scenario does not indicate ExpressRoute exists. Even with ExpressRoute, Azure IR Managed VNet requires additional private endpoint configuration that adds complexity compared to Self-Hosted IR.",
        },
        {
          id: "rationale-c",
          text: "Using Self-Hosted IR for all three sources works but is suboptimal — Salesforce and SFTP traffic would route through the corporate network unnecessarily, consuming corporate bandwidth and adding latency. Azure IR is managed, auto-scaling, and geographically distributed — it should be used for cloud-accessible sources. Reserve Self-Hosted IR for sources that cannot be reached from the cloud.",
        },
        {
          id: "rationale-d",
          text: "Azure-SSIS IR is designed specifically for running SQL Server Integration Services (SSIS) packages in the cloud. It is NOT a general-purpose SQL Server connector. For standard data copy operations from SQL Server, the Copy Activity with Self-Hosted IR is the correct approach. Azure-SSIS IR is only needed when migrating existing SSIS packages to Azure.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Self-Hosted IR for on-premises sources behind firewalls, Azure IR for cloud-accessible sources — this minimizes infrastructure while ensuring connectivity to all data sources.",
        partial:
          "Self-Hosted IR for all sources works but wastes corporate bandwidth on cloud-accessible sources. Azure-SSIS IR is for SSIS package execution, not general SQL Server connectivity.",
        wrong:
          "Azure-SSIS IR is designed for running SSIS packages, not for standard Copy Activity data ingestion from SQL Server. Do not confuse SSIS runtime with SQL Server connectivity.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-2",
      title: "Pipeline Error Handling — Partial Failure in Multi-Source Ingestion",
      context:
        "A daily ADF pipeline ingests data from 5 independent sources (SAP, Salesforce, Oracle, PostgreSQL, REST API) into a data lake, then runs a transformation Data Flow that joins all 5 datasets. Yesterday, the Oracle source was temporarily unavailable and the entire pipeline failed — including the 4 successful copy activities. The transformation never ran even though 4 of 5 sources had fresh data. The business wants the pipeline to process available data and only fail the Oracle branch.",
      displayFields: [
        { label: "Pipeline Structure", value: "5 parallel Copy Activities → 1 Data Flow (joins all 5 datasets)" },
        { label: "Failure", value: "Oracle Copy Activity failed (connection timeout), pipeline marked as Failed" },
        { label: "Impact", value: "4 successful copies discarded, Data Flow never executed" },
        { label: "Business Requirement", value: "Process available data even if one source fails — use previous day's data for failed source" },
        { label: "SLA", value: "Dashboard must refresh by 07:00 even with partial data" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Set each Copy Activity's failure dependency to continue (activity dependency condition: 'Completed' instead of 'Succeeded'), add conditional logic before the Data Flow to check which sources succeeded, and use previous day's data for failed sources",
          color: "green",
        },
        {
          id: "action-b",
          label: "Wrap each Copy Activity in a separate Try-Catch (Execute Pipeline activity) and set all 5 to run in parallel with 'Succeeded' dependency on the Data Flow",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Add retry policies (3 retries, 10-minute interval) to each Copy Activity to handle transient failures",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Split the pipeline into 5 separate pipelines (one per source) with independent schedules, then run the Data Flow in a 6th pipeline after all 5 complete",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Using the 'Completed' dependency condition (instead of 'Succeeded') means downstream activities execute regardless of whether the upstream activity succeeded or failed. An If Condition activity after the parallel copies checks each source's completion status (using @activity('CopyOracle').status). If a source failed, the Data Flow uses the previous day's data partition for that source. The pipeline continues to completion, the dashboard refreshes on time with 4 fresh + 1 stale dataset, and an alert notifies the team about the Oracle failure for investigation.",
        },
        {
          id: "rationale-b",
          text: "Execute Pipeline with Try-Catch is a valid pattern but adds complexity — 5 child pipelines, each with its own monitoring, logging, and failure handling. The simpler approach is the 'Completed' dependency condition within a single pipeline, which ADF supports natively without nesting pipelines.",
        },
        {
          id: "rationale-c",
          text: "Retry policies help with transient failures (network blips, temporary timeouts) but do not handle extended outages. If Oracle is down for 2 hours, 3 retries at 10-minute intervals still fail after 30 minutes, and the pipeline still fails entirely. Retries should be combined with graceful degradation logic, not used as the sole error handling strategy.",
        },
        {
          id: "rationale-d",
          text: "Five separate pipelines with a coordinating 6th pipeline introduces orchestration complexity — the 6th pipeline must wait for all 5 to complete, handle partial failures across pipeline boundaries, and manage cross-pipeline dependencies. ADF's built-in parallel activities with dependency conditions handle this within a single pipeline far more simply.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. The 'Completed' dependency condition with conditional fallback logic allows the pipeline to process available data while gracefully degrading when individual sources fail.",
        partial:
          "Retry policies handle transient failures but not extended outages. Try-Catch with nested pipelines works but adds unnecessary complexity when ADF supports dependency conditions natively.",
        wrong:
          "Splitting into separate pipelines increases orchestration complexity and makes cross-pipeline error handling more difficult than handling it within a single pipeline.",
      },
    },
    {
      type: "action-rationale",
      id: "scenario-3",
      title: "Linked Service Security — Credential Management for Production Pipelines",
      context:
        "A data engineer has built an ADF pipeline that copies data from Azure SQL Database to Azure Data Lake Storage Gen2. In development, the linked services use connection strings with embedded passwords stored in the ADF JSON definition. Before promoting to production, the security team requires that no credentials are stored in ADF definitions, all secrets are centralized, and access should be revocable without redeploying pipelines.",
      displayFields: [
        { label: "Current State", value: "Connection strings with embedded passwords in linked service JSON" },
        { label: "SQL Database Auth", value: "SQL authentication (username/password) in connection string" },
        { label: "Data Lake Auth", value: "Storage account access key in linked service" },
        { label: "Security Requirements", value: "No embedded credentials, centralized secrets, revocable access" },
        { label: "Environment", value: "Production — must pass security audit" },
      ],
      actions: [
        {
          id: "action-a",
          label: "Enable managed identity on the ADF instance, grant the managed identity RBAC roles on SQL Database (db_datareader) and Data Lake (Storage Blob Data Contributor), and update linked services to use managed identity authentication — no secrets needed",
          color: "green",
        },
        {
          id: "action-b",
          label: "Move the connection string passwords to Azure Key Vault and reference them from the linked services using Key Vault linked service integration",
          color: "yellow",
        },
        {
          id: "action-c",
          label: "Use Azure Active Directory service principal authentication with client ID and client secret stored in ADF parameters",
          color: "orange",
        },
        {
          id: "action-d",
          label: "Encrypt the connection strings using ADF's built-in encryption and restrict access to the ADF resource with Azure RBAC",
          color: "red",
        },
      ],
      correctActionId: "action-a",
      rationales: [
        {
          id: "rationale-a",
          text: "Managed identity is the gold standard for Azure-to-Azure authentication: (1) No credentials exist — the identity is managed by Azure AD and automatically rotated. (2) Access is granted via RBAC roles (db_datareader on SQL, Storage Blob Data Contributor on ADLS) and revoked by removing the role assignment. (3) No secrets in ADF definitions, Key Vault, or anywhere else — the authentication uses Azure AD tokens. (4) Works natively with both Azure SQL Database (AAD authentication) and Data Lake Storage Gen2 (RBAC). This satisfies all three security requirements with zero secret management overhead.",
        },
        {
          id: "rationale-b",
          text: "Key Vault integration is the second-best option and is correct for non-Azure sources that require passwords (e.g., on-premises SQL Server, third-party APIs). However, for Azure-to-Azure connectivity, managed identity eliminates secrets entirely — Key Vault still stores a secret (the password), which must be rotated, monitored, and managed. Managed identity removes the secret lifecycle completely.",
        },
        {
          id: "rationale-c",
          text: "Service principal with client secret stored in ADF parameters is worse than the current state — ADF parameters are visible in the pipeline JSON and are not encrypted at rest. The client secret is a credential that must be rotated every 1-2 years, monitored for expiration, and secured. This moves the problem without solving it.",
        },
        {
          id: "rationale-d",
          text: "ADF encrypts linked service data at rest using Microsoft-managed keys by default. This protects against storage-level access but does not prevent ADF developers from viewing connection strings in the portal or ARM templates. The embedded password is still present in the definition — it is merely encrypted at rest. This does not meet the 'no embedded credentials' requirement.",
        },
      ],
      correctRationaleId: "rationale-a",
      feedback: {
        perfect:
          "Correct. Managed identity eliminates credentials entirely for Azure-to-Azure connections — no secrets to store, rotate, or manage. It is the recommended authentication method for production ADF pipelines.",
        partial:
          "Key Vault is appropriate for non-Azure sources that require passwords, but for Azure-to-Azure connectivity, managed identity provides stronger security with zero secret management.",
        wrong:
          "Storing service principal secrets in ADF parameters exposes credentials in pipeline JSON. ADF built-in encryption protects at-rest storage but does not remove embedded credentials from definitions.",
      },
    },
  ],
  hints: [
    "Self-Hosted Integration Runtime is required for data sources behind firewalls or without public endpoints — it connects outbound to ADF and reads data locally. Use Azure IR for all cloud-accessible sources.",
    "ADF activity dependency conditions ('Succeeded', 'Failed', 'Completed', 'Skipped') control pipeline flow — use 'Completed' to continue execution regardless of upstream success or failure for graceful degradation.",
    "For Azure-to-Azure authentication in ADF, managed identity eliminates all secrets — no passwords, no keys, no rotation. Reserve Key Vault integration for non-Azure sources that require credential-based authentication.",
  ],
  scoring: {
    maxScore: 100,
    hintPenalty: 5,
    penalties: { perfect: 0, partial: 10, wrong: 20 },
    passingThresholds: { pass: 80, partial: 50 },
  },
  careerInsight:
    "Azure Data Factory is the primary data integration service for Azure-based data platforms. Understanding integration runtime selection, pipeline error handling, and credential security is essential for data engineers building production ETL/ELT pipelines — these are the areas where most production incidents and security audit failures originate.",
  toolRelevance: ["Azure Portal", "Azure Data Factory", "Azure Key Vault", "Azure Data Lake Storage", "Azure SQL Database", "Azure Monitor"],
  createdAt: "2026-03-28",
  updatedAt: "2026-03-28",
};
