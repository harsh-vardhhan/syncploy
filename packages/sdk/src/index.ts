// ==========================================
// Syncploy SDK Core Primitives
// ==========================================

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const notFound = (message = "Not Found") => new HttpError(404, message);
export const badRequest = (message = "Bad Request") => new HttpError(400, message);
export const unauthorized = (message = "Unauthorized") => new HttpError(401, message);
export const forbidden = (message = "Forbidden") => new HttpError(403, message);
export const internalError = (message = "Internal Server Error") => new HttpError(500, message);

export interface RequestContext {
  headers: Record<string, string | undefined>;
  pathParameters: Record<string, string | undefined>;
  queryStringParameters: Record<string, string | undefined>;
  rawEvent?: unknown;
}

export type Duration = `${number}s` | `${number}m` | `${number}h` | number;
export type MemorySize = `${number}MB` | `${number}GB` | number;

export interface CorsOptions {
  allowOrigins?: string[];
  allowHeaders?: string[];
  allowMethods?: string[];
  maxAge?: Duration;
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  auth?: boolean;
  timeout?: Duration;
  memory?: MemorySize;
  concurrency?: number;
  cors?: CorsOptions | boolean;
}

export type ApiHandler<TReq = any, TRes = any> = (
  req: TReq,
  ctx: RequestContext
) => Promise<TRes> | TRes;

export interface ApiEndpoint<TReq = any, TRes = any> {
  readonly _kind: "api";
  readonly options: ApiOptions;
  readonly handler: ApiHandler<TReq, TRes>;
}

export function api<TReq = any, TRes = any>(
  options: ApiOptions,
  handler: ApiHandler<TReq, TRes>
): ApiEndpoint<TReq, TRes> {
  return {
    _kind: "api",
    options: {
      method: options.method ?? "POST",
      path: options.path,
      auth: options.auth,
      timeout: options.timeout,
      memory: options.memory,
      concurrency: options.concurrency,
      cors: options.cors,
    },
    handler,
  };
}

// Table (DynamoDB)
export interface TableIndexDefinition {
  partitionKey: string;
  sortKey?: string;
  projection?: "ALL" | "KEYS_ONLY";
}

export interface TableOptions {
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
  stream?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
  pointInTimeRecovery?: boolean;
  indexes?: Record<string, TableIndexDefinition>;
}

export class Table {
  readonly _kind = "table" as const;
  constructor(public readonly name: string, public readonly options: TableOptions) {}

  async get<T = any>(key: Record<string, any>): Promise<T | null> {
    // Runtime execution connects to DynamoDB (or DynamoDB local)
    return null;
  }

  async put(item: Record<string, any>): Promise<void> {
    // Runtime execution
  }

  async query<T = any>(params: Record<string, any>): Promise<T[]> {
    // Runtime execution
    return [];
  }
}

// Bucket (S3)
export interface BucketOptions {
  versioned?: boolean;
  public?: boolean;
  eventBridge?: boolean;
  publicAccessBlock?: boolean;
}

export class Bucket {
  readonly _kind = "bucket" as const;
  constructor(public readonly name: string, public readonly options: BucketOptions = {}) {}

  async getText(key: string): Promise<string> {
    return "";
  }

  async putText(key: string, content: string): Promise<void> {
    // Runtime execution
  }

  on(
    event: "objectCreated" | "objectRemoved",
    target: Queue,
    options?: { prefix?: string; suffix?: string }
  ): void {
    // Compile-time event binding marker
  }
}

// Queue (SQS)
export interface DeadLetterQueueOptions {
  maxReceiveCount: number;
}

export interface QueueOptions {
  visibilityTimeout?: Duration;
  deadLetterQueue?: DeadLetterQueueOptions;
  fifo?: boolean;
}

export interface ConsumerOptions {
  batchSize?: number;
  timeout?: Duration;
  concurrency?: number;
  memory?: MemorySize;
}

export interface QueueConsumer<T = any> {
  readonly _kind: "queue_consumer";
  readonly queue: Queue;
  readonly options: ConsumerOptions;
  readonly handler: (event: T) => Promise<void> | void;
}

export class Queue {
  readonly _kind = "queue" as const;
  constructor(public readonly name: string, public readonly options: QueueOptions = {}) {}

  async send(message: Record<string, any>): Promise<void> {
    // Runtime execution
  }

  consumer<T = any>(
    options: ConsumerOptions,
    handler: (event: T) => Promise<void> | void
  ): QueueConsumer<T> {
    return {
      _kind: "queue_consumer",
      queue: this,
      options,
      handler,
    };
  }
}

// Secret (AWS Secrets Manager / SSM)
export class Secret {
  readonly _kind = "secret" as const;
  constructor(public readonly name: string) {}

  get(): string {
    return process.env[this.name] || "";
  }
}
