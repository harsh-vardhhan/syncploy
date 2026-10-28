# Syncploy Plugin for Coding Agents

This plugin equips AI coding agents (Antigravity, Claude Code, Cursor, Open Code) with specialized knowledge and deterministic safety rails for **Pure AWS Serverless** development using **Syncploy**.

## What This Plugin Enables

- **Zero-YAML AWS Development**: Directs the agent to declare APIs, DynamoDB tables, SQS queues, and S3 event pipelines directly in TypeScript with `@syncploy/sdk`.
- **Compile-Time Recursion Guard**: Prevents the agent from introducing recursive event cycles (`Table -> Stream -> Table.put` or `Queue -> Consumer -> Queue.send`).
- **Denial-of-Wallet Protections**: Enforces SQS visibility timeout ratios, dead-letter queues (DLQs), and Lambda Function URL concurrency limits automatically.
- **Zero-Data-Loss Safety Gate**: Diff engine blocks deployment if any stateful database or bucket would be destroyed and recreated.

## References

- Official Website: [https://www.syncploy.com](https://www.syncploy.com)
- Agent Summary: [https://www.syncploy.com/llms.txt](https://www.syncploy.com/llms.txt)
- Full SDK Documentation: [https://www.syncploy.com/llms-full.txt](https://www.syncploy.com/llms-full.txt)
