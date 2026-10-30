"use client";

import React, { useEffect } from "react";
import type { ServiceNodeData } from "./types";
import {
  X,
  ShieldCheck,
  Terminal,
  Activity,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";

interface NodeDetailDrawerProps {
  node: ServiceNodeData | null;
  onClose: () => void;
}

export function NodeDetailDrawer({ node, onClose }: NodeDetailDrawerProps) {
  const [copied, setCopied] = React.useState(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!node) return null;

  const copyLogs = () => {
    const text = node.logs.map((l) => `[${l.timestamp}] [${l.level.toUpperCase()}] ${l.message}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-l border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out text-slate-900 dark:text-zinc-100">
      {/* Top Header */}
      <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-start justify-between bg-slate-50 dark:bg-zinc-900/40">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-medium">
              {node.awsType}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-mono">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              HEALTHY
            </span>
          </div>

          <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">{node.label}</h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400 font-mono mt-0.5">
            Logical ID: <span className="text-slate-700 dark:text-zinc-300">{node.logicalId}</span>
          </p>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-200/60 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-800 transition-colors"
          aria-label="Close drawer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Description & Overview */}
        <div className="bg-slate-50 dark:bg-zinc-900/50 rounded-xl p-4 border border-slate-200 dark:border-zinc-800/80">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-zinc-300 uppercase tracking-wider mb-1 font-mono">
            Resource Role
          </h3>
          <p className="text-sm text-slate-700 dark:text-zinc-300 leading-relaxed">
            {node.details.description}
          </p>
          {node.details.routePath && (
            <div className="mt-2.5 pt-2.5 border-t border-slate-200 dark:border-zinc-800 flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-500 dark:text-zinc-500">HTTP Route:</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-zinc-800 text-indigo-700 dark:text-indigo-300 font-semibold">
                {node.details.routePath}
              </span>
            </div>
          )}
        </div>

        {/* Compiler Guardrail Verification */}
        <div className="bg-gradient-to-br from-indigo-500/5 to-emerald-500/5 dark:from-indigo-950/30 dark:to-emerald-950/20 rounded-xl p-4 border border-emerald-500/30 dark:border-emerald-500/20 shadow-inner">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-mono">
              Syncploy In-Code Guardrail Passed
            </h3>
          </div>
          <p className="text-xs text-slate-700 dark:text-zinc-300 leading-relaxed font-mono">
            {node.details.guardrailPassed}
          </p>
        </div>

        {/* Live Metrics Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
              Production Metrics (ap-south-1)
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-mono">Updated just now</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {node.metrics.latencyMs !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">p50 Latency</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{node.metrics.latencyMs} ms</span>
              </div>
            )}
            {node.metrics.p95LatencyMs !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">p95 Latency</span>
                <span className="text-lg font-bold font-mono text-slate-700 dark:text-zinc-200">{node.metrics.p95LatencyMs} ms</span>
              </div>
            )}
            {node.metrics.concurrency !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">Concurrency</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {node.metrics.concurrency} / {node.metrics.concurrencyLimit ?? "unlimited"}
                </span>
              </div>
            )}
            {node.metrics.messagesInFlight !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">Messages In-Flight</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{node.metrics.messagesInFlight}</span>
              </div>
            )}
            {node.metrics.dlqCount !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">DLQ Quarantined</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{node.metrics.dlqCount}</span>
              </div>
            )}
            {node.metrics.storageMb !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">Vault Storage</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{node.metrics.storageMb} MB</span>
              </div>
            )}
            {node.metrics.itemCount !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">DynamoDB Records</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-white">{node.metrics.itemCount.toLocaleString()}</span>
              </div>
            )}
            {node.metrics.spendMtd !== undefined && (
              <div className="bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-lg border border-slate-200 dark:border-zinc-800">
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block">Actual MTD Spend</span>
                <span className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">${node.metrics.spendMtd.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* Sparkline Visual */}
          {node.metrics.sparkline && node.metrics.sparkline.length > 0 && (
            <div className="mt-3 bg-slate-50 dark:bg-zinc-900/40 p-3 rounded-lg border border-slate-200 dark:border-zinc-800/80">
              <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono block mb-2">Trend (Last 60 Minutes)</span>
              <div className="h-14 flex items-end gap-1.5 w-full pt-2">
                {node.metrics.sparkline.map((pt, i) => {
                  const maxVal = Math.max(...(node.metrics.sparkline?.map((p) => p.value) || [1]));
                  const heightPct = Math.max(12, Math.round((pt.value / (maxVal || 1)) * 100));
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div
                        className="w-full bg-indigo-500/60 dark:bg-indigo-500/60 rounded-t group-hover:bg-indigo-600 dark:group-hover:bg-indigo-400 transition-all"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="text-[9px] text-slate-700 dark:text-zinc-300 font-mono hidden group-hover:block absolute -top-5 bg-white dark:bg-zinc-800 px-1 rounded shadow border border-slate-200 dark:border-zinc-700">
                        {pt.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live CloudWatch Log Stream */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-slate-500 dark:text-zinc-400" />
              CloudWatch Stream (Masked PHI)
            </h3>
            <button
              onClick={copyLogs}
              type="button"
              className="text-xs text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white flex items-center gap-1 font-mono transition-colors"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          <div className="bg-slate-950 dark:bg-black/80 rounded-xl p-3 border border-slate-800 dark:border-zinc-800 font-mono text-xs text-zinc-300 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
            {node.logs.map((log, index) => (
              <div key={index} className="flex items-start gap-2 leading-relaxed font-mono">
                <span className="text-zinc-500 text-[10px] shrink-0">{log.timestamp}</span>
                <span
                  className={`text-[10px] uppercase font-bold shrink-0 ${
                    log.level === "error"
                      ? "text-rose-400"
                      : log.level === "warn"
                      ? "text-amber-400"
                      : "text-emerald-400"
                  }`}
                >
                  [{log.level}]
                </span>
                <span className="text-zinc-300 break-all">{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Footer Actions */}
      <div className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between">
        <span className="text-xs text-slate-500 dark:text-zinc-400 font-mono flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Production AWS ap-south-1
        </span>
        <a
          href="https://github.com/syncploy/syncploy"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-mono"
        >
          View Source Code
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
