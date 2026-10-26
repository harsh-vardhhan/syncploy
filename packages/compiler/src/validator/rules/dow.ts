import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";

export function validateDenialOfWallet(ctx: ValidationContext, graph: ResourceGraph): void {
  // A. SQS Queue Visibility Timeout vs Consumer Timeout & DLQ
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

    for (const c of activeConsumers) {
      if (q.visibilityTimeout !== undefined && c.timeout !== undefined) {
        if (q.visibilityTimeout < c.timeout) {
          ctx.addError(
            "ERR_SQS_TIMEOUT_MISMATCH",
            c.id,
            `Queue '${q.name}' visibilityTimeout (${q.visibilityTimeout}s) is shorter than consumer '${c.id}' timeout (${c.timeout}s). SQS will redeliver in-flight messages before handler completes, causing cascading duplicate executions and runaway costs. Set queue visibilityTimeout to at least ${c.timeout}s (recommended: ${c.timeout * 6}s).`,
            c.sourceFile
          );
        } else if (q.visibilityTimeout < c.timeout * 2) {
          ctx.addWarning(
            "WARN_SQS_VISIBILITY_TIMEOUT_SHORT",
            c.id,
            `Queue '${q.name}' visibilityTimeout (${q.visibilityTimeout}s) is close to consumer '${c.id}' timeout (${c.timeout}s). AWS recommends queue visibilityTimeout be at least 6x consumer timeout to prevent duplicate executions under processing delays.`,
            c.sourceFile
          );
        }
      }
    }
  }

  // B. Public Routes & Function URLs Concurrency Guards
  for (const api of graph.apis) {
    if (api.ingress === "function-url" && api.auth !== true && api.concurrency === undefined) {
      ctx.addWarning(
        "WARN_DOW_UNRESERVED_CONCURRENCY",
        api.id,
        `Public Function URL '${api.id}' (${api.method} ${api.path}) has no 'concurrency' limit. Under a DDoS attack or traffic surge, Lambda will scale to account limits (1,000+ executions) causing severe Denial-of-Wallet. Consider configuring 'concurrency: <number>'.`,
        api.sourceFile
      );
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

  // C. DynamoDB Stream Unbounded Concurrency
  for (const s of graph.tableStreams) {
    if (s.concurrency === undefined) {
      ctx.addWarning(
        "WARN_DOW_STREAM_UNBOUNDED",
        s.id,
        `DynamoDB stream consumer '${s.id}' for table '${s.tableName}' has no 'concurrency' cap. Heavy table write bursts can split shards and spawn uncontrolled parallel Lambda instances. Consider configuring 'concurrency: <number>'.`,
        s.sourceFile
      );
    }
  }
}
