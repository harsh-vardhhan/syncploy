import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type {
  TableIR,
  BucketIR,
  QueueIR,
  TopicIR,
  AlarmIR,
  AlarmMetricQueryIR,
  DeliveryStreamIR,
  AuthIR,
  TableIndexIR,
} from "../../types";
import type { ParseContext } from "../types";
import {
  unwrapExpression,
  extractDuration,
  extractMemory,
  extractNumber,
  extractString,
  extractBoolean,
} from "./ast-utils";

export function extractTable(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): { table: TableIR; tableName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Table") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Table '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const tableName = args[0].getLiteralValue();

  let partitionKey = { name: "id", type: "string" as const };
  let sortKey: { name: string; type: "string" | "number" | "binary" } | undefined;
  let billingMode: "PAY_PER_REQUEST" | "PROVISIONED" = "PAY_PER_REQUEST";
  let stream: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY" | undefined;
  let pointInTimeRecovery: boolean | undefined;
  const indexes: Record<string, TableIndexIR> = {};
  let logicalId: string | undefined;
  let customTableName: string | undefined;
  let retain: boolean | undefined;
  let deletionPolicy: "Retain" | "Delete" | "Snapshot" | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const optionsObj = args[1] as ObjectLiteralExpression;
    logicalId = extractString(optionsObj.getProperty("logicalId"));
    customTableName = extractString(optionsObj.getProperty("tableName"));
    retain = extractBoolean(optionsObj.getProperty("retain"));
    deletionPolicy = extractString(optionsObj.getProperty("deletionPolicy")) as any;

    // Partition Key
    const pkProp = optionsObj.getProperty("partitionKey");
    if (pkProp && pkProp.isKind(SyntaxKind.PropertyAssignment)) {
      const pkInit = pkProp.getInitializer();
      if (pkInit && pkInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const nameProp = pkInit.getProperty("name");
        const typeProp = pkInit.getProperty("type");
        if (nameProp && nameProp.isKind(SyntaxKind.PropertyAssignment)) {
          const nameInit = nameProp.getInitializer();
          if (nameInit && nameInit.isKind(SyntaxKind.StringLiteral)) {
            partitionKey.name = nameInit.getLiteralValue();
          }
        }
        if (typeProp && typeProp.isKind(SyntaxKind.PropertyAssignment)) {
          const typeInit = typeProp.getInitializer();
          if (typeInit && typeInit.isKind(SyntaxKind.StringLiteral)) {
            partitionKey.type = typeInit.getLiteralValue() as any;
          }
        }
      }
    }

    // Sort Key
    const skProp = optionsObj.getProperty("sortKey");
    if (skProp && skProp.isKind(SyntaxKind.PropertyAssignment)) {
      const skInit = skProp.getInitializer();
      if (skInit && skInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
        let skName = "sk";
        let skType: "string" | "number" | "binary" = "string";
        const nameProp = skInit.getProperty("name");
        const typeProp = skInit.getProperty("type");
        if (nameProp && nameProp.isKind(SyntaxKind.PropertyAssignment)) {
          const nameInit = nameProp.getInitializer();
          if (nameInit && nameInit.isKind(SyntaxKind.StringLiteral)) {
            skName = nameInit.getLiteralValue();
          }
        }
        if (typeProp && typeProp.isKind(SyntaxKind.PropertyAssignment)) {
          const typeInit = typeProp.getInitializer();
          if (typeInit && typeInit.isKind(SyntaxKind.StringLiteral)) {
            skType = typeInit.getLiteralValue() as any;
          }
        }
        sortKey = { name: skName, type: skType };
      }
    }

    // stream, billingMode, pointInTimeRecovery
    const streamProp = optionsObj.getProperty("stream");
    if (streamProp && streamProp.isKind(SyntaxKind.PropertyAssignment)) {
      const streamInit = streamProp.getInitializer();
      if (streamInit && streamInit.isKind(SyntaxKind.StringLiteral)) {
        stream = streamInit.getLiteralValue() as any;
      }
    }

    const billingProp = optionsObj.getProperty("billingMode");
    if (billingProp && billingProp.isKind(SyntaxKind.PropertyAssignment)) {
      const billingInit = billingProp.getInitializer();
      if (billingInit && billingInit.isKind(SyntaxKind.StringLiteral)) {
        billingMode = billingInit.getLiteralValue() as any;
      }
    }

    const pitrProp = optionsObj.getProperty("pointInTimeRecovery");
    if (pitrProp && pitrProp.isKind(SyntaxKind.PropertyAssignment)) {
      pointInTimeRecovery = pitrProp.getInitializer()?.getText() === "true";
    }

    // Indexes (GSIs)
    const indexesProp = optionsObj.getProperty("indexes");
    if (indexesProp && indexesProp.isKind(SyntaxKind.PropertyAssignment)) {
      const indexesInit = indexesProp.getInitializer();
      if (indexesInit && indexesInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
        for (const prop of indexesInit.getProperties()) {
          if (prop.isKind(SyntaxKind.PropertyAssignment)) {
            const idxName = prop.getName();
            const idxObj = prop.getInitializer();
            if (idxObj && idxObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const pkP = idxObj.getProperty("partitionKey");
              const skP = idxObj.getProperty("sortKey");
              const projP = idxObj.getProperty("projection");

              let idxPk = "";
              let idxSk: string | undefined;
              let projection: "ALL" | "KEYS_ONLY" = "ALL";

              if (pkP && pkP.isKind(SyntaxKind.PropertyAssignment)) {
                const pkVal = pkP.getInitializer();
                if (pkVal && pkVal.isKind(SyntaxKind.StringLiteral)) {
                  idxPk = pkVal.getLiteralValue();
                } else if (pkVal && pkVal.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const nProp = (pkVal as ObjectLiteralExpression).getProperty("name");
                  if (nProp && nProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const nInit = nProp.getInitializer();
                    if (nInit && nInit.isKind(SyntaxKind.StringLiteral)) {
                      idxPk = nInit.getLiteralValue();
                    }
                  }
                }
              }
              if (skP && skP.isKind(SyntaxKind.PropertyAssignment)) {
                const skVal = skP.getInitializer();
                if (skVal && skVal.isKind(SyntaxKind.StringLiteral)) {
                  idxSk = skVal.getLiteralValue();
                } else if (skVal && skVal.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const nProp = (skVal as ObjectLiteralExpression).getProperty("name");
                  if (nProp && nProp.isKind(SyntaxKind.PropertyAssignment)) {
                    const nInit = nProp.getInitializer();
                    if (nInit && nInit.isKind(SyntaxKind.StringLiteral)) {
                      idxSk = nInit.getLiteralValue();
                    }
                  }
                }
              }
              if (projP && projP.isKind(SyntaxKind.PropertyAssignment)) {
                const projVal = projP.getInitializer();
                if (projVal && projVal.isKind(SyntaxKind.StringLiteral)) {
                  projection = projVal.getLiteralValue() as any;
                }
              }

              if (idxPk) {
                indexes[idxName] = {
                  partitionKey: idxPk,
                  sortKey: idxSk,
                  projection,
                };
              }
            }
          }
        }
      }
    }
  }

  return {
    table: {
      id: varName,
      name: tableName,
      partitionKey,
      sortKey,
      billingMode,
      stream,
      pointInTimeRecovery,
      indexes,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      tableName: customTableName,
      retain,
      deletionPolicy,
    },
    tableName,
  };
}

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
    },
    bucketName,
  };
}

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

  return {
    queue: {
      id: varName,
      name: queueName,
      visibilityTimeout,
      deadLetterQueue,
      fifo,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      queueName: customQueueName,
    },
    queueName,
  };
}

export function extractTopic(
  decl: VariableDeclaration,
  sourceFile: SourceFile
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
            const endp = extractString(el.getProperty("endpoint")) || "";
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

export function extractAlarm(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): AlarmIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Alarm") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Alarm '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const alarmName = args[0].getLiteralValue();

  let threshold = 0;
  let evaluationPeriods = 1;
  let comparison = "GreaterThanOrEqualToThreshold";
  let description: string | undefined;
  let treatMissingData: string | undefined;
  let metric: AlarmIR["metric"] | undefined;
  let metrics: AlarmIR["metrics"];
  const actions: string[] = [];
  let logicalId: string | undefined;
  let customAlarmName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customAlarmName = extractString(opts.getProperty("alarmName"));
    threshold = extractNumber(opts.getProperty("threshold")) ?? 0;
    evaluationPeriods = extractNumber(opts.getProperty("evaluationPeriods")) ?? 1;
    comparison = extractString(opts.getProperty("comparison")) || "GreaterThanOrEqualToThreshold";
    description = extractString(opts.getProperty("description"));
    treatMissingData = extractString(opts.getProperty("treatMissingData"));

    const metricProp = opts.getProperty("metric");
    if (metricProp && metricProp.isKind(SyntaxKind.PropertyAssignment)) {
      const mObj = metricProp.getInitializer();
      if (mObj && mObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const metricName = extractString(mObj.getProperty("metricName")) || "Invocations";
        const namespace = extractString(mObj.getProperty("namespace")) || "AWS/Lambda";
        const period = extractNumber(mObj.getProperty("period")) || 60;
        const stat = extractString(mObj.getProperty("stat")) || "Sum";
        const dims: Record<string, string> = {};
        const dimsProp = mObj.getProperty("dimensions");
        if (dimsProp && dimsProp.isKind(SyntaxKind.PropertyAssignment)) {
          const dObj = dimsProp.getInitializer();
          if (dObj && dObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
            for (const p of dObj.getProperties()) {
              if (p.isKind(SyntaxKind.PropertyAssignment)) {
                const dVal = p.getInitializer();
                if (dVal && dVal.isKind(SyntaxKind.StringLiteral)) {
                  dims[p.getName()] = dVal.getLiteralValue();
                }
              }
            }
          }
        }
        metric = { metricName, namespace, period, stat, dimensions: dims };
      }
    }

    const metricsProp = opts.getProperty("metrics");
    if (metricsProp && metricsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = metricsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        metrics = [];
        for (const el of arr.getElements()) {
          if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
            const id = extractString(el.getProperty("id")) || "";
            const expression = extractString(el.getProperty("expression"));
            const label = extractString(el.getProperty("label"));
            const rdProp = el.getProperty("returnData");
            const rdInit = rdProp && rdProp.isKind(SyntaxKind.PropertyAssignment) ? rdProp.getInitializer() : undefined;
            const returnData = rdInit ? rdInit.getText() !== "false" : undefined;
            let metricStat: AlarmMetricQueryIR["metricStat"];
            const statProp = el.getProperty("metricStat");
            if (statProp && statProp.isKind(SyntaxKind.PropertyAssignment)) {
              const sObj = statProp.getInitializer();
              if (sObj && sObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const mProp = sObj.getProperty("metric");
                let metricObj: any = { metricName: "Invocations", namespace: "AWS/Lambda" };
                if (mProp && mProp.isKind(SyntaxKind.PropertyAssignment)) {
                  const mInit = mProp.getInitializer();
                  if (mInit && mInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
                    const metricName = extractString(mInit.getProperty("metricName")) || "Invocations";
                    const namespace = extractString(mInit.getProperty("namespace")) || "AWS/Lambda";
                    const dims: Record<string, string> = {};
                    const dProp = mInit.getProperty("dimensions");
                    if (dProp && dProp.isKind(SyntaxKind.PropertyAssignment)) {
                      const dInit = dProp.getInitializer();
                      if (dInit && dInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
                        for (const p of dInit.getProperties()) {
                          if (p.isKind(SyntaxKind.PropertyAssignment)) {
                            const dVal = p.getInitializer();
                            if (dVal && dVal.isKind(SyntaxKind.StringLiteral)) {
                              dims[p.getName()] = dVal.getLiteralValue();
                            }
                          }
                        }
                      } else if (dInit && dInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
                        for (const dimEl of dInit.getElements()) {
                          if (dimEl.isKind(SyntaxKind.ObjectLiteralExpression)) {
                            const n = extractString(dimEl.getProperty("name")) || extractString(dimEl.getProperty("Name"));
                            const v = extractString(dimEl.getProperty("value")) || extractString(dimEl.getProperty("Value"));
                            if (n && v) dims[n] = v;
                          }
                        }
                      }
                    }
                    metricObj = { metricName, namespace, dimensions: dims };
                  }
                }
                const period = extractDuration(sObj.getProperty("period")) || extractNumber(sObj.getProperty("period")) || 60;
                const stat = extractString(sObj.getProperty("stat")) || "Sum";
                metricStat = { metric: metricObj, period, stat };
              }
            }
            metrics.push({ id, expression, label, returnData, metricStat });
          }
        }
      }
    }

    const actionsProp = opts.getProperty("actions");
    if (actionsProp && actionsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = actionsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        for (const el of arr.getElements()) {
          const rawAction = el.getText();
          const cleanAction = context.varToTopicName[rawAction] || rawAction.replace(/['"]/g, "");
          actions.push(cleanAction);
        }
      }
    }
  }

  return {
    id: varName,
    name: alarmName,
    threshold,
    evaluationPeriods,
    comparison,
    description,
    treatMissingData,
    metric,
    metrics,
    actions,
    sourceFile: sourceFile.getFilePath(),
    logicalId,
    alarmName: customAlarmName,
  };
}

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
      logicalId,
      streamName: customStreamName,
      roleLogicalId,
    },
    streamName,
  };
}

export function extractAuth(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): { auth: AuthIR; authName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Auth") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Auth '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const authName = args[0].getLiteralValue();

  let signInMethod: AuthIR["signInMethod"] = "email";
  let autoVerify: ("email" | "phone")[] | undefined;
  let adminOnly: boolean | undefined = true;
  let passwordPolicy: AuthIR["passwordPolicy"];
  let client: AuthIR["client"];
  let logicalId: string | undefined;
  let userPoolName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    userPoolName = extractString(opts.getProperty("userPoolName"));
    const methodStr = extractString(opts.getProperty("signInMethod"));
    if (methodStr === "email" || methodStr === "phone" || methodStr === "username") {
      signInMethod = methodStr;
    }
    const adminOnlyVal = extractBoolean(opts.getProperty("adminOnly"));
    if (adminOnlyVal !== undefined) {
      adminOnly = adminOnlyVal;
    }

    const autoVerifyProp = opts.getProperty("autoVerify");
    if (autoVerifyProp && autoVerifyProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = autoVerifyProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ArrayLiteralExpression)) {
        autoVerify = initProp
          .getElements()
          .filter((e) => e.isKind(SyntaxKind.StringLiteral))
          .map((e) => (e as any).getLiteralValue() as "email" | "phone");
      }
    }

    const policyProp = opts.getProperty("passwordPolicy");
    if (policyProp && policyProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = policyProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const policyOpts = initProp as ObjectLiteralExpression;
        passwordPolicy = {
          minLength: extractNumber(policyOpts.getProperty("minLength")),
          requireUppercase: extractBoolean(policyOpts.getProperty("requireUppercase")),
          requireLowercase: extractBoolean(policyOpts.getProperty("requireLowercase")),
          requireNumbers: extractBoolean(policyOpts.getProperty("requireNumbers")),
          requireSymbols: extractBoolean(policyOpts.getProperty("requireSymbols")),
          tempPasswordValidityDays: extractNumber(policyOpts.getProperty("tempPasswordValidityDays")),
        };
      }
    }

    const clientProp = opts.getProperty("client");
    if (clientProp && clientProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = clientProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const clientOpts = initProp as ObjectLiteralExpression;
        let explicitAuthFlows: string[] | undefined;
        const flowsProp = clientOpts.getProperty("explicitAuthFlows");
        if (flowsProp && flowsProp.isKind(SyntaxKind.PropertyAssignment)) {
          const flowsInit = flowsProp.getInitializer();
          if (flowsInit && flowsInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
            explicitAuthFlows = flowsInit
              .getElements()
              .filter((e) => e.isKind(SyntaxKind.StringLiteral))
              .map((e) => (e as any).getLiteralValue());
          }
        }
        client = {
          generateSecret: extractBoolean(clientOpts.getProperty("generateSecret")),
          explicitAuthFlows,
          preventUserExistenceErrors: extractBoolean(clientOpts.getProperty("preventUserExistenceErrors")),
          clientLogicalId: extractString(clientOpts.getProperty("clientLogicalId")),
          clientName: extractString(clientOpts.getProperty("clientName")),
        };
      }
    }
  }

  return {
    auth: {
      id: varName,
      name: authName,
      signInMethod,
      autoVerify,
      adminOnly,
      passwordPolicy,
      client,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      userPoolName,
    },
    authName,
  };
}
