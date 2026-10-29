import {
  Node,
  SyntaxKind,
  ObjectLiteralExpression,
  type SourceFile,
} from "ts-morph";
import type {
  CorsConfig,
  PolicyStatementIR,
  ContainerIR,
} from "../../types";

export function getNodeLocation(
  node: Node,
  sourceFile?: SourceFile
): { line: number; column: number } {
  try {
    const sf = sourceFile ?? node.getSourceFile();
    return sf.getLineAndColumnAtPos(node.getStart());
  } catch {
    return { line: 1, column: 1 };
  }
}

export function unwrapExpression(node: Node | undefined): Node | undefined {
  if (!node) return undefined;
  let curr = node;
  while (
    curr.isKind(SyntaxKind.AsExpression) ||
    curr.isKind(SyntaxKind.TypeAssertionExpression) ||
    curr.isKind(SyntaxKind.ParenthesizedExpression) ||
    curr.isKind(SyntaxKind.NonNullExpression)
  ) {
    curr = (curr as any).getExpression();
  }
  return curr;
}

/**
 * Follows identifier references to their static initializer, across files and
 * import aliases. Returns the resolved initializer node (literal, expression,
 * etc.) or undefined when the value cannot be statically determined.
 */
export function resolveConstantInitializer(
  node: Node | undefined,
  seen: Set<string> = new Set()
): Node | undefined {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped || !unwrapped.isKind(SyntaxKind.Identifier)) return unwrapped;

  const name = unwrapped.getText();
  const key = `${unwrapped.getSourceFile().getFilePath()}::${name}`;
  if (seen.has(key) || seen.size > 10) return undefined;
  seen.add(key);

  let decl: Node | undefined;
  try {
    const symbol = unwrapped.getSymbol();
    const target = symbol?.isAlias() ? symbol.getAliasedSymbol() : symbol;
    decl = target?.getDeclarations().find((d) => d.isKind(SyntaxKind.VariableDeclaration));
  } catch {
    decl = undefined;
  }
  if (!decl) {
    decl = unwrapped.getSourceFile().getVariableDeclaration(name);
  }
  if (!decl) return undefined;

  return resolveConstantInitializer((decl as any).getInitializer(), seen);
}

export function parseDurationString(str: string): number {
  const sMatch = str.match(/^(\d+)s$/);
  if (sMatch) return parseInt(sMatch[1]!, 10);

  const mMatch = str.match(/^(\d+)m$/);
  if (mMatch) return parseInt(mMatch[1]!, 10) * 60;

  const hMatch = str.match(/^(\d+)h$/);
  if (hMatch) return parseInt(hMatch[1]!, 10) * 3600;

  return parseInt(str, 10) || 30;
}

export function extractDuration(propNode: Node | undefined): number | undefined {
  if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
  const init = propNode.getInitializer();
  if (!init) return undefined;

  if (init.isKind(SyntaxKind.NumericLiteral)) {
    return init.getLiteralValue();
  }
  if (init.isKind(SyntaxKind.StringLiteral)) {
    const str = init.getLiteralValue();
    return parseDurationString(str);
  }
  return undefined;
}

export function extractMemory(propNode: Node | undefined): number | undefined {
  if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
  const init = propNode.getInitializer();
  if (!init) return undefined;

  if (init.isKind(SyntaxKind.NumericLiteral)) {
    return init.getLiteralValue();
  }
  if (init.isKind(SyntaxKind.StringLiteral)) {
    const str = init.getLiteralValue();
    const mbMatch = str.match(/^(\d+)MB$/i);
    if (mbMatch) return parseInt(mbMatch[1]!, 10);

    const gbMatch = str.match(/^(\d+)GB$/i);
    if (gbMatch) return parseInt(gbMatch[1]!, 10) * 1024;
  }
  return undefined;
}

export function extractNumber(propNode: Node | undefined): number | undefined {
  if (!propNode) return undefined;
  let init: Node | undefined;
  if (propNode.isKind(SyntaxKind.PropertyAssignment)) {
    init = unwrapExpression((propNode as any).getInitializer());
  } else if (propNode.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
    init = (propNode as any).getNameNode();
  } else {
    init = unwrapExpression(propNode);
  }
  if (!init) return undefined;
  if (init.isKind(SyntaxKind.NumericLiteral)) {
    return (init as any).getLiteralValue();
  }
  if (init.isKind(SyntaxKind.Identifier)) {
    const declInit = resolveConstantInitializer(init);
    if (declInit && declInit.isKind(SyntaxKind.NumericLiteral)) {
      return (declInit as any).getLiteralValue();
    }
  }
  return undefined;
}

export function extractCors(propNode: Node | undefined): CorsConfig | boolean | undefined {
  if (!propNode || !propNode.isKind(SyntaxKind.PropertyAssignment)) return undefined;
  const init = propNode.getInitializer();
  if (!init) return undefined;

  if (init.getText() === "true") return true;
  if (init.getText() === "false") return false;

  if (init.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const config: CorsConfig = {};
    const originsProp = init.getProperty("allowOrigins");
    if (originsProp && originsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = originsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        config.allowOrigins = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
      }
    }

    const headersProp = init.getProperty("allowHeaders");
    if (headersProp && headersProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = headersProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        config.allowHeaders = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
      }
    }

    const methodsProp = init.getProperty("allowMethods");
    if (methodsProp && methodsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = methodsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        config.allowMethods = arr.getElements().map((e) => e.getText().replace(/['"]/g, ""));
      }
    }
    return config;
  }
  return undefined;
}

export function extractStringLiteral(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  } else if (node.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
    target = (node as any).getNameNode() || node;
  }
  target = unwrapExpression(target) || target;
  if (target.isKind(SyntaxKind.StringLiteral) || target.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
    return (target as any).getLiteralValue();
  }
  if (target.isKind(SyntaxKind.Identifier)) {
    const declInit = resolveConstantInitializer(target);
    if (
      declInit &&
      (declInit.isKind(SyntaxKind.StringLiteral) ||
        declInit.isKind(SyntaxKind.NoSubstitutionTemplateLiteral))
    ) {
      return (declInit as any).getLiteralValue();
    }
  }
  return undefined;
}

export function extractString(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  } else if (node.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
    target = (node as any).getNameNode() || node;
  }
  target = unwrapExpression(target) || target;
  if (target.isKind(SyntaxKind.StringLiteral) || target.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)) {
    return (target as any).getLiteralValue();
  }
  if (target.isKind(SyntaxKind.Identifier)) {
    const declInit = resolveConstantInitializer(target);
    if (
      declInit &&
      (declInit.isKind(SyntaxKind.StringLiteral) ||
        declInit.isKind(SyntaxKind.NoSubstitutionTemplateLiteral))
    ) {
      return (declInit as any).getLiteralValue();
    }
  }
  const rawText = target.getText();
  const match = rawText.match(/^process\.env\.([a-zA-Z0-9_]+)(?:\s*\|\|\s*['"](.*)['"])?$/);
  if (match) {
    const varName = match[1] || "";
    const fallback = match[2] ?? "";
    return process.env[varName] || fallback;
  }
  return rawText.replace(/['"]/g, "");
}

export function extractBoolean(node: Node | undefined): boolean | undefined {
  if (!node) return undefined;
  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  }
  const text = target.getText().trim();
  if (text === "true") return true;
  if (text === "false") return false;
  return undefined;
}

export function extractStringArray(node: Node | undefined): string[] | undefined {
  if (!node) return undefined;
  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  }
  if (target.isKind(SyntaxKind.ArrayLiteralExpression)) {
    return (target as any).getElements().map((e: any) => extractString(e)).filter((s: any): s is string => typeof s === "string");
  }
  return undefined;
}

export function extractPropertyAssignment(prop: any, env: Record<string, string>): void {
  if (prop.isKind(SyntaxKind.PropertyAssignment)) {
    const key = prop.getName();
    const propInit = prop.getInitializer();
    if (propInit) {
      if (propInit.isKind(SyntaxKind.StringLiteral)) {
        env[key] = propInit.getLiteralValue();
      } else {
        const rawText = propInit.getText().trim();
        const match = rawText.match(/^process\.env\.([a-zA-Z0-9_]+)(?:\s*\|\|\s*['"](.*)['"])?$/);
        if (match) {
          const varName = match[1];
          const fallback = match[2] ?? "";
          env[key] = process.env[varName] || fallback;
        } else {
          env[key] = rawText.replace(/['"]/g, "");
        }
      }
    }
  }
}

export function extractEnvironment(node: Node | undefined): Record<string, string> | undefined {
  if (!node || !node.isKind(SyntaxKind.PropertyAssignment)) return undefined;
  const init = (node as any).getInitializer();
  if (!init || !init.isKind(SyntaxKind.ObjectLiteralExpression)) return undefined;

  const env: Record<string, string> = {};
  for (const prop of (init as any).getProperties()) {
    if (prop.isKind(SyntaxKind.PropertyAssignment)) {
      extractPropertyAssignment(prop, env);
    } else if (prop.isKind(SyntaxKind.SpreadAssignment)) {
      const expr = prop.getExpression();
      if (expr.isKind(SyntaxKind.ConditionalExpression)) {
        const whenTrue = expr.getWhenTrue();
        if (whenTrue.isKind(SyntaxKind.ObjectLiteralExpression)) {
          for (const innerProp of whenTrue.getProperties()) {
            extractPropertyAssignment(innerProp, env);
          }
        }
      } else if (expr.isKind(SyntaxKind.ObjectLiteralExpression)) {
        for (const innerProp of expr.getProperties()) {
          extractPropertyAssignment(innerProp, env);
        }
      }
    }
  }
  return Object.keys(env).length > 0 ? env : undefined;
}

export function extractPolicies(node: Node | undefined): PolicyStatementIR[] | undefined {
  if (!node || !node.isKind(SyntaxKind.PropertyAssignment)) return undefined;
  const init = (node as any).getInitializer();
  if (!init || !init.isKind(SyntaxKind.ArrayLiteralExpression)) return undefined;
  const statements: PolicyStatementIR[] = [];
  for (const el of (init as any).getElements()) {
    if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
      const obj = el as ObjectLiteralExpression;
      const effectProp = obj.getProperty("effect");
      const actionsProp = obj.getProperty("actions");
      const resourcesProp = obj.getProperty("resources");

      const effect = (extractString(effectProp) as "Allow" | "Deny") || "Allow";
      const actions = extractStringArray(actionsProp) || [];
      const resources = extractStringArray(resourcesProp) || [];

      if (actions.length > 0 && resources.length > 0) {
        statements.push({ effect, actions, resources });
      }
    }
  }
  return statements.length > 0 ? statements : undefined;
}

export function extractContainer(node: Node | undefined): ContainerIR | undefined {
  if (!node) return undefined;
  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  }
  if (target.isKind(SyntaxKind.TrueKeyword) || target.getText().trim() === "true") {
    return {
      dockerfile: "Dockerfile",
      context: ".",
    };
  }
  if (!target.isKind(SyntaxKind.ObjectLiteralExpression)) return undefined;

  const obj = target as ObjectLiteralExpression;
  const dockerfile = extractString(obj.getProperty("dockerfile"));
  const context = extractString(obj.getProperty("context"));
  const imageUri = extractString(obj.getProperty("imageUri"));
  const cmd = extractStringArray(obj.getProperty("cmd"));
  const entrypoint = extractStringArray(obj.getProperty("entrypoint"));
  const workingDirectory = extractString(obj.getProperty("workingDirectory"));

  return {
    dockerfile: dockerfile || (!imageUri ? "Dockerfile" : undefined),
    context: context || (!imageUri ? "." : undefined),
    imageUri,
    cmd,
    entrypoint,
    workingDirectory,
  };
}

export function extractCommentSuppressions(node: Node | undefined): Record<string, string> | undefined {
  if (!node) return undefined;

  // Check node's own leading comment ranges, or its enclosing statement
  let targetNode: Node = node;
  if (node.isKind(SyntaxKind.VariableDeclaration)) {
    const parent = node.getParent();
    targetNode = parent?.getParent() || parent || node;
  }

  const ranges = targetNode.getLeadingCommentRanges();
  const suppressions: Record<string, string> = {};

  for (const range of ranges) {
    const text = range.getText();
    // Match // syncploy-ignore <CODE> reason="<REASON>" or /* syncploy-ignore ... */
    const match = text.match(/syncploy-ignore\s+([A-Z0-9_*,\s]+?)(?:\s+reason=["']([^"']+)["'])?(?:\r?\n|\*\/|$)/i);
    if (match) {
      const rawCodes = match[1]!.trim();
      const codes = rawCodes.split(/[,\s]+/).map((c) => c.trim()).filter(Boolean);
      const reason = match[2] || "Suppressed by comment";
      for (const code of codes) {
        suppressions[code] = reason;
      }
    }
  }

  return Object.keys(suppressions).length > 0 ? suppressions : undefined;
}
