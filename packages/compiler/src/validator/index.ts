import type { ResourceGraph } from "../types";
import type { Diagnostic, ValidationResult, ValidationContext, ValidationOptions } from "./types";
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

  constructor(private options?: ValidationOptions) {}

  public addError(code: string, constructId: string, message: string, sourceFile?: string): void {
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "error" });
  }

  public addWarning(code: string, constructId: string, message: string, sourceFile?: string): void {
    this.diagnostics.push({ code, constructId, message, sourceFile, severity: "warning" });
  }

  public validate(graph: ResourceGraph): ValidationResult {
    this.diagnostics = [];

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
        if (w.code.startsWith("WARN_DOW_") || w.code.startsWith("WARN_SQS_")) {
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
    };
  }
}
