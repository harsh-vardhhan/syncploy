import { describe, expect, test } from "bun:test";
import { PolicyGenerator } from "../src/policy";
import type { ResourceGraph } from "../src/types";

describe("@syncploy/compiler - Least-Privilege Deploy Policy Generator", () => {
  const mockGraph: ResourceGraph = {
    apis: [
      {
        id: "backend",
        exportName: "backend",
        sourceFile: "app.ts",
        method: "GET",
        path: "/health",
        ingress: "function-url",
        concurrency: 2,
        container: {
          dockerfile: "Dockerfile",
          context: ".",
        },
      },
    ],
    tables: [
      {
        id: "ehrTable",
        name: "ehr",
        partitionKey: { name: "PK", type: "string" },
        sourceFile: "app.ts",
      },
    ],
    tableStreams: [],
    buckets: [
      {
        id: "docs",
        name: "documents",
        sourceFile: "app.ts",
      },
    ],
    queues: [
      {
        id: "annQueue",
        name: "annotations",
        sourceFile: "app.ts",
      },
    ],
    consumers: [],
    topics: [],
    topicSubscribers: [],
    alarms: [],
    deliveryStreams: [],
    bindings: [],
    auths: [
      {
        id: "auth",
        name: "ehr",
        signInMethod: "email",
        adminOnly: true,
        sourceFile: "app.ts",
        client: {
          clientLogicalId: "EhrUserPoolClient",
        },
      },
    ],
  };

  test("generates minimal deploy policy matching only declared infrastructure", () => {
    const generator = new PolicyGenerator();
    const policy = generator.generate(mockGraph, {}, {
      stackName: "ehr-annotation-backend",
      region: "ap-south-1",
      accountId: "123456789012",
    });

    expect(policy.Version).toBe("2012-10-17");

    const sids = policy.Statement.map((s) => s.Sid);
    expect(sids).toContain("CloudFormationStackManagement");
    expect(sids).toContain("S3BucketInfrastructureManagement");
    expect(sids).toContain("DynamoDBTableManagement");
    expect(sids).toContain("LambdaFunctionManagement");
    expect(sids).toContain("SQSQueueManagement");
    expect(sids).toContain("CognitoUserPoolManagement");
    expect(sids).toContain("ECRRepositoryManagement");

    // Must NOT contain undeclared resources
    expect(sids).not.toContain("APIGatewayManagement");
    expect(sids).not.toContain("SNSTopicManagement");
    expect(sids).not.toContain("CloudWatchAlarmManagement");
    expect(sids).not.toContain("FirehoseDeliveryStreamManagement");
  });

  test("strictly scopes Cognito UserPool to stack ARNs instead of wildcards", () => {
    const generator = new PolicyGenerator();
    const policy = generator.generate(mockGraph, {}, {
      stackName: "ehr-annotation-backend",
      region: "ap-south-1",
      accountId: "123456789012",
    });

    const cognitoStmt = policy.Statement.find((s) => s.Sid === "CognitoUserPoolManagement");
    expect(cognitoStmt).toBeDefined();
    expect(cognitoStmt?.Resource).toEqual(["arn:aws:cognito-idp:ap-south-1:123456789012:userpool/*"]);

    // Verifies CloudFormation shadow handler actions are included
    expect(cognitoStmt?.Action).toContain("cognito-idp:DescribeUserPool");
    expect(cognitoStmt?.Action).toContain("cognito-idp:TagResource");
    expect(cognitoStmt?.Action).toContain("cognito-idp:ListTagsForResource");
  });

  test("evaluates existing over-privileged policy and detects dead services and wildcards", () => {
    const generator = new PolicyGenerator();
    const optimalPolicy = generator.generate(mockGraph, {}, {
      stackName: "ehr-annotation-backend",
      region: "ap-south-1",
      accountId: "123456789012",
    });

    const legacyPolicy = {
      Version: "2012-10-17" as const,
      Statement: [
        {
          Sid: "APIGatewayManagement",
          Effect: "Allow" as const,
          Action: ["apigateway:GET", "apigateway:POST"],
          Resource: "arn:aws:apigateway:ap-south-1::/restapis*",
        },
        {
          Sid: "CloudFrontManagement",
          Effect: "Allow" as const,
          Action: ["cloudfront:CreateDistribution", "cloudfront:GetDistribution"],
          Resource: "*",
        },
        {
          Sid: "LegacyCognito",
          Effect: "Allow" as const,
          Action: ["cognito-idp:CreateUserPool", "cognito-idp:DeleteUserPool"],
          Resource: "*",
        },
      ],
    };

    const report = generator.evaluate(legacyPolicy, optimalPolicy, mockGraph);

    // Dead permissions detected
    expect(report.deadPermissions.some((d) => d.actions.some((a) => a.startsWith("apigateway:")))).toBe(true);
    expect(report.deadPermissions.some((d) => d.actions.some((a) => a.startsWith("cloudfront:")))).toBe(true);

    // Wildcard tightened detected for Cognito
    expect(report.wildcardReductions.some((w) => w.service === "cognito-idp")).toBe(true);

    // Missing CloudFormation shadow actions detected (DescribeUserPool, TagResource, ListTagsForResource)
    const cognitoMissing = report.missingActionsInExisting.find((m) => m.service === "cognito-idp");
    expect(cognitoMissing).toBeDefined();
    expect(cognitoMissing?.missingActions).toContain("cognito-idp:DescribeUserPool");
    expect(cognitoMissing?.missingActions).toContain("cognito-idp:TagResource");
  });
});
