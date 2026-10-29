import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { QueueIR } from "../../../types";
import {
  extractDuration,
  extractNumber,
  extractString,
  extractCommentSuppressions,
  getNodeLocation,
} from "../ast-utils";

export function extractQueue(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): { queue: QueueIR; queueName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Queue") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Queue '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const queueName = args[0].getLiteralValue();

  let visibilityTimeout: number | undefined;
  let deadLetterQueue: { maxReceiveCount: number; logicalId?: string | undefined; queueName?: string | undefined } | undefined;
  let fifo = false;
  let logicalId: string | undefined;
  let customQueueName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customQueueName = extractString(opts.getProperty("queueName"));
    visibilityTimeout = extractDuration(opts.getProperty("visibilityTimeout"));

    const fifoProp = opts.getProperty("fifo");
    if (fifoProp && fifoProp.isKind(SyntaxKind.PropertyAssignment)) {
      fifo = fifoProp.getInitializer()?.getText() === "true";
    }

    const dlqProp = opts.getProperty("deadLetterQueue");
    if (dlqProp && dlqProp.isKind(SyntaxKind.PropertyAssignment)) {
      const dlqObj = dlqProp.getInitializer();
      if (dlqObj && dlqObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const mrcProp = dlqObj.getProperty("maxReceiveCount");
        const maxReceiveCount = extractNumber(mrcProp) ?? 3;
        const dlqLogicalId = extractString(dlqObj.getProperty("logicalId"));
        const dlqQueueName = extractString(dlqObj.getProperty("queueName"));
        deadLetterQueue = { maxReceiveCount, logicalId: dlqLogicalId, queueName: dlqQueueName };
      }
    }
  }

  const { line, column } = getNodeLocation(decl, sourceFile);

  return {
    queue: {
      id: varName,
      name: queueName,
      visibilityTimeout,
      deadLetterQueue,
      fifo,
      sourceFile: sourceFile.getFilePath(),
      line,
      column,
      logicalId,
      queueName: customQueueName,
      suppressions: extractCommentSuppressions(decl),
    },
    queueName,
  };
}
