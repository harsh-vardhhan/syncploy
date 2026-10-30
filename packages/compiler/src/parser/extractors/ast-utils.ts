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

export function isNodeExported(decl: any, sourceFile?: SourceFile): boolean {
  if (decl.isExported && decl.isExported()) return true;
  const sf = sourceFile || decl.getSourceFile();
  const name = decl.getName();
  for (const exp of sf.getExportDeclarations()) {
    for (const named of exp.getNamedExports()) {
      if ((named.getAliasNode()?.getText() || named.getName()) === name) return true;
    }
  }
  return false;
}

export function isSyncploySdkModule(moduleSpec?: string, filePath?: string): boolean {
  if (moduleSpec) {
    if (
      moduleSpec === "@syncploy/sdk" ||
      moduleSpec.startsWith("@syncploy/sdk/") ||
      moduleSpec.endsWith("/packages/sdk") ||
      moduleSpec.endsWith("packages/sdk")
    ) {
      return true;
    }
  }
  if (filePath) {
    if (
      filePath.includes("/node_modules/@syncploy/sdk/") ||
      filePath.includes("/packages/sdk/")
    ) {
      return true;
    }
  }
  return false;
}

export function getSyncployConstructKind(
  exprNode: Node | undefined,
  sourceFile?: SourceFile
): string | undefined {
  if (!exprNode) return undefined;
  const unwrapped = unwrapExpression(exprNode);
  if (!unwrapped) return undefined;

  // 1. Property access: sdk.Table or syncploy.Table
  if (unwrapped.isKind(SyntaxKind.PropertyAccessExpression)) {
    const memberName = unwrapped.getName();
    const obj = unwrapped.getExpression();
    const sym = obj.getSymbol();
    const decl = sym?.getDeclarations()[0];
    if (decl && (decl.isKind(SyntaxKind.ImportClause) || decl.isKind(SyntaxKind.NamespaceImport))) {
      const imp = decl.getFirstAncestorByKind(SyntaxKind.ImportDeclaration);
      const mod = imp?.getModuleSpecifierValue();
      const filePath = imp?.getModuleSpecifierSourceFile()?.getFilePath();
      if (isSyncploySdkModule(mod, filePath)) return memberName;
    }
    if (obj.getText() === "syncploy") {
      return memberName;
    }
    return undefined;
  }

  // 2. Identifier: Table or aliased T or re-exported BaseTable
  if (unwrapped.isKind(SyntaxKind.Identifier)) {
    const sym = unwrapped.getSymbol();
    if (!sym) {
      const sf = sourceFile || unwrapped.getSourceFile();
      const text = unwrapped.getText();
      for (const imp of sf.getImportDeclarations()) {
        const mod = imp.getModuleSpecifierValue();
        const targetSf = imp.getModuleSpecifierSourceFile();
        const filePath = targetSf?.getFilePath();
        if (isSyncploySdkModule(mod, filePath)) {
          for (const ni of imp.getNamedImports()) {
            const alias = ni.getAliasNode()?.getText();
            if ((alias && alias === text) || ni.getName() === text) {
              return ni.getName();
            }
          }
        }
      }
      return undefined;
    }

    if (sym.isAlias()) {
      let targetSym = sym;
      while (targetSym.isAlias()) {
        const next = targetSym.getAliasedSymbol();
        if (!next || next.getName() === "unknown") break;
        targetSym = next;
      }
      const declFile = targetSym.getDeclarations()[0]?.getSourceFile()?.getFilePath();
      if (isSyncploySdkModule(undefined, declFile)) {
        return targetSym.getName();
      }
    }

    const decl = sym.getDeclarations()[0];
    if (decl && decl.isKind(SyntaxKind.ImportSpecifier)) {
      const imp = decl.getImportDeclaration();
      const mod = imp.getModuleSpecifierValue();
      const targetSf = imp.getModuleSpecifierSourceFile();
      const filePath = targetSf?.getFilePath();

      if (isSyncploySdkModule(mod, filePath)) {
        return decl.getName();
      }

      if (targetSf) {
        const importedName = decl.getName();
        for (const exp of targetSf.getExportDeclarations()) {
          const expMod = exp.getModuleSpecifierValue();
          const expSf = exp.getModuleSpecifierSourceFile();
          const expPath = expSf?.getFilePath();

          if (isSyncploySdkModule(expMod, expPath)) {
            for (const ne of exp.getNamedExports()) {
              const localName = ne.getAliasNode()?.getText() || ne.getName();
              if (localName === importedName) {
                return ne.getName();
              }
            }
          }
        }
      }
    }
  }

  return undefined;
}

export function isSyncployConstruct(
  exprNode: Node | undefined,
  expectedName: string,
  sourceFile?: SourceFile
): boolean {
  return getSyncployConstructKind(exprNode, sourceFile) === expectedName;
}

export interface ResolveOptions {
  kinds?: SyntaxKind[];
  unwrapInitializer?: boolean;
}

/**
 * Searches a source file and follows its imports and exports to find the declaration
 * matching `name`. Supports functions, variables, classes, and re-export aliases.
 */
export function resolveDeclarationInFile(
  file: SourceFile,
  name: string,
  options: ResolveOptions = {},
  seen: Set<string> = new Set()
): Node | undefined {
  const key = `${file.getFilePath()}::${name}`;
  if (seen.has(key) || seen.size > 15) return undefined;
  seen.add(key);

  const kinds = options.kinds;
  const matchKind = (n: Node) => !kinds || kinds.includes(n.getKind());

  // 1. Check direct local declarations
  const fn = file.getFunction(name);
  if (fn && matchKind(fn)) return fn;

  const vr = file.getVariableDeclaration(name);
  if (vr && matchKind(vr)) {
    return options.unwrapInitializer ? (vr.getInitializer() || vr) : vr;
  }

  const cls = file.getClass(name);
  if (cls && matchKind(cls)) return cls;

  // 2. Follow exports: export { a as b } from "./other" or export * from "./other"
  for (const exp of file.getExportDeclarations()) {
    const mod = exp.getModuleSpecifierSourceFile();
    if (!mod || mod.getFilePath().includes("/node_modules/")) continue;
    if (exp.isTypeOnly()) continue;

    const namedExports = exp.getNamedExports();
    if (namedExports.length > 0) {
      const named = namedExports.find((ne) => (ne.getAliasNode()?.getText() || ne.getName()) === name);
      if (named) {
        return resolveDeclarationInFile(mod, named.getName(), options, seen);
      }
    } else {
      const found = resolveDeclarationInFile(mod, name, options, seen);
      if (found) return found;
    }
  }

  // 3. Follow imports: import { a as b } from "./other"
  for (const imp of file.getImportDeclarations()) {
    const mod = imp.getModuleSpecifierSourceFile();
    if (!mod || mod.getFilePath().includes("/node_modules/")) continue;
    if (imp.isTypeOnly()) continue;

    const named = imp.getNamedImports().find((ni) => (ni.getAliasNode()?.getText() || ni.getName()) === name);
    if (named) {
      return resolveDeclarationInFile(mod, named.getName(), options, seen);
    }
  }

  return undefined;
}

/**
 * Resolves an AST node or identifier across symbol tables, re-export chains,
 * and import aliases to its declaration node.
 */
export function resolveReferenceDeclaration(
  node: Node | undefined,
  options: ResolveOptions = {},
  seen: Set<string> = new Set()
): Node | undefined {
  const unwrapped = unwrapExpression(node);
  if (!unwrapped) return undefined;

  if (!unwrapped.isKind(SyntaxKind.Identifier)) {
    return unwrapped;
  }

  const name = unwrapped.getText();
  const file = unwrapped.getSourceFile();
  const key = `${file.getFilePath()}::${name}`;
  if (seen.has(key) || seen.size > 15) return undefined;
  seen.add(key);

  // 1. Try ts-morph symbol resolution across modules and aliases
  try {
    const symbol = unwrapped.getSymbol();
    const target = symbol?.isAlias() ? symbol.getAliasedSymbol() : symbol;
    if (target) {
      const decls = target.getDeclarations();
      for (const d of decls) {
        if (!options.kinds || options.kinds.includes(d.getKind())) {
          if (d.isKind(SyntaxKind.VariableDeclaration) && options.unwrapInitializer) {
            return (d as any).getInitializer() || d;
          }
          return d;
        }
      }
    }
  } catch {}

  // 2. Fallback to file-level import/export walking
  return resolveDeclarationInFile(file, name, options, seen);
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

  const resolved = resolveReferenceDeclaration(
    unwrapped,
    { kinds: [SyntaxKind.VariableDeclaration], unwrapInitializer: true },
    seen
  );
  if (!resolved) return undefined;

  const init = resolved.isKind(SyntaxKind.VariableDeclaration)
    ? (resolved as any).getInitializer()
    : resolved;

  if (init && init.isKind(SyntaxKind.Identifier)) {
    return resolveConstantInitializer(init, seen);
  }
  return init;
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

export function resolveTemplateExpression(template: Node): string | undefined {
  if (!template.isKind(SyntaxKind.TemplateExpression)) return undefined;
  let result = template.getHead().getLiteralText();
  for (const span of template.getTemplateSpans()) {
    const expr = span.getExpression();
    const resolvedStr = extractString(expr);
    if (resolvedStr === undefined) {
      return undefined;
    }
    result += resolvedStr;
    result += span.getLiteral().getLiteralText();
  }
  return result;
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
  if (target.isKind(SyntaxKind.TemplateExpression)) {
    return resolveTemplateExpression(target);
  }
  if (target.isKind(SyntaxKind.Identifier)) {
    const declInit = resolveConstantInitializer(target);
    if (declInit) {
      if (
        declInit.isKind(SyntaxKind.StringLiteral) ||
        declInit.isKind(SyntaxKind.NoSubstitutionTemplateLiteral)
      ) {
        return (declInit as any).getLiteralValue();
      }
      if (declInit.isKind(SyntaxKind.TemplateExpression)) {
        return resolveTemplateExpression(declInit);
      }
    }
  }
  return undefined;
}

export function extractString(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  const literalVal = extractStringLiteral(node);
  if (literalVal !== undefined) return literalVal;

  let target = node;
  if (node.isKind(SyntaxKind.PropertyAssignment)) {
    target = (node as any).getInitializer() || node;
  } else if (node.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
    target = (node as any).getNameNode() || node;
  }
  target = unwrapExpression(target) || target;

  if (target.isKind(SyntaxKind.NumericLiteral)) {
    return (target as any).getLiteralValue().toString();
  }

  const rawText = target.getText();
  const match = rawText.match(/^process\.env\.([a-zA-Z0-9_]+)(?:\s*\|\|\s*['"`](.*)['"`])?$/);
  if (match) {
    const varName = match[1] || "";
    const fallback = match[2];
    const envVal = process.env[varName];
    if (envVal !== undefined && envVal !== "") return envVal;
    if (fallback !== undefined) return fallback;
    return undefined;
  }

  // Never return raw unparseable source code (e.g. "buildName()", "config.name")
  return undefined;
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
