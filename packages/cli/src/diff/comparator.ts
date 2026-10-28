import { type ResourceDiff, STATEFUL_RESOURCE_TYPES } from "./types";

export function findStatefulReplacements(diffs: ResourceDiff[]): ResourceDiff[] {
  return diffs.filter(
    (d) =>
      (d.action === "REPLACE" || d.replacement === "True") &&
      STATEFUL_RESOURCE_TYPES.has(d.type)
  );
}

export function diffTemplates(oldTpl: any, newTpl: any): ResourceDiff[] {
  const oldRes = oldTpl?.Resources || {};
  const newRes = newTpl?.Resources || {};
  const diffs: ResourceDiff[] = [];

  const allKeys = Array.from(new Set([...Object.keys(oldRes), ...Object.keys(newRes)])).sort();

  for (const key of allKeys) {
    const oldItem = oldRes[key];
    const newItem = newRes[key];

    if (!oldItem && newItem) {
      diffs.push({
        logicalId: key,
        type: newItem.Type,
        action: "CREATE",
      });
      continue;
    }

    if (oldItem && !newItem) {
      diffs.push({
        logicalId: key,
        type: oldItem.Type,
        action: "DELETE",
      });
      continue;
    }

    // Both exist: check for type mismatch or property differences
    if (oldItem.Type !== newItem.Type) {
      // SAM AWS::Serverless::Function vs AWS::Lambda::Function is a migration update
      const isSamFunctionMigration =
        (oldItem.Type === "AWS::Serverless::Function" && newItem.Type === "AWS::Lambda::Function") ||
        (oldItem.Type === "AWS::Lambda::Function" && newItem.Type === "AWS::Serverless::Function");

      if (isSamFunctionMigration) {
        diffs.push({
          logicalId: key,
          type: `${oldItem.Type} -> ${newItem.Type}`,
          action: "UPDATE",
          details: ["Migrated from Serverless macro to pure CloudFormation function"],
        });
      } else {
        diffs.push({
          logicalId: key,
          type: `${oldItem.Type} -> ${newItem.Type}`,
          action: "REPLACE",
          replacement: "True",
          details: ["Resource Type changed"],
        });
      }
      continue;
    }

    // Compare properties
    const oldProps = oldItem.Properties || {};
    const newProps = newItem.Properties || {};
    const propDiffs: string[] = [];
    let isReplacement = false;

    // Check critical replacement keys
    if (newItem.Type === "AWS::DynamoDB::Table") {
      if (oldProps.TableName && newProps.TableName && JSON.stringify(oldProps.TableName) !== JSON.stringify(newProps.TableName)) {
        isReplacement = true;
        propDiffs.push(`TableName changed (${JSON.stringify(oldProps.TableName)} -> ${JSON.stringify(newProps.TableName)})`);
      }
      if (oldProps.KeySchema && newProps.KeySchema && JSON.stringify(oldProps.KeySchema) !== JSON.stringify(newProps.KeySchema)) {
        isReplacement = true;
        propDiffs.push(`KeySchema changed`);
      }
    } else if (newItem.Type === "AWS::S3::Bucket") {
      if (oldProps.BucketName && newProps.BucketName && JSON.stringify(oldProps.BucketName) !== JSON.stringify(newProps.BucketName)) {
        isReplacement = true;
        propDiffs.push(`BucketName changed (${JSON.stringify(oldProps.BucketName)} -> ${JSON.stringify(newProps.BucketName)})`);
      }
    } else if (newItem.Type === "AWS::SQS::Queue") {
      if (oldProps.QueueName && newProps.QueueName && JSON.stringify(oldProps.QueueName) !== JSON.stringify(newProps.QueueName)) {
        isReplacement = true;
        propDiffs.push(`QueueName changed`);
      }
    }

    const allPropKeys = Array.from(new Set([...Object.keys(oldProps), ...Object.keys(newProps)]));
    for (const p of allPropKeys) {
      const vOld = oldProps[p];
      const vNew = newProps[p];
      if (vOld === undefined && vNew !== undefined) {
        propDiffs.push(`+ ${p}`);
      } else if (vOld !== undefined && vNew === undefined) {
        propDiffs.push(`- ${p}`);
      } else if (JSON.stringify(vOld) !== JSON.stringify(vNew)) {
        if (!propDiffs.some((d) => d.startsWith(`${p} changed`))) {
          propDiffs.push(`~ ${p}`);
        }
      }
    }

    if (propDiffs.length > 0) {
      diffs.push({
        logicalId: key,
        type: newItem.Type,
        action: isReplacement ? "REPLACE" : "UPDATE",
        replacement: isReplacement ? "True" : undefined,
        details: propDiffs,
      });
    } else {
      diffs.push({
        logicalId: key,
        type: newItem.Type,
        action: "IN_SYNC",
      });
    }
  }

  return diffs;
}
