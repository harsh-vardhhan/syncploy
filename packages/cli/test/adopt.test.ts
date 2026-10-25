import { describe, expect, it } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { tmpdir } from "node:os";
import { adoptTemplate, parseSamConfig } from "../src/adopt";

describe("@syncploy/cli - adopt engine", () => {
  it("parses samconfig.toml parameter_overrides and stack_name correctly", () => {
    const testDir = path.join(tmpdir(), `syncploy-samconfig-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const configPath = path.join(testDir, "samconfig.toml");

    fs.writeFileSync(
      configPath,
      `
version = 0.1
[default.deploy.parameters]
stack_name = "test-stack"
parameter_overrides = "TableParam=\\\"prod-table\\\" BucketParam=\\\"prod-bucket\\\""
`
    );

    const { parameters, stackName } = parseSamConfig(configPath);
    expect(stackName).toBe("test-stack");
    expect(parameters["TableParam"]).toBe("prod-table");
    expect(parameters["BucketParam"]).toBe("prod-bucket");
  });

  it("adopts CloudFormation resources into valid TypeScript code", () => {
    const testDir = path.join(tmpdir(), `syncploy-adopt-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    const templatePath = path.join(testDir, "template.yaml");

    fs.writeFileSync(
      templatePath,
      `
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Parameters:
  AppTableName:
    Type: String
    Default: fallback-table
  AppBucketName:
    Type: String

Resources:
  AppTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Ref AppTableName
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      StreamSpecification:
        StreamViewType: NEW_IMAGE

  AppBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AppBucketName
      VersioningConfiguration:
        Status: Enabled
      NotificationConfiguration:
        EventBridgeConfiguration:
          EventBridgeEnabled: true

  OrdersQueue:
    Type: AWS::SQS::Queue
    Properties:
      QueueName: orders-queue
      VisibilityTimeout: 120

  AlertTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: alert-topic

  CustomResourceUnmodeled:
    Type: Custom::SpecialService
`
    );

    const result = adoptTemplate({
      templatePath,
      params: {
        AppBucketName: "resolved-orders-bucket",
      },
      out: path.join(testDir, "src/infra.ts"),
    });

    expect(result.adoptedResources.tables).toContain("AppTable");
    expect(result.adoptedResources.buckets).toContain("AppBucket");
    expect(result.adoptedResources.queues).toContain("OrdersQueue");
    expect(result.adoptedResources.topics).toContain("AlertTopic");
    expect(result.unmodeledResources).toContain("CustomResourceUnmodeled (Custom::SpecialService)");

    // Verify generated code
    expect(result.code).toContain('new Table("app",');
    expect(result.code).toContain('logicalId: "AppTable"');
    expect(result.code).toContain('tableName: "fallback-table"');
    expect(result.code).toContain('stream: "NEW_IMAGE"');

    expect(result.code).toContain('new Bucket("app",');
    expect(result.code).toContain('logicalId: "AppBucket"');
    expect(result.code).toContain('bucketName: "resolved-orders-bucket"');
    expect(result.code).toContain("versioned: true");
    expect(result.code).toContain("eventBridge: true");

    expect(result.code).toContain('new Queue("orders",');
    expect(result.code).toContain('queueName: "orders-queue"');
    expect(result.code).toContain("visibilityTimeout: 120");

    expect(result.code).toContain('new Topic("alert",');
    expect(result.code).toContain('topicName: "alert-topic"');

    // Verify file output
    expect(fs.existsSync(path.join(testDir, "src/infra.ts"))).toBe(true);
  });
});
