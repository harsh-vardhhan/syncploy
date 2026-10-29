import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { BudgetIR } from "../../../types";
import type { ParseContext } from "../../types";
import {
  extractCommentSuppressions,
  extractNumber,
  extractString,
  extractStringLiteral,
  resolveConstantInitializer,
} from "../ast-utils";

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
      const idInit = resolveConstantInitializer(args[0]);
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
  let unit: string | undefined = "USD";
  let unitInvalid: boolean | undefined;
  let topicName: string | undefined;
  let threshold: number | undefined;
  let thresholdInvalid: boolean | undefined;
  let logicalId: string | undefined;
  let customBudgetName: string | undefined;
  let budgetNameInvalid: boolean | undefined;
  let filterByStack: boolean | undefined;
  let filterByStackInvalid: boolean | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));

    const budgetNameProp = opts.getProperty("budgetName");
    if (budgetNameProp) {
      customBudgetName = extractStringLiteral(budgetNameProp);
      if (!customBudgetName) {
        budgetNameInvalid = true;
      }
    }

    amount = extractNumber(opts.getProperty("amount"));

    const unitProp = opts.getProperty("unit");
    if (unitProp) {
      unit = extractStringLiteral(unitProp);
      if (!unit) {
        unitInvalid = true;
      }
    }

    const thresholdProp = opts.getProperty("threshold");
    if (thresholdProp) {
      threshold = extractNumber(thresholdProp);
      if (threshold === undefined || isNaN(threshold) || threshold <= 0) {
        thresholdInvalid = true;
      }
    } else {
      threshold = 80;
    }

    const filterProp = opts.getProperty("filterByStack");
    if (filterProp) {
      let initNode: any;
      if (filterProp.isKind(SyntaxKind.PropertyAssignment)) {
        initNode = filterProp.getInitializer();
      } else if (filterProp.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
        initNode = filterProp.getNameNode();
      }
      const resolved = resolveConstantInitializer(initNode);
      const resolvedText = resolved?.getText();
      if (resolvedText === "true") {
        filterByStack = true;
      } else if (resolvedText === "false") {
        filterByStack = false;
      } else {
        filterByStackInvalid = true;
      }
    }

    const topicProp = opts.getProperty("topic");
    if (topicProp) {
      if (topicProp.isKind(SyntaxKind.PropertyAssignment)) {
        const tInit = topicProp.getInitializer();
        if (tInit) {
          if (tInit.isKind(SyntaxKind.StringLiteral)) {
            topicName = tInit.getLiteralValue();
          } else if (tInit.isKind(SyntaxKind.Identifier)) {
            const idName = tInit.getText();
            topicName = context?.varToTopicName?.[idName] || idName;
          }
        }
      } else if (topicProp.isKind(SyntaxKind.ShorthandPropertyAssignment)) {
        const idName = topicProp.getName();
        topicName = context?.varToTopicName?.[idName] || idName;
      }
    }
  }

  return {
    id: budgetId,
    amount,
    unit,
    unitInvalid,
    topicName,
    threshold,
    thresholdInvalid,
    logicalId,
    budgetName: customBudgetName,
    budgetNameInvalid,
    filterByStack,
    filterByStackInvalid,
    sourceFile: sourceFile.getFilePath(),
    suppressions: extractCommentSuppressions(decl),
  };
}
