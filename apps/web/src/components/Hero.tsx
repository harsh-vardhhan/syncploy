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
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 text-xs font-semibold text-indigo-700 dark:text-indigo-300 shadow-sm">
          <Zap className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Infrastructure-from-Code for TypeScript</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">Pure AWS Serverless</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]">
          The Terraform for <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-600 via-cyan-600 to-emerald-600 dark:from-indigo-400 dark:via-cyan-400 dark:to-emerald-400 bg-clip-text text-transparent">
            AWS Serverless.
          </span>
        </h1>

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
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-surface-hover font-mono text-xs sm:text-sm text-slate-800 dark:text-neutral-300 transition-colors shadow-sm"
          >
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">$</span>
            <span className="font-medium">{installCmd}</span>
            <span className="p-1 rounded bg-slate-200/60 dark:bg-surface-hover text-slate-600 dark:text-neutral-400">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </span>
          </button>
        </div>

        {/* Highlights row */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-xl border border-border bg-surface/80 dark:bg-surface/40 shadow-sm">
            <div className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5" /> Loop Shield
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Static AST recursion & event cycle detection</div>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface/80 dark:bg-surface/40 shadow-sm">
            <div className="text-cyan-700 dark:text-cyan-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3.5 w-3.5" /> 0-Replacement
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">Brownfield SAM adoption with zero data loss</div>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface/80 dark:bg-surface/40 shadow-sm">
            <div className="text-indigo-600 dark:text-indigo-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Terminal className="h-3.5 w-3.5" /> Clean 4 Auth
            </div>
            <div className="text-xs text-slate-600 dark:text-neutral-400">HIPAA compliant Cognito & auto-wired env vars</div>
          </div>
          <div className="p-3.5 rounded-xl border border-border bg-surface/80 dark:bg-surface/40 shadow-sm">
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
