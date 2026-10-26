import type { ValidationContext } from "../types";

export const SECRET_PATTERNS: { name: string; regex: RegExp }[] = [
  { name: "OpenAI / LLM API Key", regex: /^sk-(?:proj-)?[a-zA-Z0-9_-]{20,}$/ },
  { name: "AWS Access Key", regex: /^AKIA[0-9A-Z]{16}$/ },
  { name: "GitHub Personal Access Token", regex: /^gh[pousr]_[a-zA-Z0-9]{20,}$/ },
  { name: "Private Key PEM", regex: /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/ },
];

export function validateCors(ctx: ValidationContext, id: string, cors: any, sourceFile?: string): void {
  if (!cors || typeof cors !== "object") return;

  if (Array.isArray(cors.allowOrigins)) {
    for (const origin of cors.allowOrigins) {
      if (typeof origin === "string" && origin !== "*") {
        if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
          ctx.addError(
            "ERR_CORS_ORIGIN_PROTOCOL",
            id,
            `API '${id}': CORS origin '${origin}' is invalid. Origins must specify the protocol (e.g. 'http://${origin}' or 'https://${origin}').`,
            sourceFile
          );
        }
      }
    }
  }
}

export function validatePolicies(
  ctx: ValidationContext,
  id: string,
  policies: any[] | undefined,
  sourceFile?: string
): void {
  if (!policies || !Array.isArray(policies)) return;

  for (const stmt of policies) {
    if (Array.isArray(stmt.actions)) {
      for (const act of stmt.actions) {
        if (typeof act === "string" && act !== "*") {
          if (!act.includes(":")) {
            ctx.addError(
              "ERR_IAM_ACTION_FORMAT",
              id,
              `Policy statement in '${id}': Action '${act}' is invalid. Actions must follow the 'service:Action' format (e.g. 's3:GetObject').`,
              sourceFile
            );
          }
        }
      }

      // Security Warning: least privilege
      if (
        stmt.actions.includes("*") &&
        Array.isArray(stmt.resources) &&
        stmt.resources.includes("*")
      ) {
        ctx.addWarning(
          "WARN_IAM_LEAST_PRIVILEGE",
          id,
          `Overly permissive IAM policy in '${id}': Action '*' on Resource '*' grants full administrative access. Prefer least privilege.`,
          sourceFile
        );
      }
    }
  }
}

export function validateEnvironmentSecrets(
  ctx: ValidationContext,
  id: string,
  env: Record<string, string> | undefined,
  sourceFile?: string
): void {
  if (!env || typeof env !== "object") return;

  for (const [key, value] of Object.entries(env)) {
    if (typeof value === "string") {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(value.trim())) {
          ctx.addWarning(
            "WARN_SECRET_LEAK",
            id,
            `Literal ${pattern.name} detected in environment variable '${key}' for '${id}'. Avoid committing plaintext credentials in source code. Inject them at deployment or via AWS Secrets Manager.`,
            sourceFile
          );
        }
      }
    }
  }
}
