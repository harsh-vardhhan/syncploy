import * as path from "node:path";
import type { ResourceGraph } from "../../types";
import {
  sanitizeName,
  getFunctionLogicalId,
  getQueueLogicalId,
  getTableLogicalId,
  getTopicLogicalId,
  resolvePhysicalName,
} from "../logical-ids";
import { applyContainerConfig, createLambdaRole, mergeEnvironment } from "../roles";

export function generateQueueConsumers(
  graph: ResourceGraph,
  resources: Record<string, any>,
  lambdaArtifactDirs: Record<string, string>,
  workDir: string,
  envVars: Record<string, any>
): void {
  for (const consumer of graph.consumers) {
    const baseId = consumer.logicalId || sanitizeName(consumer.id);
    const funcKey = getFunctionLogicalId(consumer);
    const mappingKey = consumer.eventSourceMappingLogicalId || `EventSourceMapping${baseId}`;
    const queueKey = getQueueLogicalId(consumer.queueName, graph);

    const artifactDir = lambdaArtifactDirs[consumer.id];
    const relArtifactDir = path.relative(workDir, artifactDir || "");

    const roleKey = consumer.roleLogicalId || `Role${baseId}`;
    resources[roleKey] = createLambdaRole(
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
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Code: relArtifactDir,
      Timeout: consumer.timeout ?? 120,
      MemorySize: consumer.memory ?? 256,
      Role: { "Fn::GetAtt": [roleKey, "Arn"] },
    };
    if (consumer.functionName) {
      funcProps.FunctionName = resolvePhysicalName(consumer.functionName, undefined);
    }

    const consumerEnv = mergeEnvironment(envVars, consumer.environment);

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
    applyContainerConfig(funcProps, consumer.container, consumer.id, resources, funcKey);

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
}

export function generateStreamConsumers(
  graph: ResourceGraph,
  resources: Record<string, any>,
  lambdaArtifactDirs: Record<string, string>,
  workDir: string,
  envVars: Record<string, any>
): void {
  for (const consumer of graph.tableStreams || []) {
    const baseId = consumer.logicalId || sanitizeName(consumer.id);
    const funcKey = getFunctionLogicalId(consumer);
    const mappingKey = consumer.eventSourceMappingLogicalId || `EventSourceMapping${baseId}`;
    const tableKey = getTableLogicalId(consumer.tableName, graph);

    const artifactDir = lambdaArtifactDirs[consumer.id];
    const relArtifactDir = path.relative(workDir, artifactDir || "");

    const roleKey = consumer.roleLogicalId || `Role${baseId}`;
    resources[roleKey] = createLambdaRole(
      baseId,
      {
        tableStreams: [consumer.tableName],
        firehose: true,
        policies: consumer.policies,
      },
      graph
    );

    const funcProps: any = {
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Code: relArtifactDir,
      Timeout: consumer.timeout ?? 60,
      MemorySize: consumer.memory ?? 256,
      Role: { "Fn::GetAtt": [roleKey, "Arn"] },
    };
    if (consumer.functionName) {
      funcProps.FunctionName = resolvePhysicalName(consumer.functionName, undefined);
    }

    const consumerEnv = mergeEnvironment(envVars, consumer.environment);
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
    applyContainerConfig(funcProps, consumer.container, consumer.id, resources, funcKey);

    const mappingProps: any = {
      EventSourceArn: { "Fn::GetAtt": [tableKey, "StreamArn"] },
      FunctionName: { Ref: funcKey },
      StartingPosition: consumer.startingPosition || "LATEST",
      BatchSize: consumer.batchSize ?? 100,
      FunctionResponseTypes: ["ReportBatchItemFailures"],
      MaximumRetryAttempts: consumer.retryAttempts ?? 3,
      BisectBatchOnFunctionError: consumer.bisectOnFunctionError ?? true,
    };

    if (consumer.onFailureQueueName) {
      const dlq = (graph.queues || []).find(
        (q) =>
          q.name === consumer.onFailureQueueName ||
          q.id === consumer.onFailureQueueName ||
          q.logicalId === consumer.onFailureQueueName
      );
      if (dlq) {
        const dlqLogicalId = getQueueLogicalId(dlq, graph);
        mappingProps.DestinationConfig = {
          OnFailure: {
            Destination: { "Fn::GetAtt": [dlqLogicalId, "Arn"] },
          },
        };
      }
    }

    if (consumer.enabled !== undefined) {
      mappingProps.Enabled = consumer.enabled;
    }

    resources[mappingKey] = {
      Type: "AWS::Lambda::EventSourceMapping",
      Properties: mappingProps,
    };
  }
}

export function generateTopicSubscribers(
  graph: ResourceGraph,
  resources: Record<string, any>,
  lambdaArtifactDirs: Record<string, string>,
  workDir: string,
  envVars: Record<string, any>
): void {
  for (const subscriber of graph.topicSubscribers || []) {
    const baseId = subscriber.logicalId || sanitizeName(subscriber.id);
    const funcKey = getFunctionLogicalId(subscriber);
    const permKey = subscriber.permissionLogicalId || `Permission${baseId}Sns`;
    const subKey = subscriber.subscriptionLogicalId || `Subscription${baseId}`;
    const topicKey = getTopicLogicalId(subscriber.topicName, graph);

    const artifactDir = lambdaArtifactDirs[subscriber.id];
    const relArtifactDir = path.relative(workDir, artifactDir || "");

    const roleKey = subscriber.roleLogicalId || `Role${baseId}`;
    resources[roleKey] = createLambdaRole(
      baseId,
      {
        policies: subscriber.policies,
      },
      graph
    );

    const funcProps: any = {
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Code: relArtifactDir,
      Timeout: subscriber.timeout ?? 30,
      MemorySize: subscriber.memory ?? 256,
      Role: { "Fn::GetAtt": [roleKey, "Arn"] },
    };
    if (subscriber.functionName) {
      funcProps.FunctionName = resolvePhysicalName(subscriber.functionName, undefined);
    }

    const subEnv = mergeEnvironment(envVars, subscriber.environment);
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
    applyContainerConfig(funcProps, subscriber.container, subscriber.id, resources, funcKey);

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
}
