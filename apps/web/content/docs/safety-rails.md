# Safety Rails & Denial-of-Wallet Shield

The primary reason teams pay a 10x–50x PaaS tax on Vercel or Render isn't developer ergonomics—it is **fear of an unbounded AWS bill**.

On standard AWS (raw CDK, SAM, or Serverless Framework), concurrency defaults to account-wide limits (1,000+ instances), event streams retry for 24 continuous hours without dead-letter queues, and log groups never expire. A single accidental stream loop or public scraping flood can burn a $10,000+ credit limit overnight while CloudFormation deploys without a single warning.

Syncploy embeds a **Pre-Flight Safety Engine** directly into the compiler. In $<1\text{ms}$ during Abstract Syntax Tree (AST) parsing, Syncploy models the infrastructure topology as a directed graph, verifies mathematical blast-radius bounds, detects event cycles, and halts compilation before any resources can be synthesized or deployed.

---

## 1. Why Runtime Billing Alarms Fail

Most engineering teams rely on AWS CloudWatch Billing Alarms or AWS Budgets. These are **post-mortem notifications**, not preventative guardrails:

| Feature | AWS CloudWatch Billing Alarm | Syncploy Pre-Flight Shield |
| :--- | :--- | :--- |
| **Enforcement Point** | Post-execution (15 to 45 min delay) | **Pre-flight AST compilation (<1ms)** |
| **Mitigation Action** | Sends an email or SNS alert | **Aborts compilation; 0 resources synthesized** |
| **Protection While Sleeping** | ❌ None. Bill continues to surge until human intervention | **✅ Total. Unbounded code cannot deploy to AWS** |
| **Native Circuit Breaker** | ❌ None. AWS provides no native auto-shutdown | **✅ Mathematical. Hardware compute liabilities hard-capped** |

> [!WARNING]
> AWS has no native "spend circuit breaker" for Lambda. When an account-level CloudWatch billing alarm triggers, it only dispatches a notification. Without custom auto-reaper automation, runaway Lambdas and unthrottled endpoints continue processing and billing at full velocity.

---

## 2. The Mathematical Blast-Radius Guarantee

Denial-of-Wallet cannot be solved with rate limiting alone—rate limiters can be bypassed, spoofed, or misconfigured. True financial immunity requires **mathematically bounding hardware liabilities in code**.

Even if an unauthenticated endpoint is targeted by an unmitigated 500,000,000-request DDoS flood, its monthly compute spend cannot physically exceed the ceiling of its assigned resources:

$$\text{Max Monthly Compute} = \text{Concurrency} \times \frac{\text{Memory MB}}{1024} \times 2,592,000\text{s} \times \$0.0000166667$$

### Hardware Ceiling Reference

| Reserved Concurrency | Memory Allocation | Worst-Case Sustained 24/7 Spend | Standard AWS Default (1,000 Concurrency) |
| :---: | :---: | :---: | :---: |
| **2** | 128 MB | **$10.80 / mo** | $5,400.00 / mo |
| **5** | 256 MB | **$54.00 / mo** | $10,800.00 / mo |
| **10** | 512 MB | **$216.00 / mo** | $21,600.00 / mo |
| **25** | 1024 MB | **$1,080.00 / mo** | $43,200.00 / mo |

Syncploy rule `WARN_DOW_UNRESERVED_CONCURRENCY` statically requires an explicit concurrency cap on all public Function URLs and API routes:

```typescript
// ❌ HAZARDOUS (Standard AWS): Scales to 1,000+ account instances under DDoS
export const webhook = api.post("/webhook", async (req) => {
  return { status: "received" };
});

// ✅ IMMUNIZED (Syncploy): Hardware-bounded to $27.00/mo under 24/7 sustained DDoS
export const webhook = api.post("/webhook", { concurrency: 5, memory: "128MB" }, async (req) => {
  return { status: "received" };
});
```

---

## 3. Tarjan's SCC Infinite Loop Killer

In event-driven architectures, **infinite recursion loops** are the #1 cause of five-figure cloud bills ($10,000+ overnight charges).

A classic failure occurs when a Lambda consumes a DynamoDB Stream and writes back to that same table. Each write produces a new stream event, creating a continuous, self-amplifying execution avalanche:

```
┌────────────────────────────────────────────────────────┐
│               INFINITE RECURSION CYCLE                 │
│                                                        │
│   Table 'orders' ──(Stream Event)──► worker Lambda     │
│          ▲                                │            │
│          └───────────(table.put)──────────┘            │
└────────────────────────────────────────────────────────┘
```

Multi-hop cycles are equally catastrophic and virtually impossible to catch in manual code review:
$$\text{Table A} \longrightarrow \text{Worker 1} \longrightarrow \text{Queue B} \longrightarrow \text{Worker 2} \longrightarrow \text{Table A}$$

### How the Compiler Traps Loops in <1ms

1. **Trigger Edges**: Compiler maps event sources (`Table.stream`, `Queue.onMessage`, `Bucket.onObjectCreated`) to consumer Lambdas.
2. **Mutation Edges**: Compiler inspects function bodies for mutation calls (`table.put`, `table.update`, `queue.send`, `bucket.put`, `topic.publish`, HTTP fetch self-calls).
3. **Graph Construction**: Constructs a directed bipartite graph $G = (V, E)$ where vertices are AWS constructs and edges are async mutations.
4. **Tarjan's SCC Algorithm**: Executes Tarjan's Strongly Connected Components algorithm in $O(V + E)$ linear time ($<1\text{ms}$).
5. **Immediate Compilation Abort**:

```text
✖ [ERR_RECURSIVE_LOOP] in src/workers/order-sync.ts:
  • Infinite recursion loop detected:
    Table 'orders' ──► Stream Consumer 'syncOrders' ──► Table 'orders'

  • Cycle triggers self-amplifying Lambda executions, scaling to maximum account
    concurrency within seconds.

✖ Compilation aborted. 0 AWS resources modified.
```

---

## 4. The 4 Defensive Layers

Syncploy's pre-flight compiler runs 26 deterministic safety rules across 4 operational layers:

### Layer 1: Compute Blast-Radius Bounding
- **Strict Concurrency Ceilings**: Public Function URLs and API routes must declare explicit concurrency bounds (`WARN_DOW_UNRESERVED_CONCURRENCY`).
- **Stream Throttling**: DynamoDB stream consumers are auto-bounded to prevent runaway concurrent batch workers (`WARN_DOW_STREAM_UNBOUNDED`).
- **Account Quota Sentinel**: Aggregates reserved concurrency across the entire stack, warning if total $\ge 900$ to prevent starvation of critical services (`WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED`).

### Layer 2: Event-Driven Recursion & Poison-Pill Shields
- **Tarjan's SCC Cycle Detection**: Statically identifies 1-hop and multi-hop recursive cycles across tables, queues, and streams (`ERR_RECURSIVE_LOOP`).
- **SQS 6× Timeout Invariant**: Enforces that queue `visibilityTimeout` is $\ge 6 \times$ consumer `timeout` to eliminate duplicate processing storms (`ERR_SQS_TIMEOUT_MISMATCH`, `WARN_SQS_VISIBILITY_TIMEOUT_SHORT`).
- **Mandatory Dead Letter Queues (DLQs)**: Active queues and stream consumers require DLQs (`maxReceiveCount: 3`) to isolate poison-pill records instead of retrying for days (`WARN_DOW_MISSING_DLQ`).
- **No Table Scans**: Detects `$O(N)$` full-table scans in request paths to prevent crawling bots from draining Read Capacity Units (`WARN_DOW_DYNAMODB_SCAN`).

### Layer 3: Storage & Log Leak Neutralization
- **Automatic 14-Day CloudWatch Log Rotation**: Auto-synthesizes dedicated `AWS::Logs::LogGroup` resources with `RetentionInDays: 14` for every Lambda. Eliminates default "Never Expire" log accumulation bills (`INFO_DOW_LOG_ROTATION`).
- **Automatic S3 Multipart Abort**: Attaches `AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }` to all buckets to purge orphan upload chunks (`INFO_DOW_S3_MULTIPART_ABORT`).

### Layer 4: Financial Governance, Fraud Defense & Data Safety
- **AWS Budgets Ceiling**: Validates `new Budget(...)` constructs and ensures SNS alert topics are wired to real notification targets (`WARN_DOW_BUDGET_NO_NOTIFICATION`).
- **SMS International Toll Fraud Shield**: Warns against unmonitored SNS SMS subscriptions and Cognito phone verification endpoints (`WARN_DOW_SMS_TOLL_FRAUD`).
- **Zero Data-Loss Replacement Gatekeeper**: `syncploy diff --check-replacement` verifies that no stateful resource (DynamoDB table, S3 bucket) will be destroyed during updates (`ERR_STATEFUL_REPLACEMENT`).

---

## 5. Diagnostic Suppression & CI/CD Auditing

In rare cases where recursion is intentionally bounded by application logic (such as a finite state-machine transition in DynamoDB), diagnostics can be suppressed with an explicit inline reason:

```typescript
// syncploy-ignore ERR_RECURSIVE_LOOP reason="State machine terminates on status: 'COMPLETED'"
export const stateWorker = patientTable.stream({ batchSize: 10 }, async (record) => {
  if (record.status !== "COMPLETED") {
    await patientTable.put({ ...record, status: "COMPLETED" });
  }
});
```

Every suppressed diagnostic is verified during `syncploy build` and printed as an explicit audit trail in your CI/CD pipeline:

```text
[AUDIT] 1 diagnostic suppressed:
  • ERR_RECURSIVE_LOOP in src/workers/stateWorker.ts: State machine terminates on status: 'COMPLETED'
```
