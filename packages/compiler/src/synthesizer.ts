import * as path from "node:path";
import * as fs from "node:fs/promises";
import type { ResourceGraph } from "./types";

export class Synthesizer {
  constructor(public readonly workDir: string) {}

  public async synthesize(
    graph: ResourceGraph,
    lambdaArtifactDirs: Record<string, string>
  ): Promise<string> {
    const resources: Record<string, any> = {};
    const outputs: Record<string, any> = {};

    // 1. HTTP API Gateway (only if at least one route uses API Gateway)
    const hasApiGateway = graph.apis.some((a) => a.ingress !== "function-url");
    if (hasApiGateway) {
      resources["HttpApi"] = {
        Type: "AWS::ApiGatewayV2::HttpApi",
        Properties: {
          Name: { "Fn::Sub": "${AWS::StackName}-api" },
          ProtocolType: "HTTP",
          CorsConfiguration: {
            AllowOrigins: ["*"],
            AllowMethods: ["*"],
            AllowHeaders: ["*"],
          },
        },
      };

      resources["HttpApiStage"] = {
        Type: "AWS::ApiGatewayV2::Stage",
        Properties: {
          ApiId: { Ref: "HttpApi" },
          StageName: "$default",
          AutoDeploy: true,
        },
      };

      outputs["ApiEndpoint"] = {
        Description: "HTTP API Gateway endpoint URL",
        Value: {
          "Fn::Sub": "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com",
        },
      };
    }

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

    // Add DynamoDB permissions if tables exist
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
          { "Fn::GetAtt": [`Table${this.sanitizeName(t.name)}`, "Arn"] },
          {
            "Fn::Sub": [
              "${TableArn}/index/*",
              { TableArn: { "Fn::GetAtt": [`Table${this.sanitizeName(t.name)}`, "Arn"] } },
            ],
          },
        ]),
      });
    }

    // Add S3 permissions if buckets exist
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
          { "Fn::GetAtt": [`Bucket${this.sanitizeName(b.name)}`, "Arn"] },
          {
            "Fn::Sub": [
              "${BucketArn}/*",
              { BucketArn: { "Fn::GetAtt": [`Bucket${this.sanitizeName(b.name)}`, "Arn"] } },
            ],
          },
        ]),
      });
    }

    // Add SQS permissions if queues exist
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
          "Fn::GetAtt": [`Queue${this.sanitizeName(q.name)}`, "Arn"],
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
            PolicyName: "SyncployExecutionPolicy",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: roleStatements,
            },
          },
        ],
      },
    };

    // 3. DynamoDB Tables
    for (const table of graph.tables) {
      const resourceKey = `Table${this.sanitizeName(table.name)}`;
      const attrMap = new Map<string, string>();
      attrMap.set(table.partitionKey.name, this.toDdbType(table.partitionKey.type));

      const keySchema: any[] = [
        {
          AttributeName: table.partitionKey.name,
          KeyType: "HASH",
        },
      ];

      if (table.sortKey) {
        attrMap.set(table.sortKey.name, this.toDdbType(table.sortKey.type));
        keySchema.push({
          AttributeName: table.sortKey.name,
          KeyType: "RANGE",
        });
      }

      // GSIs
      const gsiList: any[] = [];
      if (table.indexes) {
        for (const [idxName, idx] of Object.entries(table.indexes)) {
          if (!attrMap.has(idx.partitionKey)) {
            attrMap.set(idx.partitionKey, "S");
          }
          const gsiKeySchema: any[] = [
            { AttributeName: idx.partitionKey, KeyType: "HASH" },
          ];
          if (idx.sortKey) {
            if (!attrMap.has(idx.sortKey)) {
              attrMap.set(idx.sortKey, "S");
            }
            gsiKeySchema.push({ AttributeName: idx.sortKey, KeyType: "RANGE" });
          }

          gsiList.push({
            IndexName: idxName,
            KeySchema: gsiKeySchema,
            Projection: { ProjectionType: idx.projection ?? "ALL" },
          });
        }
      }

      const attributeDefinitions = Array.from(attrMap.entries()).map(([name, type]) => ({
        AttributeName: name,
        AttributeType: type,
      }));

      const tableProps: any = {
        TableName: { "Fn::Sub": `\${AWS::StackName}-${table.name}` },
        BillingMode: table.billingMode ?? "PAY_PER_REQUEST",
        AttributeDefinitions: attributeDefinitions,
        KeySchema: keySchema,
      };

      if (gsiList.length > 0) {
        tableProps["GlobalSecondaryIndexes"] = gsiList;
      }

      if (table.stream) {
        tableProps["StreamSpecification"] = { StreamViewType: table.stream };
      }

      if (table.pointInTimeRecovery) {
        tableProps["PointInTimeRecoverySpecification"] = {
          PointInTimeRecoveryEnabled: true,
        };
      }

      resources[resourceKey] = {
        Type: "AWS::DynamoDB::Table",
        Properties: tableProps,
      };
    }

    // 4. S3 Buckets
    for (const bucket of graph.buckets) {
      const resourceKey = `Bucket${this.sanitizeName(bucket.name)}`;
      const bucketProps: any = {
        BucketName: { "Fn::Sub": `\${AWS::StackName}-${bucket.name}` },
      };

      if (bucket.versioned) {
        bucketProps["VersioningConfiguration"] = { Status: "Enabled" };
      }

      if (bucket.eventBridge) {
        bucketProps["NotificationConfiguration"] = {
          EventBridgeConfiguration: { EventBridgeEnabled: true },
        };
      }

      if (bucket.publicAccessBlock) {
        bucketProps["PublicAccessBlockConfiguration"] = {
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        };
      }

      resources[resourceKey] = {
        Type: "AWS::S3::Bucket",
        Properties: bucketProps,
      };
    }

    // 5. SQS Queues & DLQs
    for (const queue of graph.queues) {
      const cleanName = this.sanitizeName(queue.name);
      const resourceKey = `Queue${cleanName}`;
      const queueProps: any = {
        QueueName: { "Fn::Sub": `\${AWS::StackName}-${queue.name}` },
        VisibilityTimeout: queue.visibilityTimeout ?? 180,
      };

      if (queue.deadLetterQueue) {
        const dlqKey = `Queue${cleanName}DLQ`;
        resources[dlqKey] = {
          Type: "AWS::SQS::Queue",
          Properties: {
            QueueName: { "Fn::Sub": `\${AWS::StackName}-${queue.name}-dlq` },
          },
        };

        queueProps["RedrivePolicy"] = {
          deadLetterTargetArn: { "Fn::GetAtt": [dlqKey, "Arn"] },
          maxReceiveCount: queue.deadLetterQueue.maxReceiveCount,
        };
      }

      resources[resourceKey] = {
        Type: "AWS::SQS::Queue",
        Properties: queueProps,
      };
    }

    // 6. Common Environment Variables (Tables, Buckets, Queues)
    const envVars: Record<string, any> = {};

    for (const table of graph.tables) {
      const cleanName = this.sanitizeName(table.name);
      envVars[`SYNCPLOY_TABLE_${table.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`] = {
        Ref: `Table${cleanName}`,
      };
      envVars[table.name] = { Ref: `Table${cleanName}` };
    }

    for (const bucket of graph.buckets) {
      const cleanName = this.sanitizeName(bucket.name);
      envVars[`SYNCPLOY_BUCKET_${bucket.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`] = {
        Ref: `Bucket${cleanName}`,
      };
      envVars[bucket.name] = { Ref: `Bucket${cleanName}` };
    }

    for (const queue of graph.queues) {
      const cleanName = this.sanitizeName(queue.name);
      envVars[`SYNCPLOY_QUEUE_${queue.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`] = {
        Ref: `Queue${cleanName}`,
      };
      envVars[queue.name] = { Ref: `Queue${cleanName}` };
    }

    // 7. Lambdas and API Gateway Routes
    for (const api of graph.apis) {
      const logicalId = this.sanitizeName(api.id);
      const funcKey = `Function${logicalId}`;
      const integKey = `Integration${logicalId}`;
      const routeKey = `Route${logicalId}`;
      const permKey = `Permission${logicalId}`;

      const artifactDir = lambdaArtifactDirs[api.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");
      const apiGatewayPath = api.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${api.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: api.timeout ?? 30,
        MemorySize: api.memory ?? 256,
        Role: { "Fn::GetAtt": ["LambdaExecutionRole", "Arn"] },
      };

      if (Object.keys(envVars).length > 0) {
        funcProps["Environment"] = { Variables: envVars };
      }

      if (api.concurrency !== undefined) {
        funcProps["ReservedConcurrentExecutions"] = api.concurrency;
      }

      resources[funcKey] = {
        Type: "AWS::Lambda::Function",
        Properties: funcProps,
      };

      if (api.ingress === "function-url") {
        const urlKey = `FunctionUrl${logicalId}`;
        const urlPermKey = `Permission${logicalId}Url`;

        const corsProp: any = {
          AllowOrigins: ["*"],
          AllowMethods: [api.method],
          AllowHeaders: ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"],
        };

        if (typeof api.cors === "object" && api.cors !== null) {
          if (api.cors.allowOrigins) corsProp.AllowOrigins = api.cors.allowOrigins;
          if (api.cors.allowMethods) corsProp.AllowMethods = api.cors.allowMethods;
          if (api.cors.allowHeaders) corsProp.AllowHeaders = api.cors.allowHeaders;
        }

        resources[urlKey] = {
          Type: "AWS::Lambda::Url",
          Properties: {
            TargetFunctionArn: { "Fn::GetAtt": [funcKey, "Arn"] },
            AuthType: "NONE",
            Cors: corsProp,
          },
        };

        resources[urlPermKey] = {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: { Ref: funcKey },
            Action: "lambda:InvokeFunctionUrl",
            Principal: "*",
            FunctionUrlAuthType: "NONE",
          },
        };

        outputs[`${logicalId}Url`] = {
          Description: `Direct Lambda Function URL for ${api.id}`,
          Value: { "Fn::GetAtt": [urlKey, "FunctionUrl"] },
        };
      } else {
        resources[integKey] = {
          Type: "AWS::ApiGatewayV2::Integration",
          Properties: {
            ApiId: { Ref: "HttpApi" },
            IntegrationType: "AWS_PROXY",
            IntegrationUri: { "Fn::GetAtt": [funcKey, "Arn"] },
            PayloadFormatVersion: "2.0",
          },
        };

        resources[routeKey] = {
          Type: "AWS::ApiGatewayV2::Route",
          Properties: {
            ApiId: { Ref: "HttpApi" },
            RouteKey: `${api.method} ${apiGatewayPath}`,
            Target: { "Fn::Sub": `integrations/\${${integKey}}` },
          },
        };

        resources[permKey] = {
          Type: "AWS::Lambda::Permission",
          Properties: {
            FunctionName: { Ref: funcKey },
            Action: "lambda:InvokeFunction",
            Principal: "apigateway.amazonaws.com",
            SourceArn: {
              "Fn::Sub": [
                "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${HttpApi}/*/*",
                { HttpApi: { Ref: "HttpApi" } },
              ],
            },
          },
        };
      }
    }

    // 7. Queue Consumers (Workers)
    for (const consumer of graph.consumers) {
      const logicalId = this.sanitizeName(consumer.id);
      const funcKey = `Function${logicalId}`;
      const mappingKey = `EventSourceMapping${logicalId}`;
      const queueKey = `Queue${this.sanitizeName(consumer.queueName)}`;

      const artifactDir = lambdaArtifactDirs[consumer.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${consumer.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: consumer.timeout ?? 120,
        MemorySize: consumer.memory ?? 256,
        Role: { "Fn::GetAtt": ["LambdaExecutionRole", "Arn"] },
      };

      if (Object.keys(envVars).length > 0) {
        funcProps["Environment"] = { Variables: envVars };
      }

      if (consumer.concurrency !== undefined) {
        funcProps["ReservedConcurrentExecutions"] = consumer.concurrency;
      }

      resources[funcKey] = {
        Type: "AWS::Lambda::Function",
        Properties: funcProps,
      };

      resources[mappingKey] = {
        Type: "AWS::Lambda::EventSourceMapping",
        Properties: {
          EventSourceArn: { "Fn::GetAtt": [queueKey, "Arn"] },
          FunctionName: { Ref: funcKey },
          BatchSize: consumer.batchSize ?? 10,
          FunctionResponseTypes: ["ReportBatchItemFailures"],
        },
      };
    }

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

  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, "");
  }

  private toDdbType(type: "string" | "number" | "binary"): string {
    switch (type) {
      case "string":
        return "S";
      case "number":
        return "N";
      case "binary":
        return "B";
    }
  }
}
