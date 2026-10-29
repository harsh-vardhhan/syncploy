import type { ResourceGraph } from "../../types";
import {
  getTableLogicalId,
  getBucketLogicalId,
  getQueueLogicalId,
  getTopicLogicalId,
  getDeliveryStreamLogicalId,
  getFunctionLogicalId,
  getAuthLogicalId,
  getAuthClientLogicalId,
} from "../logical-ids";

export function buildCommonEnvironment(graph: ResourceGraph): Record<string, any> {
  const envVars: Record<string, any> = {};

  for (const table of graph.tables) {
    const logicalId = getTableLogicalId(table);
    const upperName = table.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    envVars[`SYNCPLOY_TABLE_${upperName}`] = { Ref: logicalId };
    envVars[`TABLE_${upperName}_NAME`] = { Ref: logicalId };
    envVars[`${upperName}_TABLE_NAME`] = { Ref: logicalId };
    envVars[table.name] = { Ref: logicalId };
  }

  for (const bucket of graph.buckets) {
    const logicalId = getBucketLogicalId(bucket);
    const upperName = bucket.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    envVars[`SYNCPLOY_BUCKET_${upperName}`] = { Ref: logicalId };
    envVars[`BUCKET_${upperName}_NAME`] = { Ref: logicalId };
    envVars[`${upperName}_BUCKET_NAME`] = { Ref: logicalId };
    envVars[bucket.name] = { Ref: logicalId };
  }

  for (const queue of graph.queues) {
    const logicalId = getQueueLogicalId(queue);
    const upperName = queue.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    envVars[`SYNCPLOY_QUEUE_${upperName}`] = { Ref: logicalId };
    envVars[`QUEUE_${upperName}_URL`] = { Ref: logicalId };
    envVars[`${upperName}_QUEUE_URL`] = { Ref: logicalId };
    envVars[queue.name] = { Ref: logicalId };
    envVars[`SYNCPLOY_QUEUE_${upperName}_ARN`] = { "Fn::GetAtt": [logicalId, "Arn"] };
    envVars[`QUEUE_${upperName}_ARN`] = { "Fn::GetAtt": [logicalId, "Arn"] };
    envVars[`${upperName}_QUEUE_ARN`] = { "Fn::GetAtt": [logicalId, "Arn"] };
  }

  for (const topic of graph.topics || []) {
    const logicalId = getTopicLogicalId(topic);
    const upperName = topic.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    envVars[`SYNCPLOY_TOPIC_${upperName}`] = { Ref: logicalId };
    envVars[`TOPIC_${upperName}_ARN`] = { Ref: logicalId };
    envVars[`${upperName}_TOPIC_ARN`] = { Ref: logicalId };
    envVars[topic.name] = { Ref: logicalId };
  }

  for (const ds of graph.deliveryStreams || []) {
    const logicalId = getDeliveryStreamLogicalId(ds);
    const upperName = ds.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const baseUpper = upperName.replace(/_?(DELIVERY)?_?STREAM$/, "");

    envVars[`SYNCPLOY_DELIVERY_STREAM_${upperName}`] = { Ref: logicalId };
    envVars[`DELIVERY_STREAM_${upperName}_NAME`] = { Ref: logicalId };
    envVars[`${upperName}_DELIVERY_STREAM_NAME`] = { Ref: logicalId };
    if (baseUpper) {
      envVars[`${baseUpper}_DELIVERY_STREAM_NAME`] = { Ref: logicalId };
    }
    envVars[ds.name] = { Ref: logicalId };
  }

  for (const auth of graph.auths || []) {
    const userPoolLogicalId = getAuthLogicalId(auth, graph);
    const clientLogicalId = getAuthClientLogicalId(auth, graph);
    const upperName = auth.name.toUpperCase().replace(/[^A-Z0-9]/g, "_");

    envVars[`SYNCPLOY_AUTH_${upperName}_USER_POOL_ID`] = { Ref: userPoolLogicalId };
    envVars[`SYNCPLOY_AUTH_${upperName}_CLIENT_ID`] = { Ref: clientLogicalId };
    envVars["COGNITO_USER_POOL_ID"] = { Ref: userPoolLogicalId };
    envVars["COGNITO_CLIENT_ID"] = { Ref: clientLogicalId };
    envVars[`${upperName}_USER_POOL_ID`] = { Ref: userPoolLogicalId };
    envVars[`${upperName}_CLIENT_ID`] = { Ref: clientLogicalId };
  }

  for (const api of graph.apis) {
    const logicalId = getFunctionLogicalId(api);
    const upperName = api.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    envVars[`SYNCPLOY_FUNCTION_${upperName}`] = { Ref: logicalId };
    envVars[`FUNCTION_${upperName}_NAME`] = { Ref: logicalId };
    envVars[`${upperName}_FUNCTION_NAME`] = { Ref: logicalId };
    envVars[api.id] = { Ref: logicalId };
    if (api.id.toLowerCase().includes("backend")) {
      envVars["BACKEND_FUNCTION_NAME"] = { Ref: logicalId };
    }
  }

  return envVars;
}
