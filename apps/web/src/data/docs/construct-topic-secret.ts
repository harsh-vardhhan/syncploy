import type { DocItem } from '../types';

export const constructTopicSecretDoc: DocItem = {
  slug: "construct-topic-secret",
  title: "Topic & Secret (SNS & Secrets)",
  category: "Core Constructs",
  description: "Fan-out pub/sub messaging with Amazon SNS and audited Secrets Manager integration.",
  content: "\n# Topic & Secret (SNS & Secrets)\n\nManage pub/sub broadcast notifications with `Topic` and secure environment secrets with `Secret`.\n\n---\n\n## `Topic` (Amazon SNS)\n\nProvision pub/sub messaging channels with multi-destination fanout:\n\n```typescript\nimport { Topic, Queue } from \"@syncploy/sdk\";\n\nexport const alertTopic = new Topic(\"alerts\", {\n  logicalId: \"SystemAlertsTopic\",\n});\n\n// Subscribe an SQS queue:\nexport const notificationQueue = new Queue(\"notifications\");\nalertTopic.subscribe(notificationQueue);\n\n// Subscribe a Lambda handler directly:\nalertTopic.subscribe(async (event) => {\n  console.log(\"Alert received:\", event.message);\n});\n```\n\n---\n\n## `Secret` (AWS Secrets Manager)\n\nReference sensitive credentials without hardcoding plaintext tokens in your repository:\n\n```typescript\nimport { Secret, api } from \"@syncploy/sdk\";\n\nexport const stripeKey = new Secret(\"STRIPE_SECRET_KEY\");\n\nexport const paymentWebhook = api({ path: \"/webhook\", method: \"POST\" }, async (req) => {\n  // Secret is securely read from environment at runtime:\n  const key = stripeKey.value;\n  return Response.json({ success: true });\n});\n```\n\n> [!WARNING]\n> Syncploy's compiler inspects all environment variables and flags literal secrets (like `sk_live_...` or `ghp_...`) as fatal pre-flight build errors.\n",
};
