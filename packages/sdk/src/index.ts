// ==========================================
// Syncploy SDK Core Primitives
// ==========================================

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  auth?: boolean;
}

export type ApiHandler<TReq = any, TRes = any> = (
  req: TReq
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
    options,
    handler,
  };
}

// Table (DynamoDB)
export interface TableOptions {
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  indexes?: Record<
    string,
    {
      partitionKey: string;
      sortKey?: string;
    }
  >;
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
export interface QueueOptions {
  visibilityTimeout?: string;
  deadLetterQueue?: {
    maxReceiveCount: number;
  };
}

export interface ConsumerOptions {
  batchSize?: number;
  timeout?: string;
}

export class Queue {
  readonly _kind = "queue" as const;
  constructor(public readonly name: string, public readonly options: QueueOptions = {}) {}

  async send(message: Record<string, any>): Promise<void> {
    // Runtime execution
  }

  consumer(
    options: ConsumerOptions,
    handler: (event: any) => Promise<void> | void
  ): (event: any) => Promise<void> | void {
    return handler;
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
