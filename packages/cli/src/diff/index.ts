import * as fs from "node:fs";
import * as path from "node:path";
import pc from "picocolors";
import { Compiler } from "@syncploy/compiler";
import type { DiffOptions, ResourceDiff } from "./types";
import { findStatefulReplacements, diffTemplates } from "./comparator";
import { diffAgainstCloudFormation } from "./changeset";
import { printDiffTable } from "./formatter";
import { loadTemplate } from "./template";

export * from "./types";
export * from "./template";
export * from "./comparator";
export * from "./changeset";
export * from "./formatter";

export async function runDiff(options: DiffOptions): Promise<ResourceDiff[]> {
  const projectRoot = options.projectRoot;
  const compiler = new Compiler(projectRoot);

  console.log(pc.cyan(`⚡ Compiling project at ${pc.bold(projectRoot)}...`));
  const buildOutput = await compiler.build();
  const synthesizedTemplate = JSON.parse(fs.readFileSync(buildOutput.templatePath, "utf-8"));

  const checkGatekeeper = (diffs: ResourceDiff[]) => {
    if (options.checkReplacement) {
      const dangerousReplacements = findStatefulReplacements(diffs);
      if (dangerousReplacements.length > 0 && !options.allowStatefulReplacement) {
        const resourceNames = dangerousReplacements
          .map((r) => `${r.logicalId} (${r.type})`)
          .join(", ");
        console.error(
          pc.red(
            pc.bold(
              `\n❌ DEPLOYMENT BLOCKED: Stateful resource replacement detected on: ${resourceNames}`
            )
          )
        );
        console.error(
          pc.red(
            `   Replacing stateful resources will cause DATA LOSS because the existing resource is destroyed.\n` +
              `   To bypass this safety gatekeeper, pass: --allow-stateful-replacement`
          )
        );
        throw new Error(`Deployment blocked: stateful resource replacement on ${resourceNames}`);
      }
    }
  };

  if (options.stackName) {
    console.log(pc.cyan(`\n☁ Querying AWS CloudFormation ChangeSet for stack ${pc.bold(options.stackName)}...`));
    const diffs = await diffAgainstCloudFormation(
      options.stackName,
      JSON.stringify(synthesizedTemplate),
      options.region
    );
    printDiffTable(diffs);
    checkGatekeeper(diffs);
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
  checkGatekeeper(diffs);
  return diffs;
}
