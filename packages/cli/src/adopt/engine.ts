import * as fs from 'node:fs';
import * as path from 'node:path';
import { loadTemplate } from '../diff';
import type { AdoptOptions, AdoptResult } from './types';
import { parseSamConfig } from './config';
import { toVarName, toResourceName, resolveValueExpr } from './resolvers';

export function adoptTemplate(options: AdoptOptions): AdoptResult {
  const templatePath = path.resolve(process.cwd(), options.templatePath);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found at: ${templatePath}`);
  }

  let params: Record<string, string> = { ...(options.params || {}) };
  if (options.config) {
    const configPath = path.resolve(process.cwd(), options.config);
    const samConfig = parseSamConfig(configPath);
    params = { ...samConfig.parameters, ...params };
  }

  const template = loadTemplate(templatePath);
  const templateParams = template.Parameters || {};
  const resources = template.Resources || {};

  const adopted: AdoptResult["adoptedResources"] = {
    tables: [],
    buckets: [],
    queues: [],
    topics: [],
    deliveryStreams: [],
    alarms: [],
    functions: [],
    auths: [],
  };
  const unmodeledResources: string[] = [];

  const codeBlocks: string[] = [];
  const bucketLogicalIdToVar: Record<string, string> = {};

  // First pass: identify buckets so delivery streams can reference them
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::S3::Bucket") {
      bucketLogicalIdToVar[key] = toVarName(key);
    }
  }

  // 1. Tables (AWS::DynamoDB::Table)
  const tableDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::DynamoDB::Table") {
      adopted.tables.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Table");

      const attrMap = new Map<string, string>();
      for (const attr of props.AttributeDefinitions || []) {
        attrMap.set(attr.AttributeName, attr.AttributeType);
      }

      let pkDef = `{ name: "id", type: "string" }`;
      let skDef: string | undefined;

      for (const k of props.KeySchema || []) {
        const typeChar = attrMap.get(k.AttributeName) || "S";
        const typeStr = typeChar === "N" ? "number" : typeChar === "B" ? "binary" : "string";
        if (k.KeyType === "HASH") {
          pkDef = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
        } else if (k.KeyType === "RANGE") {
          skDef = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
        }
      }

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Table(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const tableNameVal = resolveValueExpr(props.TableName, params, templateParams);
      if (tableNameVal) {
        lines.push(`  tableName: ${tableNameVal},`);
      }

      lines.push(`  partitionKey: ${pkDef},`);
      if (skDef) {
        lines.push(`  sortKey: ${skDef},`);
      }

      if (props.BillingMode) {
        lines.push(`  billingMode: ${JSON.stringify(props.BillingMode)},`);
      } else {
        lines.push(`  billingMode: "PAY_PER_REQUEST",`);
      }

      if (props.StreamSpecification?.StreamViewType) {
        lines.push(`  stream: ${JSON.stringify(props.StreamSpecification.StreamViewType)},`);
      }

      if (props.PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled) {
        lines.push(`  pointInTimeRecovery: true,`);
      }

      if (props.GlobalSecondaryIndexes && props.GlobalSecondaryIndexes.length > 0) {
        lines.push(`  indexes: {`);
        for (const gsi of props.GlobalSecondaryIndexes) {
          const indexName = gsi.IndexName;
          let gsiPk = "";
          let gsiSk = "";
          for (const k of gsi.KeySchema || []) {
            const typeChar = attrMap.get(k.AttributeName) || "S";
            const typeStr = typeChar === "N" ? "number" : typeChar === "B" ? "binary" : "string";
            if (k.KeyType === "HASH") {
              gsiPk = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
            } else if (k.KeyType === "RANGE") {
              gsiSk = `{ name: ${JSON.stringify(k.AttributeName)}, type: "${typeStr}" }`;
            }
          }
          const proj = gsi.Projection?.ProjectionType || "ALL";
          lines.push(`    ${JSON.stringify(indexName)}: {`);
          lines.push(`      partitionKey: ${gsiPk},`);
          if (gsiSk) {
            lines.push(`      sortKey: ${gsiSk},`);
          }
          lines.push(`      projection: ${JSON.stringify(proj)},`);
          lines.push(`    },`);
        }
        lines.push(`  },`);
      }

      lines.push(`});`);
      tableDefs.push(lines.join("\n"));
    }
  }
  if (tableDefs.length > 0) {
    codeBlocks.push("// --- DynamoDB Tables ---\n" + tableDefs.join("\n\n"));
  }

  // 2. Buckets (AWS::S3::Bucket)
  const bucketDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::S3::Bucket") {
      adopted.buckets.push(key);
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
  if (bucketDefs.length > 0) {
    codeBlocks.push("// --- S3 Buckets ---\n" + bucketDefs.join("\n\n"));
  }

  // 3. SQS Queues (AWS::SQS::Queue)
  const queueDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::SQS::Queue") {
      adopted.queues.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Queue");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Queue(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const queueNameVal = resolveValueExpr(props.QueueName, params, templateParams);
      if (queueNameVal) {
        lines.push(`  queueName: ${queueNameVal},`);
      }

      if (props.VisibilityTimeout !== undefined) {
        lines.push(`  visibilityTimeout: ${props.VisibilityTimeout},`);
      }

      if (props.FifoQueue === true) {
        lines.push(`  fifo: true,`);
      }

      if (props.RedrivePolicy) {
        const maxReceiveCount = props.RedrivePolicy.maxReceiveCount || 5;
        lines.push(`  deadLetterQueue: {`);
        lines.push(`    maxReceiveCount: ${maxReceiveCount},`);
        lines.push(`  },`);
      }

      lines.push(`});`);
      queueDefs.push(lines.join("\n"));
    }
  }
  if (queueDefs.length > 0) {
    codeBlocks.push("// --- SQS Queues ---\n" + queueDefs.join("\n\n"));
  }

  // 4. SNS Topics (AWS::SNS::Topic)
  const topicDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::SNS::Topic") {
      adopted.topics.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Topic");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Topic(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const topicNameVal = resolveValueExpr(props.TopicName, params, templateParams);
      if (topicNameVal) {
        lines.push(`  topicName: ${topicNameVal},`);
      }

      if (props.FifoTopic === true) {
        lines.push(`  fifo: true,`);
      }

      if (props.Subscription && props.Subscription.length > 0) {
        lines.push(`  subscriptions: [`);
        for (const sub of props.Subscription) {
          const epVal = resolveValueExpr(sub.Endpoint, params, templateParams) || JSON.stringify(sub.Endpoint);
          lines.push(`    { protocol: ${JSON.stringify(sub.Protocol)}, endpoint: ${epVal} },`);
        }
        lines.push(`  ],`);
      }

      lines.push(`});`);
      topicDefs.push(lines.join("\n"));
    }
  }
  if (topicDefs.length > 0) {
    codeBlocks.push("// --- SNS Topics ---\n" + topicDefs.join("\n\n"));
  }

  // 5. Kinesis Firehose Delivery Streams (AWS::KinesisFirehose::DeliveryStream)
  const streamDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::KinesisFirehose::DeliveryStream") {
      adopted.deliveryStreams.push(key);
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
  if (streamDefs.length > 0) {
    codeBlocks.push("// --- Kinesis Firehose Delivery Streams ---\n" + streamDefs.join("\n\n"));
  }

  // 6. CloudWatch Alarms (AWS::CloudWatch::Alarm)
  const alarmDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::CloudWatch::Alarm") {
      adopted.alarms.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Alarm");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Alarm(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const alarmNameVal = resolveValueExpr(props.AlarmName, params, templateParams);
      if (alarmNameVal) {
        lines.push(`  alarmName: ${alarmNameVal},`);
      }

      const descVal = resolveValueExpr(props.AlarmDescription, params, templateParams);
      if (descVal) {
        lines.push(`  description: ${descVal},`);
      }
      if (props.EvaluationPeriods !== undefined) {
        lines.push(`  evaluationPeriods: ${props.EvaluationPeriods},`);
      }
      const thresholdVal = resolveValueExpr(props.Threshold, params, templateParams);
      if (thresholdVal !== undefined) {
        lines.push(`  threshold: ${thresholdVal},`);
      }
      if (props.ComparisonOperator) {
        lines.push(`  comparison: ${JSON.stringify(props.ComparisonOperator)},`);
      }
      if (props.TreatMissingData) {
        lines.push(`  treatMissingData: ${JSON.stringify(props.TreatMissingData)},`);
      }

      if (props.AlarmActions && props.AlarmActions.length > 0) {
        lines.push(`  alarmActions: [`);
        for (const act of props.AlarmActions) {
          if (typeof act === "object" && act.Ref) {
            lines.push(`    ${JSON.stringify(act.Ref)},`);
          } else {
            lines.push(`    ${JSON.stringify(act)},`);
          }
        }
        lines.push(`  ],`);
      }

      if (props.Metrics && props.Metrics.length > 0) {
        lines.push(`  metrics: ${JSON.stringify(props.Metrics, null, 4).replace(/\n/g, "\n  ")},`);
      }

      lines.push(`});`);
      alarmDefs.push(lines.join("\n"));
    }
  }
  if (alarmDefs.length > 0) {
    codeBlocks.push("// --- CloudWatch Alarms ---\n" + alarmDefs.join("\n\n"));
  }

  // 7. Cognito Authentication (AWS::Cognito::UserPool & AWS::Cognito::UserPoolClient)
  const authDefs: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::Cognito::UserPool") {
      adopted.auths.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "UserPool");

      // Find matching UserPoolClient
      let clientKey: string | undefined;
      let clientProps: any = undefined;
      for (const [cKey, cRes] of Object.entries<any>(resources)) {
        if (cRes.Type === "AWS::Cognito::UserPoolClient") {
          const upId = cRes.Properties?.UserPoolId;
          if (upId && (upId === key || (typeof upId === "object" && upId.Ref === key))) {
            clientKey = cKey;
            clientProps = cRes.Properties;
            adopted.auths.push(cKey);
            break;
          }
        }
      }

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Auth(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      if (props.AdminCreateUserConfig?.AllowAdminCreateUserOnly !== undefined) {
        lines.push(`  adminOnly: ${props.AdminCreateUserConfig.AllowAdminCreateUserOnly},`);
      }

      if (props.UsernameAttributes?.includes("email")) {
        lines.push(`  signInMethod: "email",`);
      } else if (props.UsernameAttributes?.includes("phone_number")) {
        lines.push(`  signInMethod: "phone",`);
      }

      if (props.Policies?.PasswordPolicy) {
        const pol = props.Policies.PasswordPolicy;
        lines.push(`  passwordPolicy: {`);
        if (pol.MinimumLength) lines.push(`    minLength: ${pol.MinimumLength},`);
        if (pol.RequireUppercase !== undefined) lines.push(`    requireUppercase: ${pol.RequireUppercase},`);
        if (pol.RequireLowercase !== undefined) lines.push(`    requireLowercase: ${pol.RequireLowercase},`);
        if (pol.RequireNumbers !== undefined) lines.push(`    requireNumbers: ${pol.RequireNumbers},`);
        if (pol.RequireSymbols !== undefined) lines.push(`    requireSymbols: ${pol.RequireSymbols},`);
        lines.push(`  },`);
      }

      if (clientProps) {
        lines.push(`  client: {`);
        if (clientKey) lines.push(`    clientLogicalId: ${JSON.stringify(clientKey)},`);
        if (clientProps.GenerateSecret !== undefined) lines.push(`    generateSecret: ${clientProps.GenerateSecret},`);
        if (clientProps.ExplicitAuthFlows) lines.push(`    explicitAuthFlows: ${JSON.stringify(clientProps.ExplicitAuthFlows)},`);
        if (clientProps.PreventUserExistenceErrors) {
          lines.push(`    preventUserExistenceErrors: ${clientProps.PreventUserExistenceErrors === "ENABLED"},`);
        }
        lines.push(`  },`);
      }

      lines.push(`});`);
      authDefs.push(lines.join("\n"));
    }
  }
  if (authDefs.length > 0) {
    codeBlocks.push("// --- Cognito Authentication ---\n" + authDefs.join("\n\n"));
  }

  // 8. Lambda Functions (AWS::Serverless::Function & AWS::Lambda::Function)
  const fnNotes: string[] = [];
  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::Serverless::Function" || res.Type === "AWS::Lambda::Function") {
      adopted.functions.push(key);
      const props = res.Properties || {};
      const fnName = resolveValueExpr(props.FunctionName, params, templateParams) || JSON.stringify(key);
      fnNotes.push(`// • ${key} (Handler: ${props.Handler || "index.handler"}, FunctionName: ${fnName})`);
    }
  }
  if (fnNotes.length > 0) {
    codeBlocks.push(
      "// --- Discovered Lambda Functions ---\n" +
        "// Map these to api(), consumer(), stream(), or subscriber() in your application code:\n" +
        fnNotes.join("\n")
    );
  }

  // 9. Unmodeled Resources (Escape-Hatch Catalog)
  const knownTypes = new Set([
    "AWS::DynamoDB::Table",
    "AWS::S3::Bucket",
    "AWS::SQS::Queue",
    "AWS::SNS::Topic",
    "AWS::KinesisFirehose::DeliveryStream",
    "AWS::CloudWatch::Alarm",
    "AWS::Cognito::UserPool",
    "AWS::Cognito::UserPoolClient",
    "AWS::Serverless::Function",
    "AWS::Lambda::Function",
    // Auto-synthesized by Syncploy:
    "AWS::IAM::Role",
    "AWS::Events::Rule",
    "AWS::SQS::QueuePolicy",
    "AWS::Lambda::Permission",
    "AWS::Lambda::EventSourceMapping",
    "AWS::Lambda::Url",
    "AWS::SNS::Subscription",
  ]);

  for (const [key, res] of Object.entries<any>(resources)) {
    if (!knownTypes.has(res.Type)) {
      unmodeledResources.push(`${key} (${res.Type})`);
    }
  }

  // Header and imports
  const header = [
    `// ============================================================================`,
    `// Auto-generated by Syncploy Adopt`,
    `// Source: ${path.relative(process.cwd(), templatePath)}`,
    `// Generated At: ${new Date().toISOString()}`,
    `// ============================================================================`,
    `import { Table, Bucket, Queue, Topic, Alarm, DeliveryStream, Auth } from "@syncploy/sdk";`,
    ``,
  ].join("\n");

  const fullCode = header + codeBlocks.join("\n\n") + "\n";

  if (options.out) {
    const outPath = path.resolve(process.cwd(), options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, fullCode, "utf-8");
  }

  return {
    code: fullCode,
    adoptedResources: adopted,
    unmodeledResources,
  };
}
