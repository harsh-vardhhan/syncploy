import { describe, expect, it, beforeEach } from "bun:test";
import { api, HttpError, Table, Bucket, Queue, Secret, Topic, Alarm, DeliveryStream } from "../src/index";

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
      expect(typeof table.stream).toBe("function");
    });

    it("creates stream consumer definition", () => {
      const table = new Table("users", {
        partitionKey: { name: "id", type: "string" },
        stream: "NEW_IMAGE",
      });
      const consumer = table.stream({ batchSize: 50 }, async (record) => {
        console.log(record);
      });
      expect(consumer._kind).toBe("table_stream");
      expect(consumer.options.batchSize).toBe(50);
      expect(typeof consumer.handler).toBe("function");
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

  describe("Topic Runtime Client", () => {
    beforeEach(() => {
      delete process.env.SYNCPLOY_TOPIC_NOTIFICATIONS;
    });

    it("resolves topic ARN from environment variable or fallback", () => {
      const topic = new Topic("notifications");
      expect(topic.topicArn).toBe("notifications");

      process.env.SYNCPLOY_TOPIC_NOTIFICATIONS = "arn:aws:sns:us-east-1:123456789012:notifications";
      expect(topic.topicArn).toBe("arn:aws:sns:us-east-1:123456789012:notifications");
    });

    it("creates subscriber definition", () => {
      const topic = new Topic("notifications");
      expect(typeof topic.publish).toBe("function");
      expect(typeof topic.subscribe).toBe("function");

      const subscriber = topic.subscribe({ timeout: "30s" }, async (msg) => {
        console.log(msg);
      });
      expect(subscriber._kind).toBe("topic_subscriber");
      expect(subscriber.options.timeout).toBe("30s");
      expect(typeof subscriber.handler).toBe("function");
    });
  });

  describe("Alarm Definition", () => {
    it("creates an alarm definition with metric and actions", () => {
      const topic = new Topic("alerts");
      const alarm = new Alarm("HighErrors", {
        threshold: 100,
        evaluationPeriods: 1,
        comparison: "GreaterThanOrEqualToThreshold",
        metric: {
          metricName: "Errors",
          namespace: "AWS/Lambda",
          period: "60s",
          stat: "Sum",
        },
        actions: [topic],
      });

      expect(alarm._kind).toBe("alarm");
      expect(alarm.name).toBe("HighErrors");
      expect(alarm.options.threshold).toBe(100);
      expect(alarm.options.actions?.[0]).toBe(topic);
    });
  });

  describe("DeliveryStream Runtime Client", () => {
    beforeEach(() => {
      delete process.env.SYNCPLOY_DELIVERY_STREAM_AUDIT;
    });

    it("resolves delivery stream name from environment variable or fallback", () => {
      const bucket = new Bucket("audit-logs", {
        objectLock: { mode: "COMPLIANCE", days: 1 },
      });
      const stream = new DeliveryStream("audit", {
        destination: bucket,
        bufferingInterval: "900s",
        bufferingSize: "5MB",
        compression: "GZIP",
      });

      expect(stream._kind).toBe("delivery_stream");
      expect(stream.streamName).toBe("audit");

      process.env.SYNCPLOY_DELIVERY_STREAM_AUDIT = "ehr-stack-audit-stream";
      expect(stream.streamName).toBe("ehr-stack-audit-stream");
    });
  });
});
