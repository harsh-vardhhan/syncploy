import type { ResourceGraph } from "../types";
import type { Diagnostic, ValidationResult, ValidationContext } from "./types";
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

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
