# Safety Rails & Loop Shield

Serverless architectures scale automatically to absorb traffic surges — but without compile-time guardrails, an architectural bug can scale your AWS account into financial ruin.

Syncploy integrates an automated **Pre-Flight Safety Engine** that inspects your application's Abstract Syntax Tree (AST) before synthesis, halting compilation if infinite loops or Denial-of-Wallet (DoW) vulnerabilities are detected.

---

## 1. Infinite Recursion Loop Prevention

In event-driven architectures, **infinite recursion loops** are the #1 cause of catastrophic surprise cloud bills ($10,000+ overnight charges).

A classic loop occurs when a Lambda function consumes records from a DynamoDB Stream and accidentally writes back to the same table. Each write produces a new stream event, triggering an exponential runaway chain reaction.

```typescript
// ❌ HAZARDOUS CODE:
export const badStreamWorker = patientTable.stream({ batchSize: 50 }, async (record) => {
  // BUG: Writing back to the stream source table!
  await patientTable.put({
    id: record.id,
    updatedAt: Date.now(),
  });
});
```

### How the Shield Works
Syncploy builds a **Static Directed Graph** of your entire architecture during compilation:
1. Tracks all event producers (DynamoDB Streams, S3 EventBridge, SQS Queues, SNS Topics).
2. Tracks all event consumers (Lambda handlers).
3. Inspects handler AST bodies for write mutations (`table.put`, `queue.send`, `bucket.upload`, `topic.publish`).
4. Performs **Cycle Detection (Tarjan's strongly connected components algorithm)** across direct and multi-hop paths.

### Compiler Diagnostic Output
When a cycle is detected, Syncploy halts compilation immediately before anything touches AWS:

```text
✖ [ERR_RECURSIVE_LOOP] in src/workers/stream.ts:
  • Infinite recursion loop detected: 
    Table 'patientTable' -> Stream Consumer 'badStreamWorker' -> Table 'patientTable'
  
  • This event-driven cycle causes continuous self-amplifying Lambda 
    invocations and exponential Denial-of-Wallet (DoW).

✖ Compilation aborted. 0 AWS resources modified.
```

### Multi-Hop Cycle Detection
Syncploy also detects complex cross-service loops, such as:
```text
Table A -> Stream Worker -> Queue B -> Consumer -> Topic C -> Subscriber -> Table A
```

---

## 2. Denial-of-Wallet (DoW) Auditing

Unthrottled API endpoints under DDoS or bot crawling will scale your AWS account to its maximum limit (1,000+ parallel Lambda instances), causing massive financial Denial-of-Wallet (DoW).

Syncploy enforces static safety rails before code is deployed.

### Audit Rules Reference

| Rule Code | Severity | Description | Remediation |
| --- | --- | --- | --- |
| `WARN_DOW_UNRESERVED_CONCURRENCY` | Warning | Public Function URL has no concurrency limit | Add `concurrency: <number>` |
| `WARN_DOW_STREAM_UNBOUNDED` | Warning | DynamoDB stream consumer has unbounded concurrency | Configure `concurrency: <number>` |
| `WARN_DOW_MISSING_DLQ` | Warning | Active SQS queue has no Dead Letter Queue | Configure `deadLetterQueue: { maxReceiveCount: 3 }` |
| `ERR_SQS_VISIBILITY_TIMEOUT_SHORT` | **Fatal Error** | Queue visibilityTimeout is shorter than consumer timeout | Set `visibilityTimeout >= 6 * timeout` |

---

## 3. Production Hardening Examples

### Capping Public Function URLs
```typescript
// ✅ PROTECTED: Capped at 50 parallel instances
export const publicApi = api(
  { path: "/search", ingress: "function-url", concurrency: 50 },
  async (req) => {
    return Response.json({ results: [] });
  }
);
```

### Preventing Poison Pill Cascades with DLQs
```typescript
// ✅ PROTECTED: Messages failing 3 times are quarantined in the DLQ
export const workQueue = new Queue("orders", {
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "OrdersDeadLetterQueue",
  },
});
```

### Enforcing SQS 6x Visibility Math
```typescript
// ✅ PROTECTED: Visibility timeout is 6x consumer execution timeout
export const taskQueue = new Queue("tasks", {
  visibilityTimeout: "180s",
});

export const taskWorker = taskQueue.consumer(
  { timeout: "30s", concurrency: 10 },
  async (batch) => {
    // Process batch
  }
);
```
