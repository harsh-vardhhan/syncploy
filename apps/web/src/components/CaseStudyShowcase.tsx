"use client";

import React from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ExternalLink,
  ArrowRight,
  Database,
  Layers,
  Terminal,
  Activity,
  Github,
  GitMerge,
  CheckCircle2,
} from "lucide-react";

export function CaseStudyShowcase() {
  return (
    <section id="showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      {/* Section Header */}
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/30 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-sm">
          <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>PROVEN IN LIVE PRODUCTION</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">$0.42/MO TOTAL AWS BILL</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Real-World Showcase:{" "}
          <span className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-indigo-600 dark:from-emerald-400 dark:via-cyan-400 dark:to-indigo-400 bg-clip-text text-transparent">
            A Public AI Platform Running for $0.42/mo
          </span>
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
          How the live HIPAA-compliant <strong className="text-slate-900 dark:text-white font-semibold">EHR Annotation Platform</strong> handles
          public clinical file extraction, asynchronous OCR queues, and DynamoDB querying in live production — with{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero fear of bot scrapers or DDoS</span>,{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">$0.00 idle server cost</span>, and{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">a $4.80 max theoretical monthly liability</span>.
        </p>

        {/* Live Status Pill & Repo */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://ehr-backend-frontend.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-sm hover:scale-105 group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live App: ehr-backend-frontend.vercel.app</span>
            <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="https://github.com/harsh-vardhhan/EHR-backend"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#1A1D28] transition-colors shadow-xs"
          >
            <Github className="h-3.5 w-3.5" />
            <span>harsh-vardhhan/EHR-backend</span>
          </a>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="h-4 w-4" />
            <span>Live Monthly Spend</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">$0.42 / mo</div>
          <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
            Across 11 AWS services. Zero idle EC2 servers, zero NAT gateways, scales to absolute zero.
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-cyan-200 dark:border-cyan-900/40 bg-cyan-50/30 dark:bg-cyan-950/10 shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>DDoS Blast Radius</span>
          </div>
          <div className="text-3xl font-extrabold text-cyan-600 dark:text-cyan-400">$4.80 Max</div>
          <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
            Even under a continuous 10M-request bot attack, concurrency caps mathematically prevent bill spikes.
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Terminal className="h-4 w-4" />
            <span>Data Safety</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">0 Replaced</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            100% preservation of DynamoDB tables &amp; S3 ObjectLock compliance buckets with zero data loss.
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="h-4 w-4" />
            <span>Cold Starts</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">&lt;50ms</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Sub-50ms latency via Bun container with direct Function URL ingress ($0 API Gateway fee).
          </div>
        </div>
      </div>

      {/* GitHub Pull Request & Production Rollout Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-lg overflow-hidden mb-10 transition-colors">
        {/* Card Header (GitHub PR Style) */}
        <div className="border-b border-slate-200 dark:border-[#232736] bg-slate-50/70 dark:bg-[#0E1017] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-xs font-semibold border border-purple-200 dark:border-purple-800/40">
              <GitMerge className="h-3.5 w-3.5" />
              <span>Merged</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400">
              <Github className="h-4 w-4 text-slate-700 dark:text-neutral-300" />
              <span>harsh-vardhhan/EHR-backend</span>
              <span className="text-slate-400 dark:text-neutral-600">#227</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1 font-mono text-xs">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+2,655</span>
              <span className="text-rose-600 dark:text-rose-400 font-semibold">-119</span>
              <span className="text-slate-400 dark:text-neutral-500 ml-1.5 hidden sm:inline">&bull; 24 commits</span>
            </div>
            <a
              href="https://github.com/harsh-vardhhan/EHR-backend/pull/227"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#1A1D28] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-300 dark:border-indigo-500/30 transition-colors shadow-xs"
            >
              <span>View PR #227</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* PR Details Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-start gap-2">
              <span>feat(infra): migrate AWS SAM to @syncploy/sdk with golden master CloudFormation parity</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
              Replaced 600+ lines of handwritten AWS SAM YAML (<code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">template.yaml</code>) with pure TypeScript constructs using <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400">@syncploy/sdk</code>. Validated with automated AST cycle detection, zero-replacement diffing, and least-privilege deployment policies.
            </p>
          </div>

          {/* 3-Step Rollout Verification Trace */}
          <div className="pt-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Production Rollout & Verification Trace (PR Series #227 &rarr; #242)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Step 1 */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#1E2433] bg-slate-50/70 dark:bg-[#151823] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold">
                    Step 1 &bull; PR #227
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> IN_SYNC
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  IfC Synthesis & 1:1 Parity
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Migrated all 11 AWS services to in-code constructs. Verified with <code className="text-[10px] font-mono">syncploy diff</code> confirming 0 table or compliance bucket replacements.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#1E2433] bg-slate-50/70 dark:bg-[#151823] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-semibold">
                    Step 2 &bull; PR #235–#239
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Scoped
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Least-Privilege CI/CD Hardening
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Generated exact GitHub Actions deploy policy (<code className="text-[10px] font-mono">syncploy policy</code>) with zero wildcard admin rights, preserving OIDC trust boundaries.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-[#1E2433] bg-slate-50/70 dark:bg-[#151823] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 font-semibold">
                    Step 3 &bull; PR #241–#242
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Live &bull; &lt;50ms
                  </span>
                </div>
                <div className="text-xs font-semibold text-slate-900 dark:text-white">
                  Live Function URL &amp; DoW Capping
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Configured public Function URL ingress with <code className="text-[10px] font-mono">concurrency: 5</code> and SQS DLQ redrive policies. Sub-50ms latency in production with a $0.42/mo real bill.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-[#232736] bg-slate-50/70 dark:bg-[#0E1017] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-neutral-400 text-center sm:text-left">
            <strong className="text-slate-900 dark:text-white font-semibold">Want to inspect the architecture & safety diff?</strong>{" "}
            Explore the 11-service cloud topology, zero-replacement diffs, and least-privilege IAM policies.
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <a
              href="https://ehr-backend-frontend.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <span>Launch Live App</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Link
              href="/docs/ehr-backend-case-study"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Read Full Case Study</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://github.com/harsh-vardhhan/EHR-backend"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#1A1D28] hover:bg-slate-100 dark:hover:bg-[#232736] text-slate-800 dark:text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
