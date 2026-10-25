import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
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

export interface TableIndexDefinition {
  partitionKey: string;
  sortKey?: string;
  projection?: "ALL" | "KEYS_ONLY";
}

export interface TableOptions {
  partitionKey: { name: string; type: "string" | "number" | "binary" };
  sortKey?: { name: string; type: "string" | "number" | "binary" };
  billingMode?: "PAY_PER_REQUEST" | "PROVISIONED";
  stream?: "NEW_IMAGE" | "OLD_IMAGE" | "NEW_AND_OLD_IMAGES" | "KEYS_ONLY";
  pointInTimeRecovery?: boolean;
  indexes?: Record<string, TableIndexDefinition>;
}

export class Table {
  readonly _kind = "table" as const;
  private docClient?: DynamoDBDocumentClient;

  constructor(public readonly name: string, public readonly options: TableOptions) {}

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
}
