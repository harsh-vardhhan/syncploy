# ⚡ @syncploy/sdk

[![npm version](https://img.shields.io/npm/v/@syncploy/sdk.svg?color=blue)](https://www.npmjs.com/package/@syncploy/sdk)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](https://github.com/harsh-vardhhan/syncploy/blob/main/LICENSE)
[![GitHub](https://img.shields.io/badge/github-syncploy-black.svg)](https://github.com/harsh-vardhhan/syncploy)

> **Runtime and type definitions for Syncploy — the Infrastructure-from-Code (IfC) Compiler for Pure AWS Serverless.**  
> Declare serverless compute, storage, queues, and event pipelines directly in TypeScript with automatic least-privilege IAM and zero YAML.

---

## 📦 Installation

```bash
bun add @syncploy/sdk
# or
npm install @syncploy/sdk
```

---

## 🚀 Quick Example

```typescript
import { api, Table, Bucket, Queue, Topic, Alarm, DeliveryStream } from "@syncploy/sdk";

// 1. DynamoDB Single Table with Stream & GSI
export const usersTable = new Table("users", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  pointInTimeRecovery: true,
  indexes: {
    GSI1Index: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
  },
});

// 2. S3 Bucket with ObjectLock and Account Scoping
export const documentsBucket = new Bucket("documents", {
  versioned: true,
  eventBridge: true,
  publicAccessBlock: true,
  accountScoped: true,
});

// 3. SQS Queue with Dead-Letter Queue
export const jobQueue = new Queue("jobs", {
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});

// 4. Wire S3 events directly to SQS via EventBridge
documentsBucket.on("objectCreated", jobQueue, { prefix: "uploads/" });

// 5. High-Throughput REST API (API Gateway HTTP API v2 or Function URL)
export const createUser = api(
  {
    method: "POST",
    path: "/users",
    ingress: "function-url",
    timeout: "30s",
    memory: "512MB",
    concurrency: 5,
    cors: {
      allowOrigins: ["https://example.com"],
      allowMethods: ["*"],
    },
  },
  async (req, ctx) => {
    // Users table is auto-injected with least-privilege IAM permissions
    await usersTable.put({ PK: "USER#123", SK: "PROFILE", name: "Alice" });
    return { ok: true, id: "USER#123" };
  }
);

// 6. Queue Worker with Automatic Partial Failure Redrive
export const processJob = jobQueue.consumer(
  {
    batchSize: 5,
    timeout: "120s",
    concurrency: 2,
  },
  async (event) => {
    console.log("Processing batch item:", event);
  }
);
```

---

## ☁️ Supported Serverless Primitives

| Primitive | AWS Resource | In-Code Configurability |
| :--- | :--- | :--- |
| `api(...)` | **AWS Lambda** (Node 20 ESM or Docker Image) | `ingress` (`"api-gateway"` or `"function-url"`), `timeout`, `memory`, `concurrency`, `cors`, `container` |
| `new Table(...)` | **Amazon DynamoDB** (On-Demand) | `partitionKey`, `sortKey`, `indexes` (GSIs), `billingMode`, `stream`, `pointInTimeRecovery` |
| `table.stream(...)` | **DynamoDB Streams Consumer** | `batchSize`, `startingPosition` (`"LATEST"`, `"TRIM_HORIZON"`), `enabled` |
| `new Bucket(...)` | **Amazon S3** | `versioned`, `eventBridge`, `publicAccessBlock`, `objectLock` (`COMPLIANCE`/`GOVERNANCE`), `accountScoped` |
| `bucket.on(...)` | **Amazon EventBridge Rule** | Event pattern routing (`"objectCreated"`, `"objectRemoved"`), `prefix`, `suffix` |
| `new Queue(...)` | **Amazon SQS** | `visibilityTimeout`, `deadLetterQueue` (`maxReceiveCount`), `fifo` |
| `queue.consumer(...)` | **SQS Event Source Mapping** | `batchSize`, `concurrency`, `timeout`, `memory`, `ReportBatchItemFailures` |
| `new Topic(...)` | **Amazon SNS** | `fifo`, `subscriptions` (email, SMS, SQS, Lambda), `.email(endpoint)` |
| `topic.subscribe(...)` | **SNS Lambda Subscriber** | Dedicated subscription + Lambda permission |
| `new Alarm(...)` | **Amazon CloudWatch Alarm** | `threshold`, `evaluationPeriods`, `comparison`, `treatMissingData`, Metric Math (`metrics`) |
| `new DeliveryStream(...)` | **Amazon Data Firehose** | `destination`, `bufferingInterval`, `bufferingSize`, `compression` (`GZIP`), `prefix`, `errorPrefix` |
| `new Secret(...)` | **AWS Secrets Manager / SSM** | In-code secret resolution |

---

## 🐳 Docker Container Packaging (`PackageType: Image`)

In addition to standard tree-shaken Node 20 ESM bundles, `@syncploy/sdk` supports first-class Lambda Docker container packaging (up to 10 GB):

```typescript
import { api, queue } from "@syncploy/sdk";

// Default Dockerfile at project root
export const containerApi = api(
  {
    path: "/custom-runtime",
    container: true, // Uses ./Dockerfile
  },
  async (req, ctx) => { ... }
);

// Custom Dockerfile and context
export const mlApi = api(
  {
    path: "/ml-predict",
    container: {
      dockerfile: "./docker/Dockerfile.ml",
      context: "./services/ml",
    },
  },
  async (req, ctx) => { ... }
);

// Pre-built ECR image with ImageConfig overrides
export const heavyWorker = queue.consumer(
  {
    container: {
      imageUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/heavy-worker:v1",
      cmd: ["app.handler"],
      entrypoint: ["/entrypoint.sh"],
    },
  },
  async (event) => { ... }
);
```

---

## 🔗 How It Works

`@syncploy/sdk` provides the TypeScript definitions and runtime clients. The companion compiler ([`@syncploy/compiler`](https://github.com/harsh-vardhhan/syncploy)) parses these primitives via AST analysis and synthesizes pure, production-ready AWS CloudFormation templates into `.syncploy/template.json`.

For the full compiler documentation, architecture diagrams, and CLI reference, visit the [Syncploy GitHub Repository](https://github.com/harsh-vardhhan/syncploy).

---

## 📄 License

MIT © [Harsh Vardhan](https://github.com/harsh-vardhhan)
