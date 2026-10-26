# Topic & Secret (SNS & Secrets)

Manage pub/sub broadcast notifications with `Topic` and secure environment secrets with `Secret`.

---

## `Topic` (Amazon SNS)

Provision pub/sub messaging channels with multi-destination fanout:

```typescript
import { Topic, Queue } from "@syncploy/sdk";

export const alertTopic = new Topic("alerts", {
  logicalId: "SystemAlertsTopic",
});

// Subscribe an SQS queue:
export const notificationQueue = new Queue("notifications");
alertTopic.subscribe(notificationQueue);

// Subscribe a Lambda handler directly:
alertTopic.subscribe(async (event) => {
  console.log("Alert received:", event.message);
});
```

---

## `Secret` (AWS Secrets Manager)

Reference sensitive credentials without hardcoding plaintext tokens in your repository:

```typescript
import { Secret, api } from "@syncploy/sdk";

export const stripeKey = new Secret("STRIPE_SECRET_KEY");

export const paymentWebhook = api({ path: "/webhook", method: "POST" }, async (req) => {
  // Secret is securely read from environment at runtime:
  const key = stripeKey.value;
  return Response.json({ success: true });
});
```

> [!WARNING]
> Syncploy's compiler inspects all environment variables and flags literal secrets (like `sk_live_...` or `ghp_...`) as fatal pre-flight build errors.
