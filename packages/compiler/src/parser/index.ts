import { Project, SyntaxKind } from "ts-morph";
import type {
  ApiRouteIR,
  ResourceGraph,
  TableIR,
  TableStreamConsumerIR,
  BucketIR,
  QueueIR,
  QueueConsumerIR,
  TopicIR,
  TopicSubscriberIR,
  AlarmIR,
  DeliveryStreamIR,
  AuthIR,
  BudgetIR,
  EventBindingIR,
  ElectroEntityIR,
} from "../types";
import type { ParseContext } from "./types";
import { extractElectroEntity } from "./extractors/electrodb";
import { extractApiRoute } from "./extractors/api";
import {
  extractQueueConsumer,
  extractTableStream,
  extractTopicSubscriber,
} from "./extractors/consumers";
import {
  extractTable,
  extractBucket,
  extractQueue,
  extractTopic,
  extractAlarm,
  extractDeliveryStream,
  extractAuth,
  extractBudget,
} from "./extractors/constructs";
import { extractEventBinding } from "./extractors/events";
import { enrichTablesWithElectroEntities } from "./extractors/electrodb-enricher";
import { unwrapExpression, isSyncployConstruct, extractString } from "./extractors/ast-utils";

export * from "./types";
export * from "./extractors/ast-utils";
export * from "./extractors/mutations";
export * from "./extractors/electrodb";
export * from "./extractors/api";
export * from "./extractors/consumers";
export * from "./extractors/constructs";
export * from "./extractors/events";
export * from "./extractors/electrodb-enricher";
export * from "./tsconfig-resolver";

import { resolveTsConfigPaths } from "./tsconfig-resolver";

export class Parser {
  private project: Project;

  constructor(public readonly projectRoot: string) {
    const { paths } = resolveTsConfigPaths(projectRoot);
    this.project = new Project({
      skipAddingFilesFromTsConfig: false,
      compilerOptions: {
        baseUrl: this.projectRoot,
        paths,
        allowJs: true,
        resolveJsonModule: true,
      },
    });
  }

  public parse(): ResourceGraph {
    this.project.addSourceFilesAtPaths([
      `${this.projectRoot}/**/*.ts`,
      `!${this.projectRoot}/**/node_modules/**`,
      `!${this.projectRoot}/**/dist/**`,
      `!${this.projectRoot}/**/.syncploy/**`,
      `!${this.projectRoot}/**/*.spec.ts`,
      `!${this.projectRoot}/**/*.spec.tsx`,
      `!${this.projectRoot}/**/*.test.ts`,
      `!${this.projectRoot}/**/*.test.tsx`,
      `!${this.projectRoot}/**/__tests__/**`,
      `!${this.projectRoot}/**/.next/**`,
      `!${this.projectRoot}/**/.turbo/**`,
      `!${this.projectRoot}/**/coverage/**`,
      `!${this.projectRoot}/**/frontend/**`,
      `!${this.projectRoot}/**/scripts/test-*.ts`,
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
    const budgets: BudgetIR[] = [];

    const context: ParseContext = {
      varToTableName: {},
      varToQueueName: {},
      varToBucketName: {},
      varToTopicName: {},
      varToDeliveryStreamName: {},
      varToAuthName: {},
      varToEntity: {},
      knownApis: [],
    };

    // Pass 1: Pre-populate variable-to-resource-name mappings across all project files
    for (const sourceFile of this.project.getSourceFiles()) {
      for (const decl of sourceFile.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;

        if (init.isKind(SyntaxKind.CallExpression)) {
          const callExpr = init.getExpression();
          if (isSyncployConstruct(callExpr, "api", sourceFile)) {
            const callArgs = init.getArguments();
            const firstArg = unwrapExpression(callArgs[0]);
            let apiPath = "/";
            if (firstArg?.isKind(SyntaxKind.StringLiteral)) {
              apiPath = firstArg.getLiteralValue();
            } else if (firstArg?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const pProp = (firstArg as any).getProperty("path");
              if (pProp && pProp.isKind(SyntaxKind.PropertyAssignment)) {
                const pInit = pProp.getInitializer();
                const str = extractString(pInit);
                if (str) apiPath = str;
              }
            }
            context.knownApis.push({ id: decl.getName(), path: apiPath });
          }
          continue;
        }

        if (!init.isKind(SyntaxKind.NewExpression)) continue;
        const expr = init.getExpression();
        const className = expr.getText();
        const args = init.getArguments();
        const varName = decl.getName();
        const firstArgStr = args.length > 0 ? extractString(args[0]) : undefined;

        if (isSyncployConstruct(expr, "Table", sourceFile) && firstArgStr) {
          context.varToTableName[varName] = firstArgStr;
        } else if (isSyncployConstruct(expr, "Bucket", sourceFile) && firstArgStr) {
          context.varToBucketName[varName] = firstArgStr;
        } else if (isSyncployConstruct(expr, "Queue", sourceFile) && firstArgStr) {
          context.varToQueueName[varName] = firstArgStr;
        } else if (isSyncployConstruct(expr, "Topic", sourceFile) && firstArgStr) {
          context.varToTopicName[varName] = firstArgStr;
        } else if (isSyncployConstruct(expr, "DeliveryStream", sourceFile) && firstArgStr) {
          context.varToDeliveryStreamName[varName] = firstArgStr;
        } else if (isSyncployConstruct(expr, "Auth", sourceFile) && firstArgStr) {
          context.varToAuthName[varName] = firstArgStr;
        } else if (className === "Entity" || className.endsWith(".Entity")) {
          const entity = extractElectroEntity(decl, sourceFile);
          if (entity) {
            electroEntities.push(entity);
            context.varToEntity[varName] = entity;
            context.varToTableName[varName] = entity.tableName || entity.serviceName;
          }
        }
      }
    }

    // Pass 1.5: Alias resolution (e.g. const t = myTable or const q = myQueue)
    let aliasAdded = true;
    while (aliasAdded) {
      aliasAdded = false;
      for (const sourceFile of this.project.getSourceFiles()) {
        for (const decl of sourceFile.getVariableDeclarations()) {
          const varName = decl.getName();
          if (
            context.varToTableName[varName] ||
            context.varToBucketName[varName] ||
            context.varToQueueName[varName] ||
            context.varToTopicName[varName] ||
            context.varToDeliveryStreamName[varName]
          ) {
            continue;
          }

          const init = decl.getInitializer();
          if (!init) continue;

          let targetVarName: string | undefined;
          if (init.isKind(SyntaxKind.Identifier)) {
            targetVarName = init.getText();
          } else if (init.isKind(SyntaxKind.PropertyAccessExpression)) {
            targetVarName = init.getName();
          }

          if (targetVarName) {
            if (context.varToTableName[targetVarName]) {
              context.varToTableName[varName] = context.varToTableName[targetVarName]!;
              aliasAdded = true;
            } else if (context.varToBucketName[targetVarName]) {
              context.varToBucketName[varName] = context.varToBucketName[targetVarName]!;
              aliasAdded = true;
            } else if (context.varToQueueName[targetVarName]) {
              context.varToQueueName[varName] = context.varToQueueName[targetVarName]!;
              aliasAdded = true;
            } else if (context.varToTopicName[targetVarName]) {
              context.varToTopicName[varName] = context.varToTopicName[targetVarName]!;
              aliasAdded = true;
            } else if (context.varToDeliveryStreamName[targetVarName]) {
              context.varToDeliveryStreamName[varName] = context.varToDeliveryStreamName[targetVarName]!;
              aliasAdded = true;
            }
          }
        }
      }
    }

    // Pass 2: Extract APIs, Consumers, Constructs, and Event Bindings
    for (const sourceFile of this.project.getSourceFiles()) {
      for (const decl of sourceFile.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;

        // 1. Detect api(...) and consumer declarations
        if (init.isKind(SyntaxKind.CallExpression)) {
          const apiRoute = extractApiRoute(decl, sourceFile, context);
          if (apiRoute) {
            apis.push(apiRoute);
            continue;
          }

          const queueConsumer = extractQueueConsumer(decl, sourceFile, context);
          if (queueConsumer) {
            consumers.push(queueConsumer);
            continue;
          }

          const tableStream = extractTableStream(decl, sourceFile, context);
          if (tableStream) {
            tableStreams.push(tableStream);
            continue;
          }

          const topicSubscriber = extractTopicSubscriber(decl, sourceFile, context);
          if (topicSubscriber) {
            topicSubscribers.push(topicSubscriber);
            continue;
          }
        }

        // 2. Detect new Table(...), new Bucket(...), etc.
        if (init.isKind(SyntaxKind.NewExpression)) {
          const tableResult = extractTable(decl, sourceFile);
          if (tableResult) {
            tables.push(tableResult.table);
            context.varToTableName[decl.getName()] = tableResult.tableName;
            continue;
          }

          const bucketResult = extractBucket(decl, sourceFile);
          if (bucketResult) {
            buckets.push(bucketResult.bucket);
            context.varToBucketName[decl.getName()] = bucketResult.bucketName;
            continue;
          }

          const queueResult = extractQueue(decl, sourceFile);
          if (queueResult) {
            queues.push(queueResult.queue);
            context.varToQueueName[decl.getName()] = queueResult.queueName;
            continue;
          }

          const topicResult = extractTopic(decl, sourceFile, context);
          if (topicResult) {
            topics.push(topicResult.topic);
            context.varToTopicName[decl.getName()] = topicResult.topicName;
            continue;
          }

          const alarm = extractAlarm(decl, sourceFile, context);
          if (alarm) {
            alarms.push(alarm);
            continue;
          }

          const dsResult = extractDeliveryStream(decl, sourceFile, context);
          if (dsResult) {
            deliveryStreams.push(dsResult.deliveryStream);
            context.varToDeliveryStreamName[decl.getName()] = dsResult.streamName;
            continue;
          }

          const authResult = extractAuth(decl, sourceFile);
          if (authResult) {
            auths.push(authResult.auth);
            context.varToAuthName[decl.getName()] = authResult.authName;
            continue;
          }

          const budgetResult = extractBudget(decl, sourceFile, context);
          if (budgetResult) {
            budgets.push(budgetResult);
            continue;
          }
        }
      }

      // Scan for event bindings: bucketVar.on("objectCreated", queueVar, { prefix })
      for (const statement of sourceFile.getStatements()) {
        const binding = extractEventBinding(statement, sourceFile, context, buckets);
        if (binding) {
          bindings.push(binding);
        }
      }
    }

    // Resolve bucket references for delivery streams if defined after
    for (const ds of deliveryStreams) {
      const mapped = context.varToBucketName[ds.destinationBucketName];
      if (mapped) {
        ds.destinationBucketName = mapped;
      }
    }

    // Pass 3: ElectroDB Integration (Auto-synthesize and enrich DynamoDB tables)
    enrichTablesWithElectroEntities(electroEntities, tables, context.varToTableName);

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
      budgets,
      budget: budgets[0],
    };
  }
}
