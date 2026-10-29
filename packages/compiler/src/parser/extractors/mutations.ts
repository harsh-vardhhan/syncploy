import { Node, SourceFile, SyntaxKind, ObjectLiteralExpression } from "ts-morph";
import type { FunctionMutationsIR, BucketMutationIR } from "../../types";

export function extractMutationsFromNode(
  handlerNode: Node | undefined,
  sourceFile: SourceFile,
  varToTableName: Record<string, string>,
  varToBucketName: Record<string, string>,
  varToQueueName: Record<string, string>,
  varToTopicName: Record<string, string>,
  varToDeliveryStreamName?: Record<string, string>,
  knownApis?: { id: string; path: string }[]
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
  const bucketsWritten: (string | BucketMutationIR)[] = [];
  const queuesSent: string[] = [];
  const topicsPublished: string[] = [];
  const deliveryStreamsWritten: string[] = [];
  const httpInvoked: string[] = [];

  // Traverse targetNode and any referenced helper functions/variables (local + imported)
  const nodesToScan: Node[] = [targetNode];
  const visitedNodes = new Set<Node>([targetNode]);

  while (nodesToScan.length > 0) {
    const curr = nodesToScan.pop()!;
    const currFile = curr.getSourceFile();
    const callExprs = curr.getDescendantsOfKind(SyntaxKind.CallExpression);

    for (const call of callExprs) {
      const expr = call.getExpression();

      // Check if this call invokes a helper function (local or imported)
      if (expr.isKind(SyntaxKind.Identifier)) {
        const fnName = expr.getText();
        const localFunc = currFile.getFunction(fnName);
        if (localFunc && !visitedNodes.has(localFunc)) {
          visitedNodes.add(localFunc);
          nodesToScan.push(localFunc);
        }
        const localVar = currFile.getVariableDeclaration(fnName);
        const varInit = localVar?.getInitializer();
        if (varInit && !visitedNodes.has(varInit)) {
          visitedNodes.add(varInit);
          nodesToScan.push(varInit);
        }

        // Cross-module resolution: check imported functions and variables
        if (!localFunc && !localVar) {
          for (const importDecl of currFile.getImportDeclarations()) {
            const namedImports = importDecl.getNamedImports();
            const matchedImport = namedImports.find(
              (ni) => (ni.getAliasNode()?.getText() || ni.getName()) === fnName
            );
            if (matchedImport) {
              const targetSourceFile = importDecl.getModuleSpecifierSourceFile();
              if (targetSourceFile && !targetSourceFile.getFilePath().includes("/node_modules/")) {
                const importedFunc = targetSourceFile.getFunction(matchedImport.getName());
                if (importedFunc && !visitedNodes.has(importedFunc)) {
                  visitedNodes.add(importedFunc);
                  nodesToScan.push(importedFunc);
                }
                const importedVar = targetSourceFile.getVariableDeclaration(matchedImport.getName());
                const importedInit = importedVar?.getInitializer();
                if (importedInit && !visitedNodes.has(importedInit)) {
                  visitedNodes.add(importedInit);
                  nodesToScan.push(importedInit);
                }
              }
              break;
            }
          }
        }
      }

      // Check HTTP invocations (fetch, axios, http, etc.)
      const isFetch = expr.isKind(SyntaxKind.Identifier) && expr.getText() === "fetch";
      const isAxiosOrHttp =
        expr.isKind(SyntaxKind.PropertyAccessExpression) &&
        ["get", "post", "put", "patch", "delete", "request"].includes(expr.getName());

      if ((isFetch || isAxiosOrHttp) && knownApis && knownApis.length > 0) {
        const callArgs = call.getArguments();
        if (callArgs.length > 0) {
          const urlArg = callArgs[0]!;
          const urlText = urlArg.getText();
          for (const api of knownApis) {
            const normPath = api.path === "/" ? "/" : api.path;
            if (
              urlText.includes(api.id) ||
              (normPath !== "/" && urlText.includes(normPath)) ||
              (urlArg.isKind(SyntaxKind.StringLiteral) && urlArg.getLiteralValue() === normPath)
            ) {
              if (!httpInvoked.includes(api.id)) {
                httpInvoked.push(api.id);
              }
            }
          }
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

        // Check Bucket writes with prefix discrimination
        const bktName = varToBucketName[callerText] || varToBucketName[baseCaller];
        if (bktName && ["put", "putText", "putBuffer", "upload", "delete"].includes(methodName)) {
          let prefix: string | undefined;
          const args = call.getArguments();
          if (args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
            const key = args[0]!.getLiteralValue();
            if (key.includes("/")) {
              prefix = key.substring(0, key.indexOf("/") + 1);
            }
          }

          const alreadyRecorded = bucketsWritten.some((b) => {
            if (typeof b === "string") return b === bktName && !prefix;
            return b.name === bktName && b.prefix === prefix;
          });

          if (!alreadyRecorded) {
            bucketsWritten.push(prefix ? { name: bktName, prefix } : bktName);
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

        // Check DeliveryStream writes
        if (varToDeliveryStreamName) {
          const streamName =
            varToDeliveryStreamName[callerText] || varToDeliveryStreamName[baseCaller];
          if (streamName && ["put", "send", "putRecord", "putRecordBatch"].includes(methodName)) {
            if (!deliveryStreamsWritten.includes(streamName)) {
              deliveryStreamsWritten.push(streamName);
            }
          }
        }

        // Check Raw AWS SDK v3 Commands: client.send(new PutItemCommand(...))
        if (methodName === "send") {
          const args = call.getArguments();
          if (args.length > 0) {
            let cmdNode: Node = args[0]!;
            if (cmdNode.isKind(SyntaxKind.AwaitExpression)) {
              cmdNode = (cmdNode as any).getExpression();
            }
            if (cmdNode.isKind(SyntaxKind.Identifier)) {
              const identName = cmdNode.getText();
              const varDecl = currFile.getVariableDeclaration(identName);
              if (varDecl?.getInitializer()) {
                cmdNode = varDecl.getInitializer()!;
              }
            }

            if (cmdNode.isKind(SyntaxKind.NewExpression)) {
              const cmdName = cmdNode.getExpression().getText();
              const cmdArgs = cmdNode.getArguments();
              const inputObj =
                cmdArgs.length > 0 && cmdArgs[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
                  ? (cmdArgs[0] as ObjectLiteralExpression)
                  : undefined;

              if (inputObj) {
                // DynamoDB Write Commands
                if (
                  [
                    "PutItemCommand",
                    "UpdateItemCommand",
                    "DeleteItemCommand",
                    "BatchWriteItemCommand",
                    "PutCommand",
                    "UpdateCommand",
                    "DeleteCommand",
                  ].includes(cmdName)
                ) {
                  const tblProp = inputObj.getProperty("TableName");
                  if (tblProp && tblProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = tblProp.getInitializer();
                    let resolvedTbl: string | undefined;
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedTbl = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                      resolvedTbl = varToTableName[txt] || varToTableName[base];
                    }
                    if (resolvedTbl && !tablesWritten.includes(resolvedTbl)) {
                      tablesWritten.push(resolvedTbl);
                    }
                  }
                }

                // DynamoDB TransactWriteItemsCommand
                if (cmdName === "TransactWriteItemsCommand" || cmdName === "TransactWriteCommand") {
                  const itemsProp = inputObj.getProperty("TransactItems");
                  if (itemsProp && itemsProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = itemsProp.getInitializer();
                    if (init && init.isKind(SyntaxKind.ArrayLiteralExpression)) {
                      for (const elem of init.getElements()) {
                        if (elem.isKind(SyntaxKind.ObjectLiteralExpression)) {
                          for (const p of elem.getProperties()) {
                            if (p.isKind(SyntaxKind.PropertyAssignment)) {
                              const subObj = p.getInitializer();
                              if (subObj && subObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
                                const tblP = subObj.getProperty("TableName");
                                if (tblP && tblP.isKind(SyntaxKind.PropertyAssignment)) {
                                  const tInit = tblP.getInitializer();
                                  let resTbl: string | undefined;
                                  if (tInit?.isKind(SyntaxKind.StringLiteral)) {
                                    resTbl = tInit.getLiteralValue();
                                  } else if (tInit) {
                                    const txt = tInit.getText();
                                    const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                                    resTbl = varToTableName[txt] || varToTableName[base];
                                  }
                                  if (resTbl && !tablesWritten.includes(resTbl)) {
                                    tablesWritten.push(resTbl);
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }

                // SQS SendMessageCommand
                if (cmdName === "SendMessageCommand" || cmdName === "SendMessageBatchCommand") {
                  const qProp = inputObj.getProperty("QueueUrl");
                  if (qProp && qProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = qProp.getInitializer();
                    let resolvedQ: string | undefined;
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedQ = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                      resolvedQ = varToQueueName[txt] || varToQueueName[base];
                    }
                    if (resolvedQ && !queuesSent.includes(resolvedQ)) {
                      queuesSent.push(resolvedQ);
                    }
                  }
                }

                // S3 PutObjectCommand
                if (cmdName === "PutObjectCommand") {
                  const bProp = inputObj.getProperty("Bucket");
                  let resolvedBkt: string | undefined;
                  if (bProp && bProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = bProp.getInitializer();
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedBkt = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                      resolvedBkt = varToBucketName[txt] || varToBucketName[base];
                    }
                  }

                  let prefix: string | undefined;
                  const keyProp = inputObj.getProperty("Key");
                  if (keyProp && keyProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const kInit = keyProp.getInitializer();
                    if (kInit?.isKind(SyntaxKind.StringLiteral)) {
                      const kVal = kInit.getLiteralValue();
                      if (kVal.includes("/")) {
                        prefix = kVal.substring(0, kVal.indexOf("/") + 1);
                      }
                    }
                  }

                  if (resolvedBkt) {
                    const alreadyRecorded = bucketsWritten.some((b) => {
                      if (typeof b === "string") return b === resolvedBkt && !prefix;
                      return b.name === resolvedBkt && b.prefix === prefix;
                    });
                    if (!alreadyRecorded) {
                      bucketsWritten.push(prefix ? { name: resolvedBkt, prefix } : resolvedBkt);
                    }
                  }
                }

                // SNS PublishCommand
                if (cmdName === "PublishCommand") {
                  const topProp = inputObj.getProperty("TopicArn");
                  if (topProp && topProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = topProp.getInitializer();
                    let resolvedTop: string | undefined;
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedTop = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                      resolvedTop = varToTopicName[txt] || varToTopicName[base];
                    }
                    if (resolvedTop && !topicsPublished.includes(resolvedTop)) {
                      topicsPublished.push(resolvedTop);
                    }
                  }
                }
              }
            }
          }
        }

        // Cross-module resolution: check method on an imported object or service
        if (
          !varToTableName[callerText] &&
          !varToTableName[baseCaller] &&
          !varToBucketName[callerText] &&
          !varToBucketName[baseCaller] &&
          !varToQueueName[callerText] &&
          !varToQueueName[baseCaller] &&
          !varToTopicName[callerText] &&
          !varToTopicName[baseCaller] &&
          (!varToDeliveryStreamName || (!varToDeliveryStreamName[callerText] && !varToDeliveryStreamName[baseCaller]))
        ) {
          for (const importDecl of currFile.getImportDeclarations()) {
            const namedImports = importDecl.getNamedImports();
            const matched = namedImports.find(
              (ni) => (ni.getAliasNode()?.getText() || ni.getName()) === baseCaller
            );
            if (matched) {
              const targetSourceFile = importDecl.getModuleSpecifierSourceFile();
              if (targetSourceFile && !targetSourceFile.getFilePath().includes("/node_modules/")) {
                const importedVar = targetSourceFile.getVariableDeclaration(matched.getName());
                const init = importedVar?.getInitializer();
                if (init && init.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const prop = init.getProperty(methodName);
                  let methodNode: Node | undefined;
                  if (prop && prop.isKind(SyntaxKind.MethodDeclaration)) {
                    methodNode = prop;
                  } else if (prop && prop.isKind(SyntaxKind.PropertyAssignment)) {
                    methodNode = prop.getInitializer();
                  }
                  if (methodNode && !visitedNodes.has(methodNode)) {
                    visitedNodes.add(methodNode);
                    nodesToScan.push(methodNode);
                  }
                }
              }
              break;
            }
          }
        }
      }
    }
  }

  if (
    tablesWritten.length === 0 &&
    bucketsWritten.length === 0 &&
    queuesSent.length === 0 &&
    topicsPublished.length === 0 &&
    deliveryStreamsWritten.length === 0 &&
    httpInvoked.length === 0
  ) {
    return undefined;
  }

  return {
    tablesWritten: tablesWritten.length > 0 ? tablesWritten : undefined,
    bucketsWritten: bucketsWritten.length > 0 ? bucketsWritten : undefined,
    queuesSent: queuesSent.length > 0 ? queuesSent : undefined,
    topicsPublished: topicsPublished.length > 0 ? topicsPublished : undefined,
    deliveryStreamsWritten: deliveryStreamsWritten.length > 0 ? deliveryStreamsWritten : undefined,
    httpInvoked: httpInvoked.length > 0 ? httpInvoked : undefined,
  };
}
