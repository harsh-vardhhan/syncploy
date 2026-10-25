import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import type { ContainerOptions } from "./container";

export type Duration = `${number}s` | `${number}m` | `${number}h` | number;
export type MemorySize = `${number}MB` | `${number}GB` | number;

export interface DeadLetterQueueOptions {
  maxReceiveCount: number;
}

export interface QueueOptions {
  visibilityTimeout?: Duration;
  deadLetterQueue?: DeadLetterQueueOptions;
  fifo?: boolean;
}

export interface PolicyStatement {
  effect?: "Allow" | "Deny";
  actions: string[];
  resources: string[];
}

export interface ConsumerOptions {
  batchSize?: number;
  timeout?: Duration;
  concurrency?: number;
  memory?: MemorySize;
  policies?: PolicyStatement[];
  environment?: Record<string, string>;
  container?: ContainerOptions | boolean;
}

export interface QueueConsumer<T = any> {
  readonly _kind: "queue_consumer";
  readonly queue: Queue;
  readonly options: ConsumerOptions;
  readonly handler: (event: T) => Promise<void> | void;
}

export class Queue {
  readonly _kind = "queue" as const;
  readonly name: string;
  readonly options: QueueOptions;
  private sqsClient?: SQSClient;

  constructor(name: string, options: QueueOptions = {}) {
    this.name = name;
    this.options = options;
  }

  public get queueUrl(): string {
    const envKey = `SYNCPLOY_QUEUE_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return process.env[envKey] || process.env[this.name] || this.name;
  }

  public getClient(): SQSClient {
    if (!this.sqsClient) {
      const endpoint =
        process.env.SQS_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL_SQS ||
        process.env.AWS_ENDPOINT_URL;

      this.sqsClient = new SQSClient({
        ...(endpoint ? { endpoint } : {}),
      });
    }
    return this.sqsClient;
  }

  async send(message: Record<string, any> | string, delaySeconds?: number): Promise<string> {
    const body = typeof message === "string" ? message : JSON.stringify(message);
    const res = await this.getClient().send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: body,
        ...(delaySeconds !== undefined ? { DelaySeconds: delaySeconds } : {}),
      })
    );
    return res.MessageId || "";
  }

  consumer<T = any>(
    options: ConsumerOptions,
    handler: (event: T) => Promise<void> | void
  ): QueueConsumer<T> {
    return {
      _kind: "queue_consumer",
      queue: this,
      options,
      handler,
    };
  }
}
