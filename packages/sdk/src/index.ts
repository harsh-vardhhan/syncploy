// ==========================================
// Syncploy SDK Core Primitives
// ==========================================

export * from "./table";
export * from "./bucket";
export * from "./queue";
export * from "./topic";
export * from "./alarm";
export * from "./delivery-stream";

export class HttpError extends Error {
  readonly statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
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
  rawPath?: string;
  rawQueryString?: string;
  method?: string;
  request: Request;
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

export type IngressType = "api-gateway" | "function-url";

export interface PolicyStatement {
  effect?: "Allow" | "Deny";
  actions: string[];
  resources: string[];
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";
  path: string;
  auth?: boolean;
  ingress?: IngressType;
  timeout?: Duration;
  memory?: MemorySize;
  concurrency?: number;
  cors?: CorsOptions | boolean;
  policies?: PolicyStatement[];
  environment?: Record<string, string>;
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
      ...options,
      method: options.method ?? "POST",
      ingress: options.ingress ?? "api-gateway",
    },
    handler,
  };
}

// Secret (AWS Secrets Manager / SSM)
export class Secret {
  readonly _kind = "secret" as const;
  readonly name: string;
  constructor(name: string) {
    this.name = name;
  }

  get(): string {
    return process.env[this.name] || "";
  }
}
