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

program.parse(process.argv);
