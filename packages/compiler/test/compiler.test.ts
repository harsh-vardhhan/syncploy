import { describe, expect, it, test, beforeAll, afterAll } from "bun:test";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as syncFs from "node:fs";
import { tmpdir } from "node:os";
import { Compiler } from "../src/index";
import { Synthesizer } from "../src/synthesizer";

const TEST_DIR = path.join(__dirname, ".tmp-test-app-configured");

describe("@syncploy/compiler - In-Code Configurations & Function URLs", () => {
  beforeAll(async () => {
    await fs.mkdir(TEST_DIR, { recursive: true });

    await fs.writeFile(
      path.join(TEST_DIR, "app.ts"),
      `
import { api, Table, Bucket, Queue, Topic, Alarm, DeliveryStream, Budget } from "@syncploy/sdk";

export const ehrTable = new Table("ehr", {
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  pointInTimeRecovery: true,
  indexes: {
    GSI1Index: { partitionKey: "GSI1PK", sortKey: "GSI1SK" },
  },
});

export const documentsBucket = new Bucket("documents", {
  versioned: true,
  eventBridge: true,
  publicAccessBlock: true,
});

export const auditLogsBucket = new Bucket("audit-logs", {
  objectLock: {
    mode: "COMPLIANCE",
    days: 1,
  },
  publicAccessBlock: true,
  accountScoped: true,
});

export const auditDeliveryStream = new DeliveryStream("audit-stream", {
  destination: auditLogsBucket,
  bufferingInterval: "900s",
  bufferingSize: "5MB",
  compression: "GZIP",
});

export const omopDeliveryStream = new DeliveryStream("omop-stream", {
  destination: documentsBucket,
  prefix: "omop/",
  errorPrefix: "omop-failures/",
  bufferingInterval: "900s",
  bufferingSize: "5MB",
  compression: "GZIP",
});

export const annotationQueue = new Queue("annotations", {
  visibilityTimeout: "180s",
  deadLetterQueue: {
    maxReceiveCount: 3,
  },
});

export const alertTopic = new Topic("alerts", {
  fifo: false,
  subscriptions: [
    { protocol: "email", endpoint: "alerts@example.com" },
  ],
});

export const highTrafficAlarm = new Alarm("HighTrafficAlarm", {
  threshold: 2000,
  evaluationPeriods: 1,
  comparison: "GreaterThanOrEqualToThreshold",
  description: "Triggers alert topic on high traffic",
  treatMissingData: "notBreaching",
  actions: [alertTopic],
  metrics: [
    {
      id: "e1",
      expression: "m1 + m2",
      label: "TotalRequests",
      returnData: true,
    },
    {
      id: "m1",
      returnData: false,
      metricStat: {
        metric: {
          metricName: "Invocations",
        },
      },
    },
    {
      id: "m2",
      returnData: false,
      metricStat: {
        metric: {
          metricName: "Throttles",
        },
      },
    },
  ],
});

documentsBucket.on("objectCreated", annotationQueue, { prefix: "documents/" });

export const getUser = api(
  {
    method: "GET",
    path: "/users/:id",
    ingress: "api-gateway",
    timeout: "30s",
    memory: "512MB",
    concurrency: 2,
    throttle: { rateLimit: 50, burstLimit: 100 },
    detailedMetrics: true,
    cors: {
      allowOrigins: ["https://example.com"],
      allowHeaders: ["Content-Type", "X-Api-Key"],
    },
  },
  async ({ id }: { id: string }) => {
    return { id, name: "Alice" };
  }
);

export const analyzeClinicalDoc = api(
  {
    method: "POST",
    path: "/analyze",
    ingress: "function-url",
    timeout: "300s",
    memory: "1024MB",
  },
  async ({ docId }: { docId: string }) => {
    return { docId, analyzed: true };
  }
);

export const processDoc = annotationQueue.consumer(
  {
    batchSize: 5,
    timeout: "120s",
    concurrency: 2,
  },
  async (event) => {
    console.log("Processing", event);
  }
);

export const auditStreamConsumer = ehrTable.stream(
  {
    batchSize: 100,
    timeout: "60s",
    startingPosition: "LATEST",
  },
  async (records) => {
    console.log("Stream records", records);
  }
);

export const alertSubscriber = alertTopic.subscribe(
  {
    timeout: "30s",
    memory: "256MB",
  },
  async (message) => {
    console.log("Alert message", message);
  }
);

export const monthlyBudget = new Budget("monthlyBudget", {
  amount: 100,
  topic: alertTopic,
  threshold: 80,
  filterByStack: true,
});
`,
      "utf-8"
    );
  });

  afterAll(async () => {
    await fs.rm(TEST_DIR, { recursive: true, force: true });
  });

  it("extracts all in-code configurations accurately", async () => {
    const compiler = new Compiler(TEST_DIR);
    const graph = await compiler.parse();

    // Verify Table Config
    const table = graph.tables[0]!;
    expect(table.name).toBe("ehr");
    expect(table.stream).toBe("NEW_IMAGE");
    expect(table.billingMode).toBe("PAY_PER_REQUEST");
    expect(table.pointInTimeRecovery).toBe(true);
    expect(table.indexes?.["GSI1Index"]).toBeDefined();
    expect(table.indexes?.["GSI1Index"]?.partitionKey).toBe("GSI1PK");
    expect(table.indexes?.["GSI1Index"]?.sortKey).toBe("GSI1SK");

    // Verify Bucket Config
    const bucket = graph.buckets[0]!;
    expect(bucket.name).toBe("documents");
    expect(bucket.versioned).toBe(true);
    expect(bucket.eventBridge).toBe(true);
    expect(bucket.publicAccessBlock).toBe(true);

    // Verify Queue Config
    const queue = graph.queues[0]!;
    expect(queue.name).toBe("annotations");
    expect(queue.visibilityTimeout).toBe(180);
    expect(queue.deadLetterQueue?.maxReceiveCount).toBe(3);

    // Verify API Gateway Route
    const apiGw = graph.apis.find((a) => a.id === "getUser")!;
    expect(apiGw.ingress).toBe("api-gateway");
    expect(apiGw.timeout).toBe(30);
    expect(apiGw.memory).toBe(512);
    expect(apiGw.concurrency).toBe(2);

    // Verify Function URL Route
    const funcUrlApi = graph.apis.find((a) => a.id === "analyzeClinicalDoc")!;
    expect(funcUrlApi.ingress).toBe("function-url");
    expect(funcUrlApi.timeout).toBe(300);
    expect(funcUrlApi.memory).toBe(1024);

    // Verify Queue Consumer Config
    const consumer = graph.consumers[0]!;
    expect(consumer.batchSize).toBe(5);
    expect(consumer.timeout).toBe(120);
    expect(consumer.concurrency).toBe(2);

    // Verify Event Pipeline Binding
    expect(graph.bindings.length).toBe(1);
    expect(graph.bindings[0]?.sourceBucketName).toBe("documents");
    expect(graph.bindings[0]?.targetQueueName).toBe("annotations");
    expect(graph.bindings[0]?.prefix).toBe("documents/");

    // Verify Topic & Alarm
    expect(graph.topics.length).toBe(1);
    expect(graph.topics[0]?.name).toBe("alerts");
    expect(graph.topics[0]?.fifo).toBe(false);

    expect(graph.alarms.length).toBe(1);
    expect(graph.alarms[0]?.name).toBe("HighTrafficAlarm");
    expect(graph.alarms[0]?.threshold).toBe(2000);
    expect(graph.alarms[0]?.actions).toContain("alerts");

    // Verify Stream Consumer
    expect(graph.tableStreams.length).toBe(1);
    expect(graph.tableStreams[0]?.tableName).toBe("ehr");
    expect(graph.tableStreams[0]?.batchSize).toBe(100);
    expect(graph.tableStreams[0]?.startingPosition).toBe("LATEST");

    // Verify Topic Subscriber
    expect(graph.topicSubscribers.length).toBe(1);
    expect(graph.topicSubscribers[0]?.topicName).toBe("alerts");
    expect(graph.topicSubscribers[0]?.timeout).toBe(30);
    expect(graph.topicSubscribers[0]?.memory).toBe(256);

    // Verify Bucket ObjectLock & DeliveryStream Config
    const auditBucket = graph.buckets.find((b) => b.name === "audit-logs")!;
    expect(auditBucket.objectLock).toEqual({ mode: "COMPLIANCE", days: 1, years: undefined });

    expect(graph.deliveryStreams.length).toBe(2);
    expect(graph.deliveryStreams[0]?.name).toBe("audit-stream");
    expect(graph.deliveryStreams[0]?.destinationBucketName).toBe("audit-logs");
    expect(graph.deliveryStreams[0]?.bufferingInterval).toBe(900);
    expect(graph.deliveryStreams[0]?.bufferingSize).toBe(5);
    expect(graph.deliveryStreams[0]?.compression).toBe("GZIP");

    expect(graph.deliveryStreams[1]?.name).toBe("omop-stream");
    expect(graph.deliveryStreams[1]?.destinationBucketName).toBe("documents");
    expect(graph.deliveryStreams[1]?.prefix).toBe("omop/");
    expect(graph.deliveryStreams[1]?.errorPrefix).toBe("omop-failures/");
    expect(graph.deliveryStreams[1]?.bufferingInterval).toBe(900);
    expect(graph.deliveryStreams[1]?.bufferingSize).toBe(5);
    expect(graph.deliveryStreams[1]?.compression).toBe("GZIP");

    // Verify Budget
    expect(graph.budget).toBeDefined();
    expect(graph.budget?.amount).toBe(100);
    expect(graph.budget?.filterByStack).toBe(true);
  });

  it("synthesizes accurate CloudFormation properties for both API Gateway and Lambda Function URLs", async () => {
    const compiler = new Compiler(TEST_DIR);
    const output = await compiler.build();

    const templateContent = await fs.readFile(output.templatePath, "utf-8");
    const template = JSON.parse(templateContent);
    const res = template.Resources;

    // 1. Table with Stream & GSI
    const tableRes = res["Tableehr"];
    expect(tableRes.Properties.StreamSpecification.StreamViewType).toBe("NEW_IMAGE");
    expect(tableRes.Properties.PointInTimeRecoverySpecification.PointInTimeRecoveryEnabled).toBe(true);
    expect(tableRes.Properties.GlobalSecondaryIndexes.length).toBe(1);
    expect(tableRes.Properties.GlobalSecondaryIndexes[0].IndexName).toBe("GSI1Index");

    // Edge Controls & Throttling
    expect(res["HttpApiStage"].Properties.DefaultRouteSettings.ThrottlingBurstLimit).toBe(2000);
    expect(res["HttpApiStage"].Properties.DefaultRouteSettings.ThrottlingRateLimit).toBe(1000);
    expect(res["HttpApiStage"].Properties.RouteSettings["GET /users/{id}"].ThrottlingBurstLimit).toBe(100);
    expect(res["HttpApiStage"].Properties.RouteSettings["GET /users/{id}"].ThrottlingRateLimit).toBe(50);
    expect(res["HttpApiStage"].Properties.RouteSettings["GET /users/{id}"].DetailedMetricsEnabled).toBe(true);

    // 5. Budget Resource with Tag Scoping
    const budgetRes = res["StackBudget"];
    expect(budgetRes).toBeDefined();
    expect(budgetRes.Type).toBe("AWS::Budgets::Budget");
    expect(budgetRes.Properties.Budget.BudgetName["Fn::Sub"]).toBe("${AWS::StackName}-${AWS::Region}-budget");
    expect(budgetRes.Properties.Budget.BudgetLimit.Amount).toBe(100);
    expect(budgetRes.Properties.Budget.CostFilters.TagKeyValue[0]["Fn::Sub"]).toBe("user:StackName$${AWS::StackName}");
    expect(res["TopicPolicyTopicalertsForBudgets"]).toBeDefined();
    expect(res["TopicPolicyTopicalertsForBudgets"].Type).toBe("AWS::SNS::TopicPolicy");

    // 6. Stack Tags on synthesized resources
    expect(tableRes.Properties.Tags).toBeDefined();
    expect(tableRes.Properties.Tags[0].Key).toBe("StackName");

    // 2. Bucket with EventBridge & Versioning
    const bucketRes = res["Bucketdocuments"];
    expect(bucketRes.Properties.VersioningConfiguration.Status).toBe("Enabled");
    expect(bucketRes.Properties.NotificationConfiguration.EventBridgeConfiguration.EventBridgeEnabled).toBe(true);
    expect(bucketRes.Properties.Tags).toBeDefined();
    expect(bucketRes.Properties.Tags[0].Key).toBe("StackName");

    // 3. Queue with DLQ
    const queueRes = res["Queueannotations"];
    expect(queueRes.Properties.VisibilityTimeout).toBe(180);
    expect(res["QueueannotationsDLQ"]).toBeDefined();
    expect(queueRes.Properties.RedrivePolicy.maxReceiveCount).toBe(3);

    // 4. API Gateway Route with Injected Environment Variables
    const getUserFunc = res["FunctiongetUser"];
    expect(getUserFunc.Properties.Timeout).toBe(30);
    expect(getUserFunc.Properties.MemorySize).toBe(512);
    expect(getUserFunc.Properties.ReservedConcurrentExecutions).toBe(2);
    expect(getUserFunc.Properties.Environment.Variables.SYNCPLOY_TABLE_EHR).toEqual({ Ref: "Tableehr" });
    expect(getUserFunc.Properties.Environment.Variables.SYNCPLOY_BUCKET_DOCUMENTS).toEqual({ Ref: "Bucketdocuments" });
    expect(getUserFunc.Properties.Environment.Variables.SYNCPLOY_QUEUE_ANNOTATIONS).toEqual({ Ref: "Queueannotations" });
    expect(res["RoutegetUser"]).toBeDefined();
    expect(res["IntegrationgetUser"]).toBeDefined();

    // 5. Lambda Function URL Route
    const analyzeFunc = res["FunctionanalyzeClinicalDoc"];
    expect(analyzeFunc.Properties.Timeout).toBe(300);
    expect(analyzeFunc.Properties.MemorySize).toBe(1024);

    // Verify AWS::Lambda::Url and Permission are generated
    const urlResource = res["FunctionUrlanalyzeClinicalDoc"];
    expect(urlResource).toBeDefined();
    expect(urlResource.Type).toBe("AWS::Lambda::Url");
    expect(urlResource.Properties.AuthType).toBe("NONE");

    const urlPerm = res["PermissionanalyzeClinicalDocUrl"];
    expect(urlPerm).toBeDefined();
    expect(urlPerm.Properties.Action).toBe("lambda:InvokeFunctionUrl");
    expect(urlPerm.Properties.Principal).toBe("*");

    // Verify no API Gateway Route was generated for the Function URL
    expect(res["RouteanalyzeClinicalDoc"]).toBeUndefined();
    expect(res["IntegrationanalyzeClinicalDoc"]).toBeUndefined();

    // Verify Output contains the Function URL
    expect(template.Outputs["analyzeClinicalDocUrl"]).toBeDefined();

    // 6. Worker Lambda with timeout, concurrency, EventSourceMapping
    const workerRes = res["FunctionprocessDoc"];
    expect(workerRes.Properties.Timeout).toBe(120);
    expect(workerRes.Properties.ReservedConcurrentExecutions).toBe(2);

    const mappingRes = res["EventSourceMappingprocessDoc"];
    expect(mappingRes.Properties.BatchSize).toBe(5);
    expect(mappingRes.Properties.FunctionResponseTypes).toEqual(["ReportBatchItemFailures"]);

    // 7. EventBridge Rule & SQS Queue Policy
    const ruleRes = res["EventRuledocumentsToannotations"];
    expect(ruleRes).toBeDefined();
    expect(ruleRes.Type).toBe("AWS::Events::Rule");
    expect(ruleRes.Properties.EventPattern.detail.object.key[0].prefix).toBe("documents/");

    const policyRes = res["QueuePolicyQueueannotations"];
    expect(policyRes).toBeDefined();
    expect(policyRes.Type).toBe("AWS::SQS::QueuePolicy");

    // 8. SNS Topic & Alarm with Metric Math and Subscriptions
    const topicRes = res["Topicalerts"];
    expect(topicRes).toBeDefined();
    expect(topicRes.Type).toBe("AWS::SNS::Topic");
    expect(topicRes.Properties.TopicName).toEqual({ "Fn::Sub": "${AWS::StackName}-alerts" });
    expect(topicRes.Properties.Subscription).toEqual([{ Protocol: "email", Endpoint: "alerts@example.com" }]);

    const alarmRes = res["AlarmHighTrafficAlarm"];
    expect(alarmRes).toBeDefined();
    expect(alarmRes.Type).toBe("AWS::CloudWatch::Alarm");
    expect(alarmRes.Properties.Threshold).toBe(2000);
    expect(alarmRes.Properties.AlarmActions).toEqual([{ Ref: "Topicalerts" }]);
    expect(alarmRes.Properties.TreatMissingData).toBe("notBreaching");
    expect(alarmRes.Properties.Metrics.length).toBe(3);
    expect(alarmRes.Properties.Metrics[0].Expression).toBe("m1 + m2");
    expect(alarmRes.Properties.Metrics[1].MetricStat.Metric.MetricName).toBe("Invocations");
    expect(alarmRes.Properties.Metrics[2].MetricStat.Metric.MetricName).toBe("Throttles");

    // Per-Function IAM Roles
    expect(res["RolegetUser"]).toBeDefined();
    expect(res["RoleprocessDoc"]).toBeDefined();
    expect(getUserFunc.Properties.Role).toEqual({ "Fn::GetAtt": ["RolegetUser", "Arn"] });
    expect(workerRes.Properties.Role).toEqual({ "Fn::GetAtt": ["RoleprocessDoc", "Arn"] });

    // 9. DynamoDB Stream Function & EventSourceMapping
    const streamFunc = res["FunctionauditStreamConsumer"];
    expect(streamFunc).toBeDefined();
    expect(streamFunc.Properties.Timeout).toBe(60);

    const streamMapping = res["EventSourceMappingauditStreamConsumer"];
    expect(streamMapping).toBeDefined();
    expect(streamMapping.Properties.BatchSize).toBe(100);
    expect(streamMapping.Properties.StartingPosition).toBe("LATEST");
    expect(streamMapping.Properties.EventSourceArn).toEqual({ "Fn::GetAtt": ["Tableehr", "StreamArn"] });

    // 10. SNS Subscriber Function & Subscription
    const subFunc = res["FunctionalertSubscriber"];
    expect(subFunc).toBeDefined();
    expect(subFunc.Properties.Timeout).toBe(30);
    expect(subFunc.Properties.MemorySize).toBe(256);

    const subRes = res["SubscriptionalertSubscriber"];
    expect(subRes).toBeDefined();
    expect(subRes.Type).toBe("AWS::SNS::Subscription");
    expect(subRes.Properties.Protocol).toBe("lambda");
    expect(subRes.Properties.TopicArn).toEqual({ Ref: "Topicalerts" });

    const permRes = res["PermissionalertSubscriberSns"];
    expect(permRes).toBeDefined();
    expect(permRes.Type).toBe("AWS::Lambda::Permission");
    expect(permRes.Properties.Principal).toBe("sns.amazonaws.com");

    // 11. S3 Bucket ObjectLock & Account Scoping
    const auditBucketRes = res["Bucketauditlogs"];
    expect(auditBucketRes).toBeDefined();
    expect(auditBucketRes.Properties.BucketName).toEqual({ "Fn::Sub": "${AWS::StackName}-audit-logs-${AWS::AccountId}" });
    expect(auditBucketRes.Properties.ObjectLockEnabled).toBe(true);
    expect(auditBucketRes.Properties.ObjectLockConfiguration.Rule.DefaultRetention.Mode).toBe("COMPLIANCE");
    expect(auditBucketRes.Properties.ObjectLockConfiguration.Rule.DefaultRetention.Days).toBe(1);

    // 12. Firehose DeliveryStreams & Roles
    const auditStreamRes = res["DeliveryStreamauditstream"];
    expect(auditStreamRes).toBeDefined();
    expect(auditStreamRes.Type).toBe("AWS::KinesisFirehose::DeliveryStream");
    expect(auditStreamRes.Properties.ExtendedS3DestinationConfiguration.CompressionFormat).toBe("GZIP");
    expect(auditStreamRes.Properties.ExtendedS3DestinationConfiguration.BufferingHints.IntervalInSeconds).toBe(900);
    expect(auditStreamRes.Properties.ExtendedS3DestinationConfiguration.BufferingHints.SizeInMBs).toBe(5);
    expect(auditStreamRes.Properties.ExtendedS3DestinationConfiguration.BucketARN).toEqual({ "Fn::GetAtt": ["Bucketauditlogs", "Arn"] });

    const omopStreamRes = res["DeliveryStreamomopstream"];
    expect(omopStreamRes).toBeDefined();
    expect(omopStreamRes.Properties.ExtendedS3DestinationConfiguration.Prefix).toBe("omop/");
    expect(omopStreamRes.Properties.ExtendedS3DestinationConfiguration.ErrorOutputPrefix).toBe("omop-failures/");
    expect(omopStreamRes.Properties.ExtendedS3DestinationConfiguration.BucketARN).toEqual({ "Fn::GetAtt": ["Bucketdocuments", "Arn"] });

    expect(res["FirehoseRoleauditstream"]).toBeDefined();
    expect(res["FirehoseRoleomopstream"]).toBeDefined();
    expect(template.Outputs["auditstreamDeliveryStreamName"]).toBeDefined();
    expect(template.Outputs["omopstreamDeliveryStreamName"]).toBeDefined();

    // Verify Injected Delivery Stream Environment Variables in Lambda
    expect(getUserFunc.Properties.Environment.Variables.AUDIT_DELIVERY_STREAM_NAME).toEqual({ Ref: "DeliveryStreamauditstream" });
    expect(getUserFunc.Properties.Environment.Variables.OMOP_DELIVERY_STREAM_NAME).toEqual({ Ref: "DeliveryStreamomopstream" });
  });
});

const CONTAINER_TEST_DIR = path.join(__dirname, ".tmp-test-container-app");

describe("@syncploy/compiler - Container Packaging (PackageType: Image)", () => {
  beforeAll(async () => {
    await fs.mkdir(CONTAINER_TEST_DIR, { recursive: true });

    await fs.writeFile(
      path.join(CONTAINER_TEST_DIR, "app.ts"),
      `
import { api, Queue } from "@syncploy/sdk";

export const workQueue = new Queue("work-queue");

// 1. Container with default Dockerfile (container: true)
export const containerApiDefault = api(
  {
    method: "POST",
    path: "/docker-default",
    ingress: "function-url",
    container: true,
  },
  async () => {
    return { ok: true };
  }
);

// 2. Container with custom Dockerfile & context
export const containerApiCustom = api(
  {
    method: "GET",
    path: "/docker-custom",
    container: {
      dockerfile: "./docker/Dockerfile.api",
      context: "./services",
    },
  },
  async () => {
    return { custom: true };
  }
);

// 3. Container with pre-built imageUri & ImageConfig
export const containerWorker = workQueue.consumer(
  {
    batchSize: 5,
    container: {
      imageUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:v1",
      cmd: ["app.handler"],
      entrypoint: ["/entrypoint.sh"],
      workingDirectory: "/var/task",
    },
  },
  async (event) => {
    console.log(event);
  }
);
`,
      "utf-8"
    );
  });

  afterAll(async () => {
    await fs.rm(CONTAINER_TEST_DIR, { recursive: true, force: true });
  });

  it("extracts container configurations in IR", async () => {
    const compiler = new Compiler(CONTAINER_TEST_DIR);
    const graph = await compiler.parse();

    const apiDefault = graph.apis.find((a) => a.id === "containerApiDefault");
    expect(apiDefault).toBeDefined();
    expect(apiDefault?.container).toEqual({
      dockerfile: "Dockerfile",
      context: ".",
      imageUri: undefined,
      cmd: undefined,
      entrypoint: undefined,
      workingDirectory: undefined,
    });

    const apiCustom = graph.apis.find((a) => a.id === "containerApiCustom");
    expect(apiCustom).toBeDefined();
    expect(apiCustom?.container?.dockerfile).toBe("./docker/Dockerfile.api");
    expect(apiCustom?.container?.context).toBe("./services");

    const worker = graph.consumers.find((c) => c.id === "containerWorker");
    expect(worker).toBeDefined();
    expect(worker?.container?.imageUri).toBe("123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:v1");
    expect(worker?.container?.cmd).toEqual(["app.handler"]);
    expect(worker?.container?.entrypoint).toEqual(["/entrypoint.sh"]);
    expect(worker?.container?.workingDirectory).toBe("/var/task");
  });

  it("synthesizes PackageType: Image and proper CloudFormation properties & metadata", async () => {
    const compiler = new Compiler(CONTAINER_TEST_DIR);
    const buildOutput = await compiler.build();
    const template = JSON.parse(await fs.readFile(buildOutput.templatePath, "utf-8"));
    const res = template.Resources;

    // 1. containerApiDefault (container: true)
    const funcDefault = res["FunctioncontainerApiDefault"];
    expect(funcDefault).toBeDefined();
    expect(funcDefault.Properties.PackageType).toBe("Image");
    expect(funcDefault.Properties.Runtime).toBeUndefined();
    expect(funcDefault.Properties.Handler).toBeUndefined();
    expect(funcDefault.Properties.Code).toEqual({
      ImageUri: { "Fn::Sub": "${AWS::AccountId}.dkr.ecr.${AWS::Region}.amazonaws.com/${AWS::StackName}-containerapidefault:latest" },
    });
    expect(funcDefault.Metadata).toEqual({
      Dockerfile: "Dockerfile",
      DockerContext: ".",
      DockerTag: "latest",
    });

    // 2. containerApiCustom
    const funcCustom = res["FunctioncontainerApiCustom"];
    expect(funcCustom).toBeDefined();
    expect(funcCustom.Properties.PackageType).toBe("Image");
    expect(funcCustom.Properties.Runtime).toBeUndefined();
    expect(funcCustom.Properties.Handler).toBeUndefined();
    expect(funcCustom.Metadata).toEqual({
      Dockerfile: "./docker/Dockerfile.api",
      DockerContext: "./services",
      DockerTag: "latest",
    });

    // 3. containerWorker (pre-built imageUri with ImageConfig)
    const funcWorker = res["FunctioncontainerWorker"];
    expect(funcWorker).toBeDefined();
    expect(funcWorker.Properties.PackageType).toBe("Image");
    expect(funcWorker.Properties.Runtime).toBeUndefined();
    expect(funcWorker.Properties.Handler).toBeUndefined();
    expect(funcWorker.Properties.Code).toEqual({
      ImageUri: "123456789012.dkr.ecr.us-east-1.amazonaws.com/worker:v1",
    });
    expect(funcWorker.Properties.ImageConfig).toEqual({
      Command: ["app.handler"],
      EntryPoint: ["/entrypoint.sh"],
      WorkingDirectory: "/var/task",
    });
    expect(funcWorker.Metadata).toBeUndefined();
  });
});

const BROWNFIELD_TEST_DIR = path.join(__dirname, ".tmp-test-app-brownfield");

describe("@syncploy/compiler - Brownfield Adoption (logicalId & physical name overrides)", () => {
  beforeAll(async () => {
    await fs.mkdir(BROWNFIELD_TEST_DIR, { recursive: true });

    await fs.writeFile(
      path.join(BROWNFIELD_TEST_DIR, "app.ts"),
      `
import { api, Table, Bucket, Queue, Topic, Alarm, DeliveryStream, Budget } from "@syncploy/sdk";

export const ehrTable = new Table("ehr", {
  logicalId: "EhrTable",
  tableName: "\${AWS::StackName}-custom-ehr",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  stream: "NEW_IMAGE",
});

export const documentsBucket = new Bucket("documents", {
  logicalId: "DocumentsBucket",
  bucketName: "my-custom-documents-bucket",
});

export const annotationQueue = new Queue("annotations", {
  logicalId: "EhrAnnotationQueue",
  queueName: "my-custom-queue",
  deadLetterQueue: {
    maxReceiveCount: 3,
    logicalId: "EhrAnnotationDLQ",
    queueName: "my-custom-dlq",
  },
});

export const ddosTopic = new Topic("ddos-alerts", {
  logicalId: "DdosAlertTopic",
  topicName: "my-custom-topic",
});

export const omopStream = new DeliveryStream("omop-stream", {
  logicalId: "EhrOmopDeliveryStream",
  streamName: "my-custom-stream",
  destination: documentsBucket,
});

export const backend = api({
  method: "GET",
  path: "/health",
  logicalId: "EhrBackendFunction",
  functionName: "my-custom-backend-fn",
  ingress: "function-url",
  handler: async () => ({ status: 200, body: "ok" }),
});

export const annotationWorker = annotationQueue.consumer({
  logicalId: "EhrAnnotationWorkerFunction",
  functionName: "my-custom-worker-fn",
  batchSize: 5,
  handler: async (event) => {},
});

export const omopPipeline = ehrTable.stream({
  logicalId: "EhrOmopPipelineFunction",
  functionName: "my-custom-pipeline-fn",
  handler: async (event) => {},
});

export const ddosSubscriber = ddosTopic.subscriber({
  logicalId: "DdosAlertSubscriber",
  functionName: "my-custom-subscriber-fn",
  handler: async (event) => {},
});

export const killSwitchAlarm = new Alarm("ddos-kill-switch", {
  logicalId: "DdosKillSwitchAlarm",
  alarmName: "my-custom-alarm",
  metric: {
    namespace: "AWS/Lambda",
    metricName: "Invocations",
    stat: "Sum",
    period: 60,
  },
  threshold: 2000,
  actions: ["DdosAlertTopic"],
});
`
    );
  });

  afterAll(async () => {
    await fs.rm(BROWNFIELD_TEST_DIR, { recursive: true, force: true });
  });

  it("extracts all logicalId and custom physical name properties into IR", async () => {
    const compiler = new Compiler(BROWNFIELD_TEST_DIR);
    const graph = await compiler.parse();

    const table = graph.tables.find((t) => t.name === "ehr");
    expect(table?.logicalId).toBe("EhrTable");
    expect(table?.tableName).toBe("${AWS::StackName}-custom-ehr");

    const bucket = graph.buckets.find((b) => b.name === "documents");
    expect(bucket?.logicalId).toBe("DocumentsBucket");
    expect(bucket?.bucketName).toBe("my-custom-documents-bucket");

    const queue = graph.queues.find((q) => q.name === "annotations");
    expect(queue?.logicalId).toBe("EhrAnnotationQueue");
    expect(queue?.queueName).toBe("my-custom-queue");
    expect(queue?.deadLetterQueue?.logicalId).toBe("EhrAnnotationDLQ");
    expect(queue?.deadLetterQueue?.queueName).toBe("my-custom-dlq");

    const topic = graph.topics?.find((t) => t.name === "ddos-alerts");
    expect(topic?.logicalId).toBe("DdosAlertTopic");
    expect(topic?.topicName).toBe("my-custom-topic");

    const stream = graph.deliveryStreams?.find((d) => d.name === "omop-stream");
    expect(stream?.logicalId).toBe("EhrOmopDeliveryStream");
    expect(stream?.streamName).toBe("my-custom-stream");

    const apiRoute = graph.apis.find((a) => a.id === "backend");
    expect(apiRoute?.logicalId).toBe("EhrBackendFunction");
    expect(apiRoute?.functionName).toBe("my-custom-backend-fn");

    const consumer = graph.consumers.find((c) => c.id === "annotationWorker");
    expect(consumer?.logicalId).toBe("EhrAnnotationWorkerFunction");
    expect(consumer?.functionName).toBe("my-custom-worker-fn");

    const tableStream = graph.tableStreams?.find((s) => s.id === "omopPipeline");
    expect(tableStream?.logicalId).toBe("EhrOmopPipelineFunction");
    expect(tableStream?.functionName).toBe("my-custom-pipeline-fn");

    const subscriber = graph.topicSubscribers?.find((s) => s.id === "ddosSubscriber");
    expect(subscriber?.logicalId).toBe("DdosAlertSubscriber");
    expect(subscriber?.functionName).toBe("my-custom-subscriber-fn");

    const alarm = graph.alarms?.find((a) => a.name === "ddos-kill-switch");
    expect(alarm?.logicalId).toBe("DdosKillSwitchAlarm");
    expect(alarm?.alarmName).toBe("my-custom-alarm");
  });

  it("synthesizes exact brownfield Logical IDs and physical names with resolved references", async () => {
    const compiler = new Compiler(BROWNFIELD_TEST_DIR);
    const buildOutput = await compiler.build();
    const template = JSON.parse(await fs.readFile(buildOutput.templatePath, "utf-8"));
    const res = template.Resources;

    // 1. Table
    expect(res["EhrTable"]).toBeDefined();
    expect(res["Tableehr"]).toBeUndefined();
    expect(res["EhrTable"].Properties.TableName).toEqual({ "Fn::Sub": "${AWS::StackName}-custom-ehr" });

    // 2. Bucket
    expect(res["DocumentsBucket"]).toBeDefined();
    expect(res["Bucketdocuments"]).toBeUndefined();
    expect(res["DocumentsBucket"].Properties.BucketName).toBe("my-custom-documents-bucket");

    // 3. Queue & DLQ
    expect(res["EhrAnnotationQueue"]).toBeDefined();
    expect(res["Queueannotations"]).toBeUndefined();
    expect(res["EhrAnnotationQueue"].Properties.QueueName).toBe("my-custom-queue");
    expect(res["EhrAnnotationQueue"].Properties.RedrivePolicy.deadLetterTargetArn).toEqual({
      "Fn::GetAtt": ["EhrAnnotationDLQ", "Arn"],
    });

    expect(res["EhrAnnotationDLQ"]).toBeDefined();
    expect(res["QueueannotationsDLQ"]).toBeUndefined();
    expect(res["EhrAnnotationDLQ"].Properties.QueueName).toBe("my-custom-dlq");

    // 4. Topic
    expect(res["DdosAlertTopic"]).toBeDefined();
    expect(res["Topicddosalerts"]).toBeUndefined();
    expect(res["DdosAlertTopic"].Properties.TopicName).toBe("my-custom-topic");

    // 5. DeliveryStream
    expect(res["EhrOmopDeliveryStream"]).toBeDefined();
    expect(res["DeliveryStreamomopstream"]).toBeUndefined();
    expect(res["EhrOmopDeliveryStream"].Properties.DeliveryStreamName).toBe("my-custom-stream");
    expect(res["EhrOmopDeliveryStream"].Properties.ExtendedS3DestinationConfiguration.BucketARN).toEqual({
      "Fn::GetAtt": ["DocumentsBucket", "Arn"],
    });
    expect(res["FirehoseRoleEhrOmopDeliveryStream"]).toBeDefined();

    // 6. Backend API Function & FunctionUrl
    expect(res["EhrBackendFunction"]).toBeDefined();
    expect(res["Functionbackend"]).toBeUndefined();
    expect(res["EhrBackendFunction"].Properties.FunctionName).toBe("my-custom-backend-fn");
    expect(res["EhrBackendFunction"].Properties.Environment.Variables.SYNCPLOY_TABLE_EHR).toEqual({
      Ref: "EhrTable",
    });
    expect(res["EhrBackendFunction"].Properties.Environment.Variables.SYNCPLOY_BUCKET_DOCUMENTS).toEqual({
      Ref: "DocumentsBucket",
    });
    expect(res["EhrBackendFunctionUrl"]).toBeDefined();

    // 7. SQS Consumer Function & Mapping
    expect(res["EhrAnnotationWorkerFunction"]).toBeDefined();
    expect(res["FunctionannotationWorker"]).toBeUndefined();
    expect(res["EhrAnnotationWorkerFunction"].Properties.FunctionName).toBe("my-custom-worker-fn");
    expect(res["EventSourceMappingEhrAnnotationWorkerFunction"].Properties.EventSourceArn).toEqual({
      "Fn::GetAtt": ["EhrAnnotationQueue", "Arn"],
    });
    expect(res["EventSourceMappingEhrAnnotationWorkerFunction"].Properties.FunctionName).toEqual({
      Ref: "EhrAnnotationWorkerFunction",
    });

    // 8. DynamoDB Stream Function & Mapping
    expect(res["EhrOmopPipelineFunction"]).toBeDefined();
    expect(res["FunctionomopPipeline"]).toBeUndefined();
    expect(res["EhrOmopPipelineFunction"].Properties.FunctionName).toBe("my-custom-pipeline-fn");
    expect(res["EventSourceMappingEhrOmopPipelineFunction"].Properties.EventSourceArn).toEqual({
      "Fn::GetAtt": ["EhrTable", "StreamArn"],
    });
    expect(res["EventSourceMappingEhrOmopPipelineFunction"].Properties.FunctionName).toEqual({
      Ref: "EhrOmopPipelineFunction",
    });

    // 9. Topic Subscriber Function & Subscription
    expect(res["DdosAlertSubscriber"]).toBeDefined();
    expect(res["FunctionddosSubscriber"]).toBeUndefined();
    expect(res["DdosAlertSubscriber"].Properties.FunctionName).toBe("my-custom-subscriber-fn");
    expect(res["SubscriptionDdosAlertSubscriber"].Properties.TopicArn).toEqual({
      Ref: "DdosAlertTopic",
    });
    expect(res["SubscriptionDdosAlertSubscriber"].Properties.Endpoint).toEqual({
      "Fn::GetAtt": ["DdosAlertSubscriber", "Arn"],
    });

    // 10. CloudWatch Alarm
    expect(res["DdosKillSwitchAlarm"]).toBeDefined();
    expect(res["Alarmddoskillswitch"]).toBeUndefined();
    expect(res["DdosKillSwitchAlarm"].Properties.AlarmName).toBe("my-custom-alarm");
    expect(res["DdosKillSwitchAlarm"].Properties.AlarmActions).toEqual([{ Ref: "DdosAlertTopic" }]);
  });

  test("Zero-Data-Loss Safety Rails (DeletionPolicy & UpdateReplacePolicy Retain defaults)", async () => {
    const testDir = path.join(tmpdir(), `syncploy-retain-test-${Date.now()}`);
    syncFs.mkdirSync(path.join(testDir, "src"), { recursive: true });

    syncFs.writeFileSync(
      path.join(testDir, "package.json"),
      JSON.stringify({ name: "retain-test", type: "module" })
    );

    syncFs.writeFileSync(
      path.join(testDir, "src/infra.ts"),
      `
import { Table, Bucket } from "@syncploy/sdk";

// Default stateful resources (should automatically get Retain)
export const defaultTable = new Table("default-tbl", {
  partitionKey: { name: "PK", type: "string" },
});

export const defaultBucket = new Bucket("default-bkt");

// Opt-out stateful resources (e.g. ephemeral test resources)
export const ephemeralTable = new Table("ephemeral-tbl", {
  partitionKey: { name: "id", type: "string" },
  retain: false,
});

export const ephemeralBucket = new Bucket("ephemeral-bkt", {
  deletionPolicy: "Delete",
});
`
    );

    const compiler = new Compiler(testDir);
    const graph = await compiler.parse();

    expect(graph.tables.find((t) => t.name === "default-tbl")?.retain).toBeUndefined();
    expect(graph.tables.find((t) => t.name === "ephemeral-tbl")?.retain).toBe(false);
    expect(graph.buckets.find((b) => b.name === "ephemeral-bkt")?.deletionPolicy).toBe("Delete");

    const synthesizer = new Synthesizer(testDir);
    const templatePath = await synthesizer.synthesize(graph, {});
    const template = JSON.parse(syncFs.readFileSync(templatePath, "utf-8"));
    const res = template.Resources;

    // Default table: MUST have Retain
    const tblKey = Object.keys(res).find((k) => res[k].Type === "AWS::DynamoDB::Table" && k.includes("default"));
    expect(tblKey).toBeDefined();
    expect(res[tblKey!].DeletionPolicy).toBe("Retain");
    expect(res[tblKey!].UpdateReplacePolicy).toBe("Retain");

    // Default bucket: MUST have Retain
    const bktKey = Object.keys(res).find((k) => res[k].Type === "AWS::S3::Bucket" && k.includes("default"));
    expect(bktKey).toBeDefined();
    expect(res[bktKey!].DeletionPolicy).toBe("Retain");
    expect(res[bktKey!].UpdateReplacePolicy).toBe("Retain");

    // Ephemeral table (retain: false): MUST have Delete
    const ephTblKey = Object.keys(res).find((k) => res[k].Type === "AWS::DynamoDB::Table" && k.includes("ephemeral"));
    expect(ephTblKey).toBeDefined();
    expect(res[ephTblKey!].DeletionPolicy).toBe("Delete");
    expect(res[ephTblKey!].UpdateReplacePolicy).toBe("Delete");

    // Ephemeral bucket (deletionPolicy: "Delete"): MUST have Delete
    const ephBktKey = Object.keys(res).find((k) => res[k].Type === "AWS::S3::Bucket" && k.includes("ephemeral"));
    expect(ephBktKey).toBeDefined();
    expect(res[ephBktKey!].DeletionPolicy).toBe("Delete");
    expect(res[ephBktKey!].UpdateReplacePolicy).toBe("Delete");
  });

  describe("End-to-End Infra Recursion Prevention", () => {
    const testDir = path.join(__dirname, ".tmp-test-app-recursion");

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Table } from "@syncploy/sdk";

export const recursiveTable = new Table("recursion-test-tbl", {
  stream: "NEW_IMAGE",
});

export const badConsumer = recursiveTable.stream(async (event) => {
  // Direct recursion!
  await recursiveTable.put({ PK: "TEST", SK: "1" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("statically detects recursive stream loop from AST and aborts build", async () => {
      const compiler = new Compiler(testDir);
      await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });
  });

  describe("Cross-Module AST Mutation Tracing & Strict Mode Build", () => {
    const testDir = path.join(__dirname, ".tmp-test-app-cross-module");

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const dbCode = `
import { Table } from "@syncploy/sdk";

export const ordersTable = new Table("orders-cross-tbl", {
  stream: "NEW_IMAGE",
});

export async function saveOrderRecord(record: any) {
  // Write to table inside an imported helper function!
  await ordersTable.put(record);
}
`;
      const appCode = `
import { ordersTable, saveOrderRecord } from "./db";

export const worker = ordersTable.stream(async (event) => {
  // Invokes imported function that writes back to ordersTable!
  await saveOrderRecord({ PK: "ORDER#1" });
});
`;
      await fs.writeFile(path.join(testDir, "db.ts"), dbCode);
      await fs.writeFile(path.join(testDir, "app.ts"), appCode);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("traces mutations across imported module files to catch recursive loops", async () => {
      const compiler = new Compiler(testDir);
      await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });
  });

  describe("Suppression Comments & Alias Resolution & Raw SDK Commands", () => {
    const testDir = path.join(__dirname, ".tmp-test-app-advanced-guardrails");

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("respects // syncploy-ignore comments to suppress fatal ERR_RECURSIVE_LOOP", async () => {
      const code = `
import { Table } from "@syncploy/sdk";

export const suppressedTable = new Table("suppressed-tbl", {
  stream: "NEW_IMAGE",
});

// syncploy-ignore ERR_RECURSIVE_LOOP reason="conditional update with optimistic locking"
export const loopWorker = suppressedTable.stream({ concurrency: 2 }, async (event) => {
  await suppressedTable.put({ PK: "TEST", SK: "1" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      const out = await compiler.build();
      expect(out.templatePath).toBeDefined();
    });

    it("catches recursion through variable aliasing (const t = tbl; t.put)", async () => {
      const code = `
import { Table } from "@syncploy/sdk";

export const aliasedTable = new Table("aliased-tbl", {
  stream: "NEW_IMAGE",
});

const t = aliasedTable;

export const aliasWorker = aliasedTable.stream({ concurrency: 2 }, async (event) => {
  await t.put({ PK: "ALIAS#1" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });

    it("catches recursion through raw AWS SDK PutItemCommand calls", async () => {
      const code = `
import { Table } from "@syncploy/sdk";

export const rawSdkTable = new Table("raw-sdk-tbl", {
  stream: "NEW_IMAGE",
});

export const rawWorker = rawSdkTable.stream({ concurrency: 2 }, async (event) => {
  const dynamo: any = {};
  await dynamo.send(new PutItemCommand({
    TableName: rawSdkTable.tableName,
    Item: { PK: { S: "RAW#1" } }
  }));
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });

    it("catches recursion through handler-local variable aliasing", async () => {
      const code = `
import { Table } from "@syncploy/sdk";

export const localTable = new Table("local-tbl", {
  stream: "NEW_IMAGE",
});

export const localWorker = localTable.stream({ concurrency: 2 }, async (event) => {
  const innerAlias = localTable;
  await innerAlias.put({ PK: "INNER#1" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      await expect(compiler.build()).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });

    it("catches recursion through HTTP self-invocation in API route handler under strict mode", async () => {
      const code = `
import { api } from "@syncploy/sdk";

export const loopApi = api({ path: "/orders", method: "POST", concurrency: 5 }, async (req) => {
  await fetch("/orders", { method: "POST" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      await expect(compiler.build({ strict: true })).rejects.toThrow("Pre-flight validation failed with 1 error(s).");
    });

    it("does not false-positive on external API calls (e.g. Stripe /v1/charges or headers.get)", async () => {
      const code = `
import { api } from "@syncploy/sdk";

export const charges = api({ path: "/charges", method: "POST", concurrency: 5 }, async (req) => {
  const authHeader = req.headers.get("authorization");
  await fetch("https://api.stripe.com/v1/charges", { method: "POST" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      const out = await compiler.build({ strict: true });
      expect(out.templatePath).toBeDefined();
    });

    it("does not collide handler-local aliases across different handlers (const t = a; const t = b)", async () => {
      const code = `
import { Table } from "@syncploy/sdk";

export const tableA = new Table("table-a", { stream: "NEW_IMAGE" });
export const tableB = new Table("table-b", { stream: "NEW_IMAGE" });

export const workerA = tableA.stream({ concurrency: 2 }, async () => {
  const t = tableB;
  await t.put({ id: "1" });
});

export const workerB = tableB.stream({ concurrency: 2 }, async () => {
  const t = tableB;
  await t.put({ id: "2" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const mutationsA = graph.tableStreams.find(s => s.id === "workerA")?.mutations?.tablesWritten;
      const mutationsB = graph.tableStreams.find(s => s.id === "workerB")?.mutations?.tablesWritten;
      expect(mutationsA).toEqual(["table-b"]);
      expect(mutationsB).toEqual(["table-b"]);
    });
  });

  describe("Cognito Auth Construct Synthesis & Environment Wiring", () => {
    const testDir = path.join(__dirname, ".tmp-test-app-auth");

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Auth, api } from "@syncploy/sdk";

export const clinicianAuth = new Auth("ehr", {
  logicalId: "EhrUserPool",
  adminOnly: true,
  signInMethod: "email",
  passwordPolicy: {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
    tempPasswordValidityDays: 7,
  },
  client: {
    clientLogicalId: "EhrUserPoolClient",
    generateSecret: false,
    explicitAuthFlows: [
      "ALLOW_USER_PASSWORD_AUTH",
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH",
    ],
    preventUserExistenceErrors: true,
  },
});

export const backend = api({
  method: "GET",
  path: "/health",
  logicalId: "EhrBackendFunction",
  ingress: "function-url",
  handler: async () => ({ status: 200, body: "ok" }),
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("synthesizes AWS::Cognito::UserPool, UserPoolClient, outputs, and auto-wires Lambda environment variables", async () => {
      const compiler = new Compiler(testDir);
      const out = await compiler.build();
      const template = JSON.parse(await fs.readFile(out.templatePath, "utf-8"));
      const res = template.Resources;
      const outputs = template.Outputs;

      // 1. User Pool
      expect(res["EhrUserPool"]).toBeDefined();
      expect(res["EhrUserPool"].Type).toBe("AWS::Cognito::UserPool");
      expect(res["EhrUserPool"].Properties.AdminCreateUserConfig).toEqual({
        AllowAdminCreateUserOnly: true,
      });
      expect(res["EhrUserPool"].Properties.UsernameAttributes).toEqual(["email"]);
      expect(res["EhrUserPool"].Properties.AutoVerifiedAttributes).toEqual(["email"]);
      expect(res["EhrUserPool"].Properties.Policies.PasswordPolicy).toEqual({
        MinimumLength: 12,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true,
        TemporaryPasswordValidityDays: 7,
      });

      // 2. User Pool Client
      expect(res["EhrUserPoolClient"]).toBeDefined();
      expect(res["EhrUserPoolClient"].Type).toBe("AWS::Cognito::UserPoolClient");
      expect(res["EhrUserPoolClient"].Properties.UserPoolId).toEqual({ Ref: "EhrUserPool" });
      expect(res["EhrUserPoolClient"].Properties.GenerateSecret).toBe(false);
      expect(res["EhrUserPoolClient"].Properties.PreventUserExistenceErrors).toBe("ENABLED");
      expect(res["EhrUserPoolClient"].Properties.ExplicitAuthFlows).toEqual([
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ]);

      // 3. Stack Outputs
      expect(outputs["CognitoUserPoolId"]).toBeDefined();
      expect(outputs["CognitoUserPoolId"].Value).toEqual({ Ref: "EhrUserPool" });
      expect(outputs["CognitoUserPoolClientId"]).toBeDefined();
      expect(outputs["CognitoUserPoolClientId"].Value).toEqual({ Ref: "EhrUserPoolClient" });

      // 4. Lambda Environment Auto-Wiring
      const func = res["FunctionEhrBackendFunction"] || res["EhrBackendFunction"];
      expect(func).toBeDefined();
      const env = func.Properties.Environment.Variables;
      expect(env["COGNITO_USER_POOL_ID"]).toEqual({ Ref: "EhrUserPool" });
      expect(env["COGNITO_CLIENT_ID"]).toEqual({ Ref: "EhrUserPoolClient" });
      expect(env["SYNCPLOY_AUTH_EHR_USER_POOL_ID"]).toEqual({ Ref: "EhrUserPool" });
      expect(env["SYNCPLOY_AUTH_EHR_CLIENT_ID"]).toEqual({ Ref: "EhrUserPoolClient" });
    });
  });

  describe("HTTP Self-Invocation with Template Literals and Lambda URLs", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-http-templates-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { api } from "@syncploy/sdk";

export const loopApi = api({
  method: "POST",
  path: "/loop",
  concurrency: 5,
}, async () => {
  // Realistic template literal form calling own endpoint
  await fetch(\`\${process.env.API_URL}/loop\`);
  // Realistic full Lambda URL calling own endpoint
  await fetch("https://xyz.lambda-url.us-east-1.on.aws/loop");
  // External Stripe API with coincident name
  await fetch("https://api.stripe.com/v1/loop");
  return { ok: true };
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("extracts httpInvoked for template literal and lambda-url self-calls, skipping external Stripe", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const apiRoute = graph.apis.find((a) => a.id === "loopApi");
      expect(apiRoute).toBeDefined();
      expect(apiRoute?.mutations?.httpInvoked).toContain("loopApi");

      const validator = new (await import("../src/validator")).GraphValidator();
      const validation = validator.validate(graph);
      expect(validation.warnings.some((w) => w.code === "WARN_HTTP_RECURSIVE_LOOP")).toBe(true);
    });
  });

  describe("Tarjan Attribution & Multi-Construct Suppression", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-scc-suppress-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Table } from "@syncploy/sdk";

// syncploy-ignore ERR_RECURSIVE_LOOP reason="Suppressed on Table construct instead of stream handler"
export const tbl = new Table("tbl", {
  partitionKey: { name: "id", type: "string" },
  stream: "NEW_IMAGE",
});

export const streamWorker = tbl.stream({
  concurrency: 2,
}, async (event) => {
  await tbl.put({ id: "1" });
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("allows suppressing ERR_RECURSIVE_LOOP on any construct in the SCC", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const validator = new (await import("../src/validator")).GraphValidator();
      const validation = validator.validate(graph);

      // Loop is suppressed via comment on Table tbl!
      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
      expect(validation.suppressions).toBeDefined();
      expect(validation.suppressions?.some((s) => s.code === "ERR_RECURSIVE_LOOP")).toBe(true);
      expect(validation.suppressions?.[0]?.reason).toContain("Suppressed on Table construct");
    });
  });

  describe("Multiple Budgets and Robust Budget Argument Parsing", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-multi-budgets-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Budget } from "@syncploy/sdk";

export const warningBudget = new Budget("warningBudget", {
  amount: 50,
  threshold: 80,
  filterByStack: true,
});

const criticalId = "criticalBudget";
export const criticalBudget = new Budget(criticalId, {
  amount: 100,
  threshold: 100,
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("parses multiple budgets and non-literal identifier names without crashing", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      expect(graph.budgets?.length).toBe(2);

      const out = await compiler.build();
      const template = JSON.parse(await fs.readFile(out.templatePath, "utf-8"));
      expect(template.Resources["BudgetwarningBudget"]).toBeDefined();
      expect(template.Resources["BudgetcriticalBudget"]).toBeDefined();
      expect(template.Resources["BudgetwarningBudget"].Properties.Budget.BudgetLimit.Amount).toBe(50);
      expect(template.Resources["BudgetcriticalBudget"].Properties.Budget.BudgetLimit.Amount).toBe(100);
    });
  });

  describe("Deployable SNS -> SQS Subscription and Topic Policy", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-sns-sqs-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Queue, Topic } from "@syncploy/sdk";

export const jobsQueue = new Queue("jobs", {
  visibilityTimeout: "60s",
});

export const eventsTopic = new Topic("events", {
  subscriptions: [
    { protocol: "sqs", endpoint: jobsQueue.queueUrl },
  ],
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("synthesizes GetAtt Arn for SQS endpoint and emits QueuePolicy for sns.amazonaws.com", async () => {
      const compiler = new Compiler(testDir);
      const out = await compiler.build();
      const template = JSON.parse(await fs.readFile(out.templatePath, "utf-8"));
      const res = template.Resources;

      // 1. Check Topic Subscription Endpoint is GetAtt Arn, not bare string
      const topic = res["Topicevents"];
      expect(topic).toBeDefined();
      expect(topic.Properties.Subscription).toBeDefined();
      expect(topic.Properties.Subscription[0].Protocol).toBe("sqs");
      expect(topic.Properties.Subscription[0].Endpoint).toEqual({
        "Fn::GetAtt": ["Queuejobs", "Arn"],
      });

      // 2. Check unified QueuePolicy for SNS is synthesized
      const queuePolicy = res["QueuePolicyQueuejobs"];
      expect(queuePolicy).toBeDefined();
      expect(queuePolicy.Type).toBe("AWS::SQS::QueuePolicy");
      expect(queuePolicy.Properties.PolicyDocument.Statement[0].Principal.Service).toBe("sns.amazonaws.com");
      expect(queuePolicy.Properties.PolicyDocument.Statement[0].Action).toBe("sqs:SendMessage");
    });
  });

  describe("Function URL Throttle & Budget Validation Guardrails", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-dow-guardrails-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { api, Budget } from "@syncploy/sdk";

export const funcUrl = api({
  path: "/webhook",
  ingress: "function-url",
  throttle: { rateLimit: 10, burstLimit: 20 },
}, async () => ({ ok: true }));

export const badBudget = new Budget("badBudget", {
  amount: 0,
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("flags WARN_FUNCTION_URL_THROTTLE_UNSUPPORTED, ERR_BUDGET_INVALID_AMOUNT, and WARN_DOW_BUDGET_NO_NOTIFICATION", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const validator = new (await import("../src/validator")).GraphValidator();
      const validation = validator.validate(graph);

      expect(validation.warnings.some((w) => w.code === "WARN_FUNCTION_URL_THROTTLE_UNSUPPORTED")).toBe(true);
      expect(validation.errors.some((e) => e.code === "ERR_BUDGET_INVALID_AMOUNT")).toBe(true);
      expect(validation.warnings.some((w) => w.code === "WARN_DOW_BUDGET_NO_NOTIFICATION")).toBe(true);
    });
  });

  describe("Single-Policy SQS Unification & Firehose/Lambda Endpoint Resolution", () => {
    const testDir = path.join(tmpdir(), `syncploy-test-unified-policy-${Date.now()}`);

    beforeAll(async () => {
      await fs.mkdir(testDir, { recursive: true });
      const code = `
import { Queue, Topic, Bucket, DeliveryStream, api, Budget } from "@syncploy/sdk";

export const eventsQueue = new Queue("eventsQueue");
export const analyticsStream = new DeliveryStream("analyticsStream", {
  destinationBucket: "raw-data",
});

export const worker = api({ path: "/work" }, async () => ({ status: "ok" }));

export const alphaTopic = new Topic("alphaTopic", {
  subscriptions: [{ protocol: "sqs", endpoint: eventsQueue }],
});

export const betaTopic = new Topic("betaTopic", {
  subscriptions: [
    { protocol: "sqs", endpoint: eventsQueue },
    { protocol: "firehose", endpoint: analyticsStream },
  ],
});

export const rawBucket = new Bucket("raw-data");
rawBucket.on("objectCreated", eventsQueue, { prefix: "uploads/" });

export const budgetA = new Budget("budgetA", {
  amount: 200,
  budgetName: "company-cost-ceiling",
  threshold: 90,
  unit: "USD",
  filterByStack: true,
  topic: alphaTopic,
});

export const budgetB = new Budget("budgetB", {
  amount: 300,
  budgetName: "company-cost-ceiling", // deliberate duplicate budgetName
  threshold: 85,
  topic: betaTopic,
});
`;
      await fs.writeFile(path.join(testDir, "app.ts"), code);
    });

    afterAll(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it("merges all SNS and EventBridge statements into exactly ONE AWS::SQS::QueuePolicy per queue", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const synthesizer = new Synthesizer(testDir);
      const templatePath = await synthesizer.synthesize(graph, {});
      const template = JSON.parse(await fs.readFile(templatePath, "utf-8"));
      const res = template.Resources;

      // Exactly ONE SQS QueuePolicy resource emitted for QueueeventsQueue
      const queuePolicies = Object.keys(res).filter(
        (k) =>
          res[k].Type === "AWS::SQS::QueuePolicy" &&
          res[k].Properties.Queues.some((q: any) => q.Ref === "QueueeventsQueue")
      );
      expect(queuePolicies.length).toBe(1);

      const policyResource = res[queuePolicies[0]!];
      expect(policyResource).toBeDefined();
      const statements = policyResource.Properties.PolicyDocument.Statement;
      // 3 merged statements: 2 from SNS topics (alphaTopic, betaTopic), 1 from S3 EventBridge
      expect(statements.length).toBe(3);

      const snsStatements = statements.filter((s: any) => s.Principal?.Service === "sns.amazonaws.com");
      expect(snsStatements.length).toBe(2);

      const ebStatements = statements.filter((s: any) => s.Principal?.Service === "events.amazonaws.com");
      expect(ebStatements.length).toBe(1);

      // Verify Firehose endpoint was resolved to GetAtt Arn
      const betaTopicRes = res["TopicbetaTopic"];
      expect(betaTopicRes).toBeDefined();
      const firehoseSub = betaTopicRes.Properties.Subscription.find((s: any) => s.Protocol === "firehose");
      expect(firehoseSub).toBeDefined();
      expect(firehoseSub.Endpoint).toEqual({
        "Fn::GetAtt": ["DeliveryStreamanalyticsStream", "Arn"],
      });

      // Verify Lambda environment has SYNCPLOY_QUEUE_<NAME>_ARN
      const workerFunc = res["Functionworker"];
      expect(workerFunc).toBeDefined();
      const envVars = workerFunc.Properties.Environment.Variables;
      expect(envVars["SYNCPLOY_QUEUE_EVENTSQUEUE_ARN"]).toEqual({
        "Fn::GetAtt": ["QueueeventsQueue", "Arn"],
      });
    });

    it("validates strict budget options and catches duplicate budgetName", async () => {
      const compiler = new Compiler(testDir);
      const graph = await compiler.parse();
      const validator = new (await import("../src/validator")).GraphValidator();
      const validation = validator.validate(graph);

      // Duplicate budgetName flagged
      expect(validation.errors.some((e) => e.code === "ERR_DUPLICATE_BUDGET_NAME")).toBe(true);
    });

    it("flags validation errors for invalid subscription endpoints and budget options", async () => {
      const invalidDir = path.join(tmpdir(), `syncploy-test-invalid-options-${Date.now()}`);
      await fs.mkdir(invalidDir, { recursive: true });
      const badCode = `
import { Topic, Budget } from "@syncploy/sdk";

export const badEndpointsTopic = new Topic("badEndpoints", {
  subscriptions: [
    { protocol: "firehose", endpoint: "non-existent-stream" },
    { protocol: "sqs", endpoint: "non-existent-queue" },
    { protocol: "lambda", endpoint: "non-existent-func" },
  ],
});

export const badThresholdBudget = new Budget("badThreshold", {
  amount: 100,
  threshold: 0,
});

export const badUnitBudget = new Budget("badUnit", {
  amount: 100,
  unit: "EUR",
});
`;
      await fs.writeFile(path.join(invalidDir, "app.ts"), badCode);

      try {
        const compiler = new Compiler(invalidDir);
        const graph = await compiler.parse();
        const validator = new (await import("../src/validator")).GraphValidator();
        const validation = validator.validate(graph);

        expect(validation.errors.some((e) => e.code === "ERR_SNS_FIREHOSE_ENDPOINT")).toBe(true);
        expect(validation.errors.some((e) => e.code === "ERR_SNS_SQS_ENDPOINT")).toBe(true);
        expect(validation.errors.some((e) => e.code === "ERR_SNS_LAMBDA_ENDPOINT")).toBe(true);
        expect(validation.errors.some((e) => e.code === "ERR_BUDGET_INVALID_THRESHOLD")).toBe(true);
        expect(validation.errors.some((e) => e.code === "ERR_BUDGET_INVALID_UNIT")).toBe(true);
      } finally {
        await fs.rm(invalidDir, { recursive: true, force: true });
      }
    });
  });
});
