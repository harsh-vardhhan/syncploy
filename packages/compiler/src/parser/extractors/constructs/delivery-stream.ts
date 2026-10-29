import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { DeliveryStreamIR } from "../../../types";
import type { ParseContext } from "../../types";
import {
  unwrapExpression,
  extractDuration,
  extractMemory,
  extractString,
  getNodeLocation,
} from "../ast-utils";

export function extractDeliveryStream(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): { deliveryStream: DeliveryStreamIR; streamName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "DeliveryStream") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `DeliveryStream '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const streamName = args[0].getLiteralValue();

  let destinationBucketName = "";
  let prefix: string | undefined;
  let errorPrefix: string | undefined;
  let bufferingInterval: number | undefined;
  let bufferingSize: number | undefined;
  let compression: DeliveryStreamIR["compression"] = "GZIP";
  let logicalId: string | undefined;
  let customStreamName: string | undefined;
  let roleLogicalId: string | undefined;

  const optArg = unwrapExpression(args[1]);
  if (args.length > 1 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = optArg as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customStreamName = extractString(opts.getProperty("streamName"));
    roleLogicalId = extractString(opts.getProperty("roleLogicalId"));
    const destProp = opts.getProperty("destination");
    if (destProp && destProp.isKind(SyntaxKind.PropertyAssignment)) {
      const destInit = destProp.getInitializer();
      if (destInit) {
        const rawDest = destInit.getText().replace(/['"]/g, "");
        destinationBucketName = context.varToBucketName[rawDest] || rawDest;
      }
    }
    prefix = extractString(opts.getProperty("prefix"));
    errorPrefix = extractString(opts.getProperty("errorPrefix"));
    bufferingInterval = extractDuration(opts.getProperty("bufferingInterval"));
    bufferingSize = extractMemory(opts.getProperty("bufferingSize"));
    const compStr = extractString(opts.getProperty("compression"));
    if (compStr) {
      compression = compStr as DeliveryStreamIR["compression"];
    }
  }

  const { line, column } = getNodeLocation(decl, sourceFile);

  return {
    deliveryStream: {
      id: varName,
      name: streamName,
      destinationBucketName,
      prefix,
      errorPrefix,
      bufferingInterval,
      bufferingSize,
      compression,
      sourceFile: sourceFile.getFilePath(),
      line,
      column,
      logicalId,
      streamName: customStreamName,
      roleLogicalId,
    },
    streamName,
  };
}
