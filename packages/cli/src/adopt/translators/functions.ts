import { resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateFunctions(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const fnNotes: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::Serverless::Function" || res.Type === "AWS::Lambda::Function") {
      adopted.push(key);
      const props = res.Properties || {};
      const fnName = resolveValueExpr(props.FunctionName, params, templateParams) || JSON.stringify(key);
      fnNotes.push(`// • ${key} (Handler: ${props.Handler || "index.handler"}, FunctionName: ${fnName})`);
    }
  }

  const code =
    fnNotes.length > 0
      ? "// --- Discovered Lambda Functions ---\n" +
        "// Map these to api(), consumer(), stream(), or subscriber() in your application code:\n" +
        fnNotes.join("\n")
      : "";

  return { code, adopted };
}
