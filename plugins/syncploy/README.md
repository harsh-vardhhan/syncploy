# ⚡ Syncploy Plugin for Antigravity & AI Coding Agents

> **The Zero-DoW (Denial of Wallet) Serverless Framework for TypeScript.**  
> Equips AI coding agents with specialized knowledge and deterministic safety rails to design, compile, and deploy crash-proof AWS serverless architectures with zero vendor lock-in.

---

## 🎯 Why This Plugin Exists

When AI coding agents generate AWS serverless infrastructure, they frequently create costly and dangerous footguns:
- Uncapped public Function URLs leading to unthrottled DDoS billing runaway.
- Mismatched SQS queue visibility timeouts causing infinite duplicate message cascades.
- Recursive event cycles (`Table -> Stream -> Table.put` or `Queue -> Consumer -> Queue.send`).
- Missing Dead Letter Queues (DLQs) leading to dropped or poison-pill transactions.
- Accidental resource destruction on production databases and storage buckets.

The **Syncploy Plugin** gives Antigravity the exact context, rules, and diagnostic intelligence needed to author safe, cost-bounded AWS applications using `@syncploy/sdk`.

---

## 🛡️ Invariants Enforced by This Plugin

Once installed, your agent will adhere to deterministic safety guardrails:

| Guardrail | Mechanism | Defense |
| :--- | :--- | :--- |
| **DDoS & Concurrency Caps** | Direct Lambda Function URLs with explicit `concurrency: <number>` | Bounds worst-case continuous monthly compute liability to exact dollars; returns `HTTP 429` under surges. |
| **SQS Duplicate Message Storms** | Enforces queue `visibilityTimeout >= 6 * consumer.timeout` | Eliminates race conditions and premature redelivery under downstream latency. |
| **Poison-Pill Isolation** | Auto-provisions and attaches DLQs (`deadLetterQueue: { maxReceiveCount: 3 }`) | Prevents infinite retry loops and catastrophic billing drain. |
| **Recursion Killer** | Compile-time AST cycle detection | Disallows circular event triggers before code ever touches AWS. |
| **Zero-Data-Loss Safety Gate** | AST diff engine (`syncploy diff --check-replacement`) | Blocks deployment if stateful DynamoDB tables or S3 buckets would be destroyed. |
| **Leak Neutralization** | Auto-synthesized CloudWatch & S3 cleanups | Sets 14-day retention on Lambda log groups and 7-day abort on incomplete multipart uploads. |

---

## 🚀 Quick Starter Prompts

Try asking Antigravity:
1. *"Create a serverless REST API with DynamoDB and SQS queue using Syncploy"*
2. *"Validate this serverless application for recursion loops and Denial-of-Wallet risks"*
3. *"Generate a least-privilege IAM deployment policy with syncploy policy"*

---

## 📦 Core SDK Primitives

Syncploy enables declaring both infrastructure and runtime logic in TypeScript side-by-side:

```typescript
import { api, Table, Queue, Bucket, Auth } from "@syncploy/sdk";

// 1. Direct Function URL ($0 Gateway Fee + Concurrency Ceiling)
export const analyzeDoc = api(
  {
    path: "/analyze",
    method: "POST",
    ingress: "function-url",
    timeout: "300s",
    memory: "1024MB",
    concurrency: 50, // CRITICAL: Caps worst-case monthly liability
  },
  async (req) => {
    const body = await req.json();
    return Response.json({ status: "processed", docId: body.id });
  }
);

// 2. Stateful Database with Point-in-Time Recovery
export const orders = new Table("orders", {
  logicalId: "OrdersTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  pointInTimeRecovery: true,
});

// 3. Resilient Asynchronous Queue with DLQ
export const notifications = new Queue("notifications", {
  visibilityTimeout: "180s", // >= 6x consumer timeout
  deadLetterQueue: { maxReceiveCount: 3 },
});

export const processNotifications = notifications.consumer(
  { batchSize: 10, timeout: "30s", concurrency: 10 },
  async (message) => {
    console.log("Processing message:", message);
  }
);
```

---

## 🛠️ CLI Operations

Syncploy operates via native package runner commands:

```bash
# 1. Compile to CloudFormation JSON & tree-shaken ESM Lambda bundles
bunx syncploy build

# 2. Safety Gatekeeper: Ensure no database or bucket is replaced
bunx syncploy diff --against template.yaml --check-replacement

# 3. Synthesize exact least-privilege CI/CD IAM deployment policy
bunx syncploy policy -s my-stack-name -o deploy-policy.json

# 4. Brownfield Migration: Convert legacy SAM/CloudFormation templates to TypeScript
bunx syncploy adopt ./template.yaml --config ./samconfig.toml --out src/infra.ts
```

---

## 🔗 Links & Resources

- **Official Website**: [https://www.syncploy.com](https://www.syncploy.com)
- **GitHub Repository**: [https://github.com/harsh-vardhhan/syncploy](https://github.com/harsh-vardhhan/syncploy)
- **Live AI Specification**: [https://www.syncploy.com/llms.txt](https://www.syncploy.com/llms.txt)
- **Full SDK Reference**: [https://www.syncploy.com/llms-full.txt](https://www.syncploy.com/llms-full.txt)
