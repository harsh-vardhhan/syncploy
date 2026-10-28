import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateDeliveryStreams(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const streamDefs: string[] = [];
  const { resources, params, templateParams, bucketLogicalIdToVar = {} } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::KinesisFirehose::DeliveryStream") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "DeliveryStream");

      const s3Config = props.ExtendedS3DestinationConfiguration || {};
      let destBucketRef = "undefined";

      if (s3Config.BucketARN) {
        const rawArn = s3Config.BucketARN;
        if (typeof rawArn === "object" && rawArn["Fn::GetAtt"]) {
          const target = rawArn["Fn::GetAtt"];
          const targetLogicalId = Array.isArray(target) ? target[0] : String(target).split(".")[0];
          destBucketRef = bucketLogicalIdToVar[targetLogicalId] || JSON.stringify(targetLogicalId);
        } else if (typeof rawArn === "object" && rawArn["Fn::Sub"]) {
          const subStr = String(rawArn["Fn::Sub"]);
          let matched = false;
          for (const [bLogicalId, bVar] of Object.entries(bucketLogicalIdToVar)) {
            if (subStr.includes(bLogicalId)) {
              destBucketRef = bVar;
              matched = true;
              break;
            }
          }
          if (!matched) {
            for (const [bLogicalId, bVar] of Object.entries(bucketLogicalIdToVar)) {
              const bRes = resources[bLogicalId];
              const bNameExpr = bRes?.Properties?.BucketName;
              if (bNameExpr?.Ref && subStr.includes("${" + bNameExpr.Ref + "}")) {
                destBucketRef = bVar;
                matched = true;
                break;
              }
            }
          }
          if (!matched) {
            destBucketRef = resolveValueExpr(rawArn, params, templateParams) || JSON.stringify(rawArn);
          }
        } else if (typeof rawArn === "string") {
          destBucketRef = JSON.stringify(rawArn);
        } else {
          destBucketRef = JSON.stringify(rawArn);
        }
      }

      const lines: string[] = [];
      lines.push(`export const ${varName} = new DeliveryStream(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const streamNameVal = resolveValueExpr(props.DeliveryStreamName, params, templateParams);
      if (streamNameVal) {
        lines.push(`  streamName: ${streamNameVal},`);
      }

      lines.push(`  destination: ${destBucketRef},`);

      if (s3Config.BufferingHints?.IntervalInSeconds) {
        lines.push(`  bufferingInterval: "${s3Config.BufferingHints.IntervalInSeconds}s",`);
      }
      if (s3Config.BufferingHints?.SizeInMBs) {
        lines.push(`  bufferingSize: "${s3Config.BufferingHints.SizeInMBs}MB",`);
      }
      if (s3Config.CompressionFormat) {
        lines.push(`  compression: ${JSON.stringify(s3Config.CompressionFormat)},`);
      }
      if (s3Config.Prefix) {
        lines.push(`  prefix: ${JSON.stringify(s3Config.Prefix)},`);
      }
      if (s3Config.ErrorOutputPrefix) {
        lines.push(`  errorPrefix: ${JSON.stringify(s3Config.ErrorOutputPrefix)},`);
      }

      lines.push(`});`);
      streamDefs.push(lines.join("\n"));
    }
  }

  const code = streamDefs.length > 0 ? "// --- Kinesis Firehose Delivery Streams ---\n" + streamDefs.join("\n\n") : "";
  return { code, adopted };
}
