import type { ResourceGraph } from "../../types";
import type { ValidationContext } from "../types";
import {
  getTableLogicalId,
  getBucketLogicalId,
  getQueueLogicalId,
  getTopicLogicalId,
  getDeliveryStreamLogicalId,
  getAlarmLogicalId,
  getAuthLogicalId,
  getAuthClientLogicalId,
  getFunctionLogicalId,
} from "../../synthesizer/logical-ids";

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
    ...graph.topics,
    ...graph.deliveryStreams,
    ...graph.alarms,
    ...graph.auths.map((a) => ({ logicalId: a.logicalId, id: a.id, sourceFile: a.sourceFile })),
    ...graph.auths
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

  // Pre-flight duplicate logical ID collision guard
  const logicalIdMap = new Map<string, { id: string; sourceFile?: string | undefined }>();
  const registerLogicalId = (logicalId: string, id: string, sourceFile?: string) => {
    if (logicalIdMap.has(logicalId)) {
      const existing = logicalIdMap.get(logicalId)!;
      ctx.addError(
        "ERR_CFN_LOGICAL_ID",
        id,
        `Duplicate CloudFormation Logical ID '${logicalId}' detected between resource '${id}' and '${existing.id}'. AWS CloudFormation requires unique logical IDs across the template. Consider specifying explicit, distinct 'logicalId' options on each construct.`,
        sourceFile
      );
    } else {
      logicalIdMap.set(logicalId, { id, sourceFile });
    }
  };

  for (const t of graph.tables) registerLogicalId(getTableLogicalId(t, graph), t.id, t.sourceFile);
  for (const b of graph.buckets) registerLogicalId(getBucketLogicalId(b, graph), b.id, b.sourceFile);
  for (const q of graph.queues) registerLogicalId(getQueueLogicalId(q, graph), q.id, q.sourceFile);
  for (const top of graph.topics) registerLogicalId(getTopicLogicalId(top, graph), top.id, top.sourceFile);
  for (const ds of graph.deliveryStreams) registerLogicalId(getDeliveryStreamLogicalId(ds, graph), ds.id, ds.sourceFile);
  for (const al of graph.alarms) registerLogicalId(getAlarmLogicalId(al), al.id, al.sourceFile);
  for (const a of graph.auths) {
    registerLogicalId(getAuthLogicalId(a, graph), a.id, a.sourceFile);
    if (a.client) {
      registerLogicalId(getAuthClientLogicalId(a, graph), `${a.id}_Client`, a.sourceFile);
    }
  }
  for (const api of graph.apis) registerLogicalId(getFunctionLogicalId(api), api.id, api.sourceFile);
  for (const c of graph.consumers) registerLogicalId(getFunctionLogicalId(c), c.id, c.sourceFile);
  for (const s of graph.tableStreams) registerLogicalId(getFunctionLogicalId(s), s.id, s.sourceFile);
  for (const sub of graph.topicSubscribers) registerLogicalId(getFunctionLogicalId(sub), sub.id, sub.sourceFile);
}
