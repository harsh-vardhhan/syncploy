import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as esbuild from "esbuild";
import type { ApiRouteIR } from "./types";

export interface BundlerOptions {
  minify?: boolean;
}

export class Bundler {
  constructor(public readonly workDir: string) {}

  public async bundle(
    api: ApiRouteIR,
    entrypointPath: string,
    options: BundlerOptions = {}
  ): Promise<string> {
    const outDir = path.join(this.workDir, ".syncploy", "build", api.id);
    await fs.mkdir(outDir, { recursive: true });

    const outFile = path.join(outDir, "index.mjs");

    const sdkIndexPath = path.resolve(__dirname, "../../sdk/src/index.ts");

    await esbuild.build({
      entryPoints: [entrypointPath],
      bundle: true,
      platform: "node",
      target: "node20",
      format: "esm",
      minify: options.minify ?? false,
      sourcemap: true,
      outfile: outFile,
      external: ["@aws-sdk/*"],
      alias: {
        "@syncploy/sdk": sdkIndexPath,
      },
      banner: {
        js: `import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);`,
      },
    });

    return outFile;
  }
}
