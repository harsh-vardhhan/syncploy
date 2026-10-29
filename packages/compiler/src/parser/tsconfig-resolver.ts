import * as path from "node:path";
import * as fs from "node:fs";
import { ts } from "ts-morph";

export interface ResolvedTsConfigPaths {
  paths: Record<string, string[]>;
  exactAliases: Record<string, string>;
}

/**
 * Discovers all tsconfig.json files in the project root and workspace packages.
 */
export function findTsConfigs(projectRoot: string): string[] {
  const configs = new Set<string>();
  const rootConfig = path.join(projectRoot, "tsconfig.json");
  if (fs.existsSync(rootConfig)) {
    configs.add(rootConfig);
  }

  // Check workspaces in root package.json if present
  try {
    const pkgPath = path.join(projectRoot, "package.json");
    if (fs.existsSync(pkgPath)) {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));
      const rawWs = pkg.workspaces;
      const workspaces: string[] = Array.isArray(rawWs)
        ? rawWs
        : Array.isArray(rawWs?.packages)
          ? rawWs.packages
          : [];

      for (const ws of workspaces) {
        const cleanWs = ws.replace(/\/\*$/, "");
        const wsDir = path.resolve(projectRoot, cleanWs);
        if (ws.endsWith("/*") && fs.existsSync(wsDir)) {
          const subdirs = fs.readdirSync(wsDir, { withFileTypes: true });
          for (const sub of subdirs) {
            if (sub.isDirectory()) {
              const subConfig = path.join(wsDir, sub.name, "tsconfig.json");
              if (fs.existsSync(subConfig)) {
                configs.add(subConfig);
              }
            }
          }
        } else {
          const candidate = path.join(wsDir, "tsconfig.json");
          if (fs.existsSync(candidate)) {
            configs.add(candidate);
          }
        }
      }
    }
  } catch {}

  // Recursive shallow walk up to depth 3 to find nested package tsconfigs
  function walk(dir: string, depth: number) {
    if (depth > 3) return;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (
          entry.name.startsWith(".") ||
          entry.name === "node_modules" ||
          entry.name === "dist" ||
          entry.name === "build" ||
          entry.name === ".next"
        ) {
          continue;
        }
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, depth + 1);
        } else if (
          entry.isFile() &&
          (entry.name === "tsconfig.json" || entry.name.endsWith(".tsconfig.json"))
        ) {
          configs.add(full);
        }
      }
    } catch {}
  }

  walk(projectRoot, 1);
  return Array.from(configs);
}

/**
 * Parses all discovered tsconfig.json files and resolves their compilerOptions.paths
 * relative to the projectRoot, suitable for configuring ts-morph's Project.
 */
export function resolveTsConfigPaths(projectRoot: string): ResolvedTsConfigPaths {
  const configs = findTsConfigs(projectRoot);
  const mergedPaths: Record<string, string[]> = {};
  const exactAliases: Record<string, string> = {};

  for (const configPath of configs) {
    try {
      const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
      if (configFile.error) continue;

      const parsed = ts.parseJsonConfigFileContent(
        configFile.config,
        ts.sys,
        path.dirname(configPath)
      );

      const paths = parsed.options.paths;
      if (!paths) continue;

      const baseUrl = parsed.options.baseUrl || path.dirname(configPath);

      for (const [alias, targets] of Object.entries(paths)) {
        if (!mergedPaths[alias]) {
          mergedPaths[alias] = [];
        }

        for (const target of targets) {
          let normalized: string;
          if (target.includes("*")) {
            const starIdx = target.indexOf("*");
            const prefix = target.slice(0, starIdx);
            const suffix = target.slice(starIdx + 1);
            const resolvedPrefix = path.resolve(baseUrl, prefix);
            const relPrefix = path.relative(projectRoot, resolvedPrefix);
            normalized = (relPrefix ? `${relPrefix}/` : "") + `*${suffix}`;
          } else {
            const resolved = path.resolve(baseUrl, target);
            normalized = path.relative(projectRoot, resolved);
            if (!exactAliases[alias]) {
              exactAliases[alias] = resolved;
            }
          }

          if (!mergedPaths[alias].includes(normalized)) {
            mergedPaths[alias].push(normalized);
          }
        }
      }
    } catch {}
  }

  return { paths: mergedPaths, exactAliases };
}
