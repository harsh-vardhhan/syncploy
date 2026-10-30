"use client";

import React, { useState } from "react";
import {
  AlertOctagon,
  ShieldCheck,
  Calendar,
  Filter,
  BarChart3,
  Layers,
  Info,
} from "lucide-react";

interface CostDataPoint {
  day: string;
  date: string;
  standard: number;
  syncploy: number;
  standardBreakdown?: {
    lambda: number;
    dynamo: number;
    nat: number;
    other: number;
  };
  note?: string;
  shieldNote?: string;
}

const COST_DATA: CostDataPoint[] = [
  { day: "Mon", date: "Oct 22", standard: 0.12, syncploy: 0.12 },
  { day: "Tue", date: "Oct 23", standard: 0.14, syncploy: 0.14 },
  { day: "Wed", date: "Oct 24", standard: 0.11, syncploy: 0.11 },
  { day: "Thu", date: "Oct 25", standard: 0.18, syncploy: 0.18 },
  { day: "Fri", date: "Oct 26", standard: 0.15, syncploy: 0.15 },
  {
    day: "Sat",
    date: "Oct 27",
    standard: 42180.4,
    syncploy: 0.16,
    standardBreakdown: {
      lambda: 26420.0,
      dynamo: 13120.0,
      nat: 1440.0,
      other: 1200.4,
    },
    note: "Rogue DynamoDB stream loop + unthrottled bot scraper",
    shieldNote: "Loop shield aborted cycle at build time. Edge stage rejected 4.2M bot requests at $0.00.",
  },
  { day: "Sun", date: "Oct 28", standard: 0.15, syncploy: 0.14 },
];

export function AwsCostExplorerMock() {
  const [viewMode, setViewMode] = useState<"standard" | "syncploy">("standard");
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(5); // Default to Saturday (Spike)

  const activePoint = COST_DATA[selectedDayIndex]!;
  const standardTotal = COST_DATA.reduce((acc, curr) => acc + curr.standard, 0);
  const syncployTotal = COST_DATA.reduce((acc, curr) => acc + curr.syncploy, 0);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      {/* Section Header */}
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-950/30 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm">
          <BarChart3 className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span>THE SPIKE OF DEATH</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">AWS Cost Explorer Replica</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Every AWS Developer&apos;s Worst Nightmare:{" "}
          <span className="bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 dark:from-rose-400 dark:via-amber-400 dark:to-indigo-400 bg-clip-text text-transparent">
            The Saturday Spike
          </span>
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
          This is an interactive simulation of an actual AWS Cost Explorer incident. See what happens when a single
          recursive stream loop and bot crawler hits an uncapped serverless stack—and how Syncploy eliminates the spike at compile-time.
        </p>

        {/* Big Interactive Toggle */}
        <div className="flex justify-center pt-4">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-[#12141C] border border-slate-200 dark:border-[#232736] shadow-md">
            <button
              onClick={() => setViewMode("standard")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "standard"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <AlertOctagon className="h-4 w-4" />
              <span>Standard AWS (The Bill Shock)</span>
            </button>

            <button
              onClick={() => setViewMode("syncploy")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                viewMode === "syncploy"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              <span>With Syncploy (Runaway Bill Protection)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOCK AWS MANAGEMENT CONSOLE / COST EXPLORER UI
          ========================================================================= */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#2A3042] bg-white dark:bg-[#0F131D] text-slate-900 dark:text-white shadow-xl dark:shadow-2xl overflow-hidden font-sans">
        {/* Top AWS Console Bar (Iconic AWS Console Dark Navy Header) */}
        <div className="bg-[#232F3E] text-white border-b border-[#344458] px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: AWS Logo & Breadcrumbs */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold tracking-tight text-[#FF9900]">
              <span className="text-base font-black">aws</span>
              <span className="text-slate-400 font-normal">|</span>
              <span className="text-white font-medium">Cost Management</span>
            </div>
            <span className="text-slate-500 hidden sm:inline">&rsaquo;</span>
            <span className="text-slate-300 font-medium hidden sm:inline">Cost Explorer</span>
          </div>

          {/* Right: Account & Region */}
          <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
            <span className="hidden md:inline">Account: 8492-3841-1029 (Production)</span>
            <span className="bg-[#141d28] px-2 py-0.5 rounded text-slate-200 border border-[#344458]">us-east-1 (N. Virginia)</span>
          </div>
        </div>

        {/* Sub-Header / Filters Bar */}
        <div className="bg-slate-50 dark:bg-[#141A29] border-b border-slate-200 dark:border-[#222B3F] p-4 sm:px-6 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-700 dark:text-slate-200">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1F273B] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2D3854] text-slate-800 dark:text-slate-200 shadow-xs">
              <Calendar className="h-3.5 w-3.5 text-[#FF9900]" />
              <span className="font-medium">Date Range: Oct 22 &ndash; Oct 28, 2026</span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1F273B] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2D3854] text-slate-800 dark:text-slate-200 shadow-xs">
              <Filter className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
              <span>Granularity: <strong>Daily</strong></span>
            </div>

            <div className="inline-flex items-center gap-1.5 bg-white dark:bg-[#1F273B] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#2D3854] text-slate-800 dark:text-slate-200 shadow-xs">
              <Layers className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
              <span>Group by: <strong>Service</strong></span>
            </div>
          </div>

          {/* Total Spend Badge */}
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400 text-xs">7-Day Total Spend:</span>
            <span
              className={`font-mono text-base sm:text-lg font-extrabold px-3 py-1 rounded-lg border ${
                viewMode === "standard"
                  ? "bg-rose-50 dark:bg-rose-950/80 border-rose-300 dark:border-rose-500/60 text-rose-600 dark:text-rose-400 animate-pulse"
                  : "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-500/60 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {viewMode === "standard"
                ? `$${standardTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : `$${syncployTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </span>
          </div>
        </div>

        {/* Main Chart Area */}
        <div className="p-6 sm:p-8 space-y-6 bg-white dark:bg-[#0F131D]">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
              Daily Amortized Costs (USD) &bull; Click any bar to inspect telemetry
            </h4>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              {viewMode === "standard" ? "Mode: Unprotected CloudFormation" : "Mode: Syncploy Compile-Time Shield"}
            </span>
          </div>

          {/* Simulated Bar Chart */}
          <div className="h-72 w-full flex items-end justify-between gap-2 sm:gap-6 pt-10 pb-4 border-b border-slate-200 dark:border-[#222B3F] relative">
            {/* Horizontal Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-40 dark:opacity-20 text-[10px] font-mono text-slate-400 dark:text-slate-500">
              <div className="border-b border-dashed border-slate-300 dark:border-slate-500 w-full flex justify-between">
                <span>$45,000</span>
                <span>$45,000</span>
              </div>
              <div className="border-b border-dashed border-slate-300 dark:border-slate-500 w-full flex justify-between">
                <span>$30,000</span>
                <span>$30,000</span>
              </div>
              <div className="border-b border-dashed border-slate-300 dark:border-slate-500 w-full flex justify-between">
                <span>$15,000</span>
                <span>$15,000</span>
              </div>
              <div className="border-b border-slate-300 dark:border-slate-600 w-full flex justify-between">
                <span>$0.00</span>
                <span>$0.00</span>
              </div>
            </div>

            {/* Bars */}
            {COST_DATA.map((pt, idx) => {
              const isSpike = idx === 5;
              const isSelected = selectedDayIndex === idx;
              const isStandard = viewMode === "standard";
              const cost = isStandard ? pt.standard : pt.syncploy;

              // Height calculation
              let barHeight = "8px";
              if (isSpike) {
                barHeight = isStandard ? "92%" : "12px";
              } else {
                barHeight = "10px";
              }

              return (
                <div
                  key={pt.day}
                  onClick={() => setSelectedDayIndex(idx)}
                  className="flex-1 flex flex-col items-center justify-end h-full relative cursor-pointer group"
                >
                  {/* Floating Tooltip Callout on Saturday Spike */}
                  {isSpike && isStandard && (
                    <div
                      className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 px-3 py-1.5 rounded-lg bg-rose-600 text-white font-mono text-[10px] sm:text-xs font-bold shadow-xl border border-rose-300 animate-bounce"
                    >
                      🔥 $42,180.40 SPIKE OF DEATH
                    </div>
                  )}

                  {isSpike && !isStandard && (
                    <div className="absolute -top-6 sm:-top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-20 px-3 py-1 rounded-lg bg-emerald-600 text-white font-mono text-[10px] sm:text-xs font-bold shadow-xl border border-emerald-300">
                      🛡️ $0.16 Capped (Shield Active)
                    </div>
                  )}

                  {/* The Physical Bar */}
                  <div
                    style={{ height: barHeight }}
                    className={`w-full max-w-[48px] rounded-t-md transition-all duration-500 relative ${
                      isSpike && isStandard
                        ? "bg-gradient-to-t from-rose-700 via-rose-500 to-amber-400 border border-rose-300 shadow-2xl"
                        : isSpike && !isStandard
                        ? "bg-emerald-500 border border-emerald-400 dark:border-emerald-300"
                        : isSelected
                        ? "bg-indigo-600 dark:bg-indigo-500 border border-indigo-400 dark:border-indigo-300"
                        : "bg-slate-200 hover:bg-slate-300 dark:bg-[#2A354E] dark:hover:bg-[#3B4A6E]"
                    }`}
                  >
                    {/* Pulsing glow on the spike */}
                    {isSpike && isStandard && (
                      <div className="absolute inset-0 rounded-t-md animate-pulse bg-rose-400 opacity-40" />
                    )}
                  </div>

                  {/* Day Label */}
                  <div className="mt-3 text-center">
                    <div className={`text-xs font-mono font-bold ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400"}`}>
                      {pt.day}
                    </div>
                    <div className="text-[10px] font-mono text-slate-500 hidden sm:block">{pt.date}</div>
                    <div
                      className={`text-[10px] font-mono font-bold mt-1 ${
                        isSpike && isStandard
                          ? "text-rose-600 dark:text-rose-400 font-extrabold"
                          : isSpike && !isStandard
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {cost > 1000 ? `$${(cost / 1000).toFixed(1)}k` : `$${cost.toFixed(2)}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Day Telemetry Card */}
          <div className="rounded-2xl border border-slate-200 dark:border-[#273248] bg-slate-50/80 dark:bg-[#141A29] p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#222B3F] pb-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-white dark:bg-[#1F273B] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent">
                  <Info className="h-4 w-4" />
                </span>
                <div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    Audit Breakdown for {activePoint.date} ({activePoint.day})
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedDayIndex === 5
                      ? "High-impact incident window &bull; Billing spike stress event"
                      : "Standard operational traffic window"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400">Recorded Daily Cost:</span>
                <span
                  className={`font-mono text-base font-bold ${
                    viewMode === "standard" && selectedDayIndex === 5 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  ${(viewMode === "standard" ? activePoint.standard : activePoint.syncploy).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            {/* If Saturday is selected, show the root cause comparison */}
            {selectedDayIndex === 5 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {/* Standard AWS Root Cause */}
                <div
                  className={`p-4 rounded-xl border ${
                    viewMode === "standard"
                      ? "border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/30 text-rose-950 dark:text-rose-200"
                      : "border-slate-200 dark:border-[#26314A] bg-white dark:bg-[#101420] text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase mb-2">
                    <AlertOctagon className="h-4 w-4 shrink-0" />
                    <span>Without Syncploy (AWS Disaster)</span>
                  </div>
                  <ul className="text-xs space-y-1.5 leading-relaxed">
                    <li>
                      • <strong>AWS Lambda:</strong> $26,420.00 &bull; Uncapped Function URL crawled by bots; 1,000 parallel instances ran for 8 straight hours.
                    </li>
                    <li>
                      • <strong>Amazon DynamoDB:</strong> $13,120.00 &bull; Stream worker mutated its source table, generating 92,000,000 exponential writes.
                    </li>
                    <li>
                      • <strong>VPC NAT Gateway:</strong> $1,440.00 &bull; Idle gateway left running in private subnet.
                    </li>
                    <li className="text-rose-600 dark:text-rose-400 font-semibold pt-1">
                      Result: Bank card frozen. Account disabled.
                    </li>
                  </ul>
                </div>

                {/* Syncploy Shield Defense */}
                <div
                  className={`p-4 rounded-xl border ${
                    viewMode === "syncploy"
                      ? "border-emerald-300 dark:border-emerald-500/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-950 dark:text-emerald-200"
                      : "border-slate-200 dark:border-[#26314A] bg-white dark:bg-[#101420] text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-xs uppercase mb-2">
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                    <span>With Syncploy (Compile-Time Shield)</span>
                  </div>
                  <ul className="text-xs space-y-1.5 leading-relaxed">
                    <li>
                      • <strong>Infinite Loop Shield:</strong> Recursive stream loop caught locally in 0.7ms at <code className="font-mono bg-emerald-100 dark:bg-black/40 px-1 py-0.5 rounded text-emerald-800 dark:text-emerald-300">syncploy build</code>. 0 resources touched AWS.
                    </li>
                    <li>
                      • <strong>Edge Stage Throttling:</strong> API Gateway stage dropped 4,200,000 bot requests at edge for $0.00.
                    </li>
                    <li>
                      • <strong>Concurrency Ceiling:</strong> Lambda execution capped at 5 instances (max $14/mo worst-case liability).
                    </li>
                    <li className="text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                      Result: Normal Saturday sleep. Total spend: $0.16.
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* AWS Service Breakdown Table */}
            <div className="overflow-x-auto pt-2">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-[#222B3F] text-slate-500 dark:text-slate-400 font-mono uppercase text-[11px]">
                    <th className="py-2.5">Service Name</th>
                    <th className="py-2.5">Usage Metric</th>
                    <th className="py-2.5 text-right">Standard AWS</th>
                    <th className="py-2.5 text-right">With Syncploy</th>
                    <th className="py-2.5 text-right">Cost Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-[#1F273B] font-mono">
                  <tr>
                    <td className="py-3 text-slate-900 dark:text-white font-medium">AWS Lambda</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">Invocations &amp; GB-Seconds</td>
                    <td className="py-3 text-right text-rose-600 dark:text-rose-400">$26,420.00</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">$0.08</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-300 font-bold">-99.99%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-900 dark:text-white font-medium">Amazon DynamoDB</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">Write Request Units (WRU)</td>
                    <td className="py-3 text-right text-rose-600 dark:text-rose-400">$13,120.00</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">$0.05</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-300 font-bold">-99.99%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-900 dark:text-white font-medium">Amazon VPC</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">NAT Gateway Hours &amp; Data</td>
                    <td className="py-3 text-right text-rose-600 dark:text-rose-400">$1,440.00</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">$0.00</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-300 font-bold">-100.0%</td>
                  </tr>
                  <tr>
                    <td className="py-3 text-slate-900 dark:text-white font-medium">Data Transfer &amp; CloudWatch</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">Egress &amp; Ingestion Logs</td>
                    <td className="py-3 text-right text-rose-600 dark:text-rose-400">$1,200.40</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">$0.03</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-300 font-bold">-99.97%</td>
                  </tr>
                  <tr className="border-t-2 border-slate-300 dark:border-[#2D3854] font-bold text-sm">
                    <td className="py-3 text-slate-900 dark:text-white">Total Stack Cost</td>
                    <td className="py-3 text-slate-500 dark:text-slate-400 font-normal">7-Day Period</td>
                    <td className="py-3 text-right text-rose-600 dark:text-rose-400">$42,180.40</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-400">$0.32</td>
                    <td className="py-3 text-right text-emerald-600 dark:text-emerald-300 font-black">-99.99%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
