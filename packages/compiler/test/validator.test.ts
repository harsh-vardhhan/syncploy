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
});
