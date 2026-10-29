import type { ResourceGraph } from "../../types";
import { getTopicLogicalId } from "../logical-ids";

export function generateBudget(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  // Only synthesize when explicitly requested/configured
  if (!graph.budget) return;

  const budgetKey = graph.budget.logicalId || "StackBudget";
  const threshold = graph.budget.threshold ?? 80;

  const budgetInner: any = {
    BudgetName: graph.budget.budgetName || { "Fn::Sub": "${AWS::StackName}-budget" },
    BudgetType: "COST",
    TimeUnit: "MONTHLY",
    BudgetLimit: {
      Amount: graph.budget.amount,
      Unit: graph.budget.unit || "USD",
    },
  };

  if (graph.budget.filterByStack) {
    budgetInner.CostFilters = {
      TagKeyValue: [{ "Fn::Sub": "user:StackName$${AWS::StackName}" }],
    };
  }

  const budgetProps: any = {
    Budget: budgetInner,
  };

  const targetTopic = graph.budget.topicName
    ? (graph.topics || []).find((t) => t.name === graph.budget!.topicName || t.id === graph.budget!.topicName)
    : (graph.topics || []).find(
        (t) =>
          t.name.toLowerCase().includes("alert") ||
          t.name.toLowerCase().includes("kill") ||
          t.name.toLowerCase().includes("alarm")
      );

  if (targetTopic) {
    budgetProps.NotificationsWithSubscribers = [
      {
        Notification: {
          NotificationType: "ACTUAL",
          ComparisonOperator: "GREATER_THAN",
          Threshold: threshold,
          ThresholdType: "PERCENTAGE",
        },
        Subscribers: [
          {
            SubscriptionType: "SNS",
            Address: { Ref: getTopicLogicalId(targetTopic) },
          },
        ],
      },
    ];
  }

  resources[budgetKey] = {
    Type: "AWS::Budgets::Budget",
    Properties: budgetProps,
  };
}
