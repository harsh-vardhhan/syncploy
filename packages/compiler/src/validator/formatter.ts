import type { ValidationResult } from "./types";

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;

export function formatDiagnostics(result: ValidationResult): string {
  const lines: string[] = [];

  for (const err of result.errors) {
    const loc = err.sourceFile ? ` in ${dim(err.sourceFile)}` : "";
    lines.push(`  ${red(bold(`[${err.code}]`))}${loc}`);
    lines.push(`  • ${err.message}`);
    lines.push("");
  }

  for (const warn of result.warnings) {
    const loc = warn.sourceFile ? ` in ${dim(warn.sourceFile)}` : "";
    lines.push(`  ${yellow(bold(`[${warn.code}]`))}${loc}`);
    lines.push(`  • ${warn.message}`);
    lines.push("");
  }

  if (result.suppressions && result.suppressions.length > 0) {
    for (const sup of result.suppressions) {
      const loc = sup.sourceFile ? ` in ${dim(sup.sourceFile)}` : "";
      const reasonStr = sup.reason ? ` (Reason: "${sup.reason}")` : "";
      lines.push(`  ${cyan(bold(`[SUPPRESSED: ${sup.code}]`))}${reasonStr}${loc}`);
      lines.push(`  • ${sup.message}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
