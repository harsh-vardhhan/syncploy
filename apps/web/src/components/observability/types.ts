export type ServiceType = "api" | "queue" | "table" | "bucket" | "worker" | "budget";

export interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export interface MetricDataPoint {
  time: string;
  value: number;
}

export interface ServiceNodeData extends Record<string, unknown> {
  id: string;
  label: string;
  subtitle?: string;
  serviceType: ServiceType;
  logicalId: string;
  awsType: string;
  status: "healthy" | "warning" | "alert";
  metrics: {
    latencyMs?: number;
    p95LatencyMs?: number;
    concurrency?: number;
    concurrencyLimit?: number;
    requestsPerMin?: number;
    errorRate?: number;
    messagesInFlight?: number;
    dlqCount?: number;
    rcuConsumed?: number;
    wcuConsumed?: number;
    itemCount?: number;
    storageMb?: number;
    spendMtd?: number;
    spendCap?: number;
    sparkline?: MetricDataPoint[];
  };
  details: {
    description: string;
    routePath?: string;
    httpMethod?: string;
    visibilityTimeout?: string;
    billingMode?: string;
    lifecycleRule?: string;
    guardrailBadge: string;
    guardrailPassed: string;
  };
  logs: LogEntry[];
}
