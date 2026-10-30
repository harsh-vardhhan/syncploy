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

  ERR_BUDGET_INVALID_THRESHOLD: {
    id: "ERR_BUDGET_INVALID_THRESHOLD",
    title: "Budget Alert Threshold Invalid",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "Invalid or non-percentage thresholds prevent CloudWatch/SNS notifications from triggering when spend spikes.",
    summary: "Budget threshold must be a positive number literal representing a percentage (e.g. 80).",
    badCode: `export const budget = new Budget("cap", { amount: 50, threshold: -10 });`,
    goodCode: `export const budget = new Budget("cap", { amount: 50, threshold: 80 }); // Alert at 80%`,
    remediation: "Set 'threshold: <number>' between 1 and 1000 (e.g. 80 for 80% of budget).",
    docsAnchor: "err_budget_invalid_threshold",
  },

  ERR_BUDGET_INVALID_UNIT: {
    id: "ERR_BUDGET_INVALID_UNIT",
    title: "Budget Currency Unit Not ISO Code",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "AWS Budgets rejects non-ISO currency codes during CloudFormation stack creation, failing deployment.",
    summary: "Budget unit must be a 3-letter uppercase ISO currency code (e.g. 'USD', 'EUR', 'GBP').",
    badCode: `export const budget = new Budget("cap", { amount: 50, unit: "dollars" });`,
    goodCode: `export const budget = new Budget("cap", { amount: 50, unit: "USD" });`,
    remediation: "Use standard 3-letter uppercase currency code like 'USD' or 'EUR'.",
    docsAnchor: "err_budget_invalid_unit",
  },

  ERR_BUDGET_INVALID_FILTER: {
    id: "ERR_BUDGET_INVALID_FILTER",
    title: "Budget Stack Filter Invalid",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "Dynamic non-boolean stack filter expressions prevent deterministic CloudFormation tag cost filtering.",
    summary: "Budget filterByStack must be a static boolean literal (true | false).",
    badCode: `export const budget = new Budget("cap", { amount: 50, filterByStack: "yes" as any });`,
    goodCode: `export const budget = new Budget("cap", { amount: 50, filterByStack: true });`,
    remediation: "Pass literal boolean 'filterByStack: true' or omit for account-wide tracking.",
    docsAnchor: "err_budget_invalid_filter",
  },

  ERR_DUPLICATE_BUDGET_ID: {
    id: "ERR_DUPLICATE_BUDGET_ID",
    title: "Duplicate Budget Identifier Declared",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "Duplicate budget constructs collide in the CloudFormation logical ID map and overwrite financial limits.",
    summary: "Two Budget constructs share the same constructor identifier.",
    badCode: `export const b1 = new Budget("monthly-cap", { amount: 50 });
export const b2 = new Budget("monthly-cap", { amount: 100 });`,
    goodCode: `export const b1 = new Budget("dev-cap", { amount: 50 });
export const b2 = new Budget("prod-cap", { amount: 100 });`,
    remediation: "Provide unique identifier strings for each declared Budget construct.",
    docsAnchor: "err_duplicate_budget_id",
  },

  ERR_DUPLICATE_BUDGET_NAME: {
    id: "ERR_DUPLICATE_BUDGET_NAME",
    title: "Duplicate Physical AWS Budget Name",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "AWS Budgets names are globally unique per AWS account. Duplicate names cause CloudFormation create failures.",
    summary: "Two Budget constructs specify the same physical budgetName.",
    badCode: `export const b1 = new Budget("b1", { amount: 50, budgetName: "my-budget" });
export const b2 = new Budget("b2", { amount: 100, budgetName: "my-budget" });`,
    goodCode: `export const b1 = new Budget("b1", { amount: 50, budgetName: "api-budget" });
export const b2 = new Budget("b2", { amount: 100, budgetName: "workers-budget" });`,
    remediation: "Assign distinct physical budgetName options or allow Syncploy to auto-generate unique stack-scoped names.",
    docsAnchor: "err_duplicate_budget_name",
  },

  WARN_DOW_BUDGET_NO_NOTIFICATION: {
    id: "WARN_DOW_BUDGET_NO_NOTIFICATION",
    title: "Silent Budget Without Alert Topic",
    layer: "governance",
    severity: "warning",
    service: "AWS Budgets & SNS",
    financialRisk: "A budget without a notification topic cannot deliver alerts to engineers, leaving spending breaches unmonitored.",
    summary: "Budget construct has no topic configured and no fallback alert topic was discovered in the stack.",
    badCode: `// ❌ HAZARDOUS: Silent budget records spend but alerts nobody
export const budget = new Budget("cap", { amount: 50 });`,
    goodCode: `// ✅ IMMUNIZED: Wires SNS topic to dispatch SMS/Email alerts
export const alerts = new Topic("alerts");
export const budget = new Budget("cap", { amount: 50, topic: alerts });`,
    remediation: "Configure 'topic: myAlertTopic' on the Budget construct.",
    docsAnchor: "warn_dow_budget_no_notification",
  },

  WARN_DOW_BUDGET_TAG_ACTIVATION: {
    id: "WARN_DOW_BUDGET_TAG_ACTIVATION",
    title: "Stack Cost Allocation Tag Activation Required",
    layer: "governance",
    severity: "advisory",
    service: "AWS Billing & Cost Management",
    financialRisk: "Without activating user-defined Cost Allocation Tags in AWS Console, stack-scoped budget filters report $0 spend regardless of usage.",
    summary: "filterByStack: true requires activating the 'StackName' cost allocation tag in the AWS Billing console.",
    badCode: `export const budget = new Budget("cap", { amount: 50, filterByStack: true });`,
    goodCode: `// Tip: Activate Cost Allocation Tags in AWS Billing Console -> Cost Allocation Tags -> User-Defined -> StackName
export const budget = new Budget("cap", { amount: 50, filterByStack: true });`,
    remediation: "In AWS Billing Console, navigate to Cost Allocation Tags and activate 'StackName' so AWS populates tag-scoped metrics.",
    docsAnchor: "warn_dow_budget_tag_activation",
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

  // ==========================================
  // CloudFormation Synthesizer Limits & Logical IDs
  // ==========================================
  ERR_CFN_LOGICAL_ID: {
    id: "ERR_CFN_LOGICAL_ID",
    title: "Invalid CloudFormation Logical ID",
    layer: "governance",
    severity: "error",
    service: "CloudFormation",
    financialRisk: "CloudFormation template validation failure prevents deployments and corrupts rollbacks.",
    summary: "Logical IDs in CloudFormation must be alphanumeric ([A-Za-z0-9]+).",
    badCode: `export const table = new Table("ehr-db", { logicalId: "my_invalid-table!" });`,
    goodCode: `export const table = new Table("ehr-db", { logicalId: "MyValidTable" });`,
    remediation: "Remove non-alphanumeric characters from the logicalId property.",
    docsAnchor: "err_cfn_logical_id",
  },

  ERR_CFN_RESOURCE_LIMIT: {
    id: "ERR_CFN_RESOURCE_LIMIT",
    title: "CloudFormation 500 Resource Limit Exceeded",
    layer: "governance",
    severity: "error",
    service: "CloudFormation",
    financialRisk: "Stack deployment failure due to AWS CloudFormation hard resource limit.",
    summary: "CloudFormation stacks cannot declare more than 500 resources.",
    badCode: `// Monolithic stack with 501+ resources`,
    goodCode: `// Split into microservices or nested stacks`,
    remediation: "Decompose monolithic infrastructure into separate Syncploy service stacks.",
    docsAnchor: "err_cfn_resource_limit",
  },

  ERR_CFN_OUTPUT_LIMIT: {
    id: "ERR_CFN_OUTPUT_LIMIT",
    title: "CloudFormation 60 Output Limit Exceeded",
    layer: "governance",
    severity: "error",
    service: "CloudFormation",
    financialRisk: "Stack deployment failure due to AWS CloudFormation output quota breach.",
    summary: "CloudFormation stacks cannot declare more than 60 outputs.",
    badCode: `// Stack declaring 61+ stack outputs`,
    goodCode: `// Consolidate outputs or consume resources directly within the stack`,
    remediation: "Reduce stack outputs or use SSM parameters for cross-stack discovery.",
    docsAnchor: "err_cfn_output_limit",
  },

  ERR_CFN_TEMPLATE_SIZE_LIMIT: {
    id: "ERR_CFN_TEMPLATE_SIZE_LIMIT",
    title: "CloudFormation 1MB Template Size Limit Exceeded",
    layer: "governance",
    severity: "error",
    service: "CloudFormation",
    financialRisk: "Stack deployment failure due to AWS S3 template size limits (1MB maximum).",
    summary: "Synthesized CloudFormation template JSON exceeds 1MB limit.",
    badCode: `// Excessively bloated stack template`,
    goodCode: `// Modularize resources across stacks`,
    remediation: "Split resources into separate stack modules to reduce template size.",
    docsAnchor: "err_cfn_template_size_limit",
  },

  // ==========================================
  // Ingress & API Configuration
  // ==========================================
  ERR_API_PATH: {
    id: "ERR_API_PATH",
    title: "Invalid API Gateway Route Path",
    layer: "compute",
    severity: "error",
    service: "API Gateway",
    financialRisk: "Route registration fails in API Gateway, causing broken endpoints and service outages.",
    summary: "API route path must start with a forward slash ('/').",
    badCode: `export const getDoc = api({ path: "documents", method: "GET" }, ...);`,
    goodCode: `export const getDoc = api({ path: "/documents", method: "GET" }, ...);`,
    remediation: "Prefix the API route path with '/' (e.g. '/documents').",
    docsAnchor: "err_api_path",
  },

  ERR_CORS_ORIGIN_PROTOCOL: {
    id: "ERR_CORS_ORIGIN_PROTOCOL",
    title: "CORS Allowed Origin Missing Protocol",
    layer: "security",
    severity: "error",
    service: "API Gateway / Function URLs",
    financialRisk: "Malformed CORS headers cause browser cross-origin preflight rejections or unintended open cross-origin access.",
    summary: "CORS allowed origin must include protocol (e.g. 'https://' or 'http://') or be '*'.",
    badCode: `export const myApi = api({ cors: { allowOrigins: ["example.com"] } }, ...);`,
    goodCode: `export const myApi = api({ cors: { allowOrigins: ["https://example.com"] } }, ...);`,
    remediation: "Add 'https://' or 'http://' to the allowed origin entry.",
    docsAnchor: "err_cors_origin_protocol",
  },

  WARN_FUNCTION_URL_AUTH_UNSUPPORTED: {
    id: "WARN_FUNCTION_URL_AUTH_UNSUPPORTED",
    title: "Function URL Custom Auth Unsupported",
    layer: "security",
    severity: "warning",
    service: "Lambda Function URLs",
    financialRisk: "Misconfigured ingress exposes endpoints publicly or drops authorization.",
    summary: "Lambda Function URLs only support NONE or AWS_IAM auth types, not custom authorizers.",
    badCode: `export const route = api({ ingress: "function-url", auth: "cognito" }, ...);`,
    goodCode: `export const route = api({ ingress: "api-gateway", auth: userPool }, ...);`,
    remediation: "Switch ingress to 'api-gateway' if using Cognito or custom JWT authorizers.",
    docsAnchor: "warn_function_url_auth_unsupported",
  },

  WARN_FUNCTION_URL_THROTTLE_UNSUPPORTED: {
    id: "WARN_FUNCTION_URL_THROTTLE_UNSUPPORTED",
    title: "Function URL Rate Limiting Unsupported",
    layer: "compute",
    severity: "warning",
    service: "Lambda Function URLs",
    financialRisk: "Absence of gateway-level token bucket rate limiting allows unthrottled burst traffic to invoke Lambdas.",
    summary: "Function URLs do not support token-bucket throttle settings (burst/rate limits); use API Gateway or reserved concurrency.",
    badCode: `export const route = api({ ingress: "function-url", throttle: { rateLimit: 100 } }, ...);`,
    goodCode: `export const route = api({ ingress: "api-gateway", throttle: { rateLimit: 100 } }, ...);`,
    remediation: "Use ingress: 'api-gateway' for rate-limited routes or configure 'concurrency' on Function URLs.",
    docsAnchor: "warn_function_url_throttle_unsupported",
  },

  // ==========================================
  // Lambda Compute Configuration
  // ==========================================
  ERR_LAMBDA_MEMORY: {
    id: "ERR_LAMBDA_MEMORY",
    title: "Invalid Lambda Memory Allocation",
    layer: "compute",
    severity: "error",
    service: "AWS Lambda",
    financialRisk: "Deployment rejection or excessive over-provisioning spend.",
    summary: "Lambda memory must be between 128 MB and 10,240 MB.",
    badCode: `export const handler = api({ memory: 64 }, ...);`,
    goodCode: `export const handler = api({ memory: 512 }, ...);`,
    remediation: "Set Lambda memory to a value between 128 and 10240 MB.",
    docsAnchor: "err_lambda_memory",
  },

  ERR_LAMBDA_TIMEOUT: {
    id: "ERR_LAMBDA_TIMEOUT",
    title: "Invalid Lambda Execution Timeout",
    layer: "compute",
    severity: "error",
    service: "AWS Lambda",
    financialRisk: "Deployment rejection or unexpected early termination of workloads.",
    summary: "Lambda timeout must be between 1 second and 900 seconds (15 minutes).",
    badCode: `export const handler = api({ timeout: "1000s" }, ...);`,
    goodCode: `export const handler = api({ timeout: "30s" }, ...);`,
    remediation: "Configure timeout within 1s to 900s.",
    docsAnchor: "err_lambda_timeout",
  },

  ERR_LAMBDA_CONCURRENCY: {
    id: "ERR_LAMBDA_CONCURRENCY",
    title: "Invalid Lambda Concurrency Limit",
    layer: "compute",
    severity: "error",
    service: "AWS Lambda",
    financialRisk: "Invalid concurrency settings prevent Lambda function deployment.",
    summary: "Lambda reserved concurrency must be an integer >= 0.",
    badCode: `export const handler = api({ concurrency: -5 }, ...);`,
    goodCode: `export const handler = api({ concurrency: 10 }, ...);`,
    remediation: "Set concurrency to a non-negative integer (e.g. 10).",
    docsAnchor: "err_lambda_concurrency",
  },

  ERR_LAMBDA_FUNCTION_NAME: {
    id: "ERR_LAMBDA_FUNCTION_NAME",
    title: "Invalid Lambda Function Name",
    layer: "governance",
    severity: "error",
    service: "AWS Lambda",
    financialRisk: "CloudFormation deployment validation error.",
    summary: "Lambda function names must be 1-64 characters matching [a-zA-Z0-9-_]+.",
    badCode: `export const handler = api({ functionName: "my invalid func!" }, ...);`,
    goodCode: `export const handler = api({ functionName: "my-valid-func" }, ...);`,
    remediation: "Use alphanumeric characters, hyphens, and underscores up to 64 characters.",
    docsAnchor: "err_lambda_function_name",
  },

  // ==========================================
  // DynamoDB & ElectroDB
  // ==========================================
  ERR_DDB_TABLE_NAME: {
    id: "ERR_DDB_TABLE_NAME",
    title: "Invalid DynamoDB Table Name",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB",
    financialRisk: "Table creation failure in CloudFormation.",
    summary: "DynamoDB table names must be 3-255 characters matching [a-zA-Z0-9_.-]+.",
    badCode: `export const table = new Table("db", { tableName: "a" });`,
    goodCode: `export const table = new Table("db", { tableName: "orders-table" });`,
    remediation: "Ensure tableName is between 3 and 255 characters with valid symbols.",
    docsAnchor: "err_ddb_table_name",
  },

  ERR_DDB_KEY_COLLISION: {
    id: "ERR_DDB_KEY_COLLISION",
    title: "DynamoDB Partition Key and Sort Key Collision",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB",
    financialRisk: "Fatal CloudFormation deployment failure.",
    summary: "Partition key and sort key attribute names cannot be identical.",
    badCode: `export const table = new Table("db", { partitionKey: "id", sortKey: "id" });`,
    goodCode: `export const table = new Table("db", { partitionKey: "pk", sortKey: "sk" });`,
    remediation: "Use distinct attribute names for partitionKey and sortKey.",
    docsAnchor: "err_ddb_key_collision",
  },

  ERR_DDB_GSI_LIMIT: {
    id: "ERR_DDB_GSI_LIMIT",
    title: "DynamoDB Global Secondary Index Limit Exceeded",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB",
    financialRisk: "CloudFormation failure due to AWS hard quota of 20 GSIs per table.",
    summary: "A DynamoDB table cannot exceed 20 Global Secondary Indexes.",
    badCode: `// Table declaring 21+ global secondary indexes`,
    goodCode: `// Single-table design reusing sparse GSIs (e.g. gsi1pk, gsi1sk)`,
    remediation: "Consolidate GSIs using single-table design principles.",
    docsAnchor: "err_ddb_gsi_limit",
  },

  ERR_DDB_GSI_COLLISION: {
    id: "ERR_DDB_GSI_COLLISION",
    title: "DynamoDB GSI Index Name Collision",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB",
    financialRisk: "Fatal CloudFormation template validation error.",
    summary: "Duplicate GSI index names defined on the same DynamoDB table.",
    badCode: `// Two GSIs both named "byStatus"`,
    goodCode: `// Distinct index names for each secondary index`,
    remediation: "Assign unique index names to each Global Secondary Index.",
    docsAnchor: "err_ddb_gsi_collision",
  },

  ERR_ELECTRO_KEY_MISMATCH: {
    id: "ERR_ELECTRO_KEY_MISMATCH",
    title: "ElectroDB Entities Partition Key Inconsistency",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB & ElectroDB",
    financialRisk: "Incompatible schema writes corrupt single-table data layout and break query indexes.",
    summary: "ElectroDB entities in the same service must share the identical primary key schema (pkField and skField).",
    badCode: `// EntityA uses pkField: "pk", EntityB uses pkField: "id" in the same service`,
    goodCode: `// Both entities use pkField: "pk", skField: "sk"`,
    remediation: "Standardize pkField and skField across all ElectroDB entities in the service.",
    docsAnchor: "err_electro_key_mismatch",
  },

  ERR_ELECTRO_GSI_MISMATCH: {
    id: "ERR_ELECTRO_GSI_MISMATCH",
    title: "ElectroDB Entities GSI Definition Conflict",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB & ElectroDB",
    financialRisk: "Single-table index corruption resulting in failed queries or DynamoDB provision errors.",
    summary: "ElectroDB entities in the same service share a GSI index name but define conflicting index key attributes.",
    badCode: `// EntityA defines gsi1 with pk: "gsi1pk", EntityB defines gsi1 with pk: "alt_pk"`,
    goodCode: `// Consistent GSI key attribute names across all entities sharing the index`,
    remediation: "Align GSI attribute names across entities sharing the secondary index.",
    docsAnchor: "err_electro_gsi_mismatch",
  },

  ERR_ELECTRO_TABLE_KEY_MISMATCH: {
    id: "ERR_ELECTRO_TABLE_KEY_MISMATCH",
    title: "Explicit Table Schema Conflicts with ElectroDB Entity",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB & ElectroDB",
    financialRisk: "Schema mismatch prevents ElectroDB from querying or writing items to the synthesized DynamoDB table.",
    summary: "Explicit Table construct partitionKey/sortKey does not match the ElectroDB entity's primary index key fields.",
    badCode: `export const table = new Table("orders", { partitionKey: "orderId" }); // Entity uses "pk"`,
    goodCode: `export const table = new Table("orders", { partitionKey: "pk", sortKey: "sk" });`,
    remediation: "Update the Table definition to match ElectroDB's pkField and skField.",
    docsAnchor: "err_electro_table_key_mismatch",
  },

  ERR_ELECTRO_DUPLICATE_ENTITY: {
    id: "ERR_ELECTRO_DUPLICATE_ENTITY",
    title: "Duplicate ElectroDB Entity Name in Service",
    layer: "storage",
    severity: "error",
    service: "Amazon DynamoDB & ElectroDB",
    financialRisk: "Name collisions cause entity overwrite and unpredictable single-table item classification.",
    summary: "Two ElectroDB entities in the same service share the exact same entity name.",
    badCode: `// Two Entity definitions with model.entity: "user"`,
    goodCode: `// Unique entity names, e.g. "user" and "userProfile"`,
    remediation: "Give each ElectroDB entity in the service a distinct entity name.",
    docsAnchor: "err_electro_duplicate_entity",
  },

  // ==========================================
  // S3 Storage
  // ==========================================
  ERR_S3_BUCKET_NAME: {
    id: "ERR_S3_BUCKET_NAME",
    title: "Invalid S3 Bucket Name",
    layer: "storage",
    severity: "error",
    service: "Amazon S3",
    financialRisk: "Fatal CloudFormation creation failure.",
    summary: "S3 bucket names must be 3-63 characters, lowercase, and cannot contain underscores.",
    badCode: `export const bucket = new Bucket("my_bucket_name");`,
    goodCode: `export const bucket = new Bucket("my-bucket-name");`,
    remediation: "Use lowercase letters, numbers, and hyphens (3-63 chars) without underscores.",
    docsAnchor: "err_s3_bucket_name",
  },

  ERR_S3_OBJECT_LOCK: {
    id: "ERR_S3_OBJECT_LOCK",
    title: "S3 Object Lock Requires Bucket Versioning",
    layer: "storage",
    severity: "error",
    service: "Amazon S3",
    financialRisk: "CloudFormation rejection during S3 bucket provisioning.",
    summary: "S3 Object Lock cannot be enabled unless bucket versioning is also enabled.",
    badCode: `export const bucket = new Bucket("audit", { objectLock: true, versioned: false });`,
    goodCode: `export const bucket = new Bucket("audit", { objectLock: true, versioned: true });`,
    remediation: "Enable versioned: true when configuring objectLock on S3 buckets.",
    docsAnchor: "err_s3_object_lock",
  },

  // ==========================================
  // SQS Messaging
  // ==========================================
  ERR_SQS_QUEUE_NAME: {
    id: "ERR_SQS_QUEUE_NAME",
    title: "Invalid SQS Queue Name",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS",
    financialRisk: "Queue creation failure in CloudFormation.",
    summary: "SQS queue names must be 1-80 characters matching [a-zA-Z0-9-_]+.",
    badCode: `export const queue = new Queue("invalid queue name!");`,
    goodCode: `export const queue = new Queue("valid-queue-name");`,
    remediation: "Use alphanumeric characters, hyphens, and underscores up to 80 characters.",
    docsAnchor: "err_sqs_queue_name",
  },

  ERR_SQS_FIFO_NAME: {
    id: "ERR_SQS_FIFO_NAME",
    title: "SQS FIFO Queue Missing .fifo Suffix",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS",
    financialRisk: "Fatal AWS deployment failure (AWS rejects FIFO queues without .fifo suffix).",
    summary: "SQS FIFO queues must end with the '.fifo' suffix.",
    badCode: `export const queue = new Queue("orders", { fifo: true });`,
    goodCode: `export const queue = new Queue("orders.fifo", { fifo: true });`,
    remediation: "Add '.fifo' suffix to the queue name (e.g. 'orders.fifo').",
    docsAnchor: "err_sqs_fifo_name",
  },

  ERR_SQS_VISIBILITY_TIMEOUT: {
    id: "ERR_SQS_VISIBILITY_TIMEOUT",
    title: "Invalid SQS Visibility Timeout",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS",
    financialRisk: "Deployment failure in AWS SQS.",
    summary: "SQS visibilityTimeout must be between 0 seconds and 43,200 seconds (12 hours).",
    badCode: `export const queue = new Queue("jobs", { visibilityTimeout: "50000s" });`,
    goodCode: `export const queue = new Queue("jobs", { visibilityTimeout: "300s" });`,
    remediation: "Configure visibilityTimeout between 0s and 43200s (12h).",
    docsAnchor: "err_sqs_visibility_timeout",
  },

  ERR_SQS_BATCH_SIZE: {
    id: "ERR_SQS_BATCH_SIZE",
    title: "Invalid SQS Consumer Batch Size",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS & Lambda",
    financialRisk: "Event source mapping configuration error.",
    summary: "SQS consumer batchSize must be between 1 and 10 (or up to 10,000 for standard queues with batchWindow).",
    badCode: `export const worker = queue.consumer({ batchSize: 50000 }, ...);`,
    goodCode: `export const worker = queue.consumer({ batchSize: 10 }, ...);`,
    remediation: "Configure consumer batchSize within supported AWS limits.",
    docsAnchor: "err_sqs_batch_size",
  },

  ERR_SQS_DLQ_CYCLE: {
    id: "ERR_SQS_DLQ_CYCLE",
    title: "SQS Dead Letter Queue Self-Cycle",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS",
    financialRisk: "Poison-pill messages redelivered indefinitely into the same queue, causing infinite compute billing loops.",
    summary: "A queue cannot configure itself as its own deadLetterQueue.",
    badCode: `export const q = new Queue("jobs", { deadLetterQueue: { queue: "jobs" } });`,
    goodCode: `export const dlq = new Queue("jobs-dlq");
export const q = new Queue("jobs", { deadLetterQueue: { queue: dlq } });`,
    remediation: "Target a distinct dead-letter queue.",
    docsAnchor: "err_sqs_dlq_cycle",
  },

  ERR_SQS_DLQ_MAX_RECEIVE: {
    id: "ERR_SQS_DLQ_MAX_RECEIVE",
    title: "Invalid SQS DLQ maxReceiveCount",
    layer: "recursion",
    severity: "error",
    service: "Amazon SQS",
    financialRisk: "Improper retry policies cause messages to loop endlessly or drop prematurely.",
    summary: "deadLetterQueue.maxReceiveCount must be an integer >= 1.",
    badCode: `export const q = new Queue("jobs", { deadLetterQueue: { queue: dlq, maxReceiveCount: 0 } });`,
    goodCode: `export const q = new Queue("jobs", { deadLetterQueue: { queue: dlq, maxReceiveCount: 3 } });`,
    remediation: "Set maxReceiveCount to a positive integer (recommended: 3 to 5).",
    docsAnchor: "err_sqs_dlq_max_receive",
  },

  // ==========================================
  // SNS & Event Delivery
  // ==========================================
  ERR_SNS_FIFO_NAME: {
    id: "ERR_SNS_FIFO_NAME",
    title: "SNS FIFO Topic Missing .fifo Suffix",
    layer: "recursion",
    severity: "error",
    service: "Amazon SNS",
    financialRisk: "Fatal AWS deployment failure.",
    summary: "SNS FIFO topics must end with the '.fifo' suffix.",
    badCode: `export const topic = new Topic("events", { fifo: true });`,
    goodCode: `export const topic = new Topic("events.fifo", { fifo: true });`,
    remediation: "Add '.fifo' suffix to the topic name.",
    docsAnchor: "err_sns_fifo_name",
  },

  ERR_SNS_SQS_ENDPOINT: {
    id: "ERR_SNS_SQS_ENDPOINT",
    title: "Invalid SNS SQS Subscription Target",
    layer: "recursion",
    severity: "error",
    service: "Amazon SNS & SQS",
    financialRisk: "Broken pub/sub pipeline preventing critical event delivery.",
    summary: "SNS topic subscriber specifies an unresolved or invalid SQS queue endpoint.",
    badCode: `topic.subscribe("invalid-sqs-target");`,
    goodCode: `topic.subscribe(myQueue);`,
    remediation: "Reference a valid declared Queue construct or queue ARN.",
    docsAnchor: "err_sns_sqs_endpoint",
  },

  ERR_SNS_LAMBDA_ENDPOINT: {
    id: "ERR_SNS_LAMBDA_ENDPOINT",
    title: "Invalid SNS Lambda Subscription Target",
    layer: "recursion",
    severity: "error",
    service: "Amazon SNS & Lambda",
    financialRisk: "SNS subscription provisioning failure.",
    summary: "SNS topic subscription target does not resolve to a valid Lambda function.",
    badCode: `topic.subscribeFunction("nonExistentHandler");`,
    goodCode: `topic.subscribeFunction(myHandler);`,
    remediation: "Target a declared Lambda handler function.",
    docsAnchor: "err_sns_lambda_endpoint",
  },

  ERR_SNS_EMAIL_ENDPOINT: {
    id: "ERR_SNS_EMAIL_ENDPOINT",
    title: "Invalid SNS Email Subscription Address",
    layer: "governance",
    severity: "error",
    service: "Amazon SNS",
    financialRisk: "Subscription rejection and missing alert delivery.",
    summary: "SNS email subscription specifies a malformed email address.",
    badCode: `topic.subscribeEmail("not-an-email");`,
    goodCode: `topic.subscribeEmail("alerts@example.com");`,
    remediation: "Provide a valid email address.",
    docsAnchor: "err_sns_email_endpoint",
  },

  ERR_SNS_FIREHOSE_ENDPOINT: {
    id: "ERR_SNS_FIREHOSE_ENDPOINT",
    title: "Invalid SNS Firehose Subscription Target",
    layer: "storage",
    severity: "error",
    service: "Amazon SNS & Kinesis Firehose",
    financialRisk: "Broken analytics pipeline causing event loss.",
    summary: "SNS topic subscription specifies an invalid or unresolvable DeliveryStream target.",
    badCode: `topic.subscribeDeliveryStream("missingStream");`,
    goodCode: `topic.subscribeDeliveryStream(myStream);`,
    remediation: "Target a declared DeliveryStream construct.",
    docsAnchor: "err_sns_firehose_endpoint",
  },

  // ==========================================
  // Kinesis Firehose & Streams
  // ==========================================
  ERR_FIREHOSE_STREAM_NAME: {
    id: "ERR_FIREHOSE_STREAM_NAME",
    title: "Invalid Firehose DeliveryStream Name",
    layer: "storage",
    severity: "error",
    service: "Amazon Kinesis Data Firehose",
    financialRisk: "Deployment failure in CloudFormation.",
    summary: "Firehose delivery stream names must be 1-64 characters matching [a-zA-Z0-9_.-]+.",
    badCode: `export const stream = new DeliveryStream("invalid firehose name!");`,
    goodCode: `export const stream = new DeliveryStream("valid-firehose-name");`,
    remediation: "Use alphanumeric characters, hyphens, and underscores up to 64 characters.",
    docsAnchor: "err_firehose_stream_name",
  },

  ERR_FIREHOSE_BUFFER_INTERVAL: {
    id: "ERR_FIREHOSE_BUFFER_INTERVAL",
    title: "Invalid Firehose Buffer Interval",
    layer: "storage",
    severity: "error",
    service: "Amazon Kinesis Data Firehose",
    financialRisk: "CloudFormation configuration rejection.",
    summary: "Firehose bufferInterval must be between 60 seconds and 900 seconds.",
    badCode: `export const stream = new DeliveryStream("events", { bufferInterval: 30 });`,
    goodCode: `export const stream = new DeliveryStream("events", { bufferInterval: 300 });`,
    remediation: "Set bufferInterval between 60s and 900s.",
    docsAnchor: "err_firehose_buffer_interval",
  },

  ERR_FIREHOSE_BUFFER_SIZE: {
    id: "ERR_FIREHOSE_BUFFER_SIZE",
    title: "Invalid Firehose Buffer Size",
    layer: "storage",
    severity: "error",
    service: "Amazon Kinesis Data Firehose",
    financialRisk: "CloudFormation configuration rejection.",
    summary: "Firehose bufferSize must be between 1 MB and 128 MB.",
    badCode: `export const stream = new DeliveryStream("events", { bufferSize: 256 });`,
    goodCode: `export const stream = new DeliveryStream("events", { bufferSize: 5 });`,
    remediation: "Configure bufferSize between 1MB and 128MB.",
    docsAnchor: "err_firehose_buffer_size",
  },

  ERR_STREAM_BATCH_SIZE: {
    id: "ERR_STREAM_BATCH_SIZE",
    title: "Invalid DynamoDB Stream Batch Size",
    layer: "compute",
    severity: "error",
    service: "Amazon DynamoDB Streams & Lambda",
    financialRisk: "Stream event source mapping failure.",
    summary: "DynamoDB stream consumer batchSize must be between 1 and 10,000.",
    badCode: `table.stream({ batchSize: 20000 }, ...);`,
    goodCode: `table.stream({ batchSize: 100 }, ...);`,
    remediation: "Set stream batchSize between 1 and 10000.",
    docsAnchor: "err_stream_batch_size",
  },

  // ==========================================
  // Security, Auth & Alarms
  // ==========================================
  ERR_AUTH_PASSWORD_MIN_LENGTH: {
    id: "ERR_AUTH_PASSWORD_MIN_LENGTH",
    title: "Cognito Password Policy minLength Below AWS Limit",
    layer: "security",
    severity: "error",
    service: "Amazon Cognito",
    financialRisk: "Cognito UserPool creation failure (AWS minimum is 6 characters).",
    summary: "Cognito UserPool passwordPolicy.minLength must be at least 6 characters.",
    badCode: `export const auth = new Auth("users", { passwordPolicy: { minLength: 4 } });`,
    goodCode: `export const auth = new Auth("users", { passwordPolicy: { minLength: 8 } });`,
    remediation: "Set passwordPolicy.minLength >= 6 (recommended: >= 12).",
    docsAnchor: "err_auth_password_min_length",
  },

  WARN_AUTH_PASSWORD_LENGTH_SHORT: {
    id: "WARN_AUTH_PASSWORD_LENGTH_SHORT",
    title: "Cognito Password Minimum Length Less Than 8",
    layer: "security",
    severity: "warning",
    service: "Amazon Cognito",
    financialRisk: "Weak authentication credential vulnerabilities lead to account takeovers and credential stuffing attacks.",
    summary: "Password minLength of 6 or 7 meets AWS hard floor but falls short of security best practices (8+ chars).",
    badCode: `export const auth = new Auth("users", { passwordPolicy: { minLength: 6 } });`,
    goodCode: `export const auth = new Auth("users", { passwordPolicy: { minLength: 12 } });`,
    remediation: "Increase passwordPolicy.minLength to 8 or greater.",
    docsAnchor: "warn_auth_password_length_short",
  },

  WARN_SECRET_LEAK: {
    id: "WARN_SECRET_LEAK",
    title: "Hardcoded Secret In Environment Variable",
    layer: "security",
    severity: "warning",
    service: "AWS Lambda & CloudFormation",
    financialRisk: "Credential leakage allows malicious actors unauthorized access to cloud assets and upstream paid APIs.",
    summary: "Literal API key, token, or secret pattern detected in Lambda environment variables.",
    badCode: `export const api = api({ env: { STRIPE_KEY: "sk_live_1234567890" } }, ...);`,
    goodCode: `export const api = api({ env: { STRIPE_KEY: new Secret("stripe-key") } }, ...);`,
    remediation: "Use new Secret(...) or AWS Secrets Manager / SSM Parameter Store instead of hardcoded strings.",
    docsAnchor: "warn_secret_leak",
  },

  ERR_IAM_ACTION_FORMAT: {
    id: "ERR_IAM_ACTION_FORMAT",
    title: "Malformed IAM Policy Action",
    layer: "security",
    severity: "error",
    service: "AWS IAM",
    financialRisk: "IAM policy compilation rejection by AWS CloudFormation.",
    summary: "IAM policy actions must match 'service:action' format (e.g. 'dynamodb:GetItem').",
    badCode: `export const role = new Role("myRole", { actions: ["GetItem"] });`,
    goodCode: `export const role = new Role("myRole", { actions: ["dynamodb:GetItem"] });`,
    remediation: "Prefix the action with the AWS service namespace (e.g. 's3:GetObject').",
    docsAnchor: "err_iam_action_format",
  },

  WARN_IAM_LEAST_PRIVILEGE: {
    id: "WARN_IAM_LEAST_PRIVILEGE",
    title: "Overly Permissive IAM Wildcard Action",
    layer: "security",
    severity: "warning",
    service: "AWS IAM",
    financialRisk: "Excessive IAM privileges expand attack blast radius across the AWS account.",
    summary: "Wildcard IAM action (e.g. '*' or 's3:*') grants broader permissions than required.",
    badCode: `export const role = new Role("worker", { actions: ["*"] });`,
    goodCode: `export const role = new Role("worker", { actions: ["sqs:ReceiveMessage", "sqs:DeleteMessage"] });`,
    remediation: "Scope down IAM actions to specific least-privilege operations.",
    docsAnchor: "warn_iam_least_privilege",
  },

  ERR_ALARM_EVALUATION_PERIODS: {
    id: "ERR_ALARM_EVALUATION_PERIODS",
    title: "Invalid CloudWatch Alarm Evaluation Periods",
    layer: "governance",
    severity: "error",
    service: "Amazon CloudWatch",
    financialRisk: "Alarm creation rejection in CloudFormation.",
    summary: "CloudWatch alarm evaluationPeriods must be an integer >= 1.",
    badCode: `export const alarm = new Alarm("errs", { evaluationPeriods: 0 });`,
    goodCode: `export const alarm = new Alarm("errs", { evaluationPeriods: 3 });`,
    remediation: "Set evaluationPeriods to an integer >= 1.",
    docsAnchor: "err_alarm_evaluation_periods",
  },

  ERR_BUDGET_INVALID_NAME: {
    id: "ERR_BUDGET_INVALID_NAME",
    title: "Invalid AWS Budget Name",
    layer: "governance",
    severity: "error",
    service: "AWS Budgets",
    financialRisk: "Budget creation failure in AWS Budgets API.",
    summary: "AWS budget names must be 1-100 characters matching [a-zA-Z0-9=+_.:@/-]+.",
    badCode: `export const budget = new Budget("cap", { budgetName: "my invalid budget!" });`,
    goodCode: `export const budget = new Budget("cap", { budgetName: "monthly-production-cap" });`,
    remediation: "Ensure budgetName is between 1 and 100 characters with valid characters.",
    docsAnchor: "err_budget_invalid_name",
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

// ✨ Modern TypeScript Enum Alternative:
// Provides both a compile-time string literal union (type RuleCode)
// AND an immutable runtime namespace object (const RuleCode.WARN_...)
export type RuleCode = keyof typeof RULES_CATALOG;

export const RuleCode = Object.freeze(
  (Object.keys(RULES_CATALOG) as (keyof typeof RULES_CATALOG)[]).reduce((acc, k) => {
    acc[k] = k;
    return acc;
  }, {} as Record<RuleCode, RuleCode>)
);
