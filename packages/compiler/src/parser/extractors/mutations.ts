import { Node, SourceFile, SyntaxKind } from "ts-morph";
import type { FunctionMutationsIR } from "../../types";

export function extractMutationsFromNode(
  handlerNode: Node | undefined,
  sourceFile: SourceFile,
  varToTableName: Record<string, string>,
  varToBucketName: Record<string, string>,
  varToQueueName: Record<string, string>,
  varToTopicName: Record<string, string>
): FunctionMutationsIR | undefined {
  if (!handlerNode) return undefined;

  let targetNode: Node = handlerNode;

  if (handlerNode.isKind(SyntaxKind.Identifier)) {
    const identName = handlerNode.getText();
    const varDecl = sourceFile.getVariableDeclaration(identName);
    if (varDecl && varDecl.getInitializer()) {
      targetNode = varDecl.getInitializer()!;
    } else {
      const funcDecl = sourceFile.getFunction(identName);
      if (funcDecl) {
        targetNode = funcDecl;
      }
    }
  }

  const tablesWritten: string[] = [];
  const bucketsWritten: string[] = [];
  const queuesSent: string[] = [];
  const topicsPublished: string[] = [];

  // Traverse targetNode and any locally referenced helper functions/variables
  const nodesToScan: Node[] = [targetNode];
  const visitedNodes = new Set<Node>([targetNode]);

  while (nodesToScan.length > 0) {
    const curr = nodesToScan.pop()!;
    const callExprs = curr.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExprs) {
      const expr = call.getExpression();

      // Check if this call invokes a local helper function in the same file
      if (expr.isKind(SyntaxKind.Identifier)) {
        const fnName = expr.getText();
        const localFunc = sourceFile.getFunction(fnName);
        if (localFunc && !visitedNodes.has(localFunc)) {
          visitedNodes.add(localFunc);
          nodesToScan.push(localFunc);
        }
        const localVar = sourceFile.getVariableDeclaration(fnName);
        const varInit = localVar?.getInitializer();
        if (varInit && !visitedNodes.has(varInit)) {
          visitedNodes.add(varInit);
          nodesToScan.push(varInit);
        }
      }

      if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
        const callerText = expr.getExpression().getText();
        const methodName = expr.getName();
        const baseCaller = callerText.includes(".") ? callerText.split(".").pop()! : callerText;

        // Check Table writes (standard SDK methods + ElectroDB mutations)
        const tblName = varToTableName[callerText] || varToTableName[baseCaller];
        if (
          tblName &&
          [
            "put",
            "delete",
            "update",
            "batchWrite",
            "create",
            "patch",
            "remove",
            "upsert",
          ].includes(methodName)
        ) {
          if (!tablesWritten.includes(tblName)) {
            tablesWritten.push(tblName);
          }
        }

        // Check Bucket writes
        const bktName = varToBucketName[callerText] || varToBucketName[baseCaller];
        if (bktName && ["put", "putText", "putBuffer", "upload", "delete"].includes(methodName)) {
          if (!bucketsWritten.includes(bktName)) {
            bucketsWritten.push(bktName);
          }
        }

        // Check Queue sends
        const qName = varToQueueName[callerText] || varToQueueName[baseCaller];
        if (qName && ["send", "sendMessage"].includes(methodName)) {
          if (!queuesSent.includes(qName)) {
            queuesSent.push(qName);
          }
        }

        // Check Topic publishes
        const topName = varToTopicName[callerText] || varToTopicName[baseCaller];
        if (topName && ["publish", "send"].includes(methodName)) {
          if (!topicsPublished.includes(topName)) {
            topicsPublished.push(topName);
          }
        }
      }
    }
  }

  if (
    tablesWritten.length === 0 &&
    bucketsWritten.length === 0 &&
    queuesSent.length === 0 &&
    topicsPublished.length === 0
  ) {
    return undefined;
  }

  return {
    tablesWritten: tablesWritten.length > 0 ? tablesWritten : undefined,
    bucketsWritten: bucketsWritten.length > 0 ? bucketsWritten : undefined,
    queuesSent: queuesSent.length > 0 ? queuesSent : undefined,
    topicsPublished: topicsPublished.length > 0 ? topicsPublished : undefined,
  };
}
