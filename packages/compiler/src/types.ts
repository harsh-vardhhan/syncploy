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

export interface BucketMutationIR {
  name: string;
  prefix?: string | undefined;
}

export interface FunctionMutationsIR {
  tablesWritten?: string[] | undefined;
  tablesScanned?: string[] | undefined;
  bucketsWritten?: (string | BucketMutationIR)[] | undefined;
  queuesSent?: string[] | undefined;
  topicsPublished?: string[] | undefined;
  deliveryStreamsWritten?: string[] | undefined;
  httpInvoked?: string[] | undefined;
}

export interface ApiRouteIR {
  id: string;
  exportName: string;
  sourceFile: string;
  line?: number | undefined;
  column?: number | undefined;
  method: HttpMethod;
  path: string;
  auth?: boolean | undefined;
  ingress?: IngressType | undefined;
  timeout?: number | undefined; // in seconds
  memory?: number | undefined; // in MB
  concurrency?: number | undefined; // ReservedConcurrentExecutions
  logRetentionInDays?: number | undefined;
  throttle?: { rateLimit?: number | undefined; burstLimit?: number | undefined } | undefined;
  detailedMetrics?: boolean | undefined;
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
  suppressions?: Record<string, string> | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
  logicalId?: string | undefined;
  tableName?: string | undefined;
  retain?: boolean | undefined;
  deletionPolicy?: "Retain" | "Delete" | "Snapshot" | undefined;
  electroEntities?: string[] | undefined;
  suppressions?: Record<string, string> | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
  logicalId?: string | undefined;
  bucketName?: string | undefined;
  retain?: boolean | undefined;
  deletionPolicy?: "Retain" | "Delete" | "Snapshot" | undefined;
  suppressions?: Record<string, string> | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
  logicalId?: string | undefined;
  queueName?: string | undefined;
  suppressions?: Record<string, string> | undefined;
}

export interface QueueConsumerIR {
  id: string;
  queueName: string;
  exportName: string;
  sourceFile: string;
  line?: number | undefined;
  column?: number | undefined;
  batchSize?: number | undefined;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  memory?: number | undefined;
  logRetentionInDays?: number | undefined;
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
  suppressions?: Record<string, string> | undefined;
}

export interface TableStreamConsumerIR {
  id: string;
  tableName: string;
  exportName: string;
  sourceFile: string;
  line?: number | undefined;
  column?: number | undefined;
  batchSize?: number | undefined;
  startingPosition?: "LATEST" | "TRIM_HORIZON" | undefined;
  enabled?: boolean | undefined;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  retryAttempts?: number | undefined;
  bisectOnFunctionError?: boolean | undefined;
  onFailureQueueName?: string | undefined;
  memory?: number | undefined;
  logRetentionInDays?: number | undefined;
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
  suppressions?: Record<string, string> | undefined;
}

export interface TopicIR {
  id: string;
  name: string;
  fifo?: boolean | undefined;
  subscriptions?: { protocol: string; endpoint: string }[] | undefined;
  sourceFile: string;
  line?: number | undefined;
  column?: number | undefined;
  logicalId?: string | undefined;
  topicName?: string | undefined;
}

export interface TopicSubscriberIR {
  id: string;
  topicName: string;
  exportName: string;
  sourceFile: string;
  line?: number | undefined;
  column?: number | undefined;
  timeout?: number | undefined;
  concurrency?: number | undefined;
  memory?: number | undefined;
  logRetentionInDays?: number | undefined;
  policies?: PolicyStatementIR[] | undefined;
  environment?: Record<string, string> | undefined;
  container?: ContainerIR | undefined;
  logicalId?: string | undefined;
  functionName?: string | undefined;
  subscriptionLogicalId?: string | undefined;
  permissionLogicalId?: string | undefined;
  roleLogicalId?: string | undefined;
  mutations?: FunctionMutationsIR | undefined;
  suppressions?: Record<string, string> | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
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
  sourceFile?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
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
  line?: number | undefined;
  column?: number | undefined;
  primaryIndex: ElectroIndexIR;
  secondaryIndexes: Record<string, ElectroIndexIR>;
  attributes: Record<string, string>; // name -> type
  tableName?: string | undefined;
}

export interface BudgetIR {
  id: string;
  amount?: number | undefined;
  unit?: string | undefined;
  unitRaw?: string | undefined;
  threshold?: number | undefined;
  thresholdRaw?: string | undefined;
  logicalId?: string | undefined;
  budgetName?: string | undefined;
  budgetNameRaw?: string | undefined;
  filterByStack?: boolean | undefined;
  filterByStackRaw?: string | undefined;
  topicName?: string | undefined;
  sourceFile?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  suppressions?: Record<string, string> | undefined;
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
  auths: AuthIR[];
  electroEntities: ElectroEntityIR[];
  budgets: BudgetIR[];
  budget?: BudgetIR | undefined;
}

export function getBudgets(graph: ResourceGraph): BudgetIR[] {
  return graph.budgets.length > 0 ? graph.budgets : (graph.budget ? [graph.budget] : []);
}

export function normalizeResourceGraph(graph: Partial<ResourceGraph>): ResourceGraph {
  const budgets = graph.budgets ?? (graph.budget ? [graph.budget] : []);
  return {
    apis: graph.apis ?? [],
    tables: graph.tables ?? [],
    tableStreams: graph.tableStreams ?? [],
    buckets: graph.buckets ?? [],
    queues: graph.queues ?? [],
    consumers: graph.consumers ?? [],
    topics: graph.topics ?? [],
    topicSubscribers: graph.topicSubscribers ?? [],
    alarms: graph.alarms ?? [],
    deliveryStreams: graph.deliveryStreams ?? [],
    bindings: graph.bindings ?? [],
    auths: graph.auths ?? [],
    electroEntities: graph.electroEntities ?? [],
    budgets,
    budget: graph.budget ?? budgets[0],
  };
}

export interface CloudFormationStats {
  resourceCount: number;
  outputCount: number;
  templateSizeBytes: number;
  templateSizeKB: number;
}

export interface BundleStats {
  sizeBytes: number;
  sizeMB: number;
  warning?: string | undefined;
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId or consumerId -> bundlePath
  bundleStats?: Record<string, BundleStats> | undefined;
  cfnStats?: CloudFormationStats | undefined;
}

export interface BuildOptions {
  strict?: boolean | undefined;
  failOnDow?: boolean | undefined;
  minify?: boolean | undefined;
}
