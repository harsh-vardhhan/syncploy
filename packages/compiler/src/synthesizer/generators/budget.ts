import type { ResourceGraph } from "../../types";
import { getTopicLogicalId } from "../logical-ids";

export function generateBudget(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  const hasExistingBudget = Object.values(resources).some(
    (r: any) => r.Type === "AWS::Budgets::Budget"
  );
  if (hasExistingBudget) return;

  const budgetProps: any = {
    Budget: {
      BudgetName: { "Fn::Sub": "${AWS::StackName}-budget" },
      BudgetType: "COST",
      TimeUnit: "MONTHLY",
      BudgetLimit: {
        Amount: 100,
        Unit: "USD",
      },
    },
  };

  const alertTopic = (graph.topics || []).find(
    (t) =>
      t.name.toLowerCase().includes("alert") ||
      t.name.toLowerCase().includes("kill") ||
      t.name.toLowerCase().includes("alarm")
  );

  if (alertTopic) {
    budgetProps.NotificationsWithSubscribers = [
      {
        Notification: {
          NotificationType: "ACTUAL",
          ComparisonOperator: "GREATER_THAN",
          Threshold: 80,
          ThresholdType: "PERCENTAGE",
        },
        Subscribers: [
          {
            SubscriptionType: "SNS",
            Address: { Ref: getTopicLogicalId(alertTopic) },
          },
        ],
      },
    ];
  }

  resources["StackBudget"] = {
    Type: "AWS::Budgets::Budget",
    Properties: budgetProps,
  };
}
