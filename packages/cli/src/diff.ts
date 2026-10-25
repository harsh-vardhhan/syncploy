import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import YAML from "yaml";
import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DescribeChangeSetCommand,
  DeleteChangeSetCommand,
} from "@aws-sdk/client-cloudformation";
import { Compiler } from "@syncploy/compiler";

export interface DiffOptions {
  projectRoot: string;
  against?: string | undefined;
  stackName?: string | undefined;
  region?: string | undefined;
}

export interface ResourceDiff {
  logicalId: string;
  type: string;
  action: "CREATE" | "UPDATE" | "REPLACE" | "DELETE" | "IN_SYNC";
  details?: string[] | undefined;
  replacement?: "True" | "False" | "Conditional" | undefined;
}

const CF_SCALAR_TAGS = [
  "Ref",
  "Sub",
  "GetAtt",
  "Base64",
  "GetAZs",
  "ImportValue",
].map((name) => ({
  tag: "!" + name,
  resolve: (value: any) =>
    name === "Ref" ? { Ref: value } : { ["Fn::" + name]: value },
}));

const CF_SEQ_TAGS = [
  "Equals",
  "If",
  "Join",
  "Select",
  "Split",
  "FindInMap",
  "And",
  "Or",
  "Not",
].map((name) => ({
  tag: "!" + name,
  collection: "seq" as const,
  resolve: (value: any) => ({
    ["Fn::" + name]: value && typeof value.toJSON === "function" ? value.toJSON() : value,
  }),
}));

export function loadTemplate(filePath: string): any {
  const content = fs.readFileSync(filePath, "utf-8");
  if (filePath.endsWith(".json")) {
    return JSON.parse(content);
  }
  return YAML.parse(content, { customTags: [...CF_SCALAR_TAGS, ...CF_SEQ_TAGS] });
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

export async function diffAgainstCloudFormation(
  stackName: string,
  templateJson: string,
  region?: string
): Promise<ResourceDiff[]> {
  const client = new CloudFormationClient({ region: region || process.env.AWS_REGION || "us-east-1" });
  const changeSetName = `syncploy-diff-${Date.now()}`;

  try {
    await client.send(
      new CreateChangeSetCommand({
        StackName: stackName,
        ChangeSetName: changeSetName,
        TemplateBody: templateJson,
        Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
        ChangeSetType: "UPDATE",
        Description: "Syncploy pre-flight diff inspection",
      })
    );
  } catch (err: any) {
    if (err.name === "ValidationError" && err.message?.includes("does not exist")) {
      // Stack doesn't exist yet, try CREATE ChangeSet
      await client.send(
        new CreateChangeSetCommand({
          StackName: stackName,
          ChangeSetName: changeSetName,
          TemplateBody: templateJson,
          Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
          ChangeSetType: "CREATE",
          Description: "Syncploy initial stack creation preview",
        })
      );
    } else {
      throw err;
    }
  }

  let status = "CREATE_IN_PROGRESS";
  let describeRes: any;
  const pollStart = Date.now();

  while (status === "CREATE_IN_PROGRESS" || status === "CREATE_PENDING") {
    if (Date.now() - pollStart > 60000) {
      throw new Error("Timed out waiting for CloudFormation ChangeSet creation");
    }
    await new Promise((r) => setTimeout(r, 1500));
    describeRes = await client.send(
      new DescribeChangeSetCommand({
        StackName: stackName,
        ChangeSetName: changeSetName,
      })
    );
    status = describeRes.Status || "FAILED";
  }

  const diffs: ResourceDiff[] = [];

  try {
    if (status === "FAILED") {
      const reason = describeRes?.StatusReason || "";
      if (
        reason.includes("The submitted information didn't contain changes") ||
        reason.includes("No updates are to be performed")
      ) {
        return [];
      }
      throw new Error(`ChangeSet creation failed: ${reason}`);
    }

    const changes = describeRes?.Changes || [];
    for (const change of changes) {
      const rc = change.ResourceChange;
      if (!rc) continue;

      let action: ResourceDiff["action"] = "UPDATE";
      if (rc.Action === "Add") action = "CREATE";
      else if (rc.Action === "Remove") action = "DELETE";
      else if (rc.Action === "Modify") {
        action = rc.Replacement === "True" ? "REPLACE" : "UPDATE";
      }

      const details = (rc.Details || []).map((d: any) => {
        const target = d.Target?.Attribute || d.Target?.Name || "Property";
        return `${d.Target?.Attribute ? "Attribute" : "Property"} ${target} (${d.Evaluation || "Static"})`;
      });

      diffs.push({
        logicalId: rc.LogicalResourceId || "Unknown",
        type: rc.ResourceType || "Unknown",
        action,
        replacement: rc.Replacement,
        details: details.length > 0 ? details : undefined,
      });
    }
  } finally {
    // Always clean up the temporary change set
    try {
      await client.send(
        new DeleteChangeSetCommand({
          StackName: stackName,
          ChangeSetName: changeSetName,
        })
      );
    } catch {}
  }

  return diffs;
}

export function printDiffTable(diffs: ResourceDiff[]): void {
  const creates = diffs.filter((d) => d.action === "CREATE");
  const updates = diffs.filter((d) => d.action === "UPDATE");
  const replaces = diffs.filter((d) => d.action === "REPLACE");
  const deletes = diffs.filter((d) => d.action === "DELETE");
  const inSync = diffs.filter((d) => d.action === "IN_SYNC");

  if (creates.length === 0 && updates.length === 0 && replaces.length === 0 && deletes.length === 0) {
    console.log(pc.green("\n✔ All infrastructure is in sync. No changes detected."));
    return;
  }

  console.log(pc.bold("\nInfrastructure Diff Preview:\n"));

  for (const d of diffs) {
    if (d.action === "IN_SYNC") continue;

    let badge = "";
    if (d.action === "CREATE") {
      badge = pc.green("+ [CREATE]");
    } else if (d.action === "UPDATE") {
      badge = pc.cyan("~ [UPDATE]");
    } else if (d.action === "REPLACE") {
      badge = pc.red(pc.bold("! [REPLACE]"));
    } else if (d.action === "DELETE") {
      badge = pc.red("- [DELETE]");
    }

    console.log(`  ${badge} ${pc.bold(d.logicalId)} ${pc.dim(`(${d.type})`)}`);
    if (d.replacement === "True") {
      console.log(pc.red(`      ⚠ DANGER: Resource will be DESTROYED and RECREATED!`));
    }
    if (d.details && d.details.length > 0) {
      for (const det of d.details.slice(0, 5)) {
        console.log(pc.dim(`      • ${det}`));
      }
      if (d.details.length > 5) {
        console.log(pc.dim(`      • ... and ${d.details.length - 5} more differences`));
      }
    }
  }

  console.log(pc.bold("\nDiff Summary:"));
  console.log(
    `  ${pc.green(`+ ${creates.length} to create`)} | ` +
      `${pc.cyan(`~ ${updates.length} to update`)} | ` +
      `${replaces.length > 0 ? pc.red(pc.bold(`! ${replaces.length} to replace`)) : pc.dim(`! 0 to replace`)} | ` +
      `${deletes.length > 0 ? pc.red(`- ${deletes.length} to delete`) : pc.dim(`- 0 to delete`)} | ` +
      `${pc.dim(`${inSync.length} unchanged`)}`
  );
}

export async function runDiff(options: DiffOptions): Promise<ResourceDiff[]> {
  const projectRoot = options.projectRoot;
  const compiler = new Compiler(projectRoot);

  console.log(pc.cyan(`⚡ Compiling project at ${pc.bold(projectRoot)}...`));
  const buildOutput = await compiler.build();
  const synthesizedTemplate = JSON.parse(fs.readFileSync(buildOutput.templatePath, "utf-8"));

  if (options.stackName) {
    console.log(pc.cyan(`\n☁ Querying AWS CloudFormation ChangeSet for stack ${pc.bold(options.stackName)}...`));
    const diffs = await diffAgainstCloudFormation(
      options.stackName,
      JSON.stringify(synthesizedTemplate),
      options.region
    );
    printDiffTable(diffs);
    return diffs;
  }

  // File-based diff: check specified path or auto-detect
  let againstFile = options.against;
  if (!againstFile) {
    const candidateFiles = [
      "template.yaml",
      "template.yml",
      "template.json",
      path.join(".syncploy", "template.json.prev"),
    ];
    for (const c of candidateFiles) {
      const fullPath = path.resolve(projectRoot, c);
      if (fs.existsSync(fullPath)) {
        againstFile = fullPath;
        break;
      }
    }
  }

  if (!againstFile || !fs.existsSync(againstFile)) {
    console.log(
      pc.yellow(
        `\n⚠ No existing template found to diff against. Specify --against <path> or --stack-name <name>.`
      )
    );
    console.log(pc.dim(`Synthesized template: ${buildOutput.templatePath}`));
    return [];
  }

  console.log(pc.cyan(`\n🔍 Comparing synthesized template against ${pc.bold(path.relative(projectRoot, againstFile))}...`));
  const oldTemplate = loadTemplate(againstFile);
  const diffs = diffTemplates(oldTemplate, synthesizedTemplate);
  printDiffTable(diffs);
  return diffs;
}
