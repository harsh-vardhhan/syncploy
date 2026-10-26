import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";
import { LAMBDA_FUNCTION_NAME_REGEX } from "./common";
import { validateCors, validatePolicies, validateEnvironmentSecrets } from "./security";

export function validateLambdaProperties(
  ctx: ValidationContext,
  id: string,
  func: {
    memory?: number | undefined;
    timeout?: number | undefined;
    concurrency?: number | undefined;
    functionName?: string | undefined;
  },
  sourceFile?: string
): void {
  if (func.memory !== undefined) {
    if (!Number.isInteger(func.memory) || func.memory < 128 || func.memory > 10240) {
      ctx.addError(
        "ERR_LAMBDA_MEMORY",
        id,
        `Memory '${func.memory}MB' for '${id}' is invalid. AWS Lambda memory must be a whole integer between 128 MB and 10,240 MB (10 GB) in 1 MB increments.`,
        sourceFile
      );
    }
  }

  if (func.timeout !== undefined) {
    if (!Number.isInteger(func.timeout) || func.timeout < 1 || func.timeout > 900) {
      ctx.addError(
        "ERR_LAMBDA_TIMEOUT",
        id,
        `Timeout '${func.timeout}s' for '${id}' is invalid. AWS Lambda timeout must be an integer between 1 second and 900 seconds (15 minutes).`,
        sourceFile
      );
    }
  }

  if (func.concurrency !== undefined) {
    if (!Number.isInteger(func.concurrency) || func.concurrency < 0) {
      ctx.addError(
        "ERR_LAMBDA_CONCURRENCY",
        id,
        `Concurrency '${func.concurrency}' for '${id}' is invalid. ReservedConcurrentExecutions must be an integer >= 0.`,
        sourceFile
      );
    }
  }

  if (func.functionName) {
    if (!func.functionName.includes("${") && !LAMBDA_FUNCTION_NAME_REGEX.test(func.functionName)) {
      ctx.addError(
        "ERR_LAMBDA_FUNCTION_NAME",
        id,
        `FunctionName '${func.functionName}' for '${id}' is invalid. Must be 1-64 characters matching [a-zA-Z0-9-_].`,
        sourceFile
      );
    }
  }
}

export function validateApis(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const api of graph.apis) {
    if (!api.path.startsWith("/")) {
      ctx.addError(
        "ERR_API_PATH",
        api.id,
        `API path '${api.path}' is invalid. HTTP route paths must start with a forward slash '/'.`,
        api.sourceFile
      );
    }

    validateLambdaProperties(ctx, api.id, api, api.sourceFile);
    validateCors(ctx, api.id, api.cors, api.sourceFile);
    validatePolicies(ctx, api.id, api.policies, api.sourceFile);
    validateEnvironmentSecrets(ctx, api.id, api.environment, api.sourceFile);
  }
}

export function validateConsumers(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const c of graph.consumers) {
    validateLambdaProperties(ctx, c.id, c, c.sourceFile);
    if (c.batchSize !== undefined) {
      if (!Number.isInteger(c.batchSize) || c.batchSize < 1 || c.batchSize > 10) {
        ctx.addError(
          "ERR_SQS_BATCH_SIZE",
          c.id,
          `Batch size ${c.batchSize} for consumer '${c.id}' is invalid. Standard SQS Lambda batchSize must be an integer between 1 and 10.`,
          c.sourceFile
        );
      }
    }
    validatePolicies(ctx, c.id, c.policies, c.sourceFile);
    validateEnvironmentSecrets(ctx, c.id, c.environment, c.sourceFile);
  }
}

export function validateTableStreams(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const s of graph.tableStreams) {
    validateLambdaProperties(ctx, s.id, s, s.sourceFile);
    if (s.batchSize !== undefined) {
      if (!Number.isInteger(s.batchSize) || s.batchSize < 1 || s.batchSize > 10000) {
        ctx.addError(
          "ERR_STREAM_BATCH_SIZE",
          s.id,
          `Batch size ${s.batchSize} for DynamoDB stream '${s.id}' is invalid. Must be an integer between 1 and 10,000.`,
          s.sourceFile
        );
      }
    }
    validatePolicies(ctx, s.id, s.policies, s.sourceFile);
    validateEnvironmentSecrets(ctx, s.id, s.environment, s.sourceFile);
  }
}

export function validateTopicSubscribers(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const s of graph.topicSubscribers) {
    validateLambdaProperties(ctx, s.id, s, s.sourceFile);
    validatePolicies(ctx, s.id, s.policies, s.sourceFile);
    validateEnvironmentSecrets(ctx, s.id, s.environment, s.sourceFile);
  }
}
