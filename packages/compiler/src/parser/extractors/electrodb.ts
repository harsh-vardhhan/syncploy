import {
  VariableDeclaration,
  SourceFile,
  SyntaxKind,
  NewExpression,
  ObjectLiteralExpression,
} from "ts-morph";
import type { ElectroEntityIR, ElectroIndexIR } from "../../types";
import { extractString, getNodeLocation } from "./ast-utils";

export function extractElectroEntity(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): ElectroEntityIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;

  const newExpr = init as NewExpression;
  const args = newExpr.getArguments();
  if (args.length === 0) return undefined;

  let schemaObj: ObjectLiteralExpression | undefined;
  const firstArg = args[0]!;
  if (firstArg.isKind(SyntaxKind.ObjectLiteralExpression)) {
    schemaObj = firstArg as ObjectLiteralExpression;
  } else if (firstArg.isKind(SyntaxKind.Identifier)) {
    const identName = firstArg.getText();
    const varDecl = sourceFile.getVariableDeclaration(identName);
    const varInit = varDecl?.getInitializer();
    if (varInit && varInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
      schemaObj = varInit as ObjectLiteralExpression;
    }
  }

  if (!schemaObj) return undefined;

  // 1. Extract model
  const modelProp = schemaObj.getProperty("model");
  let entityName = decl.getName();
  let serviceName = "default";
  let version: string | undefined;

  if (modelProp && modelProp.isKind(SyntaxKind.PropertyAssignment)) {
    const modelInit = modelProp.getInitializer();
    if (modelInit && modelInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const mObj = modelInit as ObjectLiteralExpression;
      entityName = extractString(mObj.getProperty("entity")) || entityName;
      serviceName = extractString(mObj.getProperty("service")) || serviceName;
      version = extractString(mObj.getProperty("version"));
    }
  }

  // 2. Extract attributes
  const attributes: Record<string, string> = {};
  const attrProp = schemaObj.getProperty("attributes");
  if (attrProp && attrProp.isKind(SyntaxKind.PropertyAssignment)) {
    const attrInit = attrProp.getInitializer();
    if (attrInit && attrInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
      for (const p of attrInit.getProperties()) {
        if (p.isKind(SyntaxKind.PropertyAssignment)) {
          const propName = p.getName();
          const pVal = p.getInitializer();
          let attrType = "string";
          if (pVal && pVal.isKind(SyntaxKind.ObjectLiteralExpression)) {
            const tProp = pVal.getProperty("type");
            if (tProp && tProp.isKind(SyntaxKind.PropertyAssignment)) {
              const tInit = tProp.getInitializer();
              if (tInit && tInit.isKind(SyntaxKind.StringLiteral)) {
                attrType = tInit.getLiteralValue();
              } else if (tInit && tInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
                attrType = "string";
              }
            }
          } else if (pVal && pVal.isKind(SyntaxKind.StringLiteral)) {
            attrType = pVal.getLiteralValue();
          }
          attributes[propName] = attrType;
        }
      }
    }
  }

  // 3. Extract indexes
  let primaryIndex: ElectroIndexIR = {
    name: "primary",
    pkField: "PK",
    skField: "SK",
    isPrimary: true,
    projection: "ALL",
  };
  const secondaryIndexes: Record<string, ElectroIndexIR> = {};

  const indexesProp = schemaObj.getProperty("indexes");
  if (indexesProp && indexesProp.isKind(SyntaxKind.PropertyAssignment)) {
    const indexesInit = indexesProp.getInitializer();
    if (indexesInit && indexesInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
      for (const p of indexesInit.getProperties()) {
        if (!p.isKind(SyntaxKind.PropertyAssignment)) continue;
        const idxPropName = p.getName();
        const idxVal = p.getInitializer();
        if (!idxVal || !idxVal.isKind(SyntaxKind.ObjectLiteralExpression)) continue;

        const idxObj = idxVal as ObjectLiteralExpression;
        const explicitIndexName = extractString(idxObj.getProperty("index"));
        const isPrimary = idxPropName === "primary" || (!explicitIndexName && idxPropName === "primary");

        // Extract pk field
        let pkField = "PK";
        const pkProp = idxObj.getProperty("pk");
        if (pkProp && pkProp.isKind(SyntaxKind.PropertyAssignment)) {
          const pkValObj = pkProp.getInitializer();
          if (pkValObj && pkValObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
            pkField = extractString(pkValObj.getProperty("field")) || "";
            if (!pkField) {
              const compProp = pkValObj.getProperty("composite");
              if (compProp && compProp.isKind(SyntaxKind.PropertyAssignment)) {
                const compInit = compProp.getInitializer();
                if (compInit && compInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  const firstEl = compInit.getElements()[0];
                  if (firstEl && firstEl.isKind(SyntaxKind.StringLiteral)) {
                    pkField = firstEl.getLiteralValue();
                  }
                }
              }
            }
            if (!pkField) pkField = "PK";
          }
        }

        // Extract sk field
        let skField: string | undefined;
        const skProp = idxObj.getProperty("sk");
        if (skProp && skProp.isKind(SyntaxKind.PropertyAssignment)) {
          const skValObj = skProp.getInitializer();
          if (skValObj && skValObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
            skField = extractString(skValObj.getProperty("field")) || "";
            if (!skField) {
              const compProp = skValObj.getProperty("composite");
              if (compProp && compProp.isKind(SyntaxKind.PropertyAssignment)) {
                const compInit = compProp.getInitializer();
                if (compInit && compInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
                  const firstEl = compInit.getElements()[0];
                  if (firstEl && firstEl.isKind(SyntaxKind.StringLiteral)) {
                    skField = firstEl.getLiteralValue();
                  }
                }
              }
            }
            if (!skField) skField = undefined;
          }
        }

        // Extract projection
        let projection: "ALL" | "KEYS_ONLY" | undefined = "ALL";
        const projProp = idxObj.getProperty("project") || idxObj.getProperty("projection");
        if (projProp && projProp.isKind(SyntaxKind.PropertyAssignment)) {
          const projVal = extractString(projProp);
          if (projVal && (projVal.toUpperCase() === "KEYS_ONLY" || projVal.toLowerCase() === "keys")) {
            projection = "KEYS_ONLY";
          }
        }

        const parsedIndex: ElectroIndexIR = {
          name: explicitIndexName || idxPropName,
          pkField,
          skField: skField || undefined,
          isPrimary,
          projection,
        };

        if (isPrimary) {
          primaryIndex = parsedIndex;
        } else {
          secondaryIndexes[parsedIndex.name] = parsedIndex;
        }
      }
    }
  }

  // 4. Extract table name if present as string literal in options (args[1])
  let tableName: string | undefined;
  if (args.length > 1 && args[1] && args[1].isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    const tblProp = opts.getProperty("table");
    if (tblProp && tblProp.isKind(SyntaxKind.PropertyAssignment)) {
      const tblInit = tblProp.getInitializer();
      if (tblInit && tblInit.isKind(SyntaxKind.StringLiteral)) {
        tableName = tblInit.getLiteralValue();
      }
    }
  }

  const { line, column } = getNodeLocation(decl, sourceFile);

  return {
    id: decl.getName(),
    entityName,
    serviceName,
    version: version || undefined,
    sourceFile: sourceFile.getFilePath(),
    line,
    column,
    primaryIndex,
    secondaryIndexes,
    attributes,
    tableName: tableName || undefined,
  };
}
