import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { Compiler } from "../src/index";

const TEST_DIR = path.join(__dirname, ".tmp-test-app");

describe("@syncploy/compiler", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });

    // Write a sample app file
    await fs.writeFile(
      path.join(TEST_DIR, "app.ts"),
      `
import { api, Table, Bucket } from "@syncploy/sdk";

export const usersTable = new Table("users", {
  partitionKey: { name: "id", type: "string" },
  sortKey: { name: "createdAt", type: "string" }
});

export const avatarsBucket = new Bucket("avatars");

export const getUser = api(
  { method: "GET", path: "/users/:id" },
  async ({ id }: { id: string }) => {
    return { id, name: "Alice", role: "admin" };
  }
);

export const createUser = api(
  { method: "POST", path: "/users" },
  async ({ name }: { name: string }) => {
    return { id: "123", name };
  }
);
`,
      "utf-8"
    );
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("parses resources and APIs from TypeScript source", async () => {
    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    expect(graph.apis.length).toBe(2);
    expect(graph.tables.length).toBe(1);
    expect(graph.buckets.length).toBe(1);

    // Verify Table
    const table = graph.tables[0]!;
    expect(table.name).toBe("users");
    expect(table.partitionKey.name).toBe("id");
    expect(table.sortKey?.name).toBe("createdAt");

    // Verify Bucket
    const bucket = graph.buckets[0]!;
    expect(bucket.name).toBe("avatars");

    // Verify APIs
    const getUserApi = graph.apis.find((a) => a.id === "getUser")!;
    expect(getUserApi).toBeDefined();
    expect(getUserApi.method).toBe("GET");
    expect(getUserApi.path).toBe("/users/:id");

    const createUserApi = graph.apis.find((a) => a.id === "createUser")!;
    expect(createUserApi).toBeDefined();
    expect(createUserApi.method).toBe("POST");
    expect(createUserApi.path).toBe("/users");
  });

  it("bundles Lambdas and synthesizes CloudFormation template", async () => {
    const compiler = new Compiler(TEST_DIR);
    const output = await compiler.build();

    // 1. Verify bundles exist
    expect(output.lambdaBundles["getUser"]).toBeDefined();
    expect(output.lambdaBundles["createUser"]).toBeDefined();

    const getUserBundle = output.lambdaBundles["getUser"]!;
    const exists = await fs.exists(getUserBundle);
    expect(exists).toBe(true);

    // 2. Verify CloudFormation template
    const templateContent = await fs.readFile(output.templatePath, "utf-8");
    const template = JSON.parse(templateContent);

    expect(template.AWSTemplateFormatVersion).toBe("2010-09-09");
    expect(template.Resources["HttpApi"]).toBeDefined();
    expect(template.Resources["Tableusers"]).toBeDefined();
    expect(template.Resources["Bucketavatars"]).toBeDefined();
    expect(template.Resources["FunctiongetUser"]).toBeDefined();
    expect(template.Resources["FunctioncreateUser"]).toBeDefined();

    // Verify API Gateway route key converts /users/:id to /users/{id}
    const route = template.Resources["RoutegetUser"];
    expect(route.Properties.RouteKey).toBe("GET /users/{id}");

    // 3. Test running the generated bundle with a mock event
    const bundleModule = await import(getUserBundle);
    expect(typeof bundleModule.handler).toBe("function");

    const mockEvent = {
      pathParameters: { id: "42" },
      queryStringParameters: {},
      headers: {},
      body: null,
    };

    const res = await bundleModule.handler(mockEvent);
    expect(res.statusCode).toBe(200);

    const body = JSON.parse(res.body);
    expect(body.id).toBe("42");
    expect(body.name).toBe("Alice");
  });
});
