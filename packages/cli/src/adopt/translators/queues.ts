import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateQueues(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const queueDefs: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::SQS::Queue") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Queue");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Queue(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const queueNameVal = resolveValueExpr(props.QueueName, params, templateParams);
      if (queueNameVal) {
        lines.push(`  queueName: ${queueNameVal},`);
      }

      if (props.VisibilityTimeout !== undefined) {
        lines.push(`  visibilityTimeout: ${props.VisibilityTimeout},`);
      }

      if (props.FifoQueue === true) {
        lines.push(`  fifo: true,`);
      }

      if (props.RedrivePolicy) {
        const maxReceiveCount = props.RedrivePolicy.maxReceiveCount || 5;
        lines.push(`  deadLetterQueue: {`);
        lines.push(`    maxReceiveCount: ${maxReceiveCount},`);
        lines.push(`  },`);
      }

      lines.push(`});`);
      queueDefs.push(lines.join("\n"));
    }
  }

  const code = queueDefs.length > 0 ? "// --- SQS Queues ---\n" + queueDefs.join("\n\n") : "";
  return { code, adopted };
}
