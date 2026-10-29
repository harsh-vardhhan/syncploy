import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as esbuild from "esbuild";
import { resolveTsConfigPaths } from "./parser/tsconfig-resolver";

export interface BundlerOptions {
  minify?: boolean | undefined;
  bundleAwsSdk?: boolean | undefined;
}

export interface BundleResult {
  bundlePath: string;
  sizeBytes: number;
  sizeMB: number;
  warning?: string | undefined;
}

export class Bundler {
  constructor(public readonly workDir: string) {}

  public async bundle(
    id: string,
    entrypointPath: string,
    options: BundlerOptions = {}
  ): Promise<BundleResult> {
    const outDir = path.join(this.workDir, ".syncploy", "build", id);
    await fs.mkdir(outDir, { recursive: true });

    const outFile = path.join(outDir, "index.mjs");
    const sdkIndexPath = path.resolve(__dirname, "../../sdk/src/index.ts");

    // Auto-discover workspace packages and node_modules
    const aliases: Record<string, string> = {
      "@syncploy/sdk": sdkIndexPath,
    };
    try {
      const { exactAliases } = resolveTsConfigPaths(this.workDir);
      Object.assign(aliases, exactAliases);
    } catch {}
    const nodePaths: string[] = [path.join(this.workDir, "node_modules")];

    try {
      const rootPkgPath = path.join(this.workDir, "package.json");
      const rootPkg = JSON.parse(await fs.readFile(rootPkgPath, "utf-8"));
      const workspaces: string[] = rootPkg.workspaces || [];

      for (const ws of workspaces) {
        const cleanWs = ws.replace(/\/\*$/, "");
        const wsPath = path.resolve(this.workDir, cleanWs);
        const nmPath = path.join(wsPath, "node_modules");
        try {
          await fs.access(nmPath);
          nodePaths.push(nmPath);
        } catch {}

        try {
          const stat = await fs.stat(wsPath);
          if (stat.isDirectory()) {
            // Check if wsPath itself has a package.json
            try {
              const subPkg = JSON.parse(await fs.readFile(path.join(wsPath, "package.json"), "utf-8"));
              if (subPkg.name) {
                aliases[subPkg.name] = path.resolve(wsPath, subPkg.main || "src/index.ts");
              }
            } catch {}

            // Also check subdirectories if it's a glob like packages/*
            if (ws.endsWith("/*")) {
              const entries = await fs.readdir(wsPath, { withFileTypes: true });
              for (const entry of entries) {
                if (entry.isDirectory()) {
                  const dirPath = path.join(wsPath, entry.name);
                  const subNmPath = path.join(dirPath, "node_modules");
                  try {
                    await fs.access(subNmPath);
                    nodePaths.push(subNmPath);
                  } catch {}

                  try {
                    const subPkg = JSON.parse(await fs.readFile(path.join(dirPath, "package.json"), "utf-8"));
                    if (subPkg.name) {
                      aliases[subPkg.name] = path.resolve(dirPath, subPkg.main || "src/index.ts");
                    }
                  } catch {}
                }
              }
            }
          }
        } catch {}
      }
    } catch {}

    await esbuild.build({
      entryPoints: [entrypointPath],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "esm",
      minify: options.minify ?? false,
      sourcemap: true,
      outfile: outFile,
      nodePaths,
      alias: aliases,
      external: options.bundleAwsSdk ? [] : ["@aws-sdk/*"],
      banner: {
        js: `import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);`,
      },
    });

    const stat = await fs.stat(outFile);
    const sizeBytes = stat.size;
    const sizeMB = Number((sizeBytes / (1024 * 1024)).toFixed(2));

    let warning: string | undefined;
    if (sizeBytes > 50 * 1024 * 1024) {
      warning = `Lambda '${id}' bundle is ${sizeMB}MB, exceeding the 50MB direct zip upload ceiling. Consider using packageType: "Image".`;
    } else if (sizeBytes > 35 * 1024 * 1024) {
      warning = `Lambda '${id}' bundle is ${sizeMB}MB, approaching the 50MB direct zip upload ceiling.`;
    }

    return {
      bundlePath: outFile,
      sizeBytes,
      sizeMB,
      warning,
    };
  }
}
