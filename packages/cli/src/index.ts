#!/usr/bin/env bun
import { Command } from "commander";
import pc from "picocolors";

const program = new Command();

program
  .name("syncploy")
  .description("Infrastructure-from-Code Compiler for Pure AWS Serverless")
  .version("0.1.0");

program
  .command("build")
  .description("Compile TypeScript application into AWS CloudFormation and Lambda bundles")
  .action(async () => {
    console.log(pc.cyan("⚡ Compiling with Syncploy..."));
  });

program
  .command("dev")
  .description("Start local development server with hot-reload and local emulators")
  .action(async () => {
    console.log(pc.green("🚀 Starting Syncploy local development server..."));
  });

program
  .command("deploy")
  .description("Deploy application directly to AWS CloudFormation")
  .action(async () => {
    console.log(pc.magenta("☁️ Deploying to AWS..."));
  });

program.parse(process.argv);
