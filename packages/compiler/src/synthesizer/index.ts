import * as path from "node:path";
import * as fs from "node:fs/promises";
import type {
  ResourceGraph,
  TableIR,
  BucketIR,
  QueueIR,
  TopicIR,
  DeliveryStreamIR,
  AlarmIR,
  AuthIR,
} from "../types";
import {
  getTableLogicalId,
  getBucketLogicalId,
  getQueueLogicalId,
  getDLQLogicalId,
  getTopicLogicalId,
  getDeliveryStreamLogicalId,
  getFunctionLogicalId,
  getAlarmLogicalId,
  getAuthLogicalId,
  getAuthClientLogicalId,
  sanitizeName,
  toDdbType,
  resolvePhysicalName,
} from "./logical-ids";
import { generateTables } from "./generators/tables";
import { generateBuckets } from "./generators/buckets";
import { generateQueues } from "./generators/queues";
import { generateApiGateway, generateLambdaApis } from "./generators/compute";
import {
  generateQueueConsumers,
  generateStreamConsumers,
  generateTopicSubscribers,
} from "./generators/consumers";
import { generateTopics, generateBindings, generateFirehose } from "./generators/messaging";
import { generateAlarms } from "./generators/alarms";
import { generateAuth } from "./generators/auth";
import { buildCommonEnvironment } from "./generators/environment";

export * from "./logical-ids";
export * from "./roles";

export class Synthesizer {
  constructor(public readonly workDir: string) {}

  public getTableLogicalId(tableOrName: TableIR | string, graph?: ResourceGraph): string {
    return getTableLogicalId(tableOrName, graph);
  }

  public getBucketLogicalId(bucketOrName: BucketIR | string, graph?: ResourceGraph): string {
    return getBucketLogicalId(bucketOrName, graph);
  }

  public getQueueLogicalId(queueOrName: QueueIR | string, graph?: ResourceGraph): string {
    return getQueueLogicalId(queueOrName, graph);
  }

  public getDLQLogicalId(queue: QueueIR): string {
    return getDLQLogicalId(queue);
  }

  public getTopicLogicalId(topicOrName: TopicIR | string, graph?: ResourceGraph): string {
    return getTopicLogicalId(topicOrName, graph);
  }

  public getDeliveryStreamLogicalId(dsOrName: DeliveryStreamIR | string, graph?: ResourceGraph): string {
    return getDeliveryStreamLogicalId(dsOrName, graph);
  }

  public getFunctionLogicalId(func: { id: string; logicalId?: string | undefined }): string {
    return getFunctionLogicalId(func);
  }

  public getAlarmLogicalId(alarm: AlarmIR): string {
    return getAlarmLogicalId(alarm);
  }

  public getAuthLogicalId(authOrName: AuthIR | string, graph?: ResourceGraph): string {
    return getAuthLogicalId(authOrName, graph);
  }

  public getAuthClientLogicalId(authOrName: AuthIR | string, graph?: ResourceGraph): string {
    return getAuthClientLogicalId(authOrName, graph);
  }

  public async synthesize(
    graph: ResourceGraph,
    lambdaArtifactDirs: Record<string, string>
  ): Promise<string> {
    const resources: Record<string, any> = {};
    const outputs: Record<string, any> = {};

    // 1. HTTP API Gateway
    generateApiGateway(graph, resources, outputs);

    // 2. Base Lambda Execution Role
    const roleStatements: any[] = [
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

    if (graph.tables.length > 0) {
      roleStatements.push({
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
          { "Fn::GetAtt": [this.getTableLogicalId(t), "Arn"] },
          {
            "Fn::Sub": [
              "${TableArn}/index/*",
              { TableArn: { "Fn::GetAtt": [this.getTableLogicalId(t), "Arn"] } },
            ],
          },
        ]),
      });
    }

    if (graph.buckets.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        Resource: graph.buckets.flatMap((b) => [
          { "Fn::GetAtt": [this.getBucketLogicalId(b), "Arn"] },
          {
            "Fn::Sub": [
              "${BucketArn}/*",
              { BucketArn: { "Fn::GetAtt": [this.getBucketLogicalId(b), "Arn"] } },
            ],
          },
        ]),
      });
    }

    if (graph.queues.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        Resource: graph.queues.map((q) => ({
          "Fn::GetAtt": [this.getQueueLogicalId(q), "Arn"],
        })),
      });
    }

    if (graph.topics && graph.topics.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: ["sns:Publish"],
        Resource: graph.topics.map((t) => ({
          Ref: this.getTopicLogicalId(t),
        })),
      });
    }

    if (graph.deliveryStreams && graph.deliveryStreams.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: ["firehose:PutRecord", "firehose:PutRecordBatch"],
        Resource: graph.deliveryStreams.map((ds) => ({
          "Fn::GetAtt": [this.getDeliveryStreamLogicalId(ds), "Arn"],
        })),
      });
    }

    if (graph.auths && graph.auths.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminUpdateUserAttributes",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:ListUsers",
        ],
        Resource: graph.auths.map((a) => ({
          "Fn::GetAtt": [this.getAuthLogicalId(a, graph), "Arn"],
        })),
      });
    }

    resources["LambdaExecutionRole"] = {
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
            PolicyName: "LambdaDefaultPolicy",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: roleStatements,
            },
          },
        ],
      },
    };

    // 3. DynamoDB Tables
    generateTables(graph, resources);

    // 4. S3 Buckets
    generateBuckets(graph, resources);

    // 5. SQS Queues & DLQs
    generateQueues(graph, resources);

    // 6. Common Environment Variables
    const envVars = buildCommonEnvironment(graph);

    // 7. Lambdas and API Gateway Routes
    generateLambdaApis(graph, resources, outputs, lambdaArtifactDirs, this.workDir, envVars);

    // 8. Queue Consumers (Workers)
    generateQueueConsumers(graph, resources, lambdaArtifactDirs, this.workDir, envVars);

    // 9. SNS Topics
    generateTopics(graph, resources, outputs);

    // 10. DynamoDB Stream Consumers
    generateStreamConsumers(graph, resources, lambdaArtifactDirs, this.workDir, envVars);

    // 11. SNS Topic Subscribers
    generateTopicSubscribers(graph, resources, lambdaArtifactDirs, this.workDir, envVars);

    // 12. CloudWatch Alarms
    generateAlarms(graph, resources);

    // 13. EventBridge Rules & SQS Queue Policies
    generateBindings(graph, resources);

    // 14. Kinesis Firehose Delivery Streams & IAM Roles
    generateFirehose(graph, resources, outputs);

    // 15. Cognito User Pools & User Pool Clients
    generateAuth(graph, resources, outputs);

    const template = {
      AWSTemplateFormatVersion: "2010-09-09",
      Description: "Synthesized by Syncploy",
      Resources: resources,
      Outputs: outputs,
    };

    const templateDir = path.join(this.workDir, ".syncploy");
    await fs.mkdir(templateDir, { recursive: true });

    const templatePath = path.join(templateDir, "template.json");
    await fs.writeFile(templatePath, JSON.stringify(template, null, 2), "utf-8");

    return templatePath;
  }
}
