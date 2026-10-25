import { describe, expect, it } from "bun:test";
import { diffTemplates, loadTemplate } from "../src/diff";

describe("@syncploy/cli - diff engine", () => {
  it("detects new resources (+ [CREATE])", () => {
    const oldTpl = { Resources: {} };
    const newTpl = {
      Resources: {
        NewTable: { Type: "AWS::DynamoDB::Table", Properties: { TableName: "new-table" } },
      },
    };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.logicalId).toBe("NewTable");
    expect(diff.action).toBe("CREATE");
  });

  it("detects deleted resources (- [DELETE])", () => {
    const oldTpl = {
      Resources: {
        LegacyQueue: { Type: "AWS::SQS::Queue", Properties: { QueueName: "legacy" } },
      },
    };
    const newTpl = { Resources: {} };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.logicalId).toBe("LegacyQueue");
    expect(diff.action).toBe("DELETE");
  });

  it("detects in-place updates (~ [UPDATE]) when properties change safely", () => {
    const oldTpl = {
      Resources: {
        ApiFunction: {
          Type: "AWS::Lambda::Function",
          Properties: { Timeout: 30, MemorySize: 256 },
        },
      },
    };
    const newTpl = {
      Resources: {
        ApiFunction: {
          Type: "AWS::Lambda::Function",
          Properties: { Timeout: 60, MemorySize: 512 },
        },
      },
    };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.logicalId).toBe("ApiFunction");
    expect(diff.action).toBe("UPDATE");
    expect(diff.replacement).toBeUndefined();
    expect(diff.details).toContain("~ Timeout");
    expect(diff.details).toContain("~ MemorySize");
  });

  it("flags high-risk replacements (! [REPLACE]) when critical properties change", () => {
    const oldTpl = {
      Resources: {
        EhrTable: {
          Type: "AWS::DynamoDB::Table",
          Properties: { TableName: "old-table-name" },
        },
      },
    };
    const newTpl = {
      Resources: {
        EhrTable: {
          Type: "AWS::DynamoDB::Table",
          Properties: { TableName: "new-table-name" },
        },
      },
    };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.logicalId).toBe("EhrTable");
    expect(diff.action).toBe("REPLACE");
    expect(diff.replacement).toBe("True");
    expect(diff.details?.[0]).toContain("TableName changed");
  });

  it("recognizes SAM AWS::Serverless::Function to AWS::Lambda::Function migration as an update", () => {
    const oldTpl = {
      Resources: {
        BackendFunction: {
          Type: "AWS::Serverless::Function",
          Properties: { PackageType: "Image", Timeout: 30 },
        },
      },
    };
    const newTpl = {
      Resources: {
        BackendFunction: {
          Type: "AWS::Lambda::Function",
          Properties: { PackageType: "Image", Timeout: 30 },
        },
      },
    };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.logicalId).toBe("BackendFunction");
    expect(diff.action).toBe("UPDATE");
  });

  it("marks identical resources as IN_SYNC", () => {
    const oldTpl = {
      Resources: {
        StaticBucket: {
          Type: "AWS::S3::Bucket",
          Properties: { BucketName: "my-static-bucket" },
        },
      },
    };
    const newTpl = {
      Resources: {
        StaticBucket: {
          Type: "AWS::S3::Bucket",
          Properties: { BucketName: "my-static-bucket" },
        },
      },
    };

    const diffs = diffTemplates(oldTpl, newTpl);
    expect(diffs).toHaveLength(1);
    const diff = diffs[0]!;
    expect(diff.action).toBe("IN_SYNC");
  });
});
