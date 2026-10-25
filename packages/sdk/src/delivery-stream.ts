import type { Bucket } from "./bucket";
import type { Duration, MemorySize } from "./types";

export interface DeliveryStreamOptions {
  destination: Bucket | string;
  prefix?: string;
  errorPrefix?: string;
  bufferingInterval?: Duration;
  bufferingSize?: MemorySize;
  compression?: "GZIP" | "ZIP" | "SNAPPY" | "UNCOMPRESSED";
  logicalId?: string;
  streamName?: string;
}

export class DeliveryStream {
  readonly _kind = "delivery_stream" as const;
  readonly name: string;
  readonly options: DeliveryStreamOptions;

  constructor(name: string, options: DeliveryStreamOptions) {
    this.name = name;
    this.options = options;
  }

  public get streamName(): string {
    const envKey = `SYNCPLOY_DELIVERY_STREAM_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    return process.env[envKey] || process.env[this.name] || this.name;
  }
}
