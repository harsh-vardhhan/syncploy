import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { BucketIR } from "../../../types";
import {
  extractBoolean,
  extractNumber,
  extractString,
  extractCommentSuppressions,
} from "../ast-utils";

export function extractBucket(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): { bucket: BucketIR; bucketName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Bucket") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Bucket '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const bucketName = args[0].getLiteralValue();

  let versioned = false;
  let eventBridge = false;
  let publicAccessBlock = true;
  let accountScoped = false;
  let objectLock: BucketIR["objectLock"];
  let logicalId: string | undefined;
  let customBucketName: string | undefined;
  let retain: boolean | undefined;
  let deletionPolicy: "Retain" | "Delete" | "Snapshot" | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customBucketName = extractString(opts.getProperty("bucketName"));
    retain = extractBoolean(opts.getProperty("retain"));
    deletionPolicy = extractString(opts.getProperty("deletionPolicy")) as any;

    const vProp = opts.getProperty("versioned");
    if (vProp && vProp.isKind(SyntaxKind.PropertyAssignment)) {
      versioned = vProp.getInitializer()?.getText() === "true";
    }
    const ebProp = opts.getProperty("eventBridge");
    if (ebProp && ebProp.isKind(SyntaxKind.PropertyAssignment)) {
      eventBridge = ebProp.getInitializer()?.getText() === "true";
    }
    const pabProp = opts.getProperty("publicAccessBlock");
    if (pabProp && pabProp.isKind(SyntaxKind.PropertyAssignment)) {
      publicAccessBlock = pabProp.getInitializer()?.getText() !== "false";
    }
    const asProp = opts.getProperty("accountScoped");
    if (asProp && asProp.isKind(SyntaxKind.PropertyAssignment)) {
      accountScoped = asProp.getInitializer()?.getText() === "true";
    }
    const olProp = opts.getProperty("objectLock");
    if (olProp && olProp.isKind(SyntaxKind.PropertyAssignment)) {
      const olInit = olProp.getInitializer();
      if (olInit && olInit.getText() === "true") {
        objectLock = true;
      } else if (olInit && olInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const mode = extractString(olInit.getProperty("mode")) as any;
        const days = extractNumber(olInit.getProperty("days"));
        const years = extractNumber(olInit.getProperty("years"));
        objectLock = { mode, days, years };
      }
    }
  }

  return {
    bucket: {
      id: varName,
      name: bucketName,
      versioned,
      eventBridge,
      publicAccessBlock,
      accountScoped,
      objectLock,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      bucketName: customBucketName,
      retain,
      deletionPolicy,
      suppressions: extractCommentSuppressions(decl),
    },
    bucketName,
  };
}
