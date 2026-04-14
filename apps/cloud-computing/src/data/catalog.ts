// ============================================================
// DCI Cloud Computing Labs — Lab Catalog
// All lab manifests are imported here and exported as a single array.
// The app reads from this catalog for routing, display, and filtering.
// ============================================================

import type { LabManifest } from "../types/manifest";
import { apiGatewayDesignLab } from "./labs/api-gateway-design";
import { apiVersioningStrategyLab } from "./labs/api-versioning-strategy";
import { appServiceDeploymentLab } from "./labs/app-service-deployment";
import { autoScalingPoliciesLab } from "./labs/auto-scaling-policies";
import { awsAuroraFailoverLab } from "./labs/aws-aurora-failover";
import { awsElasticacheConfigLab } from "./labs/aws-elasticache-config";
import { awsEventbridgePatternsLab } from "./labs/aws-eventbridge-patterns";
import { awsKinesisStreamingLab } from "./labs/aws-kinesis-streaming";
import { awsOrganizationsScpLab } from "./labs/aws-organizations-scp";
import { awsStepFunctionsDesignLab } from "./labs/aws-step-functions-design";
import { awsWafRulesLab } from "./labs/aws-waf-rules";
import { azureAdConditionalLab } from "./labs/azure-ad-conditional";
import { azureAksNetworkingLab } from "./labs/azure-aks-networking";
import { azureCosmosPartitioningLab } from "./labs/azure-cosmos-partitioning";
import { azureDataFactoryPipelineLab } from "./labs/azure-data-factory-pipeline";
import { azureDefenderConfigLab } from "./labs/azure-defender-config";
import { azureFrontDoorRoutingLab } from "./labs/azure-front-door-routing";
import { azureFunctionsTriggersLab } from "./labs/azure-functions-triggers";
import { azureLoadBalancerLab } from "./labs/azure-load-balancer";
import { azureMonitorAlertsLab } from "./labs/azure-monitor-alerts";
import { azurePolicyComplianceLab } from "./labs/azure-policy-compliance";
import { azurePrivateEndpointsLab } from "./labs/azure-private-endpoints";
import { azureRbacReviewLab } from "./labs/azure-rbac-review";
import { azureSentinelDetectionLab } from "./labs/azure-sentinel-detection";
import { azureServiceBusDesignLab } from "./labs/azure-service-bus-design";
import { azureSqlPerformanceLab } from "./labs/azure-sql-performance";
import { azureVmScalingLab } from "./labs/azure-vm-scaling";
import { azureVnetSecurityLab } from "./labs/azure-vnet-security";
import { blobStorageTiersLab } from "./labs/blob-storage-tiers";
import { blueGreenDeploymentLab } from "./labs/blue-green-deployment";
import { cachingStrategyLab } from "./labs/caching-strategy";
import { capacityPlanningForecastLab } from "./labs/capacity-planning-forecast";
import { chaosEngineeringExperimentLab } from "./labs/chaos-engineering-experiment";
import { cicdPipelineDesignLab } from "./labs/cicd-pipeline-design";
import { cloudAuditLoggingLab } from "./labs/cloud-audit-logging";
import { cloudDlpConfigurationLab } from "./labs/cloud-dlp-configuration";
import { cloudForensicsInvestigationLab } from "./labs/cloud-forensics-investigation";
import { cloudIdentityManagementLab } from "./labs/cloud-identity-management";
import { cloudMigrationStrategyLab } from "./labs/cloud-migration-strategy";
import { cloudWafConfigurationLab } from "./labs/cloud-waf-configuration";
import { cloudformationDriftLab } from "./labs/cloudformation-drift";
import { cloudfrontCachingLab } from "./labs/cloudfront-caching";
import { cloudwatchAlarmSetupLab } from "./labs/cloudwatch-alarm-setup";
import { complianceFrameworkMappingLab } from "./labs/compliance-framework-mapping";
import { containerOrchestrationLab } from "./labs/container-orchestration";
import { containerSecurityScanningLab } from "./labs/container-security-scanning";
import { costAnomalyInvestigationLab } from "./labs/cost-anomaly-investigation";
import { costOptimizationReviewLab } from "./labs/cost-optimization-review";
import { crossAccountSecurityLab } from "./labs/cross-account-security";
import { dataLakeArchitectureLab } from "./labs/data-lake-architecture";
import { databaseSelectionLab } from "./labs/database-selection";
import { devsecopsPipelineSecurityLab } from "./labs/devsecops-pipeline-security";
import { disasterRecoveryPlanningLab } from "./labs/disaster-recovery-planning";
import { dynamodbCapacityLab } from "./labs/dynamodb-capacity";
import { ec2InstanceSizingLab } from "./labs/ec2-instance-sizing";
import { ec2SpotVsOndemandLab } from "./labs/ec2-spot-vs-ondemand";
import { ecsTaskScalingLab } from "./labs/ecs-task-scaling";
import { encryptionAtRestLab } from "./labs/encryption-at-rest";
import { eventDrivenArchitectureLab } from "./labs/event-driven-architecture";
import { gcpAnthosMulticlusterLab } from "./labs/gcp-anthos-multicluster";
import { gcpBigqueryOptimizationLab } from "./labs/gcp-bigquery-optimization";
import { gcpCloudArmorWafLab } from "./labs/gcp-cloud-armor-waf";
import { gcpCloudFunctionsDesignLab } from "./labs/gcp-cloud-functions-design";
import { gcpCloudRunScalingLab } from "./labs/gcp-cloud-run-scaling";
import { gcpCloudSqlHaLab } from "./labs/gcp-cloud-sql-ha";
import { gcpCloudStorageClassesLab } from "./labs/gcp-cloud-storage-classes";
import { gcpComputeSizingLab } from "./labs/gcp-compute-sizing";
import { gcpDataflowPipelineLab } from "./labs/gcp-dataflow-pipeline";
import { gcpGkeClusterConfigLab } from "./labs/gcp-gke-cluster-config";
import { gcpIamServiceAccountsLab } from "./labs/gcp-iam-service-accounts";
import { gcpLoadBalancingLab } from "./labs/gcp-load-balancing";
import { gcpPubSubDesignLab } from "./labs/gcp-pub-sub-design";
import { gcpSpannerVsSqlLab } from "./labs/gcp-spanner-vs-sql";
import { gcpVpcFirewallRulesLab } from "./labs/gcp-vpc-firewall-rules";
import { gitopsWorkflowDesignLab } from "./labs/gitops-workflow-design";
import { haArchitectureDesignLab } from "./labs/ha-architecture-design";
import { iamPolicyReviewLab } from "./labs/iam-policy-review";
import { incidentResponseRunbookLab } from "./labs/incident-response-runbook";
import { keyVaultRotationLab } from "./labs/key-vault-rotation";
import { lambdaColdStartLab } from "./labs/lambda-cold-start";
import { lambdaConcurrencyLab } from "./labs/lambda-concurrency";
import { logAggregationStrategyLab } from "./labs/log-aggregation-strategy";
import { microservicesDecompositionLab } from "./labs/microservices-decomposition";
import { multiCloudDesignLab } from "./labs/multi-cloud-design";
import { multiRegionDeploymentLab } from "./labs/multi-region-deployment";
import { networkSecurityGroupsLab } from "./labs/network-security-groups";
import { observabilityStackDesignLab } from "./labs/observability-stack-design";
import { rdsBackupStrategyLab } from "./labs/rds-backup-strategy";
import { route53FailoverLab } from "./labs/route53-failover";
import { s3BucketSecurityLab } from "./labs/s3-bucket-security";
import { s3LifecyclePoliciesLab } from "./labs/s3-lifecycle-policies";
import { secretsManagerSetupLab } from "./labs/secrets-manager-setup";
import { securityIncidentCloudLab } from "./labs/security-incident-cloud";
import { serverlessVsContainersLab } from "./labs/serverless-vs-containers";
import { sreSliSloDefinitionLab } from "./labs/sre-sli-slo-definition";
import { supplyChainSecurityCloudLab } from "./labs/supply-chain-security-cloud";
import { terraformStateManagementLab } from "./labs/terraform-state-management";
import { twelveFactorAppReviewLab } from "./labs/twelve-factor-app-review";
import { vpcSubnetDesignLab } from "./labs/vpc-subnet-design";
import { zeroTrustNetworkLab } from "./labs/zero-trust-network";

export const labCatalog: LabManifest[] = [
  // AWS Core (20)
  ec2InstanceSizingLab,
  s3BucketSecurityLab,
  rdsBackupStrategyLab,
  lambdaColdStartLab,
  iamPolicyReviewLab,
  vpcSubnetDesignLab,
  cloudfrontCachingLab,
  route53FailoverLab,
  ecsTaskScalingLab,
  dynamodbCapacityLab,
  s3LifecyclePoliciesLab,
  ec2SpotVsOndemandLab,
  lambdaConcurrencyLab,
  awsElasticacheConfigLab,
  awsKinesisStreamingLab,
  awsStepFunctionsDesignLab,
  awsOrganizationsScpLab,
  awsWafRulesLab,
  awsAuroraFailoverLab,
  awsEventbridgePatternsLab,

  // Azure Fundamentals (20)
  azureVmScalingLab,
  blobStorageTiersLab,
  azureAdConditionalLab,
  appServiceDeploymentLab,
  azureSqlPerformanceLab,
  azureFunctionsTriggersLab,
  azureVnetSecurityLab,
  keyVaultRotationLab,
  azureMonitorAlertsLab,
  azureLoadBalancerLab,
  azureRbacReviewLab,
  azureCosmosPartitioningLab,
  azureAksNetworkingLab,
  azureFrontDoorRoutingLab,
  azureServiceBusDesignLab,
  azureDefenderConfigLab,
  azurePolicyComplianceLab,
  azureDataFactoryPipelineLab,
  azurePrivateEndpointsLab,
  azureSentinelDetectionLab,

  // GCP Essentials (15)
  gcpComputeSizingLab,
  gcpCloudStorageClassesLab,
  gcpBigqueryOptimizationLab,
  gcpCloudFunctionsDesignLab,
  gcpIamServiceAccountsLab,
  gcpVpcFirewallRulesLab,
  gcpCloudRunScalingLab,
  gcpGkeClusterConfigLab,
  gcpCloudSqlHaLab,
  gcpPubSubDesignLab,
  gcpLoadBalancingLab,
  gcpSpannerVsSqlLab,
  gcpCloudArmorWafLab,
  gcpDataflowPipelineLab,
  gcpAnthosMulticlusterLab,

  // Cloud Architecture (15)
  haArchitectureDesignLab,
  disasterRecoveryPlanningLab,
  multiRegionDeploymentLab,
  microservicesDecompositionLab,
  serverlessVsContainersLab,
  costOptimizationReviewLab,
  databaseSelectionLab,
  cachingStrategyLab,
  apiGatewayDesignLab,
  eventDrivenArchitectureLab,
  cloudMigrationStrategyLab,
  multiCloudDesignLab,
  twelveFactorAppReviewLab,
  dataLakeArchitectureLab,
  apiVersioningStrategyLab,

  // Cloud Security (15)
  cloudIdentityManagementLab,
  encryptionAtRestLab,
  networkSecurityGroupsLab,
  complianceFrameworkMappingLab,
  secretsManagerSetupLab,
  zeroTrustNetworkLab,
  cloudWafConfigurationLab,
  securityIncidentCloudLab,
  cloudAuditLoggingLab,
  containerSecurityScanningLab,
  cloudForensicsInvestigationLab,
  cloudDlpConfigurationLab,
  crossAccountSecurityLab,
  devsecopsPipelineSecurityLab,
  supplyChainSecurityCloudLab,

  // Cloud Operations / DevOps (15)
  cicdPipelineDesignLab,
  cloudwatchAlarmSetupLab,
  terraformStateManagementLab,
  autoScalingPoliciesLab,
  incidentResponseRunbookLab,
  costAnomalyInvestigationLab,
  cloudformationDriftLab,
  containerOrchestrationLab,
  logAggregationStrategyLab,
  blueGreenDeploymentLab,
  sreSliSloDefinitionLab,
  chaosEngineeringExperimentLab,
  observabilityStackDesignLab,
  gitopsWorkflowDesignLab,
  capacityPlanningForecastLab,
].sort((a, b) => a.sortOrder - b.sortOrder);
