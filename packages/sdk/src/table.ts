import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import type { ContainerOptions } from "./container";
import type { Duration, MemorySize, PolicyStatement } from "./types";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  type QueryCommandInput,
  type ScanCommandInput,
} from "@aws-sdk/lib-dynamodb";

export type KeyDefinition = string | { name: string; type?: "string" | "number" | "binary" };

export interface TableIndexDefinition {
  partitionKey: KeyDefinition;
  sortKey?: KeyDefinition;
  projection?: "ALL" | "KEYS_ONLY";
}

export interface TableStreamOptions {
  batchSize?: number;
  startingPosition?: "LATEST" | "TRIM_HORIZON";
  enabled?: boolean;
  timeout?: Duration;
  concurrency?: number;
  retryAttempts?: number;
  bisectOnFunctionError?: boolean;
  onFailure?: string;
  memory?: MemorySize;
  policies?: PolicyStatement[];
  environment?: Record<string, string>;
  container?: ContainerOptions | boolean;
  logicalId?: string;
  functionName?: string;
  eventSourceMappingLogicalId?: string;
  mappingLogicalId?: string;
  roleLogicalId?: string;
}

export interface TableStreamConsumer<T = any> {
  readonly _kind: "table_stream";
  readonly table: Table;
  readonly options: TableStreamOptions;
  readonly handler: (record: T, ctx: any) => Promise<void> | void;
}

export interface TableOptions {
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
  stream?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
  pointInTimeRecovery?: boolean;
  indexes?: Record<string, TableIndexDefinition>;
  logicalId?: string;
  tableName?: string;
  retain?: boolean;
  deletionPolicy?: "Retain" | "Delete" | "Snapshot";
}

export class Table {
  readonly _kind = "table" as const;
  readonly name: string;
  readonly options: TableOptions;
  private docClient?: DynamoDBDocumentClient;

  constructor(name: string, options: TableOptions) {
    this.name = name;
    this.options = options;
  }

  public get tableName(): string {
    const envKey = `SYNCPLOY_TABLE_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return process.env[envKey] || process.env[this.name] || this.name;
  }

  public getClient(): DynamoDBDocumentClient {
    if (!this.docClient) {
      const endpoint =
        process.env.DYNAMODB_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL_DYNAMODB ||
        process.env.AWS_ENDPOINT_URL;

      const baseClient = new DynamoDBClient({
        ...(endpoint ? { endpoint } : {}),
      });

      this.docClient = DynamoDBDocumentClient.from(baseClient, {
        marshallOptions: { removeUndefinedValues: true },
      });
    }
    return this.docClient;
  }

  async get<T = any>(key: Record<string, any>): Promise<T | null> {
    const res = await this.getClient().send(
      new GetCommand({
        TableName: this.tableName,
        Key: key,
      })
    );
    return (res.Item as T) ?? null;
  }

  async put(item: Record<string, any>): Promise<void> {
    await this.getClient().send(
      new PutCommand({
        TableName: this.tableName,
        Item: item,
      })
    );
  }

  async delete(key: Record<string, any>): Promise<void> {
    await this.getClient().send(
      new DeleteCommand({
        TableName: this.tableName,
        Key: key,
      })
    );
  }

  async query<T = any>(
    params: Omit<QueryCommandInput, "TableName"> & { tableName?: string }
  ): Promise<T[]> {
    const res = await this.getClient().send(
      new QueryCommand({
        TableName: this.tableName,
        ...params,
      })
    );
    return (res.Items as T[]) ?? [];
  }

  async scan<T = any>(
    params?: Omit<ScanCommandInput, "TableName">
  ): Promise<T[]> {
    const res = await this.getClient().send(
      new ScanCommand({
        TableName: this.tableName,
        ...(params ?? {}),
      })
    );
    return (res.Items as T[]) ?? [];
  }

  stream<T = any>(
    optionsOrHandler: TableStreamOptions | ((record: T, ctx: any) => Promise<void> | void),
    maybeHandler?: (record: T, ctx: any) => Promise<void> | void
  ): TableStreamConsumer<T> {
    const options: TableStreamOptions =
      typeof optionsOrHandler === "function" ? {} : optionsOrHandler;
    const handler = typeof optionsOrHandler === "function" ? optionsOrHandler : maybeHandler!;

    return {
      _kind: "table_stream",
      table: this,
      options,
      handler,
    };
  }
}
