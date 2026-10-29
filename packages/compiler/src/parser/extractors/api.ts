import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { ApiRouteIR, HttpMethod, IngressType } from "../../types";
import type { ParseContext } from "../types";
import {
  unwrapExpression,
  extractDuration,
  extractMemory,
  extractNumber,
  extractCors,
  extractString,
  extractEnvironment,
  extractPolicies,
  extractContainer,
  extractCommentSuppressions,
} from "./ast-utils";
import { extractMutationsFromNode } from "./mutations";

export function extractApiRoute(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): ApiRouteIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.CallExpression)) return undefined;

  const expr = init.getExpression();
  if (expr.getText() !== "api") return undefined;

  const varName = decl.getName();
  const isExported = decl.isExported();

  if (!isExported) {
    throw new Error(
      `API endpoint '${varName}' in ${sourceFile.getFilePath()} must be exported.`
    );
  }

  const args = init.getArguments();
  const optionsArg = unwrapExpression(args[0]);
  if (args.length === 0 || !optionsArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    throw new Error(
      `API endpoint '${varName}' in ${sourceFile.getFilePath()} must provide an options object.`
    );
  }

  const optionsObj = optionsArg as ObjectLiteralExpression;
  const pathProp = optionsObj.getProperty("path");
  if (!pathProp || !pathProp.isKind(SyntaxKind.PropertyAssignment)) {
    throw new Error(
      `API endpoint '${varName}' in ${sourceFile.getFilePath()} is missing required 'path' property.`
    );
  }

  const pathInitializer = pathProp.getInitializer();
  if (!pathInitializer || !pathInitializer.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `API endpoint '${varName}' path in ${sourceFile.getFilePath()} must be a string literal.`
    );
  }
  const pathValue = pathInitializer.getLiteralValue();

  let methodValue: HttpMethod = "POST";
  const methodProp = optionsObj.getProperty("method");
  if (methodProp && methodProp.isKind(SyntaxKind.PropertyAssignment)) {
    const methodInit = methodProp.getInitializer();
    if (methodInit && methodInit.isKind(SyntaxKind.StringLiteral)) {
      methodValue = methodInit.getLiteralValue().toUpperCase() as HttpMethod;
    }
  }

  let authValue = false;
  const authProp = optionsObj.getProperty("auth");
  if (authProp && authProp.isKind(SyntaxKind.PropertyAssignment)) {
    const authInit = authProp.getInitializer();
    if (authInit) {
      authValue = authInit.getText() === "true";
    }
  }

  let ingressValue: IngressType = "api-gateway";
  const ingressProp = optionsObj.getProperty("ingress");
  if (ingressProp && ingressProp.isKind(SyntaxKind.PropertyAssignment)) {
    const ingressInit = ingressProp.getInitializer();
    if (ingressInit && ingressInit.isKind(SyntaxKind.StringLiteral)) {
      ingressValue = ingressInit.getLiteralValue() as IngressType;
    }
  }

  const timeout = extractDuration(optionsObj.getProperty("timeout"));
  const memory = extractMemory(optionsObj.getProperty("memory"));
  const concurrency = extractNumber(optionsObj.getProperty("concurrency"));
  const logRetentionInDays = extractNumber(optionsObj.getProperty("logRetentionInDays"));
  const cors = extractCors(optionsObj.getProperty("cors"));

  let throttle: { rateLimit?: number; burstLimit?: number } | undefined;
  const throttleProp = optionsObj.getProperty("throttle");
  if (throttleProp && throttleProp.isKind(SyntaxKind.PropertyAssignment)) {
    const init = throttleProp.getInitializer();
    if (init && init.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const rate = extractNumber(init.getProperty("rateLimit"));
      const burst = extractNumber(init.getProperty("burstLimit"));
      if (rate !== undefined || burst !== undefined) {
        throttle = {
          ...(rate !== undefined ? { rateLimit: rate } : {}),
          ...(burst !== undefined ? { burstLimit: burst } : {}),
        };
      }
    }
  }

  const detailedMetricsProp = optionsObj.getProperty("detailedMetrics");
  const detailedMetrics =
    detailedMetricsProp && detailedMetricsProp.isKind(SyntaxKind.PropertyAssignment)
      ? detailedMetricsProp.getInitializer()?.getText() === "true"
      : undefined;

  const policies = extractPolicies(optionsObj.getProperty("policies"));
  const environment = extractEnvironment(optionsObj.getProperty("environment"));
  const container = extractContainer(optionsObj.getProperty("container"));
  const logicalId = extractString(optionsObj.getProperty("logicalId"));
  const functionName = extractString(optionsObj.getProperty("functionName"));
  const roleLogicalId = extractString(optionsObj.getProperty("roleLogicalId"));
  const permissionLogicalId = extractString(optionsObj.getProperty("permissionLogicalId"));
  const invokePermissionLogicalId = extractString(optionsObj.getProperty("invokePermissionLogicalId"));

  const handlerNode = args.length > 1 ? args[1] : undefined;
  const mutations = extractMutationsFromNode(
    handlerNode,
    sourceFile,
    context.varToTableName,
    context.varToBucketName,
    context.varToQueueName,
    context.varToTopicName,
    context.varToDeliveryStreamName,
    context.knownApis
  );

  return {
    id: varName,
    exportName: varName,
    sourceFile: sourceFile.getFilePath(),
    method: methodValue,
    path: pathValue,
    auth: authValue,
    ingress: ingressValue,
    timeout,
    memory,
    concurrency,
    logRetentionInDays,
    throttle,
    detailedMetrics,
    cors,
    policies,
    environment,
    container,
    logicalId,
    functionName,
    roleLogicalId,
    permissionLogicalId,
    invokePermissionLogicalId,
    mutations,
    suppressions: extractCommentSuppressions(decl),
  };
}
