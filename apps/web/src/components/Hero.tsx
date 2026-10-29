"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Copy,
  Check,
  Terminal,
  Shield,
  Zap,
  RefreshCw,
  Bot,
  Lock,
  Flame,
  CheckCircle2,
} from "lucide-react";

export function Hero() {
  const [copied, setCopied] = useState(false);
  const [cardMode, setCardMode] = useState<"syncploy" | "standard">("syncploy");
  const [billCounter, setBillCounter] = useState(14.2);
  const installCmd = "bun add @syncploy/sdk";

  useEffect(() => {
    if (cardMode === "standard") {
      const interval = setInterval(() => {
        setBillCounter((prev) =>
          prev > 48000 ? 1284.5 : prev + Math.floor(Math.random() * 85 + 25)
        );
      }, 80);
      return () => clearInterval(interval);
    } else {
      setBillCounter(0.42);
    }
  }, [cardMode]);

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

        {/* Main Headline */}
        <div className="space-y-4 pt-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-100 dark:bg-[#151926] border border-slate-200 dark:border-[#262C40] text-xs font-mono font-semibold text-slate-700 dark:text-slate-300 shadow-xs">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">ZERO-DOW FRAMEWORK</span>
            <span className="text-slate-400 dark:text-slate-600">&bull;</span>
            <span>PURE TYPESCRIPT FOR AWS</span>
          </div>

          <h1 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.06]">
            Build on AWS. <br />
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

        {/* Denial-of-Wallet Live Shield Credit Card Graphic */}
        <div className="pt-2 max-w-lg mx-auto">
          {/* Interactive Mode Toggle */}
          <div className="p-1 rounded-2xl bg-slate-100 dark:bg-[#151822] border border-slate-200 dark:border-[#262B3D] inline-flex items-center gap-1.5 shadow-xs mb-4">
            <button
              type="button"
              onClick={() => setCardMode("syncploy")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cardMode === "syncploy"
                  ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-md shadow-emerald-600/30 scale-[1.02]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Shield className="h-3.5 w-3.5" />
              <span>With Syncploy (Vault Locked)</span>
            </button>

            <button
              type="button"
              onClick={() => setCardMode("standard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                cardMode === "standard"
                  ? "bg-rose-600 text-white shadow-md shadow-rose-600/30 scale-[1.02]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Standard AWS (The Risk)</span>
            </button>
          </div>

          {/* Physical Stylized Card */}
          <div
            style={{
              animation:
                cardMode === "standard"
                  ? "card-overheat 2.5s infinite ease-in-out"
                  : "vault-lock 0.8s ease-out forwards",
            }}
            className={`relative mx-auto w-full rounded-2xl p-5 sm:p-6 border text-white transition-all duration-700 transform ${
              cardMode === "standard"
                ? "bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-950 border-rose-400 dark:border-rose-500/80 shadow-2xl shadow-rose-600/30 -rotate-1"
                : "bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 border-emerald-400 dark:border-cyan-500/80 shadow-2xl shadow-emerald-500/20 dark:shadow-cyan-500/30 rotate-0"
            }`}
          >
            {/* Ambient Card Gloss */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

            {/* Card Header & Chip */}
            <div className="relative flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-7 rounded-md bg-amber-400/90 border border-amber-300 flex items-center justify-center shadow-xs">
                  <div className="w-5 h-4 border border-amber-600/60 rounded-xs bg-amber-400/40" />
                </div>
                <span className="text-[10px] font-mono tracking-widest text-slate-300 uppercase">EMV SECURE</span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>AWS CLOUD</span>
                {cardMode === "standard" ? (
                  <Flame className="h-4 w-4 text-rose-400 animate-bounce" />
                ) : (
                  <Lock className="h-4 w-4 text-emerald-400" />
                )}
              </div>
            </div>

            {/* Card Number / Spend Ticker */}
            <div className="relative space-y-1 mb-5 text-left">
              <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest flex items-center justify-between">
                <span>Live Month-To-Date Spend</span>
                <span className="text-[10px] font-mono text-slate-400">
                  {cardMode === "standard" ? "+$148.00 / min" : "$0.00 / idle"}
                </span>
              </div>
              <div
                className={`font-mono text-3xl sm:text-4xl font-black tracking-tight transition-all duration-300 ${
                  cardMode === "standard"
                    ? "text-rose-400 animate-pulse"
                    : "text-emerald-400"
                }`}
              >
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
                <span
                  className={`font-bold ${
                    cardMode === "standard" ? "text-rose-400 animate-pulse" : "text-cyan-400"
                  }`}
                >
                  {cardMode === "standard" ? "UNBOUNDED RISK" : "VAULT SEALED (MAX $4.80)"}
                </span>
              </div>
            </div>
          </div>

          {/* Explanatory Caption */}
          <div className="mt-3 text-center text-xs font-mono">
            {cardMode === "standard" ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center justify-center gap-1.5">
                <Flame className="h-3.5 w-3.5 shrink-0" />
                <span>Uncapped concurrency: 1 rogue loop can drain your bank limit overnight.</span>
              </span>
            ) : (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold inline-flex items-center justify-center gap-1.5">
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Mathematical cost ceiling: reserved concurrency &amp; rate limits cap maximum burn.</span>
              </span>
            )}
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
