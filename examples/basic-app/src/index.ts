import { api, Table, Bucket, Queue } from "@syncploy/sdk";

// Infrastructure Resources with full in-code configurations
export const ehrTable = new Table("ehr", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  pointInTimeRecovery: true,
  indexes: {
    SKIndex: { partitionKey: "SK", sortKey: "PK" },
    GSI1Index: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
  },
});

export const documentsBucket = new Bucket("documents", {
  versioned: true,
  eventBridge: true,
  publicAccessBlock: true,
});

export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
  },
});

// 1. API Gateway REST Endpoint (Unified Routing)
export const getDocument = api(
  {
    method: "GET",
    path: "/documents/:id",
    ingress: "api-gateway",
    timeout: "30s",
    memory: "256MB",
    concurrency: 2,
    cors: {
      allowOrigins: ["https://example.com"],
      allowHeaders: ["Content-Type", "Authorization"],
    },
  },
  async ({ id }: { id: string }) => {
    return { id, title: "Clinical Note", status: "READY" };
  }
);

// 2. Direct Lambda Function URL (for heavy LLM inference up to 15 minutes, $0 gateway cost)
export const analyzeClinicalDoc = api(
  {
    method: "POST",
    path: "/analyze",
    ingress: "function-url",
    timeout: "300s", // 5 minutes!
    memory: "1024MB",
  },
  async ({ docId }: { docId: string }) => {
    return { docId, analyzed: true, tokens: 1200 };
  }
);

// 3. Worker Consumer with batchSize, timeout & concurrency cap
export const processAnnotation = annotationQueue.consumer(
  {
    batchSize: 5,
    timeout: "120s",
    concurrency: 2, // Hard cap on parallel processing
  },
  async (event: any) => {
    console.log("Processing clinical document:", event);
  }
);
