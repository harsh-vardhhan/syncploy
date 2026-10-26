
import {
  unwrapExpression,
  extractDuration,
  parseDurationString,
  extractMemory,
  extractNumber,
  extractCors,
  extractString,
  extractBoolean,
  extractStringArray,
  extractEnvironment,
  extractPolicies,
  extractContainer,
} from './extractors/ast-utils';
import { extractMutationsFromNode } from './extractors/mutations';
import { extractElectroEntity } from './extractors/electrodb';

export * from './extractors/ast-utils';
export * from './extractors/mutations';
export * from './extractors/electrodb';

import {
  Project,
  SyntaxKind,
  type Node,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
  type NewExpression,
} from "ts-morph";
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
  AlarmMetricQueryIR,
  DeliveryStreamIR,
  AuthIR,
  TableIndexIR,
  CorsConfig,
  PolicyStatementIR,
  EventBindingIR,
  ContainerIR,
  FunctionMutationsIR,
  ElectroEntityIR,
  ElectroIndexIR,
} from "../types";

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
    const deliveryStreams: DeliveryStreamIR[] = [];
    const auths: AuthIR[] = [];
    const bindings: EventBindingIR[] = [];
    const electroEntities: ElectroEntityIR[] = [];

    // Maps to track variable names to resource names
    const varToTableName: Record<string, string> = {};
    const varToQueueName: Record<string, string> = {};
    const varToBucketName: Record<string, string> = {};
    const varToTopicName: Record<string, string> = {};
    const varToDeliveryStreamName: Record<string, string> = {};
    const varToAuthName: Record<string, string> = {};
    const varToEntity: Record<string, ElectroEntityIR> = {};

    // Pass 1: Pre-populate variable-to-resource-name mappings across all project files
    for (const sourceFile of this.project.getSourceFiles()) {
      for (const decl of sourceFile.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (!init || !init.isKind(SyntaxKind.NewExpression)) continue;
        const expr = init.getExpression();
        const className = expr.getText();
        const args = init.getArguments();
        const varName = decl.getName();

        if (className === "Table" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToTableName[varName] = args[0].getLiteralValue();
        } else if (className === "Bucket" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToBucketName[varName] = args[0].getLiteralValue();
        } else if (className === "Queue" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToQueueName[varName] = args[0].getLiteralValue();
        } else if (className === "Topic" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToTopicName[varName] = args[0].getLiteralValue();
        } else if (className === "DeliveryStream" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToDeliveryStreamName[varName] = args[0].getLiteralValue();
        } else if (className === "Auth" && args.length > 0 && args[0]?.isKind(SyntaxKind.StringLiteral)) {
          varToAuthName[varName] = args[0].getLiteralValue();
        } else if (className === "Entity" || className.endsWith(".Entity")) {
          const entity = this.extractElectroEntity(decl, sourceFile);
          if (entity) {
            electroEntities.push(entity);
            varToEntity[varName] = entity;
            varToTableName[varName] = entity.tableName || entity.serviceName;
          }
        }
      }
    }

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
            const optionsArg = this.unwrapExpression(args[0]);
            if (args.length === 0 || !optionsArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              throw new Error(
                `API endpoint '${varName}' in ${sourceFile.getFilePath()} must provide an options object.`
              );
            }

            const optionsObj = optionsArg as ObjectLiteralExpression;
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

            // In-code configuration: timeout, memory, concurrency, cors, policies, environment, container, logicalId, functionName
            const timeout = this.extractDuration(optionsObj.getProperty("timeout"));
            const memory = this.extractMemory(optionsObj.getProperty("memory"));
            const concurrency = this.extractNumber(optionsObj.getProperty("concurrency"));
            const cors = this.extractCors(optionsObj.getProperty("cors"));
            const policies = this.extractPolicies(optionsObj.getProperty("policies"));
            const environment = this.extractEnvironment(optionsObj.getProperty("environment"));
            const container = this.extractContainer(optionsObj.getProperty("container"));
            const logicalId = this.extractString(optionsObj.getProperty("logicalId"));
            const functionName = this.extractString(optionsObj.getProperty("functionName"));
            const roleLogicalId = this.extractString(optionsObj.getProperty("roleLogicalId"));
            const permissionLogicalId = this.extractString(optionsObj.getProperty("permissionLogicalId"));
            const invokePermissionLogicalId = this.extractString(optionsObj.getProperty("invokePermissionLogicalId"));

            const handlerNode = args.length > 1 ? args[1] : undefined;
            const mutations = this.extractMutationsFromNode(
              handlerNode,
              sourceFile,
              varToTableName,
              varToBucketName,
              varToQueueName,
              varToTopicName
            );

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
              container,
              logicalId,
              functionName,
              roleLogicalId,
              permissionLogicalId,
              invokePermissionLogicalId,
              mutations,
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
              let container: ContainerIR | undefined;
              let logicalId: string | undefined;
              let functionName: string | undefined;
              let eventSourceMappingLogicalId: string | undefined;
              let roleLogicalId: string | undefined;

              const optArg = this.unwrapExpression(args[0]);
              if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const consumerOpts = optArg as ObjectLiteralExpression;
                batchSize = this.extractNumber(consumerOpts.getProperty("batchSize")) ?? 10;
                timeout = this.extractDuration(consumerOpts.getProperty("timeout"));
                concurrency = this.extractNumber(consumerOpts.getProperty("concurrency"));
                memory = this.extractMemory(consumerOpts.getProperty("memory"));
                policies = this.extractPolicies(consumerOpts.getProperty("policies"));
                environment = this.extractEnvironment(consumerOpts.getProperty("environment"));
                container = this.extractContainer(consumerOpts.getProperty("container"));
                logicalId = this.extractString(consumerOpts.getProperty("logicalId"));
                functionName = this.extractString(consumerOpts.getProperty("functionName"));
                eventSourceMappingLogicalId =
                  this.extractString(consumerOpts.getProperty("eventSourceMappingLogicalId")) ??
                  this.extractString(consumerOpts.getProperty("mappingLogicalId"));
                roleLogicalId = this.extractString(consumerOpts.getProperty("roleLogicalId"));
              }

              const handlerNode =
                args.length > 1
                  ? args[1]
                  : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
                    ? args[0]
                    : undefined;
              const mutations = this.extractMutationsFromNode(
                handlerNode,
                sourceFile,
                varToTableName,
                varToBucketName,
                varToQueueName,
                varToTopicName
              );

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
                container,
                logicalId,
                functionName,
                eventSourceMappingLogicalId,
                roleLogicalId,
                mutations,
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
              let container: ContainerIR | undefined;
              let logicalId: string | undefined;
              let functionName: string | undefined;
              let eventSourceMappingLogicalId: string | undefined;
              let roleLogicalId: string | undefined;

              const optArg = this.unwrapExpression(args[0]);
              if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const streamOpts = optArg as ObjectLiteralExpression;
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
                container = this.extractContainer(streamOpts.getProperty("container"));
                logicalId = this.extractString(streamOpts.getProperty("logicalId"));
                functionName = this.extractString(streamOpts.getProperty("functionName"));
                eventSourceMappingLogicalId =
                  this.extractString(streamOpts.getProperty("eventSourceMappingLogicalId")) ??
                  this.extractString(streamOpts.getProperty("mappingLogicalId"));
                roleLogicalId = this.extractString(streamOpts.getProperty("roleLogicalId"));
              }

              const handlerNode =
                args.length > 1
                  ? args[1]
                  : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
                    ? args[0]
                    : undefined;
              const mutations = this.extractMutationsFromNode(
                handlerNode,
                sourceFile,
                varToTableName,
                varToBucketName,
                varToQueueName,
                varToTopicName
              );

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
                container,
                logicalId,
                functionName,
                eventSourceMappingLogicalId,
                roleLogicalId,
                mutations,
              });
            }

            // Topic subscriber: topic.subscribe(...) or topic.subscriber(...)
            if (propName === "subscribe" || propName === "subscriber") {
              const targetTopicVar = expr.getExpression().getText();
              const args = init.getArguments();
              let timeout: number | undefined;
              let concurrency: number | undefined;
              let memory: number | undefined;
              let policies: PolicyStatementIR[] | undefined;
              let environment: Record<string, string> | undefined;
              let container: ContainerIR | undefined;
              let logicalId: string | undefined;
              let functionName: string | undefined;
              let subscriptionLogicalId: string | undefined;
              let permissionLogicalId: string | undefined;
              let roleLogicalId: string | undefined;

              const optArg = this.unwrapExpression(args[0]);
              if (args.length > 0 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const subOpts = optArg as ObjectLiteralExpression;
                timeout = this.extractDuration(subOpts.getProperty("timeout"));
                concurrency = this.extractNumber(subOpts.getProperty("concurrency"));
                memory = this.extractMemory(subOpts.getProperty("memory"));
                policies = this.extractPolicies(subOpts.getProperty("policies"));
                environment = this.extractEnvironment(subOpts.getProperty("environment"));
                container = this.extractContainer(subOpts.getProperty("container"));
                logicalId = this.extractString(subOpts.getProperty("logicalId"));
                functionName = this.extractString(subOpts.getProperty("functionName"));
                subscriptionLogicalId = this.extractString(subOpts.getProperty("subscriptionLogicalId"));
                permissionLogicalId = this.extractString(subOpts.getProperty("permissionLogicalId"));
                roleLogicalId = this.extractString(subOpts.getProperty("roleLogicalId"));
              }

              const handlerNode =
                args.length > 1
                  ? args[1]
                  : args.length === 1 && !args[0]?.isKind(SyntaxKind.ObjectLiteralExpression)
                    ? args[0]
                    : undefined;
              const mutations = this.extractMutationsFromNode(
                handlerNode,
                sourceFile,
                varToTableName,
                varToBucketName,
                varToQueueName,
                varToTopicName
              );

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
                container,
                logicalId,
                functionName,
                subscriptionLogicalId,
                permissionLogicalId,
                roleLogicalId,
                mutations,
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
            let logicalId: string | undefined;
            let customTableName: string | undefined;
            let retain: boolean | undefined;
            let deletionPolicy: "Retain" | "Delete" | "Snapshot" | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const optionsObj = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(optionsObj.getProperty("logicalId"));
              customTableName = this.extractString(optionsObj.getProperty("tableName"));
              retain = this.extractBoolean(optionsObj.getProperty("retain"));
              deletionPolicy = this.extractString(optionsObj.getProperty("deletionPolicy")) as any;

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
              logicalId,
              tableName: customTableName,
              retain,
              deletionPolicy,
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
            let accountScoped = false;
            let objectLock: BucketIR["objectLock"];
            let logicalId: string | undefined;
            let customBucketName: string | undefined;
            let retain: boolean | undefined;
            let deletionPolicy: "Retain" | "Delete" | "Snapshot" | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              customBucketName = this.extractString(opts.getProperty("bucketName"));
              retain = this.extractBoolean(opts.getProperty("retain"));
              deletionPolicy = this.extractString(opts.getProperty("deletionPolicy")) as any;
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
                  const mode = this.extractString(olInit.getProperty("mode")) as any;
                  const days = this.extractNumber(olInit.getProperty("days"));
                  const years = this.extractNumber(olInit.getProperty("years"));
                  objectLock = { mode, days, years };
                }
              }
            }

            buckets.push({
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
            let deadLetterQueue: { maxReceiveCount: number; logicalId?: string | undefined; queueName?: string | undefined } | undefined;
            let fifo = false;
            let logicalId: string | undefined;
            let customQueueName: string | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              customQueueName = this.extractString(opts.getProperty("queueName"));
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
                  const dlqLogicalId = this.extractString(dlqObj.getProperty("logicalId"));
                  const dlqQueueName = this.extractString(dlqObj.getProperty("queueName"));
                  deadLetterQueue = { maxReceiveCount, logicalId: dlqLogicalId, queueName: dlqQueueName };
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
              logicalId,
              queueName: customQueueName,
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
            let subscriptions: TopicIR["subscriptions"];
            let logicalId: string | undefined;
            let customTopicName: string | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              customTopicName = this.extractString(opts.getProperty("topicName"));
              fifo = opts.getProperty("fifo")?.getText() === "true";
              const subsProp = opts.getProperty("subscriptions");
              if (subsProp && subsProp.isKind(SyntaxKind.PropertyAssignment)) {
                const arr = subsProp.getInitializer();
                if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  subscriptions = [];
                  for (const el of arr.getElements()) {
                    if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
                      const proto = this.extractString(el.getProperty("protocol")) || "email";
                      const endp = this.extractString(el.getProperty("endpoint")) || "";
                      if (endp) {
                        subscriptions.push({ protocol: proto, endpoint: endp });
                      }
                    }
                  }
                }
              }
            }

            topics.push({
              id: varName,
              name: topicName,
              fifo,
              subscriptions,
              sourceFile: sourceFile.getFilePath(),
              logicalId,
              topicName: customTopicName,
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
            let treatMissingData: string | undefined;
            let metric: AlarmIR["metric"] | undefined;
            let metrics: AlarmIR["metrics"];
            const actions: string[] = [];
            let logicalId: string | undefined;
            let customAlarmName: string | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              customAlarmName = this.extractString(opts.getProperty("alarmName"));
              threshold = this.extractNumber(opts.getProperty("threshold")) ?? 0;
              evaluationPeriods = this.extractNumber(opts.getProperty("evaluationPeriods")) ?? 1;
              comparison = this.extractString(opts.getProperty("comparison")) || "GreaterThanOrEqualToThreshold";
              description = this.extractString(opts.getProperty("description"));
              treatMissingData = this.extractString(opts.getProperty("treatMissingData"));

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

              const metricsProp = opts.getProperty("metrics");
              if (metricsProp && metricsProp.isKind(SyntaxKind.PropertyAssignment)) {
                const arr = metricsProp.getInitializer();
                if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  metrics = [];
                  for (const el of arr.getElements()) {
                    if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
                      const id = this.extractString(el.getProperty("id")) || "";
                      const expression = this.extractString(el.getProperty("expression"));
                      const label = this.extractString(el.getProperty("label"));
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
                              const metricName = this.extractString(mInit.getProperty("metricName")) || "Invocations";
                              const namespace = this.extractString(mInit.getProperty("namespace")) || "AWS/Lambda";
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
                                      const n = this.extractString(dimEl.getProperty("name")) || this.extractString(dimEl.getProperty("Name"));
                                      const v = this.extractString(dimEl.getProperty("value")) || this.extractString(dimEl.getProperty("Value"));
                                      if (n && v) dims[n] = v;
                                    }
                                  }
                                }
                              }
                              metricObj = { metricName, namespace, dimensions: dims };
                            }
                          }
                          const period = this.extractDuration(sObj.getProperty("period")) || this.extractNumber(sObj.getProperty("period")) || 60;
                          const stat = this.extractString(sObj.getProperty("stat")) || "Sum";
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
              treatMissingData,
              metric,
              metrics,
              actions,
              sourceFile: sourceFile.getFilePath(),
              logicalId,
              alarmName: customAlarmName,
            });
          } else if (className === "DeliveryStream") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `DeliveryStream '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const streamName = args[0].getLiteralValue();
            varToDeliveryStreamName[varName] = streamName;

            let destinationBucketName = "";
            let prefix: string | undefined;
            let errorPrefix: string | undefined;
            let bufferingInterval: number | undefined;
            let bufferingSize: number | undefined;
            let compression: DeliveryStreamIR["compression"] = "GZIP";
            let logicalId: string | undefined;
            let customStreamName: string | undefined;
            let roleLogicalId: string | undefined;

            const optArg = this.unwrapExpression(args[1]);
            if (args.length > 1 && optArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = optArg as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              customStreamName = this.extractString(opts.getProperty("streamName"));
              roleLogicalId = this.extractString(opts.getProperty("roleLogicalId"));
              const destProp = opts.getProperty("destination");
              if (destProp && destProp.isKind(SyntaxKind.PropertyAssignment)) {
                const destInit = destProp.getInitializer();
                if (destInit) {
                  const rawDest = destInit.getText().replace(/['"]/g, "");
                  destinationBucketName = varToBucketName[rawDest] || rawDest;
                }
              }
              prefix = this.extractString(opts.getProperty("prefix"));
              errorPrefix = this.extractString(opts.getProperty("errorPrefix"));
              bufferingInterval = this.extractDuration(opts.getProperty("bufferingInterval"));
              bufferingSize = this.extractMemory(opts.getProperty("bufferingSize"));
              const compStr = this.extractString(opts.getProperty("compression"));
              if (compStr) {
                compression = compStr as DeliveryStreamIR["compression"];
              }
            }

            deliveryStreams.push({
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
            });
          } else if (className === "Auth") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Auth '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const authName = args[0].getLiteralValue();
            varToAuthName[varName] = authName;

            let signInMethod: AuthIR["signInMethod"] = "email";
            let autoVerify: ("email" | "phone")[] | undefined;
            let adminOnly: boolean | undefined = true;
            let passwordPolicy: AuthIR["passwordPolicy"];
            let client: AuthIR["client"];
            let logicalId: string | undefined;
            let userPoolName: string | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const opts = args[1] as ObjectLiteralExpression;
              logicalId = this.extractString(opts.getProperty("logicalId"));
              userPoolName = this.extractString(opts.getProperty("userPoolName"));
              const methodStr = this.extractString(opts.getProperty("signInMethod"));
              if (methodStr === "email" || methodStr === "phone" || methodStr === "username") {
                signInMethod = methodStr;
              }
              const adminOnlyVal = this.extractBoolean(opts.getProperty("adminOnly"));
              if (adminOnlyVal !== undefined) {
                adminOnly = adminOnlyVal;
              }

              const autoVerifyProp = opts.getProperty("autoVerify");
              if (autoVerifyProp && autoVerifyProp.isKind(SyntaxKind.PropertyAssignment)) {
                const init = autoVerifyProp.getInitializer();
                if (init && init.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  autoVerify = init
                    .getElements()
                    .filter((e) => e.isKind(SyntaxKind.StringLiteral))
                    .map((e) => (e as any).getLiteralValue() as "email" | "phone");
                }
              }

              const policyProp = opts.getProperty("passwordPolicy");
              if (policyProp && policyProp.isKind(SyntaxKind.PropertyAssignment)) {
                const init = policyProp.getInitializer();
                if (init && init.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const policyOpts = init as ObjectLiteralExpression;
                  passwordPolicy = {
                    minLength: this.extractNumber(policyOpts.getProperty("minLength")),
                    requireUppercase: this.extractBoolean(policyOpts.getProperty("requireUppercase")),
                    requireLowercase: this.extractBoolean(policyOpts.getProperty("requireLowercase")),
                    requireNumbers: this.extractBoolean(policyOpts.getProperty("requireNumbers")),
                    requireSymbols: this.extractBoolean(policyOpts.getProperty("requireSymbols")),
                    tempPasswordValidityDays: this.extractNumber(policyOpts.getProperty("tempPasswordValidityDays")),
                  };
                }
              }

              const clientProp = opts.getProperty("client");
              if (clientProp && clientProp.isKind(SyntaxKind.PropertyAssignment)) {
                const init = clientProp.getInitializer();
                if (init && init.isKind(SyntaxKind.ObjectLiteralExpression)) {
                  const clientOpts = init as ObjectLiteralExpression;
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
                    generateSecret: this.extractBoolean(clientOpts.getProperty("generateSecret")),
                    explicitAuthFlows,
                    preventUserExistenceErrors: this.extractBoolean(clientOpts.getProperty("preventUserExistenceErrors")),
                    clientLogicalId: this.extractString(clientOpts.getProperty("clientLogicalId")),
                    clientName: this.extractString(clientOpts.getProperty("clientName")),
                  };
                }
              }
            }

            auths.push({
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
                let ruleLogicalId: string | undefined;
                let queuePolicyLogicalId: string | undefined;

                const optArg = this.unwrapExpression(args[2]);
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
                  ruleLogicalId = this.extractString(opts.getProperty("ruleLogicalId"));
                  queuePolicyLogicalId = this.extractString(opts.getProperty("queuePolicyLogicalId"));
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
                  ruleLogicalId,
                  queuePolicyLogicalId,
                });
              }
            }
          }
        }
      }
    }

    // Resolve bucket references for delivery streams if defined after
    for (const ds of deliveryStreams) {
      const mapped = varToBucketName[ds.destinationBucketName];
      if (mapped) {
        ds.destinationBucketName = mapped;
      }
    }

    // ElectroDB Integration: Auto-synthesize and enrich DynamoDB tables from ElectroDB entities
    if (electroEntities.length > 0) {
      const entitiesByService: Record<string, ElectroEntityIR[]> = {};
      for (const entity of electroEntities) {
        if (!entitiesByService[entity.serviceName]) {
          entitiesByService[entity.serviceName] = [];
        }
        entitiesByService[entity.serviceName]!.push(entity);
      }

      for (const [serviceName, entities] of Object.entries(entitiesByService)) {
        const firstEntity = entities[0]!;
        const pkField = firstEntity.primaryIndex.pkField || "PK";
        const skField = firstEntity.primaryIndex.skField;

        // Union all secondary indexes across all entities in this service
        const unionedIndexes: Record<string, TableIndexIR> = {};
        for (const entity of entities) {
          for (const secIdx of Object.values(entity.secondaryIndexes) as ElectroIndexIR[]) {
            if (!unionedIndexes[secIdx.name]) {
              unionedIndexes[secIdx.name] = {
                partitionKey: secIdx.pkField,
                sortKey: secIdx.skField,
                projection: (secIdx.projection as any) || "ALL",
              };
            }
          }
        }

        // Check if an explicit table exists for this service
        const existingTable = tables.find(
          (t) =>
            t.name === serviceName ||
            (firstEntity.tableName && (t.name === firstEntity.tableName || t.tableName === firstEntity.tableName)) ||
            t.tableName === serviceName
        );
        if (existingTable) {
          existingTable.electroEntities = entities.map((e) => e.id);
          // If partition key was default, enrich it
          if (existingTable.partitionKey.name === "id" && pkField !== "id") {
            existingTable.partitionKey.name = pkField;
          }
          if (!existingTable.sortKey && skField) {
            existingTable.sortKey = { name: skField, type: "string" };
          }
          // Merge any unioned indexes not present in the explicit table
          const mergedIndexes = {
            ...unionedIndexes,
            ...(existingTable.indexes || {}),
          };
          if (Object.keys(mergedIndexes).length > 0) {
            existingTable.indexes = mergedIndexes;
          }
        } else {
          // Auto-synthesize table from ElectroDB entities
          const hasIndexes = Object.keys(unionedIndexes).length > 0;
          const synthesizedTable: TableIR = {
            id: `${serviceName}Table`,
            name: serviceName,
            partitionKey: { name: pkField, type: "string" },
            sortKey: skField ? { name: skField, type: "string" } : undefined,
            billingMode: "PAY_PER_REQUEST",
            indexes: hasIndexes ? unionedIndexes : undefined,
            sourceFile: firstEntity.sourceFile,
            retain: true,
            deletionPolicy: "Retain",
            electroEntities: entities.map((e) => e.id),
          };
          tables.push(synthesizedTable);
          varToTableName[`${serviceName}Table`] = serviceName;
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
      deliveryStreams,
      bindings,
      auths,
      electroEntities,
    };
  }

  private unwrapExpression(node: Node | undefined): Node | undefined {
    return unwrapExpression(node);
  }

  private extractDuration(propNode: Node | undefined): number | undefined {
    return extractDuration(propNode);
  }

  private parseDurationString(str: string): number {
    return parseDurationString(str);
  }

  private extractMemory(propNode: Node | undefined): number | undefined {
    return extractMemory(propNode);
  }

  private extractNumber(propNode: Node | undefined): number | undefined {
    return extractNumber(propNode);
  }

  private extractCors(propNode: Node | undefined): CorsConfig | boolean | undefined {
    return extractCors(propNode);
  }

  private extractString(node: Node | undefined): string | undefined {
    return extractString(node);
  }

  private extractBoolean(node: Node | undefined): boolean | undefined {
    return extractBoolean(node);
  }

  private extractStringArray(node: Node | undefined): string[] | undefined {
    return extractStringArray(node);
  }

  private extractEnvironment(node: Node | undefined): Record<string, string> | undefined {
    return extractEnvironment(node);
  }

  private extractPolicies(node: Node | undefined): PolicyStatementIR[] | undefined {
    return extractPolicies(node);
  }

  private extractContainer(node: Node | undefined): ContainerIR | undefined {
    return extractContainer(node);
  }

  private extractMutationsFromNode(
    handlerNode: Node | undefined,
    sourceFile: SourceFile,
    varToTableName: Record<string, string>,
    varToBucketName: Record<string, string>,
    varToQueueName: Record<string, string>,
    varToTopicName: Record<string, string>
  ): FunctionMutationsIR | undefined {
    return extractMutationsFromNode(
      handlerNode,
      sourceFile,
      varToTableName,
      varToBucketName,
      varToQueueName,
      varToTopicName
    );
  }

  private extractElectroEntity(
    decl: VariableDeclaration,
    sourceFile: SourceFile
  ): ElectroEntityIR | undefined {
    return extractElectroEntity(decl, sourceFile);
  }
}
