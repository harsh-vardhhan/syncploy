import type { ElectroEntityIR, ElectroIndexIR, TableIR, TableIndexIR } from "../../types";

export function enrichTablesWithElectroEntities(
  electroEntities: ElectroEntityIR[],
  tables: TableIR[],
  varToTableName: Record<string, string>
): void {
  if (electroEntities.length === 0) return;

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
