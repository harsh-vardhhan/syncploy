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

export interface ContainerIR {
  dockerfile?: string | undefined;
  context?: string | undefined;
  imageUri?: string | undefined;
  cmd?: string[] | undefined;
  entrypoint?: string[] | undefined;
  workingDirectory?: string | undefined;
}

export interface ApiRouteIR {
  id: string;
  exportName: string;
  sourceFile: string;
  method: HttpMethod;
  path: string;
  auth?: boolean | undefined;
  ingress?: IngressType | undefined;
  timeout?: number | undefined; // in seconds
  memory?: number | undefined; // in MB
  concurrency?: number | undefined; // ReservedConcurrentExecutions
  cors?: CorsConfig | boolean | undefined;
  policies?: PolicyStatementIR[] | undefined;
  environment?: Record<string, string> | undefined;
  container?: ContainerIR | undefined;
}

export interface TableIndexIR {
  partitionKey: string;
  sortKey?: string | undefined;
  projection?: "ALL" | "KEYS_ONLY" | undefined;
}

export interface TableIR {
  id: string;
  name: string;
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" } | undefined;
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED" | undefined;
  stream?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY" | undefined;
  pointInTimeRecovery?: boolean | undefined;
  indexes?: Record<string, TableIndexIR> | undefined;
  sourceFile: string;
}

export interface BucketIR {
  id: string;
  name: string;
  versioned?: boolean | undefined;
  eventBridge?: boolean | undefined;
  publicAccessBlock?: boolean | undefined;
  accountScoped?: boolean | undefined;
  objectLock?:
    | boolean
    | {
        mode?: "COMPLIANCE" | "GOVERNANCE" | undefined;
        days?: number | undefined;
        years?: number | undefined;
      }
    | undefined;
  sourceFile: string;
}

export interface QueueIR {
  id: string;
  name: string;
  visibilityTimeout?: number | undefined; // in seconds
  deadLetterQueue?: {
    maxReceiveCount: number;
  } | undefined;
  fifo?: boolean | undefined;
  sourceFile: string;
}

export interface QueueConsumerIR {
  id: string;
  queueName: string;
  exportName: string;
  sourceFile: string;
  batchSize?: number | undefined;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  memory?: number | undefined;
  policies?: PolicyStatementIR[] | undefined;
  environment?: Record<string, string> | undefined;
  container?: ContainerIR | undefined;
}

export interface TableStreamConsumerIR {
  id: string;
  tableName: string;
  exportName: string;
  sourceFile: string;
  batchSize?: number | undefined;
  startingPosition?: "LATEST" | "TRIM_HORIZON" | undefined;
  enabled?: boolean | undefined;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  memory?: number | undefined;
  policies?: PolicyStatementIR[] | undefined;
  environment?: Record<string, string> | undefined;
  container?: ContainerIR | undefined;
}

export interface TopicIR {
  id: string;
  name: string;
  fifo?: boolean | undefined;
  subscriptions?: { protocol: string; endpoint: string }[] | undefined;
  sourceFile: string;
}

export interface TopicSubscriberIR {
  id: string;
  topicName: string;
  exportName: string;
  sourceFile: string;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  memory?: number | undefined;
  policies?: PolicyStatementIR[] | undefined;
  environment?: Record<string, string> | undefined;
  container?: ContainerIR | undefined;
}

export interface AlarmMetricQueryIR {
  id: string;
  expression?: string | undefined;
  label?: string | undefined;
  returnData?: boolean | undefined;
  metricStat?: {
    metric: {
      namespace?: string | undefined;
      metricName: string;
      dimensions?: Record<string, string> | { name: string; value: string }[] | undefined;
    };
    period?: number | undefined;
    stat?: string | undefined;
  } | undefined;
}

export interface AlarmIR {
  id: string;
  name: string;
  description?: string | undefined;
  threshold: number;
  evaluationPeriods?: number | undefined;
  comparison?: string | undefined;
  treatMissingData?: string | undefined;
  metric?: {
    namespace?: string | undefined;
    metricName: string;
    dimensions?: Record<string, string> | undefined;
    period?: number | undefined;
    stat?: string | undefined;
  } | undefined;
  metrics?: AlarmMetricQueryIR[] | undefined;
  actions?: string[] | undefined;
  sourceFile: string;
}

export interface EventBindingIR {
  id: string;
  sourceBucketName: string;
  event: "objectCreated" | "objectRemoved";
  targetQueueName: string;
  prefix?: string | undefined;
  suffix?: string | undefined;
}

export interface DeliveryStreamIR {
  id: string;
  name: string;
  destinationBucketName: string;
  prefix?: string | undefined;
  errorPrefix?: string | undefined;
  bufferingInterval?: number | undefined; // in seconds
  bufferingSize?: number | undefined; // in MB
  compression?: "GZIP" | "ZIP" | "SNAPPY" | "UNCOMPRESSED" | undefined;
  sourceFile: string;
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
  deliveryStreams: DeliveryStreamIR[];
  bindings: EventBindingIR[];
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId or consumerId -> bundlePath
}
