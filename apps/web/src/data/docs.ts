export interface DocItem {
  slug: string;
  title: string;
  description: string;
  category: "Getting Started" | "Core Constructs" | "Compiler & Safety" | "CLI & Operations";
  content: string;
}

export const DOCS_DATA: DocItem[] = [
  // =========================================================================
  // CATEGORY 1: GETTING STARTED
  // =========================================================================
  {
    slug: "introduction",
    title: "Introduction & Architecture",
    category: "Getting Started",
    description: "An overview of Infrastructure-from-Code (IfC) for pure AWS Serverless.",
    content: `
# Introduction & Architecture

Syncploy is a compiler-driven **Infrastructure-from-Code (IfC)** engine and runtime SDK built exclusively for **pure AWS Serverless** in TypeScript.

Instead of writing thousands of lines of handwritten CloudFormation/SAM YAML or managing multi-language imperative graphs (like AWS CDK or Pulumi), you author your application logic in standard TypeScript. The Syncploy compiler statically analyzes your Abstract Syntax Tree (AST), validates event cycles, and deterministically synthesizes 1:1 CloudFormation templates with zero stateful replacements.

\`\`\`typescript
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
\`\`\`

> [!NOTE]
> When you run \`syncploy build\`, Syncploy synthesizes an \`AWS::Serverless::Function\`, \`AWS::DynamoDB::Table\`, \`AWS::SQS::Queue\`, and optimal IAM roles without requiring any external cloud accounts or Docker daemons.

---

## How the Compiler Works

The Syncploy compilation pipeline consists of 5 deterministic stages:

1. **AST Parsing (\`ts-morph\`)**: The compiler parses your TypeScript code without executing it, identifying declared cloud constructs (\`Table\`, \`Queue\`, \`Bucket\`, \`Auth\`, \`api\`).
2. **Intermediate Representation (IR)**: An abstract cloud topology graph is generated, mapping every compute handler to its data mutations.
3. **Safety Rails & Cycle Detection**: The compiler checks for infinite event recursion (e.g. Table Stream Worker writing back to the same Table) and Denial-of-Wallet (DoW) risks.
4. **Deterministic Synthesis**: Generates clean, human-readable CloudFormation/SAM templates matching exact logical IDs.
5. **Asset Bundling (\`esbuild\`)**: Compiles handlers into treeshaken, minified ESM bundles (or native container images) with sub-50ms cold start performance.

---

## Architectural Comparison

| Architectural Capability | Syncploy | AWS CDK | SST (Ion) | Serverless Framework | Terraform |
| --- | --- | --- | --- | --- | --- |
| **Paradigm** | Infrastructure-from-Code | Imperative IaC | Imperative IaC | Declarative YAML | Declarative HCL |
| **Language** | Pure TypeScript | Multi-language | TypeScript / Pulumi | YAML / JSON | HCL |
| **Recursion Shield** | Yes (Compile-Time) | No | No | No | No |
| **Zero-Replacement Diff** | Yes (Automated) | No (Manual diff) | No | No | Yes (Plan preview) |
| **IAM Policy Generator** | Yes (\`syncploy policy\`) | No | No | No | No |
| **Cold Start Overhead** | Sub-50ms (Pure ESM) | Standard | Standard | Standard | N/A |
| **Vendor Lock-in** | Zero (1:1 CFN Ejection) | AWS proprietary | Pulumi Cloud | Serverless Dashboard | HashiCorp |

---

## Core Design Principles

- **Pure AWS Serverless**: Compute and storage scale to zero ($0.00/mo idle cost). No VPC NAT gateways, no idle EC2 instances.
- **Enterprise Security Standards**: Production security defaults baked-in (immutable S3 ObjectLock audit trails, strict Cognito authentication, AES-256 encryption).
- **100% Ejection Freedom**: You own the output. At any time, export standard AWS SAM/CloudFormation templates and deploy via vanilla AWS CLI.
`,
  },
  {
    slug: "installation",
    title: "Installation & Tooling",
    category: "Getting Started",
    description: "Setting up Syncploy, TypeScript compiler options, and recommended project layouts.",
    content: `
# Installation & Tooling

Syncploy is distributed as two lightweight npm packages:
- **\`@syncploy/sdk\`**: Runtime constructs and zero-dependency cloud clients used in your application code.
- **\`syncploy\` / \`@syncploy/compiler\`**: The CLI and compiler engine used during build, diff, adopt, and deployment.

---

## 1. Package Installation

Using **Bun** (recommended for fastest builds):
\`\`\`bash
bun add @syncploy/sdk
bun add -d syncploy @syncploy/compiler
\`\`\`

Using **npm**:
\`\`\`bash
npm install @syncploy/sdk
npm install --save-dev syncploy @syncploy/compiler
\`\`\`

Using **pnpm**:
\`\`\`bash
pnpm add @syncploy/sdk
pnpm add -D syncploy @syncploy/compiler
\`\`\`

---

## 2. TypeScript Configuration (\`tsconfig.json\`)

Syncploy expects modern ECMAScript module resolution. Ensure your \`tsconfig.json\` includes:

\`\`\`json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
\`\`\`

---

## 3. Recommended Project Layout

Syncploy works seamlessly with single microservices, modular apps, or monorepos:

\`\`\`text
my-serverless-app/
├── package.json
├── tsconfig.json
├── .syncploy/               # Generated CloudFormation & bundled assets
│   ├── template.json
│   └── build/
├── src/
│   ├── infra.ts             # Cloud constructs (Table, Queue, Auth, Bucket)
│   ├── api/                 # Public HTTP endpoints
│   │   ├── checkout.ts
│   │   └── webhooks.ts
│   └── workers/             # Asynchronous stream & queue workers
│       ├── order-worker.ts
│       └── audit-worker.ts
\`\`\`

---

## 4. \`package.json\` Scripts

Add Syncploy workflow commands to your \`package.json\`:

\`\`\`json
{
  "scripts": {
    "build": "syncploy build",
    "diff": "syncploy diff . -a template.yaml --check-replacement",
    "policy": "syncploy policy . -s my-production-stack -o deploy-policy.json",
    "test": "bun test"
  }
}
\`\`\`
`,
  },
  {
    slug: "quickstart",
    title: "5-Minute Quickstart",
    category: "Getting Started",
    description: "Build, compile, and test your first type-safe serverless microservice in 5 minutes.",
    content: `
# 5-Minute Quickstart

In this walkthrough, we will build a production-grade **Patient Document Annotation API** with a DynamoDB single-table, an SQS processing queue with DLQ, and an authenticated Lambda Function URL.

---

## Step 1: Initialize Project

\`\`\`bash
mkdir my-serverless-service && cd my-serverless-service
bun init -y
bun add @syncploy/sdk
bun add -d syncploy @syncploy/compiler
\`\`\`

---

## Step 2: Define Infrastructure (\`src/infra.ts\`)

Create \`src/infra.ts\` to declare your serverless constructs:

\`\`\`typescript
import { Table, Queue, Auth } from "@syncploy/sdk";

// HIPAA-compliant Cognito Authentication
export const auth = new Auth("ehr-auth", {
  logicalId: "EhrUserPool",
  adminOnly: true,
  passwordPolicy: { minLength: 12 },
});

// Single-Table DynamoDB database with pay-per-request billing
export const patientTable = new Table("patients", {
  logicalId: "PatientTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
});

// Resilient SQS queue with 3x retry DLQ
export const processingQueue = new Queue("annotations", {
  logicalId: "AnnotationQueue",
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});
\`\`\`

---

## Step 3: Implement API Handler (\`src/app.ts\`)

Create \`src/app.ts\` with your application logic:

\`\`\`typescript
import { api } from "@syncploy/sdk";
import { patientTable, processingQueue, auth } from "./infra";

export const uploadAnnotation = api(
  {
    path: "/annotations",
    method: "POST",
    ingress: "function-url",
    concurrency: 25, // DoW Protection: Caps max concurrent executions
    memory: 512,
  },
  async (req) => {
    const body = await req.json();

    // 1. Persist record to DynamoDB
    const record = {
      PK: \`PATIENT#\${body.patientId}\`,
      SK: \`DOC#\${Date.now()}\`,
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };
    await patientTable.put(record);

    // 2. Queue asynchronous annotation task
    await processingQueue.send({
      patientId: body.patientId,
      documentId: record.SK,
    });

    return Response.json({
      status: "queued",
      recordId: record.SK,
      poolId: auth.userPoolId, // Auto-injected Cognito pool ID
    });
  }
);
\`\`\`

---

## Step 4: Run Compilation & Safety Audit

\`\`\`bash
bunx syncploy build
\`\`\`

Syncploy analyzes your AST, builds the Intermediate Representation, verifies that no circular recursion exists, and outputs:

\`\`\`text
✔ Parsed 3 constructs in src/infra.ts
✔ Verified 0 infinite recursion cycles
✔ Verified 0 Denial-of-Wallet concurrency leaks
✔ Synthesized CloudFormation template to .syncploy/template.json
✔ Bundled uploadAnnotation Lambda asset (14.2 KB ESM)
\`\`\`

> [!TIP]
> Inspect the synthesized \`.syncploy/template.json\` to see 100% standard AWS CloudFormation with zero custom runtime dependencies.
`,
  },

  // =========================================================================
  // CATEGORY 2: CORE CONSTRUCTS
  // =========================================================================
  {
    slug: "construct-api",
    title: "api & Lambda Ingress",
    category: "Core Constructs",
    description: "Configuring Lambda Function URLs, API Gateway HTTP v2, ESM packaging, and container images.",
    content: `
# \`api\` & Lambda Ingress

The \`api\` construct defines serverless HTTP endpoints using standard Web Fetch API conventions (\`Request\` and \`Response\`).

\`\`\`typescript
import { api } from "@syncploy/sdk";

export const myEndpoint = api(
  {
    path: "/documents/:id",
    method: "GET",
    ingress: "function-url",
    memory: 1024,
    timeout: "15s",
    concurrency: 50,
  },
  async (req) => {
    return Response.json({ message: "Hello from Syncploy!" });
  }
);
\`\`\`

---

## Ingress Modes: Function URLs vs API Gateway

Syncploy supports two distinct ingress modes:

| Ingress Mode | Description | Latency Overhead | Pricing | Best For |
| --- | --- | --- | --- | --- |
| \`"function-url"\` | Direct AWS Lambda Function URL | **Sub-50ms** | **$0.00** (Free direct invocation) | Microservices, High-throughput APIs, Webhooks |
| \`"api-gateway"\` | Amazon API Gateway HTTP API v2 | ~70-120ms | $1.00 / million requests | Legacy path prefix routing, custom authorizers |

> [!TIP]
> Function URLs eliminate the \$1.00/million API Gateway toll entirely while removing cold start routing hops.

---

## Configuration Reference

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| \`path\` | \`string\` | \`"/"\` | URL path route |
| \`method\` | \`"GET" \| "POST" \| "PUT" \| "DELETE" \| "PATCH" \| "ANY"\` | \`"GET"\` | HTTP method verb |
| \`ingress\` | \`"function-url" \| "api-gateway"\` | \`"function-url"\` | Ingress routing mechanism |
| \`memory\` | \`number\` | \`256\` | Memory allocation in MB (128 to 10240) |
| \`timeout\` | \`string \| number\` | \`"30s"\` | Maximum execution duration |
| \`concurrency\` | \`number\` | \`undefined\` | Reserved concurrency cap (prevents Denial-of-Wallet) |
| \`cors\` | \`boolean \| CorsOptions\` | \`true\` | Automatic CORS preflight headers |
| \`packageType\` | \`"Zip" \| "Image"\` | \`"Zip"\` | ESM bundle vs Native Docker container image |

---

## Container Packaging (\`packageType: "Image"\`)

When you require custom native binaries, PyTorch models, or LibreOffice tools inside Lambda:

\`\`\`typescript
export const docxConverter = api(
  {
    path: "/convert",
    method: "POST",
    packageType: "Image",
    dockerfile: "./Dockerfile",
    memory: 3008,
    timeout: "120s",
  },
  async (req) => {
    // Executes inside your custom Docker container
    return Response.json({ status: "converted" });
  }
);
\`\`\`
`,
  },
  {
    slug: "construct-auth",
    title: "Auth (Amazon Cognito)",
    category: "Core Constructs",
    description: "Production-ready Amazon Cognito UserPool and UserPoolClient construct.",
    content: `
# Auth (Amazon Cognito)

The \`Auth\` construct synthesizes \`AWS::Cognito::UserPool\` and \`AWS::Cognito::UserPoolClient\` with **Enterprise Security** defaults.

\`\`\`typescript
import { Auth } from "@syncploy/sdk";

export const ehrAuth = new Auth("ehr", {
  logicalId: "EhrUserPool",
  adminOnly: true,              // Enforces admin-created accounts (blocks public self-registration)
  signInMethod: "email",        // Validates email as primary username
  passwordPolicy: {
    minLength: 12,              // HIPAA compliance standard
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
  client: {
    clientLogicalId: "EhrUserPoolClient",
    generateSecret: false,      // SPA and Web App friendly
    explicitAuthFlows: [
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH",
      "ALLOW_USER_PASSWORD_AUTH",
    ],
    preventUserExistenceErrors: true, // Prevents email enumeration attacks
  },
});
\`\`\`

---

## Automatic Environment Variable Injection

When an \`Auth\` construct is declared in your project, the Syncploy compiler **automatically injects**:
- \`COGNITO_USER_POOL_ID: !Ref <LogicalId>\`
- \`COGNITO_CLIENT_ID: !Ref <ClientLogicalId>\`
- \`COGNITO_USER_POOL_ARN: !GetAtt <LogicalId>.Arn\`

into every synthesized Lambda function environment. You never have to manually wire CloudFormation references.

---

## Runtime Accessors

\`\`\`typescript
import { ehrAuth } from "./infra";

// Resolved seamlessly from injected environment variables:
const poolId = ehrAuth.userPoolId;
const clientId = ehrAuth.userPoolClientId;
const arn = ehrAuth.userPoolArn;
\`\`\`

---

## Parameters Reference

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| \`logicalId\` | \`string\` | \`"\${name}UserPool"\` | CloudFormation logical ID |
| \`adminOnly\` | \`boolean\` | \`false\` | If \`true\`, blocks public self-registration |
| \`signInMethod\` | \`"email" \| "username" \| "phone"\` | \`"email"\` | Primary login credential attribute |
| \`passwordPolicy.minLength\` | \`number\` | \`12\` | Minimum password character length |
| \`client.preventUserExistenceErrors\` | \`boolean\` | \`true\` | Returns generic errors to prevent user scraping |
`,
  },
  {
    slug: "construct-table",
    title: "Table (DynamoDB & ElectroDB)",
    category: "Core Constructs",
    description: "DynamoDB Single-Table construct with streams, GSIs, and ElectroDB support.",
    content: `
# Table (DynamoDB & ElectroDB)

The \`Table\` construct provisions an \`AWS::DynamoDB::Table\` optimized for Single-Table Design with pay-per-request billing, point-in-time recovery, and stream processing.

\`\`\`typescript
import { Table } from "@syncploy/sdk";

export const ehrTable = new Table("ehr", {
  logicalId: "EhrTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  indexes: {
    GSI1: {
      partitionKey: { name: "GSI1PK", type: "string" },
      sortKey: { name: "GSI1SK", type: "string" },
      projection: "ALL",
    },
  },
});
\`\`\`

---

## ElectroDB First-Class Integration

Syncploy has opinionated first-class support for [ElectroDB](https://electrodb.dev).

When you define ElectroDB entities, Syncploy:
1. Automatically infers the table primary key attributes.
2. Combines and unions all GSIs across all entities in your service.
3. Validates schema consistency at compile-time to prevent conflicting index declarations.

\`\`\`typescript
import { Entity } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const PatientEntity = new Entity({
  model: { entity: "patient", version: "1", service: "ehr" },
  attributes: {
    patientId: { type: "string", required: true },
    clinicId: { type: "string", required: true },
    fullName: { type: "string", required: true },
  },
  indexes: {
    primary: { pk: { field: "PK", composite: ["clinicId"] }, sk: { field: "SK", composite: ["patientId"] } },
    byPatient: { index: "GSI1", pk: { field: "GSI1PK", composite: ["patientId"] } },
  },
});
\`\`\`

> [!TIP]
> Syncploy detects \`PatientEntity\` and automatically provisions \`EhrTable\` with \`PK\`, \`SK\`, and \`GSI1\` without duplicate manual YAML declarations!

---

## Stream Processing & Concurrency Protection

Connect an asynchronous Lambda stream worker directly to changes on the table:

\`\`\`typescript
export const auditStreamWorker = ehrTable.stream(
  {
    batchSize: 100,
    startingPosition: "LATEST",
    concurrency: 5, // Capped to prevent shard split DDoS attacks
  },
  async (record) => {
    // Process DynamoDB stream event
  }
);
\`\`\`

---

## Runtime Client API

\`\`\`typescript
// Type-safe runtime operations:
await ehrTable.put({ PK: "CLINIC#1", SK: "DOC#10", status: "PENDING" });
const item = await ehrTable.get({ PK: "CLINIC#1", SK: "DOC#10" });
await ehrTable.delete({ PK: "CLINIC#1", SK: "DOC#10" });
\`\`\`
`,
  },
  {
    slug: "construct-bucket",
    title: "Bucket (Amazon S3)",
    category: "Core Constructs",
    description: "Amazon S3 buckets with ObjectLock compliance, EventBridge routing, and public blocks.",
    content: `
# Bucket (Amazon S3)

The \`Bucket\` construct provisions secure, enterprise-grade Amazon S3 object storage with enforced encryption and public access blocks.

\`\`\`typescript
import { Bucket } from "@syncploy/sdk";

// Standard medical document bucket with EventBridge notifications
export const documentsBucket = new Bucket("documents", {
  logicalId: "DocumentsBucket",
  eventBridge: true,
  publicAccessBlock: true,
});

// HIPAA compliance audit bucket with immutable Object Lock
export const auditLogsBucket = new Bucket("audit-logs", {
  logicalId: "EhrAuditLogsBucket",
  accountScoped: true,
  objectLock: {
    mode: "COMPLIANCE",
    days: 365,
  },
  publicAccessBlock: true,
});
\`\`\`

---

## Event Routing & Notifications

Route S3 file upload events directly to an SQS queue with prefix and suffix filters:

\`\`\`typescript
import { annotationQueue } from "./queue";

documentsBucket.on("objectCreated", annotationQueue, {
  prefix: "clinical-notes/",
  suffix: ".pdf",
});
\`\`\`

---

## Runtime Client API

\`\`\`typescript
// Read and write text:
await documentsBucket.putText("notes/patient-1.txt", "Blood pressure: 120/80");
const text = await documentsBucket.getText("notes/patient-1.txt");

// Read and write binary buffers:
await documentsBucket.putBuffer("scans/xray.png", imageBuffer, "image/png");
const buffer = await documentsBucket.getBuffer("scans/xray.png");

// List files:
const files = await documentsBucket.list({ prefix: "notes/" });
\`\`\`
`,
  },
  {
    slug: "construct-queue",
    title: "Queue & DLQ (Amazon SQS)",
    category: "Core Constructs",
    description: "SQS queues with automatic Dead Letter Queue (DLQ) redrive and worker wiring.",
    content: `
# Queue & DLQ (Amazon SQS)

The \`Queue\` construct provisions resilient message queues with automatic Dead-Letter Queue (DLQ) redrive configurations.

\`\`\`typescript
import { Queue } from "@syncploy/sdk";

export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "AnnotationDLQ",
  },
});
\`\`\`

---

## Connecting Consumers

Attach an asynchronous Lambda consumer with automatic IAM policy synthesis and batch management:

\`\`\`typescript
export const annotationWorker = annotationQueue.consumer(
  {
    batchSize: 10,
    timeout: "30s",  // Must be strictly <= 1/6 visibilityTimeout
    concurrency: 5,  // Reserved concurrency cap
  },
  async (batch) => {
    for (const message of batch) {
      console.log("Processing message:", message.body);
    }
  }
);
\`\`\`

---

## The SQS 6x Visibility Formula

> [!IMPORTANT]
> AWS strongly recommends that SQS \`visibilityTimeout\` be at least **6 times** your consumer Lambda \`timeout\`.

If a consumer takes 30s to process a batch and the queue visibility timeout is only 40s, a minor processing hiccup will release the message back into the queue while the original Lambda is still running, triggering duplicate executions and database collisions.

Syncploy audits this at compile-time and **halts compilation** if \`visibilityTimeout < consumer.timeout\`.

---

## Runtime Client API

\`\`\`typescript
// Send a single message
await annotationQueue.send({ patientId: "123", documentId: "456" });

// Send a batch of messages in one request
await annotationQueue.sendBatch([
  { id: "1", body: { patientId: "123" } },
  { id: "2", body: { patientId: "124" } },
]);
\`\`\`
`,
  },
  {
    slug: "construct-topic-secret",
    title: "Topic & Secret (SNS & Secrets)",
    category: "Core Constructs",
    description: "Fan-out pub/sub messaging with Amazon SNS and audited Secrets Manager integration.",
    content: `
# Topic & Secret (SNS & Secrets)

Manage pub/sub broadcast notifications with \`Topic\` and secure environment secrets with \`Secret\`.

---

## \`Topic\` (Amazon SNS)

Provision pub/sub messaging channels with multi-destination fanout:

\`\`\`typescript
import { Topic, Queue } from "@syncploy/sdk";

export const alertTopic = new Topic("alerts", {
  logicalId: "SystemAlertsTopic",
});

// Subscribe an SQS queue:
export const notificationQueue = new Queue("notifications");
alertTopic.subscribe(notificationQueue);

// Subscribe a Lambda handler directly:
alertTopic.subscribe(async (event) => {
  console.log("Alert received:", event.message);
});
\`\`\`

---

## \`Secret\` (AWS Secrets Manager)

Reference sensitive credentials without hardcoding plaintext tokens in your repository:

\`\`\`typescript
import { Secret, api } from "@syncploy/sdk";

export const stripeKey = new Secret("STRIPE_SECRET_KEY");

export const paymentWebhook = api({ path: "/webhook", method: "POST" }, async (req) => {
  // Secret is securely read from environment at runtime:
  const key = stripeKey.value;
  return Response.json({ success: true });
});
\`\`\`

> [!WARNING]
> Syncploy's compiler inspects all environment variables and flags literal secrets (like \`sk_live_...\` or \`ghp_...\`) as fatal pre-flight build errors.
`,
  },

  // =========================================================================
  // CATEGORY 3: COMPILER, ARCHITECTURE & SAFETY
  // =========================================================================
  {
    slug: "recursion-shield",
    title: "Infinite Recursion Shield",
    category: "Compiler & Safety",
    description: "Compile-time detection of infinite Lambda-DynamoDB and queue event cycles.",
    content: `
# Infinite Recursion Shield

In event-driven architectures, **infinite recursion loops** are the #1 cause of catastrophic surprise cloud bills ($10,000+ overnight charges).

A classic loop occurs when a Lambda function consumes records from a DynamoDB Stream and accidentally writes back to the same table. Each write produces a new stream event, triggering an exponential runaway chain reaction.

\`\`\`typescript
// ❌ HAZARDOUS CODE:
export const badStreamWorker = patientTable.stream({ batchSize: 50 }, async (record) => {
  // BUG: Writing back to the stream source table!
  await patientTable.put({
    id: record.id,
    updatedAt: Date.now(),
  });
});
\`\`\`

---

## How the Shield Works

Syncploy builds a **Static Directed Graph** of your entire architecture during compilation:
1. It tracks all event producers (DynamoDB Streams, S3 EventBridge, SQS Queues, SNS Topics).
2. It tracks all event consumers (Lambda handlers).
3. It inspects handler AST bodies for write mutations (\`table.put\`, \`queue.send\`, \`bucket.upload\`, \`topic.publish\`).
4. It performs **Cycle Detection (Tarjan's strongly connected components algorithm)** across direct and multi-hop paths.

---

## Compiler Diagnostic Output

When a cycle is detected, Syncploy halts compilation immediately before anything touches AWS:

\`\`\`text
✖ [ERR_RECURSIVE_LOOP] in src/workers/stream.ts:
  • Infinite recursion loop detected: 
    Table 'patientTable' -> Stream Consumer 'badStreamWorker' -> Table 'patientTable'
  
  • This event-driven cycle causes continuous self-amplifying Lambda 
    invocations and exponential Denial-of-Wallet (DoW).

✖ Compilation aborted. 0 AWS resources modified.
\`\`\`

---

## Multi-Hop Cycle Detection

Syncploy also detects complex cross-service loops, such as:
\`\`\`text
Table A -> Stream Worker -> Queue B -> Consumer -> Topic C -> Subscriber -> Table A
\`\`\`
`,
  },
  {
    slug: "dow-safety-rails",
    title: "Denial-of-Wallet Safety Rails",
    category: "Compiler & Safety",
    description: "Compile-time audits protecting against DDoS, unreserved concurrency, and poison pill cascades.",
    content: `
# Denial-of-Wallet Safety Rails

Serverless scales automatically — which means an unthrottled API endpoint under DDoS or bot crawling will scale your AWS account to its maximum limit (1,000+ parallel Lambda instances), causing massive financial Denial-of-Wallet (DoW).

Syncploy enforces static safety rails before code is deployed.

---

## Audit Rules

| Rule Code | Severity | Description | Remediation |
| --- | --- | --- | --- |
| \`WARN_DOW_UNRESERVED_CONCURRENCY\` | Warning | Public Function URL has no concurrency limit | Add \`concurrency: <number>\` |
| \`WARN_DOW_STREAM_UNBOUNDED\` | Warning | DynamoDB stream consumer has unbounded concurrency | Configure \`concurrency: <number>\` |
| \`WARN_DOW_MISSING_DLQ\` | Warning | Active SQS queue has no Dead Letter Queue | Configure \`deadLetterQueue: { maxReceiveCount: 3 }\` |
| \`ERR_SQS_VISIBILITY_TIMEOUT_SHORT\` | **Fatal Error** | Queue visibilityTimeout is shorter than consumer timeout | Set \`visibilityTimeout >= 6 * timeout\` |

---

## Hardening Examples

### 1. Capping Public Function URLs

\`\`\`typescript
// ✅ PROTECTED: Capped at 50 parallel instances
export const publicApi = api(
  { path: "/search", ingress: "function-url", concurrency: 50 },
  async (req) => {
    return Response.json({ results: [] });
  }
);
\`\`\`

### 2. Preventing Poison Pill Cascades with DLQs

\`\`\`typescript
// ✅ PROTECTED: Messages failing 3 times are quarantined in the DLQ
export const workQueue = new Queue("orders", {
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "OrdersDeadLetterQueue",
  },
});
\`\`\`
`,
  },
  {
    slug: "least-privilege-iam",
    title: "Least-Privilege IAM Policy Generator",
    category: "Compiler & Safety",
    description: "Synthesizing minimal IAM deployment policies for GitHub Actions and CI/CD runners.",
    content: `
# Least-Privilege IAM Policy Generator

Configuring IAM deployment permissions for CI/CD runners (like GitHub Actions) is one of the most frustrating parts of AWS engineering:
- Granting \`AdministratorAccess\` violates compliance standards (HIPAA, SOC2, ISO27001).
- Crafting policies by hand leads to hours of trial-and-error \`403 AccessDenied\` errors.

Syncploy solves this with the \`syncploy policy\` command.

---

## How It Works

Because Syncploy compiles your TypeScript application into an exact CloudFormation template, it knows **every single AWS action and resource ARN** your deployment will ever touch.

\`\`\`bash
syncploy policy . -s ehr-annotation-backend -o deploy-policy.json
\`\`\`

---

## Key Synthesis Features

1. **Dead Service Pruning**: If your code doesn't use API Gateway or CloudFront, permissions for those services are never generated.
2. **Strict ARN Scoping**: Scopes resource permissions down to your exact account, region, and stack name (\`arn:aws:cognito-idp:ap-south-1:<ACCOUNT_ID>:userpool/*\`).
3. **Shadow Action Resolution**: Injects all CloudFormation background actions (such as \`cognito-idp:TagResource\`, \`s3:PutBucketPolicy\`) that AWS requires CloudFormation to invoke under the hood.

---

## Example Generated Policy

\`\`\`json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CognitoUserPoolManagement",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:CreateUserPool",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:TagResource",
        "cognito-idp:ListTagsForResource"
      ],
      "Resource": "arn:aws:cognito-idp:ap-south-1:<ACCOUNT_ID>:userpool/*"
    }
  ]
}
\`\`\`
`,
  },
  {
    slug: "brownfield-adoption",
    title: "Brownfield Adoption & Diff",
    category: "Compiler & Safety",
    description: "Zero-replacement migration from existing AWS SAM or CloudFormation templates.",
    content: `
# Brownfield Adoption & Diff

Migrating existing production applications to an Infrastructure-from-Code framework is historically terrifying: if a framework alters a table's logical ID or physical name, CloudFormation will delete the existing table and recreate an empty one, wiping out production data.

Syncploy guarantees **Zero Stateful Replacements**.

---

## Step 1: Automatic Adoption (\`syncploy adopt\`)

Generate type-safe TypeScript infrastructure directly from your existing SAM or CloudFormation template:

\`\`\`bash
syncploy adopt template.yaml -c samconfig.toml -o src/infra.ts
\`\`\`

Syncploy automatically:
- Preserves all logical IDs (e.g. \`logicalId: "EhrTable"\`).
- Matches exact partition and sort key schemas.
- Preserves parameter overrides from \`samconfig.toml\`.

---

## Step 2: Pre-Flight Verification (\`syncploy diff\`)

Before applying changes, verify 100% equivalence:

\`\`\`bash
syncploy diff . -a template.yaml --check-replacement
\`\`\`

Output preview:
\`\`\`text
🔍 Comparing synthesized template against template.yaml...

Infrastructure Diff Preview:
  = [IN_SYNC] EhrTable (AWS::DynamoDB::Table)
  = [IN_SYNC] EhrUserPool (AWS::Cognito::UserPool)
  = [IN_SYNC] EhrUserPoolClient (AWS::Cognito::UserPoolClient)
  ~ [UPDATE]  EhrBackendFunction (AWS::Serverless::Function -> AWS::Lambda::Function)
      • Migrated from Serverless macro to pure CloudFormation function

Diff Summary:
  0 to replace | 0 data-loss risks | 100% template equivalence verified
\`\`\`

> [!IMPORTANT]
> The \`--check-replacement\` flag exits with error code 1 if any stateful resource (Table, Bucket, UserPool) would be replaced, making it an ideal pre-merge CI/CD gatekeeper.
`,
  },

  // =========================================================================
  // CATEGORY 4: CLI & OPERATIONS
  // =========================================================================
  {
    slug: "testing",
    title: "In-Memory Zero-Mock Testing",
    category: "CLI & Operations",
    description: "Lightning-fast unit and integration testing without Docker or LocalStack.",
    content: `
# In-Memory Zero-Mock Testing

Testing serverless applications typically requires either complex Docker setups (like LocalStack) or brittle mock objects (\`aws-sdk-mock\`).

Syncploy includes an **in-memory simulated runtime harness** directly inside \`@syncploy/sdk/testing\`.

---

## Testing API Handlers

\`\`\`typescript
import { test, expect } from "bun:test";
import { uploadAnnotation } from "../src/app";
import { patientTable, processingQueue } from "../src/infra";

test("creates patient annotation and enqueues task", async () => {
  // Reset in-memory state:
  patientTable.clear();
  processingQueue.clear();

  // Invoke the API handler directly with a Fetch Request:
  const request = new Request("https://api.internal/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId: "P-100", notes: "Normal ECG" }),
  });

  const response = await uploadAnnotation(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.status).toBe("queued");

  // Verify state persisted in-memory:
  const items = await patientTable.query({ PK: "PATIENT#P-100" });
  expect(items.length).toBe(1);

  // Verify queue received the message:
  const messages = processingQueue.getInFlightMessages();
  expect(messages.length).toBe(1);
  expect(messages[0].body.patientId).toBe("P-100");
});
\`\`\`

> [!TIP]
> In-memory tests run in under **5 milliseconds** with zero external network calls or cloud credentials.
`,
  },
  {
    slug: "cli-reference",
    title: "CLI Command Reference",
    category: "CLI & Operations",
    description: "Complete flag and option reference for syncploy build, diff, adopt, policy, and test.",
    content: `
# CLI Command Reference

The \`syncploy\` CLI is the central operational tool for compilation, diffing, adoption, and policy generation.

---

## 1. \`syncploy build\`

Compiles your TypeScript application into CloudFormation templates and bundles Lambda assets.

\`\`\`bash
syncploy build [dir] [options]
\`\`\`

### Options
- \`[dir]\`: Root directory of your TypeScript project (default: \`.\`).
- \`-o, --out <path>\`: Output directory for synthesized templates and assets (default: \`.syncploy\`).
- \`--minify\`: Minifies bundled JavaScript assets with \`esbuild\`.
- \`--sourcemap\`: Generates source maps for Lambda error stack traces.

---

## 2. \`syncploy diff\`

Compares synthesized CloudFormation templates against an existing template or deployed AWS stack.

\`\`\`bash
syncploy diff [dir] [options]
\`\`\`

### Options
- \`-a, --against <file>\`: Path to existing template (e.g. \`template.yaml\` or \`template.json\`).
- \`--check-replacement\`: **Critical CI flag.** Returns exit code 1 if any stateful resource would be replaced.
- \`--json\`: Formats diff preview as structured JSON.

---

## 3. \`syncploy adopt\`

Adopts an existing AWS SAM or CloudFormation template into clean TypeScript code.

\`\`\`bash
syncploy adopt <template-file> [options]
\`\`\`

### Options
- \`-o, --out <file>\`: Path to write generated TypeScript file (default: \`src/infra.ts\`).
- \`-c, --config <file>\`: Path to \`samconfig.toml\` to automatically adopt stack parameters.

---

## 4. \`syncploy policy\`

Synthesizes a minimal, least-privilege IAM deployment policy for CI/CD runners.

\`\`\`bash
syncploy policy [dir] [options]
\`\`\`

### Options
- \`-s, --stack-name <name>\`: Target CloudFormation stack name (**required**).
- \`-r, --region <region>\`: AWS region (default: \`ap-south-1\`).
- \`-c, --compare <file>\`: Audits an existing policy JSON file against optimal compiler policy.
- \`-o, --out <file>\`: Writes policy JSON to disk (e.g. \`deploy-policy.json\`).
`,
  },
];
