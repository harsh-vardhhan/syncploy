// ==========================================
// Syncploy Compiler Types & IR
// ==========================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface CorsConfig {
  allowOrigins?: string[];
  allowHeaders?: string[];
  allowMethods?: string[];
}

export interface ApiRouteIR {
  id: string;
  exportName: string;
  sourceFile: string;
  method: HttpMethod;
  path: string;
  auth?: boolean;
  timeout?: number; // in seconds
  memory?: number; // in MB
  concurrency?: number; // ReservedConcurrentExecutions
  cors?: CorsConfig | boolean;
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
}

export interface ResourceGraph {
  apis: ApiRouteIR[];
  tables: TableIR[];
  buckets: BucketIR[];
  queues: QueueIR[];
  consumers: QueueConsumerIR[];
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId or consumerId -> bundlePath
}
