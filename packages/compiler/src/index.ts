// ==========================================
// Syncploy Compiler Core Pipeline
// ==========================================

export interface ResourceGraph {
  apis: Array<{
    name: string;
    path: string;
    method: string;
    sourceFile: string;
  }>;
  tables: Array<{
    name: string;
    partitionKey: string;
    sortKey?: string;
  }>;
  buckets: Array<{
    name: string;
  }>;
  queues: Array<{
    name: string;
  }>;
  bindings: Array<{
    from: string;
    to: string;
    permissions: string[];
  }>;
}

export class Compiler {
  constructor(public readonly projectRoot: string) {}

  async parse(): Promise<ResourceGraph> {
    // 1. Initialize ts-morph project
    // 2. Scan for api(), new Table(), new Bucket(), new Queue()
    // 3. Extract AST usages for IAM inference
    return {
      apis: [],
      tables: [],
      buckets: [],
      queues: [],
      bindings: [],
    };
  }

  async build(graph: ResourceGraph): Promise<void> {
    // 1. Bundle Lambda entrypoints via esbuild
    // 2. Synthesize AWS CloudFormation template
  }
}
