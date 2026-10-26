# Bucket (Amazon S3)

The `Bucket` construct provisions secure, enterprise-grade Amazon S3 object storage with enforced encryption and public access blocks.

```typescript
import { Bucket } from "@syncploy/sdk";

// Standard medical document bucket with EventBridge notifications
export const documentsBucket = new Bucket("documents", {
  logicalId: "DocumentsBucket",
  eventBridge: true,
  publicAccessBlock: true,
});

// HIPAA compliance audit bucket with immutable Object Lock
export const auditLogsBucket = new Bucket("audit-logs", {
  logicalId: "EhrAuditLogsBucket",
  accountScoped: true,
  objectLock: {
    mode: "COMPLIANCE",
    days: 365,
  },
  publicAccessBlock: true,
});
```

---

## Event Routing & Notifications

Route S3 file upload events directly to an SQS queue with prefix and suffix filters:

```typescript
import { annotationQueue } from "./queue";

documentsBucket.on("objectCreated", annotationQueue, {
  prefix: "clinical-notes/",
  suffix: ".pdf",
});
```

---

## Runtime Client API

```typescript
// Read and write text:
await documentsBucket.putText("notes/patient-1.txt", "Blood pressure: 120/80");
const text = await documentsBucket.getText("notes/patient-1.txt");

// Read and write binary buffers:
await documentsBucket.putBuffer("scans/xray.png", imageBuffer, "image/png");
const buffer = await documentsBucket.getBuffer("scans/xray.png");

// List files:
const files = await documentsBucket.list({ prefix: "notes/" });
```
