import fs from "fs";
import path from "path";
import { DOCS_DATA } from "../src/data/docs";

const PUBLIC_DIR = path.resolve(__dirname, "../public");
const DOCS_CONTENT_DIR = path.resolve(__dirname, "../content/docs");
const PUBLIC_DOCS_DIR = path.join(PUBLIC_DIR, "docs");

// Ensure directories exist
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
if (!fs.existsSync(PUBLIC_DOCS_DIR)) fs.mkdirSync(PUBLIC_DOCS_DIR, { recursive: true });

// 0. Synchronize rules-catalog.ts from @syncploy/compiler
const COMPILER_RULES_CATALOG = path.resolve(__dirname, "../../../packages/compiler/src/validator/rules-catalog.ts");
const WEB_RULES_CATALOG = path.resolve(__dirname, "../src/data/rules-catalog.ts");
if (fs.existsSync(COMPILER_RULES_CATALOG)) {
  fs.copyFileSync(COMPILER_RULES_CATALOG, WEB_RULES_CATALOG);
  console.log("✓ Synchronized rules-catalog.ts from @syncploy/compiler to web app data");
}

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

> The Zero-DoW (Denial of Wallet) Serverless Framework for AWS. Pure TypeScript framework with compile-time Denial-of-Wallet immunity. Write idiomatic TypeScript; synthesize 1:1 CloudFormation with zero YAML, zero state files, and zero data-loss replacements.

Syncploy is a static compiler and SDK for Pure AWS Serverless. Instead of paying a 10x–50x PaaS tax on Vercel or Render out of fear of AWS, or maintaining handwritten YAML (SAM / Serverless Framework) and imperative graphs (AWS CDK / Pulumi), developers author application logic in standard TypeScript. The Syncploy compiler statically analyzes the AST (ts-morph), infers the serverless infrastructure graph, validates event cycles, bounds execution liability, and deterministically synthesizes 1:1 CloudFormation templates with zero stateful replacements.

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

Declare infrastructure and logic side-by-side in TypeScript:
\`\`\`typescript
import { api, Table, Queue, Bucket, Budget, Topic } from "@syncploy/sdk";

// 1. Single-Table DynamoDB with zero stateful replacement
export const ordersTable = new Table("orders", {
  logicalId: "OrdersTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  pointInTimeRecovery: true,
});

// 2. Queue with automatic Dead Letter Queue (DLQ) and 6x timeout ratio
export const orderQueue = new Queue("orders", {
  logicalId: "OrderQueue",
  visibilityTimeout: "180s", // 6x the 30s consumer timeout
  deadLetterQueue: { maxReceiveCount: 3 },
});

// 3. Lambda Ingress via direct Function URL ($0 proxy overhead)
export const checkoutApi = api(
  {
    path: "/checkout",
    method: "POST",
    ingress: "function-url",
    timeout: "30s",
    memory: 256,
    concurrency: 50, // Caps concurrency to prevent Denial-of-Wallet
    logRetentionInDays: 14, // Auto-synthesizes CloudWatch LogGroup with 14d rotation
    cors: { allowOrigins: ["*"] },
  },
  async (req) => {
    const body = await req.json();
    await ordersTable.put(body);
    await orderQueue.send({ orderId: body.id });
    return Response.json({ success: true, orderId: body.id });
  }
);

// 4. Financial Guardrail: Hard Budget Alert
export const alertTopic = new Topic("alerts", { logicalId: "AlertsTopic" });
export const monthlyBudget = new Budget("monthly-cap", {
  amount: 50, // $50/mo limit
  threshold: 80, // Alert at 80% ($40)
  topic: alertTopic,
  filterByStack: true,
});
\`\`\`

Compile to CloudFormation and Lambda bundles:
\`\`\`bash
syncploy build
\`\`\`

## Core SDK Primitives

- \`api(options, handler)\`: Defines serverless HTTP endpoints using Web Fetch standards. Supports \`ingress: "function-url"\` (up to 15m timeout, native streaming, $0 cost) and \`ingress: "api-gateway"\` (HTTP API v2). Automatically synthesizes dedicated \`AWS::Logs::LogGroup\` with 14-day retention.
- \`new Table(name, options)\`: Amazon DynamoDB on-demand single-table database. Auto-protected with \`DeletionPolicy: Retain\` and zero-replacement schema updates.
- \`table.stream(options, handler)\`: DynamoDB Streams consumer Lambda. Auto-wires partial batch failure reporting, IAM stream permissions, and bounded concurrency.
- \`new Bucket(name, options)\`: Amazon S3 bucket with \`objectLock\` (COMPLIANCE/GOVERNANCE), versioning, and EventBridge notifications. Automatically includes \`AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }\` to purge orphan multipart upload storage leaks.
- \`bucket.on("objectCreated", queue, options)\`: EventBridge rule routing S3 events directly to SQS with zero YAML.
- \`new Queue(name, options)\`: Amazon SQS message queue with deadLetterQueue redrive policy.
- \`queue.consumer(options, handler)\`: SQS worker Lambda with partial batch failure reporting and auto-synthesized 14-day log retention.
- \`new Topic(name, options)\`: Amazon SNS pub/sub topic.
- \`topic.subscribe(options, handler)\`: SNS subscriber Lambda.
- \`new Budget(name, options)\`: AWS Budgets financial ceiling with automated SNS alerts and stack-level spend scoping.
- \`new Auth(name, options)\`: Amazon Cognito User Pool with enterprise security defaults (SRP auth, strict password policies, preventUserExistenceErrors).
- \`new Alarm(name, options)\`: Amazon CloudWatch Metric Math alarm with SNS action triggers.
- \`new DeliveryStream(name, options)\`: Amazon Kinesis Data Firehose streaming to S3.
- \`new Secret(name)\`: Type-safe AWS Secrets Manager / SSM parameter injection.

## Invariants & Safety Rules for AI Coding Agents

When authoring Syncploy infrastructure, agents MUST obey these rules:

1. **SQS Timeout Rule**: An SQS Queue's \`visibilityTimeout\` MUST be $\\ge 6 \\times$ the consuming Lambda's \`timeout\` (e.g. \`timeout: "30s"\` $\\rightarrow$ \`visibilityTimeout: "180s"\`). Shorter timeouts cause duplicate execution storms and trigger compiler error \`ERR_SQS_VISIBILITY_TIMEOUT_SHORT\`.
2. **Denial-of-Wallet (DoW) Concurrency Caps**: Every public Function URL and stream consumer MUST specify \`concurrency: <number>\`. Unbounded concurrency allows DDoS attacks to scale Lambdas to the account limit ($1,000+$ instances), exhausting concurrency budgets and draining cloud wallets (\`WARN_DOW_UNRESERVED_CONCURRENCY\`).
3. **No DynamoDB Table Scans**: NEVER invoke \`table.scan()\` in HTTP request handlers or API endpoints. Full-table scans consume Read Capacity Units linearly proportional to table size ($O(N)$ read amplification), causing astronomical bills under query load (\`WARN_DOW_DYNAMODB_SCAN\`). Always query via partition key, sort key ranges, or ElectroDB secondary indexes.
4. **Zero Storage Leaks (Logs & S3 Multipart)**: Do NOT manually declare \`AWS::Logs::LogGroup\` resources. Syncploy automatically synthesizes CloudWatch log groups with a 14-day retention window (\`RetentionInDays: 14\`) for all Lambda endpoints, SQS workers, and stream consumers. All S3 buckets auto-abort incomplete multipart uploads after 7 days (\`DaysAfterInitiation: 7\`).
5. **Recursion Shield**: Never write back to the stream source table or queue from its own consumer (e.g., Table A &rarr; Stream Worker &rarr; Table A.put). Syncploy's AST analyzer executes Tarjan's SCC cycle detection and halts compilation (\`ERR_RECURSIVE_LOOP\`).
6. **Dead Letter Queue (DLQ)**: Every active SQS consumer queue must have \`deadLetterQueue: { maxReceiveCount: <number> }\` configured to prevent poison-pill message loops.
7. **SMS Toll Fraud Protection**: Never configure SMS protocols on SNS topics or SMS phone verification on Cognito User Pools without explicit budget alerts or destination number controls (\`WARN_DOW_SMS_TOLL_FRAUD\`). Unprotected SMS endpoints are prime targets for automated toll fraud.
8. **High Blast Radius Budget Requirement**: If the stack's total continuous compute liability exceeds $100/mo, declare a \`new Budget("monthly-cap", { amount: <dollars>, topic: alertTopic })\` to ensure AWS actively monitors and alerts before spend can run away (\`WARN_DOW_HIGH_BLAST_RADIUS\`).
9. **Stateful Data Safety**: Never delete or replace DynamoDB tables or compliance S3 buckets. Run \`syncploy diff --check-replacement\` in CI/CD to prevent data loss.
10. **Alphanumeric Logical IDs**: Logical IDs must strictly match \`^[A-Za-z0-9]+$\` (e.g. \`OrdersTable\`, not \`orders-table\`).

## Documentation Index

Below is the complete set of documentation topics. Each file is available in raw Markdown format:

${DOCS_DATA.map((d) => `- [${d.title}](https://www.syncploy.com/docs/${d.slug}.md): ${d.description}`).join("\n")}

## Complete Knowledge Base

For coding agents requiring full context in a single request:
- **Full Documentation (All 15 Guides Combined)**: https://www.syncploy.com/llms-full.txt
`;

fs.writeFileSync(path.join(PUBLIC_DIR, "llms.txt"), llmsTxtContent.trim() + "\n", "utf-8");
console.log("✓ Generated public/llms.txt");

// 3. Generate public/llms-full.txt
let llmsFullContent = `# Syncploy — Full Documentation Knowledge Base

> The Zero-DoW (Denial of Wallet) Serverless Framework for AWS. Pure TypeScript framework with compile-time Denial-of-Wallet immunity.
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
