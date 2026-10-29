import type { ResourceGraph } from "../types";
import type { Diagnostic, SuppressedDiagnostic, ValidationResult, ValidationContext, ValidationOptions } from "./types";
import { formatDiagnostics } from "./formatter";
import { validateLogicalIds } from "./rules/common";
import {
  validateApis,
  validateConsumers,
  validateTableStreams,
  validateTopicSubscribers,
} from "./rules/lambdas";
import {
  validateBuckets,
  validateTables,
  validateQueues,
  validateTopics,
  validateDeliveryStreams,
  validateAlarms,
  validateAuths,
} from "./rules/constructs";
import { validateInfraRecursion } from "./rules/recursion";
import { validateDenialOfWallet } from "./rules/dow";
import { validateElectroDb } from "./rules/electrodb";

export * from "./types";
export * from "./rules-catalog";
export { formatDiagnostics } from "./formatter";

interface ConstructLoc {
  sourceFile?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
}

export class GraphValidator implements ValidationContext {
  private diagnostics: Diagnostic[] = [];
  private suppressions: SuppressedDiagnostic[] = [];
  private suppressionMap = new Map<string, Record<string, string>>();
  private constructLocationMap = new Map<string, ConstructLoc>();

  constructor(private options?: ValidationOptions) {}

  private checkSuppression(
    code: string,
    constructId: string,
    message: string,
    sourceFile?: string,
    severity: "error" | "warning" = "warning",
    line?: number,
    column?: number
  ): boolean {
    let supp = this.suppressionMap.get(constructId);

    // If constructId is "Stack", check if any construct or file in the stack suppressed this code
    if (!supp && constructId === "Stack") {
      for (const [_, sMap] of this.suppressionMap.entries()) {
        if (sMap[code] !== undefined || sMap["*"] !== undefined) {
          supp = sMap;
          break;
        }
      }
    }

    if (!supp) return false;
    const reason = supp[code] ?? supp["*"];
    if (reason !== undefined) {
      this.suppressions.push({
        code,
        constructId,
        message,
        severity,
        reason,
        ...(sourceFile ? { sourceFile } : {}),
        ...(line !== undefined ? { line } : {}),
        ...(column !== undefined ? { column } : {}),
      });
      return true;
    }
    return false;
  }

  public addError(
    code: string,
    constructId: string,
    message: string,
    sourceFile?: string,
    candidateConstructIds?: string[],
    line?: number,
    column?: number
  ): void {
    const loc = this.constructLocationMap.get(constructId);
    const resolvedFile = sourceFile || loc?.sourceFile;
    const resolvedLine = line ?? loc?.line;
    const resolvedCol = column ?? loc?.column;

    if (candidateConstructIds && candidateConstructIds.length > 0) {
      for (const cid of candidateConstructIds) {
        if (this.checkSuppression(code, cid, message, resolvedFile, "error", resolvedLine, resolvedCol)) return;
      }
    }
    if (this.checkSuppression(code, constructId, message, resolvedFile, "error", resolvedLine, resolvedCol)) return;
    this.diagnostics.push({
      code,
      constructId,
      message,
      severity: "error",
      ...(resolvedFile ? { sourceFile: resolvedFile } : {}),
      ...(resolvedLine !== undefined ? { line: resolvedLine } : {}),
      ...(resolvedCol !== undefined ? { column: resolvedCol } : {}),
    });
  }

  public addWarning(
    code: string,
    constructId: string,
    message: string,
    sourceFile?: string,
    candidateConstructIds?: string[],
    line?: number,
    column?: number
  ): void {
    const loc = this.constructLocationMap.get(constructId);
    const resolvedFile = sourceFile || loc?.sourceFile;
    const resolvedLine = line ?? loc?.line;
    const resolvedCol = column ?? loc?.column;

    if (candidateConstructIds && candidateConstructIds.length > 0) {
      for (const cid of candidateConstructIds) {
        if (this.checkSuppression(code, cid, message, resolvedFile, "warning", resolvedLine, resolvedCol)) return;
      }
    }
    if (this.checkSuppression(code, constructId, message, resolvedFile, "warning", resolvedLine, resolvedCol)) return;
    this.diagnostics.push({
      code,
      constructId,
      message,
      severity: "warning",
      ...(resolvedFile ? { sourceFile: resolvedFile } : {}),
      ...(resolvedLine !== undefined ? { line: resolvedLine } : {}),
      ...(resolvedCol !== undefined ? { column: resolvedCol } : {}),
    });
  }

  public validate(graph: ResourceGraph): ValidationResult {
    this.diagnostics = [];
    this.suppressions = [];
    this.suppressionMap.clear();
    this.constructLocationMap.clear();

    const indexLoc = (
      id: string,
      item: { sourceFile?: string | undefined; line?: number | undefined; column?: number | undefined }
    ) => {
      this.constructLocationMap.set(id, {
        sourceFile: item.sourceFile,
        line: item.line,
        column: item.column,
      });
    };

    // Index comment suppressions and locations across all constructs in graph
    for (const api of graph.apis) {
      if (api.suppressions) this.suppressionMap.set(api.id, api.suppressions);
      indexLoc(api.id, api);
    }
    for (const c of graph.consumers) {
      if (c.suppressions) this.suppressionMap.set(c.id, c.suppressions);
      indexLoc(c.id, c);
    }
    for (const s of graph.tableStreams) {
      if (s.suppressions) this.suppressionMap.set(s.id, s.suppressions);
      indexLoc(s.id, s);
    }
    for (const sub of graph.topicSubscribers) {
      if (sub.suppressions) this.suppressionMap.set(sub.id, sub.suppressions);
      indexLoc(sub.id, sub);
    }
    for (const t of graph.tables) {
      if (t.suppressions) this.suppressionMap.set(t.id, t.suppressions);
      indexLoc(t.id, t);
      indexLoc(t.name, t);
    }
    for (const b of graph.buckets) {
      if (b.suppressions) this.suppressionMap.set(b.id, b.suppressions);
      indexLoc(b.id, b);
      indexLoc(b.name, b);
    }
    for (const q of graph.queues) {
      if (q.suppressions) this.suppressionMap.set(q.id, q.suppressions);
      indexLoc(q.id, q);
      indexLoc(q.name, q);
    }
    for (const top of graph.topics) {
      indexLoc(top.id, top);
      indexLoc(top.name, top);
    }
    for (const a of graph.alarms) {
      indexLoc(a.id, a);
      indexLoc(a.name, a);
    }
    for (const ds of graph.deliveryStreams) {
      indexLoc(ds.id, ds);
      indexLoc(ds.name, ds);
    }
    if (graph.auths) {
      for (const au of graph.auths) {
        indexLoc(au.id, au);
        indexLoc(au.name, au);
      }
    }
    if (graph.electroEntities) {
      for (const ee of graph.electroEntities) {
        indexLoc(ee.id, ee);
        indexLoc(ee.entityName, ee);
      }
    }
    if (graph.bindings) {
      for (const bd of graph.bindings) {
        indexLoc(bd.id, bd);
      }
    }

    validateLogicalIds(this, graph);
    validateApis(this, graph);
    validateConsumers(this, graph);
    validateTableStreams(this, graph);
    validateTopicSubscribers(this, graph);
    validateBuckets(this, graph);
    validateTables(this, graph);
    validateQueues(this, graph);
    validateTopics(this, graph);
    validateDeliveryStreams(this, graph);
    validateAlarms(this, graph);
    validateAuths(this, graph);
    validateInfraRecursion(this, graph);
    validateDenialOfWallet(this, graph);
    validateElectroDb(this, graph);

    const errors = this.diagnostics.filter((d) => d.severity === "error");
    const warnings = this.diagnostics.filter((d) => d.severity === "warning");

    if (this.options?.strict) {
      for (const w of warnings) {
        errors.push({
          ...w,
          code: w.code.replace("WARN_", "ERR_"),
          message: `[Strict Mode] ${w.message}`,
          severity: "error",
        });
      }
    } else if (this.options?.failOnDow) {
      for (const w of warnings) {
        if (
          w.code.startsWith("WARN_DOW_") ||
          w.code.startsWith("WARN_SQS_") ||
          w.code.startsWith("WARN_FUNCTION_URL_") ||
          w.code.startsWith("WARN_HTTP_")
        ) {
          errors.push({
            ...w,
            code: w.code.replace("WARN_", "ERR_"),
            message: `[DoW Protection] ${w.message}`,
            severity: "error",
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: this.options?.strict
        ? []
        : warnings.filter(
            (w) =>
              !errors.some(
                (e) =>
                  e.constructId === w.constructId &&
                  e.code.endsWith(w.code.replace("WARN_", ""))
              )
          ),
      suppressions: this.suppressions,
    };
  }
}
