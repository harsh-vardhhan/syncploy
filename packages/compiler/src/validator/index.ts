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
export { formatDiagnostics } from "./formatter";

export class GraphValidator implements ValidationContext {
  private diagnostics: Diagnostic[] = [];
  private suppressions: SuppressedDiagnostic[] = [];
  private suppressionMap = new Map<string, Record<string, string>>();

  constructor(private options?: ValidationOptions) {}

  private checkSuppression(
    code: string,
    constructId: string,
    message: string,
    sourceFile?: string,
    severity: "error" | "warning" = "warning"
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
        sourceFile,
        severity,
        reason,
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
    candidateConstructIds?: string[]
  ): void {
    if (candidateConstructIds && candidateConstructIds.length > 0) {
      for (const cid of candidateConstructIds) {
        if (this.checkSuppression(code, cid, message, sourceFile, "error")) return;
      }
    }
    if (this.checkSuppression(code, constructId, message, sourceFile, "error")) return;
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "error" });
  }

  public addWarning(
    code: string,
    constructId: string,
    message: string,
    sourceFile?: string,
    candidateConstructIds?: string[]
  ): void {
    if (candidateConstructIds && candidateConstructIds.length > 0) {
      for (const cid of candidateConstructIds) {
        if (this.checkSuppression(code, cid, message, sourceFile, "warning")) return;
      }
    }
    if (this.checkSuppression(code, constructId, message, sourceFile, "warning")) return;
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "warning" });
  }

  public validate(graph: ResourceGraph): ValidationResult {
    this.diagnostics = [];
    this.suppressions = [];
    this.suppressionMap.clear();

    // Index comment suppressions across all constructs in graph
    for (const api of graph.apis) {
      if (api.suppressions) this.suppressionMap.set(api.id, api.suppressions);
    }
    for (const c of graph.consumers) {
      if (c.suppressions) this.suppressionMap.set(c.id, c.suppressions);
    }
    for (const s of graph.tableStreams) {
      if (s.suppressions) this.suppressionMap.set(s.id, s.suppressions);
    }
    for (const sub of graph.topicSubscribers) {
      if (sub.suppressions) this.suppressionMap.set(sub.id, sub.suppressions);
    }
    for (const t of graph.tables) {
      if (t.suppressions) this.suppressionMap.set(t.id, t.suppressions);
    }
    for (const b of graph.buckets) {
      if (b.suppressions) this.suppressionMap.set(b.id, b.suppressions);
    }
    for (const q of graph.queues) {
      if (q.suppressions) this.suppressionMap.set(q.id, q.suppressions);
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
