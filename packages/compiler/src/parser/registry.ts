import type { SourceFile, VariableDeclaration } from "ts-morph";
import type { ParseContext } from "./types";
import type { ResourceGraphBuilder } from "./builder";
import { extractApiRoute } from "./extractors/api";
import {
  extractQueueConsumer,
  extractTableStream,
  extractTopicSubscriber,
} from "./extractors/consumers";
import { extractTable } from "./extractors/constructs/table";
import { extractBucket } from "./extractors/constructs/bucket";
import { extractQueue } from "./extractors/constructs/queue";
import { extractTopic } from "./extractors/constructs/topic";
import { extractAlarm } from "./extractors/constructs/alarm";
import { extractDeliveryStream } from "./extractors/constructs/delivery-stream";
import { extractAuth } from "./extractors/constructs/auth";
import { extractBudget } from "./extractors/constructs/budget";

export type ConstructExtractor = (
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext,
  builder: ResourceGraphBuilder
) => boolean;

export const CALL_EXTRACTORS: ConstructExtractor[] = [
  (decl, sourceFile, context, builder) => {
    const route = extractApiRoute(decl, sourceFile, context);
    if (route) {
      builder.apis.push(route);
      return true;
    }
    return false;
  },
  (decl, sourceFile, context, builder) => {
    const consumer = extractQueueConsumer(decl, sourceFile, context);
    if (consumer) {
      builder.consumers.push(consumer);
      return true;
    }
    return false;
  },
  (decl, sourceFile, context, builder) => {
    const stream = extractTableStream(decl, sourceFile, context);
    if (stream) {
      builder.tableStreams.push(stream);
      return true;
    }
    return false;
  },
  (decl, sourceFile, context, builder) => {
    const subscriber = extractTopicSubscriber(decl, sourceFile, context);
    if (subscriber) {
      builder.topicSubscribers.push(subscriber);
      return true;
    }
    return false;
  },
];

export const NEW_CONSTRUCT_EXTRACTORS: Record<string, ConstructExtractor> = {
  Table: (decl, sourceFile, context, builder) => {
    const res = extractTable(decl, sourceFile);
    if (res) {
      builder.tables.push(res.table);
      context.varToTableName[decl.getName()] = res.tableName;
      return true;
    }
    return false;
  },
  Bucket: (decl, sourceFile, context, builder) => {
    const res = extractBucket(decl, sourceFile);
    if (res) {
      builder.buckets.push(res.bucket);
      context.varToBucketName[decl.getName()] = res.bucketName;
      return true;
    }
    return false;
  },
  Queue: (decl, sourceFile, context, builder) => {
    const res = extractQueue(decl, sourceFile);
    if (res) {
      builder.queues.push(res.queue);
      context.varToQueueName[decl.getName()] = res.queueName;
      return true;
    }
    return false;
  },
  Topic: (decl, sourceFile, context, builder) => {
    const res = extractTopic(decl, sourceFile, context);
    if (res) {
      builder.topics.push(res.topic);
      context.varToTopicName[decl.getName()] = res.topicName;
      return true;
    }
    return false;
  },
  Alarm: (decl, sourceFile, context, builder) => {
    const alarm = extractAlarm(decl, sourceFile, context);
    if (alarm) {
      builder.alarms.push(alarm);
      return true;
    }
    return false;
  },
  DeliveryStream: (decl, sourceFile, context, builder) => {
    const res = extractDeliveryStream(decl, sourceFile, context);
    if (res) {
      builder.deliveryStreams.push(res.deliveryStream);
      context.varToDeliveryStreamName[decl.getName()] = res.streamName;
      return true;
    }
    return false;
  },
  Auth: (decl, sourceFile, context, builder) => {
    const res = extractAuth(decl, sourceFile);
    if (res) {
      builder.auths.push(res.auth);
      context.varToAuthName[decl.getName()] = res.authName;
      return true;
    }
    return false;
  },
  Budget: (decl, sourceFile, context, builder) => {
    const budget = extractBudget(decl, sourceFile, context);
    if (budget) {
      builder.budgets.push(budget);
      return true;
    }
    return false;
  },
};
