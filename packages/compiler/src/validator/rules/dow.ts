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

      if (api.throttle !== undefined) {
        ctx.addWarning(
          "WARN_FUNCTION_URL_THROTTLE_UNSUPPORTED",
          api.id,
          `Function URL '${api.id}' (${api.method} ${api.path}) has 'throttle' configured, but AWS Lambda Function URLs do not support API Gateway HTTP stage throttling. Use 'concurrency: <number>' to cap execution concurrency, or switch to 'ingress: "api-gateway"'.`,
          api.sourceFile
        );
      }
    } else {
      // API Gateway route concurrency guard
      if (api.concurrency === undefined) {
        ctx.addWarning(
          "WARN_DOW_UNRESERVED_CONCURRENCY",
          api.id,
          `API Gateway route '${api.id}' (${api.method} ${api.path}) has no Lambda 'concurrency' cap. While stage throttling caps request rate, unreserved Lambda concurrency can scale to account limits during traffic surges. Consider configuring 'concurrency: <number>'.`,
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

  // E. Budget Safety Rails (Static Amount, Threshold, Unit, Notifications, and Cost Allocation Tags)
  const budgetList = graph.budgets || (graph.budget ? [graph.budget] : []);
  const seenBudgetIds = new Set<string>();
  const seenBudgetNames = new Set<string>();

  for (const b of budgetList) {
    if (seenBudgetIds.has(b.id)) {
      ctx.addError(
        "ERR_DUPLICATE_BUDGET_ID",
        b.id,
        `Duplicate budget ID '${b.id}' declared. Each Budget must have a unique identifier.`,
        b.sourceFile
      );
    }
    seenBudgetIds.add(b.id);

    if (b.budgetNameInvalid) {
      ctx.addError(
        "ERR_BUDGET_INVALID_NAME",
        b.id,
        `Budget '${b.id}' has invalid 'budgetName'. Must be a static string literal.`,
        b.sourceFile
      );
    } else if (b.budgetName) {
      if (seenBudgetNames.has(b.budgetName)) {
        ctx.addError(
          "ERR_DUPLICATE_BUDGET_NAME",
          b.id,
          `Duplicate budgetName '${b.budgetName}' declared on Budget '${b.id}'. AWS Budgets names are account-global and must be unique.`,
          b.sourceFile
        );
      }
      seenBudgetNames.add(b.budgetName);
    }

    if (b.amount === undefined || isNaN(b.amount) || b.amount <= 0) {
      ctx.addError(
        "ERR_BUDGET_INVALID_AMOUNT",
        b.id,
        `Budget '${b.id}' must declare a static positive 'amount' in options (e.g. amount: 100). Dynamic or missing budget limits cannot be synthesized into CloudFormation.`,
        b.sourceFile
      );
    }

    if (b.thresholdInvalid || b.threshold === undefined || isNaN(b.threshold) || b.threshold <= 0 || b.threshold > 1000) {
      ctx.addError(
        "ERR_BUDGET_INVALID_THRESHOLD",
        b.id,
        `Budget '${b.id}' has invalid 'threshold'. Must be a static positive number literal (e.g. threshold: 80).`,
        b.sourceFile
      );
    }

    if (b.unitInvalid || (b.unit && !/^[A-Z]{3}$/.test(b.unit))) {
      ctx.addError(
        "ERR_BUDGET_INVALID_UNIT",
        b.id,
        `Budget '${b.id}' has invalid 'unit'. AWS Budgets requires a 3-letter uppercase ISO currency code (e.g. 'USD', 'EUR', 'GBP'), but received '${b.unit}'.`,
        b.sourceFile
      );
    }

    if (b.filterByStackInvalid) {
      ctx.addError(
        "ERR_BUDGET_INVALID_FILTER",
        b.id,
        `Budget '${b.id}' has invalid 'filterByStack'. Must be a boolean literal (true | false). Dynamic expressions are not supported.`,
        b.sourceFile
      );
    }

    if (b.topicName) {
      const explicitTopicMatches = (graph.topics || []).some(
        (t) => t.name === b.topicName || t.id === b.topicName
      );
      if (!explicitTopicMatches) {
        ctx.addError(
          "ERR_BUDGET_UNRESOLVED_TOPIC",
          b.id,
          `Budget '${b.id}' configured notification topic '${b.topicName}', but no matching Topic exists in the stack. Check the topic identifier or declare 'new Topic("${b.topicName}", ...)'.`,
          b.sourceFile
        );
      }
    } else {
      const hasFallbackTopic = (graph.topics || []).some(
        (t) =>
          t.name.toLowerCase().includes("alert") ||
          t.name.toLowerCase().includes("kill") ||
          t.name.toLowerCase().includes("alarm")
      );

      if (!hasFallbackTopic) {
        ctx.addWarning(
          "WARN_DOW_BUDGET_NO_NOTIFICATION",
          b.id,
          `Budget '${b.id}' has no notification topic configured. An unnotified budget cannot alert anyone on budget overruns. Configure 'topic: myAlertTopic'.`,
          b.sourceFile
        );
      }
    }

    if (b.filterByStack) {
      ctx.addWarning(
        "WARN_DOW_BUDGET_TAG_ACTIVATION",
        b.id,
        `Budget '${b.id}' uses 'filterByStack: true'. Note that user-defined Cost Allocation Tags for 'StackName' must be activated in the AWS Billing & Cost Management console for tag-scoped filters to report spend. Without activation, cost filters will report $0. (Set filterByStack to false or omit it for account-wide spend tracking).`,
        b.sourceFile
      );
    }
  }
}
