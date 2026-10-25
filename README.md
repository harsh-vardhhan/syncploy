# ⚡ Syncploy

> **Infrastructure-from-Code (IfC) Compiler for Pure AWS Serverless.**  
> Write idiomatic TypeScript. Deploy to AWS without writing YAML, Terraform, or manual IAM policies.

---

## 🎯 What is Syncploy?

Syncploy is a static compiler and SDK that analyzes your TypeScript backend code, infers the serverless infrastructure graph, synthesizes least-privilege IAM policies, and generates production-ready AWS CloudFormation templates and Lambda bundles.

### The Problem It Solves
Traditional AWS serverless development forces developers to maintain massive, brittle YAML templates (SAM/Serverless Framework) or imperative CDK scripts, alongside handwritten IAM policies and manual `.env` plumbing.

### The Syncploy Difference
Unlike traditional frameworks (or Encore), Syncploy is designed specifically for **Pure AWS Serverless** and **AI Coding Agents**:
1. **In-Code Resource Configuration**: Operational limits (`timeout`, `memory`, `concurrency`, `stream`, `indexes`, `cors`) are declared directly in TypeScript code—giving AI agents and developers complete system context in one place without checking external dashboards or consoles.
2. **Dual Ingress Options**: Supports both **API Gateway (HTTP API v2)** for unified REST routing and **Lambda Function URLs** for $0 cost, native response streaming, and up to 15-minute timeouts (essential for AI/LLM workloads).
3. **Zero Repository Clutter**: Your source code is never mutated. The compiler outputs production-ready CloudFormation and tree-shaken `.mjs` Lambda bundles into `.syncploy/`.

---

## ☁️ Supported Pure AWS Serverless Services

Syncploy targets services that **scale to zero**, require **zero VPC/server management**, and authenticate over stateless IAM/HTTPS:

| Service Category | AWS Service | Syncploy SDK Primitive | In-Code Configurability |
| :--- | :--- | :--- | :--- |
| **Compute** | **AWS Lambda** (Node 20 ESM) | `api(...)`, `queue.consumer(...)` | `memory`, `timeout`, `concurrency` (ReservedConcurrentExecutions) |
| **HTTP Ingress (Unified)** | **API Gateway (HTTP API v2)** | `api({ ingress: "api-gateway" })` | `path`, `method`, `auth`, `cors` |
| **Direct Ingress (Streaming)** | **Lambda Function URLs** | `api({ ingress: "function-url" })` | `timeout` up to 15m, native response streaming, $0 cost |
| **NoSQL Database** | **Amazon DynamoDB (On-Demand)** | `new Table("name", { ... })` | `partitionKey`, `sortKey`, `indexes` (GSIs), `stream`, `pointInTimeRecovery` |
| **Object Storage** | **Amazon S3** | `new Bucket("name", { ... })` | `versioned`, `eventBridge`, `publicAccessBlock` |
| **Message Queues** | **Amazon SQS** | `new Queue("name", { ... })` | `visibilityTimeout`, `deadLetterQueue` (auto-DLQ generation), `fifo` |
| **Event Routing** | **Amazon EventBridge** | `bucket.on("objectCreated", queue)` | Event pattern filters, S3 prefix/suffix routing |
| **Secrets & Config** | **AWS Secrets Manager / SSM** | `new Secret("KEY")` | Type-safe environment injection |
| **Access Control** | **AWS IAM** | *Automatic* | Static inference generates exact least-privilege policies |

---

## 💻 Code Example: In-Code Infrastructure Definition

```typescript
import { api, Table, Bucket, Queue } from "@syncploy/sdk";

// 1. Single Table DynamoDB with Stream & Secondary Indexes
export const ehrTable = new Table("ehr", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  pointInTimeRecovery: true,
  indexes: {
    SKIndex: { partitionKey: "SK", sortKey: "PK" },
    GSI1Index: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
  },
});

// 2. S3 Bucket with EventBridge Notification routing
export const documentsBucket = new Bucket("documents", {
  versioned: true,
  eventBridge: true,
  publicAccessBlock: true,
});

// 3. SQS Queue with auto-generated Dead Letter Queue (DLQ)
export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
  },
});

// 4. REST API Endpoint (API Gateway v2) with concurrency limit & CORS
export const getDocument = api(
  {
    method: "GET",
    path: "/documents/:id",
    timeout: "30s",
    memory: "256MB",
    concurrency: 2, // Caps parallel instances to avoid runaway costs
    cors: {
      allowOrigins: ["https://myfrontend.vercel.app"],
      allowHeaders: ["Content-Type", "Authorization"],
    },
  },
  async ({ id }: { id: string }) => {
    return await ehrTable.get({ PK: `DOC#${id}`, SK: "METADATA" });
  }
);

// 5. Long-Running LLM Analysis Endpoint via Lambda Function URL
export const analyzeClinicalDoc = api(
  {
    method: "POST",
    path: "/analyze",
    ingress: "function-url", // Direct HTTPS URL: bypasses API Gateway's 30s limit
    timeout: "300s",         // 5 minutes for heavy processing
    memory: "1024MB",
  },
  async ({ docId }: { docId: string }) => {
    const text = await documentsBucket.getText(`documents/${docId}.txt`);
    return { docId, analyzed: true };
  }
);

// 6. Queue Worker with batch size & concurrency cap
export const processAnnotation = annotationQueue.consumer(
  {
    batchSize: 5,
    timeout: "120s",
    concurrency: 2, // Hard cap on parallel LLM processing
  },
  async (event) => {
    console.log("Processing clinical document:", event);
  }
);
```

---

## 🏗️ Compiler Architecture & Artifacts

```
TypeScript Source Code
          │
          ▼
   [ AST Analysis ] (ts-morph / TypeScript Compiler API)
          │  • Scans api(), Table, Bucket, Queue, Secret declarations
          │  • Extracts in-code configs (timeout, concurrency, stream, etc.)
          │
          ▼
   [ Intermediate Representation (IR) ] (Serverless Topology Graph)
          │
   ┌──────┴──────────────────────────────────────┐
   ▼                                             ▼
[ Lambda Bundler ] (esbuild)            [ Infrastructure Synthesizer ]
   │  • Virtual entrypoint adapters                │  • API Gateway v2 & Function URLs
   │  • Tree-shaken Node 20 ESM                    │  • DynamoDB Tables, Streams & GSIs
   │  • Pre-installed @aws-sdk/* externals         │  • SQS Queues, DLQs & RedrivePolicy
   ▼                                               ▼
.syncploy/build/*/index.mjs             .syncploy/template.json (CloudFormation)
```

### Final Output Layout
```text
my-app/
├── src/
│   └── index.ts
└── .syncploy/
    ├── template.json      <-- AWS CloudFormation template (parsed natively by AWS)
    └── build/             <-- Standalone, tree-shaken Lambda bundles
        ├── getDocument/
        │   └── index.mjs
        ├── analyzeClinicalDoc/
        │   └── index.mjs
        └── processAnnotation/
            └── index.mjs
```

---

## 🚀 CLI Commands

Install and run within any Bun/Node project:

### 1. Build & Synthesize
Compiles TypeScript, bundles Lambdas, and emits the CloudFormation template:
```bash
syncploy build
```

### 2. Local Development Simulator
Starts an in-memory HTTP server that routes incoming requests directly to your bundled Lambda handlers locally, giving you instant hot reload without deploying:
```bash
syncploy dev --port 4000
```

### 3. Deploy to AWS
Deploys the synthesized CloudFormation stack directly to AWS:
```bash
syncploy deploy --stage dev
```

---

## 📦 Monorepo Structure

Managed with [Bun](https://bun.sh):

```
syncploy/
├── packages/
│   ├── sdk/         # @syncploy/sdk: Typed runtime & AST marker primitives (api, Table, Bucket, Queue, Secret)
│   ├── compiler/    # @syncploy/compiler: AST parser, IR builder, IAM synthesizer, esbuild bundler
│   └── cli/         # syncploy CLI (build, dev, deploy)
├── examples/
│   └── basic-app/   # Working reference serverless app
└── README.md
```

---

## ⚡ Performance

Integration tests and build pipeline run in sub-second times:
* **AST Parsing & Extraction**: ~10ms
* **Lambda Bundling & CloudFormation Synthesis**: ~15–25ms
* **Total Build Time**: `< 100ms`

```bash
$ bun test
 4 pass | 0 fail | 42 expect() calls [133.00ms]
```

---

## 🗺️ Roadmap

- [x] **Monorepo setup & Bun workspaces**
- [x] **AST Parser**: `ts-morph` scanner for `api()`, `Table`, `Bucket`, `Queue`
- [x] **In-Code Configurability**: Lambda memory/timeout/concurrency, DynamoDB streams/GSIs, SQS DLQs
- [x] **Virtual Entrypoint Generator**: AWS `APIGatewayProxyEventV2` & SQS batch adapter
- [x] **Lambda Bundler**: Parallel tree-shaken Node 20 ESM packaging via `esbuild`
- [x] **CloudFormation Synthesizer**: Generates valid AWS CloudFormation JSON
- [x] **Local Dev Simulator**: `syncploy dev` local HTTP server
- [x] **Lambda Function URL Synthesizer**: Dedicated `AWS::Lambda::Url` emission
- [x] **Runtime SDK Clients**: Embedded `@aws-sdk` clients for `table.get()`, `bucket.getText()`, `queue.send()`
- [ ] **S3 EventBridge Pipeline**: Auto-synthesizing S3 `objectCreated` rules targeting SQS
- [ ] **EHR-backend Migration**: Port full `EHR-backend` application to Syncploy

---

## 📄 License

MIT
