import fs from "fs";
import path from "path";
import { DOCS_DATA } from "../src/data/docs";

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const DOCS_CONTENT_DIR = path.resolve(__dirname, "../content/docs");
const PUBLIC_DOCS_DIR = path.join(PUBLIC_DIR, "docs");

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DOCS_DIR)) fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });

// 1. Copy individual .md files to public/docs/<slug>.md
for (const doc of DOCS_DATA) {
  const srcFile = path.join(DOCS_CONTENT_DIR, `${doc.slug}.md`);
  const destFile = path.join(PUBLIC_DOCS_DIR, `${doc.slug}.md`);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, destFile);
  } else {
    // If markdown file doesn't exist directly, write from doc.content
    fs.writeFileSync(destFile, doc.content.trim() + "\n", "utf-8");
  }
}
console.log(`✓ Copied ${DOCS_DATA.length} markdown docs to public/docs/*.md`);

// 2. Generate public/llms.txt
const llmsTxtContent = `# Syncploy

> The Terraform for AWS Serverless. Infrastructure-from-Code (IfC) compiler and runtime SDK for TypeScript. Write idiomatic TypeScript; synthesize 1:1 CloudFormation with zero YAML, zero state files, and zero data-loss replacements.

Syncploy is a static compiler and SDK for Pure AWS Serverless. Instead of maintaining handwritten YAML (SAM / Serverless Framework) or imperative multi-language graphs (AWS CDK / Pulumi), developers author application logic in standard TypeScript. The Syncploy compiler statically analyzes the AST (ts-morph), infers the serverless infrastructure graph, validates event cycles, and deterministically synthesizes 1:1 CloudFormation templates with zero stateful replacements.

- GitHub: https://github.com/harsh-vardhhan/syncploy
- npm: https://www.npmjs.com/package/@syncploy/sdk
- Live Showcase: https://ehr-backend-frontend.vercel.app/
- Website: https://www.syncploy.com/
- LLMs Summary: https://www.syncploy.com/llms.txt
- Complete Combined Documentation: https://www.syncploy.com/llms-full.txt

## Quick Start for AI Coding Agents

Install the SDK:
\`\`\`bash
bun add @syncploy/sdk
# or npm install @syncploy/sdk
\`\`\`

Declare infrastructure and logic in TypeScript:
\`\`\`typescript
import { api, Table, Queue, Bucket, Auth } from "@syncploy/sdk";

// 1. Single-Table DynamoDB with zero stateful replacement
export const ordersTable = new Table("orders", {
  logicalId: "OrdersTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
});

// 2. Queue with automatic Dead Letter Queue (DLQ)
export const orderQueue = new Queue("orders", {
  logicalId: "OrderQueue",
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});

// 3. Lambda Ingress via direct Function URL ($0 proxy overhead)
export const checkoutApi = api(
  {
    path: "/checkout",
    method: "POST",
    ingress: "function-url",
    concurrency: 50, // Caps concurrency to prevent Denial-of-Wallet
    cors: { allowOrigins: ["*"] },
  },
  async (req) => {
    const body = await req.json();
    await ordersTable.put(body);
    await orderQueue.send({ orderId: body.id });
    return Response.json({ success: true, orderId: body.id });
  }
);
\`\`\`

Compile to CloudFormation and Lambda bundles:
\`\`\`bash
syncploy build
\`\`\`

## Core SDK Primitives

- \`api(options, handler)\`: Defines serverless HTTP endpoints using Web Fetch standards. Supports \`ingress: "function-url"\` (up to 15m timeout, native streaming, $0 cost) and \`ingress: "api-gateway"\` (HTTP API v2).
- \`new Table(name, options)\`: Amazon DynamoDB on-demand single-table database. Auto-protected with \`DeletionPolicy: Retain\`.
- \`table.stream(options, handler)\`: DynamoDB Streams consumer Lambda. Auto-wires partial batch failure reporting and IAM stream permissions.
- \`new Bucket(name, options)\`: Amazon S3 bucket with \`objectLock\` (COMPLIANCE/GOVERNANCE), versioning, and EventBridge notifications.
- \`bucket.on("objectCreated", queue, options)\`: EventBridge rule routing S3 events directly to SQS with zero YAML.
- \`new Queue(name, options)\`: Amazon SQS message queue with deadLetterQueue redrive policy.
- \`queue.consumer(options, handler)\`: SQS worker Lambda with partial batch failure reporting.
- \`new Topic(name, options)\`: Amazon SNS pub/sub topic.
- \`topic.subscribe(options, handler)\`: SNS subscriber Lambda.
- \`new Auth(name, options)\`: Amazon Cognito User Pool with enterprise security defaults (SRP auth, strict password policies, preventUserExistenceErrors).
- \`new Alarm(name, options)\`: Amazon CloudWatch Metric Math alarm with SNS action triggers.
- \`new DeliveryStream(name, options)\`: Amazon Kinesis Data Firehose streaming to S3.
- \`new Secret(name)\`: Type-safe AWS Secrets Manager / SSM parameter injection.

## Invariants & Safety Rules for AI Coding Agents

When authoring Syncploy infrastructure, agents MUST obey these rules:

1. **SQS Timeout Rule**: An SQS Queue's \`visibilityTimeout\` MUST be greater than or equal to the consuming Lambda's \`timeout\` (AWS recommends $\\ge 6\\times$). If visibilityTimeout < timeout, the compiler flags a fatal error to prevent duplicate execution storms.
2. **Denial-of-Wallet (DoW) Concurrency Caps**: Public Function URLs and stream consumers should always specify \`concurrency: <number>\` to prevent DDoS attacks from scaling Lambdas to AWS account limits.
3. **Dead Letter Queue (DLQ)**: Every active SQS consumer queue must have \`deadLetterQueue: { maxReceiveCount: <number> }\` configured to prevent poison-pill message loops.
4. **Recursion Shield**: Never write back to the stream source table or queue from its own consumer (e.g., Table A &rarr; Stream Worker &rarr; Table A.put). Syncploy's AST validator statically detects direct and multi-hop cycles and blocks compilation.
5. **Stateful Data Safety**: Never delete or replace DynamoDB tables or compliance S3 buckets. Use \`syncploy diff --check-replacement\` in CI/CD to prevent data loss.
6. **Logical ID Formatting**: Logical IDs must be strictly alphanumeric (\`^[A-Za-z0-9]+$\`), e.g., \`EhrTable\` not \`ehr-table\`.

## Documentation Index

Below is the complete set of documentation topics. Each file is available in raw Markdown format:

${DOCS_DATA.map((d) => `- [${d.title}](https://syncploy-web.vercel.app/docs/${d.slug}.md): ${d.description}`).join("\n")}

## Complete Knowledge Base

For coding agents requiring full context in a single request:
- **Full Documentation (All 15 Guides Combined)**: https://syncploy-web.vercel.app/llms-full.txt
`;

fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), llmsTxtContent.trim() + "\n", "utf-8");
console.log("✓ Generated public/llms.txt");

// 3. Generate public/llms-full.txt
let llmsFullContent = `# Syncploy — Full Documentation Knowledge Base

> The Terraform for AWS Serverless. Infrastructure-from-Code (IfC) compiler and runtime SDK for TypeScript.
> Complete combined documentation bundle for AI coding agents and LLMs.

---

## Table of Contents
${DOCS_DATA.map((d, i) => `${i + 1}. [${d.title}](#${d.slug}) — *${d.category}*`).join("\n")}

---
`;

for (const doc of DOCS_DATA) {
  llmsFullContent += `\n<a id="${doc.slug}"></a>\n\n`;
  llmsFullContent += `<!-- Section: ${doc.title} (${doc.category}) -->\n`;
  llmsFullContent += `<!-- Description: ${doc.description} -->\n\n`;
  llmsFullContent += doc.content.trim() + "\n\n";
  llmsFullContent += "---\n";
}

fs.writeFileSync(path.join(PUBLIC_DIR, "llms-full.txt"), llmsFullContent.trim() + "\n", "utf-8");
console.log("✓ Generated public/llms-full.txt");
