import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { TopicIR } from "../../../types";
import type { ParseContext } from "../../types";
import { extractString } from "../ast-utils";

export function extractTopic(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context?: ParseContext
): { topic: TopicIR; topicName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Topic") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Topic '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const topicName = args[0].getLiteralValue();

  let fifo = false;
  let subscriptions: TopicIR["subscriptions"];
  let logicalId: string | undefined;
  let customTopicName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customTopicName = extractString(opts.getProperty("topicName"));
    fifo = opts.getProperty("fifo")?.getText() === "true";
    const subsProp = opts.getProperty("subscriptions");
    if (subsProp && subsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = subsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        subscriptions = [];
        for (const el of arr.getElements()) {
          if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
            const proto = extractString(el.getProperty("protocol")) || "email";
            let endp = extractString(el.getProperty("endpoint")) || "";
            if (!endp) {
              const epProp = el.getProperty("endpoint");
              if (epProp && epProp.isKind(SyntaxKind.PropertyAssignment)) {
                const initText = epProp.getInitializer()?.getText() || "";
                endp = initText.replace(/['"]/g, "");
              }
            }
            if (proto === "sqs" && context?.varToQueueName) {
              const baseVar = endp.includes(".") ? endp.split(".")[0]! : endp;
              endp = context.varToQueueName[baseVar] || context.varToQueueName[endp] || endp;
            }
            if (endp) {
              subscriptions.push({ protocol: proto, endpoint: endp });
            }
          }
        }
      }
    }
  }

  return {
    topic: {
      id: varName,
      name: topicName,
      fifo,
      subscriptions,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      topicName: customTopicName,
    },
    topicName,
  };
}
