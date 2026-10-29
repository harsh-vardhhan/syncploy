import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { TopicIR } from "../../../types";
import type { ParseContext } from "../../types";
import { extractString, unwrapExpression, getNodeLocation, isSyncployConstruct } from "../ast-utils";

export function extractTopic(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context?: ParseContext
): { topic: TopicIR; topicName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (!isSyncployConstruct(init.getExpression(), "Topic", sourceFile)) return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  const topicName = args.length > 0 ? extractString(args[0]) : undefined;
  if (!topicName) {
    throw new Error(
      `Topic '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }

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
            const epProp = el.getProperty("endpoint");
            let endp = "";
            if (epProp) {
              let initNode: any;
              if (epProp.isKind(SyntaxKind.PropertyAssignment)) {
                initNode = epProp.getInitializer();
              } else if (epProp.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
                initNode = epProp.getNameNode();
              }
              const unwrapped = unwrapExpression(initNode);
              if (unwrapped) {
                if (
                  unwrapped.isKind(SyntaxKind.StringLiteral) ||
                  unwrapped.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
                ) {
                  endp = unwrapped.getLiteralValue();
                } else if (unwrapped.isKind(SyntaxKind.Identifier)) {
                  endp = unwrapped.getText();
                } else {
                  const raw = unwrapped.getText().trim();
                  const match = raw.match(/^process\.env\.([a-zA-Z0-9_]+)(?:\s*\|\|\s*['"](.*)['"])?$/);
                  if (match) {
                    const varName = match[1] || "";
                    const fallback = match[2] ?? "";
                    endp = process.env[varName] || fallback || raw;
                  } else {
                    endp = raw.replace(/['"]/g, "").trim();
                  }
                }
              }
            }
            if (proto === "sqs" && context?.varToQueueName) {
              const baseVar = endp.includes(".") ? endp.split(".")[0]! : endp;
              endp = context.varToQueueName[baseVar] || context.varToQueueName[endp] || endp;
            } else if (proto === "firehose" && context?.varToDeliveryStreamName) {
              const baseVar = endp.includes(".") ? endp.split(".")[0]! : endp;
              endp = context.varToDeliveryStreamName[baseVar] || context.varToDeliveryStreamName[endp] || endp;
            }
            if (endp) {
              subscriptions.push({ protocol: proto, endpoint: endp });
            }
          }
        }
      }
    }
  }

  const { line, column } = getNodeLocation(decl, sourceFile);

  return {
    topic: {
      id: varName,
      name: topicName,
      fifo,
      subscriptions,
      sourceFile: sourceFile.getFilePath(),
      line,
      column,
      logicalId,
      topicName: customTopicName,
    },
    topicName,
  };
}
