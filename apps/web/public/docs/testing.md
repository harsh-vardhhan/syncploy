# In-Memory Zero-Mock Testing

Testing serverless applications typically requires either complex Docker setups (like LocalStack) or brittle mock objects (`aws-sdk-mock`).

Syncploy includes an **in-memory simulated runtime harness** directly inside `@syncploy/sdk/testing`.

---

## Testing API Handlers

```typescript
import { test, expect } from "bun:test";
import { uploadAnnotation } from "../src/app";
import { patientTable, processingQueue } from "../src/infra";

test("creates patient annotation and enqueues task", async () => {
  // Reset in-memory state:
  patientTable.clear();
  processingQueue.clear();

  // Invoke the API handler directly with a Fetch Request:
  const request = new Request("https://api.internal/annotations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientId: "P-100", notes: "Normal ECG" }),
  });

  const response = await uploadAnnotation(request);
  const data = await response.json();

  expect(response.status).toBe(200);
  expect(data.status).toBe("queued");

  // Verify state persisted in-memory:
  const items = await patientTable.query({ PK: "PATIENT#P-100" });
  expect(items.length).toBe(1);

  // Verify queue received the message:
  const messages = processingQueue.getInFlightMessages();
  expect(messages.length).toBe(1);
  expect(messages[0].body.patientId).toBe("P-100");
});
```

> [!TIP]
> In-memory tests run in under **5 milliseconds** with zero external network calls or cloud credentials.
