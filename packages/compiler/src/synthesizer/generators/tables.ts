import type { ResourceGraph } from "../../types";
import {
  getTableLogicalId,
  toDdbType,
  resolvePhysicalName,
  sanitizeName,
} from "../logical-ids";

export function generateTables(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  for (const table of graph.tables) {
    const resourceKey = getTableLogicalId(table);
    const attrMap = new Map<string, string>();
    attrMap.set(table.partitionKey.name, toDdbType(table.partitionKey.type));

    const keySchema: any[] = [
      {
        AttributeName: table.partitionKey.name,
        KeyType: "HASH",
      },
    ];

    if (table.sortKey) {
      attrMap.set(table.sortKey.name, toDdbType(table.sortKey.type));
      keySchema.push({
        AttributeName: table.sortKey.name,
        KeyType: "RANGE",
      });
    }

    // GSIs
    const gsiList: any[] = [];
    if (table.indexes) {
      for (const [idxName, idx] of Object.entries(table.indexes)) {
        if (!attrMap.has(idx.partitionKey)) {
          attrMap.set(idx.partitionKey, "S");
        }
        const gsiKeySchema: any[] = [
          { AttributeName: idx.partitionKey, KeyType: "HASH" },
        ];
        if (idx.sortKey) {
          if (!attrMap.has(idx.sortKey)) {
            attrMap.set(idx.sortKey, "S");
          }
          gsiKeySchema.push({ AttributeName: idx.sortKey, KeyType: "RANGE" });
        }

        gsiList.push({
          IndexName: idxName,
          KeySchema: gsiKeySchema,
          Projection: { ProjectionType: idx.projection ?? "ALL" },
        });
      }
    }

    const attributeDefinitions = Array.from(attrMap.entries()).map(([name, type]) => ({
      AttributeName: name,
      AttributeType: type,
    }));

    const tableProps: any = {
      TableName: resolvePhysicalName(table.tableName, { "Fn::Sub": `\${AWS::StackName}-${table.name}` }),
      BillingMode: table.billingMode ?? "PAY_PER_REQUEST",
      AttributeDefinitions: attributeDefinitions,
      KeySchema: keySchema,
    };

    if (gsiList.length > 0) {
      tableProps["GlobalSecondaryIndexes"] = gsiList;
    }

    const hasStreamConsumer = (graph.tableStreams || []).some(
      (s) => sanitizeName(s.tableName) === sanitizeName(table.name)
    );
    if (table.stream || hasStreamConsumer) {
      tableProps["StreamSpecification"] = { StreamViewType: table.stream || "NEW_IMAGE" };
    }

    if (table.pointInTimeRecovery) {
      tableProps["PointInTimeRecoverySpecification"] = {
        PointInTimeRecoveryEnabled: true,
      };
    }

    const tableDeletionPolicy =
      table.deletionPolicy || (table.retain === false ? "Delete" : "Retain");
    const tableUpdateReplacePolicy =
      table.deletionPolicy || (table.retain === false ? "Delete" : "Retain");

    resources[resourceKey] = {
      Type: "AWS::DynamoDB::Table",
      DeletionPolicy: tableDeletionPolicy,
      UpdateReplacePolicy: tableUpdateReplacePolicy,
      Properties: tableProps,
    };
  }
}
