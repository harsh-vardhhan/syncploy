import type { ResourceGraph, ContainerIR } from "../types";
import {
  getTableLogicalId,
  getBucketLogicalId,
  getQueueLogicalId,
  getDeliveryStreamLogicalId,
} from "./logical-ids";

export function applyContainerConfig(
  funcProps: any,
  container: ContainerIR | undefined,
  fallbackId: string,
  resources: Record<string, any>,
  funcKey: string
): void {
  if (!container) return;

  funcProps.PackageType = "Image";
  delete funcProps.Runtime;
  delete funcProps.Handler;

  if (container.imageUri) {
    funcProps.Code = { ImageUri: container.imageUri };
  } else {
    const ecrRepoName = fallbackId.toLowerCase();
    funcProps.Code = {
      ImageUri: {
        "Fn::Sub": `\${AWS::AccountId}.dkr.ecr.\${AWS::Region}.amazonaws.com/\${AWS::StackName}-${ecrRepoName}:latest`,
      },
    };
  }

  if (container.cmd || container.entrypoint || container.workingDirectory) {
    const imageConfig: any = {};
    if (container.cmd && container.cmd.length > 0) imageConfig.Command = container.cmd;
    if (container.entrypoint && container.entrypoint.length > 0) imageConfig.EntryPoint = container.entrypoint;
    if (container.workingDirectory) imageConfig.WorkingDirectory = container.workingDirectory;
    funcProps.ImageConfig = imageConfig;
  }

  if (container.dockerfile || container.context || !container.imageUri) {
    if (!resources[funcKey].Metadata) {
      resources[funcKey].Metadata = {};
    }
    resources[funcKey].Metadata.Dockerfile = container.dockerfile || "Dockerfile";
    resources[funcKey].Metadata.DockerContext = container.context || ".";
    resources[funcKey].Metadata.DockerTag = "latest";
  }
}

export function createLambdaRole(
  logicalId: string,
  options: {
    tables?: boolean | undefined;
    buckets?: boolean | undefined;
    queues?: string[] | undefined;
    tableStreams?: string[] | undefined;
    firehose?: boolean | undefined;
    policies?: any[] | undefined;
  },
  graph: ResourceGraph
): any {
  const statements: any[] = [
    {
      Effect: "Allow",
      Action: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      Resource: "arn:aws:logs:*:*:*",
    },
  ];

  if (options.tables && graph.tables.length > 0) {
    statements.push({
      Effect: "Allow",
      Action: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
      ],
      Resource: graph.tables.flatMap((t) => [
        { "Fn::GetAtt": [getTableLogicalId(t), "Arn"] },
        {
          "Fn::Sub": [
            "${TableArn}/index/*",
            { TableArn: { "Fn::GetAtt": [getTableLogicalId(t), "Arn"] } },
          ],
        },
      ]),
    });
  }

  if (options.buckets && graph.buckets.length > 0) {
    statements.push({
      Effect: "Allow",
      Action: [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
      ],
      Resource: graph.buckets.flatMap((b) => [
        { "Fn::GetAtt": [getBucketLogicalId(b), "Arn"] },
        {
          "Fn::Sub": [
            "${BucketArn}/*",
            { BucketArn: { "Fn::GetAtt": [getBucketLogicalId(b), "Arn"] } },
          ],
        },
      ]),
    });
  }

  if (options.queues && options.queues.length > 0) {
    statements.push({
      Effect: "Allow",
      Action: [
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
      ],
      Resource: options.queues.map((q) => ({
        "Fn::GetAtt": [getQueueLogicalId(q, graph), "Arn"],
      })),
    });
  }

  if (options.tableStreams && options.tableStreams.length > 0) {
    statements.push({
      Effect: "Allow",
      Action: [
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator",
        "dynamodb:DescribeStream",
        "dynamodb:ListStreams",
      ],
      Resource: options.tableStreams.map((tableName) => ({
        "Fn::GetAtt": [getTableLogicalId(tableName, graph), "StreamArn"],
      })),
    });
  }

  if (options.firehose && graph.deliveryStreams && graph.deliveryStreams.length > 0) {
    statements.push({
      Effect: "Allow",
      Action: ["firehose:PutRecord", "firehose:PutRecordBatch"],
      Resource: graph.deliveryStreams.map((ds) => ({
        "Fn::GetAtt": [getDeliveryStreamLogicalId(ds), "Arn"],
      })),
    });
  }

  for (const stmt of options.policies || []) {
    statements.push({
      Effect: stmt.effect || "Allow",
      Action: stmt.actions,
      Resource: stmt.resources,
    });
  }

  return {
    Type: "AWS::IAM::Role",
    Properties: {
      AssumeRolePolicyDocument: {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "lambda.amazonaws.com" },
            Action: "sts:AssumeRole",
          },
        ],
      },
      Policies: [
        {
          PolicyName: `${logicalId}ExecutionPolicy`,
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: statements,
          },
        },
      ],
      Tags: [
        { Key: "StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
      ],
    },
  };
}

export function mergeEnvironment(
  base: Record<string, any>,
  overrides?: Record<string, any>
): Record<string, any> {
  const result = { ...base };
  for (const [k, v] of Object.entries(overrides || {})) {
    if (v !== "" && v !== undefined) {
      result[k] = v;
    } else if (result[k] === undefined) {
      result[k] = v;
    }
  }
  return result;
}
