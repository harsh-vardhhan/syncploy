import type { RuleCode } from "./rules-catalog";

export type DiagnosticCode = RuleCode;

export interface Diagnostic {
  code: DiagnosticCode;
  message: string;
  constructId: string;
  sourceFile?: string | undefined;
  line?: number | undefined;
  column?: number | undefined;
  severity: "error" | "warning";
}

export interface SuppressedDiagnostic extends Diagnostic {
  reason?: string | undefined;
}

export interface ValidationResult {
  valid: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
  suppressions?: SuppressedDiagnostic[] | undefined;
}

export interface ValidationOptions {
  strict?: boolean | undefined;
  failOnDow?: boolean | undefined;
}

export interface ValidationContext {
  addError(
    code: DiagnosticCode,
    constructId: string,
    message: string,
    sourceFile?: string,
    candidateConstructIds?: string[],
    line?: number,
    column?: number
  ): void;
  addWarning(
    code: DiagnosticCode,
    constructId: string,
    message: string,
    sourceFile?: string,
    candidateConstructIds?: string[],
    line?: number,
    column?: number
  ): void;
}
