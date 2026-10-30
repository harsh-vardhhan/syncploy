import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { Compiler } from "../src/compiler";

const TEST_DIR = path.resolve(__dirname, ".tmp-test-construct-resolution");

describe("@syncploy/compiler - Construct Resolution & Template Literals", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  it("statically resolves template expressions with substitutions into clean physical names without backticks", async () => {
    fs.writeFileSync(
      path.join(TEST_DIR, "app.ts"),
      `
import { Queue, Bucket } from "@syncploy/sdk";

const stage = "prod";
const prefix = "corp";

export const jobsQueue = new Queue("jobs", {
  queueName: \`\${prefix}-jobs-\${stage}\`,
});

export const uploadsBucket = new Bucket("uploads", {
  bucketName: \`\${prefix}-uploads-\${stage}\`,
});
      `.trim()
    );

    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    expect(graph.queues.length).toBe(1);
    expect(graph.queues[0]?.queueName).toBe("corp-jobs-prod");
    expect(graph.buckets.length).toBe(1);
    expect(graph.buckets[0]?.bucketName).toBe("corp-uploads-prod");

    const buildOutput = await compiler.build();
    const templateJson = fs.readFileSync(buildOutput.templatePath, "utf-8");
    const template = JSON.parse(templateJson);

    const qResource = template.Resources.Queuejobs;
    expect(qResource).toBeDefined();
    expect(qResource.Properties.QueueName).toBe("corp-jobs-prod");

    const bResource = template.Resources.Bucketuploads;
    expect(bResource).toBeDefined();
    expect(bResource.Properties.BucketName).toBe("corp-uploads-prod");
  });

  it("accurately discovers constructs imported under local aliases (import { Table as MyTable })", async () => {
    fs.writeFileSync(
      path.join(TEST_DIR, "app.ts"),
      `
import { Table as MyTable, Queue as FastQueue } from "@syncploy/sdk";

export const orders = new MyTable("orders", {
  tableName: "orders-table",
});

export const tasks = new FastQueue("tasks", {
  queueName: "tasks-queue",
});
      `.trim()
    );

    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    expect(graph.tables.length).toBe(1);
    expect(graph.tables[0]?.name).toBe("orders");
    expect(graph.queues.length).toBe(1);
    expect(graph.queues[0]?.name).toBe("tasks");

    const buildOutput = await compiler.build();
    const templateJson = fs.readFileSync(buildOutput.templatePath, "utf-8");
    const template = JSON.parse(templateJson);

    expect(template.Resources.Tableorders).toBeDefined();
    expect(template.Resources.Queuetasks).toBeDefined();
  });

  it("accurately discovers constructs re-exported through local helper modules", async () => {
    fs.writeFileSync(
      path.join(TEST_DIR, "primitives.ts"),
      `
export { Table as BaseTable, Bucket as BaseBucket } from "@syncploy/sdk";
      `.trim()
    );

    fs.writeFileSync(
      path.join(TEST_DIR, "app.ts"),
      `
import { BaseTable, BaseBucket as StorageBucket } from "./primitives";

export const customers = new BaseTable("customers");
export const assets = new StorageBucket("assets");
      `.trim()
    );

    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    expect(graph.tables.length).toBe(1);
    expect(graph.tables[0]?.name).toBe("customers");
    expect(graph.buckets.length).toBe(1);
    expect(graph.buckets[0]?.name).toBe("assets");

    const buildOutput = await compiler.build();
    const templateJson = fs.readFileSync(buildOutput.templatePath, "utf-8");
    const template = JSON.parse(templateJson);

    expect(template.Resources.Tablecustomers).toBeDefined();
    expect(template.Resources.Bucketassets).toBeDefined();
  });

  it("strictly rejects mock constructs imported from third-party or fake SDK modules", async () => {
    fs.writeFileSync(
      path.join(TEST_DIR, "fake-sdk.ts"),
      `
export class Table {
  constructor(public name: string) {}
}
      `.trim()
    );

    fs.writeFileSync(
      path.join(TEST_DIR, "app.ts"),
      `
import { Table } from "./fake-sdk";

export const fakeTable = new Table("fake");
      `.trim()
    );

    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    expect(graph.tables.length).toBe(0);
  });
});
