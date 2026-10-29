import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import type { Queue } from "./queue";
import type { DeliveryStream } from "./delivery-stream";
import type { ContainerOptions } from "./container";
import type { Duration, MemorySize, PolicyStatement } from "./types";

export type TopicProtocol = "email" | "email-json" | "sms" | "sqs" | "lambda" | "https" | "http" | "firehose";

export interface ConstructTarget {
  readonly _kind: string;
}

export interface TopicSubscription {
  protocol: TopicProtocol;
  endpoint: Queue | DeliveryStream | ConstructTarget | string;
}

export interface TopicOptions {
  fifo?: boolean;
  subscriptions?: TopicSubscription[];
  logicalId?: string;
  topicName?: string;
}

export interface TopicSubscriberOptions {
  timeout?: Duration;
  concurrency?: number;
  memory?: MemorySize;
  policies?: PolicyStatement[];
  environment?: Record<string, string>;
  container?: ContainerOptions | boolean;
  logicalId?: string;
  functionName?: string;
  subscriptionLogicalId?: string;
  permissionLogicalId?: string;
  roleLogicalId?: string;
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

  subscriber(
    optionsOrHandler: TopicSubscriberOptions | ((message: T, ctx: any) => Promise<void> | void),
    maybeHandler?: (message: T, ctx: any) => Promise<void> | void
  ): TopicSubscriber<T> {
    return this.subscribe(optionsOrHandler, maybeHandler);
  }

  email(endpoint: string): this {
    if (!this.options.subscriptions) {
      (this.options as any).subscriptions = [];
    }
    this.options.subscriptions!.push({ protocol: "email", endpoint });
    return this;
  }
}
