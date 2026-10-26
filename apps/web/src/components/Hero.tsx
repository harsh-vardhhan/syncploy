"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Check, Terminal, Shield, Zap, RefreshCw } from "lucide-react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCmd = "bun add @syncploy/sdk";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent dark:from-indigo-600/20 dark:via-cyan-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
            <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Zero YAML CloudFormation</span>
            <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
            <span className="text-slate-600 dark:text-neutral-400">Pure TypeScript</span>
          </div>

          <Link
            href="#showcase"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50/80 dark:bg-purple-950/30 text-xs font-semibold text-purple-700 dark:text-purple-300 shadow-sm hover:scale-105 transition-all group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Case Study: Live EHR Healthcare Backend</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Headline with Eyebrow */}
        <div className="space-y-6 pt-2">
          <div className="inline-flex items-center justify-center">
            <span
              className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white inline-flex items-center justify-center flex-wrap gap-x-2.5 sm:gap-x-4 underline decoration-indigo-500/80 dark:decoration-indigo-400/80 decoration-[3px] sm:decoration-[4px] underline-offset-8 sm:underline-offset-[12px]"
              aria-label="Infrastructure from Code"
            >
              <span>Infrastructure</span>
              <span className="relative inline-block font-black px-1 sm:px-1.5">
                <span className="relative z-10 text-slate-400 dark:text-neutral-500 line-through decoration-rose-500 decoration-[3.5px] sm:decoration-[5px]">
                  as
                </span>
                {/* Physical strike bar overlay to guarantee visibility across all displays */}
                <span
                  className="absolute top-1/2 -left-1 -right-1 h-[3.5px] sm:h-[5px] -translate-y-1/2 bg-rose-500 -rotate-6 rounded-full pointer-events-none z-20 shadow-xs"
                  aria-hidden="true"
                />
                {/* 'from' annotation floating directly above */}
                <span
                  className="absolute -top-5 sm:-top-7 left-1/2 -translate-x-1/2 text-xs sm:text-sm font-mono font-black text-cyan-600 dark:text-cyan-400 -rotate-12 select-none bg-cyan-50 dark:bg-cyan-950/90 px-1.5 py-0.5 sm:px-2.5 sm:py-0.5 rounded-md border border-cyan-300 dark:border-cyan-700 shadow-sm whitespace-nowrap z-30"
                  aria-hidden="true"
                >
                  from
                </span>
              </span>
              <span>Code</span>
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
            The Terraform for <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 dark:from-indigo-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
              AWS Serverless.
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-neutral-400 leading-relaxed">
          Type-safe infrastructure synthesized straight from your TypeScript code — zero YAML, zero state files, zero data-loss replacements.
        </p>

        {/* CTA buttons & Copy Pill */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <Link
            href="/docs"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all"
          >
            <span>Start Building</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          {/* Copy command */}
          <button
            onClick={handleCopy}
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] font-mono text-xs sm:text-sm text-slate-800 dark:text-neutral-300 transition-colors shadow-sm"
          >
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">$</span>
            <span className="font-medium">{installCmd}</span>
            <span className="p-1 rounded bg-slate-100 dark:bg-[#1F2433] text-slate-600 dark:text-neutral-400">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </span>
          </button>
        </div>

        {/* Highlights row */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5" /> Loop Shield
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Static AST recursion & event cycle detection</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-cyan-700 dark:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3.5 w-3.5" /> 0-Replacement
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Brownfield SAM adoption with zero data loss</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Terminal className="h-3.5 w-3.5" /> Type-Safe Auth
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Cognito User Pools & auto-wired Lambda env vars</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5" /> Least-Privilege
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Automated CI/CD deploy policy generation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
