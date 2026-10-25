import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import type { Queue } from "./queue";

export interface BucketObjectLockOptions {
  mode?: "COMPLIANCE" | "GOVERNANCE";
  days?: number;
  years?: number;
}

export interface BucketOptions {
  versioned?: boolean;
  public?: boolean;
  eventBridge?: boolean;
  publicAccessBlock?: boolean;
  objectLock?: boolean | BucketObjectLockOptions;
}

export class Bucket {
  readonly _kind = "bucket" as const;
  readonly name: string;
  readonly options: BucketOptions;
  private s3Client?: S3Client;

  constructor(name: string, options: BucketOptions = {}) {
    this.name = name;
    this.options = options;
  }

  public get bucketName(): string {
    const envKey = `SYNCPLOY_BUCKET_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return process.env[envKey] || process.env[this.name] || this.name;
  }

  public getClient(): S3Client {
    if (!this.s3Client) {
      const endpoint =
        process.env.S3_ENDPOINT ||
        process.env.AWS_ENDPOINT_URL_S3 ||
        process.env.AWS_ENDPOINT_URL;

      this.s3Client = new S3Client({
        ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      });
    }
    return this.s3Client;
  }

  async getText(key: string): Promise<string> {
    const res = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
    if (!res.Body) return "";
    return await res.Body.transformToString("utf-8");
  }

  async putText(key: string, content: string, contentType = "text/plain"): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: content,
        ContentType: contentType,
      })
    );
  }

  async getBuffer(key: string): Promise<Uint8Array> {
    const res = await this.getClient().send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
    if (!res.Body) return new Uint8Array();
    return await res.Body.transformToByteArray();
  }

  async putBuffer(
    key: string,
    buffer: Uint8Array | Buffer,
    contentType = "application/octet-stream"
  ): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      })
    );
  }

  async list(prefix?: string): Promise<string[]> {
    const res = await this.getClient().send(
      new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      })
    );
    return res.Contents?.map((item) => item.Key || "").filter(Boolean) ?? [];
  }

  on(
    _event: "objectCreated" | "objectRemoved",
    _target: Queue,
    _options?: { prefix?: string; suffix?: string }
  ): void {
    // Compile-time event binding marker
  }
}
