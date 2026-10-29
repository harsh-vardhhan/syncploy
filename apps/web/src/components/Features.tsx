"use client";

import React from "react";
import {
  ShieldAlert,
  Gauge,
  Clock,
  BellRing,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

export function Features() {
  const pillars = [
    {
      icon: <Gauge className="h-6 w-6 text-rose-600 dark:text-rose-400" />,
      badge: "DDoS Containment",
      title: "1. Mathematical Concurrency Caps",
      fear: "Unreserved Lambdas scale to 1,000+ parallel executions during a bot flood, burning through $10,000+ in hours.",
      solution:
        "Syncploy enforces strict compile-time concurrency limits and edge stage throttling. Your theoretical maximum 24/7 monthly compute liability is mathematically bounded to exact dollars before you deploy.",
      codeSnippet: `concurrency: 5 // Max liability: ~$54/mo`,
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      badge: "Tarjan SCC Shield",
      title: "2. Infinite Recursion Loop Killer",
      fear: "A stream consumer writes back to its source table or bucket, spawning a self-amplifying event loop ($20k overnight).",
      solution:
        "The compiler walks your AST for write mutations (table.put, bucket.put, queue.send) and runs Tarjan's SCC cycle algorithm in <1ms. If an event loop exists, compilation aborts before anything touches AWS.",
      codeSnippet: `✖ [ERR_RECURSIVE_LOOP] Table -> Stream -> Table`,
    },
    {
      icon: <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      badge: "Zero Zombie Leaks",
      title: "3. Auto-Expiring Logs & S3 Cleanup",
      fear: "CloudWatch logs default to 'Never Expire' and S3 stores abandoned multipart uploads forever, bleeding cash silently.",
      solution:
        "Syncploy automatically synthesizes explicit AWS::Logs::LogGroup with 14-day retention for every Lambda, and injects 7-day AbortIncompleteMultipartUpload lifecycle rules into every S3 bucket.",
      codeSnippet: `RetentionInDays: 14 • AbortUploads: 7d`,
    },
    {
      icon: <BellRing className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      badge: "Stack-Scoped Ceilings",
      title: "4. In-Code Budgets & Hard Alerts",
      fear: "AWS billing alerts are complex, delayed, account-global, and silently fail if IAM permissions are misconfigured.",
      solution:
        "Declare new Budget('cap', { amount: 25 }) in TypeScript. Syncploy synthesizes verified AWS::Budgets::Budget resources scoped to your stack's Cost Allocation Tag with working SNS notification policies.",
      codeSnippet: `new Budget("cap", { amount: 25, threshold: 80 })`,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-xs font-semibold text-rose-700 dark:text-rose-400 shadow-sm">
          <ShieldAlert className="h-3.5 w-3.5" />
          <span>The Zero-DoW Architecture</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          The 4 Layers of Denial-of-Wallet Immunity
        </h2>
        <p className="text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto text-base sm:text-lg">
          How the Syncploy compiler mathematically eliminates cloud billing anxiety before your code ever touches AWS.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
        {pillars.map((p, i) => (
          <div
            key={i}
            className="p-7 rounded-3xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:border-indigo-500/40 transition-all flex flex-col justify-between shadow-sm relative overflow-hidden group"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#191D2B] border border-slate-200 dark:border-[#262C40] group-hover:scale-105 transition-transform">
                  {p.icon}
                </div>
                <span className="text-xs font-mono font-semibold px-3 py-1 rounded-full bg-slate-100 dark:bg-[#1A1D28] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-[#282C3D]">
                  {p.badge}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {p.title}
                </h3>

                {/* The Fear */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50/80 dark:bg-rose-950/20 border border-rose-200/80 dark:border-rose-900/40 text-xs text-rose-900 dark:text-rose-300 leading-relaxed mb-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  <div>
                    <span className="font-bold">The Threat: </span>
                    {p.fear}
                  </div>
                </div>

                {/* The Solution */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <span className="font-bold">Syncploy Shield: </span>
                    {p.solution}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-[#1E2230]">
              <div className="font-mono text-xs px-3 py-2 rounded-lg bg-slate-900 dark:bg-[#0A0C12] text-slate-200 dark:text-slate-300 flex items-center justify-between">
                <span className="truncate">{p.codeSnippet}</span>
                <span className="text-[10px] text-emerald-400 uppercase font-semibold">Active</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
