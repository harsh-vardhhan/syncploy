"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import type { ServiceNodeData } from "./types";
import {
  Globe,
  Database,
  Layers,
  HardDrive,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  api: <Globe className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />,
  queue: <Layers className="w-4 h-4 text-sky-500 dark:text-sky-400" />,
  table: <Database className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />,
  bucket: <HardDrive className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
  worker: <Cpu className="w-4 h-4 text-teal-500 dark:text-teal-400" />,
  budget: <ShieldCheck className="w-4 h-4 text-purple-500 dark:text-purple-400" />,
};

const SERVICE_BADGES: Record<string, { label: string; bg: string; text: string }> = {
  api: { label: "Function URL", bg: "bg-indigo-500/10 border-indigo-500/30", text: "text-indigo-600 dark:text-indigo-400" },
  queue: { label: "SQS Buffer", bg: "bg-sky-500/10 border-sky-500/30", text: "text-sky-600 dark:text-sky-400" },
  table: { label: "DynamoDB", bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  bucket: { label: "S3 Vault", bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-600 dark:text-blue-400" },
  worker: { label: "Lambda Worker", bg: "bg-teal-500/10 border-teal-500/30", text: "text-teal-600 dark:text-teal-400" },
  budget: { label: "Budget Guard", bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-600 dark:text-purple-400" },
};

function formatPrimaryMetric(data: ServiceNodeData): string {
  const m = data.metrics;
  if (data.serviceType === "api" && m.latencyMs !== undefined) {
    return `${m.latencyMs}ms p50`;
  }
  if (data.serviceType === "bucket" && m.storageMb !== undefined) {
    return `${m.storageMb.toFixed(1)} MB`;
  }
  if (data.serviceType === "queue") {
    if (m.dlqCount !== undefined && data.id.includes("dlq")) {
      return `${m.dlqCount} poisoned`;
    }
    return `${m.messagesInFlight ?? 0} in flight`;
  }
  if (data.serviceType === "worker" && m.latencyMs !== undefined) {
    return `${m.latencyMs}ms avg`;
  }
  if (data.serviceType === "table" && m.itemCount !== undefined) {
    return `${m.itemCount.toLocaleString()} items`;
  }
  if (data.serviceType === "budget" && m.spendMtd !== undefined) {
    return `$${m.spendMtd.toFixed(2)}/mo`;
  }
  return "Active";
}

export const ServiceNode = memo(({ data, selected }: NodeProps<Node<ServiceNodeData>>) => {
  const icon = SERVICE_ICONS[data.serviceType] || <Globe className="w-4 h-4 text-zinc-400" />;
  const badgeInfo = SERVICE_BADGES[data.serviceType] || {
    label: "Service",
    bg: "bg-slate-100 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700",
    text: "text-slate-600 dark:text-zinc-400",
  };
  const metricDisplay = formatPrimaryMetric(data);

  return (
    <div
      className={`group relative min-w-[240px] max-w-[280px] rounded-xl border bg-white/95 dark:bg-zinc-950/90 backdrop-blur-md p-4 transition-all duration-200 cursor-pointer shadow-md dark:shadow-lg ${
        selected
          ? "border-indigo-500 shadow-indigo-500/20 ring-2 ring-indigo-500/30"
          : "border-slate-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-zinc-600 hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-black/60"
      }`}
    >
      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-slate-300 dark:!bg-zinc-700 !border-2 !border-white dark:!border-zinc-950 !rounded-full -left-1.5 transition-colors group-hover:!bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-slate-300 dark:!bg-zinc-700 !border-2 !border-white dark:!border-zinc-950 !rounded-full -right-1.5 transition-colors group-hover:!bg-indigo-500"
      />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-2.5 !h-2.5 !bg-slate-300 dark:!bg-zinc-700 !border-2 !border-white dark:!border-zinc-950 !rounded-full -top-1.5 transition-colors group-hover:!bg-indigo-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-2.5 !h-2.5 !bg-slate-300 dark:!bg-zinc-700 !border-2 !border-white dark:!border-zinc-950 !rounded-full -bottom-1.5 transition-colors group-hover:!bg-indigo-500"
      />

      {/* Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 group-hover:border-indigo-300 dark:group-hover:border-zinc-700">
            {icon}
          </div>
          <span className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border ${badgeInfo.bg} ${badgeInfo.text}`}>
            {badgeInfo.label}
          </span>
        </div>

        {/* Status Beacon */}
        <div className="flex items-center gap-1.5">
          {data.status === "healthy" ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          ) : data.status === "warning" ? (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-rose-500" />
          )}
        </div>
      </div>

      {/* Main Title & Subtitle */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 font-mono tracking-tight group-hover:text-indigo-600 dark:group-hover:text-white truncate">
          {data.label}
        </h3>
        {data.subtitle && (
          <p className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
            {data.subtitle}
          </p>
        )}
      </div>

      {/* Metric Badge & Guardrail Pill */}
      <div className="pt-2 border-t border-slate-100 dark:border-zinc-900 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 font-mono">
          <span className="text-slate-400 dark:text-zinc-500 text-[11px]">METRIC:</span>
          <span className="font-semibold text-slate-700 dark:text-zinc-200 text-[11px] bg-slate-100 dark:bg-zinc-900 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800">
            {metricDisplay}
          </span>
        </div>

        {data.details?.guardrailBadge && (
          <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400 font-mono bg-slate-100 dark:bg-zinc-900/60 px-1.5 py-0.5 rounded border border-slate-200 dark:border-zinc-800/80">
            <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
            <span className="truncate max-w-[100px]">{data.details.guardrailBadge}</span>
          </div>
        )}
      </div>
    </div>
  );
});

ServiceNode.displayName = "ServiceNode";
