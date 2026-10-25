// ==========================================
// Syncploy SDK Strongly Typed AWS Specifications
// ==========================================

// --- 1. Memory Size Types (AWS Lambda: 128 MB to 10,240 MB) ---
export type StandardMemoryMb =
  | 128
  | 256
  | 512
  | 1024
  | 1536 // 1 full vCPU
  | 2048
  | 3072
  | 4096
  | 6144
  | 8192
  | 10240;

export type StandardMemoryString =
  | "128MB"
  | "256MB"
  | "512MB"
  | "1024MB"
  | "1GB"
  | "1536MB"
  | "1.5GB"
  | "2048MB"
  | "2GB"
  | "3072MB"
  | "3GB"
  | "4096MB"
  | "4GB"
  | "8192MB"
  | "8GB"
  | "10240MB"
  | "10GB";

export type MemorySize =
  | StandardMemoryMb
  | StandardMemoryString
  | (number & {})
  | (string & {});

// --- 2. Duration / Timeout Types (AWS Lambda: 1s to 900s / 15m) ---
export type StandardTimeoutString =
  | "1s"
  | "2s"
  | "3s"
  | "5s"
  | "10s"
  | "15s"
  | "30s"
  | "60s"
  | "90s"
  | "120s"
  | "180s"
  | "300s"
  | "1m"
  | "2m"
  | "3m"
  | "5m"
  | "10m"
  | "15m";

export type Duration =
  | StandardTimeoutString
  | `${number}s`
  | `${number}m`
  | `${number}h`
  | number;

// --- 3. Strongly Typed IAM Actions Autocomplete ---
export type S3Action =
  | "s3:GetObject"
  | "s3:GetObjectVersion"
  | "s3:PutObject"
  | "s3:PutObjectAcl"
  | "s3:DeleteObject"
  | "s3:DeleteObjectVersion"
  | "s3:ListBucket"
  | "s3:ListBucketVersions"
  | "s3:GetBucketLocation";

export type DynamoDBAction =
  | "dynamodb:GetItem"
  | "dynamodb:PutItem"
  | "dynamodb:UpdateItem"
  | "dynamodb:DeleteItem"
  | "dynamodb:BatchGetItem"
  | "dynamodb:BatchWriteItem"
  | "dynamodb:Query"
  | "dynamodb:Scan"
  | "dynamodb:DescribeTable";

export type DynamoDBStreamAction =
  | "dynamodb:GetRecords"
  | "dynamodb:GetShardIterator"
  | "dynamodb:DescribeStream"
  | "dynamodb:ListStreams";

export type SQSAction =
  | "sqs:SendMessage"
  | "sqs:SendMessageBatch"
  | "sqs:ReceiveMessage"
  | "sqs:DeleteMessage"
  | "sqs:DeleteMessageBatch"
  | "sqs:GetQueueAttributes"
  | "sqs:GetQueueUrl"
  | "sqs:ChangeMessageVisibility";

export type SNSAction =
  | "sns:Publish"
  | "sns:PublishBatch"
  | "sns:Subscribe"
  | "sns:Unsubscribe"
  | "sns:GetTopicAttributes";

export type LambdaAction =
  | "lambda:InvokeFunction"
  | "lambda:InvokeAsync"
  | "lambda:PutFunctionConcurrency"
  | "lambda:DeleteFunctionConcurrency";

export type SecretsManagerAction =
  | "secretsmanager:GetSecretValue"
  | "secretsmanager:DescribeSecret"
  | "secretsmanager:PutSecretValue";

export type SSMAction =
  | "ssm:GetParameter"
  | "ssm:GetParameters"
  | "ssm:GetParametersByPath";

export type SageMakerAction =
  | "sagemaker:InvokeEndpoint"
  | "sagemaker:InvokeEndpointAsync";

export type FirehoseAction =
  | "firehose:PutRecord"
  | "firehose:PutRecordBatch";

export type EventBridgeAction =
  | "events:PutEvents";

export type CloudWatchAction =
  | "cloudwatch:PutMetricData"
  | "logs:CreateLogGroup"
  | "logs:CreateLogStream"
  | "logs:PutLogEvents";

export type CommonAwsAction =
  | S3Action
  | DynamoDBAction
  | DynamoDBStreamAction
  | SQSAction
  | SNSAction
  | LambdaAction
  | SecretsManagerAction
  | SSMAction
  | SageMakerAction
  | FirehoseAction
  | EventBridgeAction
  | CloudWatchAction;

export type AwsAction =
  | CommonAwsAction
  | `${string}:${string}`
  | "*"
  | (string & {});

export interface PolicyStatement {
  effect?: "Allow" | "Deny";
  actions: AwsAction[];
  resources: string[];
}

// --- 4. CORS Specifications ---
export type StandardCorsOrigin = "*" | `http://${string}` | `https://${string}`;
export type StandardCorsMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS" | "*";
export type StandardCorsHeader =
  | "Content-Type"
  | "Authorization"
  | "X-Api-Key"
  | "X-Origin-Verify"
  | "X-Amz-Security-Token"
  | "X-Amz-Date"
  | "*";

export interface CorsOptions {
  allowOrigins?: (StandardCorsOrigin | (string & {}))[];
  allowHeaders?: (StandardCorsHeader | (string & {}))[];
  allowMethods?: (StandardCorsMethod | (string & {}))[];
  maxAge?: Duration;
}
