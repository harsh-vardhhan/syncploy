import { Node, SourceFile, SyntaxKind, ObjectLiteralExpression } from "ts-morph";
import type { FunctionMutationsIR, BucketMutationIR } from "../../types";

function findDeclarationInFile(file: SourceFile, name: string, depth = 0): Node | undefined {
  if (depth > 6) return undefined;
  const fn = file.getFunction(name);
  if (fn) return fn;
  const vr = file.getVariableDeclaration(name);
  if (vr) return vr.getInitializer() || vr;
  const cls = file.getClass(name);
  if (cls) return cls;

  for (const exp of file.getExportDeclarations()) {
    const mod = exp.getModuleSpecifierSourceFile();
    if (!mod || mod.getFilePath().includes("/node_modules/")) continue;
    if (exp.isTypeOnly()) continue;
    const named = exp.getNamedExports().find((ne) => (ne.getAliasNode()?.getText() || ne.getName()) === name);
    if (named) {
      return findDeclarationInFile(mod, named.getName(), depth + 1);
    }
    if (!exp.getNamedExports().length) {
      const found = findDeclarationInFile(mod, name, depth + 1);
      if (found) return found;
    }
  }

  for (const imp of file.getImportDeclarations()) {
    const mod = imp.getModuleSpecifierSourceFile();
    if (!mod || mod.getFilePath().includes("/node_modules/")) continue;
    const named = imp.getNamedImports().find((ni) => (ni.getAliasNode()?.getText() || ni.getName()) === name);
    if (named) {
      return findDeclarationInFile(mod, named.getName(), depth + 1);
    }
  }

  return undefined;
}

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
    const resolved = findDeclarationInFile(sourceFile, identName);
    if (resolved) {
      targetNode = resolved;
    }
  }

  const tablesWritten: string[] = [];
  const tablesScanned: string[] = [];
  const bucketsWritten: (string | BucketMutationIR)[] = [];
  const queuesSent: string[] = [];
  const topicsPublished: string[] = [];
  const deliveryStreamsWritten: string[] = [];
  const httpInvoked: string[] = [];

  // Build a scope-isolated alias map for this handler/function AST
  const localVarToTableName = { ...varToTableName };
  const localVarToBucketName = { ...varToBucketName };
  const localVarToQueueName = { ...varToQueueName };
  const localVarToTopicName = { ...varToTopicName };
  const localVarToDeliveryStreamName = { ...(varToDeliveryStreamName || {}) };

  const localDecls = targetNode.getDescendantsOfKind(SyntaxKind.VariableDeclaration);
  for (const decl of localDecls) {
    const varName = decl.getName();
    const init = decl.getInitializer();
    if (!init) continue;

    let targetVarName: string | undefined;
    if (init.isKind(SyntaxKind.Identifier)) {
      targetVarName = init.getText();
    } else if (init.isKind(SyntaxKind.PropertyAccessExpression)) {
      targetVarName = init.getName();
    }

    if (targetVarName) {
      if (localVarToTableName[targetVarName]) {
        localVarToTableName[varName] = localVarToTableName[targetVarName]!;
      }
      if (localVarToBucketName[targetVarName]) {
        localVarToBucketName[varName] = localVarToBucketName[targetVarName]!;
      }
      if (localVarToQueueName[targetVarName]) {
        localVarToQueueName[varName] = localVarToQueueName[targetVarName]!;
      }
      if (localVarToTopicName[targetVarName]) {
        localVarToTopicName[varName] = localVarToTopicName[targetVarName]!;
      }
      if (localVarToDeliveryStreamName[targetVarName]) {
        localVarToDeliveryStreamName[varName] = localVarToDeliveryStreamName[targetVarName]!;
      }
    }
  }

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
          const resolved = findDeclarationInFile(currFile, fnName);
          if (resolved && !visitedNodes.has(resolved)) {
            visitedNodes.add(resolved);
            nodesToScan.push(resolved);
          }
        }
      }

      // Check HTTP invocations (fetch, axios, http, etc.)
      let isHttpClient = false;
      if (expr.isKind(SyntaxKind.Identifier) && expr.getText() === "fetch") {
        isHttpClient = true;
      } else if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
        const callerName = expr.getExpression().getText();
        const baseCallerName = callerName.includes(".") ? callerName.split(".").pop()! : callerName;
        const methodName = expr.getName();
        if (
          ["axios", "http", "https", "got", "needle", "urllib"].includes(baseCallerName) &&
          ["get", "post", "put", "patch", "delete", "request"].includes(methodName)
        ) {
          isHttpClient = true;
        }
      }

      if (isHttpClient && knownApis && knownApis.length > 0) {
        const callArgs = call.getArguments();
        if (callArgs.length > 0) {
          const urlArg = callArgs[0]!;
          let rawUrl: string | undefined;

          if (urlArg.isKind(SyntaxKind.StringLiteral) || urlArg.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
            rawUrl = urlArg.getLiteralValue();
          }

          if (rawUrl) {
            let isExternal = false;
            let urlPath: string | undefined;

            if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
              try {
                const parsed = new URL(rawUrl);
                const host = parsed.hostname.toLowerCase();
                isExternal =
                  !host.includes("localhost") &&
                  !host.includes("127.0.0.1") &&
                  !host.includes("execute-api") &&
                  !host.includes("lambda-url");
                if (!isExternal) {
                  urlPath = parsed.pathname;
                }
              } catch {
                isExternal = true;
              }
            } else if (rawUrl.startsWith("/")) {
              urlPath = rawUrl;
            }

            if (!isExternal && urlPath) {
              for (const api of knownApis) {
                const normPath = api.path.startsWith("/") ? api.path : `/${api.path}`;
                if (urlPath === normPath || urlPath.startsWith(`${normPath}/`)) {
                  if (!httpInvoked.includes(api.id)) {
                    httpInvoked.push(api.id);
                  }
                }
              }
            }
          } else if (urlArg.isKind(SyntaxKind.TemplateExpression)) {
            const templateText = urlArg.getText().toLowerCase();
            const isExternal =
              templateText.includes("stripe.com") ||
              templateText.includes("github.com") ||
              templateText.includes("slack.com") ||
              templateText.includes("twilio.com") ||
              templateText.includes("sendgrid.net");

            if (!isExternal) {
              const spans = urlArg.getTemplateSpans();
              const tailText = spans.length > 0 ? spans[spans.length - 1]!.getLiteral().getLiteralText() : "";
              for (const api of knownApis) {
                const normPath = api.path.startsWith("/") ? api.path : `/${api.path}`;
                if (
                  tailText === normPath ||
                  tailText.startsWith(`${normPath}/`) ||
                  tailText.endsWith(normPath) ||
                  (normPath !== "/" && tailText.includes(normPath))
                ) {
                  if (!httpInvoked.includes(api.id)) {
                    httpInvoked.push(api.id);
                  }
                }
              }
            }
          }
        }
      }

      if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
        const callerText = expr.getExpression().getText();
        const methodName = expr.getName();
        const baseCaller = callerText.includes(".") ? callerText.split(".").pop()! : callerText;

        // Traverse into service / helper object methods (e.g. documentsService.fetchAndIngestDocument or this.audit.createAuditLog)
        if (
          !localVarToTableName[callerText] &&
          !localVarToTableName[baseCaller] &&
          !localVarToBucketName[callerText] &&
          !localVarToBucketName[baseCaller] &&
          !localVarToQueueName[callerText] &&
          !localVarToQueueName[baseCaller] &&
          !localVarToTopicName[callerText] &&
          !localVarToTopicName[baseCaller]
        ) {
          let resolvedMethod: Node | undefined;

          // 1. If 'this.prop.method()', check current class property
          if (callerText.startsWith("this.")) {
            const classDecl = curr.getFirstAncestorByKind(SyntaxKind.ClassDeclaration);
            if (classDecl) {
              const propName = callerText.replace(/^this\./, "");
              const prop = classDecl.getProperty(propName);
              const propTypeNode = prop?.getTypeNode()?.getText() || prop?.getInitializer()?.getText();
              const targetClassName = propTypeNode?.replace(/^new\s+/, "")?.replace(/\(.*$/, "")?.trim();
              if (targetClassName) {
                const targetDecl = findDeclarationInFile(currFile, targetClassName);
                if (targetDecl && targetDecl.isKind(SyntaxKind.ClassDeclaration)) {
                  resolvedMethod = (targetDecl as any).getMethod(methodName);
                }
              }
            }
          }

          // 2. Direct object reference (e.g. documentsService.fetchAndIngestDocument)
          if (!resolvedMethod) {
            const declNode = findDeclarationInFile(currFile, baseCaller);
            if (declNode) {
              if (declNode.isKind(SyntaxKind.NewExpression)) {
                const clsExpr = (declNode as any).getExpression();
                const clsName = clsExpr.getText();
                const clsDecl = findDeclarationInFile(declNode.getSourceFile(), clsName);
                if (clsDecl && clsDecl.isKind(SyntaxKind.ClassDeclaration)) {
                  resolvedMethod = (clsDecl as any).getMethod(methodName);
                }
              } else if (declNode.isKind(SyntaxKind.ClassDeclaration)) {
                resolvedMethod = (declNode as any).getMethod(methodName);
              }
            }
          }

          if (resolvedMethod && !visitedNodes.has(resolvedMethod)) {
            visitedNodes.add(resolvedMethod);
            nodesToScan.push(resolvedMethod);
          }
        }

        // Check Table writes (standard SDK methods + ElectroDB mutations)
        const tblName = localVarToTableName[callerText] || localVarToTableName[baseCaller];
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

        // Check Table full scans
        if (tblName && (methodName === "scan" || methodName === "find")) {
          if (!tablesScanned.includes(tblName)) {
            tablesScanned.push(tblName);
          }
        }

        // Check Bucket writes with prefix discrimination
        const bktName = localVarToBucketName[callerText] || localVarToBucketName[baseCaller];
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
        const qName = localVarToQueueName[callerText] || localVarToQueueName[baseCaller];
        if (qName && ["send", "sendMessage"].includes(methodName)) {
          if (!queuesSent.includes(qName)) {
            queuesSent.push(qName);
          }
        }

        // Check Topic publishes
        const topName = localVarToTopicName[callerText] || localVarToTopicName[baseCaller];
        if (topName && ["publish", "send"].includes(methodName)) {
          if (!topicsPublished.includes(topName)) {
            topicsPublished.push(topName);
          }
        }

        // Check DeliveryStream writes
        if (varToDeliveryStreamName) {
          const streamName =
            localVarToDeliveryStreamName[callerText] || localVarToDeliveryStreamName[baseCaller];
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
              let inputObj: ObjectLiteralExpression | undefined;
              if (cmdArgs.length > 0 && cmdArgs[0]) {
                const arg = cmdArgs[0];
                if (arg.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  inputObj = arg as ObjectLiteralExpression;
                } else if (arg.isKind(SyntaxKind.Identifier)) {
                  const varDecl = currFile.getVariableDeclaration(arg.getText());
                  const init = varDecl?.getInitializer();
                  if (init && init.isKind(SyntaxKind.ObjectLiteralExpression)) {
                    inputObj = init as ObjectLiteralExpression;
                  }
                }
              }

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
                      resolvedTbl = localVarToTableName[txt] || localVarToTableName[base];
                    }
                    if (resolvedTbl && !tablesWritten.includes(resolvedTbl)) {
                      tablesWritten.push(resolvedTbl);
                    }
                  }
                }

                // DynamoDB ScanCommand
                if (cmdName === "ScanCommand") {
                  const tblProp = inputObj.getProperty("TableName");
                  if (tblProp && tblProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = tblProp.getInitializer();
                    let resolvedTbl: string | undefined;
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedTbl = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".")[0]! : txt;
                      resolvedTbl = localVarToTableName[txt] || localVarToTableName[base];
                    }
                    if (resolvedTbl && !tablesScanned.includes(resolvedTbl)) {
                      tablesScanned.push(resolvedTbl);
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
                                    resTbl = localVarToTableName[txt] || localVarToTableName[base];
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
                      resolvedQ = localVarToQueueName[txt] || localVarToQueueName[base];
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
                      resolvedBkt = localVarToBucketName[txt] || localVarToBucketName[base];
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
                      resolvedTop = localVarToTopicName[txt] || localVarToTopicName[base];
                    }
                    if (resolvedTop && !topicsPublished.includes(resolvedTop)) {
                      topicsPublished.push(resolvedTop);
                    }
                  }
                }

                // Firehose PutRecordCommand / PutRecordBatchCommand
                if (cmdName === "PutRecordCommand" || cmdName === "PutRecordBatchCommand") {
                  const dsProp = inputObj.getProperty("DeliveryStreamName");
                  if (dsProp && dsProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const init = dsProp.getInitializer();
                    let resolvedDs: string | undefined;
                    if (init?.isKind(SyntaxKind.StringLiteral)) {
                      resolvedDs = init.getLiteralValue();
                    } else if (init) {
                      const txt = init.getText();
                      const base = txt.includes(".") ? txt.split(".").pop()! : txt;
                      resolvedDs = (localVarToDeliveryStreamName && (localVarToDeliveryStreamName[txt] || localVarToDeliveryStreamName[base]));
                    }
                    if (resolvedDs && !deliveryStreamsWritten.includes(resolvedDs)) {
                      deliveryStreamsWritten.push(resolvedDs);
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
    tablesScanned.length === 0 &&
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
    tablesScanned: tablesScanned.length > 0 ? tablesScanned : undefined,
    bucketsWritten: bucketsWritten.length > 0 ? bucketsWritten : undefined,
    queuesSent: queuesSent.length > 0 ? queuesSent : undefined,
    topicsPublished: topicsPublished.length > 0 ? topicsPublished : undefined,
    deliveryStreamsWritten: deliveryStreamsWritten.length > 0 ? deliveryStreamsWritten : undefined,
    httpInvoked: httpInvoked.length > 0 ? httpInvoked : undefined,
  };
}
