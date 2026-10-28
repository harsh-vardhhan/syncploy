import {
  CloudFormationClient,
  CreateChangeSetCommand,
  DescribeChangeSetCommand,
  DeleteChangeSetCommand,
} from "@aws-sdk/client-cloudformation";
import type { ResourceDiff } from "./types";

export async function diffAgainstCloudFormation(
  stackName: string,
  templateJson: string,
  region?: string
): Promise<ResourceDiff[]> {
  const client = new CloudFormationClient({ region: region || process.env.AWS_REGION || "us-east-1" });
  const changeSetName = `syncploy-diff-${Date.now()}`;

  try {
    await client.send(
      new CreateChangeSetCommand({
        StackName: stackName,
        ChangeSetName: changeSetName,
        TemplateBody: templateJson,
        Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
        ChangeSetType: "UPDATE",
        Description: "Syncploy pre-flight diff inspection",
      })
    );
  } catch (err: any) {
    if (err.name === "ValidationError" && err.message?.includes("does not exist")) {
      // Stack doesn't exist yet, try CREATE ChangeSet
      await client.send(
        new CreateChangeSetCommand({
          StackName: stackName,
          ChangeSetName: changeSetName,
          TemplateBody: templateJson,
          Capabilities: ["CAPABILITY_IAM", "CAPABILITY_NAMED_IAM", "CAPABILITY_AUTO_EXPAND"],
          ChangeSetType: "CREATE",
          Description: "Syncploy initial stack creation preview",
        })
      );
    } else {
      throw err;
    }
  }

  let status = "CREATE_IN_PROGRESS";
  let describeRes: any;
  const pollStart = Date.now();

  while (status === "CREATE_IN_PROGRESS" || status === "CREATE_PENDING") {
    if (Date.now() - pollStart > 60000) {
      throw new Error("Timed out waiting for CloudFormation ChangeSet creation");
    }
    await new Promise((r) => setTimeout(r, 1500));
    describeRes = await client.send(
      new DescribeChangeSetCommand({
        StackName: stackName,
        ChangeSetName: changeSetName,
      })
    );
    status = describeRes.Status || "FAILED";
  }

  const diffs: ResourceDiff[] = [];

  try {
    if (status === "FAILED") {
      const reason = describeRes?.StatusReason || "";
      if (
        reason.includes("The submitted information didn't contain changes") ||
        reason.includes("No updates are to be performed")
      ) {
        return [];
      }
      throw new Error(`ChangeSet creation failed: ${reason}`);
    }

    const changes = describeRes?.Changes || [];
    for (const change of changes) {
      const rc = change.ResourceChange;
      if (!rc) continue;

      let action: ResourceDiff["action"] = "UPDATE";
      if (rc.Action === "Add") action = "CREATE";
      else if (rc.Action === "Remove") action = "DELETE";
      else if (rc.Action === "Modify") {
        action = rc.Replacement === "True" ? "REPLACE" : "UPDATE";
      }

      const details = (rc.Details || []).map((d: any) => {
        const target = d.Target?.Attribute || d.Target?.Name || "Property";
        return `${d.Target?.Attribute ? "Attribute" : "Property"} ${target} (${d.Evaluation || "Static"})`;
      });

      diffs.push({
        logicalId: rc.LogicalResourceId || "Unknown",
        type: rc.ResourceType || "Unknown",
        action,
        replacement: rc.Replacement,
        details: details.length > 0 ? details : undefined,
      });
    }
  } finally {
    // Always clean up the temporary change set
    try {
      await client.send(
        new DeleteChangeSetCommand({
          StackName: stackName,
          ChangeSetName: changeSetName,
        })
      );
    } catch {}
  }

  return diffs;
}
