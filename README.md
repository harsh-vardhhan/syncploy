# ⚡ Syncploy

> **Infrastructure-from-Code (IfC) Compiler for Pure AWS Serverless.**  
> Write idiomatic TypeScript. Deploy to AWS without writing YAML, Terraform, or manual IAM policies.

---

## 🎯 What is Syncploy?

Syncploy is a static compiler and SDK that analyzes your TypeScript backend code, infers the serverless infrastructure graph, synthesizes least-privilege IAM policies, and generates production-ready AWS CloudFormation templates and Lambda bundles.

### The Problem It Solves
Traditional AWS serverless development forces developers to maintain massive, brittle YAML templates (SAM/Serverless Framework) or imperative CDK scripts, alongside handwritten IAM policies and manual `.env` plumbing.

### The Syncploy Approach
With Syncploy, your TypeScript code **is** your infrastructure definition:

```typescript
import { api, Table, Bucket, Queue } from "@syncploy/sdk";

// Define resources as typed variables
export const ehrTable = new Table("ehr", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
});

export const documentsBucket = new Bucket("documents");
export const workerQueue = new Queue("document-worker");

// Event-driven pipeline
documentsBucket.on("objectCreated", workerQueue, { prefix: "documents/" });

// Queue consumer automatically mapped to an AWS Lambda + EventSourceMapping
export const processDoc = workerQueue.consumer({ batchSize: 5 }, async (event) => {
  const text = await documentsBucket.getText(event.key);
  await ehrTable.put({ PK: `DOC#${event.key}`, text });
});

// API endpoint automatically mapped to API Gateway + AWS Lambda
export const getDoc = api({ method: "GET", path: "/documents/:id" }, async ({ id }) => {
  return await ehrTable.get({ PK: `DOC#${id}`, SK: "METADATA" });
});
```

---

## 🏗️ Architecture

```
TypeScript Source Code
          │
          ▼
   [ AST Analysis ] (ts-morph / TypeScript Compiler API)
          │
          ▼
   [ Intermediate Representation (IR) ] (Serverless Graph: Lambdas, Tables, S3, Queues)
          │
   ┌──────┴──────────────────────────────┐
   ▼                                     ▼
[ Lambda Bundler ] (esbuild)    [ Infrastructure Synthesizer ]
   │                                     │
   ▼                                     ▼
Tree-shaken .mjs bundles         Least-Privilege IAM + CloudFormation JSON
```

---

## 📦 Project Structure

This monorepo is managed with [Bun](https://bun.sh):

```
syncploy/
├── packages/
│   ├── sdk/         # @syncploy/sdk - Runtime & compile-time primitives (api, Table, Bucket, Queue)
│   ├── compiler/    # @syncploy/compiler - AST parser, IR builder, IAM synthesizer, esbuild bundler
│   └── cli/         # syncploy CLI (syncploy build, dev, deploy)
├── examples/        # Real-world examples (including EHR-backend migration)
└── README.md
```

---

## 🗺️ Roadmap

- [x] Initial Monorepo setup (`@syncploy/sdk`, `@syncploy/compiler`, `@syncploy/cli`)
- [ ] **Phase 1: AST Parser & IR**: Parse `api()` declarations and build route catalog
- [ ] **Phase 2: Bundling**: Multi-target Lambda bundling via `esbuild`
- [ ] **Phase 3: Data & Storage**: Extract `Table` (DynamoDB) and `Bucket` (S3) declarations
- [ ] **Phase 4: Static IAM Inference**: Automatic least-privilege IAM policy generation
- [ ] **Phase 5: Event Pipelines**: S3 $\rightarrow$ EventBridge $\rightarrow$ SQS Queue bindings
- [ ] **Phase 6: Dogfooding**: Fully port and deploy `EHR-backend`

---

## 📄 License

MIT
