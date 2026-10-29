import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";

export function validateDenialOfWallet(ctx: ValidationContext, graph: ResourceGraph): void {
  // A. SQS Queue Visibility Timeout vs Consumer Timeout & DLQ (Evaluating Effective Defaults)
  for (const q of graph.queues) {
    const activeConsumers = graph.consumers.filter((c) => c.queueName === q.name);

    if (activeConsumers.length > 0 && !q.deadLetterQueue) {
      ctx.addWarning(
        "WARN_DOW_MISSING_DLQ",
        q.id,
        `Queue '${q.name}' has active consumer(s) (${activeConsumers.map((c) => `'${c.id}'`).join(", ")}) but no 'deadLetterQueue' configured. Unhandled errors or poison pill messages will retry continuously for up to 14 days, draining your AWS budget. Configure 'deadLetterQueue: { maxReceiveCount: 3 }'.`,
        q.sourceFile
      );
    }

    // Resolve effective defaults: AWS SQS defaults to 30s; Lambda consumers default to 30s
    const effectiveQueueVisibility = q.visibilityTimeout ?? 30;

    for (const c of activeConsumers) {
      const effectiveConsumerTimeout = c.timeout ?? 30;

      if (effectiveQueueVisibility < effectiveConsumerTimeout) {
        ctx.addError(
          "ERR_SQS_TIMEOUT_MISMATCH",
          c.id,
          `Queue '${q.name}' effective visibilityTimeout (${effectiveQueueVisibility}s${q.visibilityTimeout === undefined ? " (default)" : ""}) is shorter than consumer '${c.id}' effective timeout (${effectiveConsumerTimeout}s${c.timeout === undefined ? " (default)" : ""}). SQS will redeliver in-flight messages before handler completes, causing cascading duplicate executions and runaway costs. Set queue visibilityTimeout to at least ${effectiveConsumerTimeout}s (recommended: ${effectiveConsumerTimeout * 6}s).`,
          c.sourceFile
        );
      } else if (effectiveQueueVisibility < effectiveConsumerTimeout * 6) {
        ctx.addWarning(
          "WARN_SQS_VISIBILITY_TIMEOUT_SHORT",
          c.id,
          `Queue '${q.name}' effective visibilityTimeout (${effectiveQueueVisibility}s${q.visibilityTimeout === undefined ? " (default)" : ""}) is less than 6x consumer '${c.id}' effective timeout (${effectiveConsumerTimeout}s${c.timeout === undefined ? " (default)" : ""}). AWS recommends queue visibilityTimeout be at least 6x consumer timeout to prevent duplicate executions under processing delays.`,
          c.sourceFile
        );
      }
    }
  }

  // B. Public Routes & Function URLs Concurrency Guards
  for (const api of graph.apis) {
    if (api.ingress === "function-url") {
      // Warn if user assumes auth: true on Function URL protects against unauthenticated traffic
      if (api.auth === true) {
        ctx.addWarning(
          "WARN_FUNCTION_URL_AUTH_UNSUPPORTED",
          api.id,
          `Function URL '${api.id}' has 'auth: true', but AWS Lambda Function URLs only support IAM authentication (AuthType: NONE synthesized). Without an API Gateway or custom middleware, this endpoint remains unauthenticated.`,
          api.sourceFile
        );
      }

      // Concurrency limit is required regardless of auth flag because Function URLs synthesize AuthType: NONE
      if (api.concurrency === undefined) {
        ctx.addWarning(
          "WARN_DOW_UNRESERVED_CONCURRENCY",
          api.id,
          `Public Function URL '${api.id}' (${api.method} ${api.path}) has no 'concurrency' limit. Under a DDoS attack or traffic surge, Lambda will scale to account limits (1,000+ executions) causing severe Denial-of-Wallet. Consider configuring 'concurrency: <number>'.`,
          api.sourceFile
        );
      }
    } else {
      // API Gateway route concurrency guard
      if (api.concurrency === undefined) {
        ctx.addWarning(
          "WARN_DOW_UNRESERVED_CONCURRENCY",
          api.id,
          `API Gateway route '${api.id}' (${api.method} ${api.path}) has no 'concurrency' limit. Under a DDoS attack or traffic surge, Lambda will scale to account limits (1,000+ executions) causing severe Denial-of-Wallet. Consider configuring 'concurrency: <number>'.`,
          api.sourceFile
        );
      }
    }

    if (
      api.concurrency === undefined &&
      api.cors &&
      typeof api.cors === "object" &&
      Array.isArray(api.cors.allowOrigins) &&
      api.cors.allowOrigins.includes("*") &&
      ((api.memory !== undefined && api.memory >= 512) || (api.timeout !== undefined && api.timeout >= 30))
    ) {
      ctx.addWarning(
        "WARN_DOW_PUBLIC_API_BURST",
        api.id,
        `Public endpoint '${api.id}' (${api.method} ${api.path}) with allowOrigins: ['*'] has high resource allocation (${api.memory || 128}MB, ${api.timeout || 30}s) and no 'concurrency' cap. Consider adding 'concurrency: <number>' to guard against DDoS cost amplification.`,
        api.sourceFile
      );
    }
  }

  // C. DynamoDB Stream Unbounded Concurrency & Retries
  for (const s of graph.tableStreams) {
    if (s.concurrency === undefined) {
      ctx.addWarning(
        "WARN_DOW_STREAM_UNBOUNDED",
        s.id,
        `DynamoDB stream consumer '${s.id}' for table '${s.tableName}' has no 'concurrency' cap. Heavy table write bursts can split shards and spawn uncontrolled parallel Lambda instances. Consider configuring 'concurrency: <number>'.`,
        s.sourceFile
      );
    }

    if (s.enabled !== false && s.retryAttempts === -1) {
      ctx.addWarning(
        "WARN_DOW_STREAM_RETRY_UNLIMITED",
        s.id,
        `Active DynamoDB stream consumer '${s.id}' for table '${s.tableName}' explicitly configured 'retryAttempts: -1' (unlimited). Poison-pill records will retry continuously for up to 24 hours until stream expiration, draining execution concurrency. Consider configuring 'retryAttempts: 3'.`,
        s.sourceFile
      );
    }

    if (s.enabled !== false && !s.onFailureQueueName) {
      ctx.addWarning(
        "WARN_DOW_STREAM_MISSING_DLQ",
        s.id,
        `Active DynamoDB stream consumer '${s.id}' for table '${s.tableName}' has no 'onFailure' DLQ destination configured. Discarded poison-pill records after ${s.retryAttempts ?? 3} retries will be permanently lost. Consider configuring 'onFailure: "myDlqQueue"'.`,
        s.sourceFile
      );
    }
  }

  // D. Stack-Level Concurrency Budget Check (Default AWS Account Limit: 1,000)
  let totalReservedConcurrency = 0;
  for (const api of graph.apis) {
    if (api.concurrency !== undefined) totalReservedConcurrency += api.concurrency;
  }
  for (const c of graph.consumers) {
    if (c.concurrency !== undefined) totalReservedConcurrency += c.concurrency;
  }
  for (const s of graph.tableStreams) {
    if (s.concurrency !== undefined) totalReservedConcurrency += s.concurrency;
  }
  for (const sub of graph.topicSubscribers) {
    if (sub.concurrency !== undefined) totalReservedConcurrency += sub.concurrency;
  }

  if (totalReservedConcurrency > 900) {
    ctx.addWarning(
      "WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED",
      "Stack",
      `Total reserved concurrency across all functions is ${totalReservedConcurrency}, exceeding the AWS default unreserved concurrency budget (900 of 1,000). CloudFormation deployments will fail unless you have requested an account Service Quota increase for Lambda concurrent executions.`
    );
  }
}
