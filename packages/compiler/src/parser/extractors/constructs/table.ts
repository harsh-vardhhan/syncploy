import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { TableIR, TableIndexIR } from "../../../types";
import {
  extractBoolean,
  extractString,
  extractCommentSuppressions,
} from "../ast-utils";

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
      suppressions: extractCommentSuppressions(decl),
    },
    tableName,
  };
}
