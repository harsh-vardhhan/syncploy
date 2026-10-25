import { Project, SyntaxKind, type Node, type ObjectLiteralExpression } from "ts-morph";
import type {
  ApiRouteIR,
  HttpMethod,
  IngressType,
  ResourceGraph,
  TableIR,
  TableStreamConsumerIR,
  BucketIR,
  QueueIR,
  QueueConsumerIR,
  TopicIR,
  TopicSubscriberIR,
  AlarmIR,
  TableIndexIR,
  CorsConfig,
  PolicyStatementIR,
  EventBindingIR,
} from "./types";

export class Parser {
  private project: Project;

  constructor(public readonly projectRoot: string) {
    this.project = new Project({
      skipAddingFilesFromTsConfig: false,
    });
  }

  public parse(): ResourceGraph {
    this.project.addSourceFilesAtPaths([
      `${this.projectRoot}/**/*.ts`,
      `!${this.projectRoot}/**/node_modules/**`,
      `!${this.projectRoot}/**/dist/**`,
      `!${this.projectRoot}/**/.syncploy/**`,
    ]);

    const apis: ApiRouteIR[] = [];
    const tables: TableIR[] = [];
    const tableStreams: TableStreamConsumerIR[] = [];
    const buckets: BucketIR[] = [];
    const queues: QueueIR[] = [];
    const consumers: QueueConsumerIR[] = [];
    const topics: TopicIR[] = [];
    const topicSubscribers: TopicSubscriberIR[] = [];
    const alarms: AlarmIR[] = [];
    const bindings: EventBindingIR[] = [];

    // Maps to track variable names to resource names
    const varToTableName: Record<string, string> = {};
    const varToQueueName: Record<string, string> = {};
    const varToBucketName: Record<string, string> = {};
    const varToTopicName: Record<string, string> = {};

    for (const sourceFile of this.project.getSourceFiles()) {
      for (const decl of sourceFile.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;

        const varName = decl.getName();
        const isExported = decl.isExported();

        // 1. Detect api(...) declarations
        if (init.isKind(SyntaxKind.CallExpression)) {
          const expr = init.getExpression();

          // Standard api(...)
          if (expr.getText() === "api") {
            if (!isExported) {
              throw new Error(
                `API endpoint '${varName}' in ${sourceFile.getFilePath()} must be exported.`
              );
            }

            const args = init.getArguments();
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              throw new Error(
                `API endpoint '${varName}' in ${sourceFile.getFilePath()} must provide an options object.`
              );
            }

            const optionsObj = args[0] as ObjectLiteralExpression;
            const pathProp = optionsObj.getProperty("path");
            if (!pathProp || !pathProp.isKind(SyntaxKind.PropertyAssignment)) {
              throw new Error(
                `API endpoint '${varName}' in ${sourceFile.getFilePath()} is missing required 'path' property.`
              );
            }

            const pathInitializer = pathProp.getInitializer();
            if (!pathInitializer || !pathInitializer.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `API endpoint '${varName}' path in ${sourceFile.getFilePath()} must be a string literal.`
              );
            }
            const pathValue = pathInitializer.getLiteralValue();

            let methodValue: HttpMethod = "POST";
            const methodProp = optionsObj.getProperty("method");
            if (methodProp && methodProp.isKind(SyntaxKind.PropertyAssignment)) {
              const methodInit = methodProp.getInitializer();
              if (methodInit && methodInit.isKind(SyntaxKind.StringLiteral)) {
                methodValue = methodInit.getLiteralValue().toUpperCase() as HttpMethod;
              }
            }

            let authValue = false;
            const authProp = optionsObj.getProperty("auth");
            if (authProp && authProp.isKind(SyntaxKind.PropertyAssignment)) {
              const authInit = authProp.getInitializer();
              if (authInit) {
                authValue = authInit.getText() === "true";
              }
            }

            let ingressValue: IngressType = "api-gateway";
            const ingressProp = optionsObj.getProperty("ingress");
            if (ingressProp && ingressProp.isKind(SyntaxKind.PropertyAssignment)) {
              const ingressInit = ingressProp.getInitializer();
              if (ingressInit && ingressInit.isKind(SyntaxKind.StringLiteral)) {
                ingressValue = ingressInit.getLiteralValue() as IngressType;
              }
            }

            // In-code configuration: timeout, memory, concurrency, cors, policies, environment
            const timeout = this.extractDuration(optionsObj.getProperty("timeout"));
            const memory = this.extractMemory(optionsObj.getProperty("memory"));
            const concurrency = this.extractNumber(optionsObj.getProperty("concurrency"));
            const cors = this.extractCors(optionsObj.getProperty("cors"));
            const policies = this.extractPolicies(optionsObj.getProperty("policies"));
            const environment = this.extractEnvironment(optionsObj.getProperty("environment"));

            apis.push({
              id: varName,
              exportName: varName,
              sourceFile: sourceFile.getFilePath(),
              method: methodValue,
              path: pathValue,
              auth: authValue,
              ingress: ingressValue,
              timeout,
              memory,
              concurrency,
              cors,
              policies,
              environment,
            });
          }

          // Queue consumer: queue.consumer(...)
          if (expr.isKind(SyntaxKind.PropertyAccessExpression)) {
            const propName = expr.getName();
            if (propName === "consumer") {
              const targetQueueVar = expr.getExpression().getText();
              const args = init.getArguments();
              let batchSize = 10;
              let timeout: number | undefined;
              let concurrency: number | undefined;
              let memory: number | undefined;
              let policies: PolicyStatementIR[] | undefined;
              let environment: Record<string, string> | undefined;

              if (args.length > 0 && args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const consumerOpts = args[0] as ObjectLiteralExpression;
                batchSize = this.extractNumber(consumerOpts.getProperty("batchSize")) ?? 10;
                timeout = this.extractDuration(consumerOpts.getProperty("timeout"));
                concurrency = this.extractNumber(consumerOpts.getProperty("concurrency"));
                memory = this.extractMemory(consumerOpts.getProperty("memory"));
                policies = this.extractPolicies(consumerOpts.getProperty("policies"));
                environment = this.extractEnvironment(consumerOpts.getProperty("environment"));
              }

              consumers.push({
                id: varName,
                queueName: varToQueueName[targetQueueVar] || targetQueueVar,
                exportName: varName,
                sourceFile: sourceFile.getFilePath(),
                batchSize,
                timeout,
                concurrency,
                memory,
                policies,
                environment,
              });
            }

            // DynamoDB stream consumer: table.stream(...)
            if (propName === "stream") {
              const targetTableVar = expr.getExpression().getText();
              const args = init.getArguments();
              let batchSize = 100;
              let startingPosition: "LATEST" | "TRIM_HORIZON" = "LATEST";
              let enabled: boolean | undefined;
              let timeout: number | undefined;
              let concurrency: number | undefined;
              let memory: number | undefined;
              let policies: PolicyStatementIR[] | undefined;
              let environment: Record<string, string> | undefined;

              if (args.length > 0 && args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const streamOpts = args[0] as ObjectLiteralExpression;
                batchSize = this.extractNumber(streamOpts.getProperty("batchSize")) ?? 100;
                const posStr = this.extractString(streamOpts.getProperty("startingPosition"));
                if (posStr === "TRIM_HORIZON") startingPosition = "TRIM_HORIZON";
                const enProp = streamOpts.getProperty("enabled");
                if (enProp && enProp.isKind(SyntaxKind.PropertyAssignment)) {
                  enabled = enProp.getInitializer()?.getText() !== "false";
                }
                timeout = this.extractDuration(streamOpts.getProperty("timeout"));
                concurrency = this.extractNumber(streamOpts.getProperty("concurrency"));
                memory = this.extractMemory(streamOpts.getProperty("memory"));
                policies = this.extractPolicies(streamOpts.getProperty("policies"));
                environment = this.extractEnvironment(streamOpts.getProperty("environment"));
              }

              tableStreams.push({
                id: varName,
                tableName: varToTableName[targetTableVar] || targetTableVar,
                exportName: varName,
                sourceFile: sourceFile.getFilePath(),
                batchSize,
                startingPosition,
                enabled,
                timeout,
                concurrency,
                memory,
                policies,
                environment,
              });
            }

            // Topic subscriber: topic.subscribe(...)
            if (propName === "subscribe") {
              const targetTopicVar = expr.getExpression().getText();
              const args = init.getArguments();
              let timeout: number | undefined;
              let concurrency: number | undefined;
              let memory: number | undefined;
              let policies: PolicyStatementIR[] | undefined;
              let environment: Record<string, string> | undefined;

              if (args.length > 0 && args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const subOpts = args[0] as ObjectLiteralExpression;
                timeout = this.extractDuration(subOpts.getProperty("timeout"));
                concurrency = this.extractNumber(subOpts.getProperty("concurrency"));
                memory = this.extractMemory(subOpts.getProperty("memory"));
                policies = this.extractPolicies(subOpts.getProperty("policies"));
                environment = this.extractEnvironment(subOpts.getProperty("environment"));
              }

              topicSubscribers.push({
                id: varName,
                topicName: varToTopicName[targetTopicVar] || targetTopicVar,
                exportName: varName,
                sourceFile: sourceFile.getFilePath(),
                timeout,
                concurrency,
                memory,
                policies,
                environment,
              });
            }
          }
        }

        // 2. Detect new Table(...), new Bucket(...), new Queue(...)
        if (init.isKind(SyntaxKind.NewExpression)) {
          const expr = init.getExpression();
          const className = expr.getText();
          const args = init.getArguments();

          if (className === "Table") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Table '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const tableName = args[0].getLiteralValue();
            varToTableName[varName] = tableName;

            let partitionKey = { name: "id", type: "string" as const };
            let sortKey: { name: string; type: "string" | "number" | "binary" } | undefined;
            let billingMode: "PAY_PER_REQUEST" | "PROVISIONED" = "PAY_PER_REQUEST";
            let stream: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY" | undefined;
            let pointInTimeRecovery: boolean | undefined;
            const indexes: Record<string, TableIndexIR> = {};

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const optionsObj = args[1] as ObjectLiteralExpression;

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

              // In-code configuration: stream, billingMode, pointInTimeRecovery, indexes
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

            tables.push({
              id: varName,
              name: tableName,
              partitionKey,
              sortKey,
              billingMode,
              stream,
              pointInTimeRecovery,
              indexes,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Bucket") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Bucket '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const bucketName = args[0].getLiteralValue();
            varToBucketName[varName] = bucketName;

            let versioned = false;
            let eventBridge = false;
            let publicAccessBlock = true;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
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
            }

            buckets.push({
              id: varName,
              name: bucketName,
              versioned,
              eventBridge,
              publicAccessBlock,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Queue") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Queue '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const queueName = args[0].getLiteralValue();
            varToQueueName[varName] = queueName;

            let visibilityTimeout: number | undefined;
            let deadLetterQueue: { maxReceiveCount: number } | undefined;
            let fifo = false;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              visibilityTimeout = this.extractDuration(opts.getProperty("visibilityTimeout"));

              const fifoProp = opts.getProperty("fifo");
              if (fifoProp && fifoProp.isKind(SyntaxKind.PropertyAssignment)) {
                fifo = fifoProp.getInitializer()?.getText() === "true";
              }

              const dlqProp = opts.getProperty("deadLetterQueue");
              if (dlqProp && dlqProp.isKind(SyntaxKind.PropertyAssignment)) {
                const dlqObj = dlqProp.getInitializer();
                if (dlqObj && dlqObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const mrcProp = dlqObj.getProperty("maxReceiveCount");
                  const maxReceiveCount = this.extractNumber(mrcProp) ?? 3;
                  deadLetterQueue = { maxReceiveCount };
                }
              }
            }

            queues.push({
              id: varName,
              name: queueName,
              visibilityTimeout,
              deadLetterQueue,
              fifo,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Topic") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Topic '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const topicName = args[0].getLiteralValue();
            varToTopicName[varName] = topicName;

            let fifo = false;
            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              fifo = opts.getProperty("fifo")?.getText() === "true";
            }

            topics.push({
              id: varName,
              name: topicName,
              fifo,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Alarm") {
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
            let metric: AlarmIR["metric"] | undefined;
            const actions: string[] = [];

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              threshold = this.extractNumber(opts.getProperty("threshold")) ?? 0;
              evaluationPeriods = this.extractNumber(opts.getProperty("evaluationPeriods")) ?? 1;
              comparison = this.extractString(opts.getProperty("comparison")) || "GreaterThanOrEqualToThreshold";
              description = this.extractString(opts.getProperty("description"));

              const metricProp = opts.getProperty("metric");
              if (metricProp && metricProp.isKind(SyntaxKind.PropertyAssignment)) {
                const mObj = metricProp.getInitializer();
                if (mObj && mObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const metricName = this.extractString(mObj.getProperty("metricName")) || "Invocations";
                  const namespace = this.extractString(mObj.getProperty("namespace")) || "AWS/Lambda";
                  const period = this.extractNumber(mObj.getProperty("period")) || 60;
                  const stat = this.extractString(mObj.getProperty("stat")) || "Sum";
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

              const actionsProp = opts.getProperty("actions");
              if (actionsProp && actionsProp.isKind(SyntaxKind.PropertyAssignment)) {
                const arr = actionsProp.getInitializer();
                if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  for (const el of arr.getElements()) {
                    const rawAction = el.getText();
                    const cleanAction = varToTopicName[rawAction] || rawAction.replace(/['"]/g, "");
                    actions.push(cleanAction);
                  }
                }
              }
            }

            alarms.push({
              id: varName,
              name: alarmName,
              threshold,
              evaluationPeriods,
              comparison,
              description,
              metric,
              actions,
              sourceFile: sourceFile.getFilePath(),
            });
          }
        }
      }

      // Scan for event bindings: bucketVar.on("objectCreated", queueVar, { prefix })
      for (const statement of sourceFile.getStatements()) {
        if (statement.isKind(SyntaxKind.ExpressionStatement)) {
          const expr = statement.getExpression();
          if (expr.isKind(SyntaxKind.CallExpression)) {
            const callee = expr.getExpression();
            if (
              callee.isKind(SyntaxKind.PropertyAccessExpression) &&
              callee.getName() === "on"
            ) {
              const bucketVar = callee.getExpression().getText();
              const args = expr.getArguments();
              if (args.length >= 2) {
                const eventArg = args[0]
                  ?.getText()
                  .replace(/['"]/g, "") as "objectCreated" | "objectRemoved";
                const targetQueueVar = args[1]?.getText() || "";
                let prefix: string | undefined;
                let suffix: string | undefined;

                if (args.length > 2 && args[2]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const opts = args[2] as ObjectLiteralExpression;
                  const pProp = opts.getProperty("prefix");
                  if (pProp && pProp.isKind(SyntaxKind.PropertyAssignment)) {
                    prefix = pProp.getInitializer()?.getText().replace(/['"]/g, "");
                  }
                  const sProp = opts.getProperty("suffix");
                  if (sProp && sProp.isKind(SyntaxKind.PropertyAssignment)) {
                    suffix = sProp.getInitializer()?.getText().replace(/['"]/g, "");
                  }
                }

                const sourceBucketName = varToBucketName[bucketVar] || bucketVar;
                const targetQueueName = varToQueueName[targetQueueVar] || targetQueueVar;

                // Ensure the source bucket has eventBridge enabled
                const b = buckets.find((b) => b.name === sourceBucketName);
                if (b) {
                  b.eventBridge = true;
                }

                bindings.push({
                  id: `${bucketVar}_${targetQueueVar}_${eventArg}`,
                  sourceBucketName,
                  event: eventArg,
                  targetQueueName,
                  prefix,
                  suffix,
                });
              }
            }
          }
        }
      }
    }

    return {
      apis,
      tables,
      tableStreams,
      buckets,
      queues,
      consumers,
      topics,
      topicSubscribers,
      alarms,
      bindings,
    };
  }

  private extractDuration(propNode: Node | undefined): number | undefined {
    if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = propNode.getInitializer();
    if (!init) return undefined;

    if (init.isKind(SyntaxKind.NumericLiteral)) {
      return init.getLiteralValue();
    }
    if (init.isKind(SyntaxKind.StringLiteral)) {
      const str = init.getLiteralValue();
      return this.parseDurationString(str);
    }
    return undefined;
  }

  private parseDurationString(str: string): number {
    const sMatch = str.match(/^(\d+)s$/);
    if (sMatch) return parseInt(sMatch[1]!, 10);

    const mMatch = str.match(/^(\d+)m$/);
    if (mMatch) return parseInt(mMatch[1]!, 10) * 60;

    const hMatch = str.match(/^(\d+)h$/);
    if (hMatch) return parseInt(hMatch[1]!, 10) * 3600;

    return parseInt(str, 10) || 30;
  }

  private extractMemory(propNode: Node | undefined): number | undefined {
    if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = propNode.getInitializer();
    if (!init) return undefined;

    if (init.isKind(SyntaxKind.NumericLiteral)) {
      return init.getLiteralValue();
    }
    if (init.isKind(SyntaxKind.StringLiteral)) {
      const str = init.getLiteralValue();
      const mbMatch = str.match(/^(\d+)MB$/i);
      if (mbMatch) return parseInt(mbMatch[1]!, 10);

      const gbMatch = str.match(/^(\d+)GB$/i);
      if (gbMatch) return parseInt(gbMatch[1]!, 10) * 1024;
    }
    return undefined;
  }

  private extractNumber(propNode: Node | undefined): number | undefined {
    if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = propNode.getInitializer();
    if (!init || !init.isKind(SyntaxKind.NumericLiteral)) return undefined;
    return init.getLiteralValue();
  }

  private extractCors(propNode: Node | undefined): CorsConfig | boolean | undefined {
    if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = propNode.getInitializer();
    if (!init) return undefined;

    if (init.getText() === "true") return true;
    if (init.getText() === "false") return false;

    if (init.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const config: CorsConfig = {};
      const originsProp = init.getProperty("allowOrigins");
      if (originsProp && originsProp.isKind(SyntaxKind.PropertyAssignment)) {
        const arr = originsProp.getInitializer();
        if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
          config.allowOrigins = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
        }
      }

      const headersProp = init.getProperty("allowHeaders");
      if (headersProp && headersProp.isKind(SyntaxKind.PropertyAssignment)) {
        const arr = headersProp.getInitializer();
        if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
          config.allowHeaders = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
        }
      }

      const methodsProp = init.getProperty("allowMethods");
      if (methodsProp && methodsProp.isKind(SyntaxKind.PropertyAssignment)) {
        const arr = methodsProp.getInitializer();
        if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
          config.allowMethods = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
        }
      }
      return config;
    }
    return undefined;
  }

  private extractString(node: Node | undefined): string | undefined {
    if (!node) return undefined;
    let target = node;
    if (node.isKind(SyntaxKind.PropertyAssignment)) {
      target = (node as any).getInitializer() || node;
    }
    if (target.isKind(SyntaxKind.StringLiteral)) {
      return (target as any).getLiteralValue();
    }
    return target.getText().replace(/['"]/g, "");
  }

  private extractStringArray(node: Node | undefined): string[] | undefined {
    if (!node) return undefined;
    let target = node;
    if (node.isKind(SyntaxKind.PropertyAssignment)) {
      target = (node as any).getInitializer() || node;
    }
    if (target.isKind(SyntaxKind.ArrayLiteralExpression)) {
      return (target as any).getElements().map((e: any) => this.extractString(e)).filter((s: any): s is string => typeof s === "string");
    }
    return undefined;
  }

  private extractEnvironment(node: Node | undefined): Record<string, string> | undefined {
    if (!node || !node.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = (node as any).getInitializer();
    if (!init || !init.isKind(SyntaxKind.ObjectLiteralExpression)) return undefined;
    const env: Record<string, string> = {};
    for (const prop of (init as any).getProperties()) {
      if (prop.isKind(SyntaxKind.PropertyAssignment)) {
        const key = prop.getName();
        const propInit = prop.getInitializer();
        if (propInit) {
          if (propInit.isKind(SyntaxKind.StringLiteral)) {
            env[key] = propInit.getLiteralValue();
          } else {
            const rawText = propInit.getText().trim();
            const match = rawText.match(/^process\.env\.([a-zA-Z0-9_]+)(?:\s*\|\|\s*['"](.*)['"])?$/);
            if (match) {
              const varName = match[1];
              const fallback = match[2] ?? "";
              env[key] = process.env[varName] || fallback;
            } else {
              env[key] = rawText.replace(/['"]/g, "");
            }
          }
        }
      }
    }
    return Object.keys(env).length > 0 ? env : undefined;
  }

  private extractPolicies(node: Node | undefined): PolicyStatementIR[] | undefined {
    if (!node || !node.isKind(SyntaxKind.PropertyAssignment)) return undefined;
    const init = (node as any).getInitializer();
    if (!init || !init.isKind(SyntaxKind.ArrayLiteralExpression)) return undefined;
    const statements: PolicyStatementIR[] = [];
    for (const el of (init as any).getElements()) {
      if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const obj = el as ObjectLiteralExpression;
        const effectProp = obj.getProperty("effect");
        const actionsProp = obj.getProperty("actions");
        const resourcesProp = obj.getProperty("resources");

        const effect = (this.extractString(effectProp) as "Allow" | "Deny") || "Allow";
        const actions = this.extractStringArray(actionsProp) || [];
        const resources = this.extractStringArray(resourcesProp) || [];

        if (actions.length > 0 && resources.length > 0) {
          statements.push({ effect, actions, resources });
        }
      }
    }
    return statements.length > 0 ? statements : undefined;
  }
}
