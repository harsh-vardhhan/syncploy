import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Compiler } from "../src/index";

const TEST_DIR = path.join(__dirname, ".tmp-test-app-configured");

describe("@syncploy/compiler - In-Code Configurations", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });

    await fs.writeFile(
      path.join(TEST_DIR, "app.ts"),
      `
import { api, Table, Bucket, Queue } from "@syncploy/sdk";

export const ehrTable = new Table("ehr", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  pointInTimeRecovery: true,
  indexes: {
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

export const getUser = api(
  {
    method: "GET",
    path: "/users/:id",
    timeout: "30s",
    memory: "512MB",
    concurrency: 2,
    cors: {
      allowOrigins: ["https://example.com"],
      allowHeaders: ["Content-Type", "X-Api-Key"],
    },
  },
  async ({ id }: { id: string }) => {
    return { id, name: "Alice" };
  }
);

export const processDoc = annotationQueue.consumer(
  {
    batchSize: 5,
    timeout: "120s",
    concurrency: 2,
  },
  async (event) => {
    console.log("Processing", event);
  }
);
`,
      "utf-8"
    );
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("extracts all in-code configurations accurately", async () => {
    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    // Verify Table Config
    const table = graph.tables[0]!;
    expect(table.name).toBe("ehr");
    expect(table.stream).toBe("NEW_IMAGE");
    expect(table.billingMode).toBe("PAY_PER_REQUEST");
    expect(table.pointInTimeRecovery).toBe(true);
    expect(table.indexes?.["GSI1Index"]).toBeDefined();
    expect(table.indexes?.["GSI1Index"]?.partitionKey).toBe("GSI1PK");
    expect(table.indexes?.["GSI1Index"]?.sortKey).toBe("GSI1SK");

    // Verify Bucket Config
    const bucket = graph.buckets[0]!;
    expect(bucket.name).toBe("documents");
    expect(bucket.versioned).toBe(true);
    expect(bucket.eventBridge).toBe(true);
    expect(bucket.publicAccessBlock).toBe(true);

    // Verify Queue Config
    const queue = graph.queues[0]!;
    expect(queue.name).toBe("annotations");
    expect(queue.visibilityTimeout).toBe(180);
    expect(queue.deadLetterQueue?.maxReceiveCount).toBe(3);

    // Verify API Config
    const api = graph.apis[0]!;
    expect(api.timeout).toBe(30);
    expect(api.memory).toBe(512);
    expect(api.concurrency).toBe(2);

    // Verify Queue Consumer Config
    const consumer = graph.consumers[0]!;
    expect(consumer.batchSize).toBe(5);
    expect(consumer.timeout).toBe(120);
    expect(consumer.concurrency).toBe(2);
  });

  it("synthesizes accurate CloudFormation properties matching in-code configs", async () => {
    const compiler = new Compiler(TEST_DIR);
    const output = await compiler.build();

    const templateContent = await fs.readFile(output.templatePath, "utf-8");
    const template = JSON.parse(templateContent);
    const res = template.Resources;

    // 1. Table with Stream & GSI
    const tableRes = res["Tableehr"];
    expect(tableRes.Properties.StreamSpecification.StreamViewType).toBe("NEW_IMAGE");
    expect(tableRes.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled).toBe(true);
    expect(tableRes.Properties.GlobalSecondaryIndexes.length).toBe(1);
    expect(tableRes.Properties.GlobalSecondaryIndexes[0].IndexName).toBe("GSI1Index");

    // 2. Bucket with EventBridge & Versioning
    const bucketRes = res["Bucketdocuments"];
    expect(bucketRes.Properties.VersioningConfiguration.Status).toBe("Enabled");
    expect(bucketRes.Properties.NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled).toBe(true);

    // 3. Queue with DLQ
    const queueRes = res["Queueannotations"];
    expect(queueRes.Properties.VisibilityTimeout).toBe(180);
    expect(res["QueueannotationsDLQ"]).toBeDefined();
    expect(queueRes.Properties.RedrivePolicy.maxReceiveCount).toBe(3);

    // 4. API Lambda with memory, timeout, concurrency
    const funcRes = res["FunctiongetUser"];
    expect(funcRes.Properties.Timeout).toBe(30);
    expect(funcRes.Properties.MemorySize).toBe(512);
    expect(funcRes.Properties.ReservedConcurrentExecutions).toBe(2);

    // 5. Worker Lambda with timeout, concurrency, EventSourceMapping
    const workerRes = res["FunctionprocessDoc"];
    expect(workerRes.Properties.Timeout).toBe(120);
    expect(workerRes.Properties.ReservedConcurrentExecutions).toBe(2);

    const mappingRes = res["EventSourceMappingprocessDoc"];
    expect(mappingRes.Properties.BatchSize).toBe(5);
    expect(mappingRes.Properties.FunctionResponseTypes).toEqual(["ReportBatchItemFailures"]);
  });
});
