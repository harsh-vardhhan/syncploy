import { toVarName, toResourceName, resolveValueExpr } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateAlarms(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const alarmDefs: string[] = [];
  const { resources, params, templateParams } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::CloudWatch::Alarm") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "Alarm");

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Alarm(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      const alarmNameVal = resolveValueExpr(props.AlarmName, params, templateParams);
      if (alarmNameVal) {
        lines.push(`  alarmName: ${alarmNameVal},`);
      }

      const descVal = resolveValueExpr(props.AlarmDescription, params, templateParams);
      if (descVal) {
        lines.push(`  description: ${descVal},`);
      }
      if (props.EvaluationPeriods !== undefined) {
        lines.push(`  evaluationPeriods: ${props.EvaluationPeriods},`);
      }
      const thresholdVal = resolveValueExpr(props.Threshold, params, templateParams);
      if (thresholdVal !== undefined) {
        lines.push(`  threshold: ${thresholdVal},`);
      }
      if (props.ComparisonOperator) {
        lines.push(`  comparison: ${JSON.stringify(props.ComparisonOperator)},`);
      }
      if (props.TreatMissingData) {
        lines.push(`  treatMissingData: ${JSON.stringify(props.TreatMissingData)},`);
      }

      if (props.AlarmActions && props.AlarmActions.length > 0) {
        lines.push(`  alarmActions: [`);
        for (const act of props.AlarmActions) {
          if (typeof act === "object" && act.Ref) {
            lines.push(`    ${JSON.stringify(act.Ref)},`);
          } else {
            lines.push(`    ${JSON.stringify(act)},`);
          }
        }
        lines.push(`  ],`);
      }

      if (props.Metrics && props.Metrics.length > 0) {
        lines.push(`  metrics: ${JSON.stringify(props.Metrics, null, 4).replace(/\n/g, "\n  ")},`);
      }

      lines.push(`});`);
      alarmDefs.push(lines.join("\n"));
    }
  }

  const code = alarmDefs.length > 0 ? "// --- CloudWatch Alarms ---\n" + alarmDefs.join("\n\n") : "";
  return { code, adopted };
}
