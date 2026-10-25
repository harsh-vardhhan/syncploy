import { Project, SyntaxKind, type ObjectLiteralExpression } from "ts-morph";
import type { ApiRouteIR, HttpMethod, ResourceGraph, TableIR, BucketIR, QueueIR } from "./types";

export class Parser {
  private project: Project;

  constructor(public readonly projectRoot: string) {
    this.project = new Project({
      skipAddingFilesFromTsConfig: false,
    });
  }

  public parse(): ResourceGraph {
    // Add all ts files in project root, excluding dist, node_modules, .syncploy
    this.project.addSourceFilesAtPaths([
      `${this.projectRoot}/**/*.ts`,
      `!${this.projectRoot}/**/node_modules/**`,
      `!${this.projectRoot}/**/dist/**`,
      `!${this.projectRoot}/**/.syncploy/**`,
    ]);

    const apis: ApiRouteIR[] = [];
    const tables: TableIR[] = [];
    const buckets: BucketIR[] = [];
    const queues: QueueIR[] = [];

    for (const sourceFile of this.project.getSourceFiles()) {
      for (const decl of sourceFile.getVariableDeclarations()) {
        const init = decl.getInitializer();
        if (!init) continue;

        const varName = decl.getName();
        const isExported = decl.isExported();

        // 1. Detect api(...) declarations
        if (init.isKind(SyntaxKind.CallExpression)) {
          const expr = init.getExpression();
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

            apis.push({
              id: varName,
              exportName: varName,
              sourceFile: sourceFile.getFilePath(),
              method: methodValue,
              path: pathValue,
              auth: authValue,
            });
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

            // Default PK
            let partitionKey = { name: "id", type: "string" as const };
            let sortKey: { name: string; type: "string" | "number" | "binary" } | undefined;

            if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
              const optionsObj = args[1] as ObjectLiteralExpression;
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
            }

            tables.push({
              id: varName,
              name: tableName,
              partitionKey,
              sortKey,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Bucket") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Bucket '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const bucketName = args[0].getLiteralValue();
            buckets.push({
              id: varName,
              name: bucketName,
              sourceFile: sourceFile.getFilePath(),
            });
          } else if (className === "Queue") {
            if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
              throw new Error(
                `Queue '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
              );
            }
            const queueName = args[0].getLiteralValue();
            queues.push({
              id: varName,
              name: queueName,
              sourceFile: sourceFile.getFilePath(),
            });
          }
        }
      }
    }

    return {
      apis,
      tables,
      buckets,
      queues,
    };
  }
}
