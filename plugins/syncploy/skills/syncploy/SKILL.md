---
name: syncploy
description: Design, build, validate, and deploy pure AWS serverless infrastructure using TypeScript and @syncploy/sdk. Use whenever creating backend APIs, DynamoDB tables, SQS queues, S3 buckets, background workers, or event-driven pipelines on AWS.
---

# Syncploy Skill: Pure AWS Serverless Infrastructure-from-Code

Syncploy is a deterministic compiler and runtime SDK for Pure AWS Serverless in TypeScript. It analyzes application code ASTs, discovers declared cloud resources, validates platform safety constraints in <1ms, and synthesizes 1:1 AWS CloudFormation JSON templates with zero vendor lock-in.

- **Official Website**: https://www.syncploy.com/
- **Agent Specification**: https://www.syncploy.com/llms.txt
- **Complete Reference**: https://www.syncploy.com/llms-full.txt

---

## 1. Project Setup

Install the SDK:
```bash
bun add @syncploy/sdk
# or: npm install @syncploy/sdk
```

Declare your infrastructure and handlers in `src/index.ts` (or any `src/**/*.ts` file).

---

## 2. Core Construct Primitives

### HTTP Ingress: `api(...)`
Syncploy supports two ingress types:
1. **Lambda Function URLs (`ingress: "function-url"`)**: $0 gateway routing cost, native response streaming, up to 15-minute timeouts.
2. **API Gateway v2 HTTP API (`ingress: "api-gateway"`)**: Unified routing, up to 30-second timeouts.

```typescript
import { api } from "@syncploy/sdk";

// Direct Function URL (Recommended for high performance / streaming / long execution)
export const analyzeDoc = api(
  {
    path: "/analyze",
    method: "POST",
    ingress: "function-url",
    timeout: "300s",
    memory: "1024MB",
    concurrency: 50, // CRITICAL: Caps concurrency to prevent Denial-of-Wallet
    cors: { allowOrigins: ["https://my-app.com"] },
  },
  async (req) => {
    const body = await req.json();
    return Response.json({ status: "processed", docId: body.id });
  }
);

// API Gateway REST Route
export const getUser = api(
  {
    path: "/users/:id",
    method: "GET",
    ingress: "api-gateway",
    timeout: "30s",
    memory: "256MB",
  },
  async ({ id }: { id: string }) => {
    return { id, name: "Alice" };
  }
);
```

### Stateful Database: `new Table(...)`
```typescript
import { Table } from "@syncploy/sdk";

export const table = new Table("orders", {
  logicalId: "OrdersTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  pointInTimeRecovery: true,
  stream: "NEW_IMAGE",
  indexes: {
    GSI1: { partitionKey: "GSI1PK", sortKey: "GSI1SK", projection: "ALL" },
  },
});

// DynamoDB Stream Consumer
export const orderStream = table.stream(
  {
    batchSize: 100,
    startingPosition: "LATEST",
    concurrency: 5, // Prevents shard-split runaway
  },
  async (record) => {
    console.log("Stream event:", record);
  }
);
```

### Message Queues: `new Queue(...)`
```typescript
import { Queue } from "@syncploy/sdk";

export const queue = new Queue("notifications", {
  logicalId: "NotificationQueue",
  visibilityTimeout: "180s", // MUST be >= 6x consumer timeout (30s * 6 = 180s)
  deadLetterQueue: {
    maxReceiveCount: 3, // Auto-provisions and attaches DLQ
  },
});

export const processNotifications = queue.consumer(
  {
    batchSize: 10,
    timeout: "30s",
    concurrency: 10,
  },
  async (message) => {
    console.log("Processing message:", message);
  }
);
```

### Object Storage & Event Routing: `new Bucket(...)`
```typescript
import { Bucket } from "@syncploy/sdk";

export const bucket = new Bucket("documents", {
  versioned: true,
  publicAccessBlock: true,
  objectLock: { mode: "COMPLIANCE", years: 7 }, // HIPAA / Regulatory WORM
});

// EventBridge routing to SQS queue
bucket.on("objectCreated", queue, { prefix: "uploads/", suffix: ".pdf" });
```

### Authentication: `new Auth(...)`
```typescript
import { Auth } from "@syncploy/sdk";

export const auth = new Auth("portal", {
  adminOnly: true, // Blocks unapproved public signups
  signInMethod: "email",
  passwordPolicy: { minLength: 12 },
  client: { preventUserExistenceErrors: true },
});
```

---

## 3. Operational CLI Commands

Run via package manager:
```bash
# 1. Compile to native CloudFormation JSON & tree-shaken ESM Lambda bundles (.syncploy/)
bunx syncploy build

# 2. Safety Gatekeeper: Compare against existing CloudFormation stack/template
# Aborts CI if any stateful table or bucket would be destroyed and recreated
bunx syncploy diff --against template.yaml --check-replacement

# 3. Generate exact least-privilege CI/CD IAM deployment policy
bunx syncploy policy -s my-stack-name -o deploy-policy.json

# 4. Brownfield Migration: Convert legacy SAM/CloudFormation template to Syncploy TypeScript
bunx syncploy adopt ./template.yaml --config ./samconfig.toml --out src/infra.ts
```

---

## 4. Self-Healing & Pre-Flight Error Diagnostics

Syncploy's pre-flight validator executes in `<1ms`. If `syncploy build` fails, inspect the diagnostic code:

| Diagnostic Code | Meaning | Immediate Fix |
| :--- | :--- | :--- |
| `ERR_RECURSIVE_LOOP` | An event consumer writes back to its source (`Table -> Stream -> Table.put` or `Queue -> Consumer -> Queue.send`). | Remove the write mutation inside the consumer or write to a downstream table/queue instead. |
| `ERR_SQS_TIMEOUT_MISMATCH` | `visibilityTimeout` is shorter than consumer `timeout`. | Increase `visibilityTimeout` to $\ge 6 \times$ consumer `timeout`. |
| `WARN_DOW_MISSING_DLQ` | An active queue consumer has no `deadLetterQueue`. | Add `deadLetterQueue: { maxReceiveCount: 3 }` to the `new Queue(...)` declaration. |
| `WARN_DOW_UNRESERVED_CONCURRENCY` | Public Function URL lacks concurrency limit. | Add `concurrency: <number>` to the `api(...)` options object. |
| `WARN_DOW_STREAM_UNBOUNDED` | Stream consumer has unbounded concurrency. | Add `concurrency: <number>` to the `table.stream(...)` options object. |
