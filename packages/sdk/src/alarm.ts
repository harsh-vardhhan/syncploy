import type { Topic } from "./topic";

export type Duration = `${number}s` | `${number}m` | `${number}h` | number;

export interface AlarmMetricStat {
  namespace?: string;
  metricName: string;
  dimensions?: Record<string, string>;
  period?: Duration;
  stat?: "Sum" | "Average" | "SampleCount" | "Maximum" | "Minimum";
}

export interface AlarmMetricExpression {
  id: string;
  expression: string;
  label?: string;
  returnData?: boolean;
}

export interface AlarmMetricDataQuery {
  id: string;
  expression?: string;
  label?: string;
  returnData?: boolean;
  metricStat?: {
    metric: {
      namespace?: string;
      metricName: string;
      dimensions?: Record<string, string> | { name: string; value: string }[];
    };
    period?: Duration;
    stat?: "Sum" | "Average" | "SampleCount" | "Maximum" | "Minimum" | string;
  };
}

export interface AlarmOptions {
  description?: string;
  threshold: number;
  evaluationPeriods?: number;
  comparison?:
    | "GreaterThanOrEqualToThreshold"
    | "GreaterThanThreshold"
    | "LessThanThreshold"
    | "LessThanOrEqualToThreshold";
  treatMissingData?: "breaching" | "notBreaching" | "ignore" | "missing";
  metric?: AlarmMetricStat;
  metrics?: AlarmMetricDataQuery[];
  actions?: (Topic | string)[];
  logicalId?: string;
  alarmName?: string;
}

export class Alarm {
  readonly _kind = "alarm" as const;
  readonly name: string;
  readonly options: AlarmOptions;

  constructor(name: string, options: AlarmOptions) {
    this.name = name;
    this.options = options;
  }
}
