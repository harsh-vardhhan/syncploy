import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateTopics(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const topicDefs: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::SNS::Topic") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Topic");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Topic(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const topicNameVal = resolveValueExpr(props.TopicName, params, templateParams);
      if (topicNameVal) {
        lines.push(`  topicName: ${topicNameVal},`);
      }

      if (props.FifoTopic === true) {
        lines.push(`  fifo: true,`);
      }

      if (props.Subscription && props.Subscription.length > 0) {
        lines.push(`  subscriptions: [`);
        for (const sub of props.Subscription) {
          const epVal = resolveValueExpr(sub.Endpoint, params, templateParams) || JSON.stringify(sub.Endpoint);
          lines.push(`    { protocol: ${JSON.stringify(sub.Protocol)}, endpoint: ${epVal} },`);
        }
        lines.push(`  ],`);
      }

      lines.push(`});`);
      topicDefs.push(lines.join("\n"));
    }
  }

  const code = topicDefs.length > 0 ? "// --- SNS Topics ---\n" + topicDefs.join("\n\n") : "";
  return { code, adopted };
}
