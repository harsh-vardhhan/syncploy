import { type ResourceGraph, getBudgets } from "../../types";
import { getTopicLogicalId, sanitizeName } from "../logical-ids";

export function generateBudget(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  const budgetList = getBudgets(graph);
  if (budgetList.length === 0) return;

  const usedKeys = new Set<string>();

  for (const budget of budgetList) {
    let budgetKey =
      budget.logicalId ||
      (budgetList.length === 1 ? "StackBudget" : `Budget${sanitizeName(budget.id)}`);
    if (usedKeys.has(budgetKey)) {
      let idx = 2;
      while (usedKeys.has(`${budgetKey}${idx}`)) {
        idx++;
      }
      budgetKey = `${budgetKey}${idx}`;
    }
    usedKeys.add(budgetKey);

    const threshold = budget.threshold ?? 80;

    const budgetInner: any = {
      BudgetName: budget.budgetName || {
        "Fn::Sub":
          budgetList.length === 1
            ? "${AWS::StackName}-${AWS::Region}-budget"
            : `\${AWS::StackName}-\${AWS::Region}-${budget.id}-budget`,
      },
      BudgetType: "COST",
      TimeUnit: "MONTHLY",
      BudgetLimit: {
        Amount: budget.amount,
        Unit: budget.unit || "USD",
      },
    };

    if (budget.filterByStack) {
      budgetInner.CostFilters = {
        TagKeyValue: [{ "Fn::Sub": "user:StackName$${AWS::StackName}" }],
      };
    }

    const budgetProps: any = {
      Budget: budgetInner,
      ResourceTags: [
        {
          Key: "StackName",
          Value: { "Fn::Sub": "${AWS::StackName}" },
        },
      ],
    };

    const targetTopic = budget.topicName
      ? (graph.topics || []).find((t) => t.name === budget.topicName || t.id === budget.topicName)
      : (graph.topics || []).find(
          (t) =>
            t.name.toLowerCase().includes("alert") ||
            t.name.toLowerCase().includes("kill") ||
            t.name.toLowerCase().includes("alarm")
        );

    if (targetTopic) {
      const topicLogicalId = getTopicLogicalId(targetTopic);
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
              Address: { Ref: topicLogicalId },
            },
          ],
        },
      ];

      // Synthesize AWS::SNS::TopicPolicy granting budgets.amazonaws.com permission to publish to the topic
      const topicPolicyKey = `TopicPolicy${topicLogicalId}ForBudgets`;
      if (!resources[topicPolicyKey]) {
        resources[topicPolicyKey] = {
          Type: "AWS::SNS::TopicPolicy",
          Properties: {
            Topics: [{ Ref: topicLogicalId }],
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                {
                  Sid: "AWSBudgetsSNSPublishingPermissions",
                  Effect: "Allow",
                  Principal: { Service: "budgets.amazonaws.com" },
                  Action: "sns:Publish",
                  Resource: { Ref: topicLogicalId },
                  Condition: {
                    StringEquals: {
                      "aws:SourceAccount": { Ref: "AWS::AccountId" },
                    },
                    ArnLike: {
                      "aws:SourceArn": { "Fn::Sub": "arn:aws:budgets::${AWS::AccountId}:budget/*" },
                    },
                  },
                },
              ],
            },
          },
        };
      }
    }

    resources[budgetKey] = {
      Type: "AWS::Budgets::Budget",
      Properties: budgetProps,
    };
  }
}
