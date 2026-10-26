import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";

export const CFN_LOGICAL_ID_REGEX = /^[A-Za-z0-9]{1,255}$/;
export const S3_BUCKET_NAME_REGEX = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/;
export const IP_ADDRESS_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
export const SQS_QUEUE_NAME_REGEX = /^[a-zA-Z0-9_-]{1,80}(\.fifo)?$/;
export const DDB_TABLE_NAME_REGEX = /^[a-zA-Z0-9_.-]{3,255}$/;
export const FIREHOSE_STREAM_NAME_REGEX = /^[a-zA-Z0-9_.-]{1,64}$/;
export const LAMBDA_FUNCTION_NAME_REGEX = /^[a-zA-Z0-9-_]{1,64}$/;

export function validateLogicalIds(ctx: ValidationContext, graph: ResourceGraph): void {
  const allResources: { logicalId?: string | undefined; id: string; sourceFile?: string | undefined }[] = [
    ...graph.apis,
    ...graph.consumers,
    ...graph.tableStreams,
    ...graph.topicSubscribers,
    ...graph.buckets,
    ...graph.tables,
    ...graph.queues,
    ...(graph.topics || []),
    ...(graph.deliveryStreams || []),
    ...(graph.alarms || []),
    ...(graph.auths || []).map((a) => ({ logicalId: a.logicalId, id: a.id, sourceFile: a.sourceFile })),
    ...(graph.auths || [])
      .filter((a) => a.client?.clientLogicalId)
      .map((a) => ({ logicalId: a.client?.clientLogicalId, id: `${a.id}_Client`, sourceFile: a.sourceFile })),
  ];

  for (const r of allResources) {
    if (r.logicalId) {
      if (!CFN_LOGICAL_ID_REGEX.test(r.logicalId)) {
        const suggested = r.logicalId.replace(/[^A-Za-z0-9]/g, "");
        ctx.addError(
          "ERR_CFN_LOGICAL_ID",
          r.id,
          `Logical ID '${r.logicalId}' is invalid. AWS CloudFormation logical IDs must be strictly alphanumeric (no hyphens, underscores, or spaces). Consider using '${suggested}'.`,
          r.sourceFile
        );
      }
    }
  }
}
