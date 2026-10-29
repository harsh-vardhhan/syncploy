import type { ElectroEntityIR } from "../types";

export interface ParseContext {
  varToTableName: Record<string, string>;
  varToQueueName: Record<string, string>;
  varToBucketName: Record<string, string>;
  varToTopicName: Record<string, string>;
  varToDeliveryStreamName: Record<string, string>;
  varToAuthName: Record<string, string>;
  varToEntity: Record<string, ElectroEntityIR>;
  knownApis: { id: string; path: string }[];
}
