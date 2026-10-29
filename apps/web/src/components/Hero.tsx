"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Copy, Check, Terminal, Shield, Zap, RefreshCw, Bot } from "lucide-react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const installCmd = "bun add @syncploy/sdk";

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative pt-6 sm:pt-8 md:pt-10 pb-14 md:pb-20 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent dark:from-indigo-600/20 dark:via-cyan-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7">
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-300 dark:border-rose-500/30 bg-rose-50/80 dark:bg-rose-950/30 text-xs font-semibold text-rose-800 dark:text-rose-300 shadow-sm">
            <Shield className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
            <span>Zero-DoW Shield</span>
            <span className="text-rose-400 dark:text-rose-600">&bull;</span>
            <span className="text-slate-700 dark:text-neutral-300">Never Fear Your AWS Bill Again</span>
          </div>

          <a
            href="https://www.npmjs.com/package/@syncploy/sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-300 dark:border-amber-500/30 bg-amber-50/80 dark:bg-amber-950/30 text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-sm hover:scale-105 transition-all group"
            title="Syncploy is in Public Alpha - View @syncploy/sdk on npm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span>Public Alpha (v0.1.7)</span>
            <span className="text-amber-400 dark:text-amber-600">&bull;</span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-700 dark:text-amber-400">
              <svg className="h-3 w-3 fill-[#CB3837]" viewBox="0 0 24 24" role="img"><title>npm</title><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>
              npm
            </span>
          </a>

          <a
            href="/llms.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sky-300 dark:border-sky-500/30 bg-sky-50/80 dark:bg-sky-950/30 text-xs font-semibold text-sky-800 dark:text-sky-300 shadow-sm hover:scale-105 transition-all group"
            title="Official Plugin for Antigravity & Claude Code with llms.txt Standard"
          >
            <Bot className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span>Agent Plugin: Antigravity &bull; Claude &bull; Cursor</span>
            <span className="text-sky-400 dark:text-sky-600">&bull;</span>
            <span className="font-mono text-[11px] font-bold text-sky-700 dark:text-sky-300 underline">llms.txt</span>
          </a>

          <Link
            href="#showcase"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50/80 dark:bg-purple-950/30 text-xs font-semibold text-purple-700 dark:text-purple-300 shadow-sm hover:scale-105 transition-all group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live in Prod: $0.42/mo EHR Platform</span>
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
            Build on AWS. <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-rose-600 via-indigo-600 to-emerald-600 dark:from-rose-400 dark:via-indigo-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Sleep Through the Night.
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p className="max-w-3xl mx-auto text-lg sm:text-xl text-slate-600 dark:text-neutral-400 leading-relaxed">
          Stop paying the PaaS tax out of fear of AWS. Syncploy is the pure TypeScript framework for AWS Serverless with <strong className="text-slate-900 dark:text-white font-semibold">compile-time Denial-of-Wallet immunity</strong>. Statically eliminate infinite loops, uncapped DDoS bills, and poison-pill retries before your code ever touches the cloud.
        </p>

        {/* CTA buttons & Copy Pill */}
        <div className="flex flex-col items-center justify-center gap-3 pt-2">
          <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4">
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

          <a
            href="https://www.npmjs.com/package/@syncploy/sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <svg className="h-3.5 w-3.5 fill-[#CB3837] shrink-0" viewBox="0 0 24 24" role="img"><title>npm</title><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>
            <span>Verified npm release: <span className="underline decoration-slate-400 dark:decoration-neutral-600 font-semibold text-slate-700 dark:text-neutral-300">@syncploy/sdk</span> (v0.1.7)</span>
          </a>

          {/* AI Coding Agent Callout */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500 dark:text-neutral-400">
            <span className="inline-flex items-center gap-1.5 font-medium text-slate-700 dark:text-neutral-300">
              <Bot className="h-3.5 w-3.5 text-indigo-500" /> AI Agent Ready:
            </span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-[#1A1D28] border border-slate-200 dark:border-[#232736] text-slate-700 dark:text-neutral-300">
              Antigravity Plugin
            </span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-[#1A1D28] border border-slate-200 dark:border-[#232736] text-slate-700 dark:text-neutral-300">
              Claude Code
            </span>
            <span className="px-2 py-0.5 rounded-md font-mono text-[11px] bg-slate-100 dark:bg-[#1A1D28] border border-slate-200 dark:border-[#232736] text-slate-700 dark:text-neutral-300">
              Cursor
            </span>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
            >
              /llms.txt &rarr;
            </a>
          </div>
        </div>

        {/* Highlights row */}
        <div className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5" /> Zero-DoW Shield
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Tarjan SCC cycle &amp; poison-pill retry prevention in 0.7ms</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-purple-600 dark:text-purple-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5" /> $0.00 Idle Bill
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Pure serverless. Zero NAT gateways, zero idle EC2 zombies</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-cyan-700 dark:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5" /> Cost Ceilings
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Default edge rate limits &amp; reserved concurrency bounds</div>
          </div>
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
            <div className="text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3.5 w-3.5" /> 0-Replacement
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Brownfield SAM adoption with zero data-loss replacements</div>
          </div>
        </div>
      </div>
    </div>
  );
}
