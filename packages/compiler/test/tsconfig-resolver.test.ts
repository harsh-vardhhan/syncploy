import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import { findTsConfigs, resolveTsConfigPaths } from "../src/parser/tsconfig-resolver";
import { Parser } from "../src/parser";

describe("tsconfig-resolver", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "syncploy-tsconfig-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("discovers root and workspace tsconfig.json files", async () => {
    // Setup monorepo structure
    await fs.writeFile(
      path.join(tmpDir, "package.json"),
      JSON.stringify({
        name: "test-monorepo",
        workspaces: ["packages/*"],
      })
    );
    await fs.writeFile(
      path.join(tmpDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@common/*": ["packages/common/src/*"],
          },
        },
      })
    );

    const apiDir = path.join(tmpDir, "packages", "api");
    await fs.mkdir(apiDir, { recursive: true });
    await fs.writeFile(
      path.join(apiDir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: "./",
          paths: {
            shared: ["../shared/src/index.ts"],
          },
        },
      })
    );

    const configs = findTsConfigs(tmpDir);
    expect(configs).toHaveLength(2);
    expect(configs).toContain(path.join(tmpDir, "tsconfig.json"));
    expect(configs).toContain(path.join(apiDir, "tsconfig.json"));

    const resolved = resolveTsConfigPaths(tmpDir);
    expect(resolved.paths["@common/*"]).toContain("packages/common/src/*");
    expect(resolved.paths["shared"]).toContain("packages/shared/src/index.ts");
    expect(resolved.exactAliases["shared"]).toBe(
      path.resolve(tmpDir, "packages/shared/src/index.ts")
    );
  });

  it("allows Parser to resolve module specifiers using discovered paths", async () => {
    // Create shared package
    const sharedDir = path.join(tmpDir, "packages", "shared", "src");
    await fs.mkdir(sharedDir, { recursive: true });
    await fs.writeFile(
      path.join(sharedDir, "index.ts"),
      `export const SHARED_CONSTANT = 42;`
    );

    // Create api package
    const apiDir = path.join(tmpDir, "packages", "api", "src");
    await fs.mkdir(apiDir, { recursive: true });
    await fs.writeFile(
      path.join(tmpDir, "packages", "api", "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          baseUrl: "./",
          paths: {
            shared: ["../shared/src/index.ts"],
          },
        },
      })
    );
    await fs.writeFile(
      path.join(apiDir, "index.ts"),
      `import { SHARED_CONSTANT } from 'shared';
import { api } from '@syncploy/sdk';

export const myApi = api({ path: '/data' }, async () => {
  return { val: SHARED_CONSTANT };
});
`
    );

    const parser = new Parser(tmpDir);
    const graph = parser.parse();
    expect(graph.apis).toHaveLength(1);
    expect(graph.apis[0]?.path).toBe("/data");
  });
});
