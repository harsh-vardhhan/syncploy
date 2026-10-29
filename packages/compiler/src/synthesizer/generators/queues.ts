import type { ResourceGraph } from "../../types";
import { getQueueLogicalId, getDLQLogicalId, resolvePhysicalName } from "../logical-ids";

export function generateQueues(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  for (const queue of graph.queues) {
    const resourceKey = getQueueLogicalId(queue);
    const queueProps: any = {
      VisibilityTimeout: queue.visibilityTimeout ?? 180,
    };
    if (queue.queueName) {
      queueProps.QueueName = resolvePhysicalName(queue.queueName, undefined);
    }

    if (queue.deadLetterQueue) {
      const dlqKey = getDLQLogicalId(queue);
      const dlqProps: any = {};
      if (queue.deadLetterQueue.queueName) {
        dlqProps.QueueName = resolvePhysicalName(
          queue.deadLetterQueue.queueName,
          undefined
        );
      }
      resources[dlqKey] = {
        Type: "AWS::SQS::Queue",
        Properties: {
          ...dlqProps,
          Tags: [{ Key: "user:StackName", Value: { "Fn::Sub": "${AWS::StackName}" } }],
        },
      };

      queueProps["RedrivePolicy"] = {
        deadLetterTargetArn: { "Fn::GetAtt": [dlqKey, "Arn"] },
        maxReceiveCount: queue.deadLetterQueue.maxReceiveCount,
      };
    }

    queueProps["Tags"] = [
      { Key: "user:StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
    ];

    resources[resourceKey] = {
      Type: "AWS::SQS::Queue",
      Properties: queueProps,
    };
  }
}
