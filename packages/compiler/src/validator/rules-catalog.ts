export type RuleLayer =
  | "compute"
  | "recursion"
  | "storage"
  | "governance"
  | "security";

export type RuleSeverity = "error" | "warning" | "advisory";

export interface RuleDefinition {
  id: string;
  title: string;
  layer: RuleLayer;
  severity: RuleSeverity;
  service: string; // "Lambda", "DynamoDB", "SQS", "S3", "SNS", "Cognito", "Budgets", etc.
  financialRisk: string;
  summary: string;
  badCode: string;
  goodCode: string;
  remediation: string;
  docsAnchor: string;
}

export const RULES_CATALOG: Record<string, RuleDefinition> = {
  // ==========================================
  // Layer 1: Compute Blast-Radius Bounding
  // ==========================================
  WARN_DOW_UNRESERVED_CONCURRENCY: {
    id: "WARN_DOW_UNRESERVED_CONCURRENCY",
    title: "Unreserved Lambda Concurrency",
    layer: "compute",
    severity: "warning",
    service: "Lambda Function URLs / API Gateway",
    financialRisk: "Uncapped scaling under DDoS or bot crawls scales Lambdas to account limits (1,000+ parallel instances), draining thousands in unbudgeted compute.",
    summary: "Public Function URL or API route has no reserved concurrency cap.",
    badCode: `// ❌ HAZARDOUS: Unbounded scaling under DDoS
export const checkoutApi = api(
  { path: "/checkout", method: "POST", ingress: "function-url" },
  async (req) => {
    return Response.json({ success: true });
  }
);`,
    goodCode: `// ✅ IMMUNIZED: Blast-radius mathematically capped
export const checkoutApi = api(
  {
    path: "/checkout",
    method: "POST",
    ingress: "function-url",
    concurrency: 50, // Max 50 parallel instances ($54/mo worst-case liability)
  },
  async (req) => {
    return Response.json({ success: true });
  }
);`,
    remediation: "Add 'concurrency: <number>' to the api(...) options object to cap the theoretical maximum monthly spend.",
    docsAnchor: "warn_dow_unreserved_concurrency",
  },

  WARN_DOW_PUBLIC_API_BURST: {
    id: "WARN_DOW_PUBLIC_API_BURST",
    title: "High-Resource Public Wildcard CORS Endpoint",
    layer: "compute",
    severity: "warning",
    service: "Lambda & API Gateway",
    financialRisk: "High memory (≥512MB) combined with long timeouts (≥30s) and wildcard CORS creates an acute cost-amplification attack vector.",
    summary: "Public CORS endpoint allows origins ['*'] with heavy memory or duration allocations without concurrency bounds.",
    badCode: `// ❌ HAZARDOUS: 1024MB memory + 60s timeout + wildcard CORS + no concurrency
export const processReport = api(
  {
    path: "/report",
    method: "POST",
    memory: 1024,
    timeout: "60s",
    cors: { allowOrigins: ["*"] },
  },
  async (req) => { /* heavy work */ }
);`,
    goodCode: `// ✅ IMMUNIZED: Restricted origin and strict concurrency cap
export const processReport = api(
  {
    path: "/report",
    method: "POST",
    memory: 1024,
    timeout: "60s",
    concurrency: 10,
    cors: { allowOrigins: ["https://app.mycompany.com"] },
  },
  async (req) => { /* heavy work */ }
);`,
    remediation: "Configure 'concurrency: <number>' or restrict allowOrigins to trusted production domains.",
    docsAnchor: "warn_dow_public_api_burst",
  },

  WARN_DOW_STREAM_UNBOUNDED: {
    id: "WARN_DOW_STREAM_UNBOUNDED",
    title: "Unbounded DynamoDB Stream Concurrency",
    layer: "compute",
    severity: "warning",
    service: "DynamoDB Streams & Lambda",
    financialRisk: "Heavy table write bursts cause DynamoDB shards to split rapidly, spawning dozens of parallel Lambda instances without backpressure.",
    summary: "DynamoDB stream consumer has no concurrency limit configured.",
    badCode: `// ❌ HAZARDOUS: Can scale to match all table shards simultaneously
export const streamWorker = auditTable.stream(
  { batchSize: 100 },
  async (record) => { /* ... */ }
);`,
    goodCode: `// ✅ IMMUNIZED: Capped worker concurrency
export const streamWorker = auditTable.stream(
  {
    batchSize: 100,
    concurrency: 5, // At most 5 parallel stream consumers
  },
  async (record) => { /* ... */ }
);`,
    remediation: "Add 'concurrency: <number>' to the table.stream(...) options object.",
    docsAnchor: "warn_dow_stream_unbounded",
  },

  WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED: {
    id: "WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED",
    title: "Stack Reserved Concurrency Quota Depletion",
    layer: "compute",
    severity: "warning",
    service: "AWS Lambda Service Quotas",
    financialRisk: "Exhausting account unreserved concurrency quota (default 1,000) will cause all other Lambda functions across the AWS account to be throttled.",
    summary: "Total reserved concurrency across all functions in the stack exceeds 900 of the 1,000 default account limit.",
    badCode: `// ❌ HAZARDOUS: Sum of reserved concurrency across services > 900
export const api1 = api({ concurrency: 500 }, ...);
export const api2 = api({ concurrency: 450 }, ...);`,
    goodCode: `// ✅ IMMUNIZED: Reserved pools scaled within standard account margins
export const api1 = api({ concurrency: 50 }, ...);
export const api2 = api({ concurrency: 50 }, ...);`,
    remediation: "Reduce reserved allocations per function or request an AWS Service Quotas increase for Lambda Concurrent Executions.",
    docsAnchor: "warn_dow_concurrency_budget_exceeded",
  },

  // ==========================================
  // Layer 2: Recursion & Poison-Pill Shields
  // ==========================================
  ERR_RECURSIVE_LOOP: {
    id: "ERR_RECURSIVE_LOOP",
    title: "Infinite Event Recursion Loop (Tarjan SCC)",
    layer: "recursion",
    severity: "error",
    service: "DynamoDB Streams, SQS, SNS, S3",
    financialRisk: "Exponential self-amplifying execution cascades ($10,000+ overnight charges in hours).",
    summary: "An event consumer mutates or writes back directly or indirectly into its own event source (e.g. Table -> Stream -> Table.put).",
    badCode: `// ❌ HAZARDOUS: Writing back to the stream source table
export const auditWorker = patientTable.stream({ batchSize: 50 }, async (record) => {
  // BUG: Mutates the source table that triggered this stream!
  await patientTable.put({ id: record.id, updatedAt: Date.now() });
});`,
    goodCode: `// ✅ IMMUNIZED: Output written to isolated downstream destination
export const auditWorker = patientTable.stream({ batchSize: 50 }, async (record) => {
  // Writes to downstream SQS queue or S3 compliance bucket
  await auditQueue.send({ id: record.id, updatedAt: Date.now() });
});`,
    remediation: "Break the cycle by directing write mutations to a downstream table, queue, or prefix.",
    docsAnchor: "err_recursive_loop",
  },

  WARN_HTTP_RECURSIVE_LOOP: {
    id: "WARN_HTTP_RECURSIVE_LOOP",
    title: "HTTP Self-Invocation Circular Storm",
    layer: "recursion",
    severity: "warning",
    service: "Lambda & HTTP Fetch",
    financialRisk: "Circular HTTP invocations rapidly exhaust Lambda concurrency pool and lock instances until timeouts expire.",
    summary: "API route makes an internal fetch() call targeting its own URL path.",
    badCode: `// ❌ HAZARDOUS: Fetching self via external HTTP
export const orderHandler = api({ path: "/orders", method: "POST" }, async (req) => {
  await fetch("https://api.mycompany.com/orders", { method: "POST" });
});`,
    goodCode: `// ✅ IMMUNIZED: Call shared TypeScript domain logic directly
import { createOrder } from "./services/orders";

export const orderHandler = api({ path: "/orders", method: "POST" }, async (req) => {
  const result = await createOrder(await req.json());
  return Response.json(result);
});`,
    remediation: "Call the underlying TypeScript function directly rather than invoking your own public HTTP endpoint via fetch.",
    docsAnchor: "warn_http_recursive_loop",
  },

  ERR_SQS_TIMEOUT_MISMATCH: {
    id: "ERR_SQS_TIMEOUT_MISMATCH",
    title: "SQS Visibility Timeout Shorter Than Lambda Timeout",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS & Lambda",
    financialRisk: "SQS redelivers in-flight messages while the previous Lambda is still running, triggering duplicate execution avalanches and double-billing.",
    summary: "Queue visibilityTimeout is shorter than the consuming Lambda handler's timeout.",
    badCode: `// ❌ HAZARDOUS: Visibility (30s) < Consumer Timeout (60s)
export const queue = new Queue("jobs", { visibilityTimeout: "30s" });
export const worker = queue.consumer({ timeout: "60s" }, async (msg) => { ... });`,
    goodCode: `// ✅ IMMUNIZED: Visibility (360s) >= 6x Consumer Timeout (60s)
export const queue = new Queue("jobs", { visibilityTimeout: "360s" });
export const worker = queue.consumer({ timeout: "60s" }, async (msg) => { ... });`,
    remediation: "Set queue visibilityTimeout to at least 6x the consumer Lambda timeout (e.g. timeout: 30s -> visibilityTimeout: 180s).",
    docsAnchor: "err_sqs_timeout_mismatch",
  },

  WARN_SQS_VISIBILITY_TIMEOUT_SHORT: {
    id: "WARN_SQS_VISIBILITY_TIMEOUT_SHORT",
    title: "Queue Visibility Timeout Below AWS 6x Safety Ratio",
    layer: "recursion",
    severity: "warning",
    service: "Amazon SQS & Lambda",
    financialRisk: "Under downstream network latency or database throttling, messages in flight risk premature redelivery and duplicate execution storms.",
    summary: "Queue visibilityTimeout is greater than consumer timeout, but less than the recommended 6x safety ratio.",
    badCode: `export const queue = new Queue("orders", { visibilityTimeout: "35s" });
export const worker = queue.consumer({ timeout: "30s" }, ...);`,
    goodCode: `export const queue = new Queue("orders", { visibilityTimeout: "180s" }); // 6x 30s
export const worker = queue.consumer({ timeout: "30s" }, ...);`,
    remediation: "Increase queue visibilityTimeout to ≥ 6x consumer timeout (AWS Architecture recommendation).",
    docsAnchor: "warn_sqs_visibility_timeout_short",
  },

  WARN_DOW_MISSING_DLQ: {
    id: "WARN_DOW_MISSING_DLQ",
    title: "Active SQS Queue Without Dead Letter Queue (DLQ)",
    layer: "recursion",
    severity: "warning",
    service: "Amazon SQS",
    financialRisk: "Poison-pill messages containing malformed payloads trigger continuous failure loops for up to 14 days, burning compute cycles indefinitely.",
    summary: "Active queue has consumers attached but no deadLetterQueue redrive policy.",
    badCode: `// ❌ HAZARDOUS: Poison-pill messages will retry continuously
export const queue = new Queue("notifications", {
  visibilityTimeout: "180s",
});`,
    goodCode: `// ✅ IMMUNIZED: Auto-attaches DLQ and caps redrives to 3
export const queue = new Queue("notifications", {
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});`,
    remediation: "Configure 'deadLetterQueue: { maxReceiveCount: 3 }' on the Queue declaration.",
    docsAnchor: "warn_dow_missing_dlq",
  },

  WARN_DOW_STREAM_MISSING_DLQ: {
    id: "WARN_DOW_STREAM_MISSING_DLQ",
    title: "DynamoDB Stream Without Failure Destination",
    layer: "recursion",
    severity: "warning",
    service: "DynamoDB Streams & SQS",
    financialRisk: "Unprocessable poison-pill records either block stream shards or get dropped after retries without auditability.",
    summary: "Active DynamoDB stream consumer has no onFailure DLQ queue configured.",
    badCode: `export const stream = auditTable.stream({ batchSize: 50 }, async (record) => { ... });`,
    goodCode: `export const stream = auditTable.stream(
  {
    batchSize: 50,
    onFailure: "streamDlqQueue",
    retryAttempts: 3,
  },
  async (record) => { ... }
);`,
    remediation: "Configure 'onFailure: \"myDlqQueue\"' to safely isolate unprocessable stream records.",
    docsAnchor: "warn_dow_stream_missing_dlq",
  },

  WARN_DOW_STREAM_RETRY_UNLIMITED: {
    id: "WARN_DOW_STREAM_RETRY_UNLIMITED",
    title: "DynamoDB Stream Unlimited Retries (-1)",
    layer: "recursion",
    severity: "warning",
    service: "DynamoDB Streams",
    financialRisk: "Retrying failing records for up to 24 hours locks stream shards and keeps Lambda instances continuously executing.",
    summary: "DynamoDB stream consumer explicitly configured retryAttempts: -1.",
    badCode: `export const stream = auditTable.stream({ retryAttempts: -1 }, ...);`,
    goodCode: `export const stream = auditTable.stream({ retryAttempts: 3 }, ...);`,
    remediation: "Set 'retryAttempts: 3' (or 1-5) and attach an onFailure DLQ queue.",
    docsAnchor: "warn_dow_stream_retry_unlimited",
  },

  WARN_DOW_DYNAMODB_SCAN: {
    id: "WARN_DOW_DYNAMODB_SCAN",
    title: "DynamoDB Full Table Scan in Request Path",
    layer: "recursion",
    severity: "warning",
    service: "Amazon DynamoDB",
    financialRisk: "O(N) read amplification: a single HTTP request scans every single item in the entire database, consuming hundreds of Read Capacity Units per call.",
    summary: "API route invokes table.scan() inside its execution body.",
    badCode: `// ❌ HAZARDOUS: Scans entire table on every HTTP GET
export const listPatients = api({ path: "/patients", method: "GET" }, async () => {
  const all = await patientTable.scan();
  return Response.json(all);
});`,
    goodCode: `// ✅ IMMUNIZED: Uses indexed single-table query
export const listPatients = api({ path: "/clinics/:id/patients", method: "GET" }, async (req) => {
  const items = await patientTable.query({ PK: \`CLINIC#\${req.params.id}\` });
  return Response.json(items);
});`,
    remediation: "Replace table.scan() with indexed table.query() or ElectroDB secondary index lookups.",
    docsAnchor: "warn_dow_dynamodb_scan",
  },

  // ==========================================
  // Layer 3: Storage & Log Leaks
  // ==========================================
  INFO_DOW_LOG_ROTATION: {
    id: "INFO_DOW_LOG_ROTATION",
    title: "Perpetual CloudWatch Log Accumulation Defense",
    layer: "storage",
    severity: "advisory",
    service: "Amazon CloudWatch Logs",
    financialRisk: "AWS Lambda by default creates log streams with Never Expire retention, quietly accumulating hundreds of gigabytes of permanent log storage charges.",
    summary: "Syncploy automatically synthesizes AWS::Logs::LogGroup with 14-day retention for every Lambda function.",
    badCode: `// ❌ DEFAULT AWS: Creates unmanaged log group with infinite retention
export const myHandler = api({ path: "/run" }, async () => { ... });`,
    goodCode: `// ✅ AUTO-SYNTHESIZED: RetentionInDays: 14 attached to all 5 handlers
export const myHandler = api(
  {
    path: "/run",
    logRetentionInDays: 14, // Custom retention window (defaults to 14)
  },
  async () => { ... }
);`,
    remediation: "Automatic by default. Customize retention per handler via 'logRetentionInDays: <number>'.",
    docsAnchor: "info_dow_log_rotation",
  },

  INFO_DOW_S3_MULTIPART_ABORT: {
    id: "INFO_DOW_S3_MULTIPART_ABORT",
    title: "S3 Orphan Multipart Upload Cleanup",
    layer: "storage",
    severity: "advisory",
    service: "Amazon S3",
    financialRisk: "Failed or abandoned multipart uploads leave orphan byte chunks in S3. These are invisible in bucket listings, yet AWS bills for their storage indefinitely.",
    summary: "Syncploy automatically synthesizes AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 } on every bucket.",
    badCode: `// ❌ DEFAULT AWS: Abandoned upload fragments remain stored forever
export const bucket = new Bucket("uploads");`,
    goodCode: `// ✅ AUTO-SYNTHESIZED: LifecycleConfiguration automatically purges after 7 days
export const bucket = new Bucket("uploads", {
  publicAccessBlock: true,
});`,
    remediation: "Automatic by default on all declared Bucket constructs.",
    docsAnchor: "info_dow_s3_multipart_abort",
  },

  // ==========================================
  // Layer 4: Financial Governance & Fraud Defense
  // ==========================================
  WARN_DOW_SMS_TOLL_FRAUD: {
    id: "WARN_DOW_SMS_TOLL_FRAUD",
    title: "International SMS Toll Fraud Exposure",
    layer: "governance",
    severity: "warning",
    service: "Amazon SNS & Cognito",
    financialRisk: "Attackers script automated requests to phone endpoints, generating thousands of premium international SMS messages at $0.50+/SMS.",
    summary: "Topic has protocol: 'sms' or Cognito User Pool enables phone verification without explicit spend bounds.",
    badCode: `// ❌ HAZARDOUS: Unmonitored SMS destination
export const auth = new Auth("portal", { signInMethod: "phone" });`,
    goodCode: `// ✅ IMMUNIZED: Email verification with strict admin controls
export const auth = new Auth("portal", {
  signInMethod: "email",
  adminOnly: true,
});`,
    remediation: "Use email verification, configure AWS SNS account-level SMS spend limits, and restrict destination country codes in the AWS Console.",
    docsAnchor: "warn_dow_sms_toll_fraud",
  },

  WARN_DOW_HIGH_BLAST_RADIUS: {
    id: "WARN_DOW_HIGH_BLAST_RADIUS",
    title: "Continuous Monthly Liability Exceeds $100 Without Budget",
    layer: "governance",
    severity: "warning",
    service: "AWS Budgets & CloudWatch",
    financialRisk: "Combined concurrency compute ceiling across stack functions exceeds $100/mo without active financial alerting.",
    summary: "Stack total continuous monthly compute liability exceeds $100, but no new Budget construct is declared.",
    badCode: `// ❌ HAZARDOUS: High compute liability without financial alerting
export const api1 = api({ concurrency: 100 }, ...); // ~$108/mo liability`,
    goodCode: `// ✅ IMMUNIZED: CloudWatch/SNS Budget active ceiling
export const alertTopic = new Topic("alerts");
export const monthlyBudget = new Budget("monthly-cap", {
  amount: 100,
  threshold: 80,
  topic: alertTopic,
});`,
    remediation: "Declare 'new Budget(\"monthly-cap\", { amount: <dollars>, topic: myTopic })' to actively track and alert on overruns.",
    docsAnchor: "warn_dow_high_blast_radius",
  },

  ERR_BUDGET_INVALID_AMOUNT: {
    id: "ERR_BUDGET_INVALID_AMOUNT",
    title: "Budget Amount Missing or Invalid",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "Budgets without positive static amounts fail synthesis and cannot enforce financial caps in CloudFormation.",
    summary: "Budget construct has missing, zero, or non-static amount literal.",
    badCode: `export const budget = new Budget("cap", { amount: 0 });`,
    goodCode: `export const budget = new Budget("cap", { amount: 50 }); // $50/mo`,
    remediation: "Pass a static positive literal number for 'amount' (e.g. amount: 50).",
    docsAnchor: "err_budget_invalid_amount",
  },

  ERR_BUDGET_UNRESOLVED_TOPIC: {
    id: "ERR_BUDGET_UNRESOLVED_TOPIC",
    title: "Budget Configured Non-Existent Alert Topic",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets & SNS",
    financialRisk: "A budget linked to a non-existent SNS topic fails deployment and produces silent billing breaches.",
    summary: "Budget topic option does not resolve to any declared Topic construct in the stack.",
    badCode: `export const budget = new Budget("cap", { amount: 50, topic: "missingTopic" });`,
    goodCode: `export const alerts = new Topic("alerts");
export const budget = new Budget("cap", { amount: 50, topic: alerts });`,
    remediation: "Verify the topic identifier or declare a matching 'new Topic(...)'.",
    docsAnchor: "err_budget_unresolved_topic",
  },

  ERR_STATEFUL_REPLACEMENT: {
    id: "ERR_STATEFUL_REPLACEMENT",
    title: "Destructive Stateful Resource Replacement Intercepted",
    layer: "governance",
    severity: "error",
    service: "CloudFormation, DynamoDB & S3",
    financialRisk: "Permanent, irreversible data loss caused by CloudFormation deleting and recreating production databases or audit buckets.",
    summary: "syncploy diff detected an update that causes CloudFormation to DESTROY and RECREATE a DynamoDB table or S3 bucket.",
    badCode: `// ❌ HAZARDOUS: Changing physical TableName causes CloudFormation to drop the old table
export const table = new Table("ehr", { tableName: "new-table-name" });`,
    goodCode: `// ✅ IMMUNIZED: Retains physical logical ID and existing table name
export const table = new Table("ehr", { logicalId: "EhrTable", tableName: "ehr-table" });`,
    remediation: "Match the existing physical resource name or pass --allow-stateful-replacement if recreation is intended.",
    docsAnchor: "err_stateful_replacement",
  },
};

export function getRuleById(id: string): RuleDefinition | undefined {
  return RULES_CATALOG[id];
}

export function getRulesByLayer(layer: RuleLayer): RuleDefinition[] {
  return Object.values(RULES_CATALOG).filter((r) => r.layer === layer);
}

export function getAllRules(): RuleDefinition[] {
  return Object.values(RULES_CATALOG);
}
