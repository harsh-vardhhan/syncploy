import { describe, expect, it, test, beforeAll, afterAll } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Compiler } from "../src/index";
import { Parser } from "../src/parser";
import { GraphValidator } from "../src/validator";

const TEST_DIR_AUTO = path.join(__dirname, ".tmp-test-electrodb-auto");
const TEST_DIR_ENRICH = path.join(__dirname, ".tmp-test-electrodb-enrich");
const TEST_DIR_RECURSION = path.join(__dirname, ".tmp-test-electrodb-recursion");

describe("@syncploy/compiler - ElectroDB Opinionated Integration", () => {
  afterAll(async () => {
    await fs.rm(TEST_DIR_AUTO, { recursive: true, force: true }).catch(() => {});
    await fs.rm(TEST_DIR_ENRICH, { recursive: true, force: true }).catch(() => {});
    await fs.rm(TEST_DIR_RECURSION, { recursive: true, force: true }).catch(() => {});
  });

  test("auto-synthesizes DynamoDB table, primary keys, and unions GSIs from ElectroDB entities without new Table", async () => {
    await fs.mkdir(path.join(TEST_DIR_AUTO, "node_modules", "electrodb"), { recursive: true });
    await fs.writeFile(
      path.join(TEST_DIR_AUTO, "node_modules", "electrodb", "package.json"),
      JSON.stringify({ name: "electrodb", main: "index.js" })
    );
    await fs.writeFile(
      path.join(TEST_DIR_AUTO, "node_modules", "electrodb", "index.js"),
      "export class Entity { constructor() {} get() { return { go: () => ({}) }; } }"
    );

    // documents.entity.ts
    await fs.writeFile(
      path.join(TEST_DIR_AUTO, "documents.entity.ts"),
      `
import { Entity } from "electrodb";

export const DocumentEntity = new Entity(
  {
    model: {
      entity: "document",
      service: "ehr",
      version: "1",
    },
    attributes: {
      id: { type: "string", required: true },
      title: { type: "string", required: true },
    },
    indexes: {
      primary: {
        pk: { field: "PK", composite: ["id"] },
        sk: { field: "SK", composite: [] },
      },
      bySk: {
        index: "SKIndex",
        pk: { field: "SK", composite: [] },
        sk: { field: "PK", composite: ["id"] },
      },
    },
  },
  { table: "ehr" }
);
`
    );

    // annotations.entity.ts
    await fs.writeFile(
      path.join(TEST_DIR_AUTO, "annotations.entity.ts"),
      `
import { Entity } from "electrodb";

export const AnnotationEntity = new Entity(
  {
    model: {
      entity: "annotation",
      service: "ehr",
      version: "1",
    },
    attributes: {
      annotationId: { type: "string", required: true },
      documentId: { type: "string", required: true },
      label: { type: "string", required: true },
    },
    indexes: {
      primary: {
        pk: { field: "PK", composite: ["documentId"] },
        sk: { field: "SK", composite: ["annotationId"] },
      },
      bySk: {
        index: "SKIndex",
        pk: { field: "SK", composite: ["annotationId"] },
        sk: { field: "PK", composite: ["documentId"] },
      },
      byLabel: {
        index: "GSI1Index",
        pk: { field: "GSI1PK", composite: ["label"] },
        sk: { field: "GSI1SK", composite: [] },
      },
    },
  },
  { table: "ehr" }
);
`
    );

    // app.ts with an API that reads/writes
    await fs.writeFile(
      path.join(TEST_DIR_AUTO, "app.ts"),
      `
import { api } from "@syncploy/sdk";
import { DocumentEntity } from "./documents.entity";

export const getDoc = api({ method: "GET", path: "/documents" }, async () => {
  return DocumentEntity.get({ id: "123" }).go();
});
`
    );

    const parser = new Parser(TEST_DIR_AUTO);
    const graph = parser.parse();

    // Verify entities were parsed
    expect(graph.electroEntities).toBeDefined();
    expect(graph.electroEntities!.length).toBe(2);

    const docEntity = graph.electroEntities!.find((e) => e.id === "DocumentEntity")!;
    expect(docEntity).toBeDefined();
    expect(docEntity.entityName).toBe("document");
    expect(docEntity.serviceName).toBe("ehr");
    expect(docEntity.primaryIndex.pkField).toBe("PK");
    expect(docEntity.primaryIndex.skField).toBe("SK");
    expect(docEntity.secondaryIndexes["SKIndex"]).toBeDefined();

    const annEntity = graph.electroEntities!.find((e) => e.id === "AnnotationEntity")!;
    expect(annEntity).toBeDefined();
    expect(annEntity.entityName).toBe("annotation");
    expect(annEntity.secondaryIndexes["SKIndex"]).toBeDefined();
    expect(annEntity.secondaryIndexes["GSI1Index"]).toBeDefined();

    // Verify Table was auto-synthesized
    expect(graph.tables.length).toBe(1);
    const synthesizedTable = graph.tables[0]!;
    expect(synthesizedTable.name).toBe("ehr");
    expect(synthesizedTable.partitionKey.name).toBe("PK");
    expect(synthesizedTable.sortKey?.name).toBe("SK");
    expect(synthesizedTable.billingMode).toBe("PAY_PER_REQUEST");

    // Verify GSIs were unioned: both SKIndex and GSI1Index must be present!
    expect(synthesizedTable.indexes).toBeDefined();
    expect(Object.keys(synthesizedTable.indexes!)).toContain("SKIndex");
    expect(Object.keys(synthesizedTable.indexes!)).toContain("GSI1Index");
    expect(synthesizedTable.indexes!["SKIndex"]!.partitionKey).toBe("SK");
    expect(synthesizedTable.indexes!["SKIndex"]!.sortKey).toBe("PK");
    expect(synthesizedTable.indexes!["GSI1Index"]!.partitionKey).toBe("GSI1PK");
    expect(synthesizedTable.indexes!["GSI1Index"]!.sortKey).toBe("GSI1SK");

    // End-to-end compilation check: synthesizes valid CloudFormation DynamoDB table
    const compiler = new Compiler(TEST_DIR_AUTO);
    const output = await compiler.build();
    const cfn = JSON.parse(await fs.readFile(output.templatePath, "utf-8"));

    expect(cfn.Resources["Tableehr"]).toBeDefined();
    const ddbResource = cfn.Resources["Tableehr"];
    expect(ddbResource.Type).toBe("AWS::DynamoDB::Table");
    expect(ddbResource.Properties.KeySchema).toEqual([
      { AttributeName: "PK", KeyType: "HASH" },
      { AttributeName: "SK", KeyType: "RANGE" },
    ]);
    expect(ddbResource.Properties.GlobalSecondaryIndexes.length).toBe(2);
  });

  test("enriches explicit Table definition with unioned GSIs from ElectroDB entities", async () => {
    await fs.mkdir(TEST_DIR_ENRICH, { recursive: true });

    await fs.writeFile(
      path.join(TEST_DIR_ENRICH, "entities.ts"),
      `
import { Entity } from "electrodb";

export const AuditEntity = new Entity(
  {
    model: { entity: "audit", service: "app-service", version: "1" },
    attributes: { auditId: { type: "string" } },
    indexes: {
      primary: { pk: { field: "PK", composite: ["auditId"] } },
      byTimestamp: {
        index: "TimeIndex",
        pk: { field: "TS_PK", composite: ["auditId"] },
        sk: { field: "TS_SK", composite: [] },
      },
    },
  }
);
`
    );

    await fs.writeFile(
      path.join(TEST_DIR_ENRICH, "app.ts"),
      `
import { Table, api } from "@syncploy/sdk";
import { AuditEntity } from "./entities";

// User defined a basic Table without GSI
export const myTable = new Table("app-service", {
  stream: "NEW_IMAGE",
});

export const testApi = api({ method: "GET", path: "/test" }, async () => {
  return "ok";
});
`
    );

    const parser = new Parser(TEST_DIR_ENRICH);
    const graph = parser.parse();

    expect(graph.tables.length).toBe(1);
    const table = graph.tables[0]!;
    expect(table.name).toBe("app-service");
    expect(table.stream).toBe("NEW_IMAGE");
    // GSIs should be merged from AuditEntity
    expect(table.indexes).toBeDefined();
    expect(table.indexes!["TimeIndex"]).toBeDefined();
    expect(table.indexes!["TimeIndex"]!.partitionKey).toBe("TS_PK");
  });

  describe("ElectroDB Schema & Consistency Validation", () => {
    const validator = new GraphValidator();

    test("flags ERR_ELECTRO_KEY_MISMATCH when entities in the same service have different PK fields", () => {
      const graph: any = {
        apis: [],
        tables: [],
        tableStreams: [],
        buckets: [],
        queues: [],
        consumers: [],
        topics: [],
        topicSubscribers: [],
        alarms: [],
        deliveryStreams: [],
        bindings: [],
        electroEntities: [
          {
            id: "EntityA",
            entityName: "entityA",
            serviceName: "myservice",
            sourceFile: "entityA.ts",
            primaryIndex: { name: "primary", pkField: "PK", skField: "SK", isPrimary: true },
            secondaryIndexes: {},
            attributes: {},
          },
          {
            id: "EntityB",
            entityName: "entityB",
            serviceName: "myservice",
            sourceFile: "entityB.ts",
            primaryIndex: { name: "primary", pkField: "DIFFERENT_PK", skField: "SK", isPrimary: true },
            secondaryIndexes: {},
            attributes: {},
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_ELECTRO_KEY_MISMATCH")).toBe(true);
    });

    test("flags ERR_ELECTRO_GSI_MISMATCH when entities have conflicting GSI key definitions", () => {
      const graph: any = {
        apis: [],
        tables: [],
        tableStreams: [],
        buckets: [],
        queues: [],
        consumers: [],
        topics: [],
        topicSubscribers: [],
        alarms: [],
        deliveryStreams: [],
        bindings: [],
        electroEntities: [
          {
            id: "EntityA",
            entityName: "entityA",
            serviceName: "myservice",
            sourceFile: "entityA.ts",
            primaryIndex: { name: "primary", pkField: "PK", skField: "SK", isPrimary: true },
            secondaryIndexes: {
              GSI1: { name: "GSI1", pkField: "GSI1PK", skField: "GSI1SK", isPrimary: false },
            },
            attributes: {},
          },
          {
            id: "EntityB",
            entityName: "entityB",
            serviceName: "myservice",
            sourceFile: "entityB.ts",
            primaryIndex: { name: "primary", pkField: "PK", skField: "SK", isPrimary: true },
            secondaryIndexes: {
              GSI1: { name: "GSI1", pkField: "CONFLICTING_PK", skField: "GSI1SK", isPrimary: false },
            },
            attributes: {},
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_ELECTRO_GSI_MISMATCH")).toBe(true);
    });

    test("flags ERR_ELECTRO_TABLE_KEY_MISMATCH when explicit Table PK conflicts with ElectroDB PK", () => {
      const graph: any = {
        apis: [],
        tables: [
          {
            id: "myTable",
            name: "myservice",
            partitionKey: { name: "ID", type: "string" },
            sourceFile: "app.ts",
          },
        ],
        tableStreams: [],
        buckets: [],
        queues: [],
        consumers: [],
        topics: [],
        topicSubscribers: [],
        alarms: [],
        deliveryStreams: [],
        bindings: [],
        electroEntities: [
          {
            id: "EntityA",
            entityName: "entityA",
            serviceName: "myservice",
            sourceFile: "entityA.ts",
            primaryIndex: { name: "primary", pkField: "PK", isPrimary: true },
            secondaryIndexes: {},
            attributes: {},
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_ELECTRO_TABLE_KEY_MISMATCH")).toBe(true);
    });

    test("flags ERR_ELECTRO_DUPLICATE_ENTITY when two entities share the same name in a service", () => {
      const graph: any = {
        apis: [],
        tables: [],
        tableStreams: [],
        buckets: [],
        queues: [],
        consumers: [],
        topics: [],
        topicSubscribers: [],
        alarms: [],
        deliveryStreams: [],
        bindings: [],
        electroEntities: [
          {
            id: "EntityOne",
            entityName: "document",
            serviceName: "myservice",
            sourceFile: "one.ts",
            primaryIndex: { name: "primary", pkField: "PK", isPrimary: true },
            secondaryIndexes: {},
            attributes: {},
          },
          {
            id: "EntityTwo",
            entityName: "document",
            serviceName: "myservice",
            sourceFile: "two.ts",
            primaryIndex: { name: "primary", pkField: "PK", isPrimary: true },
            secondaryIndexes: {},
            attributes: {},
          },
        ],
      };

      const result = validator.validate(graph);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === "ERR_ELECTRO_DUPLICATE_ENTITY")).toBe(true);
    });
  });

  test("detects recursive loop from ElectroDB write mutations (create/patch/put) in stream consumers", async () => {
    await fs.mkdir(TEST_DIR_RECURSION, { recursive: true });

    await fs.writeFile(
      path.join(TEST_DIR_RECURSION, "entity.ts"),
      `
import { Entity } from "electrodb";

export const ItemEntity = new Entity({
  model: { entity: "item", service: "loop-service", version: "1" },
  attributes: { id: { type: "string" } },
  indexes: { primary: { pk: { field: "PK", composite: ["id"] } } }
});
`
    );

    await fs.writeFile(
      path.join(TEST_DIR_RECURSION, "app.ts"),
      `
import { Table } from "@syncploy/sdk";
import { ItemEntity } from "./entity";

export const loopTable = new Table("loop-service", {
  stream: "NEW_IMAGE",
});

export const badConsumer = loopTable.stream(async (event) => {
  // Writing back to the same entity/table inside its own stream consumer causes infinite recursion!
  await ItemEntity.create({ id: "loop" }).go();
});
`
    );

    const parser = new Parser(TEST_DIR_RECURSION);
    const graph = parser.parse();
    const validator = new GraphValidator();
    const result = validator.validate(graph);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === "ERR_RECURSIVE_LOOP")).toBe(true);
    expect(result.errors.some((e) => e.message.includes("loop-service"))).toBe(true);

    const compiler = new Compiler(TEST_DIR_RECURSION);
    await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
  });
});
