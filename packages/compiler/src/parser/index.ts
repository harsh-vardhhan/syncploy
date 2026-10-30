import { Project, SyntaxKind } from "ts-morph";
import type { ResourceGraph } from "../types";
import type { ParseContext } from "./types";
import { extractElectroEntity } from "./extractors/electrodb";
import { extractEventBinding } from "./extractors/events";
import { enrichTablesWithElectroEntities } from "./extractors/electrodb-enricher";
import {
  unwrapExpression,
  isSyncployConstruct,
  extractString,
  getSyncployConstructKind,
} from "./extractors/ast-utils";
import { ResourceGraphBuilder } from "./builder";
import { CALL_EXTRACTORS, NEW_CONSTRUCT_EXTRACTORS } from "./registry";

export * from "./types";
export * from "./builder";
export * from "./registry";
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

    const builder = new ResourceGraphBuilder();

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
        const args = init.getArguments();
        const varName = decl.getName();
        const firstArgStr = args.length > 0 ? extractString(args[0]) : undefined;
        const constructKind = getSyncployConstructKind(expr, sourceFile);

        if (constructKind === "Table" && firstArgStr) {
          context.varToTableName[varName] = firstArgStr;
        } else if (constructKind === "Bucket" && firstArgStr) {
          context.varToBucketName[varName] = firstArgStr;
        } else if (constructKind === "Queue" && firstArgStr) {
          context.varToQueueName[varName] = firstArgStr;
        } else if (constructKind === "Topic" && firstArgStr) {
          context.varToTopicName[varName] = firstArgStr;
        } else if (constructKind === "DeliveryStream" && firstArgStr) {
          context.varToDeliveryStreamName[varName] = firstArgStr;
        } else if (constructKind === "Auth" && firstArgStr) {
          context.varToAuthName[varName] = firstArgStr;
        } else {
          const className = expr.getText();
          if (className === "Entity" || className.endsWith(".Entity")) {
            const entity = extractElectroEntity(decl, sourceFile);
            if (entity) {
              builder.electroEntities.push(entity);
              context.varToEntity[varName] = entity;
              context.varToTableName[varName] = entity.tableName || entity.serviceName;
            }
          }
        }
      }
    }

    // Pass 1.5: Alias resolution (e.g. const t = myTable or const q = myQueue)
    const resourceMaps = [
      context.varToTableName,
      context.varToBucketName,
      context.varToQueueName,
      context.varToTopicName,
      context.varToDeliveryStreamName,
    ];

    let aliasAdded = true;
    while (aliasAdded) {
      aliasAdded = false;
      for (const sourceFile of this.project.getSourceFiles()) {
        for (const decl of sourceFile.getVariableDeclarations()) {
          const varName = decl.getName();
          if (resourceMaps.some((m) => m[varName])) continue;

          const init = decl.getInitializer();
          if (!init) continue;

          let targetVarName: string | undefined;
          if (init.isKind(SyntaxKind.Identifier)) {
            targetVarName = init.getText();
          } else if (init.isKind(SyntaxKind.PropertyAccessExpression)) {
            targetVarName = init.getName();
          }

          if (targetVarName) {
            for (const map of resourceMaps) {
              if (map[targetVarName]) {
                map[varName] = map[targetVarName]!;
                aliasAdded = true;
                break;
              }
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

        // 1. Detect call expressions: api(...), queue.consumer(...), etc.
        if (init.isKind(SyntaxKind.CallExpression)) {
          for (const extractor of CALL_EXTRACTORS) {
            if (extractor(decl, sourceFile, context, builder)) {
              break;
            }
          }
          continue;
        }

        // 2. Detect construct instantiations: new Table(...), new Bucket(...), etc.
        if (init.isKind(SyntaxKind.NewExpression)) {
          const expr = init.getExpression();
          const constructKind = getSyncployConstructKind(expr, sourceFile);
          if (constructKind) {
            const extractor = NEW_CONSTRUCT_EXTRACTORS[constructKind];
            if (extractor) {
              extractor(decl, sourceFile, context, builder);
            }
          }
        }
      }

      // Scan for event bindings: bucketVar.on("objectCreated", queueVar, { prefix })
      for (const statement of sourceFile.getStatements()) {
        const binding = extractEventBinding(statement, sourceFile, context, builder.buckets);
        if (binding) {
          builder.bindings.push(binding);
        }
      }
    }

    // Resolve bucket references for delivery streams if defined after
    for (const ds of builder.deliveryStreams) {
      const mapped = context.varToBucketName[ds.destinationBucketName];
      if (mapped) {
        ds.destinationBucketName = mapped;
      }
    }

    // Pass 3: ElectroDB Integration (Auto-synthesize and enrich DynamoDB tables)
    enrichTablesWithElectroEntities(builder.electroEntities, builder.tables, context.varToTableName);

    return builder.build();
  }
}
