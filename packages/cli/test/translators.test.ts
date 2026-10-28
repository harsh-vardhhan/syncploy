import { describe, expect, it } from "bun:test";
import {
  translateTables,
  translateBuckets,
  translateQueues,
  translateTopics,
  translateDeliveryStreams,
  translateAlarms,
  translateAuth,
  translateFunctions,
  extractUnmodeledResources,
} from "../src/adopt/translators";

describe("@syncploy/cli - modular adopt translators", () => {
  it("translates Cognito Auth and UserPoolClient correctly", () => {
    const resources = {
      MyUserPool: {
        Type: "AWS::Cognito::UserPool",
        Properties: {
          AdminCreateUserConfig: { AllowAdminCreateUserOnly: true },
          UsernameAttributes: ["email"],
          Policies: {
            PasswordPolicy: {
              MinimumLength: 12,
              RequireUppercase: true,
              RequireNumbers: true,
            },
          },
        },
      },
      MyUserPoolClient: {
        Type: "AWS::Cognito::UserPoolClient",
        Properties: {
          UserPoolId: "MyUserPool",
          GenerateSecret: false,
          PreventUserExistenceErrors: "ENABLED",
        },
      },
    };

    const result = translateAuth({
      resources,
      params: {},
      templateParams: {},
    });

    expect(result.adopted).toContain("MyUserPool");
    expect(result.adopted).toContain("MyUserPoolClient");
    expect(result.code).toContain('new Auth("my"');
    expect(result.code).toContain('adminOnly: true');
    expect(result.code).toContain('signInMethod: "email"');
    expect(result.code).toContain('minLength: 12');
    expect(result.code).toContain('clientLogicalId: "MyUserPoolClient"');
  });

  it("translates CloudWatch Alarms correctly", () => {
    const resources = {
      ErrorAlarm: {
        Type: "AWS::CloudWatch::Alarm",
        Properties: {
          AlarmName: "high-errors",
          Threshold: 10,
          EvaluationPeriods: 2,
          ComparisonOperator: "GreaterThanOrEqualToThreshold",
        },
      },
    };

    const result = translateAlarms({
      resources,
      params: {},
      templateParams: {},
    });

    expect(result.adopted).toContain("ErrorAlarm");
    expect(result.code).toContain('new Alarm("error"');
    expect(result.code).toContain('threshold: 10');
    expect(result.code).toContain('evaluationPeriods: 2');
  });

  it("translates Firehose DeliveryStreams referencing buckets", () => {
    const resources = {
      FirehoseStream: {
        Type: "AWS::KinesisFirehose::DeliveryStream",
        Properties: {
          DeliveryStreamName: "audit-stream",
          ExtendedS3DestinationConfiguration: {
            BucketARN: { "Fn::GetAtt": ["AuditBucket", "Arn"] },
            BufferingHints: {
              IntervalInSeconds: 300,
              SizeInMBs: 128,
            },
            CompressionFormat: "GZIP",
          },
        },
      },
    };

    const result = translateDeliveryStreams({
      resources,
      params: {},
      templateParams: {},
      bucketLogicalIdToVar: { AuditBucket: "auditBucket" },
    });

    expect(result.adopted).toContain("FirehoseStream");
    expect(result.code).toContain('new DeliveryStream("firehose-stream"');
    expect(result.code).toContain('destination: auditBucket');
    expect(result.code).toContain('bufferingInterval: "300s"');
    expect(result.code).toContain('compression: "GZIP"');
  });

  it("extracts discovered Lambda functions as helpful guide comments", () => {
    const resources = {
      WorkerFunction: {
        Type: "AWS::Serverless::Function",
        Properties: {
          FunctionName: "doc-worker",
          Handler: "src/worker.handler",
        },
      },
    };

    const result = translateFunctions({
      resources,
      params: {},
      templateParams: {},
    });

    expect(result.adopted).toContain("WorkerFunction");
    expect(result.code).toContain("WorkerFunction (Handler: src/worker.handler");
  });

  it("identifies unmodeled escape-hatch resources", () => {
    const resources = {
      NormalTable: { Type: "AWS::DynamoDB::Table" },
      VpcSubnet: { Type: "AWS::EC2::Subnet" },
      EcsCluster: { Type: "AWS::ECS::Cluster" },
    };

    const unmodeled = extractUnmodeledResources(resources);
    expect(unmodeled).toContain("VpcSubnet (AWS::EC2::Subnet)");
    expect(unmodeled).toContain("EcsCluster (AWS::ECS::Cluster)");
    expect(unmodeled).not.toContain("NormalTable (AWS::DynamoDB::Table)");
  });
});
