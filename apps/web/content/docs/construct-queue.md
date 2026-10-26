# Queue & DLQ (Amazon SQS)

The `Queue` construct provisions resilient message queues with automatic Dead-Letter Queue (DLQ) redrive configurations.

```typescript
import { Queue } from "@syncploy/sdk";

export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "AnnotationDLQ",
  },
});
```

---

## Connecting Consumers

Attach an asynchronous Lambda consumer with automatic IAM policy synthesis and batch management:

```typescript
export const annotationWorker = annotationQueue.consumer(
  {
    batchSize: 10,
    timeout: "30s",  // Must be strictly <= 1/6 visibilityTimeout
    concurrency: 5,  // Reserved concurrency cap
  },
  async (batch) => {
    for (const message of batch) {
      console.log("Processing message:", message.body);
    }
  }
);
```

---

## The SQS 6x Visibility Formula

> [!IMPORTANT]
> AWS strongly recommends that SQS `visibilityTimeout` be at least **6 times** your consumer Lambda `timeout`.

If a consumer takes 30s to process a batch and the queue visibility timeout is only 40s, a minor processing hiccup will release the message back into the queue while the original Lambda is still running, triggering duplicate executions and database collisions.

Syncploy audits this at compile-time and **halts compilation** if `visibilityTimeout < consumer.timeout`.

---

## Runtime Client API

```typescript
// Send a single message
await annotationQueue.send({ patientId: "123", documentId: "456" });

// Send a batch of messages in one request
await annotationQueue.sendBatch([
  { id: "1", body: { patientId: "123" } },
  { id: "2", body: { patientId: "124" } },
]);
```
