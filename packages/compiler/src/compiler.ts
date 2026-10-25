import * as path from "node:path";
import { Parser } from "./parser";
import { EntrypointGenerator } from "./entrypoint";
import { Bundler } from "./bundler";
import { Synthesizer } from "./synthesizer";
import type { BuildOutput, ResourceGraph } from "./types";

export class Compiler {
  private parser: Parser;
  private entrypointGen: EntrypointGenerator;
  private bundler: Bundler;
  private synthesizer: Synthesizer;

  constructor(public readonly projectRoot: string) {
    this.parser = new Parser(projectRoot);
    this.entrypointGen = new EntrypointGenerator(projectRoot);
    this.bundler = new Bundler(projectRoot);
    this.synthesizer = new Synthesizer(projectRoot);
  }

  public async parse(): Promise<ResourceGraph> {
    return this.parser.parse();
  }

  public async build(): Promise<BuildOutput> {
    // 1. Parse AST
    const graph = await this.parse();

    // 2. Generate entrypoints and bundle Lambdas
    const lambdaBundles: Record<string, string> = {};
    const lambdaArtifactDirs: Record<string, string> = {};

    for (const api of graph.apis) {
      const entrypointPath = await this.entrypointGen.generateApi(api);
      const bundlePath = await this.bundler.bundle(api.id, entrypointPath);
      lambdaBundles[api.id] = bundlePath;
      lambdaArtifactDirs[api.id] = path.dirname(bundlePath);
    }

    for (const consumer of graph.consumers) {
      const entrypointPath = await this.entrypointGen.generateConsumer(consumer);
      const bundlePath = await this.bundler.bundle(consumer.id, entrypointPath);
      lambdaBundles[consumer.id] = bundlePath;
      lambdaArtifactDirs[consumer.id] = path.dirname(bundlePath);
    }

    // 3. Synthesize CloudFormation template
    const templatePath = await this.synthesizer.synthesize(graph, lambdaArtifactDirs);

    return {
      distDir: path.join(this.projectRoot, ".syncploy"),
      templatePath,
      lambdaBundles,
    };
  }
}
