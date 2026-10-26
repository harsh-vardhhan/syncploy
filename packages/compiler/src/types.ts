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

export interface FunctionMutationsIR {
  tablesWritten?: string[] | undefined;
  bucketsWritten?: string[] | undefined;
  queuesSent?: string[] | undefined;
  topicsPublished?: string[] | undefined;
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
  logicalId?: string | undefined;
  functionName?: string | undefined;
  roleLogicalId?: string | undefined;
  permissionLogicalId?: string | undefined;
  invokePermissionLogicalId?: string | undefined;
  mutations?: FunctionMutationsIR | undefined;
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
  logicalId?: string | undefined;
  tableName?: string | undefined;
  retain?: boolean | undefined;
  deletionPolicy?: "Retain" | "Delete" | "Snapshot" | undefined;
  electroEntities?: string[] | undefined;
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
  logicalId?: string | undefined;
  bucketName?: string | undefined;
  retain?: boolean | undefined;
  deletionPolicy?: "Retain" | "Delete" | "Snapshot" | undefined;
}

export interface QueueIR {
  id: string;
  name: string;
  visibilityTimeout?: number | undefined; // in seconds
  deadLetterQueue?: {
    maxReceiveCount: number;
    logicalId?: string | undefined;
    queueName?: string | undefined;
  } | undefined;
  fifo?: boolean | undefined;
  sourceFile: string;
  logicalId?: string | undefined;
  queueName?: string | undefined;
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
  logicalId?: string | undefined;
  functionName?: string | undefined;
  eventSourceMappingLogicalId?: string | undefined;
  roleLogicalId?: string | undefined;
  permissionLogicalId?: string | undefined;
  invokePermissionLogicalId?: string | undefined;
  mutations?: FunctionMutationsIR | undefined;
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
  logicalId?: string | undefined;
  functionName?: string | undefined;
  eventSourceMappingLogicalId?: string | undefined;
  roleLogicalId?: string | undefined;
  permissionLogicalId?: string | undefined;
  invokePermissionLogicalId?: string | undefined;
  mutations?: FunctionMutationsIR | undefined;
}

export interface TopicIR {
  id: string;
  name: string;
  fifo?: boolean | undefined;
  subscriptions?: { protocol: string; endpoint: string }[] | undefined;
  sourceFile: string;
  logicalId?: string | undefined;
  topicName?: string | undefined;
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
  logicalId?: string | undefined;
  functionName?: string | undefined;
  subscriptionLogicalId?: string | undefined;
  permissionLogicalId?: string | undefined;
  roleLogicalId?: string | undefined;
  mutations?: FunctionMutationsIR | undefined;
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
  logicalId?: string | undefined;
  alarmName?: string | undefined;
}

export interface EventBindingIR {
  id: string;
  sourceBucketName: string;
  event: "objectCreated" | "objectRemoved";
  targetQueueName: string;
  prefix?: string | undefined;
  suffix?: string | undefined;
  ruleLogicalId?: string | undefined;
  queuePolicyLogicalId?: string | undefined;
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
  logicalId?: string | undefined;
  streamName?: string | undefined;
  roleLogicalId?: string | undefined;
}

export interface AuthPasswordPolicyIR {
  minLength?: number | undefined;
  requireUppercase?: boolean | undefined;
  requireLowercase?: boolean | undefined;
  requireNumbers?: boolean | undefined;
  requireSymbols?: boolean | undefined;
  tempPasswordValidityDays?: number | undefined;
}

export interface AuthClientIR {
  generateSecret?: boolean | undefined;
  explicitAuthFlows?: string[] | undefined;
  preventUserExistenceErrors?: boolean | undefined;
  clientLogicalId?: string | undefined;
  clientName?: string | undefined;
}

export interface AuthIR {
  id: string;
  name: string;
  signInMethod?: "email" | "phone" | "username" | undefined;
  autoVerify?: ("email" | "phone")[] | undefined;
  adminOnly?: boolean | undefined;
  passwordPolicy?: AuthPasswordPolicyIR | undefined;
  client?: AuthClientIR | undefined;
  sourceFile: string;
  logicalId?: string | undefined;
  userPoolName?: string | undefined;
}

export interface ElectroIndexIR {
  name: string; // e.g. "SKIndex", "primary"
  pkField: string; // e.g. "PK"
  skField?: string | undefined; // e.g. "SK"
  isPrimary: boolean;
  projection?: "ALL" | "KEYS_ONLY" | undefined;
}

export interface ElectroEntityIR {
  id: string; // variable name, e.g. "DocumentEntity"
  entityName: string; // model.entity, e.g. "document"
  serviceName: string; // model.service, e.g. "ehr"
  version?: string | undefined;
  sourceFile: string;
  primaryIndex: ElectroIndexIR;
  secondaryIndexes: Record<string, ElectroIndexIR>;
  attributes: Record<string, string>; // name -> type
  tableName?: string | undefined;
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
  auths?: AuthIR[] | undefined;
  electroEntities?: ElectroEntityIR[] | undefined;
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId or consumerId -> bundlePath
}
