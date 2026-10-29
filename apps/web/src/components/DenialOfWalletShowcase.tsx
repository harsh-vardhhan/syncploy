"use client";

import React, { useState, useEffect } from "react";
import { Shield, AlertTriangle, Flame, Lock, Zap, ArrowRight, DollarSign, CheckCircle2, RefreshCw } from "lucide-react";

export function DenialOfWalletShowcase() {
  const [mode, setMode] = useState<"standard" | "syncploy">("standard");
  const [concurrency, setConcurrency] = useState(5);
  const [memoryMb, setMemoryMb] = useState(256);
  const [billCounter, setBillCounter] = useState(1284.5);

  // Rapidly increasing ticker in Standard AWS mode to simulate runaway bill
  useEffect(() => {
    if (mode === "standard") {
      const interval = setInterval(() => {
        setBillCounter((prev) => {
          if (prev > 48500) return 1284.5;
          return prev + Math.floor(Math.random() * 85 + 25);
        });
      }, 80);
      return () => clearInterval(interval);
    } else {
      setBillCounter(14.2);
    }
  }, [mode]);

  // Max monthly cost formula (worst-case sustained 24/7 Lambda executions)
  // Concurrency * (memoryMB / 1024) * 2,592,000 seconds * $0.0000166667 per GB-second
  const syncployMaxMonthlyCost = (
    concurrency *
    (memoryMb / 1024) *
    2592000 *
    0.0000166667
  ).toFixed(2);

  return (
    <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 overflow-hidden">
      {/* Background ambient lighting */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] blur-3xl pointer-events-none -z-10 transition-all duration-700 ${
          mode === "standard"
            ? "bg-rose-500/15 dark:bg-rose-600/20"
            : "bg-emerald-500/15 dark:bg-cyan-500/20"
        }`}
      />

      {/* Header section */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-950/30 text-xs font-semibold text-rose-700 dark:text-rose-400 shadow-sm">
          <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
          <span>The #1 Reason Developers Avoid AWS: Bill Shock</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
          Never wake up to a <br className="hidden sm:inline" />
          <span
            className={`transition-colors duration-500 ${
              mode === "standard"
                ? "text-rose-600 dark:text-rose-500 underline decoration-rose-500/50"
                : "bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 bg-clip-text text-transparent"
            }`}
          >
            {mode === "standard" ? "$25,000 surprise cloud bill." : "mathematically bounded bill."}
          </span>
        </h2>

        <p className="text-slate-600 dark:text-neutral-400 text-sm sm:text-base leading-relaxed">
          Standard serverless scales to infinity — and so does your credit card. Syncploy is the only framework that
          enforces <strong className="text-slate-900 dark:text-white font-semibold">compile-time recursion shields</strong> and{" "}
          <strong className="text-slate-900 dark:text-white font-semibold">mathematical worst-case cost ceilings</strong> before code ever deploys.
        </p>

        {/* The Master Interactive Switch */}
        <div className="pt-2 flex justify-center">
          <div className="p-1.5 rounded-2xl bg-slate-100 dark:bg-[#151822] border border-slate-200 dark:border-[#262B3D] inline-flex items-center gap-2 shadow-inner">
            <button
              onClick={() => setMode("standard")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === "standard"
                  ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30 scale-[1.02]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Standard AWS (The Billing Trap)</span>
            </button>

            <button
              onClick={() => setMode("syncploy")}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === "syncploy"
                  ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Shield className="h-4 w-4" />
              <span>With Syncploy (Zero-DoW Shield)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Stage */}
      <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Physical Card & Leaking Wallet Visualization */}
        <div className="lg:col-span-6 relative">
          <div
            className={`relative rounded-3xl p-6 sm:p-8 border transition-all duration-700 overflow-hidden ${
              mode === "standard"
                ? "bg-gradient-to-br from-rose-50/80 via-white to-rose-50/40 dark:from-rose-950/40 dark:via-[#181014] dark:to-[#0A0507] border-rose-300 dark:border-rose-500/50 shadow-xl dark:shadow-2xl shadow-rose-500/10 dark:shadow-rose-500/20"
                : "bg-gradient-to-br from-emerald-50/80 via-white to-cyan-50/40 dark:from-emerald-950/40 dark:via-[#0B1716] dark:to-[#050C0C] border-emerald-300 dark:border-cyan-500/50 shadow-xl dark:shadow-2xl shadow-emerald-500/10 dark:shadow-cyan-500/20"
            }`}
          >
            {/* Live Status Badge */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700/30 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    mode === "standard" ? "bg-rose-500 animate-ping" : "bg-emerald-500"
                  }`}
                />
                <span
                  className={`text-xs font-mono font-bold tracking-wider uppercase ${
                    mode === "standard" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                  }`}
                >
                  {mode === "standard" ? "CRITICAL: UNBOUNDED SCALE" : "PROTECTED: VAULT SEALED"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                  Current Billing Velocity
                </span>
                <div
                  className={`text-sm font-mono font-bold ${
                    mode === "standard" ? "text-rose-600 dark:text-rose-400" : "text-cyan-600 dark:text-cyan-400"
                  }`}
                >
                  {mode === "standard" ? "+$148.00 / min" : "$0.00 / idle"}
                </div>
              </div>
            </div>

            {/* The Stylized Credit Card */}
            <div
              style={{
                animation:
                  mode === "standard"
                    ? "card-overheat 2.5s infinite ease-in-out"
                    : "vault-lock 0.8s ease-out forwards",
              }}
              className={`relative mx-auto w-full max-w-sm rounded-2xl p-6 border text-white transition-all duration-700 transform ${
                mode === "standard"
                  ? "bg-gradient-to-tr from-rose-950 via-slate-900 to-rose-950 border-rose-400 dark:border-rose-500/80 shadow-2xl shadow-rose-600/30 rotate-[-1deg]"
                  : "bg-gradient-to-tr from-slate-900 via-emerald-950 to-slate-900 border-emerald-400 dark:border-cyan-500/80 shadow-2xl shadow-emerald-500/20 dark:shadow-cyan-500/30 rotate-0"
              }`}
            >
              {/* Card Header & Chip */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-7 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-xs">
                    <div className="w-5 h-4 border border-amber-600/60 rounded-xs" />
                  </div>
                  <span className="text-[11px] font-mono text-slate-300">EMV SECURE</span>
                </div>
                <div className="font-mono text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>AWS CLOUD</span>
                  {mode === "standard" ? (
                    <Flame className="h-4 w-4 text-rose-400 animate-bounce" />
                  ) : (
                    <Lock className="h-4 w-4 text-emerald-400" />
                  )}
                </div>
              </div>

              {/* Card Number / Ticker */}
              <div className="space-y-1 mb-6">
                <div className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
                  Live Month-To-Date Spend
                </div>
                <div
                  className={`text-3xl sm:text-4xl font-mono font-black tracking-tight ${
                    mode === "standard" ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  ${mode === "standard" ? billCounter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "14.20"}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                <div>
                  <span className="text-[9px] block text-slate-400 uppercase">Cardholder</span>
                  <span className="text-white font-semibold">DEV ACCOUNT #9482</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] block text-slate-400 uppercase">Limit Status</span>
                  <span
                    className={`font-bold ${
                      mode === "standard" ? "text-rose-400 animate-pulse" : "text-cyan-400"
                    }`}
                  >
                    {mode === "standard" ? "MAX LIMIT BREACHED" : "CAPPED AT $20.00"}
                  </span>
                </div>
              </div>

              {/* Falling Cash Particles in Standard Mode */}
              {mode === "standard" && (
                <div className="pointer-events-none absolute inset-0 overflow-hidden">
                  <span className="absolute top-2 right-4 text-xs font-mono font-bold text-rose-400 animate-ping">
                    -$100
                  </span>
                  <span className="absolute bottom-4 left-8 text-xs font-mono font-bold text-rose-400 animate-bounce">
                    -$500
                  </span>
                  <span className="absolute top-1/2 left-2 text-xs font-mono font-bold text-rose-300 opacity-75">
                    💸
                  </span>
                  <span className="absolute bottom-2 right-6 text-xs font-mono font-bold text-rose-300 opacity-75">
                    💸
                  </span>
                </div>
              )}

              {/* Vault Clamp Overlay in Syncploy Mode */}
              {mode === "syncploy" && (
                <div className="pointer-events-none absolute -top-3 -right-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-mono text-[10px] font-extrabold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>BLAST RADIUS SEALED</span>
                </div>
              )}
            </div>

            {/* Explanatory Caption */}
            <div className="mt-6 text-center text-xs font-mono text-slate-600 dark:text-neutral-400">
              {mode === "standard" ? (
                <span className="text-rose-600 dark:text-rose-400 font-semibold flex items-center justify-center gap-1.5">
                  <AlertTriangle className="h-4 w-4" />
                  Uncapped concurrency: 1 rogue loop can burn your entire bank limit overnight.
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                  <Shield className="h-4 w-4" />
                  Mathematical ceiling enforced: Lambda concurrency &amp; API rate limits cap maximum burn.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Detailed Guardrail Breakdown & Threat Matrix */}
        <div className="lg:col-span-6 space-y-4">
          <div className="border border-slate-200 dark:border-[#262B3D] rounded-2xl p-5 bg-white dark:bg-[#12141C] shadow-sm">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-indigo-500" />
              <span>How Syncploy Eliminates Each Threat</span>
            </h3>

            <div className="space-y-3">
              {/* Threat 1 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  mode === "standard"
                    ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
                    : "border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>1. Infinite Event Loops</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1C2030] text-slate-700 dark:text-neutral-300">
                        Table &rarr; Stream &rarr; Table.put
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                      {mode === "standard"
                        ? "AWS deploys without complaint. The loop triggers millions of invocations until your credit card declines."
                        : "Compile-time Tarjan SCC graph validator catches the cycle in <1ms. Compilation aborts. $0 billed."}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 ${
                      mode === "standard" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {mode === "standard" ? "UNPROTECTED" : "BLOCKED (0ms)"}
                  </span>
                </div>
              </div>

              {/* Threat 2 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  mode === "standard"
                    ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
                    : "border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>2. Unthrottled Public DDoS</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1C2030] text-slate-700 dark:text-neutral-300">
                        Function URL
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                      {mode === "standard"
                        ? "Public endpoints scale to AWS account concurrency limit (1,000+). Scrapers drain thousands in minutes."
                        : "Default 1,000 rps / 2,000 burst stage throttling drops floods at the edge. Concurrency caps lock max burn."}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 ${
                      mode === "standard" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {mode === "standard" ? "$10,000+ RISK" : "CAPPED AT EDGE"}
                  </span>
                </div>
              </div>

              {/* Threat 3 */}
              <div
                className={`p-3.5 rounded-xl border transition-all ${
                  mode === "standard"
                    ? "border-rose-300 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20"
                    : "border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>3. Poison-Pill Retry Storms</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1C2030] text-slate-700 dark:text-neutral-300">
                        DynamoDB & SQS
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
                      {mode === "standard"
                        ? "DynamoDB retries for 24 continuous hours. SQS queues without DLQs re-trigger consumers infinitely."
                        : "Stream retries auto-capped at 3 attempts with bisect on error. Mandatory DLQs eliminate poison pill loops."}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-mono font-bold shrink-0 ${
                      mode === "standard" ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {mode === "standard" ? "24-HR LOOPS" : "DLQ BUFFERED"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Blast Radius Calculator Box */}
          <div className="border border-slate-200 dark:border-[#262B3D] rounded-2xl p-5 bg-gradient-to-br from-indigo-50/40 via-white to-slate-50 dark:from-[#131724] dark:via-[#12141C] dark:to-[#0D0F17] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1.5">
                <DollarSign className="h-4 w-4" />
                <span>Worst-Case Monthly Blast Radius Calculator</span>
              </span>
              <span className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400">
                Max: ${syncployMaxMonthlyCost} / mo
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-400 mb-4">
              Even under a continuous 24/7 non-stop DDoS attack, your bill cannot physically exceed this mathematical ceiling:
            </p>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Reserved Concurrency: <strong>{concurrency}</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={concurrency}
                  onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 mb-1">
                  Memory Allocation: <strong>{memoryMb} MB</strong>
                </label>
                <input
                  type="range"
                  min="128"
                  max="2048"
                  step="128"
                  value={memoryMb}
                  onChange={(e) => setMemoryMb(parseInt(e.target.value, 10))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
