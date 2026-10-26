# 5-Minute Quickstart

In this walkthrough, we will build a production-grade **Patient Document Annotation API** with a DynamoDB single-table, an SQS processing queue with DLQ, and an authenticated Lambda Function URL.

---

## Step 1: Initialize Project

```bash
mkdir my-serverless-service && cd my-serverless-service
bun init -y
bun add @syncploy/sdk
bun add -d syncploy @syncploy/compiler
```

---

## Step 2: Define Infrastructure (`src/infra.ts`)

Create `src/infra.ts` to declare your serverless constructs:

```typescript
import { Table, Queue, Auth } from "@syncploy/sdk";

// HIPAA-compliant Cognito Authentication
export const auth = new Auth("ehr-auth", {
  logicalId: "EhrUserPool",
  adminOnly: true,
  passwordPolicy: { minLength: 12 },
});

// Single-Table DynamoDB database with pay-per-request billing
export const patientTable = new Table("patients", {
  logicalId: "PatientTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
});

// Resilient SQS queue with 3x retry DLQ
export const processingQueue = new Queue("annotations", {
  logicalId: "AnnotationQueue",
  visibilityTimeout: "180s",
  deadLetterQueue: { maxReceiveCount: 3 },
});
```

---

## Step 3: Implement API Handler (`src/app.ts`)

Create `src/app.ts` with your application logic:

```typescript
import { api } from "@syncploy/sdk";
import { patientTable, processingQueue, auth } from "./infra";

export const uploadAnnotation = api(
  {
    path: "/annotations",
    method: "POST",
    ingress: "function-url",
    concurrency: 25, // DoW Protection: Caps max concurrent executions
    memory: 512,
  },
  async (req) => {
    const body = await req.json();

    // 1. Persist record to DynamoDB
    const record = {
      PK: `PATIENT#${body.patientId}`,
      SK: `DOC#${Date.now()}`,
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };
    await patientTable.put(record);

    // 2. Queue asynchronous annotation task
    await processingQueue.send({
      patientId: body.patientId,
      documentId: record.SK,
    });

    return Response.json({
      status: "queued",
      recordId: record.SK,
      poolId: auth.userPoolId, // Auto-injected Cognito pool ID
    });
  }
);
```

---

## Step 4: Run Compilation & Safety Audit

```bash
bunx syncploy build
```

Syncploy analyzes your AST, builds the Intermediate Representation, verifies that no circular recursion exists, and outputs:

```text
✔ Parsed 3 constructs in src/infra.ts
✔ Verified 0 infinite recursion cycles
✔ Verified 0 Denial-of-Wallet concurrency leaks
✔ Synthesized CloudFormation template to .syncploy/template.json
✔ Bundled uploadAnnotation Lambda asset (14.2 KB ESM)
```

> [!TIP]
> Inspect the synthesized `.syncploy/template.json` to see 100% standard AWS CloudFormation with zero custom runtime dependencies.
