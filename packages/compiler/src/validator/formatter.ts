import * as fs from "node:fs";
import type { ValidationResult, Diagnostic } from "./types";
import { RULES_CATALOG, type RuleCode } from "./rules-catalog";

const red = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s: string) => `\x1b[36m${s}\x1b[0m`;
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[22m`;

const sourceCache = new Map<string, string[]>();

function getSourceLines(filePath: string): string[] | undefined {
  if (sourceCache.has(filePath)) return sourceCache.get(filePath);
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      sourceCache.set(filePath, lines);
      return lines;
    }
  } catch {}
  return undefined;
}

function formatSingleDiagnostic(diag: Diagnostic): string[] {
  const lines: string[] = [];
  const colorFn = diag.severity === "error" ? red : yellow;
  const rule = RULES_CATALOG[diag.code as RuleCode];
  const layerTag = rule ? dim(` (${rule.layer} Layer)`) : "";

  lines.push(`  ${colorFn(bold(`[${diag.code}]`))}${layerTag}`);

  if (diag.sourceFile) {
    const locStr = diag.line
      ? `${diag.sourceFile}:${diag.line}${diag.column ? `:${diag.column}` : ""}`
      : diag.sourceFile;
    lines.push(`  ${cyan("-->")} ${dim(locStr)}`);

    if (diag.line) {
      const fileLines = getSourceLines(diag.sourceFile);
      if (fileLines && diag.line >= 1 && diag.line <= fileLines.length) {
        const lineIdx = diag.line - 1;
        const startIdx = Math.max(0, lineIdx - 1);
        const endIdx = Math.min(fileLines.length - 1, lineIdx + 1);
        const gutterWidth = Math.max(String(endIdx + 1).length, 2);

        lines.push(`  ${" ".repeat(gutterWidth)} ${dim("│")}`);
        for (let i = startIdx; i <= endIdx; i++) {
          const lineNum = String(i + 1).padStart(gutterWidth);
          const lineContent = fileLines[i] ?? "";
          if (i === lineIdx) {
            lines.push(`  ${bold(lineNum)} ${dim("│")} ${lineContent}`);
            const colOffset = Math.max(0, (diag.column ?? 1) - 1);
            const remainingLen = Math.max(1, lineContent.length - colOffset);
            const caretLen = Math.min(Math.max(3, remainingLen), 24);
            lines.push(
              `  ${" ".repeat(gutterWidth)} ${dim("│")} ${" ".repeat(colOffset)}${colorFn(bold("^".repeat(caretLen)))}`
            );
          } else {
            lines.push(`  ${dim(lineNum)} ${dim("│")} ${dim(lineContent)}`);
          }
        }
        lines.push(`  ${" ".repeat(gutterWidth)} ${dim("│")}`);
      }
    }
  }

  lines.push(`  • ${diag.message}`);

  if (rule) {
    if (rule.financialRisk) {
      lines.push(`  ${dim("=")} ${bold("note")}: ${rule.financialRisk}`);
    }
    if (rule.remediation) {
      lines.push(`  ${dim("=")} ${cyan(bold("help"))}: ${rule.remediation}`);
    }
  }

  lines.push("");
  return lines;
}

export function formatDiagnostics(result: ValidationResult): string {
  const lines: string[] = [];

  for (const err of result.errors) {
    lines.push(...formatSingleDiagnostic(err));
  }

  for (const warn of result.warnings) {
    lines.push(...formatSingleDiagnostic(warn));
  }

  if (result.suppressions && result.suppressions.length > 0) {
    for (const sup of result.suppressions) {
      const locStr = sup.sourceFile
        ? sup.line
          ? `${sup.sourceFile}:${sup.line}${sup.column ? `:${sup.column}` : ""}`
          : sup.sourceFile
        : "";
      const loc = locStr ? ` in ${dim(locStr)}` : "";
      const reasonStr = sup.reason ? ` (Reason: "${sup.reason}")` : "";
      lines.push(`  ${cyan(bold(`[SUPPRESSED: ${sup.code}]`))}${reasonStr}${loc}`);
      lines.push(`  • ${sup.message}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}
