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

    // 1. HTTP API Gateway
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
        Resource: graph.tables.map((t) => ({
          "Fn::GetAtt": [`Table${this.sanitizeName(t.name)}`, "Arn"],
        })),
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
      const attributeDefinitions = [
        {
          AttributeName: table.partitionKey.name,
          AttributeType: this.toDdbType(table.partitionKey.type),
        },
      ];
      const keySchema = [
        {
          AttributeName: table.partitionKey.name,
          KeyType: "HASH",
        },
      ];

      if (table.sortKey) {
        attributeDefinitions.push({
          AttributeName: table.sortKey.name,
          AttributeType: this.toDdbType(table.sortKey.type),
        });
        keySchema.push({
          AttributeName: table.sortKey.name,
          KeyType: "RANGE",
        });
      }

      resources[resourceKey] = {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: { "Fn::Sub": `\${AWS::StackName}-${table.name}` },
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: attributeDefinitions,
          KeySchema: keySchema,
        },
      };
    }

    // 4. S3 Buckets
    for (const bucket of graph.buckets) {
      const resourceKey = `Bucket${this.sanitizeName(bucket.name)}`;
      resources[resourceKey] = {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: { "Fn::Sub": `\${AWS::StackName}-${bucket.name}` },
        },
      };
    }

    // 5. SQS Queues
    for (const queue of graph.queues) {
      const resourceKey = `Queue${this.sanitizeName(queue.name)}`;
      resources[resourceKey] = {
        Type: "AWS::SQS::Queue",
        Properties: {
          QueueName: { "Fn::Sub": `\${AWS::StackName}-${queue.name}` },
        },
      };
    }

    // 6. Lambdas and API Gateway Routes
    for (const api of graph.apis) {
      const logicalId = this.sanitizeName(api.id);
      const funcKey = `Function${logicalId}`;
      const integKey = `Integration${logicalId}`;
      const routeKey = `Route${logicalId}`;
      const permKey = `Permission${logicalId}`;

      const artifactDir = lambdaArtifactDirs[api.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      // Convert Express-like path /users/:id to API Gateway /users/{id}
      const apiGatewayPath = api.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      resources[funcKey] = {
        Type: "AWS::Lambda::Function",
        Properties: {
          FunctionName: { "Fn::Sub": `\${AWS::StackName}-${api.id}` },
          Runtime: "nodejs20.x",
          Handler: "index.handler",
          Code: relArtifactDir,
          Timeout: 30,
          MemorySize: 256,
          Role: { "Fn::GetAtt": ["LambdaExecutionRole", "Arn"] },
        },
      };

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

    outputs["ApiEndpoint"] = {
      Description: "HTTP API Gateway endpoint URL",
      Value: {
        "Fn::Sub": "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com",
      },
    };

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
