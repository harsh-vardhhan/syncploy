import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateBuckets(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const bucketDefs: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::S3::Bucket") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Bucket");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Bucket(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const bucketNameVal = resolveValueExpr(props.BucketName, params, templateParams);
      if (bucketNameVal) {
        lines.push(`  bucketName: ${bucketNameVal},`);
      }

      if (props.VersioningConfiguration?.Status === "Enabled") {
        lines.push(`  versioned: true,`);
      }

      if (props.NotificationConfiguration?.EventBridgeConfiguration?.EventBridgeEnabled === true) {
        lines.push(`  eventBridge: true,`);
      }

      if (props.PublicAccessBlockConfiguration) {
        lines.push(`  publicAccessBlock: true,`);
      }

      if (props.ObjectLockConfiguration || props.ObjectLockEnabled) {
        const mode = props.ObjectLockConfiguration?.ObjectLockRule?.DefaultRetention?.Mode || "COMPLIANCE";
        const days = props.ObjectLockConfiguration?.ObjectLockRule?.DefaultRetention?.Days || 1;
        lines.push(`  objectLock: {`);
        lines.push(`    mode: ${JSON.stringify(mode)},`);
        lines.push(`    days: ${days},`);
        lines.push(`  },`);
      }

      lines.push(`});`);
      bucketDefs.push(lines.join("\n"));
    }
  }

  const code = bucketDefs.length > 0 ? "// --- S3 Buckets ---\n" + bucketDefs.join("\n\n") : "";
  return { code, adopted };
}
