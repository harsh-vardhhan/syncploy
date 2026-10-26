export function toVarName(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "");
  return clean.charAt(0).toLowerCase() + clean.slice(1);
}

export function toResourceName(logicalId: string, suffix?: string): string {
  let clean = logicalId;
  if (suffix && clean.endsWith(suffix) && clean.length > suffix.length) {
    clean = clean.slice(0, -suffix.length);
  }
  const hyphenated = clean.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  return hyphenated || clean.toLowerCase();
}

export function toEnvKey(paramName: string): string {
  return paramName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toUpperCase();
}

export function resolveValueExpr(
  expr: any,
  params: Record<string, string>,
  templateParams: Record<string, any>
): string | undefined {
  if (expr === undefined || expr === null) return undefined;
  if (typeof expr === "string") return JSON.stringify(expr);
  if (typeof expr === "number" || typeof expr === "boolean") return String(expr);

  if (typeof expr === "object") {
    if (expr.Ref) {
      const paramName = expr.Ref;
      if (params[paramName] !== undefined) {
        const val = params[paramName];
        return !isNaN(Number(val)) && val.trim() !== "" ? val : JSON.stringify(val);
      }
      if (templateParams[paramName]?.Default !== undefined) {
        const def = templateParams[paramName].Default;
        return typeof def === "number" ? String(def) : JSON.stringify(String(def));
      }
      return `process.env.${toEnvKey(paramName)} || "\${AWS::StackName}-${paramName.toLowerCase()}"`;
    }

    if (expr["Fn::Sub"]) {
      const sub = expr["Fn::Sub"];
      if (typeof sub === "string") {
        let resolved = sub;
        for (const [k, v] of Object.entries(params)) {
          resolved = resolved.replace(new RegExp(`\\$\\{${k}\\}`, "g"), v);
        }
        for (const [k, v] of Object.entries(templateParams)) {
          if (v?.Default !== undefined) {
            resolved = resolved.replace(new RegExp(`\\$\\{${k}\\}`, "g"), String(v.Default));
          }
        }
        return JSON.stringify(resolved);
      }
    }
  }

  return undefined;
}
