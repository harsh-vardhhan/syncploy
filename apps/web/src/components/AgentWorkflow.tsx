"use client";

import React from "react";
import Link from "next/link";
import { Bot, Terminal, ShieldAlert, CheckCircle2, ArrowRight, Sparkles, FileCode, AlertTriangle } from "lucide-react";

export function AgentWorkflow() {
  const steps = [
    {
      step: "01",
      badge: "One-Click Context",
      title: "Point Your Agent",
      description:
        "Point Cursor, Claude Code, or Antigravity to llms.txt or install the official Antigravity plugin. Your agent immediately understands all Syncploy primitives and constraints in a single context window.",
      icon: <Bot className="h-6 w-6 text-sky-500" />,
      code: `// .cursorrules or Antigravity Plugin
# Add Syncploy context to your agent
Read: https://www.syncploy.com/llms.txt`,
    },
    {
      step: "02",
      badge: "Single-File TypeScript",
      title: "Prompt Naturally",
      description:
        "Tell your agent to build an API, queue, or database. Everything lives in a single app.ts file side-by-side with business logic. No context-switching between Terraform, CDK, and YAML templates.",
      icon: <FileCode className="h-6 w-6 text-indigo-500" />,
      code: `export const orders = new Table("orders");
export const checkout = api({
  method: "POST",
  path: "/checkout",
  concurrency: 10,
}, async (req) => { ... });`,
    },
    {
      step: "03",
      badge: "Deterministic Safety",
      title: "The Compiler Guards Your Wallet",
      description:
        "The compiler inspects your AST in <1ms. If the agent created an infinite recursion loop, forgot a concurrency cap, or misconfigured timeouts, the compiler halts the build and provides the exact fix.",
      icon: <ShieldAlert className="h-6 w-6 text-rose-500" />,
      code: `✖ [ERR_RECURSIVE_LOOP] (recursion Layer)
• Loop: Stream 'worker' -> Table 'orders'
= help: Break cycle by directing mutations 
        to a downstream queue or table.`,
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-[#232736]">
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400 shadow-sm">
          <Sparkles className="h-3.5 w-3.5" />
          <span>The Agentic Infrastructure Pipeline</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
          How It Works with Your AI Coding Agent
        </h2>
        <p className="text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto text-base sm:text-lg">
          AI agents excel at writing TypeScript, but hallucinate dangerous cloud configs. Syncploy acts as your agent's compiler guardrail.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {steps.map((item, idx) => (
          <div
            key={idx}
            className="p-7 rounded-3xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-indigo-500/40 transition-all"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-[#191D2B] border border-slate-200 dark:border-[#262C40] group-hover:scale-105 transition-transform">
                  {item.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#1A1D28] text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-[#282C3D]">
                    {item.badge}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 dark:text-neutral-500">
                    {item.step}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed mb-4">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
              <pre className="whitespace-pre">{item.code}</pre>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Ecosystem Banner */}
      <div className="mt-10 p-6 rounded-2xl border border-slate-200 dark:border-[#232736] bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 dark:from-[#131622] dark:via-[#11131C] dark:to-[#121824] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">
              Official Plugins for Antigravity &amp; Claude Code
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">
              Install the pre-built Antigravity skill or pass <code className="text-indigo-600 dark:text-indigo-400 font-mono">/llms.txt</code> directly to Claude Code.
            </div>
          </div>
        </div>

        <Link
          href="/docs/cli-reference"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs hover:opacity-90 transition-opacity whitespace-nowrap self-stretch sm:self-auto justify-center"
        >
          <span>Explore Agent Setup</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </section>
  );
}
