# Introduction & Architecture

Syncploy is a compiler-driven **Infrastructure-from-Code (IfC)** engine and runtime SDK built exclusively for **pure AWS Serverless** in TypeScript.

Instead of writing thousands of lines of handwritten CloudFormation/SAM YAML or managing multi-language imperative graphs (like AWS CDK or Pulumi), you author your application logic in standard TypeScript. The Syncploy compiler statically analyzes your Abstract Syntax Tree (AST), validates event cycles, and deterministically synthesizes 1:1 CloudFormation templates with zero stateful replacements.

```typescript
import { Table, Queue, api } from "@syncploy/sdk";

// 1. Declare stateful serverless constructs
export const ordersTable = new Table("orders", {
  partitionKey: { name: "id", type: "string" },
});

export const orderQueue = new Queue("order-processing", {
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});

// 2. Declare application logic with automatic infrastructure wiring
export const checkoutApi = api(
  { path: "/checkout", method: "POST", ingress: "function-url", concurrency: 50 },
  async (req) => {
    const order = await req.json();
    await ordersTable.put(order);
    await orderQueue.send({ orderId: order.id });
    return Response.json({ success: true, orderId: order.id });
  }
);
```

> [!NOTE]
> When you run `syncploy build`, Syncploy synthesizes an `AWS::Serverless::Function`, `AWS::DynamoDB::Table`, `AWS::SQS::Queue`, and optimal IAM roles without requiring any external cloud accounts or Docker daemons.

> [!IMPORTANT]
> **Project Status: Public Alpha (`v0.1.x`)**  
> Syncploy is currently in active public alpha with the `@syncploy/sdk` package published on [npm](https://www.npmjs.com/package/@syncploy/sdk). While the underlying compiler and runtime are battle-tested in live production workloads (such as our [EHR Annotation Platform Showcase](/docs/ehr-backend-case-study)), APIs and construct ergonomics are actively evolving toward `v1.0`. Early feedback and issue reports are welcome on [GitHub](https://github.com/harsh-vardhhan/syncploy).

---

## How the Compiler Works

The Syncploy compilation pipeline consists of 5 deterministic stages:

1. **AST Parsing (`ts-morph`)**: The compiler parses your TypeScript code without executing it, identifying declared cloud constructs (`Table`, `Queue`, `Bucket`, `Auth`, `api`).
2. **Intermediate Representation (IR)**: An abstract cloud topology graph is generated, mapping every compute handler to its data mutations.
3. **Safety Rails & Cycle Detection**: The compiler checks for infinite event recursion (e.g. Table Stream Worker writing back to the same Table) and Denial-of-Wallet (DoW) risks.
4. **Deterministic Synthesis**: Generates clean, human-readable CloudFormation/SAM templates matching exact logical IDs.
5. **Asset Bundling (`esbuild`)**: Compiles handlers into treeshaken, minified ESM bundles (or native container images) with sub-50ms cold start performance.

---

## Architectural Comparison

| Architectural Capability | Syncploy | AWS CDK | SST (Ion) | Serverless Framework | Terraform |
| --- | --- | --- | --- | --- | --- |
| **Paradigm** | Infrastructure-from-Code | Imperative IaC | Imperative IaC | Declarative YAML | Declarative HCL |
| **Language** | Pure TypeScript | Multi-language | TypeScript / Pulumi | YAML / JSON | HCL |
| **Recursion Shield** | Yes (Compile-Time) | No | No | No | No |
| **Zero-Replacement Diff** | Yes (Automated) | No (Manual diff) | No | No | Yes (Plan preview) |
| **IAM Policy Generator** | Yes (`syncploy policy`) | No | No | No | No |
| **Cold Start Overhead** | Sub-50ms (Pure ESM) | Standard | Standard | Standard | N/A |
| **Vendor Lock-in** | Zero (1:1 CFN Ejection) | AWS proprietary | Pulumi Cloud | Serverless Dashboard | HashiCorp |

---

## Core Design Principles

- **Pure AWS Serverless**: Compute and storage scale to zero ($0.00/mo idle cost). No VPC NAT gateways, no idle EC2 instances.
- **Enterprise Security Standards**: Production security defaults baked-in (immutable S3 ObjectLock audit trails, strict Cognito authentication, AES-256 encryption).
- **100% Ejection Freedom**: You own the output. At any time, export standard AWS SAM/CloudFormation templates and deploy via vanilla AWS CLI.
