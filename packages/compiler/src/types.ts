// ==========================================
// Syncploy Compiler Types & IR
// ==========================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
export type IngressType = "api-gateway" | "function-url";

export interface CorsConfig {
  allowOrigins?: string[];
  allowHeaders?: string[];
  allowMethods?: string[];
}

export interface PolicyStatementIR {
  effect?: "Allow" | "Deny";
  actions: string[];
  resources: string[];
}

export interface ApiRouteIR {
  id: string;
  exportName: string;
  sourceFile: string;
  method: HttpMethod;
  path: string;
  auth?: boolean;
  ingress?: IngressType;
  timeout?: number; // in seconds
  memory?: number; // in MB
  concurrency?: number; // ReservedConcurrentExecutions
  cors?: CorsConfig | boolean;
  policies?: PolicyStatementIR[];
  environment?: Record<string, string>;
}

export interface TableIndexIR {
  partitionKey: string;
  sortKey?: string;
  projection?: "ALL" | "KEYS_ONLY";
}

export interface TableIR {
  id: string;
  name: string;
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
  stream?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
  pointInTimeRecovery?: boolean;
  indexes?: Record<string, TableIndexIR>;
  sourceFile: string;
}

export interface BucketIR {
  id: string;
  name: string;
  versioned?: boolean;
  eventBridge?: boolean;
  publicAccessBlock?: boolean;
  sourceFile: string;
}

export interface QueueIR {
  id: string;
  name: string;
  visibilityTimeout?: number; // in seconds
  deadLetterQueue?: {
    maxReceiveCount: number;
  };
  fifo?: boolean;
  sourceFile: string;
}

export interface QueueConsumerIR {
  id: string;
  queueName: string;
  exportName: string;
  sourceFile: string;
  batchSize?: number;
  timeout?: number;
  concurrency?: number;
  memory?: number;
  policies?: PolicyStatementIR[];
  environment?: Record<string, string>;
}

export interface TableStreamConsumerIR {
  id: string;
  tableName: string;
  exportName: string;
  sourceFile: string;
  batchSize?: number;
  startingPosition?: "LATEST" | "TRIM_HORIZON";
  enabled?: boolean;
  timeout?: number;
  concurrency?: number;
  memory?: number;
  policies?: PolicyStatementIR[];
  environment?: Record<string, string>;
}

export interface TopicIR {
  id: string;
  name: string;
  fifo?: boolean;
  sourceFile: string;
}

export interface TopicSubscriberIR {
  id: string;
  topicName: string;
  exportName: string;
  sourceFile: string;
  timeout?: number;
  concurrency?: number;
  memory?: number;
  policies?: PolicyStatementIR[];
  environment?: Record<string, string>;
}

export interface AlarmMetricQueryIR {
  id: string;
  expression?: string;
  label?: string;
  returnData?: boolean;
  metricStat?: {
    metric: {
      namespace: string;
      metricName: string;
      dimensions?: { name: string; value: string }[];
    };
    period: number;
    stat: string;
  };
}

export interface AlarmIR {
  id: string;
  name: string;
  description?: string;
  threshold: number;
  evaluationPeriods?: number;
  comparison?: string;
  metric?: {
    namespace?: string;
    metricName: string;
    dimensions?: Record<string, string>;
    period?: number;
    stat?: string;
  };
  metrics?: AlarmMetricQueryIR[];
  actions?: string[];
  sourceFile: string;
}

export interface EventBindingIR {
  id: string;
  sourceBucketName: string;
  event: "objectCreated" | "objectRemoved";
  targetQueueName: string;
  prefix?: string;
  suffix?: string;
}

export interface ResourceGraph {
  apis: ApiRouteIR[];
  tables: TableIR[];
  tableStreams: TableStreamConsumerIR[];
  buckets: BucketIR[];
  queues: QueueIR[];
  consumers: QueueConsumerIR[];
  topics: TopicIR[];
  topicSubscribers: TopicSubscriberIR[];
  alarms: AlarmIR[];
  bindings: EventBindingIR[];
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId or consumerId -> bundlePath
}
