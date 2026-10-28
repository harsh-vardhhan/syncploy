import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type Statement,
  type SourceFile,
} from "ts-morph";
import type { EventBindingIR, BucketIR } from "../../types";
import type { ParseContext } from "../types";
import { unwrapExpression, extractString } from "./ast-utils";

export function extractEventBinding(
  statement: Statement,
  _sourceFile: SourceFile,
  context: ParseContext,
  buckets: BucketIR[]
): EventBindingIR | undefined {
  if (!statement.isKind(SyntaxKind.ExpressionStatement)) return undefined;

  const expr = statement.getExpression();
  if (!expr.isKind(SyntaxKind.CallExpression)) return undefined;

  const callee = expr.getExpression();
  if (
    !callee.isKind(SyntaxKind.PropertyAccessExpression) ||
    callee.getName() !== "on"
  ) {
    return undefined;
  }

  const bucketVar = callee.getExpression().getText();
  const args = expr.getArguments();
  if (args.length < 2) return undefined;

  const eventArg = args[0]
    ?.getText()
    .replace(/['"]/g, "") as "objectCreated" | "objectRemoved";
  const targetQueueVar = args[1]?.getText() || "";
  let prefix: string | undefined;
  let suffix: string | undefined;
  let ruleLogicalId: string | undefined;
  let queuePolicyLogicalId: string | undefined;

  const optArg = unwrapExpression(args[2]);
  if (args.length > 2 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = optArg as ObjectLiteralExpression;
    const pProp = opts.getProperty("prefix");
    if (pProp && pProp.isKind(SyntaxKind.PropertyAssignment)) {
      prefix = pProp.getInitializer()?.getText().replace(/['"]/g, "");
    }
    const sProp = opts.getProperty("suffix");
    if (sProp && sProp.isKind(SyntaxKind.PropertyAssignment)) {
      suffix = sProp.getInitializer()?.getText().replace(/['"]/g, "");
    }
    ruleLogicalId = extractString(opts.getProperty("ruleLogicalId"));
    queuePolicyLogicalId = extractString(opts.getProperty("queuePolicyLogicalId"));
  }

  const sourceBucketName = context.varToBucketName[bucketVar] || bucketVar;
  const targetQueueName = context.varToQueueName[targetQueueVar] || targetQueueVar;

  // Ensure the source bucket has eventBridge enabled
  const b = buckets.find((bucket) => bucket.name === sourceBucketName);
  if (b) {
    b.eventBridge = true;
  }

  return {
    id: `${bucketVar}_${targetQueueVar}_${eventArg}`,
    sourceBucketName,
    event: eventArg,
    targetQueueName,
    prefix,
    suffix,
    ruleLogicalId,
    queuePolicyLogicalId,
  };
}
