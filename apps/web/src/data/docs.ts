export interface DocItem {
  slug: string;
  title: string;
  description: string;
  category: "Getting Started" | "Core Constructs" | "Compiler & Safety" | "CLI Reference";
  content: string;
}

export const DOCS_DATA: DocItem[] = [
  {
    slug: "introduction",
    title: "Introduction to Syncploy",
    category: "Getting Started",
    description: "An overview of Infrastructure-from-Code (IfC) for pure AWS Serverless.",
    content: `
# Introduction to Syncploy

Syncploy is an **Infrastructure-from-Code (IfC)** compiler and runtime SDK designed exclusively for **pure AWS Serverless** in TypeScript.

Unlike heavy multi-language abstraction tools (such as AWS CDK or Pulumi) that require complex declarative graphs and separate synthesis runtimes, or traditional frameworks (like Serverless Framework) that require thousands of lines of handwritten YAML, Syncploy infers your cloud topology directly from your application logic.

\`\`\`typescript
import { Table, Queue, api } from "@syncploy/sdk";

export const ordersTable = new Table("orders", {
  partitionKey: { name: "id", type: "string" },
});

export const orderQueue = new Queue("order-processing");

export const checkoutApi = api(
  { path: "/checkout", method: "POST", ingress: "function-url" },
  async (req) => {
    const order = await req.json();
    await ordersTable.put(order);
    await orderQueue.send({ orderId: order.id });
    return Response.json({ success: true });
  }
);
\`\`\`

## Key Highlights

- **Pure AWS Serverless**: First-class support for Lambda Function URLs, DynamoDB Single-Table, S3, SQS, SNS, Kinesis Firehose, and Cognito.
- **Denial-of-Wallet (DoW) & Infinite Loop Shield**: Static compile-time detection of event-driven infinite loops (e.g., Table -> DynamoDB Stream -> Table) and unbounded concurrency before code is pushed to AWS.
- **Brownfield Adoption & 0-Replacement Parity**: Seamlessly adopt existing AWS SAM and CloudFormation stacks with \`syncploy adopt\` and verify zero data-loss replacements with \`syncploy diff\`.
- **Least-Privilege Policy Generation**: Automatically synthesizes minimal IAM deployment policies for CI/CD runners (\`syncploy policy\`) with zero security debt.
- **Clean 4 Healthcare Compliance**: Out-of-the-box support for HIPAA ObjectLock audit trails and admin-only Cognito authentication defaults.
`,
  },
  {
    slug: "installation",
    title: "Installation & Setup",
    category: "Getting Started",
    description: "How to add Syncploy to an existing project or create a new one.",
    content: `
# Installation & Setup

Syncploy consists of two primary packages:
1. **\`@syncploy/sdk\`**: Lightweight runtime SDK providing type-safe cloud construct definitions and auto-wired clients.
2. **\`syncploy\` & \`@syncploy/compiler\`**: Fast CLI and AST compiler powered by \`ts-morph\` and \`esbuild\`.

## 1. Install Dependencies

Using **Bun** (recommended):
\`\`\`bash
bun add @syncploy/sdk
bun add -d syncploy @syncploy/compiler
\`\`\`

Using **npm**:
\`\`\`bash
npm install @syncploy/sdk
npm install --save-dev syncploy @syncploy/compiler
\`\`\`

## 2. Recommended \`package.json\` Scripts

Add Syncploy CLI commands to your \`package.json\`:

\`\`\`json
{
  "scripts": {
    "build": "syncploy build",
    "diff": "syncploy diff",
    "policy": "syncploy policy -s my-stack-name"
  }
}
\`\`\`

## 3. Project Configuration

Syncploy reads project settings automatically from your TypeScript code, optional \`.env\` file, and existing \`samconfig.toml\` (if adopting SAM).
`,
  },
  {
    slug: "construct-auth",
    title: "Auth (Amazon Cognito)",
    category: "Core Constructs",
    description: "Clean 4 healthcare-compliant Cognito UserPool and UserPoolClient construct.",
    content: `
# Auth (Amazon Cognito)

The \`Auth\` construct synthesizes \`AWS::Cognito::UserPool\` and \`AWS::Cognito::UserPoolClient\` with **Clean 4 Healthcare Compliance** defaults.

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

## Automatic Environment Variable Injection

Whenever an \`Auth\` construct is declared in your infrastructure, the Syncploy compiler **automatically injects**:
- \`COGNITO_USER_POOL_ID: !Ref <LogicalId>\`
- \`COGNITO_CLIENT_ID: !Ref <ClientLogicalId>\`

into every synthesized Lambda function environment.

## Runtime Accessors

\`\`\`typescript
import { ehrAuth } from "./infra";

const poolId = ehrAuth.userPoolId;
const clientId = ehrAuth.userPoolClientId;
const arn = ehrAuth.userPoolArn;
\`\`\`
`,
  },
  {
    slug: "construct-table",
    title: "Table (DynamoDB Single-Table)",
    category: "Core Constructs",
    description: "DynamoDB Single-Table construct with streams, GSIs, and ElectroDB support.",
    content: `
# Table (DynamoDB Single-Table)

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
    SKIndex: {
      partitionKey: { name: "SK", type: "string" },
      sortKey: { name: "PK", type: "string" },
      projection: "ALL",
    },
    GSI1Index: {
      partitionKey: { name: "GSI1PK", type: "string" },
      sortKey: { name: "GSI1SK", type: "string" },
      projection: "ALL",
    },
  },
});
\`\`\`

## Stream Processing

Connect a serverless stream worker with concurrency limits:

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
`,
  },
  {
    slug: "construct-bucket",
    title: "Bucket (Amazon S3)",
    category: "Core Constructs",
    description: "Amazon S3 buckets with ObjectLock compliance, EventBridge routing, and public blocks.",
    content: `
# Bucket (Amazon S3)

Provisions secure S3 buckets with global encryption, public access blocking, and HIPAA Object Lock.

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
    days: 1,
  },
  publicAccessBlock: true,
});
\`\`\`

## Event Routing

Route S3 events directly to SQS queues with prefix filtering:

\`\`\`typescript
documentsBucket.on("objectCreated", annotationQueue, {
  prefix: "documents/",
});
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

\`\`\`typescript
import { Queue } from "@syncploy/sdk";

export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "AnnotationDLQ",
  },
});

export const annotationWorker = annotationQueue.consumer(
  {
    batchSize: 5,
    timeout: "30s", // Must be strictly <= 1/6 visibilityTimeout
    concurrency: 2,
  },
  async (batch) => {
    // Process incoming SQS records
  }
);
\`\`\`
`,
  },
  {
    slug: "safety-rails",
    title: "Safety Rails & Loop Shield",
    category: "Compiler & Safety",
    description: "Compile-time detection of infinite recursion loops and Denial-of-Wallet vectors.",
    content: `
# Safety Rails & Loop Shield

Syncploy's compiler inspects your application's Abstract Syntax Tree (AST) to identify hazardous serverless patterns **before you deploy**.

## 1. Infinite Recursion Loop Prevention

Event-driven loops (e.g. Table Stream Worker writing back to the same Table) cause exponential invocation spikes and thousands of dollars in surprise AWS charges.

Syncploy statically models write mutations (\`table.put\`, \`queue.send\`, \`bucket.upload\`) and aborts compilation if a cycle is found:

\`\`\`text
✖ [ERR_RECURSIVE_LOOP] in src/workers/stream.ts
  • Infinite recursion loop detected: Table 'ehr' -> Stream Consumer 'auditWorker' -> Table 'ehr'.
  • This event-driven cycle causes continuous self-amplifying Lambda invocations and exponential Denial-of-Wallet.
\`\`\`

## 2. Denial-of-Wallet (DoW) Auditing

Syncploy checks:
- **Uncapped Concurrency**: Flags public Function URLs and Stream Consumers lacking \`concurrency: <number>\`.
- **SQS Visibility Mismatches**: Verifies that \`visibilityTimeout\` is at least 6x the consumer \`timeout\` to eliminate poison pill duplication.
- **Missing DLQs**: Warns if a queue with active consumers lacks a configured Dead Letter Queue.
`,
  },
  {
    slug: "brownfield-adoption",
    title: "Brownfield Adoption & Diff",
    category: "Compiler & Safety",
    description: "Zero-replacement migration from existing AWS SAM or CloudFormation templates.",
    content: `
# Brownfield Adoption & Diff

Migrating existing production applications to an Infrastructure-from-Code framework is historically terrifying because frameworks often change logical IDs or physical names, triggering destructive resource recreation.

Syncploy guarantees **Zero Stateful Replacements**.

## 1. Automatic Adoption (\`syncploy adopt\`)

Generate type-safe Syncploy code from an existing SAM template:

\`\`\`bash
syncploy adopt template.yaml -c samconfig.toml -o src/infra.ts
\`\`\`

## 2. Pre-Flight Diff Engine (\`syncploy diff\`)

Compare synthesized CloudFormation against your existing template or deployed AWS stack:

\`\`\`bash
syncploy diff . -a template.yaml --check-replacement
\`\`\`

If any stateful resource (DynamoDB Table, S3 Bucket, Cognito UserPool) would be destroyed and recreated, Syncploy halts deployment with an error.
`,
  },
  {
    slug: "cli-reference",
    title: "CLI Command Reference",
    category: "CLI Reference",
    description: "Complete reference for syncploy build, diff, adopt, and policy commands.",
    content: `
# CLI Command Reference

### \`syncploy build [dir]\`
Compiles TypeScript application code into \`.syncploy/template.json\` and bundles Lambda functions into \`.syncploy/build/\`.

### \`syncploy diff [dir] -a <template>\`
Compares synthesized infrastructure against an existing CloudFormation or SAM template.
- \`-a, --against <file>\`: Template to diff against.
- \`--check-replacement\`: Exits with error code if any stateful resource would be replaced.

### \`syncploy adopt <template> -o <file>\`
Adopts an existing SAM/CloudFormation template into clean TypeScript code.
- \`-o, --out <file>\`: Output path for generated TypeScript.
- \`-c, --config <file>\`: Path to \`samconfig.toml\` to extract parameter overrides.

### \`syncploy policy [dir] -s <stack-name>\`
Generates a minimal, least-privilege IAM deployment policy for CI/CD runners.
- \`-s, --stack-name <name>\`: Target CloudFormation stack name.
- \`-r, --region <region>\`: AWS region (default: \`ap-south-1\`).
- \`-c, --compare <file>\`: Compares and audits an existing policy for dead services and wildcards.
- \`-o, --out <file>\`: Writes clean JSON to disk.
`,
  },
];
