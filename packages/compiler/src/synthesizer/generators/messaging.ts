import type { ResourceGraph } from "../../types";
import {
  sanitizeName,
  getTopicLogicalId,
  getBucketLogicalId,
  getQueueLogicalId,
  getDeliveryStreamLogicalId,
  resolvePhysicalName,
} from "../logical-ids";

export function generateTopics(
  graph: ResourceGraph,
  resources: Record<string, any>,
  outputs: Record<string, any>
): void {
  for (const topic of graph.topics || []) {
    const resourceKey = getTopicLogicalId(topic);
    const topicProps: any = {
      TopicName: resolvePhysicalName(topic.topicName, { "Fn::Sub": `\${AWS::StackName}-${topic.name}` }),
    };
    if (topic.fifo) {
      topicProps["FifoTopic"] = true;
    }
    if (topic.subscriptions && topic.subscriptions.length > 0) {
      topicProps["Subscription"] = topic.subscriptions.map((s) => {
        let endpointVal: any = s.endpoint;
        if (s.protocol === "sqs") {
          const matchingQueue = (graph.queues || []).find(
            (q) => q.name === s.endpoint || q.id === s.endpoint || q.logicalId === s.endpoint
          );
          if (matchingQueue) {
            const qLogicalId = getQueueLogicalId(matchingQueue, graph);
            endpointVal = { "Fn::GetAtt": [qLogicalId, "Arn"] };

            // Synthesize AWS::SQS::QueuePolicy allowing SNS to publish to this Queue
            const policyKey = `QueuePolicy${qLogicalId}From${resourceKey}`;
            resources[policyKey] = {
              Type: "AWS::SQS::QueuePolicy",
              Properties: {
                Queues: [{ Ref: qLogicalId }],
                PolicyDocument: {
                  Version: "2012-10-17",
                  Statement: [
                    {
                      Sid: `AllowSNS${resourceKey}ToPublish`,
                      Effect: "Allow",
                      Principal: { Service: "sns.amazonaws.com" },
                      Action: "sqs:SendMessage",
                      Resource: { "Fn::GetAtt": [qLogicalId, "Arn"] },
                      Condition: {
                        ArnEquals: {
                          "aws:SourceArn": { Ref: resourceKey },
                        },
                      },
                    },
                  ],
                },
              },
            };
          }
        }
        return {
          Protocol: s.protocol,
          Endpoint: endpointVal,
        };
      });
    }
    topicProps["Tags"] = [
      { Key: "StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
    ];
    resources[resourceKey] = {
      Type: "AWS::SNS::Topic",
      Properties: topicProps,
    };

    outputs[`${sanitizeName(resourceKey)}TopicArn`] = {
      Description: `ARN of SNS Topic ${topic.name}`,
      Value: { Ref: resourceKey },
    };
  }
}

export function generateBindings(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  for (const binding of graph.bindings || []) {
    const cleanBucket = sanitizeName(binding.sourceBucketName);
    const cleanQueue = sanitizeName(binding.targetQueueName);
    const bucketKey = getBucketLogicalId(binding.sourceBucketName, graph);
    const queueKey = getQueueLogicalId(binding.targetQueueName, graph);
    const ruleKey = binding.ruleLogicalId || `EventRule${cleanBucket}To${cleanQueue}`;
    const policyKey = binding.queuePolicyLogicalId || `QueuePolicy${cleanQueue}EventBridge`;

    const detailPattern: any = {
      bucket: { name: [{ Ref: bucketKey }] },
    };

    if (binding.prefix) {
      detailPattern["object"] = { key: [{ prefix: binding.prefix }] };
    }

    resources[ruleKey] = {
      Type: "AWS::Events::Rule",
      Properties: {
        Description: `Routes S3 events from ${binding.sourceBucketName} to ${binding.targetQueueName}`,
        State: "ENABLED",
        EventPattern: {
          source: ["aws.s3"],
          "detail-type": [
            binding.event === "objectCreated" ? "Object Created" : "Object Removed",
          ],
          detail: detailPattern,
        },
        Targets: [
          {
            Arn: { "Fn::GetAtt": [queueKey, "Arn"] },
            Id: `${sanitizeName(queueKey)}Target`,
          },
        ],
      },
    };

    resources[policyKey] = {
      Type: "AWS::SQS::QueuePolicy",
      Properties: {
        Queues: [{ Ref: queueKey }],
        PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "events.amazonaws.com" },
              Action: "sqs:SendMessage",
              Resource: { "Fn::GetAtt": [queueKey, "Arn"] },
              Condition: {
                ArnEquals: {
                  "aws:SourceArn": { "Fn::GetAtt": [ruleKey, "Arn"] },
                },
              },
            },
          ],
        },
      },
    };
  }
}

export function generateFirehose(
  graph: ResourceGraph,
  resources: Record<string, any>,
  outputs: Record<string, any>
): void {
  for (const ds of graph.deliveryStreams || []) {
    const cleanName = sanitizeName(ds.name);
    const streamKey = getDeliveryStreamLogicalId(ds);
    const roleKey = ds.roleLogicalId || (ds.logicalId ? `FirehoseRole${ds.logicalId}` : `FirehoseRole${cleanName}`);

    const matchingBucket = graph.buckets.find(
      (b) => b.name === ds.destinationBucketName || b.id === ds.destinationBucketName || b.logicalId === ds.destinationBucketName
    );

    const bucketArn = matchingBucket
      ? { "Fn::GetAtt": [getBucketLogicalId(matchingBucket), "Arn"] }
      : ds.destinationBucketName.startsWith("arn:aws:s3:::")
      ? ds.destinationBucketName
      : { "Fn::Sub": `arn:aws:s3:::${ds.destinationBucketName}` };

    const bucketWildcardArn = matchingBucket
      ? {
          "Fn::Sub": [
            "${BucketArn}/*",
            { BucketArn: { "Fn::GetAtt": [getBucketLogicalId(matchingBucket), "Arn"] } },
          ],
        }
      : ds.destinationBucketName.startsWith("arn:aws:s3:::")
      ? `${ds.destinationBucketName}/*`
      : { "Fn::Sub": `arn:aws:s3:::${ds.destinationBucketName}/*` };

    // IAM Role for Firehose
    resources[roleKey] = {
      Type: "AWS::IAM::Role",
      Properties: {
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Principal: { Service: "firehose.amazonaws.com" },
              Action: "sts:AssumeRole",
            },
          ],
        },
        Policies: [
          {
            PolicyName: "FirehoseWriteS3",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Effect: "Allow",
                  Action: [
                    "s3:AbortMultipartUpload",
                    "s3:GetBucketLocation",
                    "s3:GetObject",
                    "s3:ListBucket",
                    "s3:ListBucketMultipartUploads",
                    "s3:PutObject",
                  ],
                  Resource: [bucketArn, bucketWildcardArn],
                },
              ],
            },
          },
        ],
        Tags: [
          { Key: "StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
        ],
      },
    };

    // Extended S3 Destination Configuration
    const s3DestConfig: any = {
      BucketARN: bucketArn,
      RoleARN: { "Fn::GetAtt": [roleKey, "Arn"] },
      CompressionFormat: ds.compression || "GZIP",
      BufferingHints: {
        IntervalInSeconds: ds.bufferingInterval ?? 900,
        SizeInMBs: ds.bufferingSize ?? 5,
      },
    };

    if (ds.prefix) {
      s3DestConfig.Prefix = ds.prefix;
    }
    if (ds.errorPrefix) {
      s3DestConfig.ErrorOutputPrefix = ds.errorPrefix;
    }

    resources[streamKey] = {
      Type: "AWS::KinesisFirehose::DeliveryStream",
      Properties: {
        DeliveryStreamName: resolvePhysicalName(ds.streamName, { "Fn::Sub": `\${AWS::StackName}-${ds.name}` }),
        DeliveryStreamType: "DirectPut",
        ExtendedS3DestinationConfiguration: s3DestConfig,
        Tags: [
          { Key: "StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
        ],
      },
    };

    outputs[`${sanitizeName(ds.name)}DeliveryStreamName`] = {
      Description: `Name of the ${ds.name} Kinesis Firehose Delivery Stream`,
      Value: { Ref: streamKey },
    };
  }
}
