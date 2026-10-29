import type { ResourceGraph } from "../../types";
import {
  getAlarmLogicalId,
  getTopicLogicalId,
  getFunctionLogicalId,
  resolvePhysicalName,
} from "../logical-ids";

export function generateAlarms(
  graph: ResourceGraph,
  resources: Record<string, any>
): void {
  for (const alarm of graph.alarms || []) {
    const resourceKey = getAlarmLogicalId(alarm);

    const alarmActions = (alarm.actions || []).map((act) => {
      const matchingTopic = (graph.topics || []).find((t) => t.name === act || t.id === act || t.logicalId === act);
      if (matchingTopic) {
        return { Ref: getTopicLogicalId(matchingTopic) };
      }
      return act;
    });

    const alarmProps: any = {
      AlarmDescription: alarm.description || `Alarm ${alarm.name}`,
      EvaluationPeriods: alarm.evaluationPeriods || 1,
      Threshold: alarm.threshold,
      ComparisonOperator: alarm.comparison || "GreaterThanOrEqualToThreshold",
      AlarmActions: alarmActions,
    };

    if (alarm.alarmName) {
      alarmProps["AlarmName"] = resolvePhysicalName(alarm.alarmName, undefined);
    }

    if (alarm.treatMissingData) {
      alarmProps["TreatMissingData"] = alarm.treatMissingData;
    }

    if (alarm.metrics && alarm.metrics.length > 0) {
      alarmProps["Metrics"] = alarm.metrics.map((m) => {
        const item: any = {
          Id: m.id,
        };
        if (m.expression) item.Expression = m.expression;
        if (m.label) item.Label = m.label;
        if (m.returnData !== undefined) item.ReturnData = m.returnData;
        if (m.metricStat) {
          const statObj: any = {
            Metric: {
              Namespace: m.metricStat.metric.namespace || "AWS/Lambda",
              MetricName: m.metricStat.metric.metricName,
            },
            Period: m.metricStat.period || 60,
            Stat: m.metricStat.stat || "Sum",
          };
          if (m.metricStat.metric.dimensions) {
            const dims = m.metricStat.metric.dimensions;
            const dimEntries = Array.isArray(dims)
              ? dims.map((d) => [d.name, d.value])
              : Object.entries(dims);
            statObj.Metric.Dimensions = dimEntries.map(([k, v]) => {
              const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v || a.logicalId === v);
              return {
                Name: k,
                Value: matchingApi ? { Ref: getFunctionLogicalId(matchingApi) } : v,
              };
            });
          }
          item.MetricStat = statObj;
        }
        return item;
      });
    } else {
      const metric = alarm.metric || {
        metricName: "Invocations",
        namespace: "AWS/Lambda",
        period: 60,
        stat: "Sum",
      };

      alarmProps["MetricName"] = metric.metricName;
      alarmProps["Namespace"] = metric.namespace || "AWS/Lambda";
      alarmProps["Period"] = metric.period || 60;
      alarmProps["Statistic"] = metric.stat || "Sum";

      if (metric.dimensions && Object.keys(metric.dimensions).length > 0) {
        alarmProps["Dimensions"] = Object.entries(metric.dimensions).map(([k, v]) => {
          const matchingApi = graph.apis.find((a) => a.id === v || a.exportName === v || a.logicalId === v);
          return {
            Name: k,
            Value: matchingApi ? { Ref: getFunctionLogicalId(matchingApi) } : v,
          };
        });
      }
    }

    alarmProps["Tags"] = [
      { Key: "StackName", Value: { "Fn::Sub": "${AWS::StackName}" } },
    ];

    resources[resourceKey] = {
      Type: "AWS::CloudWatch::Alarm",
      Properties: alarmProps,
    };
  }
}
