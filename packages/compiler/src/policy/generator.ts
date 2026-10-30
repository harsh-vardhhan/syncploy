import type { ResourceGraph } from "../types";
import type { DeployPolicyDocument, DeployPolicyOptions, DeployPolicyStatement } from "./types";

export function generateDeployPolicy(
  graph: ResourceGraph,
  template: any,
  options: DeployPolicyOptions
): DeployPolicyDocument {
  const region = options.region || "ap-south-1";
  const accountId = options.accountId || "<AWS_ACCOUNT_ID>";
  const stackName = options.stackName;

  const resources = template?.Resources || {};
  const statements: DeployPolicyStatement[] = [];

  // 1. CloudFormation Stack & Changeset Lifecycle
  statements.push({
    Sid: "CloudFormationStackManagement",
    Effect: "Allow",
    Action: [
      "cloudformation:*",
    ],
    Resource: [
      `arn:aws:cloudformation:${region}:${accountId}:stack/${stackName}*`,
      `arn:aws:cloudformation:${region}:${accountId}:stack/aws-sam-cli-managed-default*`,
      "arn:aws:cloudformation:*:aws:transform/*",
    ],
  });

  // 2. S3 Bucket & Deployment Assets
  if (graph.buckets.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::S3::Bucket")) {
    const bucketArns: string[] = [];
    const objectArns: string[] = [];

    for (const bucket of graph.buckets) {
      const physicalName = bucket.bucketName || (bucket.accountScoped ? `${stackName}-${bucket.name}-${accountId}` : `${stackName}-${bucket.name}`);
      const arn = `arn:aws:s3:::${physicalName.replace(/\${AWS::StackName}/g, stackName).replace(/\${AWS::AccountId}/g, accountId)}`;
      bucketArns.push(arn);
      objectArns.push(`${arn}/*`);
    }

    // Also allow deployment artifact / asset bucket prefix
    bucketArns.push(`arn:aws:s3:::${stackName}-*`);
    objectArns.push(`arn:aws:s3:::${stackName}-*/*`);

    statements.push({
      Sid: "S3BucketInfrastructureManagement",
      Effect: "Allow",
      Action: [
        "s3:CreateBucket",
        "s3:DeleteBucket",
        "s3:GetBucket*",
        "s3:PutBucket*",
        "s3:ListBucket",
        "s3:GetEncryptionConfiguration",
        "s3:PutEncryptionConfiguration",
        "s3:GetBucketNotification",
        "s3:PutBucketNotification",
        "s3:GetBucketPolicy",
        "s3:PutBucketPolicy",
        "s3:DeleteBucketPolicy",
      ],
      Resource: Array.from(new Set(bucketArns)),
    });

    statements.push({
      Sid: "S3DeploymentAssetsManagement",
      Effect: "Allow",
      Action: ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      Resource: Array.from(new Set(objectArns)),
    });
  }

  // 3. DynamoDB Tables
  if (graph.tables.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::DynamoDB::Table")) {
    const tableArns: string[] = [];
    for (const table of graph.tables) {
      const name = table.tableName || `${stackName}-${table.name}`;
      const cleanName = name.replace(/\${AWS::StackName}/g, stackName);
      tableArns.push(`arn:aws:dynamodb:${region}:${accountId}:table/${cleanName}`);
      tableArns.push(`arn:aws:dynamodb:${region}:${accountId}:table/${cleanName}/index/*`);
    }
    if (tableArns.length === 0) {
      tableArns.push(`arn:aws:dynamodb:${region}:${accountId}:table/${stackName}-*`);
      tableArns.push(`arn:aws:dynamodb:${region}:${accountId}:table/${stackName}-*/index/*`);
    }

    statements.push({
      Sid: "DynamoDBTableManagement",
      Effect: "Allow",
      Action: [
        "dynamodb:CreateTable",
        "dynamodb:DeleteTable",
        "dynamodb:DescribeTable",
        "dynamodb:UpdateTable",
        "dynamodb:TagResource",
        "dynamodb:UntagResource",
        "dynamodb:DescribeContinuousBackups",
        "dynamodb:UpdateContinuousBackups",
        "dynamodb:DescribeTimeToLive",
        "dynamodb:UpdateTimeToLive",
      ],
      Resource: Array.from(new Set(tableArns)),
    });
  }

  // 4. Lambda Functions, URLs, and Event Source Mappings
  const hasLambdas =
    graph.apis.length > 0 ||
    graph.consumers.length > 0 ||
    graph.topicSubscribers.length > 0 ||
    graph.tableStreams.length > 0 ||
    Object.values(resources).some((r: any) => r.Type === "AWS::Lambda::Function");

  if (hasLambdas) {
    const lambdaActions = [
      "lambda:CreateFunction",
      "lambda:DeleteFunction",
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:AddPermission",
      "lambda:RemovePermission",
      "lambda:TagResource",
      "lambda:UntagResource",
      "lambda:PutFunctionConcurrency",
      "lambda:DeleteFunctionConcurrency",
    ];

    // Function URL actions if any route uses Function URL
    const hasFunctionUrl =
      graph.apis.some((a) => a.ingress === "function-url") ||
      Object.values(resources).some((r: any) => r.Type === "AWS::Lambda::Url");

    if (hasFunctionUrl) {
      lambdaActions.push(
        "lambda:CreateFunctionUrlConfig",
        "lambda:UpdateFunctionUrlConfig",
        "lambda:DeleteFunctionUrlConfig",
        "lambda:GetFunctionUrlConfig"
      );
    }

    // EventSourceMapping actions if any queue consumer or table stream exists
    const hasEventSourceMapping =
      graph.consumers.length > 0 ||
      graph.tableStreams.length > 0 ||
      Object.values(resources).some((r: any) => r.Type === "AWS::Lambda::EventSourceMapping");

    if (hasEventSourceMapping) {
      lambdaActions.push(
        "lambda:CreateEventSourceMapping",
        "lambda:UpdateEventSourceMapping",
        "lambda:DeleteEventSourceMapping",
        "lambda:GetEventSourceMapping"
      );
    }

    statements.push({
      Sid: "LambdaFunctionManagement",
      Effect: "Allow",
      Action: lambdaActions,
      Resource: [
        `arn:aws:lambda:${region}:${accountId}:function:${stackName}-*`,
        `arn:aws:lambda:${region}:${accountId}:event-source-mapping:*`,
      ],
    });
  }

  // 5. SQS Queues
  if (graph.queues.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::SQS::Queue")) {
    statements.push({
      Sid: "SQSQueueManagement",
      Effect: "Allow",
      Action: [
        "sqs:CreateQueue",
        "sqs:DeleteQueue",
        "sqs:GetQueueAttributes",
        "sqs:SetQueueAttributes",
        "sqs:TagQueue",
        "sqs:UntagQueue",
      ],
      Resource: [`arn:aws:sqs:${region}:${accountId}:${stackName}-*`],
    });
  }

  // 6. SNS Topics
  if (graph.topics.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::SNS::Topic")) {
    statements.push({
      Sid: "SNSTopicManagement",
      Effect: "Allow",
      Action: [
        "sns:CreateTopic",
        "sns:DeleteTopic",
        "sns:GetTopicAttributes",
        "sns:SetTopicAttributes",
        "sns:Subscribe",
        "sns:Unsubscribe",
        "sns:TagResource",
        "sns:UntagResource",
      ],
      Resource: [`arn:aws:sns:${region}:${accountId}:${stackName}-*`],
    });
  }

  // 7. EventBridge Rules
  if (graph.bindings.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::Events::Rule")) {
    statements.push({
      Sid: "EventBridgeRuleManagement",
      Effect: "Allow",
      Action: [
        "events:PutRule",
        "events:DeleteRule",
        "events:DescribeRule",
        "events:PutTargets",
        "events:RemoveTargets",
        "events:TagResource",
        "events:UntagResource",
      ],
      Resource: [`arn:aws:events:${region}:${accountId}:rule/${stackName}-*`],
    });
  }

  // 8. CloudWatch Alarms
  if (graph.alarms.length > 0 || Object.values(resources).some((r: any) => r.Type === "AWS::CloudWatch::Alarm")) {
    statements.push({
      Sid: "CloudWatchAlarmManagement",
      Effect: "Allow",
      Action: [
        "cloudwatch:PutMetricAlarm",
        "cloudwatch:DeleteAlarms",
        "cloudwatch:DescribeAlarms",
      ],
      Resource: [`arn:aws:cloudwatch:${region}:${accountId}:alarm:${stackName}-*`],
    });
  }

  // 9. CloudWatch Logs (for Lambda log groups)
  if (hasLambdas) {
    statements.push({
      Sid: "CloudWatchLogsManagement",
      Effect: "Allow",
      Action: [
        "logs:CreateLogGroup",
        "logs:DeleteLogGroup",
        "logs:DescribeLogGroups",
        "logs:PutRetentionPolicy",
        "logs:TagResource",
        "logs:UntagResource",
      ],
      Resource: [`arn:aws:logs:${region}:${accountId}:log-group:/aws/lambda/${stackName}-*`],
    });
  }

  // 10. IAM Roles (for Lambda execution roles and Firehose roles)
  const hasIamRoles = Object.values(resources).some((r: any) => r.Type === "AWS::IAM::Role");
  if (hasIamRoles || hasLambdas) {
    statements.push({
      Sid: "IAMRoleDeployment",
      Effect: "Allow",
      Action: [
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:GetRolePolicy",
        "iam:PutRolePolicy",
        "iam:DeleteRolePolicy",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:UpdateAssumeRolePolicy",
        "iam:UpdateRole",
        "iam:UpdateRoleDescription",
        "iam:TagRole",
        "iam:UntagRole",
        "iam:PassRole",
      ],
      Resource: [`arn:aws:iam::${accountId}:role/${stackName}-*`],
    });
  }

  // 11. Kinesis Firehose Delivery Streams
  if (
    (graph.deliveryStreams && graph.deliveryStreams.length > 0) ||
    Object.values(resources).some((r: any) => r.Type === "AWS::KinesisFirehose::DeliveryStream")
  ) {
    statements.push({
      Sid: "FirehoseDeliveryStreamManagement",
      Effect: "Allow",
      Action: [
        "firehose:CreateDeliveryStream",
        "firehose:DeleteDeliveryStream",
        "firehose:DescribeDeliveryStream",
        "firehose:UpdateDestination",
        "firehose:TagDeliveryStream",
        "firehose:UntagDeliveryStream",
      ],
      Resource: [`arn:aws:firehose:${region}:${accountId}:deliverystream/${stackName}-*`],
    });
  }

  // 12. Cognito Authentication (Clean 4 & Shadow CloudFormation Handlers)
  if (
    graph.auths.length > 0 ||
    Object.values(resources).some((r: any) => r.Type === "AWS::Cognito::UserPool")
  ) {
    statements.push({
      Sid: "CognitoUserPoolManagement",
      Effect: "Allow",
      Action: [
        "cognito-idp:CreateUserPool",
        "cognito-idp:DeleteUserPool",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:UpdateUserPool",
        "cognito-idp:CreateUserPoolClient",
        "cognito-idp:DeleteUserPoolClient",
        "cognito-idp:DescribeUserPoolClient",
        "cognito-idp:UpdateUserPoolClient",
        "cognito-idp:TagResource",
        "cognito-idp:UntagResource",
        "cognito-idp:ListTagsForResource",
      ],
      Resource: [`arn:aws:cognito-idp:${region}:${accountId}:userpool/*`],
    });
  }

  // 13. ECR (Only if Docker container packaging is configured)
  const usesContainer =
    graph.apis.some((a) => !!a.container) ||
    graph.consumers.some((c) => !!c.container) ||
    graph.topicSubscribers.some((s) => !!s.container) ||
    graph.tableStreams.some((ts) => !!ts.container);

  if (usesContainer) {
    statements.push({
      Sid: "ECRRepositoryManagement",
      Effect: "Allow",
      Action: [
        "ecr:CreateRepository",
        "ecr:DeleteRepository",
        "ecr:DescribeRepositories",
        "ecr:GetRepositoryPolicy",
        "ecr:SetRepositoryPolicy",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "ecr:InitiateLayerUpload",
        "ecr:UploadLayerPart",
        "ecr:CompleteLayerUpload",
        "ecr:PutImage",
        "ecr:TagResource",
        "ecr:UntagResource",
      ],
      Resource: [`arn:aws:ecr:${region}:${accountId}:repository/*`],
    });

    // Authorization token strictly requires '*' by AWS IAM specification
    statements.push({
      Sid: "ECRAuthToken",
      Effect: "Allow",
      Action: ["ecr:GetAuthorizationToken"],
      Resource: "*",
    });
  }

  // 14. API Gateway - ONLY if at least one route uses API Gateway (NOT Function URL)
  const hasApiGateway =
    graph.apis.some((a) => a.ingress !== "function-url") ||
    Object.values(resources).some((r: any) => r.Type === "AWS::ApiGatewayV2::HttpApi");

  if (hasApiGateway) {
    statements.push({
      Sid: "APIGatewayManagement",
      Effect: "Allow",
      Action: [
        "apigateway:GET",
        "apigateway:POST",
        "apigateway:PUT",
        "apigateway:PATCH",
        "apigateway:DELETE",
      ],
      Resource: [`arn:aws:apigateway:${region}::/httpapis*`],
    });
  }

  // 15. AWS Budgets - ONLY if a Budget resource is synthesized
  const hasBudget = Object.values(resources).some((r: any) => r.Type === "AWS::Budgets::Budget");
  if (hasBudget) {
    statements.push({
      Sid: "BudgetsManagement",
      Effect: "Allow",
      Action: [
        "budgets:CreateBudget",
        "budgets:ViewBudget",
        "budgets:ModifyBudget",
        "budgets:DeleteBudget",
      ],
      Resource: [`arn:aws:budgets::${accountId}:budget/*`],
    });
  }

  return {
    Version: "2012-10-17",
    Statement: statements,
  };
}
