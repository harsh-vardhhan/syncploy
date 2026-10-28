import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type {
  QueueConsumerIR,
  TableStreamConsumerIR,
  TopicSubscriberIR,
  PolicyStatementIR,
  ContainerIR,
} from "../../types";
import type { ParseContext } from "../types";
import {
  unwrapExpression,
  extractDuration,
  extractMemory,
  extractNumber,
  extractString,
  extractEnvironment,
  extractPolicies,
  extractContainer,
  extractCommentSuppressions,
} from "./ast-utils";
import { extractMutationsFromNode } from "./mutations";

export function extractQueueConsumer(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): QueueConsumerIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.CallExpression)) return undefined;

  const expr = init.getExpression();
  if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) return undefined;
  if (expr.getName() !== "consumer") return undefined;

  const varName = decl.getName();
  const targetQueueVar = expr.getExpression().getText();
  const args = init.getArguments();

  let batchSize = 10;
  let timeout: number | undefined;
  let concurrency: number | undefined;
  let memory: number | undefined;
  let policies: PolicyStatementIR[] | undefined;
  let environment: Record<string, string> | undefined;
  let container: ContainerIR | undefined;
  let logicalId: string | undefined;
  let functionName: string | undefined;
  let eventSourceMappingLogicalId: string | undefined;
  let roleLogicalId: string | undefined;

  const optArg = unwrapExpression(args[0]);
  if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const consumerOpts = optArg as ObjectLiteralExpression;
    batchSize = extractNumber(consumerOpts.getProperty("batchSize")) ?? 10;
    timeout = extractDuration(consumerOpts.getProperty("timeout"));
    concurrency = extractNumber(consumerOpts.getProperty("concurrency"));
    memory = extractMemory(consumerOpts.getProperty("memory"));
    policies = extractPolicies(consumerOpts.getProperty("policies"));
    environment = extractEnvironment(consumerOpts.getProperty("environment"));
    container = extractContainer(consumerOpts.getProperty("container"));
    logicalId = extractString(consumerOpts.getProperty("logicalId"));
    functionName = extractString(consumerOpts.getProperty("functionName"));
    eventSourceMappingLogicalId =
      extractString(consumerOpts.getProperty("eventSourceMappingLogicalId")) ??
      extractString(consumerOpts.getProperty("mappingLogicalId"));
    roleLogicalId = extractString(consumerOpts.getProperty("roleLogicalId"));
  }

  const handlerNode =
    args.length > 1
      ? args[1]
      : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
        ? args[0]
        : undefined;

  const mutations = extractMutationsFromNode(
    handlerNode,
    sourceFile,
    context.varToTableName,
    context.varToBucketName,
    context.varToQueueName,
    context.varToTopicName,
    context.varToDeliveryStreamName
  );

  return {
    id: varName,
    queueName: context.varToQueueName[targetQueueVar] || targetQueueVar,
    exportName: varName,
    sourceFile: sourceFile.getFilePath(),
    batchSize,
    timeout,
    concurrency,
    memory,
    policies,
    environment,
    container,
    logicalId,
    functionName,
    eventSourceMappingLogicalId,
    roleLogicalId,
    mutations,
    suppressions: extractCommentSuppressions(decl),
  };
}

export function extractTableStream(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): TableStreamConsumerIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.CallExpression)) return undefined;

  const expr = init.getExpression();
  if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) return undefined;
  if (expr.getName() !== "stream") return undefined;

  const varName = decl.getName();
  const targetTableVar = expr.getExpression().getText();
  const args = init.getArguments();

  let batchSize = 100;
  let startingPosition: "LATEST" | "TRIM_HORIZON" = "LATEST";
  let enabled: boolean | undefined;
  let timeout: number | undefined;
  let concurrency: number | undefined;
  let memory: number | undefined;
  let policies: PolicyStatementIR[] | undefined;
  let environment: Record<string, string> | undefined;
  let container: ContainerIR | undefined;
  let logicalId: string | undefined;
  let functionName: string | undefined;
  let eventSourceMappingLogicalId: string | undefined;
  let roleLogicalId: string | undefined;

  const optArg = unwrapExpression(args[0]);
  if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const streamOpts = optArg as ObjectLiteralExpression;
    batchSize = extractNumber(streamOpts.getProperty("batchSize")) ?? 100;
    const posStr = extractString(streamOpts.getProperty("startingPosition"));
    if (posStr === "TRIM_HORIZON") startingPosition = "TRIM_HORIZON";
    const enProp = streamOpts.getProperty("enabled");
    if (enProp && enProp.isKind(SyntaxKind.PropertyAssignment)) {
      enabled = enProp.getInitializer()?.getText() !== "false";
    }
    timeout = extractDuration(streamOpts.getProperty("timeout"));
    concurrency = extractNumber(streamOpts.getProperty("concurrency"));
    memory = extractMemory(streamOpts.getProperty("memory"));
    policies = extractPolicies(streamOpts.getProperty("policies"));
    environment = extractEnvironment(streamOpts.getProperty("environment"));
    container = extractContainer(streamOpts.getProperty("container"));
    logicalId = extractString(streamOpts.getProperty("logicalId"));
    functionName = extractString(streamOpts.getProperty("functionName"));
    eventSourceMappingLogicalId =
      extractString(streamOpts.getProperty("eventSourceMappingLogicalId")) ??
      extractString(streamOpts.getProperty("mappingLogicalId"));
    roleLogicalId = extractString(streamOpts.getProperty("roleLogicalId"));
  }

  const handlerNode =
    args.length > 1
      ? args[1]
      : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
        ? args[0]
        : undefined;

  const mutations = extractMutationsFromNode(
    handlerNode,
    sourceFile,
    context.varToTableName,
    context.varToBucketName,
    context.varToQueueName,
    context.varToTopicName,
    context.varToDeliveryStreamName
  );

  return {
    id: varName,
    tableName: context.varToTableName[targetTableVar] || targetTableVar,
    exportName: varName,
    sourceFile: sourceFile.getFilePath(),
    batchSize,
    startingPosition,
    enabled,
    timeout,
    concurrency,
    memory,
    policies,
    environment,
    container,
    logicalId,
    functionName,
    eventSourceMappingLogicalId,
    roleLogicalId,
    mutations,
    suppressions: extractCommentSuppressions(decl),
  };
}

export function extractTopicSubscriber(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): TopicSubscriberIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.CallExpression)) return undefined;

  const expr = init.getExpression();
  if (!expr.isKind(SyntaxKind.PropertyAccessExpression)) return undefined;
  const propName = expr.getName();
  if (propName !== "subscribe" && propName !== "subscriber") return undefined;

  const varName = decl.getName();
  const targetTopicVar = expr.getExpression().getText();
  const args = init.getArguments();

  let timeout: number | undefined;
  let concurrency: number | undefined;
  let memory: number | undefined;
  let policies: PolicyStatementIR[] | undefined;
  let environment: Record<string, string> | undefined;
  let container: ContainerIR | undefined;
  let logicalId: string | undefined;
  let functionName: string | undefined;
  let subscriptionLogicalId: string | undefined;
  let permissionLogicalId: string | undefined;
  let roleLogicalId: string | undefined;

  const optArg = unwrapExpression(args[0]);
  if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const subOpts = optArg as ObjectLiteralExpression;
    timeout = extractDuration(subOpts.getProperty("timeout"));
    concurrency = extractNumber(subOpts.getProperty("concurrency"));
    memory = extractMemory(subOpts.getProperty("memory"));
    policies = extractPolicies(subOpts.getProperty("policies"));
    environment = extractEnvironment(subOpts.getProperty("environment"));
    container = extractContainer(subOpts.getProperty("container"));
    logicalId = extractString(subOpts.getProperty("logicalId"));
    functionName = extractString(subOpts.getProperty("functionName"));
    subscriptionLogicalId = extractString(subOpts.getProperty("subscriptionLogicalId"));
    permissionLogicalId = extractString(subOpts.getProperty("permissionLogicalId"));
    roleLogicalId = extractString(subOpts.getProperty("roleLogicalId"));
  }

  const handlerNode =
    args.length > 1
      ? args[1]
      : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
        ? args[0]
        : undefined;

  const mutations = extractMutationsFromNode(
    handlerNode,
    sourceFile,
    context.varToTableName,
    context.varToBucketName,
    context.varToQueueName,
    context.varToTopicName,
    context.varToDeliveryStreamName
  );

  return {
    id: varName,
    topicName: context.varToTopicName[targetTopicVar] || targetTopicVar,
    exportName: varName,
    sourceFile: sourceFile.getFilePath(),
    timeout,
    concurrency,
    memory,
    policies,
    environment,
    container,
    logicalId,
    functionName,
    subscriptionLogicalId,
    permissionLogicalId,
    roleLogicalId,
    mutations,
    suppressions: extractCommentSuppressions(decl),
  };
}
