import type {
  ResourceGraph,
  TableIR,
  BucketIR,
  QueueIR,
  TopicIR,
  DeliveryStreamIR,
  AlarmIR,
  AuthIR,
} from "../types";

export function sanitizeName(name: string): string {
  return name.replace(/[^A-Za-z0-9]/g, "");
}

export function toDdbType(type: "string" | "number" | "binary"): string {
  switch (type) {
    case "string":
      return "S";
    case "number":
      return "N";
    case "binary":
      return "B";
    default:
      return "S";
  }
}

export function resolvePhysicalName(name: string | undefined, defaultSub: any): any {
  if (!name) return defaultSub;
  return name.includes("${") ? { "Fn::Sub": name } : name;
}

export function getTableLogicalId(tableOrName: TableIR | string, graph?: ResourceGraph): string {
  if (typeof tableOrName === "string") {
    const found = graph?.tables.find((t) => t.name === tableOrName || t.id === tableOrName);
    if (found && found.logicalId) return found.logicalId;
    return `Table${sanitizeName(tableOrName)}`;
  }
  return tableOrName.logicalId || `Table${sanitizeName(tableOrName.name)}`;
}

export function getBucketLogicalId(bucketOrName: BucketIR | string, graph?: ResourceGraph): string {
  if (typeof bucketOrName === "string") {
    const found = graph?.buckets.find((b) => b.name === bucketOrName || b.id === bucketOrName);
    if (found && found.logicalId) return found.logicalId;
    return `Bucket${sanitizeName(bucketOrName)}`;
  }
  return bucketOrName.logicalId || `Bucket${sanitizeName(bucketOrName.name)}`;
}

export function getQueueLogicalId(queueOrName: QueueIR | string, graph?: ResourceGraph): string {
  if (typeof queueOrName === "string") {
    const found = graph?.queues.find((q) => q.name === queueOrName || q.id === queueOrName);
    if (found && found.logicalId) return found.logicalId;
    return `Queue${sanitizeName(queueOrName)}`;
  }
  return queueOrName.logicalId || `Queue${sanitizeName(queueOrName.name)}`;
}

export function getDLQLogicalId(queue: QueueIR): string {
  return queue.deadLetterQueue?.logicalId || `Queue${sanitizeName(queue.name)}DLQ`;
}

export function getTopicLogicalId(topicOrName: TopicIR | string, graph?: ResourceGraph): string {
  if (typeof topicOrName === "string") {
    const found = graph?.topics?.find((t) => t.name === topicOrName || t.id === topicOrName);
    if (found && found.logicalId) return found.logicalId;
    return `Topic${sanitizeName(topicOrName)}`;
  }
  return topicOrName.logicalId || `Topic${sanitizeName(topicOrName.name)}`;
}

export function getDeliveryStreamLogicalId(dsOrName: DeliveryStreamIR | string, graph?: ResourceGraph): string {
  if (typeof dsOrName === "string") {
    const found = graph?.deliveryStreams?.find((d) => d.name === dsOrName || d.id === dsOrName);
    if (found && found.logicalId) return found.logicalId;
    return `DeliveryStream${sanitizeName(dsOrName)}`;
  }
  return dsOrName.logicalId || `DeliveryStream${sanitizeName(dsOrName.name)}`;
}

export function getFunctionLogicalId(func: { id: string; logicalId?: string | undefined }): string {
  return func.logicalId || `Function${sanitizeName(func.id)}`;
}

export function getAlarmLogicalId(alarm: AlarmIR): string {
  return alarm.logicalId || `Alarm${sanitizeName(alarm.name)}`;
}

export function getAuthLogicalId(authOrName: AuthIR | string, graph?: ResourceGraph): string {
  if (typeof authOrName === "string") {
    const found = graph?.auths?.find((a) => a.name === authOrName || a.id === authOrName);
    if (found && found.logicalId) return found.logicalId;
    return `Auth${sanitizeName(authOrName)}UserPool`;
  }
  return authOrName.logicalId || `Auth${sanitizeName(authOrName.name)}UserPool`;
}

export function getAuthClientLogicalId(authOrName: AuthIR | string, graph?: ResourceGraph): string {
  if (typeof authOrName === "string") {
    const found = graph?.auths?.find((a) => a.name === authOrName || a.id === authOrName);
    if (found && found.client?.clientLogicalId) return found.client.clientLogicalId;
    const userPoolKey = getAuthLogicalId(authOrName, graph);
    return `${userPoolKey}Client`;
  }
  return authOrName.client?.clientLogicalId || `${getAuthLogicalId(authOrName, graph)}Client`;
}
