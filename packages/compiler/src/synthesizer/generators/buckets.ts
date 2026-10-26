import type { ResourceGraph } from "../../types";
import { getBucketLogicalId, resolvePhysicalName } from "../logical-ids";

export function generateBuckets(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  for (const bucket of graph.buckets) {
    const resourceKey = getBucketLogicalId(bucket);
    const defaultBucketNameSub = bucket.accountScoped
      ? `\${AWS::StackName}-${bucket.name}-\${AWS::AccountId}`
      : `\${AWS::StackName}-${bucket.name}`;
    const bucketProps: any = {
      BucketName: resolvePhysicalName(bucket.bucketName, { "Fn::Sub": defaultBucketNameSub }),
    };

    if (bucket.versioned) {
      bucketProps["VersioningConfiguration"] = { Status: "Enabled" };
    }

    if (bucket.eventBridge) {
      bucketProps["NotificationConfiguration"] = {
        EventBridgeConfiguration: { EventBridgeEnabled: true },
      };
    }

    if (bucket.publicAccessBlock) {
      bucketProps["PublicAccessBlockConfiguration"] = {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      };
    }

    if (bucket.objectLock) {
      bucketProps["ObjectLockEnabled"] = true;
      const config: any = {
        ObjectLockEnabled: "Enabled",
      };
      if (typeof bucket.objectLock === "object") {
        const rule: any = {};
        const defaultRetention: any = {};
        defaultRetention.Mode = bucket.objectLock.mode || "COMPLIANCE";
        if (bucket.objectLock.days !== undefined) {
          defaultRetention.Days = bucket.objectLock.days;
        } else if (bucket.objectLock.years !== undefined) {
          defaultRetention.Years = bucket.objectLock.years;
        } else {
          defaultRetention.Days = 1;
        }
        rule.DefaultRetention = defaultRetention;
        config.Rule = rule;
      } else {
        config.Rule = {
          DefaultRetention: {
            Mode: "COMPLIANCE",
            Days: 1,
          },
        };
      }
      bucketProps["ObjectLockConfiguration"] = config;
    }

    const bucketDeletionPolicy =
      bucket.deletionPolicy || (bucket.retain === false ? "Delete" : "Retain");
    const bucketUpdateReplacePolicy =
      bucket.deletionPolicy || (bucket.retain === false ? "Delete" : "Retain");

    resources[resourceKey] = {
      Type: "AWS::S3::Bucket",
      DeletionPolicy: bucketDeletionPolicy,
      UpdateReplacePolicy: bucketUpdateReplacePolicy,
      Properties: bucketProps,
    };
  }
}
