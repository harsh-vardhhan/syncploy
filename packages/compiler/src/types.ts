// ==========================================
// Syncploy Compiler Types & IR
// ==========================================

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export interface ApiRouteIR {
  id: string; // e.g., "getUser"
  exportName: string;
  sourceFile: string;
  method: HttpMethod;
  path: string; // e.g. "/users/:id"
  auth?: boolean;
}

export interface TableIR {
  id: string;
  name: string;
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  sourceFile: string;
}

export interface BucketIR {
  id: string;
  name: string;
  sourceFile: string;
}

export interface QueueIR {
  id: string;
  name: string;
  sourceFile: string;
}

export interface ResourceGraph {
  apis: ApiRouteIR[];
  tables: TableIR[];
  buckets: BucketIR[];
  queues: QueueIR[];
}

export interface BuildOutput {
  distDir: string;
  templatePath: string;
  lambdaBundles: Record<string, string>; // apiId -> bundlePath
}
