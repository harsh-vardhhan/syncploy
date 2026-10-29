import type { DocItem } from '../types';

export const safetyRailsDoc: DocItem = {
  slug: "safety-rails",
  title: "Safety Rails & Denial-of-Wallet Shield",
  category: "Compiler & Safety",
  description: "Compile-time detection of infinite Lambda-DynamoDB cycles, mathematical blast-radius caps, and Denial-of-Wallet (DoW) auditing.",
  content: `
# Safety Rails & Denial-of-Wallet (DoW) Shield

Serverless architectures scale automatically to absorb traffic surges — but without compile-time guardrails, an architectural bug or external DDoS can scale your AWS account into financial ruin.

Syncploy integrates an automated **Pre-Flight Safety Engine** that inspects your application's Abstract Syntax Tree (AST) before synthesis, halting compilation if infinite event loops or Denial-of-Wallet (DoW) vulnerabilities are detected.

---

## 1. Infinite Recursion Loop Prevention

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

### How the Shield Works
Syncploy builds a **Static Directed Graph** of your entire architecture during compilation:
1. **Event Producers**: DynamoDB Streams, S3 EventBridge bindings, SQS Queues, SNS Topics, and HTTP routes.
2. **Event Consumers**: Lambda handlers, queue workers, stream consumers, and topic subscribers.
3. **AST Mutation Walkers**: Inspects handler bodies for write mutations (\`table.put\`, \`queue.send\`, \`bucket.putText\`, \`topic.publish\`, HTTP \`fetch\` self-calls).
4. **Tarjan SCC Cycle Detection**: Runs Tarjan's Strongly Connected Components algorithm in $O(V + E)$ linear time ($<1\\text{ms}$ even on graphs with 100+ nodes).

### Compiler Diagnostic Output
When a cycle is detected, Syncploy halts compilation immediately before anything touches AWS:

\`\`\`text
✖ [ERR_RECURSIVE_LOOP] in src/workers/stream.ts:
  • Infinite recursion loop detected: 
    Table 'patientTable' -> Stream Consumer 'badStreamWorker' -> Table 'patientTable'
  
  • This event-driven cycle causes continuous self-amplifying Lambda 
    invocations and exponential Denial-of-Wallet (DoW).

✖ Compilation aborted. 0 AWS resources modified.
\`\`\`

### Supported Recursion Topologies
- **DynamoDB Table & Stream Loops**: \`Table -> Stream -> Table.put\`
- **Queue Consumer Amplification**: \`Queue -> Consumer -> Queue.send\`
- **SNS-SQS Fan-Out Loops**: \`Topic -> SQS -> Consumer -> Topic.publish\`
- **S3 Prefix-Aware Discrimination**: Allows safe non-overlapping transitions (e.g. \`raw/ -> Queue -> processed/\`), but blocks cycles that write back to the monitored source prefix (\`uploads/ -> Queue -> uploads/\`).
- **HTTP Self-Invocations**: Detects when an API endpoint makes an internal \`fetch\` loop back to its own route or Function URL.

---

## 2. Denial-of-Wallet (DoW) Safety Rails

Unthrottled public endpoints under DDoS or bot crawling can scale your AWS account to its maximum limit (1,000+ parallel Lambda instances), causing severe financial Denial-of-Wallet.

Syncploy enforces mathematical blast-radius bounds and edge rate limits before code is deployed.

### The Mathematical Blast Radius Formula
What truly defends against Denial-of-Wallet is setting explicit concurrency limits. Even under a 100,000,000-request DDoS attack, a capped function cannot exceed its physical compute limit:

$$\\text{Worst-Case Monthly Bill} = \\text{Concurrency} \\times \\frac{\\text{Memory MB}}{1024} \\times 2,592,000\\text{s} \\times \\$0.0000166667$$

For example, a function configured with \`concurrency: 5\` and \`memory: "256MB"\` has a theoretical maximum 24/7 monthly liability of:
$$5 \\times 0.25 \\times 2,592,000 \\times 0.0000166667 \\approx \\$54.00/\\text{month}$$

### Audit Rules Reference

| Rule Code | Severity | Description | Remediation |
| --- | --- | --- | --- |
| \`ERR_RECURSIVE_LOOP\` | **Fatal Error** | Infinite event-driven cycle detected via Tarjan SCC | Break the mutation cycle or add prefix separation |
| \`WARN_DOW_UNRESERVED_CONCURRENCY\` | Warning | Public Function URL has no concurrency limit | Add \`concurrency: <number>\` to cap blast radius |
| \`WARN_DOW_PUBLIC_API_BURST\` | Warning | Endpoint has \`allowOrigins: ['*']\` with high memory/timeout and no concurrency | Configure \`concurrency: <number>\` |
| \`WARN_DOW_STREAM_UNBOUNDED\` | Warning | DynamoDB stream consumer has unbounded concurrency | Configure \`concurrency: <number>\` |
| \`WARN_DOW_STREAM_RETRY_UNLIMITED\` | Warning | Stream explicitly configured \`retryAttempts: -1\` | Configure \`retryAttempts: 3\` |
| \`WARN_DOW_STREAM_MISSING_DLQ\` | Warning | Active DynamoDB stream has no DLQ configured | Add \`onFailure: "myDlqQueue"\` |
| \`WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED\` | Warning | Total reserved concurrency across stack exceeds 900 of account limit (1,000) | Request quota increase or reduce reserved allocations |
| \`ERR_SQS_VISIBILITY_TIMEOUT_SHORT\` | **Fatal Error** | Queue visibilityTimeout is shorter than 6x consumer timeout | Set \`visibilityTimeout >= 6 * timeout\` |
| \`WARN_DOW_BUDGET_NO_NOTIFICATION\` | Warning | Budget has no explicit notification topic and no fallback topic | Configure \`topic: myAlertTopic\` |
| \`ERR_BUDGET_UNRESOLVED_TOPIC\` | **Fatal Error** | Budget configured a topic that does not exist in the stack | Verify topic name or declare \`new Topic(...)\` |
| \`ERR_BUDGET_INVALID_AMOUNT\` | **Fatal Error** | Budget amount is missing, zero, or a dynamic expression | Set a static positive literal (e.g. \`amount: 50\`) |
| \`ERR_BUDGET_INVALID_THRESHOLD\` | **Fatal Error** | Budget threshold is not a static percentage number | Set literal percentage (e.g. \`threshold: 80\`) |
| \`ERR_BUDGET_INVALID_UNIT\` | **Fatal Error** | Budget currency unit is not a 3-letter ISO code | Use a standard 3-letter code (e.g. \`'USD'\`, \`'EUR'\`) |
| \`ERR_BUDGET_INVALID_FILTER\` | **Fatal Error** | Budget \`filterByStack\` is not a boolean literal | Set \`filterByStack: true\` or \`false\` |
| \`ERR_DUPLICATE_BUDGET_ID\` | **Fatal Error** | Two budgets share the same identifier | Ensure each Budget has a unique ID |
| \`ERR_DUPLICATE_BUDGET_NAME\` | **Fatal Error** | Two budgets share the same physical \`budgetName\` | AWS Budgets are account-global; use unique names |

---

## 3. Production Hardening Examples

### 1. Declaring a Stack-Level Budget Guardrail
Syncploy automatically synthesizes the \`AWS::Budgets::Budget\` resource, wires the \`AWS::SNS::TopicPolicy\` allowing \`budgets.amazonaws.com\` to publish, and scopes cost filters to the stack's Cost Allocation Tag:

\`\`\`typescript
import { Budget, Topic } from "@syncploy/sdk";

export const alertTopic = new Topic("alerts", {
  subscriptions: [{ protocol: "email", endpoint: "devops@example.com" }],
});

// Synthesizes AWS::Budgets::Budget + verified SNS TopicPolicy automatically
export const costBudget = new Budget("monthly-limit", {
  amount: 25,
  unit: "USD",
  threshold: 80, // Alert at 80% ($20.00)
  filterByStack: true,
  topic: alertTopic,
});
\`\`\`

### 2. Capping Public APIs & Edge Throttling
\`\`\`typescript
import { api } from "@syncploy/sdk";

// ✅ PROTECTED: Capped at 5 parallel instances, 50 req/sec edge ceiling
export const publicApi = api(
  {
    path: "/search",
    ingress: "api-gateway",
    concurrency: 5,
    throttle: { rateLimit: 50, burstLimit: 100 },
  },
  async (req) => {
    return Response.json({ results: [] });
  }
);
\`\`\`

### 3. Preventing Poison Pill Cascades with DLQs
\`\`\`typescript
import { Queue } from "@syncploy/sdk";

// ✅ PROTECTED: Messages failing 3 times are quarantined in the DLQ
export const workQueue = new Queue("orders", {
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "OrdersDeadLetterQueue",
  },
});
\`\`\`

### 4. Enforcing SQS 6x Visibility Math
\`\`\`typescript
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
\`\`\`

---

## 4. Diagnostic Suppression & Audit Trail

For legitimate recursive designs (such as a guarded state-machine transition in DynamoDB), you can suppress diagnostics with an in-code comment and an explicit reason:

\`\`\`typescript
// syncploy-ignore ERR_RECURSIVE_LOOP reason="State machine terminates on status: 'COMPLETED'"
export const stateWorker = myTable.stream({ batchSize: 10 }, async (record) => {
  if (record.status !== "COMPLETED") {
    await myTable.put({ ...record, status: "COMPLETED" });
  }
});
\`\`\`

When building, Syncploy records and prints a full audit trail of all suppressed diagnostics in CI/CD output:

\`\`\`text
[AUDIT] 1 diagnostic suppressed:
  • ERR_RECURSIVE_LOOP in src/workers.ts: State machine terminates on status: 'COMPLETED'
\`\`\`
`,
};
