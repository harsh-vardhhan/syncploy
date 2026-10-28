import pc from "picocolors";
import type { ResourceDiff } from "./types";

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
