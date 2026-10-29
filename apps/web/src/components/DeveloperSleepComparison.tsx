"use client";

import React, { useState } from "react";
import {
  Moon,
  Smartphone,
  Cpu,
  TrendingDown,
  BellOff,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

export function DeveloperSleepComparison() {
  const [activeTab, setActiveTab] = useState<"standard" | "syncploy">("standard");

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      {/* Header */}
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-300 shadow-sm">
          <Moon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
          <span>THE 3:14 AM DIFFERENCE</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">Cloud Billing PTSD</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Why Developers Pay the{" "}
          <span className="bg-gradient-to-r from-rose-600 via-amber-600 to-indigo-600 dark:from-rose-400 dark:via-amber-400 dark:to-indigo-400 bg-clip-text text-transparent">
            PaaS Tax
          </span>
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
          Developers don&apos;t use Railway, Render, or Fly.io because they hate AWS pricing. They use them because on AWS,
          there is <strong className="text-slate-900 dark:text-white font-semibold">no hard spending limit button</strong>.
          An architectural bug or bot crawler can drain your bank account while you sleep.
        </p>

        {/* Mobile Tab Switcher */}
        <div className="flex sm:hidden justify-center pt-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#12141C] border border-slate-200 dark:border-[#232736]">
            <button
              onClick={() => setActiveTab("standard")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "standard"
                  ? "bg-rose-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-neutral-400"
              }`}
            >
              Standard AWS (3:14 AM)
            </button>
            <button
              onClick={() => setActiveTab("syncploy")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === "syncploy"
                  ? "bg-emerald-500 text-white shadow-sm"
                  : "text-slate-600 dark:text-neutral-400"
              }`}
            >
              With Syncploy (3:14 AM)
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* =========================================================================
            CARD 1: Standard AWS (The 3 AM Nightmare)
            ========================================================================= */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden relative flex flex-col justify-between ${
            activeTab === "standard" ? "flex" : "hidden lg:flex"
          } border-rose-300 dark:border-rose-900/60 bg-gradient-to-b from-rose-50/80 via-white to-rose-50/30 dark:from-rose-950/40 dark:via-slate-900 dark:to-black text-slate-900 dark:text-white shadow-xl dark:shadow-2xl`}
        >
          {/* Top Bar */}
          <div className="p-6 border-b border-rose-200 dark:border-rose-500/20 bg-rose-100/60 dark:bg-rose-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-wide uppercase text-rose-700 dark:text-rose-400">
                  Standard AWS (CDK / SAM / Serverless)
                </h3>
                <p className="text-xs text-rose-600/80 dark:text-rose-200/70 font-mono">Status: 3:14 AM &bull; Tossing &amp; Turning</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-rose-200 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/30 text-[11px] font-mono font-bold text-rose-800 dark:text-rose-300">
              UNPROTECTED
            </span>
          </div>

          {/* Interactive Scene */}
          <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
            {/* Visual Bedroom Anxiety Graphic */}
            <div className="relative rounded-2xl bg-slate-100 dark:bg-[#090A10] border border-rose-200 dark:border-rose-500/20 p-6 overflow-hidden text-slate-900 dark:text-white shadow-inner">
              {/* Cold Blue Monitor Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/10 blur-3xl pointer-events-none" />

              {/* Developer in Bed Graphic */}
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 relative z-10">
                {/* Face with Wide Open Nervous Eyes */}
                <div
                  className="w-20 h-20 rounded-full bg-slate-300 dark:bg-slate-800 border-2 border-rose-400 dark:border-rose-500/40 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ animation: "restless-jitter 3s ease-in-out infinite" }}
                >
                  {/* Sweat Drop */}
                  <div className="absolute -top-1 right-2 text-cyan-500 dark:text-cyan-400 text-xs animate-bounce">💧</div>

                  {/* Eyes Wide Open */}
                  <div
                    className="flex items-center gap-4 mb-1"
                    style={{ animation: "wide-eye-blink 4s infinite" }}
                  >
                    <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-rose-900 border border-rose-500" />
                    </div>
                    <div className="w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <div className="w-2 h-2 rounded-full bg-rose-900 border border-rose-500" />
                    </div>
                  </div>

                  {/* Worried Mouth */}
                  <div className="w-6 h-1 rounded-full bg-slate-600 dark:bg-slate-400 mt-1" />
                </div>

                <div className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  Developer heart rate: <span className="text-rose-600 dark:text-rose-400 font-bold">114 bpm</span>
                </div>
              </div>

              {/* Staggered Animated Thought Bubbles */}
              <div className="space-y-2.5 pt-2 relative z-10">
                <div
                  className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-950 dark:text-rose-200/90 flex items-start gap-2.5 shadow-md"
                  style={{ animation: "thought-bubble-pop 0.6s ease-out 0.2s both" }}
                >
                  <span className="text-rose-500 text-sm shrink-0">💭</span>
                  <span>
                    <em>&ldquo;Did I delete that NAT Gateway, or is it silently burning $45/month while idling?&rdquo;</em>
                  </span>
                </div>

                <div
                  className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-950 dark:text-rose-200/90 flex items-start gap-2.5 shadow-md"
                  style={{ animation: "thought-bubble-pop 0.6s ease-out 0.5s both" }}
                >
                  <span className="text-rose-500 text-sm shrink-0">💭</span>
                  <span>
                    <em>&ldquo;What if an automated scraper hits my public Function URL and spins up 1,000 Lambdas?&rdquo;</em>
                  </span>
                </div>

                <div
                  className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-rose-200 dark:border-rose-500/30 text-xs text-rose-950 dark:text-rose-200/90 flex items-start gap-2.5 shadow-md"
                  style={{ animation: "thought-bubble-pop 0.6s ease-out 0.8s both" }}
                >
                  <span className="text-rose-500 text-sm shrink-0">💭</span>
                  <span>
                    <em>&ldquo;Did my DynamoDB stream worker write back into the source table?! Did I just create an infinite loop?!&rdquo;</em>
                  </span>
                </div>
              </div>

              {/* Nightstand Phone Vibrating with Red Alert */}
              <div
                className="mt-6 rounded-xl border border-rose-300 dark:border-rose-500/50 bg-rose-50 dark:bg-rose-950/70 p-3.5 flex items-center gap-3 shadow-md relative z-10"
                style={{ animation: "phone-vibrate 2.5s infinite" }}
              >
                <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <Smartphone className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase text-rose-700 dark:text-rose-400 font-bold flex items-center justify-between">
                    <span>BANK FRAUD ALERT &bull; 03:12 AM</span>
                    <span className="text-rose-600 dark:text-rose-300 animate-pulse">URGENT</span>
                  </div>
                  <div className="text-xs text-rose-950 dark:text-white font-medium truncate mt-0.5">
                    $18,420.00 charged by Amazon Web Services
                  </div>
                  <div className="text-[10px] text-rose-700/80 dark:text-rose-300/80">Card has exceeded credit limit and is locked.</div>
                </div>
              </div>
            </div>

            {/* Architecture Invariants (Failures) */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wider font-mono">
                The Standard AWS Reality:
              </div>
              <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 dark:text-rose-400 shrink-0 font-bold">&#10005;</span>
                  <span><strong>Zero Default Throttles:</strong> Function URLs scale unthrottled to 1,000 concurrent instances under DDoS.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 dark:text-rose-400 shrink-0 font-bold">&#10005;</span>
                  <span><strong>Silent Event Loops:</strong> DynamoDB stream writes trigger recursive self-amplification ($10,000+ overnight).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-rose-600 dark:text-rose-400 shrink-0 font-bold">&#10005;</span>
                  <span><strong>AWS Budgets Only Warn:</strong> Billing data lags 6–12 hours. It emails you after the card is already drained.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* =========================================================================
            CARD 2: With Syncploy (Compile-Time Peace of Mind)
            ========================================================================= */}
        <div
          className={`rounded-3xl border transition-all overflow-hidden relative flex flex-col justify-between ${
            activeTab === "syncploy" ? "flex" : "hidden lg:flex"
          } border-emerald-300 dark:border-emerald-500/40 bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/30 dark:from-emerald-950/40 dark:via-slate-900 dark:to-black text-slate-900 dark:text-white shadow-xl dark:shadow-2xl`}
        >
          {/* Top Bar */}
          <div className="p-6 border-b border-emerald-200 dark:border-emerald-500/20 bg-emerald-100/60 dark:bg-emerald-950/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-wide uppercase text-emerald-700 dark:text-emerald-400">
                  With Syncploy (Zero-DoW Shield)
                </h3>
                <p className="text-xs text-emerald-600/80 dark:text-emerald-200/70 font-mono">Status: 3:14 AM &bull; Deep REM Sleep</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-200 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/30 text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
              IMMUNE
            </span>
          </div>

          {/* Interactive Scene */}
          <div className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col justify-between">
            {/* Visual Bedroom Peace Graphic */}
            <div className="relative rounded-2xl bg-slate-100 dark:bg-[#090A10] border border-emerald-200 dark:border-emerald-500/20 p-6 overflow-hidden text-slate-900 dark:text-white shadow-inner">
              {/* Calm Emerald/Cyan Ambient Glow */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/10 blur-3xl pointer-events-none" />

              {/* Developer Sleeping Content Graphic */}
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3 relative z-10">
                {/* Floating ZZZs */}
                <div
                  className="absolute -top-2 right-1/4 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-base select-none"
                  style={{ animation: "zzz-drift 3s infinite ease-in-out" }}
                >
                  zZz
                </div>
                <div
                  className="absolute top-2 right-1/3 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-sm select-none"
                  style={{ animation: "zzz-drift 3s infinite 1.2s ease-in-out" }}
                >
                  zZ
                </div>

                {/* Face Content & Asleep */}
                <div
                  className="w-20 h-20 rounded-full bg-slate-300 dark:bg-slate-800 border-2 border-emerald-400 dark:border-emerald-500/40 flex flex-col items-center justify-center relative shadow-inner"
                  style={{ animation: "peaceful-breathe 4s ease-in-out infinite" }}
                >
                  {/* Peaceful Closed Eyes */}
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-3.5 h-1.5 rounded-full border-b-2 border-emerald-600 dark:border-emerald-400" />
                    <div className="w-3.5 h-1.5 rounded-full border-b-2 border-emerald-600 dark:border-emerald-400" />
                  </div>

                  {/* Content Smile */}
                  <div className="w-5 h-2 rounded-full border-b-2 border-emerald-600 dark:border-emerald-300" />
                </div>

                <div className="text-xs font-mono text-emerald-700 dark:text-emerald-300">
                  Developer heart rate: <span className="text-emerald-600 dark:text-emerald-400 font-bold">58 bpm (Resting)</span>
                </div>
              </div>

              {/* Live Compile-Time Invariants HUD */}
              <div className="space-y-2.5 pt-2 relative z-10">
                <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 text-xs text-slate-800 dark:text-emerald-200/90 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Tarjan SCC Recursion Shield</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/30">
                    0 LOOPS (0.7ms AST)
                  </span>
                </div>

                <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 text-xs text-slate-800 dark:text-emerald-200/90 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
                    <span>Worst-Case Blast Radius</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-200 dark:border-cyan-500/30">
                    MAX $14.20 / MO
                  </span>
                </div>

                <div className="rounded-xl p-3 bg-white dark:bg-slate-900/90 border border-emerald-200 dark:border-emerald-500/30 text-xs text-slate-800 dark:text-emerald-200/90 flex items-center justify-between shadow-md">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
                    <span>Idle Infrastructure Spend</span>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/80 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-500/30">
                    $0.00 / MO IDLE
                  </span>
                </div>
              </div>

              {/* Nightstand Phone Silent on Do Not Disturb */}
              <div className="mt-6 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 p-3.5 flex items-center gap-3 shadow-md relative z-10">
                <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 shrink-0">
                  <BellOff className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-mono uppercase text-emerald-700 dark:text-emerald-400 font-bold flex items-center justify-between">
                    <span>DO NOT DISTURB &bull; 03:14 AM</span>
                    <span className="text-emerald-600 dark:text-emerald-300 font-mono">ALL SYSTEMS SAFE</span>
                  </div>
                  <div className="text-xs text-emerald-950 dark:text-white font-medium truncate mt-0.5">
                    Month-to-Date Spend: $0.42 USD
                  </div>
                  <div className="text-[10px] text-emerald-700/80 dark:text-emerald-300/80">3,400 bot requests dropped at edge stage for $0.00.</div>
                </div>
              </div>
            </div>

            {/* Architecture Invariants (Protections) */}
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
                The Syncploy Mathematical Guarantee:
              </div>
              <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Mathematical Blast Radius:</strong> Explicit concurrency caps mean even under 100,000,000 DDoS requests, spend is bounded.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Compile-Time Tarjan Shield:</strong> Recursive loops are detected in the AST and aborted before deployment.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>PaaS Safety at AWS Raw Pricing:</strong> Zero servers to manage, $0.00 idle cost, and zero fear of the billing engine.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
