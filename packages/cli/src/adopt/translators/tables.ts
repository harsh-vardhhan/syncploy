import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateTables(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const tableDefs: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::DynamoDB::Table") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Table");

      const attrMap = new Map<string, string>();
      for (const attr of props.AttributeDefinitions || []) {
        attrMap.set(attr.AttributeName, attr.AttributeType);
      }

      let pkDef = `{ name: "id", type: "string" }`;
      let skDef: string | undefined;

      for (const k of props.KeySchema || []) {
        const typeChar = attrMap.get(k.AttributeName) || "S";
        const typeStr = typeChar === "N" ? "number" : typeChar === "B" ? "binary" : "string";
        if (k.KeyType === "HASH") {
          pkDef = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
        } else if (k.KeyType === "RANGE") {
          skDef = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
        }
      }

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Table(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const tableNameVal = resolveValueExpr(props.TableName, params, templateParams);
      if (tableNameVal) {
        lines.push(`  tableName: ${tableNameVal},`);
      }

      lines.push(`  partitionKey: ${pkDef},`);
      if (skDef) {
        lines.push(`  sortKey: ${skDef},`);
      }

      if (props.BillingMode) {
        lines.push(`  billingMode: ${JSON.stringify(props.BillingMode)},`);
      } else {
        lines.push(`  billingMode: "PAY_PER_REQUEST",`);
      }

      if (props.StreamSpecification?.StreamViewType) {
        lines.push(`  stream: ${JSON.stringify(props.StreamSpecification.StreamViewType)},`);
      }

      if (props.PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled) {
        lines.push(`  pointInTimeRecovery: true,`);
      }

      if (props.GlobalSecondaryIndexes && props.GlobalSecondaryIndexes.length > 0) {
        lines.push(`  indexes: {`);
        for (const gsi of props.GlobalSecondaryIndexes) {
          const indexName = gsi.IndexName;
          let gsiPk = "";
          let gsiSk = "";
          for (const k of gsi.KeySchema || []) {
            const typeChar = attrMap.get(k.AttributeName) || "S";
            const typeStr = typeChar === "N" ? "number" : typeChar === "B" ? "binary" : "string";
            if (k.KeyType === "HASH") {
              gsiPk = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
            } else if (k.KeyType === "RANGE") {
              gsiSk = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
            }
          }
          const proj = gsi.Projection?.ProjectionType || "ALL";
          lines.push(`    ${JSON.stringify(indexName)}: {`);
          lines.push(`      partitionKey: ${gsiPk},`);
          if (gsiSk) {
            lines.push(`      sortKey: ${gsiSk},`);
          }
          lines.push(`      projection: ${JSON.stringify(proj)},`);
          lines.push(`    },`);
        }
        lines.push(`  },`);
      }

      lines.push(`});`);
      tableDefs.push(lines.join("\n"));
    }
  }

  const code = tableDefs.length > 0 ? "// --- DynamoDB Tables ---\n" + tableDefs.join("\n\n") : "";
  return { code, adopted };
}
