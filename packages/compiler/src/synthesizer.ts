import * as path from "node:path";
import * as fs from "node:fs/promises";
import type {
  ResourceGraph,
  ContainerIR,
  TableIR,
  BucketIR,
  QueueIR,
  TopicIR,
  DeliveryStreamIR,
  AlarmIR,
} from "./types";

export class Synthesizer {
  constructor(public readonly workDir: string) {}

  public getTableLogicalId(tableOrName: TableIR | string, graph?: ResourceGraph): string {
    if (typeof tableOrName === "string") {
      const found = graph?.tables.find((t) => t.name === tableOrName || t.id === tableOrName);
      if (found && found.logicalId) return found.logicalId;
      return `Table${this.sanitizeName(tableOrName)}`;
    }
    return tableOrName.logicalId || `Table${this.sanitizeName(tableOrName.name)}`;
  }

  public getBucketLogicalId(bucketOrName: BucketIR | string, graph?: ResourceGraph): string {
    if (typeof bucketOrName === "string") {
      const found = graph?.buckets.find((b) => b.name === bucketOrName || b.id === bucketOrName);
      if (found && found.logicalId) return found.logicalId;
      return `Bucket${this.sanitizeName(bucketOrName)}`;
    }
    return bucketOrName.logicalId || `Bucket${this.sanitizeName(bucketOrName.name)}`;
  }

  public getQueueLogicalId(queueOrName: QueueIR | string, graph?: ResourceGraph): string {
    if (typeof queueOrName === "string") {
      const found = graph?.queues.find((q) => q.name === queueOrName || q.id === queueOrName);
      if (found && found.logicalId) return found.logicalId;
      return `Queue${this.sanitizeName(queueOrName)}`;
    }
    return queueOrName.logicalId || `Queue${this.sanitizeName(queueOrName.name)}`;
  }

  public getDLQLogicalId(queue: QueueIR): string {
    return queue.deadLetterQueue?.logicalId || `Queue${this.sanitizeName(queue.name)}DLQ`;
  }

  public getTopicLogicalId(topicOrName: TopicIR | string, graph?: ResourceGraph): string {
    if (typeof topicOrName === "string") {
      const found = graph?.topics?.find((t) => t.name === topicOrName || t.id === topicOrName);
      if (found && found.logicalId) return found.logicalId;
      return `Topic${this.sanitizeName(topicOrName)}`;
    }
    return topicOrName.logicalId || `Topic${this.sanitizeName(topicOrName.name)}`;
  }

  public getDeliveryStreamLogicalId(dsOrName: DeliveryStreamIR | string, graph?: ResourceGraph): string {
    if (typeof dsOrName === "string") {
      const found = graph?.deliveryStreams?.find((d) => d.name === dsOrName || d.id === dsOrName);
      if (found && found.logicalId) return found.logicalId;
      return `DeliveryStream${this.sanitizeName(dsOrName)}`;
    }
    return dsOrName.logicalId || `DeliveryStream${this.sanitizeName(dsOrName.name)}`;
  }

  public getFunctionLogicalId(func: { id: string; logicalId?: string | undefined }): string {
    return func.logicalId || `Function${this.sanitizeName(func.id)}`;
  }

  public getAlarmLogicalId(alarm: AlarmIR): string {
    return alarm.logicalId || `Alarm${this.sanitizeName(alarm.name)}`;
  }

  private resolvePhysicalName(name: string | undefined, defaultSub: any): any {
    if (!name) return defaultSub;
    return name.includes("${") ? { "Fn::Sub": name } : name;
  }

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
          "Fn::GetAtt": [this.getQueueLogicalId(q), "Arn"],
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
          "Fn::GetAtt": [this.getTableLogicalId(s.tableName, graph), "StreamArn"],
        })),
      });
    }

    // Add SNS publish permissions if topics exist
    if (graph.topics && graph.topics.length > 0) {
      roleStatements.push({
        Effect: "Allow",
        Action: ["sns:Publish"],
        Resource: graph.topics.map((t) => ({
          Ref: this.getTopicLogicalId(t),
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
          "Fn::GetAtt": [this.getDeliveryStreamLogicalId(ds), "Arn"],
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
      const resourceKey = this.getTableLogicalId(table);
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
        TableName: this.resolvePhysicalName(table.tableName, { "Fn::Sub": `\${AWS::StackName}-${table.name}` }),
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

      const tableDeletionPolicy =
        table.deletionPolicy || (table.retain === false ? "Delete" : "Retain");
      const tableUpdateReplacePolicy =
        table.deletionPolicy || (table.retain === false ? "Delete" : "Retain");

      resources[resourceKey] = {
        Type: "AWS::DynamoDB::Table",
        DeletionPolicy: tableDeletionPolicy,
        UpdateReplacePolicy: tableUpdateReplacePolicy,
        Properties: tableProps,
      };
    }

    // 4. S3 Buckets
    for (const bucket of graph.buckets) {
      const resourceKey = this.getBucketLogicalId(bucket);
      const defaultBucketNameSub = bucket.accountScoped
        ? `\${AWS::StackName}-${bucket.name}-\${AWS::AccountId}`
        : `\${AWS::StackName}-${bucket.name}`;
      const bucketProps: any = {
        BucketName: this.resolvePhysicalName(bucket.bucketName, { "Fn::Sub": defaultBucketNameSub }),
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

      const bucketDeletionPolicy =
        bucket.deletionPolicy || (bucket.retain === false ? "Delete" : "Retain");
      const bucketUpdateReplacePolicy =
        bucket.deletionPolicy || (bucket.retain === false ? "Delete" : "Retain");

      resources[resourceKey] = {
        Type: "AWS::S3::Bucket",
        DeletionPolicy: bucketDeletionPolicy,
        UpdateReplacePolicy: bucketUpdateReplacePolicy,
        Properties: bucketProps,
      };
    }

    // 5. SQS Queues & DLQs
    for (const queue of graph.queues) {
      const resourceKey = this.getQueueLogicalId(queue);
      const queueProps: any = {
        QueueName: this.resolvePhysicalName(queue.queueName, { "Fn::Sub": `\${AWS::StackName}-${queue.name}` }),
        VisibilityTimeout: queue.visibilityTimeout ?? 180,
      };

      if (queue.deadLetterQueue) {
        const dlqKey = this.getDLQLogicalId(queue);
        const dlqProps: any = {
          QueueName: this.resolvePhysicalName(
            queue.deadLetterQueue.queueName,
            { "Fn::Sub": `\${AWS::StackName}-${queue.name}-dlq` }
          ),
        };
        resources[dlqKey] = {
          Type: "AWS::SQS::Queue",
          Properties: dlqProps,
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
      const logicalId = this.getTableLogicalId(table);
      const upperName = table.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_TABLE_${upperName}`] = { Ref: logicalId };
      envVars[`TABLE_${upperName}_NAME`] = { Ref: logicalId };
      envVars[`${upperName}_TABLE_NAME`] = { Ref: logicalId };
      envVars[table.name] = { Ref: logicalId };
    }

    for (const bucket of graph.buckets) {
      const logicalId = this.getBucketLogicalId(bucket);
      const upperName = bucket.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_BUCKET_${upperName}`] = { Ref: logicalId };
      envVars[`BUCKET_${upperName}_NAME`] = { Ref: logicalId };
      envVars[`${upperName}_BUCKET_NAME`] = { Ref: logicalId };
      envVars[bucket.name] = { Ref: logicalId };
    }

    for (const queue of graph.queues) {
      const logicalId = this.getQueueLogicalId(queue);
      const upperName = queue.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_QUEUE_${upperName}`] = { Ref: logicalId };
      envVars[`QUEUE_${upperName}_URL`] = { Ref: logicalId };
      envVars[`${upperName}_QUEUE_URL`] = { Ref: logicalId };
      envVars[queue.name] = { Ref: logicalId };
    }

    for (const topic of graph.topics || []) {
      const logicalId = this.getTopicLogicalId(topic);
      const upperName = topic.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_TOPIC_${upperName}`] = { Ref: logicalId };
      envVars[`TOPIC_${upperName}_ARN`] = { Ref: logicalId };
      envVars[`${upperName}_TOPIC_ARN`] = { Ref: logicalId };
      envVars[topic.name] = { Ref: logicalId };
    }

    for (const ds of graph.deliveryStreams || []) {
      const logicalId = this.getDeliveryStreamLogicalId(ds);
      const upperName = ds.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const baseUpper = upperName.replace(/_?(DELIVERY)?_?STREAM$/, "");

      envVars[`SYNCPLOY_DELIVERY_STREAM_${upperName}`] = { Ref: logicalId };
      envVars[`DELIVERY_STREAM_${upperName}_NAME`] = { Ref: logicalId };
      envVars[`${upperName}_DELIVERY_STREAM_NAME`] = { Ref: logicalId };
      if (baseUpper) {
        envVars[`${baseUpper}_DELIVERY_STREAM_NAME`] = { Ref: logicalId };
      }
      envVars[ds.name] = { Ref: logicalId };
    }

    for (const api of graph.apis) {
      const logicalId = this.getFunctionLogicalId(api);
      const upperName = api.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      envVars[`SYNCPLOY_FUNCTION_${upperName}`] = { Ref: logicalId };
      envVars[`FUNCTION_${upperName}_NAME`] = { Ref: logicalId };
      envVars[`${upperName}_FUNCTION_NAME`] = { Ref: logicalId };
      envVars[api.id] = { Ref: logicalId };
      if (api.id.toLowerCase().includes("backend")) {
        envVars["BACKEND_FUNCTION_NAME"] = { Ref: logicalId };
      }
    }

    // 7. Lambdas and API Gateway Routes
    for (const api of graph.apis) {
      const baseId = api.logicalId || this.sanitizeName(api.id);
      const funcKey = this.getFunctionLogicalId(api);
      const integKey = `Integration${baseId}`;
      const routeKey = `Route${baseId}`;
      const permKey = `Permission${baseId}`;

      const artifactDir = lambdaArtifactDirs[api.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");
      const apiGatewayPath = api.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

      const roleKey = `Role${baseId}`;
      resources[roleKey] = this.createLambdaRole(
        baseId,
        { tables: true, buckets: true, policies: api.policies },
        graph
      );

      const funcProps: any = {
        FunctionName: this.resolvePhysicalName(api.functionName, { "Fn::Sub": `\${AWS::StackName}-${api.id}` }),
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
      if (api.logicalId) {
        const upperLogical = api.logicalId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
        delete functionEnv[`SYNCPLOY_FUNCTION_${upperLogical}`];
        delete functionEnv[`FUNCTION_${upperLogical}_NAME`];
        delete functionEnv[`${upperLogical}_FUNCTION_NAME`];
        delete functionEnv[api.logicalId];
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
      this.applyContainerConfig(funcProps, api.container, api.id, resources, funcKey);

      if (api.ingress === "function-url") {
        const urlKey = api.logicalId ? `${api.logicalId}Url` : `FunctionUrl${baseId}`;
        const urlPermKey = api.logicalId ? `Permission${api.logicalId}Url` : `Permission${baseId}Url`;

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

        outputs[`${baseId}Url`] = {
          Description: `Direct Lambda Function URL for ${api.id}`,
          Value: { "Fn::GetAtt": [urlKey, "FunctionUrl"] },
        };

        if (!outputs["ApiEndpoint"]) {
          outputs["ApiEndpoint"] = {
            Description: "Lambda Function URL",
            Value: { "Fn::GetAtt": [urlKey, "FunctionUrl"] },
          };
        }
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
      const baseId = consumer.logicalId || this.sanitizeName(consumer.id);
      const funcKey = this.getFunctionLogicalId(consumer);
      const mappingKey = `EventSourceMapping${baseId}`;
      const queueKey = this.getQueueLogicalId(consumer.queueName, graph);

      const artifactDir = lambdaArtifactDirs[consumer.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const roleKey = `Role${baseId}`;
      resources[roleKey] = this.createLambdaRole(
        baseId,
        {
          tables: true,
          buckets: true,
          queues: [consumer.queueName],
          policies: consumer.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: this.resolvePhysicalName(consumer.functionName, { "Fn::Sub": `\${AWS::StackName}-${consumer.id}` }),
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
      this.applyContainerConfig(funcProps, consumer.container, consumer.id, resources, funcKey);

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
      const resourceKey = this.getTopicLogicalId(topic);
      const topicProps: any = {
        TopicName: this.resolvePhysicalName(topic.topicName, { "Fn::Sub": `\${AWS::StackName}-${topic.name}` }),
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

      outputs[`${this.sanitizeName(resourceKey)}TopicArn`] = {
        Description: `ARN of SNS Topic ${topic.name}`,
        Value: { Ref: resourceKey },
      };
    }

    // 9. DynamoDB Stream Consumers
    for (const consumer of graph.tableStreams || []) {
      const baseId = consumer.logicalId || this.sanitizeName(consumer.id);
      const funcKey = this.getFunctionLogicalId(consumer);
      const mappingKey = `EventSourceMapping${baseId}`;
      const tableKey = this.getTableLogicalId(consumer.tableName, graph);

      const artifactDir = lambdaArtifactDirs[consumer.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const roleKey = `Role${baseId}`;
      resources[roleKey] = this.createLambdaRole(
        baseId,
        {
          tableStreams: [consumer.tableName],
          firehose: true,
          policies: consumer.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: this.resolvePhysicalName(consumer.functionName, { "Fn::Sub": `\${AWS::StackName}-${consumer.id}` }),
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
      this.applyContainerConfig(funcProps, consumer.container, consumer.id, resources, funcKey);

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
      const baseId = subscriber.logicalId || this.sanitizeName(subscriber.id);
      const funcKey = this.getFunctionLogicalId(subscriber);
      const permKey = `Permission${baseId}Sns`;
      const subKey = `Subscription${baseId}`;
      const topicKey = this.getTopicLogicalId(subscriber.topicName, graph);

      const artifactDir = lambdaArtifactDirs[subscriber.id];
      const relArtifactDir = path.relative(this.workDir, artifactDir || "");

      const roleKey = `Role${baseId}`;
      resources[roleKey] = this.createLambdaRole(
        baseId,
        {
          policies: subscriber.policies,
        },
        graph
      );

      const funcProps: any = {
        FunctionName: this.resolvePhysicalName(subscriber.functionName, { "Fn::Sub": `\${AWS::StackName}-${subscriber.id}` }),
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
      this.applyContainerConfig(funcProps, subscriber.container, subscriber.id, resources, funcKey);

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
      const resourceKey = this.getAlarmLogicalId(alarm);

      const alarmActions = (alarm.actions || []).map((act) => {
        const matchingTopic = (graph.topics || []).find((t) => t.name === act || t.id === act || t.logicalId === act);
        if (matchingTopic) {
          return { Ref: this.getTopicLogicalId(matchingTopic) };
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

      if (alarm.alarmName) {
        alarmProps["AlarmName"] = this.resolvePhysicalName(alarm.alarmName, undefined);
      }

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
                const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v || a.logicalId === v);
                return {
                  Name: k,
                  Value: matchingApi ? { Ref: this.getFunctionLogicalId(matchingApi) } : v,
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
            const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v || a.logicalId === v);
            return {
              Name: k,
              Value: matchingApi ? { Ref: this.getFunctionLogicalId(matchingApi) } : v,
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
      const bucketKey = this.getBucketLogicalId(binding.sourceBucketName, graph);
      const queueKey = this.getQueueLogicalId(binding.targetQueueName, graph);
      const ruleKey = `EventRule${cleanBucket}To${cleanQueue}`;
      const policyKey = `QueuePolicy${cleanQueue}EventBridge`;

      const detailPattern: any = {
        bucket: { name: [{ Ref: bucketKey }] },
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
              Arn: { "Fn::GetAtt": [queueKey, "Arn"] },
              Id: `${this.sanitizeName(queueKey)}Target`,
            },
          ],
        },
      };

      resources[policyKey] = {
        Type: "AWS::SQS::QueuePolicy",
        Properties: {
          Queues: [{ Ref: queueKey }],
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: { Service: "events.amazonaws.com" },
                Action: "sqs:SendMessage",
                Resource: { "Fn::GetAtt": [queueKey, "Arn"] },
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
      const streamKey = this.getDeliveryStreamLogicalId(ds);
      const roleKey = ds.logicalId ? `FirehoseRole${ds.logicalId}` : `FirehoseRole${cleanName}`;

      const matchingBucket = graph.buckets.find(
        (b) => b.name === ds.destinationBucketName || b.id === ds.destinationBucketName || b.logicalId === ds.destinationBucketName
      );

      const bucketArn = matchingBucket
        ? { "Fn::GetAtt": [this.getBucketLogicalId(matchingBucket), "Arn"] }
        : ds.destinationBucketName.startsWith("arn:aws:s3:::")
        ? ds.destinationBucketName
        : { "Fn::Sub": `arn:aws:s3:::${ds.destinationBucketName}` };

      const bucketWildcardArn = matchingBucket
        ? {
            "Fn::Sub": [
              "${BucketArn}/*",
              { BucketArn: { "Fn::GetAtt": [this.getBucketLogicalId(matchingBucket), "Arn"] } },
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
          DeliveryStreamName: this.resolvePhysicalName(ds.streamName, { "Fn::Sub": `\${AWS::StackName}-${ds.name}` }),
          DeliveryStreamType: "DirectPut",
          ExtendedS3DestinationConfiguration: s3DestConfig,
        },
      };

      outputs[`${this.sanitizeName(ds.name)}DeliveryStreamName`] = {
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

  private applyContainerConfig(
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

    if (options.queues && options.queues.length > 0) {
      statements.push({
        Effect: "Allow",
        Action: [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
        ],
        Resource: options.queues.map((q) => ({
          "Fn::GetAtt": [this.getQueueLogicalId(q, graph), "Arn"],
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
          "Fn::GetAtt": [this.getTableLogicalId(tableName, graph), "StreamArn"],
        })),
      });
    }

    if (options.firehose && graph.deliveryStreams && graph.deliveryStreams.length > 0) {
      statements.push({
        Effect: "Allow",
        Action: ["firehose:PutRecord", "firehose:PutRecordBatch"],
        Resource: graph.deliveryStreams.map((ds) => ({
          "Fn::GetAtt": [this.getDeliveryStreamLogicalId(ds), "Arn"],
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
