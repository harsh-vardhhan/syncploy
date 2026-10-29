export interface Diagnostic {
  code: string;
  message: string;
  constructId: string;
  sourceFile?: string | undefined;
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
  addError(code: string, constructId: string, message: string, sourceFile?: string): void;
  addWarning(code: string, constructId: string, message: string, sourceFile?: string): void;
}
