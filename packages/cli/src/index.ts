#!/usr/bin/env bun
import { Command } from "commander";
import pc from "picocolors";
import * as path from "node:path";
import * as http from "node:http";
import { Compiler } from "@syncploy/compiler";

const program = new Command();

program
  .name("syncploy")
  .description("Infrastructure-from-Code Compiler for Pure AWS Serverless")
  .version("0.1.0");

program
  .command("build")
  .description("Compile TypeScript application into AWS CloudFormation and Lambda bundles")
  .argument("[dir]", "Project root directory", ".")
  .action(async (dir) => {
    const projectRoot = path.resolve(process.cwd(), dir);
    console.log(pc.cyan(`⚡ Compiling project at ${pc.bold(projectRoot)}...`));

    try {
      const startTime = performance.now();
      const compiler = new Compiler(projectRoot);
      const graph = await compiler.parse();

      console.log(pc.bold("\nDiscovered Infrastructure:"));
      console.log(
        `  ${pc.green("•")} ${pc.bold("APIs:")}    ${
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
        `  ${pc.green("•")} ${pc.bold("Tables:")}  ${graph.tables.length > 0 ? graph.tables.map((t) => t.name).join(", ") : pc.dim("none")}`
      );
      console.log(
        `  ${pc.green("•")} ${pc.bold("Buckets:")} ${graph.buckets.length > 0 ? graph.buckets.map((b) => b.name).join(", ") : pc.dim("none")}`
      );
      console.log(
        `  ${pc.green("•")} ${pc.bold("Queues:")}  ${graph.queues.length > 0 ? graph.queues.map((q) => q.name).join(", ") : pc.dim("none")}`
      );

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
  .command("dev")
  .description("Start local development simulator with instant routing")
  .argument("[dir]", "Project root directory", ".")
  .option("-p, --port <number>", "Port to listen on", "4000")
  .action(async (dir, opts) => {
    const projectRoot = path.resolve(process.cwd(), dir);
    const port = parseInt(opts.port, 10);
    console.log(pc.green(`🚀 Starting Syncploy local development server...`));

    try {
      const compiler = new Compiler(projectRoot);
      const output = await compiler.build();
      const graph = await compiler.parse();

      // Load bundled handlers in memory
      const handlers: Array<{
        method: string;
        pathRegex: RegExp;
        paramNames: string[];
        handler: Function;
        rawPath: string;
      }> = [];

      for (const api of graph.apis) {
        const bundlePath = output.lambdaBundles[api.id];
        if (!bundlePath) continue;

        const mod = await import(bundlePath);

        // Convert /users/:id into regex
        const paramNames: string[] = [];
        const regexStr = api.path.replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
          paramNames.push(name);
          return "([^/]+)";
        });

        handlers.push({
          method: api.method,
          pathRegex: new RegExp(`^${regexStr}$`),
          paramNames,
          handler: mod.handler,
          rawPath: api.path,
        });
      }

      const server = http.createServer(async (req, res) => {
        const method = req.method?.toUpperCase();
        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        const pathname = url.pathname;

        // Match handler
        const match = handlers.find(
          (h) => (h.method === method || h.method === "ANY") && h.pathRegex.test(pathname)
        );

        if (!match) {
          res.writeHead(404, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "NotFound", message: `No route for ${method} ${pathname}` }));
          return;
        }

        // Extract path parameters
        const matchResult = pathname.match(match.pathRegex);
        const pathParameters: Record<string, string> = {};
        if (matchResult) {
          match.paramNames.forEach((name, idx) => {
            const val = matchResult[idx + 1];
            if (val !== undefined) pathParameters[name] = val;
          });
        }

        // Read body
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        }
        const bodyStr = Buffer.concat(chunks).toString("utf-8");

        const queryParameters: Record<string, string> = {};
        url.searchParams.forEach((val, key) => {
          queryParameters[key] = val;
        });

        const mockEvent = {
          rawPath: pathname,
          requestContext: {
            http: {
              method,
              path: pathname,
            },
          },
          headers: req.headers,
          pathParameters,
          queryStringParameters: queryParameters,
          body: bodyStr || null,
          isBase64Encoded: false,
        };

        try {
          const result = await match.handler(mockEvent);
          res.writeHead(result.statusCode || 200, result.headers || {});
          res.end(result.body);
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "InternalError", message: err.message }));
        }
      });

      server.listen(port, () => {
        console.log(pc.bold(`\nLocal Server ready at: ${pc.cyan(`http://localhost:${port}`)}`));
        console.log(pc.dim("Registered Routes:"));
        for (const api of graph.apis) {
          const typeTag = api.ingress === "function-url" ? pc.magenta("[URL]") : pc.blue("[GW] ");
          console.log(`  ${typeTag} ${pc.cyan(api.method.padEnd(7))} ${api.path}`);
        }
      });
    } catch (err: any) {
      console.error(pc.red(`Failed to start dev server: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
