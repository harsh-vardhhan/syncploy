#!/usr/bin/env bun
import { Command } from "commander";
import pc from "picocolors";
import * as path from "node:path";
import * as fs from "node:fs";
import { Compiler } from "@syncploy/compiler";

const program = new Command();

program
  .name("syncploy")
  .description("Infrastructure-from-Code Compiler for Pure AWS Serverless")
  .version("0.1.0");

program
  .command("build", { isDefault: true })
  .description("Compile TypeScript application into AWS CloudFormation and Lambda bundles")
  .argument("[dir]", "Project root directory", ".")
  .action(async (dir) => {
    const projectRoot = path.resolve(process.cwd(), dir);
    const envPath = path.join(projectRoot, ".env");
    if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(envPath);
      } catch {}
    }
    console.log(pc.cyan(`⚡ Compiling project at ${pc.bold(projectRoot)}...`));

    try {
      const startTime = performance.now();
      const compiler = new Compiler(projectRoot);
      const graph = await compiler.parse();

      console.log(pc.bold("\nDiscovered Infrastructure:"));
      console.log(
        `  ${pc.green("•")} ${pc.bold("APIs:")}        ${
          graph.apis.length > 0
            ? graph.apis
                .map(
                  (a) =>
                    `${a.method} ${a.path} ${
                      a.ingress === "function-url" ? pc.magenta("[URL]") : pc.blue("[GW]")
                    }`
                )
                .join(", ")
            : pc.dim("none")
        }`
      );
      console.log(
        `  ${pc.green("•")} ${pc.bold("Tables:")}      ${graph.tables.length > 0 ? graph.tables.map((t) => t.name).join(", ") : pc.dim("none")}`
      );
      if (graph.tableStreams.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Streams:")}     ${graph.tableStreams.map((s) => `${s.id} (${s.tableName})`).join(", ")}`
        );
      }
      console.log(
        `  ${pc.green("•")} ${pc.bold("Buckets:")}     ${graph.buckets.length > 0 ? graph.buckets.map((b) => b.name).join(", ") : pc.dim("none")}`
      );
      console.log(
        `  ${pc.green("•")} ${pc.bold("Queues:")}      ${graph.queues.length > 0 ? graph.queues.map((q) => q.name).join(", ") : pc.dim("none")}`
      );
      if (graph.consumers.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Consumers:")}   ${graph.consumers.map((c) => `${c.id} (${c.queueName})`).join(", ")}`
        );
      }
      if (graph.topics.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Topics:")}      ${graph.topics.map((t) => t.name).join(", ")}`
        );
      }
      if (graph.topicSubscribers.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Subscribers:")} ${graph.topicSubscribers.map((s) => `${s.id} (${s.topicName})`).join(", ")}`
        );
      }
      if (graph.alarms.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Alarms:")}      ${graph.alarms.map((a) => a.name).join(", ")}`
        );
      }
      if (graph.deliveryStreams && graph.deliveryStreams.length > 0) {
        console.log(
          `  ${pc.green("•")} ${pc.bold("Firehose:")}    ${graph.deliveryStreams.map((d) => `${d.name} -> ${d.destinationBucketName}`).join(", ")}`
        );
      }

      console.log(pc.cyan("\nBundling Lambdas & synthesizing CloudFormation..."));
      const output = await compiler.build();

      const duration = (performance.now() - startTime).toFixed(1);
      console.log(pc.green(`\n✔ Build succeeded in ${pc.bold(`${duration}ms`)}`));
      console.log(`  ${pc.dim("Template:")} ${output.templatePath}`);
      console.log(
        `  ${pc.dim("Artifacts:")} ${Object.keys(output.lambdaBundles).length} Lambdas in ${output.distDir}/build/`
      );
    } catch (err: any) {
      console.error(pc.red(`\n✖ Build failed: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("diff")
  .description("Compare synthesized infrastructure against an existing template or deployed AWS stack")
  .argument("[dir]", "Project root directory", ".")
  .option("-a, --against <file>", "Existing template file to diff against (e.g. template.yaml, template.json)")
  .option("-s, --stack-name <name>", "AWS CloudFormation stack name for pre-flight live ChangeSet diff")
  .option("--region <region>", "AWS region for live ChangeSet diff")
  .option("--check-replacement", "Block and exit with error if any stateful resource would be replaced")
  .option("--allow-stateful-replacement", "Bypass stateful resource replacement block")
  .action(async (dir, opts) => {
    const projectRoot = path.resolve(process.cwd(), dir);
    const envPath = path.join(projectRoot, ".env");
    if (fs.existsSync(envPath) && typeof (process as any).loadEnvFile === "function") {
      try {
        (process as any).loadEnvFile(envPath);
      } catch {}
    }

    try {
      const { runDiff } = await import("./diff");
      await runDiff({
        projectRoot,
        against: opts.against ? path.resolve(process.cwd(), opts.against) : undefined,
        stackName: opts.stackName,
        region: opts.region,
        checkReplacement: !!opts.checkReplacement,
        allowStatefulReplacement: !!opts.allowStatefulReplacement,
      });
    } catch (err: any) {
      console.error(pc.red(`\n✖ Diff failed: ${err.message}`));
      process.exit(1);
    }
  });

program
  .command("adopt")
  .description("Automatically adopt an existing SAM or CloudFormation template into Syncploy TypeScript code")
  .argument("<template>", "Path to SAM or CloudFormation template (e.g. template.yaml, template.json)")
  .option("-c, --config <samconfig>", "Path to samconfig.toml to extract parameter overrides")
  .option("-o, --out <file>", "Output TypeScript file path (e.g. src/infra.ts)")
  .option("-p, --params <params...>", "Inline parameter overrides in Key=Value format")
  .action(async (templatePath, opts) => {
    try {
      const { adoptTemplate } = await import("./adopt");
      const inlineParams: Record<string, string> = {};
      if (opts.params) {
        for (const item of opts.params) {
          const [k, v] = item.split("=");
          if (k && v !== undefined) inlineParams[k] = v;
        }
      }

      console.log(pc.cyan(`⚡ Adopting infrastructure from ${pc.bold(templatePath)}...`));
      const result = adoptTemplate({
        templatePath,
        config: opts.config,
        params: inlineParams,
        out: opts.out,
      });

      const totalAdopted =
        result.adoptedResources.tables.length +
        result.adoptedResources.buckets.length +
        result.adoptedResources.queues.length +
        result.adoptedResources.topics.length +
        result.adoptedResources.deliveryStreams.length +
        result.adoptedResources.alarms.length +
        result.adoptedResources.functions.length;

      console.log(pc.green(pc.bold(`\n✔ Successfully adopted ${totalAdopted} resources:`)));
      if (result.adoptedResources.tables.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Tables:")}          ${result.adoptedResources.tables.join(", ")}`);
      }
      if (result.adoptedResources.buckets.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Buckets:")}         ${result.adoptedResources.buckets.join(", ")}`);
      }
      if (result.adoptedResources.queues.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Queues:")}          ${result.adoptedResources.queues.join(", ")}`);
      }
      if (result.adoptedResources.topics.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Topics:")}          ${result.adoptedResources.topics.join(", ")}`);
      }
      if (result.adoptedResources.deliveryStreams.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("DeliveryStreams:")}  ${result.adoptedResources.deliveryStreams.join(", ")}`);
      }
      if (result.adoptedResources.alarms.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Alarms:")}          ${result.adoptedResources.alarms.join(", ")}`);
      }
      if (result.adoptedResources.functions.length > 0) {
        console.log(`  ${pc.green("•")} ${pc.bold("Functions:")}       ${result.adoptedResources.functions.join(", ")}`);
      }

      if (result.unmodeledResources.length > 0) {
        console.log(pc.yellow(pc.bold(`\n⚠ Unmodeled CloudFormation resources:`)));
        for (const unmodeled of result.unmodeledResources) {
          console.log(`  ${pc.yellow("•")} ${unmodeled}`);
        }
      }

      if (opts.out) {
        console.log(pc.cyan(`\n📁 Generated TypeScript code written to: ${pc.bold(opts.out)}`));
      } else {
        console.log(pc.dim("\nGenerated TypeScript Code:\n"));
        console.log(result.code);
      }
    } catch (err: any) {
      console.error(pc.red(`\n✖ Adoption failed: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
