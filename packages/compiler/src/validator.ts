const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;
import type { ResourceGraph, FunctionMutationsIR } from "./types";

export interface Diagnostic {
  code: string;
  message: string;
  constructId: string;
  sourceFile?: string | undefined;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

const CFN_LOGICAL_ID_REGEX = /^[A-Za-z0-9]{1,255}$/;
const S3_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
const IP_ADDRESS_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const SQS_QUEUE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,80}(\.fifo)?$/;
const DDB_TABLE_NAME_REGEX = /^[a-zA-Z0-9_.-]{3,255}$/;
const FIREHOSE_STREAM_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,64}$/;
const LAMBDA_FUNCTION_NAME_REGEX = /^[a-zA-Z0-9-_]{1,64}$/;

const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "OpenAI / LLM API Key", regex: /^sk-(?:proj-)?[a-zA-Z0-9_-]{20,}$/ },
  { name: "AWS Access Key", regex: /^AKIA[0-9A-Z]{16}$/ },
  { name: "GitHub Personal Access Token", regex: /^gh[pousr]_[a-zA-Z0-9]{20,}$/ },
  { name: "Private Key PEM", regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
];

export class GraphValidator {
  private diagnostics: Diagnostic[] = [];

  private addError(code: string, constructId: string, message: string, sourceFile?: string): void {
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "error" });
  }

  private addWarning(code: string, constructId: string, message: string, sourceFile?: string): void {
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "warning" });
  }

  public validate(graph: ResourceGraph): ValidationResult {
    this.diagnostics = [];

    this.validateLogicalIds(graph);
    this.validateApis(graph);
    this.validateConsumers(graph);
    this.validateTableStreams(graph);
    this.validateTopicSubscribers(graph);
    this.validateBuckets(graph);
    this.validateTables(graph);
    this.validateQueues(graph);
    this.validateTopics(graph);
    this.validateDeliveryStreams(graph);
    this.validateAlarms(graph);
    this.validateInfraRecursion(graph);
    this.validateDenialOfWallet(graph);

    const errors = this.diagnostics.filter((d) => d.severity === "error");
    const warnings = this.diagnostics.filter((d) => d.severity === "warning");

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // 1. CloudFormation Logical ID Validation (Alphanumeric only)
  private validateLogicalIds(graph: ResourceGraph): void {
    const allResources: { logicalId?: string | undefined; id: string; sourceFile?: string | undefined }[] = [
      ...graph.apis,
      ...graph.consumers,
      ...graph.tableStreams,
      ...graph.topicSubscribers,
      ...graph.buckets,
      ...graph.tables,
      ...graph.queues,
      ...(graph.topics || []),
      ...(graph.deliveryStreams || []),
      ...(graph.alarms || []),
    ];

    for (const r of allResources) {
      if (r.logicalId) {
        if (!CFN_LOGICAL_ID_REGEX.test(r.logicalId)) {
          const suggested = r.logicalId.replace(/[^A-Za-z0-9]/g, "");
          this.addError(
            "ERR_CFN_LOGICAL_ID",
            r.id,
            `Logical ID '${r.logicalId}' is invalid. AWS CloudFormation logical IDs must be strictly alphanumeric (no hyphens, underscores, or spaces). Consider using '${suggested}'.`,
            r.sourceFile
          );
        }
      }
    }
  }

  // 2. Lambda Functions (APIs)
  private validateApis(graph: ResourceGraph): void {
    for (const api of graph.apis) {
      if (!api.path.startsWith("/")) {
        this.addError(
          "ERR_API_PATH",
          api.id,
          `API path '${api.path}' is invalid. HTTP route paths must start with a forward slash '/'.`,
          api.sourceFile
        );
      }

      this.validateLambdaProperties(api.id, api, api.sourceFile);
      this.validateCors(api.id, api.cors, api.sourceFile);
      this.validatePolicies(api.id, api.policies, api.sourceFile);
      this.validateEnvironmentSecrets(api.id, api.environment, api.sourceFile);
    }
  }

  // 3. SQS Queue Consumers
  private validateConsumers(graph: ResourceGraph): void {
    for (const c of graph.consumers) {
      this.validateLambdaProperties(c.id, c, c.sourceFile);
      if (c.batchSize !== undefined) {
        if (!Number.isInteger(c.batchSize) || c.batchSize < 1 || c.batchSize > 10) {
          this.addError(
            "ERR_SQS_BATCH_SIZE",
            c.id,
            `Batch size ${c.batchSize} for consumer '${c.id}' is invalid. Standard SQS Lambda batchSize must be an integer between 1 and 10.`,
            c.sourceFile
          );
        }
      }
      this.validatePolicies(c.id, c.policies, c.sourceFile);
      this.validateEnvironmentSecrets(c.id, c.environment, c.sourceFile);
    }
  }

  // 4. DynamoDB Table Streams
  private validateTableStreams(graph: ResourceGraph): void {
    for (const s of graph.tableStreams) {
      this.validateLambdaProperties(s.id, s, s.sourceFile);
      if (s.batchSize !== undefined) {
        if (!Number.isInteger(s.batchSize) || s.batchSize < 1 || s.batchSize > 10000) {
          this.addError(
            "ERR_STREAM_BATCH_SIZE",
            s.id,
            `Batch size ${s.batchSize} for DynamoDB stream '${s.id}' is invalid. Must be an integer between 1 and 10,000.`,
            s.sourceFile
          );
        }
      }
      this.validatePolicies(s.id, s.policies, s.sourceFile);
      this.validateEnvironmentSecrets(s.id, s.environment, s.sourceFile);
    }
  }

  // 5. SNS Subscribers
  private validateTopicSubscribers(graph: ResourceGraph): void {
    for (const s of graph.topicSubscribers) {
      this.validateLambdaProperties(s.id, s, s.sourceFile);
      this.validatePolicies(s.id, s.policies, s.sourceFile);
      this.validateEnvironmentSecrets(s.id, s.environment, s.sourceFile);
    }
  }

  // Lambda Shared Properties: Memory, Timeout, Concurrency, FunctionName
  private validateLambdaProperties(
    id: string,
    func: {
      memory?: number | undefined;
      timeout?: number | undefined;
      concurrency?: number | undefined;
      functionName?: string | undefined;
    },
    sourceFile?: string
  ): void {
    if (func.memory !== undefined) {
      if (!Number.isInteger(func.memory) || func.memory < 128 || func.memory > 10240) {
        this.addError(
          "ERR_LAMBDA_MEMORY",
          id,
          `Memory '${func.memory}MB' for '${id}' is invalid. AWS Lambda memory must be a whole integer between 128 MB and 10,240 MB (10 GB) in 1 MB increments.`,
          sourceFile
        );
      }
    }

    if (func.timeout !== undefined) {
      if (!Number.isInteger(func.timeout) || func.timeout < 1 || func.timeout > 900) {
        this.addError(
          "ERR_LAMBDA_TIMEOUT",
          id,
          `Timeout '${func.timeout}s' for '${id}' is invalid. AWS Lambda timeout must be an integer between 1 second and 900 seconds (15 minutes).`,
          sourceFile
        );
      }
    }

    if (func.concurrency !== undefined) {
      if (!Number.isInteger(func.concurrency) || func.concurrency < 0) {
        this.addError(
          "ERR_LAMBDA_CONCURRENCY",
          id,
          `Concurrency '${func.concurrency}' for '${id}' is invalid. ReservedConcurrentExecutions must be an integer >= 0.`,
          sourceFile
        );
      }
    }

    if (func.functionName) {
      if (!func.functionName.includes("${") && !LAMBDA_FUNCTION_NAME_REGEX.test(func.functionName)) {
        this.addError(
          "ERR_LAMBDA_FUNCTION_NAME",
          id,
          `FunctionName '${func.functionName}' for '${id}' is invalid. Must be 1-64 characters matching [a-zA-Z0-9-_].`,
          sourceFile
        );
      }
    }
  }

  // 6. S3 Buckets
  private validateBuckets(graph: ResourceGraph): void {
    for (const b of graph.buckets) {
      if (b.bucketName && !b.bucketName.includes("${")) {
        const name = b.bucketName;
        if (name.length < 3 || name.length > 63) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must be between 3 and 63 characters long.`,
            b.sourceFile
          );
        } else if (/[A-Z]/.test(name)) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must be strictly lowercase (RFC 1123).`,
            b.sourceFile
          );
        } else if (name.includes("_")) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot contain underscores '_'. Use hyphens '-' instead.`,
            b.sourceFile
          );
        } else if (name.includes("..")) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot contain consecutive periods '..'.`,
            b.sourceFile
          );
        } else if (IP_ADDRESS_REGEX.test(name)) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names cannot be formatted as an IP address.`,
            b.sourceFile
          );
        } else if (!S3_BUCKET_NAME_REGEX.test(name)) {
          this.addError(
            "ERR_S3_BUCKET_NAME",
            b.id,
            `Bucket '${b.name}' has invalid bucketName '${name}'. S3 bucket names must start and end with a letter or number.`,
            b.sourceFile
          );
        }
      }

      if (b.objectLock && typeof b.objectLock === "object") {
        if (b.objectLock.days !== undefined && b.objectLock.years !== undefined) {
          this.addError(
            "ERR_S3_OBJECT_LOCK",
            b.id,
            `Bucket '${b.name}': S3 Object Lock retention cannot specify both 'days' and 'years' simultaneously.`,
            b.sourceFile
          );
        }
        if (b.objectLock.days !== undefined && (!Number.isInteger(b.objectLock.days) || b.objectLock.days < 1)) {
          this.addError(
            "ERR_S3_OBJECT_LOCK",
            b.id,
            `Bucket '${b.name}': Object Lock retention days must be an integer >= 1.`,
            b.sourceFile
          );
        }
        if (b.objectLock.years !== undefined && (!Number.isInteger(b.objectLock.years) || b.objectLock.years < 1)) {
          this.addError(
            "ERR_S3_OBJECT_LOCK",
            b.id,
            `Bucket '${b.name}': Object Lock retention years must be an integer >= 1.`,
            b.sourceFile
          );
        }
      }
    }
  }

  // 7. DynamoDB Tables
  private validateTables(graph: ResourceGraph): void {
    for (const t of graph.tables) {
      if (t.tableName && !t.tableName.includes("${")) {
        if (!DDB_TABLE_NAME_REGEX.test(t.tableName)) {
          this.addError(
            "ERR_DDB_TABLE_NAME",
            t.id,
            `Table '${t.name}' has invalid tableName '${t.tableName}'. Must be 3-255 characters matching [a-zA-Z0-9_.-].`,
            t.sourceFile
          );
        }
      }

      // Partition key vs Sort key collision
      if (t.sortKey && t.sortKey.name === t.partitionKey.name) {
        this.addError(
          "ERR_DDB_KEY_COLLISION",
          t.id,
          `Table '${t.name}': Sort key name '${t.sortKey.name}' cannot be identical to partition key name.`,
          t.sourceFile
        );
      }

      // GSIs
      if (t.indexes) {
        const gsiEntries = Object.entries(t.indexes);
        if (gsiEntries.length > 20) {
          this.addError(
            "ERR_DDB_GSI_LIMIT",
            t.id,
            `Table '${t.name}' defines ${gsiEntries.length} Global Secondary Indexes. DynamoDB allows a maximum of 20 GSIs per table.`,
            t.sourceFile
          );
        }

        for (const [idxName, idx] of gsiEntries) {
          if (idx.sortKey && idx.sortKey === idx.partitionKey) {
            this.addError(
              "ERR_DDB_GSI_COLLISION",
              t.id,
              `Table '${t.name}', Index '${idxName}': GSI sortKey cannot be identical to GSI partitionKey '${idx.partitionKey}'.`,
              t.sourceFile
            );
          }
        }
      }
    }
  }

  // 8. SQS Queues
  private validateQueues(graph: ResourceGraph): void {
    for (const q of graph.queues) {
      const qName = q.queueName || q.name;
      const isFifo = q.fifo === true;

      if (!qName.includes("${")) {
        if (!SQS_QUEUE_NAME_REGEX.test(qName)) {
          this.addError(
            "ERR_SQS_QUEUE_NAME",
            q.id,
            `Queue '${q.name}' has invalid queueName '${qName}'. Must be 1-80 characters matching [a-zA-Z0-9_-].`,
            q.sourceFile
          );
        }

        // FIFO .fifo suffix enforcement
        if (isFifo && !qName.endsWith(".fifo")) {
          this.addError(
            "ERR_SQS_FIFO_NAME",
            q.id,
            `Queue '${q.name}' is configured as FIFO (fifo: true), but queueName '${qName}' does not end with the mandatory '.fifo' suffix.`,
            q.sourceFile
          );
        } else if (!isFifo && qName.endsWith(".fifo")) {
          this.addError(
            "ERR_SQS_FIFO_NAME",
            q.id,
            `Queue '${q.name}' ends with '.fifo', but is not configured as FIFO. Add 'fifo: true' to options.`,
            q.sourceFile
          );
        }
      }

      if (q.visibilityTimeout !== undefined) {
        if (!Number.isInteger(q.visibilityTimeout) || q.visibilityTimeout < 0 || q.visibilityTimeout > 43200) {
          this.addError(
            "ERR_SQS_VISIBILITY_TIMEOUT",
            q.id,
            `VisibilityTimeout ${q.visibilityTimeout}s for queue '${q.name}' is invalid. Must be an integer between 0 and 43,200 seconds (12 hours).`,
            q.sourceFile
          );
        }
      }

      if (q.deadLetterQueue) {
        const retries = q.deadLetterQueue.maxReceiveCount;
        if (!Number.isInteger(retries) || retries < 1 || retries > 1000) {
          this.addError(
            "ERR_SQS_DLQ_MAX_RECEIVE",
            q.id,
            `maxReceiveCount ${retries} for queue '${q.name}' DLQ is invalid. Must be an integer between 1 and 1,000.`,
            q.sourceFile
          );
        }

        if (q.deadLetterQueue.queueName && q.deadLetterQueue.queueName === qName) {
          this.addError(
            "ERR_SQS_DLQ_CYCLE",
            q.id,
            `Queue '${q.name}' cannot configure itself as its own Dead Letter Queue.`,
            q.sourceFile
          );
        }
      }
    }
  }

  // 9. SNS Topics
  private validateTopics(graph: ResourceGraph): void {
    for (const t of graph.topics || []) {
      const isFifo = t.fifo === true;
      const tName = t.topicName || t.name;

      if (!tName.includes("${")) {
        if (isFifo && !tName.endsWith(".fifo")) {
          this.addError(
            "ERR_SNS_FIFO_NAME",
            t.id,
            `Topic '${t.name}' is configured as FIFO (fifo: true), but topicName '${tName}' does not end with the mandatory '.fifo' suffix.`,
            t.sourceFile
          );
        }
      }

      for (const sub of t.subscriptions || []) {
        if (sub.protocol === "email" || sub.protocol === "email-json") {
          if (!sub.endpoint.includes("${") && !sub.endpoint.includes("process.env")) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(sub.endpoint)) {
              this.addError(
                "ERR_SNS_EMAIL_ENDPOINT",
                t.id,
                `Topic '${t.name}': Subscription email endpoint '${sub.endpoint}' is not a valid email address.`,
                t.sourceFile
              );
            }
          }
        }
      }
    }
  }

  // 10. Kinesis Firehose Delivery Streams
  private validateDeliveryStreams(graph: ResourceGraph): void {
    for (const ds of graph.deliveryStreams || []) {
      if (ds.streamName && !ds.streamName.includes("${")) {
        if (!FIREHOSE_STREAM_NAME_REGEX.test(ds.streamName)) {
          this.addError(
            "ERR_FIREHOSE_STREAM_NAME",
            ds.id,
            `DeliveryStream '${ds.name}' has invalid streamName '${ds.streamName}'. Must be 1-64 characters matching [a-zA-Z0-9_.-].`,
            ds.sourceFile
          );
        }
      }

      if (ds.bufferingSize !== undefined) {
        if (ds.bufferingSize < 1 || ds.bufferingSize > 128) {
          this.addError(
            "ERR_FIREHOSE_BUFFER_SIZE",
            ds.id,
            `DeliveryStream '${ds.name}': bufferingSize '${ds.bufferingSize}MB' is invalid. Firehose requires buffer size between 1 MB and 128 MB.`,
            ds.sourceFile
          );
        }
      }

      if (ds.bufferingInterval !== undefined) {
        if (ds.bufferingInterval < 60 || ds.bufferingInterval > 900) {
          this.addError(
            "ERR_FIREHOSE_BUFFER_INTERVAL",
            ds.id,
            `DeliveryStream '${ds.name}': bufferingInterval '${ds.bufferingInterval}s' is invalid. Firehose requires buffer interval between 60 seconds and 900 seconds (15 minutes).`,
            ds.sourceFile
          );
        }
      }
    }
  }

  // 11. CloudWatch Alarms
  private validateAlarms(graph: ResourceGraph): void {
    for (const a of graph.alarms || []) {
      if (a.evaluationPeriods !== undefined) {
        if (!Number.isInteger(a.evaluationPeriods) || a.evaluationPeriods < 1) {
          this.addError(
            "ERR_ALARM_EVALUATION_PERIODS",
            a.id,
            `Alarm '${a.name}': evaluationPeriods must be an integer >= 1.`,
            a.sourceFile
          );
        }
      }
    }
  }

  // 12. CORS Validation
  private validateCors(id: string, cors: any, sourceFile?: string): void {
    if (!cors || typeof cors !== "object") return;

    if (Array.isArray(cors.allowOrigins)) {
      for (const origin of cors.allowOrigins) {
        if (typeof origin === "string" && origin !== "*") {
          if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
            this.addError(
              "ERR_CORS_ORIGIN_PROTOCOL",
              id,
              `API '${id}': CORS origin '${origin}' is invalid. Origins must specify the protocol (e.g. 'http://${origin}' or 'https://${origin}').`,
              sourceFile
            );
          }
        }
      }
    }
  }

  // 13. IAM Policies Validation
  private validatePolicies(id: string, policies: any[] | undefined, sourceFile?: string): void {
    if (!policies || !Array.isArray(policies)) return;

    for (const stmt of policies) {
      if (Array.isArray(stmt.actions)) {
        for (const act of stmt.actions) {
          if (typeof act === "string" && act !== "*") {
            if (!act.includes(":")) {
              this.addError(
                "ERR_IAM_ACTION_FORMAT",
                id,
                `Policy statement in '${id}': Action '${act}' is invalid. Actions must follow the 'service:Action' format (e.g. 's3:GetObject').`,
                sourceFile
              );
            }
          }
        }

        // Security Warning: least privilege
        if (
          stmt.actions.includes("*") &&
          Array.isArray(stmt.resources) &&
          stmt.resources.includes("*")
        ) {
          this.addWarning(
            "WARN_IAM_LEAST_PRIVILEGE",
            id,
            `Overly permissive IAM policy in '${id}': Action '*' on Resource '*' grants full administrative access. Prefer least privilege.`,
            sourceFile
          );
        }
      }
    }
  }

  // 14. Secret Leak Scanner (Environment Variables)
  private validateEnvironmentSecrets(
    id: string,
    env: Record<string, string> | undefined,
    sourceFile?: string
  ): void {
    if (!env || typeof env !== "object") return;

    for (const [key, value] of Object.entries(env)) {
      if (typeof value === "string") {
        for (const pattern of SECRET_PATTERNS) {
          if (pattern.regex.test(value.trim())) {
            this.addWarning(
              "WARN_SECRET_LEAK",
              id,
              `Literal ${pattern.name} detected in environment variable '${key}' for '${id}'. Avoid committing plaintext credentials in source code. Inject them at deployment or via AWS Secrets Manager.`,
              sourceFile
            );
          }
        }
      }
    }
  }

  // 15. Infrastructure Recursion & Cycle Detection (Event Dependency Graph)
  private validateInfraRecursion(graph: ResourceGraph): void {
    interface GraphEdge {
      target: string;
      constructId: string;
      sourceFile?: string | undefined;
    }

    const adj = new Map<string, GraphEdge[]>();

    const addEdge = (from: string, target: string, constructId: string, sourceFile?: string) => {
      if (!adj.has(from)) adj.set(from, []);
      adj.get(from)!.push({ target, constructId, sourceFile });
    };

    // A. Trigger Edges:
    for (const s of graph.tableStreams) {
      addEdge(`Table '${s.tableName}'`, `Stream Consumer '${s.id}'`, s.id, s.sourceFile);
    }

    for (const c of graph.consumers) {
      addEdge(`Queue '${c.queueName}'`, `Queue Consumer '${c.id}'`, c.id, c.sourceFile);
    }

    for (const sub of graph.topicSubscribers) {
      addEdge(`Topic '${sub.topicName}'`, `Topic Subscriber '${sub.id}'`, sub.id, sub.sourceFile);
    }

    for (const b of graph.bindings || []) {
      addEdge(`Bucket '${b.sourceBucketName}'`, `Queue '${b.targetQueueName}'`, b.id);
    }

    // B. Mutation / Write Edges:
    const allFunctions: {
      id: string;
      nodeName: string;
      mutations?: FunctionMutationsIR | undefined;
      policies?: any[] | undefined;
      sourceFile?: string | undefined;
    }[] = [
      ...graph.tableStreams.map((s) => ({
        id: s.id,
        nodeName: `Stream Consumer '${s.id}'`,
        mutations: s.mutations,
        policies: s.policies,
        sourceFile: s.sourceFile,
      })),
      ...graph.consumers.map((c) => ({
        id: c.id,
        nodeName: `Queue Consumer '${c.id}'`,
        mutations: c.mutations,
        policies: c.policies,
        sourceFile: c.sourceFile,
      })),
      ...graph.topicSubscribers.map((sub) => ({
        id: sub.id,
        nodeName: `Topic Subscriber '${sub.id}'`,
        mutations: sub.mutations,
        policies: sub.policies,
        sourceFile: sub.sourceFile,
      })),
      ...graph.apis.map((api) => ({
        id: api.id,
        nodeName: `API '${api.id}'`,
        mutations: api.mutations,
        policies: api.policies,
        sourceFile: api.sourceFile,
      })),
    ];

    for (const fn of allFunctions) {
      for (const tbl of fn.mutations?.tablesWritten || []) {
        addEdge(fn.nodeName, `Table '${tbl}'`, fn.id, fn.sourceFile);
      }
      for (const bkt of fn.mutations?.bucketsWritten || []) {
        addEdge(fn.nodeName, `Bucket '${bkt}'`, fn.id, fn.sourceFile);
      }
      for (const q of fn.mutations?.queuesSent || []) {
        addEdge(fn.nodeName, `Queue '${q}'`, fn.id, fn.sourceFile);
      }
      for (const top of fn.mutations?.topicsPublished || []) {
        addEdge(fn.nodeName, `Topic '${top}'`, fn.id, fn.sourceFile);
      }

      if (fn.policies) {
        for (const stmt of fn.policies) {
          const acts: string[] = stmt.actions || [];
          const res: string[] = stmt.resources || [];

          if (
            acts.some(
              (a) =>
                a.startsWith("dynamodb:Put") ||
                a.startsWith("dynamodb:Update") ||
                a.startsWith("dynamodb:Delete") ||
                a.startsWith("dynamodb:BatchWrite")
            )
          ) {
            for (const t of graph.tables) {
              if (res.includes("*") || res.some((r) => r.includes(t.name) || (t.tableName && r.includes(t.tableName)))) {
                addEdge(fn.nodeName, `Table '${t.name}'`, fn.id, fn.sourceFile);
              }
            }
          }

          if (acts.some((a) => a === "sqs:SendMessage" || a === "sqs:SendMessageBatch")) {
            for (const q of graph.queues) {
              if (res.includes("*") || res.some((r) => r.includes(q.name) || (q.queueName && r.includes(q.queueName)))) {
                addEdge(fn.nodeName, `Queue '${q.name}'`, fn.id, fn.sourceFile);
              }
            }
          }

          if (acts.some((a) => a === "s3:PutObject" || a === "s3:PutObjectAcl")) {
            for (const b of graph.buckets) {
              if (res.includes("*") || res.some((r) => r.includes(b.name) || (b.bucketName && r.includes(b.bucketName)))) {
                addEdge(fn.nodeName, `Bucket '${b.name}'`, fn.id, fn.sourceFile);
              }
            }
          }

          if (acts.some((a) => a === "sns:Publish")) {
            for (const top of graph.topics || []) {
              if (res.includes("*") || res.some((r) => r.includes(top.name) || (top.topicName && r.includes(top.topicName)))) {
                addEdge(fn.nodeName, `Topic '${top.name}'`, fn.id, fn.sourceFile);
              }
            }
          }
        }
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const path: { node: string; constructId: string; sourceFile?: string }[] = [];
    const seenCycles = new Set<string>();

    const normalizeCycle = (nodes: string[]): string => {
      const cycleNodes = nodes.slice(0, -1);
      let minIdx = 0;
      for (let i = 1; i < cycleNodes.length; i++) {
        if (cycleNodes[i]! < cycleNodes[minIdx]!) {
          minIdx = i;
        }
      }
      const rotated = [...cycleNodes.slice(minIdx), ...cycleNodes.slice(0, minIdx)];
      return rotated.join(" -> ");
    };

    const dfs = (node: string, currentConstructId: string, currentSourceFile?: string) => {
      visited.add(node);
      recStack.add(node);
      path.push({ node, constructId: currentConstructId, sourceFile: currentSourceFile });

      const neighbors = adj.get(node) || [];
      for (const edge of neighbors) {
        if (!visited.has(edge.target)) {
          dfs(edge.target, edge.constructId, edge.sourceFile);
        } else if (recStack.has(edge.target)) {
          const startIndex = path.findIndex((p) => p.node === edge.target);
          if (startIndex !== -1) {
            const cycleSegment = path.slice(startIndex).map((p) => p.node).concat(edge.target);
            const normalized = normalizeCycle(cycleSegment);
            if (!seenCycles.has(normalized)) {
              seenCycles.add(normalized);
              const cycleStr = cycleSegment.join(" -> ");
              this.addError(
                "ERR_RECURSIVE_LOOP",
                edge.constructId,
                `Infinite recursion loop detected: ${cycleStr}. This event-driven cycle causes continuous self-amplifying Lambda invocations and exponential Denial-of-Wallet.`,
                edge.sourceFile
              );
            }
          }
        }
      }

      path.pop();
      recStack.delete(node);
    };

    for (const startNode of adj.keys()) {
      if (!visited.has(startNode)) {
        dfs(startNode, startNode);
      }
    }
  }

  // 16. Denial of Wallet (DoW) & DDoS Safety Rails
  private validateDenialOfWallet(graph: ResourceGraph): void {
    // A. SQS Queue Visibility Timeout vs Consumer Timeout & DLQ
    for (const q of graph.queues) {
      const activeConsumers = graph.consumers.filter((c) => c.queueName === q.name);

      if (activeConsumers.length > 0 && !q.deadLetterQueue) {
        this.addWarning(
          "WARN_DOW_MISSING_DLQ",
          q.id,
          `Queue '${q.name}' has active consumer(s) (${activeConsumers.map((c) => `'${c.id}'`).join(", ")}) but no 'deadLetterQueue' configured. Unhandled errors or poison pill messages will retry continuously for up to 14 days, draining your AWS budget. Configure 'deadLetterQueue: { maxReceiveCount: 3 }'.`,
          q.sourceFile
        );
      }

      for (const c of activeConsumers) {
        if (q.visibilityTimeout !== undefined && c.timeout !== undefined) {
          if (q.visibilityTimeout < c.timeout) {
            this.addError(
              "ERR_SQS_TIMEOUT_MISMATCH",
              c.id,
              `Queue '${q.name}' visibilityTimeout (${q.visibilityTimeout}s) is shorter than consumer '${c.id}' timeout (${c.timeout}s). SQS will redeliver in-flight messages before handler completes, causing cascading duplicate executions and runaway costs. Set queue visibilityTimeout to at least ${c.timeout}s (recommended: ${c.timeout * 6}s).`,
              c.sourceFile
            );
          } else if (q.visibilityTimeout < c.timeout * 2) {
            this.addWarning(
              "WARN_SQS_VISIBILITY_TIMEOUT_SHORT",
              c.id,
              `Queue '${q.name}' visibilityTimeout (${q.visibilityTimeout}s) is close to consumer '${c.id}' timeout (${c.timeout}s). AWS recommends queue visibilityTimeout be at least 6x consumer timeout to prevent duplicate executions under processing delays.`,
              c.sourceFile
            );
          }
        }
      }
    }

    // B. Public Routes & Function URLs Concurrency Guards
    for (const api of graph.apis) {
      if (api.ingress === "function-url" && api.auth !== true && api.concurrency === undefined) {
        this.addWarning(
          "WARN_DOW_UNRESERVED_CONCURRENCY",
          api.id,
          `Public Function URL '${api.id}' (${api.method} ${api.path}) has no 'concurrency' limit. Under a DDoS attack or traffic surge, Lambda will scale to account limits (1,000+ executions) causing severe Denial-of-Wallet. Consider configuring 'concurrency: <number>'.`,
          api.sourceFile
        );
      }

      if (
        api.concurrency === undefined &&
        api.cors &&
        typeof api.cors === "object" &&
        Array.isArray(api.cors.allowOrigins) &&
        api.cors.allowOrigins.includes("*") &&
        ((api.memory !== undefined && api.memory >= 512) || (api.timeout !== undefined && api.timeout >= 30))
      ) {
        this.addWarning(
          "WARN_DOW_PUBLIC_API_BURST",
          api.id,
          `Public endpoint '${api.id}' (${api.method} ${api.path}) with allowOrigins: ['*'] has high resource allocation (${api.memory || 128}MB, ${api.timeout || 30}s) and no 'concurrency' cap. Consider adding 'concurrency: <number>' to guard against DDoS cost amplification.`,
          api.sourceFile
        );
      }
    }

    // C. DynamoDB Stream Unbounded Concurrency
    for (const s of graph.tableStreams) {
      if (s.concurrency === undefined) {
        this.addWarning(
          "WARN_DOW_STREAM_UNBOUNDED",
          s.id,
          `DynamoDB stream consumer '${s.id}' for table '${s.tableName}' has no 'concurrency' cap. Heavy table write bursts can split shards and spawn uncontrolled parallel Lambda instances. Consider configuring 'concurrency: <number>'.`,
          s.sourceFile
        );
      }
    }
  }
}

export function formatDiagnostics(result: ValidationResult): string {
  const lines: string[] = [];

  for (const err of result.errors) {
    const loc = err.sourceFile ? ` in ${dim(err.sourceFile)}` : "";
    lines.push(`  ${red(bold(`[${err.code}]`))}${loc}`);
    lines.push(`  • ${err.message}`);
    lines.push("");
  }

  for (const warn of result.warnings) {
    const loc = warn.sourceFile ? ` in ${dim(warn.sourceFile)}` : "";
    lines.push(`  ${yellow(bold(`[${warn.code}]`))}${loc}`);
    lines.push(`  • ${warn.message}`);
    lines.push("");
  }

  return lines.join("\n");
}
