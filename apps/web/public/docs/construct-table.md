# Table (DynamoDB & ElectroDB)

The `Table` construct provisions an `AWS::DynamoDB::Table` optimized for Single-Table Design with pay-per-request billing, point-in-time recovery, and stream processing.

```typescript
import { Table } from "@syncploy/sdk";

export const ehrTable = new Table("ehr", {
  logicalId: "EhrTable",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  indexes: {
    GSI1: {
      partitionKey: { name: "GSI1PK", type: "string" },
      sortKey: { name: "GSI1SK", type: "string" },
      projection: "ALL",
    },
  },
});
```

---

## ElectroDB First-Class Integration

Syncploy has opinionated first-class support for [ElectroDB](https://electrodb.dev).

When you define ElectroDB entities, Syncploy:
1. Automatically infers the table primary key attributes.
2. Combines and unions all GSIs across all entities in your service.
3. Validates schema consistency at compile-time to prevent conflicting index declarations.

```typescript
import { Entity } from "electrodb";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

export const PatientEntity = new Entity({
  model: { entity: "patient", version: "1", service: "ehr" },
  attributes: {
    patientId: { type: "string", required: true },
    clinicId: { type: "string", required: true },
    fullName: { type: "string", required: true },
  },
  indexes: {
    primary: { pk: { field: "PK", composite: ["clinicId"] }, sk: { field: "SK", composite: ["patientId"] } },
    byPatient: { index: "GSI1", pk: { field: "GSI1PK", composite: ["patientId"] } },
  },
});
```

> [!TIP]
> Syncploy detects `PatientEntity` and automatically provisions `EhrTable` with `PK`, `SK`, and `GSI1` without duplicate manual YAML declarations!

---

## Stream Processing & Concurrency Protection

Connect an asynchronous Lambda stream worker directly to changes on the table:

```typescript
export const auditStreamWorker = ehrTable.stream(
  {
    batchSize: 100,
    startingPosition: "LATEST",
    concurrency: 5, // Capped to prevent shard split DDoS attacks
  },
  async (record) => {
    // Process DynamoDB stream event
  }
);
```

---

## Runtime Client API

```typescript
// Type-safe runtime operations:
await ehrTable.put({ PK: "CLINIC#1", SK: "DOC#10", status: "PENDING" });
const item = await ehrTable.get({ PK: "CLINIC#1", SK: "DOC#10" });
await ehrTable.delete({ PK: "CLINIC#1", SK: "DOC#10" });
```

---

## Denial-of-Wallet Immunity: No Table Scans

Never invoke `.scan()` on DynamoDB tables inside HTTP request handlers or API endpoints. Full-table scans consume Read Capacity Units linearly proportional to the size of your entire table ($O(N)$ read amplification), causing astronomical bills under high query load.

Syncploy's pre-flight AST analyzer detects `.scan()` calls in API endpoints and raises warning `WARN_DOW_DYNAMODB_SCAN`. Always query using partition keys, sort key conditions, or ElectroDB secondary indexes.
