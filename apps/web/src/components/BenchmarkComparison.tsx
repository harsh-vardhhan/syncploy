"use client";

import React from "react";
import { Check, X, Shield, AlertTriangle, DollarSign } from "lucide-react";

export function BenchmarkComparison() {
  const comparisons = [
    {
      dimension: "Monthly Base Cost",
      paas: "$20 – $200/mo minimums + per-seat taxes",
      rawAws: "$0.00 scale-to-zero (if configured right)",
      syncploy: "$0.00 true scale-to-zero (pay only for ms used)",
      highlight: true,
    },
    {
      dimension: "Bandwidth & Gateway Markup",
      paas: "10x – 50x markup ($0.15–$0.40/GB bandwidth)",
      rawAws: "$0.09/GB AWS retail price",
      syncploy: "$0.09/GB wholesale AWS ($0 gateway tax via Function URLs)",
      highlight: true,
    },
    {
      dimension: "Denial-of-Wallet (DDoS) Protection",
      paas: "❌ Shock overage bills ($10k+ surges with zero appeal)",
      rawAws: "❌ Unreserved Lambdas scale to 1,000+ parallel instances",
      syncploy: "✅ Mathematical per-route concurrency limits & blast radius caps",
      highlight: true,
    },
    {
      dimension: "Event-Driven Recursion Loops",
      paas: "❌ Unchecked (continuous function re-triggering)",
      rawAws: "❌ None (Table -> Stream -> Table runs indefinitely)",
      syncploy: "✅ Compile-time Tarjan SCC cycle detection halts deploy in <1ms",
      highlight: true,
    },
    {
      dimension: "Monotonic Storage & Log Leaks",
      paas: "❌ Log retention locked behind higher tiers",
      rawAws: "❌ CloudWatch defaults to Never-Expire; S3 keeps orphaned chunks",
      syncploy: "✅ Auto-synthesized 14d log rotation & 7d S3 multipart abort",
      highlight: true,
    },
    {
      dimension: "Setup & Maintenance Toil",
      paas: "Proprietary dashboards, closed-source runtime lock-in",
      rawAws: "1,000s of lines of CloudFormation, SAM, or CDK YAML & IAM pain",
      syncploy: "Pure TypeScript. Standard 1:1 CloudFormation export.",
      highlight: false,
    },
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400 shadow-sm">
          <DollarSign className="h-3.5 w-3.5" />
          <span>The True Cost of Cloud</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          The 3 Paths: Choose Your Reality
        </h2>
        <p className="text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto text-base sm:text-lg">
          Why pay the PaaS markup out of fear, or risk uncapped cloud liability on raw AWS, when you can have both cheap scale and compile-time safety?
        </p>
      </div>

      <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-[#262C40] bg-white dark:bg-[#12141C] shadow-lg">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#262C40]">
              <th className="p-5 font-semibold text-slate-900 dark:text-white bg-slate-50/70 dark:bg-[#151824] w-1/4">
                Architecture Dimension
              </th>
              <th className="p-5 font-semibold text-slate-700 dark:text-slate-300 bg-slate-50/50 dark:bg-[#141722] w-1/4">
                <div className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">PaaS Tax</div>
                Vercel / Render / Railway
              </th>
              <th className="p-5 font-semibold text-rose-700 dark:text-rose-400 bg-rose-50/30 dark:bg-rose-950/10 w-1/4">
                <div className="text-xs font-mono uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">Uncapped Liability</div>
                Raw AWS (CDK / SAM)
              </th>
              <th className="p-5 font-bold text-indigo-900 dark:text-white bg-indigo-50 dark:bg-indigo-950/40 border-l border-r border-indigo-200 dark:border-indigo-500/30 w-1/4">
                <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
                  <Shield className="h-3.5 w-3.5" />
                  Zero-DoW Shield
                </div>
                Syncploy
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#202434]">
            {comparisons.map((c, i) => (
              <tr key={i} className="hover:bg-slate-50/60 dark:hover:bg-[#161924] transition-colors">
                <td className="p-5 font-semibold text-slate-900 dark:text-white bg-slate-50/30 dark:bg-[#141722]/50">
                  {c.dimension}
                </td>
                <td className="p-5 text-slate-600 dark:text-slate-400 leading-relaxed">
                  {c.paas}
                </td>
                <td className="p-5 text-slate-700 dark:text-slate-300 leading-relaxed bg-rose-50/10 dark:bg-rose-950/5">
                  {c.rawAws}
                </td>
                <td className="p-5 font-medium text-slate-900 dark:text-emerald-300 bg-indigo-50/50 dark:bg-indigo-950/30 border-l border-r border-indigo-200 dark:border-indigo-500/30 leading-relaxed">
                  {c.syncploy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
