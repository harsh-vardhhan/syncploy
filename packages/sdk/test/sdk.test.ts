import { describe, expect, it, beforeEach } from "bun:test";
import { api, HttpError, Table, Bucket, Queue, Secret } from "../src/index";

describe("@syncploy/sdk", () => {
  it("creates an API endpoint definition", () => {
    const endpoint = api(
      { method: "GET", path: "/hello/:name", ingress: "function-url" },
      async ({ name }: { name: string }) => {
        return { message: `Hello ${name}!` };
      }
    );

    expect(endpoint._kind).toBe("api");
    expect(endpoint.options.method).toBe("GET");
    expect(endpoint.options.path).toBe("/hello/:name");
    expect(endpoint.options.ingress).toBe("function-url");
    expect(typeof endpoint.handler).toBe("function");
  });

  it("supports HttpError", () => {
    const err = new HttpError(404, "User not found");
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe("User not found");
  });

  describe("Table Runtime Client", () => {
    beforeEach(() => {
      delete process.env.SYNCPLOY_TABLE_USERS;
    });

    it("resolves table name from environment variable or fallback", () => {
      const table = new Table("users", {
        partitionKey: { name: "id", type: "string" },
      });
      expect(table.tableName).toBe("users");

      process.env.SYNCPLOY_TABLE_USERS = "my-stack-users-123";
      expect(table.tableName).toBe("my-stack-users-123");
    });

    it("has get, put, delete, query, scan methods", () => {
      const table = new Table("users", {
        partitionKey: { name: "id", type: "string" },
      });
      expect(typeof table.get).toBe("function");
      expect(typeof table.put).toBe("function");
      expect(typeof table.delete).toBe("function");
      expect(typeof table.query).toBe("function");
      expect(typeof table.scan).toBe("function");
    });
  });

  describe("Bucket Runtime Client", () => {
    beforeEach(() => {
      delete process.env.SYNCPLOY_BUCKET_DOCS;
    });

    it("resolves bucket name from environment variable or fallback", () => {
      const bucket = new Bucket("docs");
      expect(bucket.bucketName).toBe("docs");

      process.env.SYNCPLOY_BUCKET_DOCS = "my-stack-docs-456";
      expect(bucket.bucketName).toBe("my-stack-docs-456");
    });

    it("has getText, putText, getBuffer, putBuffer, delete, list methods", () => {
      const bucket = new Bucket("docs");
      expect(typeof bucket.getText).toBe("function");
      expect(typeof bucket.putText).toBe("function");
      expect(typeof bucket.getBuffer).toBe("function");
      expect(typeof bucket.putBuffer).toBe("function");
      expect(typeof bucket.delete).toBe("function");
      expect(typeof bucket.list).toBe("function");
    });
  });

  describe("Queue Runtime Client", () => {
    beforeEach(() => {
      delete process.env.SYNCPLOY_QUEUE_EMAILS;
    });

    it("resolves queue URL from environment variable or fallback", () => {
      const queue = new Queue("emails");
      expect(queue.queueUrl).toBe("emails");

      process.env.SYNCPLOY_QUEUE_EMAILS = "https://sqs.us-east-1.amazonaws.com/123/emails";
      expect(queue.queueUrl).toBe("https://sqs.us-east-1.amazonaws.com/123/emails");
    });

    it("has send and consumer methods", () => {
      const queue = new Queue("emails");
      expect(typeof queue.send).toBe("function");
      expect(typeof queue.consumer).toBe("function");

      const consumer = queue.consumer({ batchSize: 5 }, async (msg) => {
        console.log(msg);
      });
      expect(consumer._kind).toBe("queue_consumer");
      expect(consumer.options.batchSize).toBe(5);
    });
  });

  describe("Secret Runtime Client", () => {
    it("reads secret from environment variable", () => {
      process.env.MY_SECRET = "supersecret";
      const secret = new Secret("MY_SECRET");
      expect(secret.get()).toBe("supersecret");
    });
  });
});
