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
    <div className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background radial gradient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-cyan-500/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-xs font-semibold text-indigo-300">
          <Zap className="h-3.5 w-3.5 text-indigo-400" />
          <span>Infrastructure-from-Code for TypeScript</span>
          <span className="text-neutral-500">&bull;</span>
          <span className="text-neutral-400">Pure AWS Serverless</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
          Stop writing YAML. <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            Let the compiler synthesize AWS.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-2xl mx-auto text-lg sm:text-xl text-neutral-400 leading-relaxed">
          Write pure TypeScript. Syncploy parses your application logic, detects recursive loops and denial-of-wallet vectors at compile-time, and synthesizes 1:1 CloudFormation templates with zero stateful replacements.
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
            className="w-full sm:w-auto flex items-center justify-between sm:justify-start gap-3 px-4 py-3 rounded-xl border border-border bg-surface hover:bg-surface-hover font-mono text-xs sm:text-sm text-neutral-300 transition-colors"
          >
            <span className="text-indigo-400">$</span>
            <span>{installCmd}</span>
            <span className="p-1 rounded bg-surface-hover text-neutral-400">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            </span>
          </button>
        </div>

        {/* Highlights row */}
        <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
          <div className="p-3.5 rounded-lg border border-border/60 bg-surface/40">
            <div className="text-emerald-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Shield className="h-3.5 w-3.5" /> Loop Shield
            </div>
            <div className="text-xs text-neutral-400">Static AST recursion & event cycle detection</div>
          </div>
          <div className="p-3.5 rounded-lg border border-border/60 bg-surface/40">
            <div className="text-cyan-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <RefreshCw className="h-3.5 w-3.5" /> 0-Replacement
            </div>
            <div className="text-xs text-neutral-400">Brownfield SAM adoption with zero data loss</div>
          </div>
          <div className="p-3.5 rounded-lg border border-border/60 bg-surface/40">
            <div className="text-indigo-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Terminal className="h-3.5 w-3.5" /> Clean 4 Auth
            </div>
            <div className="text-xs text-neutral-400">HIPAA compliant Cognito & auto-wired env vars</div>
          </div>
          <div className="p-3.5 rounded-lg border border-border/60 bg-surface/40">
            <div className="text-amber-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Zap className="h-3.5 w-3.5" /> Least-Privilege
            </div>
            <div className="text-xs text-neutral-400">Automated CI/CD deploy policy generation</div>
          </div>
        </div>
      </div>
    </div>
  );
}
