import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";
import {
  S3_BUCKET_NAME_REGEX,
  IP_ADDRESS_REGEX,
  DDB_TABLE_NAME_REGEX,
  SQS_QUEUE_NAME_REGEX,
  FIREHOSE_STREAM_NAME_REGEX,
  CFN_LOGICAL_ID_REGEX,
} from "./common";

export function validateBuckets(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const b of graph.buckets) {
    if (b.bucketName && !b.bucketName.includes("${")) {
      const name = b.bucketName;
      if (name.length < 3 || name.length > 63) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must be between 3 and 63 characters long.`,
          b.sourceFile
        );
      } else if (/[A-Z]/.test(name)) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must be strictly lowercase (RFC 1123).`,
          b.sourceFile
        );
      } else if (name.includes("_")) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot contain underscores '_'. Use hyphens '-' instead.`,
          b.sourceFile
        );
      } else if (name.includes("..")) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot contain consecutive periods '..'.`,
          b.sourceFile
        );
      } else if (IP_ADDRESS_REGEX.test(name)) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot be formatted as an IP address.`,
          b.sourceFile
        );
      } else if (!S3_BUCKET_NAME_REGEX.test(name)) {
        ctx.addError(
          "ERR_S3_BUCKET_NAME",
          b.id,
          `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must start and end with a letter or number.`,
          b.sourceFile
        );
      }
    }

    if (b.objectLock && typeof b.objectLock === "object") {
      if (b.objectLock.days !== undefined && b.objectLock.years !== undefined) {
        ctx.addError(
          "ERR_S3_OBJECT_LOCK",
          b.id,
          `Bucket '${b.name}': S3 Object Lock retention cannot specify both 'days' and 'years' simultaneously.`,
          b.sourceFile
        );
      }
      if (b.objectLock.days !== undefined && (!Number.isInteger(b.objectLock.days) || b.objectLock.days < 1)) {
        ctx.addError(
          "ERR_S3_OBJECT_LOCK",
          b.id,
          `Bucket '${b.name}': Object Lock retention days must be an integer >= 1.`,
          b.sourceFile
        );
      }
      if (b.objectLock.years !== undefined && (!Number.isInteger(b.objectLock.years) || b.objectLock.years < 1)) {
        ctx.addError(
          "ERR_S3_OBJECT_LOCK",
          b.id,
          `Bucket '${b.name}': Object Lock retention years must be an integer >= 1.`,
          b.sourceFile
        );
      }
    }
  }
}

export function validateTables(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const t of graph.tables) {
    if (t.tableName && !t.tableName.includes("${")) {
      if (!DDB_TABLE_NAME_REGEX.test(t.tableName)) {
        ctx.addError(
          "ERR_DDB_TABLE_NAME",
          t.id,
          `Table '${t.name}' has invalid tableName '${t.tableName}'. Must be 3-255 characters matching [a-zA-Z0-9_.-].`,
          t.sourceFile
        );
      }
    }

    // Partition key vs Sort key collision
    if (t.sortKey && t.sortKey.name === t.partitionKey.name) {
      ctx.addError(
        "ERR_DDB_KEY_COLLISION",
        t.id,
        `Table '${t.name}': Sort key name '${t.sortKey.name}' cannot be identical to partition key name.`,
        t.sourceFile
      );
    }

    // GSIs
    if (t.indexes) {
      const gsiEntries = Object.entries(t.indexes);
      if (gsiEntries.length > 20) {
        ctx.addError(
          "ERR_DDB_GSI_LIMIT",
          t.id,
          `Table '${t.name}' defines ${gsiEntries.length} Global Secondary Indexes. DynamoDB allows a maximum of 20 GSIs per table.`,
          t.sourceFile
        );
      }

      for (const [idxName, idx] of gsiEntries) {
        if (idx.sortKey && idx.sortKey === idx.partitionKey) {
          ctx.addError(
            "ERR_DDB_GSI_COLLISION",
            t.id,
            `Table '${t.name}', Index '${idxName}': GSI sortKey cannot be identical to GSI partitionKey '${idx.partitionKey}'.`,
            t.sourceFile
          );
        }
      }
    }
  }
}

export function validateQueues(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const q of graph.queues) {
    const qName = q.queueName || q.name;
    const isFifo = q.fifo === true;

    if (!qName.includes("${")) {
      if (!SQS_QUEUE_NAME_REGEX.test(qName)) {
        ctx.addError(
          "ERR_SQS_QUEUE_NAME",
          q.id,
          `Queue '${q.name}' has invalid queueName '${qName}'. Must be 1-80 characters matching [a-zA-Z0-9_-].`,
          q.sourceFile
        );
      }

      // FIFO .fifo suffix enforcement
      if (isFifo && !qName.endsWith(".fifo")) {
        ctx.addError(
          "ERR_SQS_FIFO_NAME",
          q.id,
          `Queue '${q.name}' is configured as FIFO (fifo: true), but queueName '${qName}' does not end with the mandatory '.fifo' suffix.`,
          q.sourceFile
        );
      } else if (!isFifo && qName.endsWith(".fifo")) {
        ctx.addError(
          "ERR_SQS_FIFO_NAME",
          q.id,
          `Queue '${q.name}' ends with '.fifo', but is not configured as FIFO. Add 'fifo: true' to options.`,
          q.sourceFile
        );
      }
    }

    if (q.visibilityTimeout !== undefined) {
      if (!Number.isInteger(q.visibilityTimeout) || q.visibilityTimeout < 0 || q.visibilityTimeout > 43200) {
        ctx.addError(
          "ERR_SQS_VISIBILITY_TIMEOUT",
          q.id,
          `VisibilityTimeout ${q.visibilityTimeout}s for queue '${q.name}' is invalid. Must be an integer between 0 and 43,200 seconds (12 hours).`,
          q.sourceFile
        );
      }
    }

    if (q.deadLetterQueue) {
      const retries = q.deadLetterQueue.maxReceiveCount;
      if (!Number.isInteger(retries) || retries < 1 || retries > 1000) {
        ctx.addError(
          "ERR_SQS_DLQ_MAX_RECEIVE",
          q.id,
          `maxReceiveCount ${retries} for queue '${q.name}' DLQ is invalid. Must be an integer between 1 and 1,000.`,
          q.sourceFile
        );
      }

      if (q.deadLetterQueue.queueName && q.deadLetterQueue.queueName === qName) {
        ctx.addError(
          "ERR_SQS_DLQ_CYCLE",
          q.id,
          `Queue '${q.name}' cannot configure itself as its own Dead Letter Queue.`,
          q.sourceFile
        );
      }
    }
  }
}

export function validateTopics(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const t of graph.topics || []) {
    const isFifo = t.fifo === true;
    const tName = t.topicName || t.name;

    if (!tName.includes("${")) {
      if (isFifo && !tName.endsWith(".fifo")) {
        ctx.addError(
          "ERR_SNS_FIFO_NAME",
          t.id,
          `Topic '${t.name}' is configured as FIFO (fifo: true), but topicName '${tName}' does not end with the mandatory '.fifo' suffix.`,
          t.sourceFile
        );
      }
    }

    for (const sub of t.subscriptions || []) {
      if (sub.protocol === "email" || sub.protocol === "email-json") {
        if (!sub.endpoint.includes("${") && !sub.endpoint.includes("process.env")) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(sub.endpoint)) {
            ctx.addError(
              "ERR_SNS_EMAIL_ENDPOINT",
              t.id,
              `Topic '${t.name}': Subscription email endpoint '${sub.endpoint}' is not a valid email address.`,
              t.sourceFile
            );
          }
        }
      } else if (sub.protocol === "sqs") {
        const isArn = sub.endpoint.startsWith("arn:aws:sqs:") || sub.endpoint.includes("${");
        const matchesQueue = (graph.queues || []).some(
          (q) => q.name === sub.endpoint || q.id === sub.endpoint || q.logicalId === sub.endpoint
        );
        if (!isArn && !matchesQueue) {
          ctx.addError(
            "ERR_SNS_SQS_ENDPOINT",
            t.id,
            `Topic '${t.name}': Subscription SQS endpoint '${sub.endpoint}' must be a valid SQS ARN or match a Queue in the stack.`,
            t.sourceFile
          );
        }
      } else if (sub.protocol === "firehose") {
        const isArn = sub.endpoint.startsWith("arn:aws:firehose:") || sub.endpoint.includes("${");
        const matchesStream = (graph.deliveryStreams || []).some(
          (ds) => ds.name === sub.endpoint || ds.id === sub.endpoint || ds.logicalId === sub.endpoint
        );
        if (!isArn && !matchesStream) {
          ctx.addError(
            "ERR_SNS_FIREHOSE_ENDPOINT",
            t.id,
            `Topic '${t.name}': Subscription Firehose endpoint '${sub.endpoint}' must be a valid DeliveryStream ARN or match a DeliveryStream in the stack.`,
            t.sourceFile
          );
        }
      } else if (sub.protocol === "lambda") {
        const isArn = sub.endpoint.startsWith("arn:aws:lambda:") || sub.endpoint.includes("${");
        const allFunctions = [
          ...graph.apis,
          ...graph.consumers,
          ...(graph.tableStreams || []),
          ...(graph.topicSubscribers || []),
        ];
        const matchesFunc = allFunctions.some(
          (f: any) => f.id === sub.endpoint || f.name === sub.endpoint || (f as any).functionName === sub.endpoint
        );
        if (!isArn && !matchesFunc) {
          ctx.addError(
            "ERR_SNS_LAMBDA_ENDPOINT",
            t.id,
            `Topic '${t.name}': Subscription Lambda endpoint '${sub.endpoint}' must be a valid Lambda ARN or match a function in the stack.`,
            t.sourceFile
          );
        }
      }
    }
  }
}

export function validateDeliveryStreams(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const ds of graph.deliveryStreams || []) {
    if (ds.streamName && !ds.streamName.includes("${")) {
      if (!FIREHOSE_STREAM_NAME_REGEX.test(ds.streamName)) {
        ctx.addError(
          "ERR_FIREHOSE_STREAM_NAME",
          ds.id,
          `DeliveryStream '${ds.name}' has invalid streamName '${ds.streamName}'. Must be 1-64 characters matching [a-zA-Z0-9_.-].`,
          ds.sourceFile
        );
      }
    }

    if (ds.bufferingSize !== undefined) {
      if (ds.bufferingSize < 1 || ds.bufferingSize > 128) {
        ctx.addError(
          "ERR_FIREHOSE_BUFFER_SIZE",
          ds.id,
          `DeliveryStream '${ds.name}': bufferingSize '${ds.bufferingSize}MB' is invalid. Firehose requires buffer size between 1 MB and 128 MB.`,
          ds.sourceFile
        );
      }
    }

    if (ds.bufferingInterval !== undefined) {
      if (ds.bufferingInterval < 60 || ds.bufferingInterval > 900) {
        ctx.addError(
          "ERR_FIREHOSE_BUFFER_INTERVAL",
          ds.id,
          `DeliveryStream '${ds.name}': bufferingInterval '${ds.bufferingInterval}s' is invalid. Firehose requires buffer interval between 60 seconds and 900 seconds (15 minutes).`,
          ds.sourceFile
        );
      }
    }
  }
}

export function validateAlarms(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const a of graph.alarms || []) {
    if (a.evaluationPeriods !== undefined) {
      if (!Number.isInteger(a.evaluationPeriods) || a.evaluationPeriods < 1) {
        ctx.addError(
          "ERR_ALARM_EVALUATION_PERIODS",
          a.id,
          `Alarm '${a.name}': evaluationPeriods must be an integer >= 1.`,
          a.sourceFile
        );
      }
    }
  }
}

export function validateAuths(ctx: ValidationContext, graph: ResourceGraph): void {
  for (const auth of graph.auths) {
    if (auth.passwordPolicy?.minLength !== undefined) {
      if (auth.passwordPolicy.minLength < 6) {
        ctx.addError(
          "ERR_AUTH_PASSWORD_MIN_LENGTH",
          auth.id,
          `Auth '${auth.name}': passwordPolicy.minLength must be at least 6 characters (AWS Cognito minimum requirement).`,
          auth.sourceFile
        );
      } else if (auth.passwordPolicy.minLength < 12) {
        ctx.addWarning(
          "WARN_AUTH_PASSWORD_LENGTH_SHORT",
          auth.id,
          `Auth '${auth.name}': passwordPolicy.minLength (${auth.passwordPolicy.minLength}) is less than recommended 12 characters for Clean 4 / HIPAA healthcare security.`,
          auth.sourceFile
        );
      }
    }

    if (auth.client?.clientLogicalId) {
      if (!CFN_LOGICAL_ID_REGEX.test(auth.client.clientLogicalId)) {
        ctx.addError(
          "ERR_CFN_LOGICAL_ID",
          `${auth.id}_Client`,
          `Auth client logicalId '${auth.client.clientLogicalId}' is invalid. CloudFormation logical IDs must be alphanumeric only ([A-Za-z0-9]).`,
          auth.sourceFile
        );
      }
    }
  }
}
