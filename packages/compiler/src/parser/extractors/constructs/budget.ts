import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { BudgetIR } from "../../../types";
import type { ParseContext } from "../../types";
import { extractCommentSuppressions, extractNumber, extractString } from "../ast-utils";

export function extractBudget(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context?: ParseContext
): BudgetIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Budget") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  let budgetId = varName;
  if (args.length > 0 && args[0]) {
    if (args[0].isKind(SyntaxKind.StringLiteral)) {
      budgetId = args[0].getLiteralValue();
    } else if (args[0].isKind(SyntaxKind.Identifier)) {
      const idDecl = sourceFile.getVariableDeclaration(args[0].getText());
      const idInit = idDecl?.getInitializer();
      if (idInit && idInit.isKind(SyntaxKind.StringLiteral)) {
        budgetId = idInit.getLiteralValue();
      } else {
        budgetId = args[0].getText() || varName;
      }
    } else {
      budgetId = args[0].getText().replace(/['"]/g, "") || varName;
    }
  }

  let amount: number | undefined;
  let unit = "USD";
  let topicName: string | undefined;
  let threshold: number | undefined;
  let logicalId: string | undefined;
  let customBudgetName: string | undefined;
  let filterByStack: boolean | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customBudgetName = extractString(opts.getProperty("budgetName"));
    amount = extractNumber(opts.getProperty("amount"));
    unit = extractString(opts.getProperty("unit")) || "USD";
    threshold = extractNumber(opts.getProperty("threshold")) ?? 80;

    const filterProp = opts.getProperty("filterByStack");
    if (filterProp && filterProp.isKind(SyntaxKind.PropertyAssignment)) {
      filterByStack = filterProp.getInitializer()?.getText() === "true";
    }

    const topicProp = opts.getProperty("topic");
    if (topicProp && topicProp.isKind(SyntaxKind.PropertyAssignment)) {
      const tInit = topicProp.getInitializer();
      if (tInit) {
        if (tInit.isKind(SyntaxKind.StringLiteral)) {
          topicName = tInit.getLiteralValue();
        } else if (tInit.isKind(SyntaxKind.Identifier)) {
          const idName = tInit.getText();
          topicName = context?.varToTopicName?.[idName] || idName;
        }
      }
    }
  }

  return {
    id: budgetId,
    amount,
    unit,
    topicName,
    threshold,
    logicalId,
    budgetName: customBudgetName,
    filterByStack,
    sourceFile: sourceFile.getFilePath(),
    suppressions: extractCommentSuppressions(decl),
  };
}
