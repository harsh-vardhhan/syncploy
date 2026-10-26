export interface Diagnostic {
  code: string;
  message: string;
  constructId: string;
  sourceFile?: string | undefined;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  errors: Diagnostic[];
  warnings: Diagnostic[];
}

export interface ValidationContext {
  addError(code: string, constructId: string, message: string, sourceFile?: string): void;
  addWarning(code: string, constructId: string, message: string, sourceFile?: string): void;
}
