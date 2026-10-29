import { describe, expect, it } from "bun:test";
import { GraphValidator } from "../src/validator";
import type { ResourceGraph } from "../src/types";

function createEmptyGraph(): ResourceGraph {
  return {
    apis: [],
    consumers: [],
    tableStreams: [],
    topicSubscribers: [],
    buckets: [],
    tables: [],
    queues: [],
    topics: [],
    deliveryStreams: [],
    alarms: [],
    bindings: [],
  };
}

describe("@syncploy/compiler - Pre-Flight AWS Platform Validator", () => {
  it("validates CloudFormation logical IDs and flags non-alphanumeric characters", () => {
    const graph = createEmptyGraph();
    graph.tables.push({
      id: "myTable",
      name: "my-table",
      partitionKey: { name: "PK", type: "string" },
      sourceFile: "src/infra.ts",
      logicalId: "ehr-table-invalid", // Has hyphens!
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_CFN_LOGICAL_ID")).toBe(true);
  });

  it("validates Lambda memory boundaries (128 MB to 10,240 MB) and integer constraints", () => {
    const graph = createEmptyGraph();
    graph.apis.push({
      id: "apiTooSmall",
      exportName: "apiTooSmall",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      memory: 64, // Under 128 MB!
    });
    graph.apis.push({
      id: "apiTooLarge",
      exportName: "apiTooLarge",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      memory: 20000, // Over 10240 MB!
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    const memErrors = result.errors.filter((e) => e.code === "ERR_LAMBDA_MEMORY");
    expect(memErrors).toHaveLength(2);
  });

  it("validates Lambda timeout boundaries (1s to 900s)", () => {
    const graph = createEmptyGraph();
    graph.apis.push({
      id: "apiTooLong",
      exportName: "apiTooLong",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      timeout: 1200, // Over 15 minutes!
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_LAMBDA_TIMEOUT")).toBe(true);
  });

  it("validates S3 bucket naming rules (lowercase, no underscores, 3-63 chars)", () => {
    const graph = createEmptyGraph();
    graph.buckets.push({
      id: "badBucketUpper",
      name: "badBucketUpper",
      bucketName: "MyUpperCaseBucket",
      sourceFile: "src/infra.ts",
    });
    graph.buckets.push({
      id: "badBucketUnderscore",
      name: "badBucketUnderscore",
      bucketName: "my_underscore_bucket",
      sourceFile: "src/infra.ts",
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    const bucketErrors = result.errors.filter((e) => e.code === "ERR_S3_BUCKET_NAME");
    expect(bucketErrors).toHaveLength(2);
  });

  it("enforces FIFO naming rule (.fifo suffix required on SQS and SNS)", () => {
    const graph = createEmptyGraph();
    graph.queues.push({
      id: "fifoQueue",
      name: "orders",
      queueName: "orders-queue", // FIFO but missing .fifo!
      fifo: true,
      sourceFile: "src/infra.ts",
    });

    graph.topics = [
      {
        id: "fifoTopic",
        name: "events",
        topicName: "events-topic", // FIFO but missing .fifo!
        fifo: true,
        sourceFile: "src/infra.ts",
      },
    ];

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_SQS_FIFO_NAME")).toBe(true);
    expect(result.errors.some((e) => e.code === "ERR_SNS_FIFO_NAME")).toBe(true);
  });

  it("validates SQS visibility timeout (0s to 43,200s)", () => {
    const graph = createEmptyGraph();
    graph.queues.push({
      id: "badQueue",
      name: "bad-queue",
      visibilityTimeout: 50000, // Exceeds 12 hours!
      sourceFile: "src/infra.ts",
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_SQS_VISIBILITY_TIMEOUT")).toBe(true);
  });

  it("catches DynamoDB partitionKey and sortKey attribute name collisions", () => {
    const graph = createEmptyGraph();
    graph.tables.push({
      id: "collidingTable",
      name: "colliding-table",
      partitionKey: { name: "PK", type: "string" },
      sortKey: { name: "PK", type: "string" }, // Identical to PK!
      sourceFile: "src/infra.ts",
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_DDB_KEY_COLLISION")).toBe(true);
  });

  it("validates Kinesis Firehose buffering intervals (60s to 900s)", () => {
    const graph = createEmptyGraph();
    graph.deliveryStreams = [
      {
        id: "streamTooFast",
        name: "fast-stream",
        destinationBucketName: "audit-bucket",
        bufferingInterval: 30, // Firehose minimum is 60s!
        sourceFile: "src/infra.ts",
      },
    ];

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_FIREHOSE_BUFFER_INTERVAL")).toBe(true);
  });

  it("catches invalid CORS origins missing protocol", () => {
    const graph = createEmptyGraph();
    graph.apis.push({
      id: "apiBadCors",
      exportName: "apiBadCors",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      cors: {
        allowOrigins: ["localhost:3000"], // Missing http://!
      },
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_CORS_ORIGIN_PROTOCOL")).toBe(true);
  });

  it("validates IAM action syntax and warns on overly permissive wildcards", () => {
    const graph = createEmptyGraph();
    graph.apis.push({
      id: "apiPermissive",
      exportName: "apiPermissive",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      policies: [
        {
          effect: "Allow",
          actions: ["s3GetObjectInvalidFormat"], // Missing colon!
          resources: ["*"],
        },
        {
          effect: "Allow",
          actions: ["*"], // Wildcard action
          resources: ["*"], // Wildcard resource
        },
      ],
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_IAM_ACTION_FORMAT")).toBe(true);
    expect(result.warnings.some((w) => w.code === "WARN_IAM_LEAST_PRIVILEGE")).toBe(true);
  });

  it("scans environment variables and flags literal secrets", () => {
    const graph = createEmptyGraph();
    graph.apis.push({
      id: "apiSecretLeaked",
      exportName: "apiSecretLeaked",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/test",
      environment: {
        OPENAI_API_KEY: "sk-proj-abc12345678901234567890",
        AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE",
      },
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.warnings.some((w) => w.code === "WARN_SECRET_LEAK")).toBe(true);
  });

  it("passes completely valid infrastructure with zero errors", () => {
    const graph = createEmptyGraph();
    graph.tables.push({
      id: "ehrTable",
      name: "ehr",
      logicalId: "EhrTable",
      partitionKey: { name: "PK", type: "string" },
      sortKey: { name: "SK", type: "string" },
      sourceFile: "src/infra.ts",
    });
    graph.buckets.push({
      id: "documentsBucket",
      name: "documents",
      logicalId: "DocumentsBucket",
      bucketName: "my-valid-documents-bucket",
      sourceFile: "src/infra.ts",
    });
    graph.queues.push({
      id: "ordersQueue",
      name: "orders",
      logicalId: "OrdersQueue",
      queueName: "orders-queue.fifo",
      fifo: true,
      visibilityTimeout: 180,
      sourceFile: "src/infra.ts",
    });
    graph.apis.push({
      id: "apiValid",
      exportName: "apiValid",
      sourceFile: "src/api.ts",
      method: "GET",
      path: "/documents",
      memory: 256,
      timeout: 30,
      cors: {
        allowOrigins: ["http://localhost:3000", "https://app.example.com"],
      },
      policies: [
        {
          actions: ["s3:GetObject"],
          resources: ["arn:aws:s3:::my-valid-documents-bucket/*"],
        },
      ],
    });

    const validator = new GraphValidator();
    const result = validator.validate(graph);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  describe("Infrastructure Recursion & Event Cycle Detection", () => {
    it("detects direct DynamoDB Stream recursion (Table -> Stream Consumer -> Table.put)", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "ehrTable",
        name: "ehr",
        partitionKey: { name: "PK", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.tableStreams.push({
        id: "streamWorker",
        tableName: "ehr",
        exportName: "streamWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          tablesWritten: ["ehr"], // Writes back to the table that triggers it!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("Table 'ehr'");
      expect(loopErr?.message).toContain("Stream Consumer 'streamWorker'");
    });

    it("detects direct SQS Queue recursion (Queue -> Consumer -> Queue.send)", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "jobsQueue",
        name: "jobs",
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "jobWorker",
        queueName: "jobs",
        exportName: "jobWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          queuesSent: ["jobs"], // Produces back to the same queue!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("Queue 'jobs'");
      expect(loopErr?.message).toContain("Queue Consumer 'jobWorker'");
    });

    it("detects multi-hop event cycle (Bucket -> Queue -> Consumer -> Bucket.upload)", () => {
      const graph = createEmptyGraph();
      graph.buckets.push({
        id: "docsBucket",
        name: "docs",
        sourceFile: "src/infra.ts",
      });
      graph.queues.push({
        id: "procQueue",
        name: "proc",
        sourceFile: "src/infra.ts",
      });
      graph.bindings.push({
        id: "docs_proc_objectCreated",
        sourceBucketName: "docs",
        event: "objectCreated",
        targetQueueName: "proc",
      });
      graph.consumers.push({
        id: "docWorker",
        queueName: "proc",
        exportName: "docWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          bucketsWritten: ["docs"], // Consumer uploads back to the source bucket!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("Bucket 'docs'");
      expect(loopErr?.message).toContain("Queue 'proc'");
      expect(loopErr?.message).toContain("Queue Consumer 'docWorker'");
    });

    it("detects cross-service multi-hop cycle (Queue A -> Worker A -> Topic B -> Sub B -> Queue A)", () => {
      const graph = createEmptyGraph();
      graph.queues.push({ id: "qA", name: "queueA", sourceFile: "src/infra.ts" });
      graph.topics.push({ id: "tB", name: "topicB", sourceFile: "src/infra.ts" });

      graph.consumers.push({
        id: "workerA",
        queueName: "queueA",
        exportName: "workerA",
        sourceFile: "src/infra.ts",
        mutations: { topicsPublished: ["topicB"] },
      });

      graph.topicSubscribers.push({
        id: "subB",
        topicName: "topicB",
        exportName: "subB",
        sourceFile: "src/infra.ts",
        mutations: { queuesSent: ["queueA"] },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("Queue 'queueA'");
      expect(loopErr?.message).toContain("Topic 'topicB'");
    });

    it("allows non-cyclic forward pipelines (Table A -> Stream Worker -> Table B)", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "tableA",
        name: "sourceTable",
        partitionKey: { name: "PK", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.tables.push({
        id: "tableB",
        name: "analyticsTable",
        partitionKey: { name: "PK", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.tableStreams.push({
        id: "pipelineWorker",
        tableName: "sourceTable",
        exportName: "pipelineWorker",
        sourceFile: "src/infra.ts",
        concurrency: 5,
        mutations: {
          tablesWritten: ["analyticsTable"], // Writes to a different table!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("Denial of Wallet (DoW) & DDoS Safety Rails", () => {
    it("flags SQS visibilityTimeout shorter than consumer timeout as fatal error", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "ordersQueue",
        name: "orders",
        visibilityTimeout: 30, // 30s
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "orderWorker",
        queueName: "orders",
        exportName: "orderWorker",
        timeout: 60, // 60s > 30s!
        sourceFile: "src/infra.ts",
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const mismatchErr = result.errors.find((e) => e.code === "ERR_SQS_TIMEOUT_MISMATCH");
      expect(mismatchErr).toBeDefined();
      expect(mismatchErr?.message).toContain("is shorter than consumer 'orderWorker' effective timeout");
    });

    it("warns when an active queue has no deadLetterQueue configured", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "notifsQueue",
        name: "notifications",
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "notifWorker",
        queueName: "notifications",
        exportName: "notifWorker",
        sourceFile: "src/infra.ts",
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_MISSING_DLQ")).toBe(true);
    });

    it("does not warn about missing DLQ if queue has deadLetterQueue configured", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "safeQueue",
        name: "safe-queue",
        deadLetterQueue: { maxReceiveCount: 3 },
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "safeWorker",
        queueName: "safe-queue",
        exportName: "safeWorker",
        sourceFile: "src/infra.ts",
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_MISSING_DLQ")).toBe(false);
    });

    it("warns when public Function URL has no concurrency limit", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "publicLlm",
        exportName: "publicLlm",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/generate",
        ingress: "function-url",
        auth: false,
        timeout: 300,
        memory: 1024,
        // concurrency: undefined
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(true);
    });

    it("does not warn when public Function URL has explicit concurrency cap", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "cappedLlm",
        exportName: "cappedLlm",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/generate",
        ingress: "function-url",
        auth: false,
        concurrency: 20, // Capped!
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(false);
    });

    it("warns when DynamoDB stream consumer has unbounded concurrency", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "t1",
        name: "records",
        partitionKey: { name: "PK", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.tableStreams.push({
        id: "unboundedStream",
        tableName: "records",
        exportName: "unboundedStream",
        sourceFile: "src/infra.ts",
        // concurrency: undefined
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_STREAM_UNBOUNDED")).toBe(true);
    });

    it("elevates warnings to fatal errors when strict mode is enabled", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "uncappedApi",
        exportName: "uncappedApi",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/upload",
        ingress: "function-url",
        auth: false,
      });

      const strictValidator = new GraphValidator({ strict: true });
      const result = strictValidator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_DOW_UNRESERVED_CONCURRENCY")).toBe(true);
      expect(result.errors[0]?.message).toContain("[Strict Mode]");
    });

    it("evaluates effective defaults when queue visibilityTimeout is omitted", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "ordersQueue",
        name: "orders",
        sourceFile: "src/infra.ts",
        // visibilityTimeout omitted -> AWS default 30s
      });
      graph.consumers.push({
        id: "orderWorker",
        queueName: "orders",
        exportName: "orderWorker",
        timeout: 60, // 60s > 30s default!
        sourceFile: "src/infra.ts",
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const err = result.errors.find((e) => e.code === "ERR_SQS_TIMEOUT_MISMATCH");
      expect(err).toBeDefined();
      expect(err?.message).toContain("30s (default)");
    });

    it("warns about unreserved concurrency even if Function URL has auth: true (eliminating false-negative bypass)", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "authFunctionUrl",
        exportName: "authFunctionUrl",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/secure",
        ingress: "function-url",
        auth: true, // auth: true should NOT silence DoW unreserved concurrency warning!
        // concurrency: undefined
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(true);
      expect(result.warnings.some((w) => w.code === "WARN_FUNCTION_URL_AUTH_UNSUPPORTED")).toBe(true);
    });

    it("warns when total stack reserved concurrency exceeds AWS default budget (900)", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "api1",
        exportName: "api1",
        sourceFile: "src/api.ts",
        method: "GET",
        path: "/1",
        concurrency: 500,
      });
      graph.apis.push({
        id: "api2",
        exportName: "api2",
        sourceFile: "src/api.ts",
        method: "GET",
        path: "/2",
        concurrency: 450,
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED")).toBe(true);
    });

    it("suppresses warnings or errors when construct has matching suppression comment", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "suppressedApi",
        exportName: "suppressedApi",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/uncapped",
        ingress: "function-url",
        // concurrency: undefined
        suppressions: {
          WARN_DOW_UNRESERVED_CONCURRENCY: "Internal admin tool only",
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(false);
    });

    it("elevates DoW warnings to fatal errors when failOnDow is enabled", () => {
      const graph = createEmptyGraph();
      graph.queues.push({
        id: "q1",
        name: "test-q",
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "c1",
        queueName: "test-q",
        exportName: "c1",
        sourceFile: "src/infra.ts",
      });

      const dowValidator = new GraphValidator({ failOnDow: true });
      const result = dowValidator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_DOW_MISSING_DLQ")).toBe(true);
      expect(result.errors[0]?.message).toContain("[DoW Protection]");
    });

    it("elevates WARN_FUNCTION_URL_AUTH_UNSUPPORTED to fatal error when failOnDow is enabled", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "insecureUrl",
        exportName: "insecureUrl",
        sourceFile: "src/infra.ts",
        method: "POST",
        path: "/webhook",
        ingress: "function-url",
        auth: true,
      });

      const dowValidator = new GraphValidator({ failOnDow: true });
      const result = dowValidator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_FUNCTION_URL_AUTH_UNSUPPORTED")).toBe(true);
      expect(result.errors.some((e) => e.message.includes("[DoW Protection]"))).toBe(true);
    });

    it("warns when API Gateway route has unreserved concurrency", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "publicApi",
        exportName: "publicApi",
        sourceFile: "src/infra.ts",
        method: "GET",
        path: "/items",
        ingress: "api-gateway",
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(true);
      expect(result.warnings[0]?.message).toContain("API Gateway route");
    });

    it("warns when active DynamoDB stream consumer explicitly configures retryAttempts: -1 (unlimited) or lacks DLQ", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "t1",
        name: "events",
        partitionKey: { name: "id", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.tableStreams.push({
        id: "eventWorker",
        tableName: "events",
        exportName: "eventWorker",
        sourceFile: "src/infra.ts",
        enabled: true,
        retryAttempts: -1,
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_STREAM_RETRY_UNLIMITED")).toBe(true);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_STREAM_MISSING_DLQ")).toBe(true);
    });

    it("allows suppressing stack-level concurrency warnings via construct comment", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "bigApi1",
        exportName: "bigApi1",
        sourceFile: "src/api.ts",
        method: "GET",
        path: "/1",
        concurrency: 500,
        suppressions: {
          WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED: "Requested account quota increase to 5,000",
        },
      });
      graph.apis.push({
        id: "bigApi2",
        exportName: "bigApi2",
        sourceFile: "src/api.ts",
        method: "GET",
        path: "/2",
        concurrency: 450,
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED")).toBe(false);
      expect(result.suppressions?.some((s) => s.code === "WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED")).toBe(true);
    });

    it("records audit trail of suppressed diagnostics with reasons", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "suppressedEndpoint",
        exportName: "suppressedEndpoint",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/admin",
        ingress: "function-url",
        suppressions: {
          WARN_DOW_UNRESERVED_CONCURRENCY: "Private VPN only",
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_UNRESERVED_CONCURRENCY")).toBe(false);
      expect(result.suppressions).toBeDefined();
      expect(result.suppressions?.length).toBe(1);
      expect(result.suppressions?.[0]?.code).toBe("WARN_DOW_UNRESERVED_CONCURRENCY");
      expect(result.suppressions?.[0]?.reason).toBe("Private VPN only");
    });
  });

  describe("S3 Prefix-Aware Recursion Discrimination", () => {
    it("allows non-overlapping S3 prefixes in same bucket (raw/ -> Queue -> processed/)", () => {
      const graph = createEmptyGraph();
      graph.buckets.push({
        id: "b1",
        name: "med-docs",
        sourceFile: "src/infra.ts",
      });
      graph.queues.push({
        id: "q1",
        name: "med-proc-queue",
        sourceFile: "src/infra.ts",
      });
      graph.bindings.push({
        id: "med_docs_binding",
        sourceBucketName: "med-docs",
        event: "objectCreated",
        targetQueueName: "med-proc-queue",
        prefix: "raw/", // Only triggers on raw/
      });
      graph.consumers.push({
        id: "medWorker",
        queueName: "med-proc-queue",
        exportName: "medWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          bucketsWritten: [{ name: "med-docs", prefix: "processed/" }], // Writes to disjoint prefix processed/
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(true);
      expect(result.errors.some((e) => e.code === "ERR_RECURSIVE_LOOP")).toBe(false);
    });

    it("detects recursive loop when worker writes back to the same prefix", () => {
      const graph = createEmptyGraph();
      graph.buckets.push({
        id: "b1",
        name: "med-docs",
        sourceFile: "src/infra.ts",
      });
      graph.queues.push({
        id: "q1",
        name: "med-proc-queue",
        sourceFile: "src/infra.ts",
      });
      graph.bindings.push({
        id: "med_docs_binding",
        sourceBucketName: "med-docs",
        event: "objectCreated",
        targetQueueName: "med-proc-queue",
        prefix: "raw/",
      });
      graph.consumers.push({
        id: "medWorker",
        queueName: "med-proc-queue",
        exportName: "medWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          bucketsWritten: [{ name: "med-docs", prefix: "raw/" }], // Writes back to trigger prefix!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("med-docs");
    });

    it("detects SNS -> SQS -> Lambda -> SNS recursion loop", () => {
      const graph = createEmptyGraph();
      graph.topics.push({
        id: "alertTopic",
        name: "alerts",
        sourceFile: "src/infra.ts",
        subscriptions: [{ protocol: "sqs", endpoint: "alertQueue" }],
      });
      graph.queues.push({
        id: "alertQueue",
        name: "alertQueue",
        sourceFile: "src/infra.ts",
      });
      graph.consumers.push({
        id: "alertWorker",
        queueName: "alertQueue",
        exportName: "alertWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          topicsPublished: ["alerts"], // Worker on queue publishes back to the topic!
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErr = result.errors.find((e) => e.code === "ERR_RECURSIVE_LOOP");
      expect(loopErr).toBeDefined();
      expect(loopErr?.message).toContain("Topic 'alerts'");
      expect(loopErr?.message).toContain("Queue 'alertQueue'");
    });

    it("detects HTTP self-invocation cycle as advisory warning or DoW error", () => {
      const graph = createEmptyGraph();
      graph.apis.push({
        id: "reentrantApi",
        exportName: "reentrantApi",
        sourceFile: "src/infra.ts",
        method: "POST",
        path: "/process",
        ingress: "api-gateway",
        concurrency: 5,
        mutations: {
          httpInvoked: ["reentrantApi"], // Handler invokes its own API endpoint
        },
      });

      const validator = new GraphValidator();
      const advisoryResult = validator.validate(graph);
      expect(advisoryResult.valid).toBe(true);
      const warn = advisoryResult.warnings.find((w) => w.code === "WARN_HTTP_RECURSIVE_LOOP");
      expect(warn).toBeDefined();
      expect(warn?.message).toContain("Potential HTTP self-invocation detected: API route 'reentrantApi'");

      const strictValidator = new GraphValidator({ failOnDow: true });
      const strictResult = strictValidator.validate(graph);
      expect(strictResult.valid).toBe(false);
      const err = strictResult.errors.find((e) => e.code === "ERR_HTTP_RECURSIVE_LOOP");
      expect(err).toBeDefined();
      expect(err?.message).toContain("API route 'reentrantApi'");
    });

    it("enumerates all distinct cycles when cycles share a node", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "sharedTable",
        name: "shared-table",
        partitionKey: { name: "id", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.queues.push({
        id: "queueA",
        name: "queue-a",
        sourceFile: "src/infra.ts",
      });
      graph.queues.push({
        id: "queueB",
        name: "queue-b",
        sourceFile: "src/infra.ts",
      });

      // Consumer A: Queue A -> writes to Queue A (Cycle 1)
      graph.consumers.push({
        id: "workerA",
        queueName: "queue-a",
        exportName: "workerA",
        sourceFile: "src/infra.ts",
        mutations: {
          queuesSent: ["queue-a"],
          tablesWritten: ["shared-table"],
        },
      });

      // Stream Consumer: Shared Table -> writes to Queue B
      graph.tableStreams.push({
        id: "streamWorker",
        tableName: "shared-table",
        exportName: "streamWorker",
        sourceFile: "src/infra.ts",
        mutations: {
          queuesSent: ["queue-b"],
        },
      });

      // Consumer B: Queue B -> writes back to Shared Table (Cycle 2)
      graph.consumers.push({
        id: "workerB",
        queueName: "queue-b",
        exportName: "workerB",
        sourceFile: "src/infra.ts",
        mutations: {
          tablesWritten: ["shared-table"],
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      const loopErrors = result.errors.filter((e) => e.code === "ERR_RECURSIVE_LOOP");
      // Must discover BOTH Cycle 1 (queue-a -> workerA -> queue-a) AND Cycle 2 (shared-table -> streamWorker -> queue-b -> workerB -> shared-table)
      expect(loopErrors.length).toBeGreaterThanOrEqual(2);
      expect(loopErrors.some((e) => e.message.includes("Queue 'queue-a'"))).toBe(true);
      expect(loopErrors.some((e) => e.message.includes("Table 'shared-table'"))).toBe(true);
    });
  });

  describe("Exhaustive Denial of Wallet (DoW) Protections", () => {
    it("flags WARN_DOW_SMS_TOLL_FRAUD for SMS topic subscriptions and phone-verified Auth", () => {
      const graph = createEmptyGraph();
      graph.topics.push({
        id: "alertTopic",
        name: "alerts",
        sourceFile: "src/infra.ts",
        subscriptions: [{ protocol: "sms", endpoint: "+15551234567" }],
      });
      graph.auths = [
        {
          id: "userAuth",
          name: "my-users",
          sourceFile: "src/infra.ts",
          signInMethod: "phone",
        },
      ];

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      const smsWarnings = result.warnings.filter((w) => w.code === "WARN_DOW_SMS_TOLL_FRAUD");
      expect(smsWarnings.length).toBe(2);
      expect(smsWarnings.some((w) => w.constructId === "alertTopic")).toBe(true);
      expect(smsWarnings.some((w) => w.constructId === "userAuth")).toBe(true);
    });

    it("flags WARN_DOW_DYNAMODB_SCAN when an API route scans a table", () => {
      const graph = createEmptyGraph();
      graph.tables.push({
        id: "usersTable",
        name: "users",
        partitionKey: { name: "id", type: "string" },
        sourceFile: "src/infra.ts",
      });
      graph.apis.push({
        id: "listUsers",
        exportName: "listUsers",
        sourceFile: "src/api.ts",
        method: "GET",
        path: "/users",
        mutations: {
          tablesScanned: ["users"],
        },
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_DYNAMODB_SCAN")).toBe(true);
    });

    it("flags WARN_DOW_HIGH_BLAST_RADIUS when continuous monthly compute liability exceeds $100 without a Budget", () => {
      const graph = createEmptyGraph();
      // 10 concurrent executions at 512 MB: 10 * 0.5 * 43.20 = $216/month
      graph.apis.push({
        id: "heavyApi",
        exportName: "heavyApi",
        sourceFile: "src/api.ts",
        method: "POST",
        path: "/process",
        memory: 512,
        concurrency: 10,
      });

      const validator = new GraphValidator();
      const result = validator.validate(graph);
      expect(result.warnings.some((w) => w.code === "WARN_DOW_HIGH_BLAST_RADIUS")).toBe(true);
      expect(result.warnings.find((w) => w.code === "WARN_DOW_HIGH_BLAST_RADIUS")?.message).toContain("$216/mo");

      // Adding an explicit Budget clears the warning
      graph.budgets = [
        {
          id: "mainBudget",
          amount: 250,
          threshold: 80,
          sourceFile: "src/infra.ts",
        },
      ];
      const resultWithBudget = validator.validate(graph);
      expect(resultWithBudget.warnings.some((w) => w.code === "WARN_DOW_HIGH_BLAST_RADIUS")).toBe(false);
    });
  });
});
