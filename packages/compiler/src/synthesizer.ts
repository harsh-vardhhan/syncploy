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

    // Add DynamoDB Stream permissions if stream consumers exist
    if (graph.tableStreams && graph.tableStreams.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: [
          "dynamodb:GetRecords",
          "dynamodb:GetShardIterator",
          "dynamodb:DescribeStream",
          "dynamodb:ListStreams",
        ],
        Resource: graph.tableStreams.map((s) => ({
          "Fn::GetAtt": [`Table${this.sanitizeName(s.tableName)}`, "StreamArn"],
        })),
      });
    }

    // Add SNS publish permissions if topics exist
    if (graph.topics && graph.topics.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: ["sns:Publish"],
        Resource: graph.topics.map((t) => ({
          Ref: `Topic${this.sanitizeName(t.name)}`,
        })),
      });
    }

    // Add Firehose permissions if delivery streams exist
    if (graph.deliveryStreams && graph.deliveryStreams.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: [
          "firehose:PutRecord",
          "firehose:PutRecordBatch",
        ],
        Resource: graph.deliveryStreams.map((ds) => ({
          "Fn::GetAtt": [`DeliveryStream${this.sanitizeName(ds.name)}`, "Arn"],
        })),
      });
    }

    // Add custom policy statements declared on APIs, Consumers, Streams, or Subscribers
    const customStatements = [
      ...graph.apis.flatMap((a) => a.policies || []),
      ...graph.consumers.flatMap((c) => c.policies || []),
      ...(graph.tableStreams || []).flatMap((s) => s.policies || []),
      ...(graph.topicSubscribers || []).flatMap((sub) => sub.policies || []),
    ];
    for (const stmt of customStatements) {
      roleStatements.push({
        Effect: stmt.effect || "Allow",
        Action: stmt.actions,
        Resource: stmt.resources,
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

      const hasStreamConsumer = (graph.tableStreams || []).some(
        (s) => this.sanitizeName(s.tableName) === this.sanitizeName(table.name)
      );
      if (table.stream || hasStreamConsumer) {
        tableProps["StreamSpecification"] = { StreamViewType: table.stream || "NEW_IMAGE" };
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
      const bucketNameSub = bucket.accountScoped
        ? `\${AWS::StackName}-${bucket.name}-\${AWS::AccountId}`
        : `\${AWS::StackName}-${bucket.name}`;
      const bucketProps: any = {
        BucketName: { "Fn::Sub": bucketNameSub },
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

      if (bucket.objectLock) {
        bucketProps["ObjectLockEnabled"] = true;
        const config: any = {
          ObjectLockEnabled: "Enabled",
        };
        if (typeof bucket.objectLock === "object") {
          const rule: any = {};
          const defaultRetention: any = {};
          defaultRetention.Mode = bucket.objectLock.mode || "COMPLIANCE";
          if (bucket.objectLock.days !== undefined) {
            defaultRetention.Days = bucket.objectLock.days;
          } else if (bucket.objectLock.years !== undefined) {
            defaultRetention.Years = bucket.objectLock.years;
          } else {
            defaultRetention.Days = 1;
          }
          rule.DefaultRetention = defaultRetention;
          config.Rule = rule;
        } else {
          config.Rule = {
            DefaultRetention: {
              Mode: "COMPLIANCE",
              Days: 1,
            },
          };
        }
        bucketProps["ObjectLockConfiguration"] = config;
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
      const upperName = table.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_TABLE_${upperName}`] = { Ref: `Table${cleanName}` };
      envVars[`TABLE_${upperName}_NAME`] = { Ref: `Table${cleanName}` };
      envVars[`${upperName}_TABLE_NAME`] = { Ref: `Table${cleanName}` };
      envVars[table.name] = { Ref: `Table${cleanName}` };
    }

    for (const bucket of graph.buckets) {
      const cleanName = this.sanitizeName(bucket.name);
      const upperName = bucket.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_BUCKET_${upperName}`] = { Ref: `Bucket${cleanName}` };
      envVars[`BUCKET_${upperName}_NAME`] = { Ref: `Bucket${cleanName}` };
      envVars[`${upperName}_BUCKET_NAME`] = { Ref: `Bucket${cleanName}` };
      envVars[bucket.name] = { Ref: `Bucket${cleanName}` };
    }

    for (const queue of graph.queues) {
      const cleanName = this.sanitizeName(queue.name);
      const upperName = queue.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_QUEUE_${upperName}`] = { Ref: `Queue${cleanName}` };
      envVars[`QUEUE_${upperName}_URL`] = { Ref: `Queue${cleanName}` };
      envVars[`${upperName}_QUEUE_URL`] = { Ref: `Queue${cleanName}` };
      envVars[queue.name] = { Ref: `Queue${cleanName}` };
    }

    for (const topic of graph.topics || []) {
      const cleanName = this.sanitizeName(topic.name);
      const upperName = topic.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_TOPIC_${upperName}`] = { Ref: `Topic${cleanName}` };
      envVars[`TOPIC_${upperName}_ARN`] = { Ref: `Topic${cleanName}` };
      envVars[`${upperName}_TOPIC_ARN`] = { Ref: `Topic${cleanName}` };
      envVars[topic.name] = { Ref: `Topic${cleanName}` };
    }

    for (const ds of graph.deliveryStreams || []) {
      const cleanName = this.sanitizeName(ds.name);
      const upperName = ds.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const baseUpper = upperName.replace(/_?(DELIVERY)?_?STREAM$/, "");

      envVars[`SYNCPLOY_DELIVERY_STREAM_${upperName}`] = { Ref: `DeliveryStream${cleanName}` };
      envVars[`DELIVERY_STREAM_${upperName}_NAME`] = { Ref: `DeliveryStream${cleanName}` };
      envVars[`${upperName}_DELIVERY_STREAM_NAME`] = { Ref: `DeliveryStream${cleanName}` };
      if (baseUpper) {
        envVars[`${baseUpper}_DELIVERY_STREAM_NAME`] = { Ref: `DeliveryStream${cleanName}` };
      }
      envVars[ds.name] = { Ref: `DeliveryStream${cleanName}` };
    }

    for (const api of graph.apis) {
      const logicalId = this.sanitizeName(api.id);
      const upperName = api.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_FUNCTION_${upperName}`] = { Ref: `Function${logicalId}` };
      envVars[`FUNCTION_${upperName}_NAME`] = { Ref: `Function${logicalId}` };
      envVars[`${upperName}_FUNCTION_NAME`] = { Ref: `Function${logicalId}` };
      envVars[api.id] = { Ref: `Function${logicalId}` };
      if (api.id.toLowerCase().includes("backend")) {
        envVars["BACKEND_FUNCTION_NAME"] = { Ref: `Function${logicalId}` };
      }
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

      const roleKey = `Role${logicalId}`;
      resources[roleKey] = this.createLambdaRole(
        logicalId,
        { tables: true, buckets: true, policies: api.policies },
        graph
      );

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${api.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: api.timeout ?? 30,
        MemorySize: api.memory ?? 256,
        Role: { "Fn::GetAtt": [roleKey, "Arn"] },
      };

      const functionEnv = this.mergeEnvironment(envVars, api.environment);
      // Remove self-referential variables to prevent CloudFormation circular dependency
      const upperName = api.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      delete functionEnv[`SYNCPLOY_FUNCTION_${upperName}`];
      delete functionEnv[`FUNCTION_${upperName}_NAME`];
      delete functionEnv[`${upperName}_FUNCTION_NAME`];
      delete functionEnv[api.id];
      if (api.id.toLowerCase().includes("backend")) {
        delete functionEnv["BACKEND_FUNCTION_NAME"];
      }

      if (Object.keys(functionEnv).length > 0) {
        funcProps["Environment"] = { Variables: functionEnv };
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

      const roleKey = `Role${logicalId}`;
      resources[roleKey] = this.createLambdaRole(
        logicalId,
        {
          tables: true,
          buckets: true,
          queues: [consumer.queueName],
          policies: consumer.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${consumer.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: consumer.timeout ?? 120,
        MemorySize: consumer.memory ?? 256,
        Role: { "Fn::GetAtt": [roleKey, "Arn"] },
      };

      const consumerEnv = this.mergeEnvironment(envVars, consumer.environment);

      if (Object.keys(consumerEnv).length > 0) {
        funcProps["Environment"] = { Variables: consumerEnv };
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

    // 8. SNS Topics
    for (const topic of graph.topics || []) {
      const logicalId = this.sanitizeName(topic.name);
      const resourceKey = `Topic${logicalId}`;
      const topicProps: any = {
        TopicName: { "Fn::Sub": `\${AWS::StackName}-${topic.name}` },
      };
      if (topic.fifo) {
        topicProps["FifoTopic"] = true;
      }
      if (topic.subscriptions && topic.subscriptions.length > 0) {
        topicProps["Subscription"] = topic.subscriptions.map((s) => ({
          Protocol: s.protocol,
          Endpoint: s.endpoint,
        }));
      }
      resources[resourceKey] = {
        Type: "AWS::SNS::Topic",
        Properties: topicProps,
      };

      outputs[`${logicalId}TopicArn`] = {
        Description: `ARN of SNS Topic ${topic.name}`,
        Value: { Ref: resourceKey },
      };
    }

    // 9. DynamoDB Stream Consumers
    for (const consumer of graph.tableStreams || []) {
      const logicalId = this.sanitizeName(consumer.id);
      const funcKey = `Function${logicalId}`;
      const mappingKey = `EventSourceMapping${logicalId}`;
      const tableKey = `Table${this.sanitizeName(consumer.tableName)}`;

      const artifactDir = lambdaArtifactDirs[consumer.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const roleKey = `Role${logicalId}`;
      resources[roleKey] = this.createLambdaRole(
        logicalId,
        {
          tableStreams: [consumer.tableName],
          firehose: true,
          policies: consumer.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${consumer.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: consumer.timeout ?? 60,
        MemorySize: consumer.memory ?? 256,
        Role: { "Fn::GetAtt": [roleKey, "Arn"] },
      };

      const consumerEnv = this.mergeEnvironment(envVars, consumer.environment);
      if (Object.keys(consumerEnv).length > 0) {
        funcProps["Environment"] = { Variables: consumerEnv };
      }

      if (consumer.concurrency !== undefined) {
        funcProps["ReservedConcurrentExecutions"] = consumer.concurrency;
      }

      resources[funcKey] = {
        Type: "AWS::Lambda::Function",
        Properties: funcProps,
      };

      const mappingProps: any = {
        EventSourceArn: { "Fn::GetAtt": [tableKey, "StreamArn"] },
        FunctionName: { Ref: funcKey },
        StartingPosition: consumer.startingPosition || "LATEST",
        BatchSize: consumer.batchSize ?? 100,
        FunctionResponseTypes: ["ReportBatchItemFailures"],
      };

      if (consumer.enabled !== undefined) {
        mappingProps.Enabled = consumer.enabled;
      }

      resources[mappingKey] = {
        Type: "AWS::Lambda::EventSourceMapping",
        Properties: mappingProps,
      };
    }

    // 10. SNS Topic Subscribers
    for (const subscriber of graph.topicSubscribers || []) {
      const logicalId = this.sanitizeName(subscriber.id);
      const funcKey = `Function${logicalId}`;
      const permKey = `Permission${logicalId}Sns`;
      const subKey = `Subscription${logicalId}`;
      const topicKey = `Topic${this.sanitizeName(subscriber.topicName)}`;

      const artifactDir = lambdaArtifactDirs[subscriber.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const roleKey = `Role${logicalId}`;
      resources[roleKey] = this.createLambdaRole(
        logicalId,
        {
          policies: subscriber.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: { "Fn::Sub": `\${AWS::StackName}-${subscriber.id}` },
        Runtime: "nodejs20.x",
        Handler: "index.handler",
        Code: relArtifactDir,
        Timeout: subscriber.timeout ?? 30,
        MemorySize: subscriber.memory ?? 256,
        Role: { "Fn::GetAtt": [roleKey, "Arn"] },
      };

      const subEnv = this.mergeEnvironment(envVars, subscriber.environment);
      if (Object.keys(subEnv).length > 0) {
        funcProps["Environment"] = { Variables: subEnv };
      }

      if (subscriber.concurrency !== undefined) {
        funcProps["ReservedConcurrentExecutions"] = subscriber.concurrency;
      }

      resources[funcKey] = {
        Type: "AWS::Lambda::Function",
        Properties: funcProps,
      };

      resources[permKey] = {
        Type: "AWS::Lambda::Permission",
        Properties: {
          FunctionName: { Ref: funcKey },
          Action: "lambda:InvokeFunction",
          Principal: "sns.amazonaws.com",
          SourceArn: { Ref: topicKey },
        },
      };

      resources[subKey] = {
        Type: "AWS::SNS::Subscription",
        Properties: {
          TopicArn: { Ref: topicKey },
          Protocol: "lambda",
          Endpoint: { "Fn::GetAtt": [funcKey, "Arn"] },
        },
      };
    }

    // 11. CloudWatch Alarms
    for (const alarm of graph.alarms || []) {
      const logicalId = this.sanitizeName(alarm.name);
      const resourceKey = `Alarm${logicalId}`;

      const alarmActions = (alarm.actions || []).map((act) => {
        const matchingTopic = (graph.topics || []).find((t) => t.name === act || t.id === act);
        if (matchingTopic) {
          return { Ref: `Topic${this.sanitizeName(matchingTopic.name)}` };
        }
        return act;
      });

      const alarmProps: any = {
        AlarmDescription: alarm.description || `Alarm ${alarm.name}`,
        EvaluationPeriods: alarm.evaluationPeriods || 1,
        Threshold: alarm.threshold,
        ComparisonOperator: alarm.comparison || "GreaterThanOrEqualToThreshold",
        AlarmActions: alarmActions,
      };

      if (alarm.treatMissingData) {
        alarmProps["TreatMissingData"] = alarm.treatMissingData;
      }

      if (alarm.metrics && alarm.metrics.length > 0) {
        alarmProps["Metrics"] = alarm.metrics.map((m) => {
          const item: any = {
            Id: m.id,
          };
          if (m.expression) item.Expression = m.expression;
          if (m.label) item.Label = m.label;
          if (m.returnData !== undefined) item.ReturnData = m.returnData;
          if (m.metricStat) {
            const statObj: any = {
              Metric: {
                Namespace: m.metricStat.metric.namespace || "AWS/Lambda",
                MetricName: m.metricStat.metric.metricName,
              },
              Period: m.metricStat.period || 60,
              Stat: m.metricStat.stat || "Sum",
            };
            if (m.metricStat.metric.dimensions) {
              const dims = m.metricStat.metric.dimensions;
              const dimEntries = Array.isArray(dims)
                ? dims.map((d) => [d.name, d.value])
                : Object.entries(dims);
              statObj.Metric.Dimensions = dimEntries.map(([k, v]) => {
                const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v);
                return {
                  Name: k,
                  Value: matchingApi ? { Ref: `Function${this.sanitizeName(matchingApi.id)}` } : v,
                };
              });
            }
            item.MetricStat = statObj;
          }
          return item;
        });
      } else {
        const metric = alarm.metric || {
          metricName: "Invocations",
          namespace: "AWS/Lambda",
          period: 60,
          stat: "Sum",
        };

        alarmProps["MetricName"] = metric.metricName;
        alarmProps["Namespace"] = metric.namespace || "AWS/Lambda";
        alarmProps["Period"] = metric.period || 60;
        alarmProps["Statistic"] = metric.stat || "Sum";

        if (metric.dimensions && Object.keys(metric.dimensions).length > 0) {
          alarmProps["Dimensions"] = Object.entries(metric.dimensions).map(([k, v]) => {
            const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v);
            return {
              Name: k,
              Value: matchingApi ? { Ref: `Function${this.sanitizeName(matchingApi.id)}` } : v,
            };
          });
        }
      }

      resources[resourceKey] = {
        Type: "AWS::CloudWatch::Alarm",
        Properties: alarmProps,
      };
    }

    // 12. EventBridge Rules & SQS Queue Policies (e.g. S3 -> EventBridge -> SQS)
    for (const binding of graph.bindings) {
      const cleanBucket = this.sanitizeName(binding.sourceBucketName);
      const cleanQueue = this.sanitizeName(binding.targetQueueName);
      const ruleKey = `EventRule${cleanBucket}To${cleanQueue}`;
      const policyKey = `QueuePolicy${cleanQueue}EventBridge`;

      const detailPattern: any = {
        bucket: { name: [{ Ref: `Bucket${cleanBucket}` }] },
      };

      if (binding.prefix) {
        detailPattern["object"] = { key: [{ prefix: binding.prefix }] };
      }

      resources[ruleKey] = {
        Type: "AWS::Events::Rule",
        Properties: {
          Description: `Routes S3 events from ${binding.sourceBucketName} to ${binding.targetQueueName}`,
          State: "ENABLED",
          EventPattern: {
            source: ["aws.s3"],
            "detail-type": [
              binding.event === "objectCreated" ? "Object Created" : "Object Removed",
            ],
            detail: detailPattern,
          },
          Targets: [
            {
              Arn: { "Fn::GetAtt": [`Queue${cleanQueue}`, "Arn"] },
              Id: `${cleanQueue}Target`,
            },
          ],
        },
      };

      resources[policyKey] = {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [{ Ref: `Queue${cleanQueue}` }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "events.amazonaws.com" },
                Action: "sqs:SendMessage",
                Resource: { "Fn::GetAtt": [`Queue${cleanQueue}`, "Arn"] },
                Condition: {
                  ArnEquals: {
                    "aws:SourceArn": { "Fn::GetAtt": [ruleKey, "Arn"] },
                  },
                },
              },
            ],
          },
        },
      };
    }

    // 13. Kinesis Firehose Delivery Streams & IAM Roles
    for (const ds of graph.deliveryStreams || []) {
      const cleanName = this.sanitizeName(ds.name);
      const streamKey = `DeliveryStream${cleanName}`;
      const roleKey = `FirehoseRole${cleanName}`;

      const matchingBucket = graph.buckets.find(
        (b) => b.name === ds.destinationBucketName || b.id === ds.destinationBucketName
      );

      const bucketArn = matchingBucket
        ? { "Fn::GetAtt": [`Bucket${this.sanitizeName(matchingBucket.name)}`, "Arn"] }
        : ds.destinationBucketName.startsWith("arn:aws:s3:::")
        ? ds.destinationBucketName
        : { "Fn::Sub": `arn:aws:s3:::${ds.destinationBucketName}` };

      const bucketWildcardArn = matchingBucket
        ? {
            "Fn::Sub": [
              "${BucketArn}/*",
              { BucketArn: { "Fn::GetAtt": [`Bucket${this.sanitizeName(matchingBucket.name)}`, "Arn"] } },
            ],
          }
        : ds.destinationBucketName.startsWith("arn:aws:s3:::")
        ? `${ds.destinationBucketName}/*`
        : { "Fn::Sub": `arn:aws:s3:::${ds.destinationBucketName}/*` };

      // IAM Role for Firehose
      resources[roleKey] = {
        Type: "AWS::IAM::Role",
        Properties: {
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "firehose.amazonaws.com" },
                Action: "sts:AssumeRole",
              },
            ],
          },
          Policies: [
            {
              PolicyName: "FirehoseWriteS3",
              PolicyDocument: {
                Version: "2012-10-17",
                Statement: [
                  {
                    Effect: "Allow",
                    Action: [
                      "s3:AbortMultipartUpload",
                      "s3:GetBucketLocation",
                      "s3:GetObject",
                      "s3:ListBucket",
                      "s3:ListBucketMultipartUploads",
                      "s3:PutObject",
                    ],
                    Resource: [bucketArn, bucketWildcardArn],
                  },
                ],
              },
            },
          ],
        },
      };

      // Extended S3 Destination Configuration
      const s3DestConfig: any = {
        BucketARN: bucketArn,
        RoleARN: { "Fn::GetAtt": [roleKey, "Arn"] },
        CompressionFormat: ds.compression || "GZIP",
        BufferingHints: {
          IntervalInSeconds: ds.bufferingInterval ?? 900,
          SizeInMBs: ds.bufferingSize ?? 5,
        },
      };

      if (ds.prefix) {
        s3DestConfig.Prefix = ds.prefix;
      }
      if (ds.errorPrefix) {
        s3DestConfig.ErrorOutputPrefix = ds.errorPrefix;
      }

      resources[streamKey] = {
        Type: "AWS::KinesisFirehose::DeliveryStream",
        Properties: {
          DeliveryStreamName: { "Fn::Sub": `\${AWS::StackName}-${ds.name}` },
          DeliveryStreamType: "DirectPut",
          ExtendedS3DestinationConfiguration: s3DestConfig,
        },
      };

      outputs[`${cleanName}DeliveryStreamName`] = {
        Description: `Name of the ${ds.name} Kinesis Firehose Delivery Stream`,
        Value: { Ref: streamKey },
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

  private createLambdaRole(
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

    if (options.queues && options.queues.length > 0) {
      statements.push({
        Effect: "Allow",
        Action: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        Resource: options.queues.map((q) => ({
          "Fn::GetAtt": [`Queue${this.sanitizeName(q)}`, "Arn"],
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
          "Fn::GetAtt": [`Table${this.sanitizeName(tableName)}`, "StreamArn"],
        })),
      });
    }

    if (options.firehose && graph.deliveryStreams && graph.deliveryStreams.length > 0) {
      statements.push({
        Effect: "Allow",
        Action: ["firehose:PutRecord", "firehose:PutRecordBatch"],
        Resource: graph.deliveryStreams.map((ds) => ({
          "Fn::GetAtt": [`DeliveryStream${this.sanitizeName(ds.name)}`, "Arn"],
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
      },
    };
  }

  private mergeEnvironment(
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
}
