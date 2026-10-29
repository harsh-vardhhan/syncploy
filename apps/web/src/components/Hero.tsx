"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  Check,
  Shield,
  Zap,
  RefreshCw,
  Bot,
  Lock,
  Flame,
} from "lucide-react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [billCounter, setBillCounter] = useState(1284.5);
  const installCmd = "bun add @syncploy/sdk";

  // Automated background ticker showing the runaway bill risk on standard AWS
  useEffect(() => {
    const interval = setInterval(() => {
      setBillCounter((prev) =>
        prev > 48000 ? 1284.5 : prev + Math.floor(Math.random() * 85 + 25)
      );
    }, 90);
    return () => clearInterval(interval);
  }, []);

  // Continuous CSS 3D card-flip animation: alternates between Standard AWS & Syncploy every 4.5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setIsFlipped((prev) => !prev);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(installCmd);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative pt-4 sm:pt-6 md:pt-8 pb-12 md:pb-16 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent dark:from-indigo-600/20 dark:via-cyan-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Badges Row */}
        <div className="flex flex-wrap items-center gap-2.5 pb-6">
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
            <span>Agent Plugin</span>
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

        {/* 2-Column First-Fold Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left Column: Headlines, CTAs, Agent Specs */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-[#151926] border border-slate-200 dark:border-[#262C40] text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">ZERO-DOW FRAMEWORK</span>
                <span className="text-slate-400 dark:text-slate-600">&bull;</span>
                <span>PURE TYPESCRIPT FOR AWS</span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.06]">
                Build on AWS. <br />
                <span className="bg-gradient-to-r from-rose-600 via-indigo-600 to-emerald-600 dark:from-rose-400 dark:via-indigo-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Sleep Through the Night.
                </span>
              </h1>
            </div>

            <p className="text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed max-w-2xl">
              Stop paying the PaaS tax out of fear of AWS. Syncploy is the pure TypeScript framework for AWS Serverless with <strong className="text-slate-900 dark:text-white font-semibold">compile-time Denial-of-Wallet immunity</strong>. Statically eliminate infinite loops, uncapped DDoS bills, and poison-pill retries before your code ever touches the cloud.
            </p>

            {/* CTA Buttons & Installation Pill */}
            <div className="space-y-3.5 pt-1">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/docs"
                  className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:brightness-110 transition-all text-sm"
                >
                  <span>Start Building</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  onClick={handleCopy}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] font-mono text-xs sm:text-sm text-slate-800 dark:text-neutral-300 transition-colors shadow-sm"
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
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 pt-1">
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
          </div>

          {/* Right Column: First-Fold 3D Auto-Flipping Credit Card UI (Both Scenarios via CSS) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center pt-8 lg:pt-0">
            {/* Scenario Indicator Pills */}
            <div className="w-full max-w-[420px] flex items-center justify-center gap-2 mb-3 text-xs">
              <button
                type="button"
                onClick={() => setIsFlipped(false)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs transition-all ${
                  !isFlipped
                    ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30 shadow-xs scale-105"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent"
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
                <span>Standard AWS (The Risk)</span>
              </button>

              <span className="text-slate-300 dark:text-slate-600">&bull;</span>

              <button
                type="button"
                onClick={() => setIsFlipped(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-bold text-xs transition-all ${
                  isFlipped
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 shadow-xs scale-105"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 border border-transparent"
                }`}
              >
                <Shield className="h-3.5 w-3.5 text-emerald-500" />
                <span>With Syncploy (Vault Locked)</span>
              </button>
            </div>

            {/* 3D Perspective Card Container */}
            <div className="relative w-full max-w-[420px] [perspective:1200px]">
              <div
                style={{
                  transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                }}
                className="relative w-full transition-transform duration-700 [transform-style:preserve-3d]"
              >
                {/* Side A: Standard AWS (The Risk) - Glowing Overheat Animation */}
                <div
                  style={{
                    animation: !isFlipped ? "card-overheat 2.5s infinite ease-in-out" : "none",
                  }}
                  className="w-full rounded-2xl p-5 sm:p-6 border text-white transition-all [backface-visibility:hidden] bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-950 border-rose-400 dark:border-rose-500/80 shadow-2xl shadow-rose-600/30"
                >
                  {/* Header & Chip */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-7 rounded-md bg-rose-500/20 border border-rose-400/60 flex items-center justify-center shadow-xs">
                        <Flame className="h-4 w-4 text-rose-400 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-rose-300 uppercase font-bold">
                        UNCAPPED RISK
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-rose-200 flex items-center gap-1.5">
                      <span>AWS CLOUD</span>
                      <Flame className="h-4 w-4 text-rose-400 animate-bounce" />
                    </div>
                  </div>

                  {/* Runaway Spend Ticker */}
                  <div className="relative space-y-1 mb-5 text-left">
                    <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest flex items-center justify-between">
                      <span>Runaway Live Spend</span>
                      <span className="text-[10px] font-mono text-rose-400 font-bold animate-pulse">+$148.00 / min</span>
                    </div>
                    <div className="font-mono text-3xl sm:text-4xl font-black text-rose-400 tracking-tight animate-pulse">
                      ${billCounter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs font-mono font-normal text-slate-400 ml-2">USD</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="relative flex items-center justify-between text-[11px] font-mono text-slate-300 pt-2 border-t border-white/10 text-left">
                    <div>
                      <span className="text-[9px] block text-slate-400 uppercase tracking-wider">Cardholder</span>
                      <span className="text-white font-semibold">DEV ACCOUNT #9482</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] block text-slate-400 uppercase tracking-wider">Limit Status</span>
                      <span className="font-bold text-rose-400 animate-pulse">
                        CRITICAL: UNBOUNDED
                      </span>
                    </div>
                  </div>
                </div>

                {/* Side B: With Syncploy (Vault Locked) - Vault-Lock Cyan Glow Animation */}
                <div
                  style={{
                    animation: isFlipped ? "vault-lock 0.8s ease-out forwards" : "none",
                  }}
                  className="absolute inset-0 w-full rounded-2xl p-5 sm:p-6 border text-white transition-all [backface-visibility:hidden] [transform:rotateY(180deg)] bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 border-emerald-400 dark:border-cyan-500/80 shadow-2xl shadow-emerald-500/20 backdrop-blur-md"
                >
                  {/* Ambient Card Gloss */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

                  {/* Header & Golden EMV Chip */}
                  <div className="relative flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-7 rounded-md bg-amber-400/90 border border-amber-300 flex items-center justify-center shadow-xs">
                        <div className="w-5 h-4 border border-amber-600/60 rounded-xs bg-amber-400/40" />
                      </div>
                      <span className="text-[10px] font-mono tracking-widest text-emerald-300 uppercase font-bold">
                        EMV SECURE &bull; ZERO-DOW
                      </span>
                    </div>
                    <div className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span>AWS CLOUD</span>
                      <Lock className="h-4 w-4 text-emerald-400" />
                    </div>
                  </div>

                  {/* Hard-Capped Spend */}
                  <div className="relative space-y-1 mb-5 text-left">
                    <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest flex items-center justify-between">
                      <span>Month-To-Date Spend</span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">$0.00 / idle</span>
                    </div>
                    <div className="font-mono text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">
                      $0.42
                      <span className="text-xs font-mono font-normal text-slate-400 ml-2">USD</span>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="relative flex items-center justify-between text-[11px] font-mono text-slate-300 pt-2 border-t border-white/10 text-left">
                    <div>
                      <span className="text-[9px] block text-slate-400 uppercase tracking-wider">Cardholder</span>
                      <span className="text-white font-semibold">DEV ACCOUNT #9482</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] block text-slate-400 uppercase tracking-wider">Limit Status</span>
                      <span className="font-bold text-cyan-400">
                        VAULT SEALED (MAX $4.80)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Explanatory Caption that syncs with current side */}
            <div className="mt-3.5 text-center text-xs font-mono h-8 flex items-center justify-center">
              {isFlipped ? (
                <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center justify-center gap-1.5 transition-all">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>Zero-DoW Shield: Tarjan SCC &amp; concurrency bounds cap max burn at $4.80.</span>
                </span>
              ) : (
                <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center justify-center gap-1.5 transition-all">
                  <Flame className="h-3.5 w-3.5 shrink-0" />
                  <span>Standard AWS: Uncapped Lambda concurrency can drain bank limits overnight.</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Highlights Row */}
        <div className="pt-10 sm:pt-14 grid grid-cols-2 md:grid-cols-4 gap-4 w-full text-left">
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
