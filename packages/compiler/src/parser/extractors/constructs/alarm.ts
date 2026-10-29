import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { AlarmIR, AlarmMetricQueryIR } from "../../../types";
import type { ParseContext } from "../../types";
import {
  extractDuration,
  extractNumber,
  extractString,
  getNodeLocation,
  isSyncployConstruct,
} from "../ast-utils";

export function extractAlarm(
  decl: VariableDeclaration,
  sourceFile: SourceFile,
  context: ParseContext
): AlarmIR | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (!isSyncployConstruct(init.getExpression(), "Alarm", sourceFile)) return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  const alarmName = args.length > 0 ? extractString(args[0]) : undefined;
  if (!alarmName) {
    throw new Error(
      `Alarm '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }

  let threshold = 0;
  let evaluationPeriods = 1;
  let comparison = "GreaterThanOrEqualToThreshold";
  let description: string | undefined;
  let treatMissingData: string | undefined;
  let metric: AlarmIR["metric"] | undefined;
  let metrics: AlarmIR["metrics"];
  const actions: string[] = [];
  let logicalId: string | undefined;
  let customAlarmName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    customAlarmName = extractString(opts.getProperty("alarmName"));
    threshold = extractNumber(opts.getProperty("threshold")) ?? 0;
    evaluationPeriods = extractNumber(opts.getProperty("evaluationPeriods")) ?? 1;
    comparison = extractString(opts.getProperty("comparison")) || "GreaterThanOrEqualToThreshold";
    description = extractString(opts.getProperty("description"));
    treatMissingData = extractString(opts.getProperty("treatMissingData"));

    const metricProp = opts.getProperty("metric");
    if (metricProp && metricProp.isKind(SyntaxKind.PropertyAssignment)) {
      const mObj = metricProp.getInitializer();
      if (mObj && mObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const metricName = extractString(mObj.getProperty("metricName")) || "Invocations";
        const namespace = extractString(mObj.getProperty("namespace")) || "AWS/Lambda";
        const period = extractNumber(mObj.getProperty("period")) || 60;
        const stat = extractString(mObj.getProperty("stat")) || "Sum";
        const dims: Record<string, string> = {};
        const dimsProp = mObj.getProperty("dimensions");
        if (dimsProp && dimsProp.isKind(SyntaxKind.PropertyAssignment)) {
          const dObj = dimsProp.getInitializer();
          if (dObj && dObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
            for (const p of dObj.getProperties()) {
              if (p.isKind(SyntaxKind.PropertyAssignment)) {
                const dVal = p.getInitializer();
                if (dVal && dVal.isKind(SyntaxKind.StringLiteral)) {
                  dims[p.getName()] = dVal.getLiteralValue();
                }
              }
            }
          }
        }
        metric = { metricName, namespace, period, stat, dimensions: dims };
      }
    }

    const metricsProp = opts.getProperty("metrics");
    if (metricsProp && metricsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = metricsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        metrics = [];
        for (const el of arr.getElements()) {
          if (el.isKind(SyntaxKind.ObjectLiteralExpression)) {
            const id = extractString(el.getProperty("id")) || "";
            const expression = extractString(el.getProperty("expression"));
            const label = extractString(el.getProperty("label"));
            const rdProp = el.getProperty("returnData");
            const rdInit = rdProp && rdProp.isKind(SyntaxKind.PropertyAssignment) ? rdProp.getInitializer() : undefined;
            const returnData = rdInit ? rdInit.getText() !== "false" : undefined;
            let metricStat: AlarmMetricQueryIR["metricStat"];
            const statProp = el.getProperty("metricStat");
            if (statProp && statProp.isKind(SyntaxKind.PropertyAssignment)) {
              const sObj = statProp.getInitializer();
              if (sObj && sObj.isKind(SyntaxKind.ObjectLiteralExpression)) {
                const mProp = sObj.getProperty("metric");
                let metricObj: any = { metricName: "Invocations", namespace: "AWS/Lambda" };
                if (mProp && mProp.isKind(SyntaxKind.PropertyAssignment)) {
                  const mInit = mProp.getInitializer();
                  if (mInit && mInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
                    const metricName = extractString(mInit.getProperty("metricName")) || "Invocations";
                    const namespace = extractString(mInit.getProperty("namespace")) || "AWS/Lambda";
                    const dims: Record<string, string> = {};
                    const dProp = mInit.getProperty("dimensions");
                    if (dProp && dProp.isKind(SyntaxKind.PropertyAssignment)) {
                      const dInit = dProp.getInitializer();
                      if (dInit && dInit.isKind(SyntaxKind.ObjectLiteralExpression)) {
                        for (const p of dInit.getProperties()) {
                          if (p.isKind(SyntaxKind.PropertyAssignment)) {
                            const dVal = p.getInitializer();
                            if (dVal && dVal.isKind(SyntaxKind.StringLiteral)) {
                              dims[p.getName()] = dVal.getLiteralValue();
                            }
                          }
                        }
                      } else if (dInit && dInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
                        for (const dimEl of dInit.getElements()) {
                          if (dimEl.isKind(SyntaxKind.ObjectLiteralExpression)) {
                            const n = extractString(dimEl.getProperty("name")) || extractString(dimEl.getProperty("Name"));
                            const v = extractString(dimEl.getProperty("value")) || extractString(dimEl.getProperty("Value"));
                            if (n && v) dims[n] = v;
                          }
                        }
                      }
                    }
                    metricObj = { metricName, namespace, dimensions: dims };
                  }
                }
                const period = extractDuration(sObj.getProperty("period")) || extractNumber(sObj.getProperty("period")) || 60;
                const stat = extractString(sObj.getProperty("stat")) || "Sum";
                metricStat = { metric: metricObj, period, stat };
              }
            }
            metrics.push({ id, expression, label, returnData, metricStat });
          }
        }
      }
    }

    const actionsProp = opts.getProperty("actions");
    if (actionsProp && actionsProp.isKind(SyntaxKind.PropertyAssignment)) {
      const arr = actionsProp.getInitializer();
      if (arr && arr.isKind(SyntaxKind.ArrayLiteralExpression)) {
        for (const el of arr.getElements()) {
          const rawAction = el.getText();
          const cleanAction = context.varToTopicName[rawAction] || rawAction.replace(/['"]/g, "");
          actions.push(cleanAction);
        }
      }
    }
  }

  const { line, column } = getNodeLocation(decl, sourceFile);

  return {
    id: varName,
    name: alarmName,
    threshold,
    evaluationPeriods,
    comparison,
    description,
    treatMissingData,
    metric,
    metrics,
    actions,
    sourceFile: sourceFile.getFilePath(),
    line,
    column,
    logicalId,
    alarmName: customAlarmName,
  };
}
