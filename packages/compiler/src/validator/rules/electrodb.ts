import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";

export function validateElectroDb(ctx: ValidationContext, graph: ResourceGraph): void {
  const entities = graph.electroEntities || [];
  if (entities.length === 0) return;

  // Group entities by serviceName
  const entitiesByService: Record<string, typeof entities> = {};
  for (const entity of entities) {
    if (!entitiesByService[entity.serviceName]) {
      entitiesByService[entity.serviceName] = [];
    }
    entitiesByService[entity.serviceName]!.push(entity);
  }

  for (const [serviceName, serviceEntities] of Object.entries(entitiesByService)) {
    // 1. Check for duplicate entity names within the same service
    const seenEntityNames = new Map<string, string>(); // entityName -> id
    for (const entity of serviceEntities) {
      const existing = seenEntityNames.get(entity.entityName);
      if (existing) {
        ctx.addError(
          "ERR_ELECTRO_DUPLICATE_ENTITY",
          entity.id,
          `ElectroDB entity '${entity.id}' defines entity '${entity.entityName}' which collides with '${existing}' in service '${serviceName}'.`,
          entity.sourceFile
        );
      } else {
        seenEntityNames.set(entity.entityName, entity.id);
      }
    }

    // 2. Check primary key consistency across entities in the same service
    const firstEntity = serviceEntities[0]!;
    const expectedPkField = firstEntity.primaryIndex.pkField;
    const expectedSkField = firstEntity.primaryIndex.skField;

    for (let i = 1; i < serviceEntities.length; i++) {
      const ent = serviceEntities[i]!;
      if (ent.primaryIndex.pkField !== expectedPkField) {
        ctx.addError(
          "ERR_ELECTRO_KEY_MISMATCH",
          ent.id,
          `ElectroDB entity '${ent.id}' primary key field '${ent.primaryIndex.pkField}' does not match service '${serviceName}' primary key field '${expectedPkField}' (defined in '${firstEntity.id}'). In single-table design, all entities in service '${serviceName}' must share the same partition key field.`,
          ent.sourceFile
        );
      }

      // If both define sort keys, they must match
      if (ent.primaryIndex.skField && expectedSkField && ent.primaryIndex.skField !== expectedSkField) {
        ctx.addError(
          "ERR_ELECTRO_KEY_MISMATCH",
          ent.id,
          `ElectroDB entity '${ent.id}' sort key field '${ent.primaryIndex.skField}' does not match service '${serviceName}' sort key field '${expectedSkField}' (defined in '${firstEntity.id}'). In single-table design, all entities in service '${serviceName}' with sort keys must share the same sort key field.`,
          ent.sourceFile
        );
      }
    }

    // 3. Check secondary index (GSI) consistency across entities in the same service
    const seenIndexes = new Map<string, { pkField: string; skField?: string | undefined; entityId: string }>();
    for (const entity of serviceEntities) {
      for (const secIdx of Object.values(entity.secondaryIndexes)) {
        const existing = seenIndexes.get(secIdx.name);
        if (existing) {
          if (existing.pkField !== secIdx.pkField || existing.skField !== secIdx.skField) {
            ctx.addError(
              "ERR_ELECTRO_GSI_MISMATCH",
              entity.id,
              `ElectroDB entity '${entity.id}' secondary index '${secIdx.name}' (PK: '${secIdx.pkField}', SK: '${secIdx.skField || "none"}') conflicts with definition in '${existing.entityId}' (PK: '${existing.pkField}', SK: '${existing.skField || "none"}'). All entities sharing GSI '${secIdx.name}' must have matching key fields.`,
              entity.sourceFile
            );
          }
        } else {
          seenIndexes.set(secIdx.name, {
            pkField: secIdx.pkField,
            skField: secIdx.skField,
            entityId: entity.id,
          });
        }
      }
    }

    // 4. Check consistency with explicit Table if present
    const explicitTable = graph.tables.find(
      (t) =>
        t.name === serviceName ||
        (firstEntity.tableName && (t.name === firstEntity.tableName || t.tableName === firstEntity.tableName)) ||
        t.tableName === serviceName
    );

    if (explicitTable) {
      if (explicitTable.partitionKey.name !== expectedPkField) {
        ctx.addError(
          "ERR_ELECTRO_TABLE_KEY_MISMATCH",
          explicitTable.id,
          `Table '${explicitTable.name}' partition key '${explicitTable.partitionKey.name}' does not match ElectroDB entities in service '${serviceName}' which use partition key '${expectedPkField}'.`,
          explicitTable.sourceFile
        );
      }

      if (expectedSkField && explicitTable.sortKey && explicitTable.sortKey.name !== expectedSkField) {
        ctx.addError(
          "ERR_ELECTRO_TABLE_KEY_MISMATCH",
          explicitTable.id,
          `Table '${explicitTable.name}' sort key '${explicitTable.sortKey.name}' does not match ElectroDB entities in service '${serviceName}' which use sort key '${expectedSkField}'.`,
          explicitTable.sourceFile
        );
      }

      if (explicitTable.indexes) {
        for (const [idxName, tableIdx] of Object.entries(explicitTable.indexes)) {
          const electroIdx = seenIndexes.get(idxName);
          if (electroIdx) {
            if (
              tableIdx.partitionKey !== electroIdx.pkField ||
              (tableIdx.sortKey && tableIdx.sortKey !== electroIdx.skField)
            ) {
              ctx.addError(
                "ERR_ELECTRO_GSI_MISMATCH",
                explicitTable.id,
                `Table '${explicitTable.name}' index '${idxName}' keys (PK: '${tableIdx.partitionKey}', SK: '${tableIdx.sortKey || "none"}') do not match ElectroDB index definition in '${electroIdx.entityId}' (PK: '${electroIdx.pkField}', SK: '${electroIdx.skField || "none"}').`,
                explicitTable.sourceFile
              );
            }
          }
        }
      }
    }
  }
}
