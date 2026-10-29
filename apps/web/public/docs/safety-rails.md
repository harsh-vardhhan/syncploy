# Safety Rails & Denial-of-Wallet (DoW) Shield

Serverless architectures scale automatically to absorb massive traffic surges — but without compile-time guardrails, an architectural bug, infinite event cycle, or distributed denial-of-service (DDoS) attack can scale your AWS account into financial ruin.

Syncploy integrates an automated **Pre-Flight Safety Engine** that inspects your application's Abstract Syntax Tree (AST) before synthesis, mathematically bounding execution liabilities and halting compilation if infinite event loops, poison-pill cascades, or Denial-of-Wallet (DoW) vulnerabilities are detected.

---

## 1. The Mathematical Blast-Radius Guarantee

What truly defends against Denial-of-Wallet is setting explicit concurrency limits. Even under an unmitigated 100,000,000-request DDoS flood, a capped function cannot exceed its physical compute ceiling:

$$\text{Worst-Case Monthly Bill} = \text{Concurrency} \times \frac{\text{Memory MB}}{1024} \times 2,592,000\text{s} \times \$0.0000166667$$

### Example Calculation
For an endpoint configured with `concurrency: 5` and `memory: "256MB"` running at 100% capacity 24 hours a day for 30 days:

$$5 \times \frac{256}{1024} \times 2,592,000 \times \$0.0000166667 \approx \$54.00/\text{month}$$

Regardless of how many millions of requests hit the URL, your cloud compute liability is mathematically hard-capped at **\$54.00**. Syncploy's compiler verifies that every public endpoint has an explicit blast-radius cap before anything touches AWS.

---

## 2. The 4 Layers of Denial-of-Wallet Immunity

Syncploy’s pre-flight safety rails enforce protection across 4 operational layers:

### Layer 1: Compute Blast-Radius Bounding
- **Strict Concurrency Ceilings**: Enforces explicit concurrency on public Function URLs and API routes (`WARN_DOW_UNRESERVED_CONCURRENCY`).
- **Stream Throttling**: Automatically bounds parallel worker instances on DynamoDB Streams (`WARN_DOW_STREAM_UNBOUNDED`).
- **Account Quota Sentinel**: Calculates total reserved concurrency across the entire stack, warning if sum $> 900$ to prevent account-wide throttling (`WARN_DOW_CONCURRENCY_BUDGET_EXCEEDED`).

### Layer 2: Event-Driven Recursion & Poison-Pill Shields
- **Tarjan's SCC Cycle Killer**: Evaluates event topology in $<1\text{ms}$ to detect multi-hop recursion loops (`ERR_RECURSIVE_LOOP`).
- **SQS $6\times$ Timeout Invariant**: Enforces that queue `visibilityTimeout` is $\ge 6 \times$ consumer `timeout` to eliminate duplicate execution avalanches (`ERR_SQS_TIMEOUT_MISMATCH`, `WARN_SQS_VISIBILITY_TIMEOUT_SHORT`).
- **Dead Letter Queue (DLQ) Auto-Redrive**: Prevents malformed poison-pill records from retrying endlessly for up to 14 days (`WARN_DOW_MISSING_DLQ`).
- **No Table Scans**: Blocks `$O(N)$` full-table scans in API routes to prevent bot crawls from draining Read Capacity Units (`WARN_DOW_DYNAMODB_SCAN`).

### Layer 3: Storage & Log Leak Neutralization
- **Automatic 14-Day CloudWatch Log Rotation**: Auto-synthesizes dedicated `AWS::Logs::LogGroup` with `RetentionInDays: 14` for every Lambda, eliminating permanent log accumulation bills (`INFO_DOW_LOG_ROTATION`).
- **Automatic S3 Multipart Abort**: Auto-attaches `AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 }` to every bucket to purge orphan chunk storage charges (`INFO_DOW_S3_MULTIPART_ABORT`).

### Layer 4: Financial Governance, Fraud Defense & Data Safety
- **AWS Budgets Ceiling**: Validates declared `new Budget(...)` constructs with automated CloudWatch/SNS notifications.
- **SMS International Toll Fraud Shield**: Warns against unmonitored SNS SMS subscriptions and Cognito phone verification endpoints (`WARN_DOW_SMS_TOLL_FRAUD`).
- **Stateful Replacement Gatekeeper**: Intercepts destructive table or bucket replacements during `syncploy diff --check-replacement` to prevent data loss.

---

## 3. Tarjan's SCC Infinite Recursion Loop Killer

In event-driven architectures, **infinite recursion loops** are the #1 cause of catastrophic surprise cloud bills ($10,000+ overnight charges).

A classic loop occurs when a Lambda function consumes records from a DynamoDB Stream and accidentally writes back to that same table. Each write produces a new stream event, triggering an exponential runaway chain reaction:

```
Table 'ehr' ──(Stream Event)──► Worker Lambda ──(table.put)──► Table 'ehr' (INFINITE LOOP)
```

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
1. **Trigger Edges**: Compiler maps event producers (`Table`, `Queue`, `Bucket`, `Topic`) to consumer Lambdas.
2. **Mutation Edges**: Compiler scans AST function bodies for write calls (`table.put`, `queue.send`, `bucket.putText`, `topic.publish`, HTTP `fetch` self-calls).
3. **Tarjan's SCC Algorithm**: Executes Tarjan's Strongly Connected Components algorithm in $O(V + E)$ linear time ($<1\text{ms}$).
4. **Immediate Compilation Abort**:

```text
✖ [ERR_RECURSIVE_LOOP] in src/workers/stream.ts:
  • Infinite recursion loop detected: 
    Table 'patientTable' -> Stream Consumer 'badStreamWorker' -> Table 'patientTable'
  
  • This event-driven cycle causes continuous self-amplifying Lambda 
    invocations and exponential Denial-of-Wallet (DoW).

✖ Compilation aborted. 0 AWS resources modified.
```

---

## 4. Pre-Flight Denial-of-Wallet Rules Catalog

Below is the complete 26-rule catalog enforced by Syncploy's pre-flight compiler before synthesis. Each rule is executed deterministically in $<1\text{ms}$ during AST parsing.

You can inspect, search, and copy verified code implementations for any rule in the **Interactive Rule Explorer** below or navigate directly using the **Rule Directory** in the right sidebar.

---

## 5. Diagnostic Suppression & CI/CD Audit Trail

For legitimate recursive designs (such as a guarded state-machine transition in DynamoDB), you can suppress diagnostics with an in-code comment and an explicit reason:

```typescript
// syncploy-ignore ERR_RECURSIVE_LOOP reason="State machine terminates on status: 'COMPLETED'"
export const stateWorker = myTable.stream({ batchSize: 10 }, async (record) => {
  if (record.status !== "COMPLETED") {
    await myTable.put({ ...record, status: "COMPLETED" });
  }
});
```

When building, Syncploy records and prints a full audit trail of all suppressed diagnostics in CI/CD output:

```text
[AUDIT] 1 diagnostic suppressed:
  • ERR_RECURSIVE_LOOP in src/workers.ts: State machine terminates on status: 'COMPLETED'
```
