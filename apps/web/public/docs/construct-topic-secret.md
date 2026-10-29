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

---

## `Budget` (AWS Budgets Financial Guardrail)

Declare financial spend limits with automated CloudWatch and SNS alerts to guarantee total stack compute and storage liability never exceeds your financial appetite:

```typescript
import { Budget, Topic } from "@syncploy/sdk";

export const alertTopic = new Topic("alerts", {
  logicalId: "SystemAlertsTopic",
});

// Hard budget guardrail: alerts via SNS when monthly spend reaches 80% of $50
export const monthlyBudget = new Budget("monthly-cap", {
  amount: 50, // $50.00 USD monthly limit
  unit: "USD",
  threshold: 80, // Alert at 80% ($40)
  topic: alertTopic,
  filterByStack: true, // Scoped to this CloudFormation stack
});
```

Syncploy's AST compiler statically validates that:
- The budget amount is a static positive integer or float (`ERR_BUDGET_INVALID_AMOUNT`).
- The alert topic resolves to a declared SNS Topic construct in the stack (`ERR_BUDGET_UNRESOLVED_TOPIC`).
- Stacks with high continuous compute liability ($> \$100/\text{mo}$) declare a Budget to prevent unmonitored overruns (`WARN_DOW_HIGH_BLAST_RADIUS`).
