import * as path from "node:path";
import { Parser } from "./parser";
import { EntrypointGenerator } from "./entrypoint";
import { Bundler } from "./bundler";
import { Synthesizer } from "./synthesizer";
import { GraphValidator, formatDiagnostics } from "./validator";
import type { BuildOutput, BuildOptions, ResourceGraph, BundleStats } from "./types";

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

  public async build(options?: BuildOptions): Promise<BuildOutput> {
    // 1. Parse AST
    const graph = await this.parse();

    // 2. Pre-flight static validation of AWS platform constraints
    const validator = new GraphValidator(options);
    const validation = validator.validate(graph);

    if (validation.warnings.length > 0 || (validation.suppressions && validation.suppressions.length > 0)) {
      console.warn(
        formatDiagnostics({
          valid: true,
          errors: [],
          warnings: validation.warnings,
          suppressions: validation.suppressions,
        })
      );
    }

    if (!validation.valid) {
      const formattedErrors = formatDiagnostics(validation);
      console.error(formattedErrors);
      throw new Error(`Pre-flight validation failed with ${validation.errors.length} error(s).`);
    }

    // 3. Generate entrypoints and bundle Lambdas
    const lambdaBundles: Record<string, string> = {};
    const lambdaArtifactDirs: Record<string, string> = {};
    const bundleStats: Record<string, BundleStats> = {};

    for (const api of graph.apis) {
      const entrypointPath = await this.entrypointGen.generateApi(api);
      const res = await this.bundler.bundle(api.id, entrypointPath);
      lambdaBundles[api.id] = res.bundlePath;
      lambdaArtifactDirs[api.id] = path.dirname(res.bundlePath);
      bundleStats[api.id] = { sizeBytes: res.sizeBytes, sizeMB: res.sizeMB, warning: res.warning };
    }

    for (const consumer of graph.consumers) {
      const entrypointPath = await this.entrypointGen.generateConsumer(consumer);
      const res = await this.bundler.bundle(consumer.id, entrypointPath);
      lambdaBundles[consumer.id] = res.bundlePath;
      lambdaArtifactDirs[consumer.id] = path.dirname(res.bundlePath);
      bundleStats[consumer.id] = { sizeBytes: res.sizeBytes, sizeMB: res.sizeMB, warning: res.warning };
    }

    for (const streamConsumer of graph.tableStreams) {
      const entrypointPath = await this.entrypointGen.generateTableStream(streamConsumer);
      const res = await this.bundler.bundle(streamConsumer.id, entrypointPath);
      lambdaBundles[streamConsumer.id] = res.bundlePath;
      lambdaArtifactDirs[streamConsumer.id] = path.dirname(res.bundlePath);
      bundleStats[streamConsumer.id] = { sizeBytes: res.sizeBytes, sizeMB: res.sizeMB, warning: res.warning };
    }

    for (const subscriber of graph.topicSubscribers) {
      const entrypointPath = await this.entrypointGen.generateTopicSubscriber(subscriber);
      const res = await this.bundler.bundle(subscriber.id, entrypointPath);
      lambdaBundles[subscriber.id] = res.bundlePath;
      lambdaArtifactDirs[subscriber.id] = path.dirname(res.bundlePath);
      bundleStats[subscriber.id] = { sizeBytes: res.sizeBytes, sizeMB: res.sizeMB, warning: res.warning };
    }

    // 4. Synthesize CloudFormation template
    const templatePath = await this.synthesizer.synthesize(graph, lambdaArtifactDirs);

    return {
      distDir: path.join(this.projectRoot, ".syncploy"),
      templatePath,
      lambdaBundles,
      bundleStats,
      cfnStats: this.synthesizer.lastStats,
    };
  }
}
