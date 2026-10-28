export interface DiffOptions {
  projectRoot: string;
  against?: string | undefined;
  stackName?: string | undefined;
  region?: string | undefined;
  checkReplacement?: boolean | undefined;
  allowStatefulReplacement?: boolean | undefined;
}

export const STATEFUL_RESOURCE_TYPES = new Set([
  "AWS::DynamoDB::Table",
  "AWS::DynamoDB::GlobalTable",
  "AWS::S3::Bucket",
  "AWS::RDS::DBInstance",
  "AWS::RDS::DBCluster",
  "AWS::DocDB::DBCluster",
  "AWS::OpenSearchService::Domain",
  "AWS::Elasticsearch::Domain",
  "AWS::Neptune::DBCluster",
  "AWS::Cognito::UserPool",
]);

export interface ResourceDiff {
  logicalId: string;
  type: string;
  action: "CREATE" | "UPDATE" | "REPLACE" | "DELETE" | "IN_SYNC";
  details?: string[] | undefined;
  replacement?: "True" | "False" | "Conditional" | undefined;
}
