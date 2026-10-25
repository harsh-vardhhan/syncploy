import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { ContainerOptions } from "./container";

export type Duration = `${number}s` | `${number}m` | `${number}h` | number;
export type MemorySize = `${number}MB` | `${number}GB` | number;

export interface PolicyStatement {
  effect?: "Allow" | "Deny";
  actions: string[];
  resources: string[];
}

export interface TopicSubscription {
  protocol: "email" | "sms" | "sqs" | "lambda";
  endpoint: string;
}

export interface TopicOptions {
  fifo?: boolean;
  subscriptions?: TopicSubscription[];
}

export interface TopicSubscriberOptions {
  timeout?: Duration;
  concurrency?: number;
  memory?: MemorySize;
  policies?: PolicyStatement[];
  environment?: Record<string, string>;
  container?: ContainerOptions | boolean;
}

export interface TopicSubscriber<T = any> {
  readonly _kind: "topic_subscriber";
  readonly topic: Topic<T>;
  readonly options: TopicSubscriberOptions;
  readonly handler: (message: T, ctx: any) => Promise<void> | void;
}

export class Topic<T = any> {
  readonly _kind = "topic" as const;
  readonly name: string;
  readonly options: TopicOptions;
  private snsClient?: SNSClient;

  constructor(name: string, options: TopicOptions = {}) {
    this.name = name;
    this.options = options;
  }

  public get topicArn(): string {
    const envKey = `SYNCPLOY_TOPIC_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return process.env[envKey] || process.env[this.name] || this.name;
  }

  public getClient(): SNSClient {
    if (!this.snsClient) {
      const endpoint =
        process.env.SNS_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL_SNS ||
        process.env.AWS_ENDPOINT_URL;

      this.snsClient = new SNSClient({
        ...(endpoint ? { endpoint } : {}),
      });
    }
    return this.snsClient;
  }

  async publish(message: T, options: { subject?: string } = {}): Promise<string> {
    const messageString = typeof message === "string" ? message : JSON.stringify(message);
    const res = await this.getClient().send(
      new PublishCommand({
        TopicArn: this.topicArn,
        Message: messageString,
        Subject: options.subject,
      })
    );
    return res.MessageId || "";
  }

  subscribe(
    optionsOrHandler: TopicSubscriberOptions | ((message: T, ctx: any) => Promise<void> | void),
    maybeHandler?: (message: T, ctx: any) => Promise<void> | void
  ): TopicSubscriber<T> {
    const options: TopicSubscriberOptions =
      typeof optionsOrHandler === "function" ? {} : optionsOrHandler;
    const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler!;

    return {
      _kind: "topic_subscriber",
      topic: this,
      options,
      handler,
    };
  }

  email(endpoint: string): this {
    if (!this.options.subscriptions) {
      (this.options as any).subscriptions = [];
    }
    this.options.subscriptions!.push({ protocol: "email", endpoint });
    return this;
  }
}
