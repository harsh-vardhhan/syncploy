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
  Server,
  Radio,
  Github,
  GitMerge,
  CheckCircle2,
} from "lucide-react";
import { Mermaid } from "./Mermaid";

export function CaseStudyShowcase() {
  const mermaidChart = `flowchart LR
    subgraph Ingress["1. Ingress & Auth"]
        Client["Clinician Portal"]
        Cognito["Cognito Auth<br/><b>EhrUserPool</b>"]
    end

    subgraph Compute["2. API & Compute"]
        FUrl["Lambda Function URL<br/><b>EhrBackendFunction</b>"]
        KillSwitch["Circuit Breaker<br/><b>KillSwitch Lambda</b>"]
    end

    subgraph Storage["3. Stateful Storage"]
        Dynamo[("DynamoDB<br/><b>EhrTable</b>")]
        S3Docs[("S3 Documents<br/><b>DocumentsBucket</b>")]
    end

    subgraph Pipeline["4. Extraction & AI"]
        SQS["SQS Queue + DLQ<br/><b>AnnotationQueue</b>"]
        Worker["NER Lambda<br/><b>WorkerFunction</b>"]
        SageMaker["AWS SageMaker<br/><b>GLiNER Model</b>"]
    end

    subgraph Vault["5. HIPAA Compliance"]
        Firehose["Kinesis Firehose"]
        S3Audit[("S3 ObjectLock WORM<br/><b>AuditLogsBucket</b>")]
    end

    Client --> Cognito
    Client --> FUrl
    FUrl --> Dynamo
    FUrl --> S3Docs
    S3Docs --> SQS
    SQS --> Worker
    Worker --> SageMaker
    Worker --> Dynamo
    Dynamo --> Firehose
    Firehose --> S3Audit
    FUrl -.->|Alarm >2000/min| KillSwitch
    KillSwitch -.->|Throttle = 0| FUrl`;

  return (
    <section id="showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      {/* Section Header */}
      <div className="text-center space-y-4 mb-14">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/30 text-xs font-semibold text-purple-700 dark:text-purple-300 shadow-sm">
          <Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>PROVEN IN LIVE</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">HIPAA Clinical Pipeline</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Real-World Showcase:{" "}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 dark:from-purple-400 dark:via-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            EHR Annotation Platform Migration
          </span>
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
          How the live HIPAA-compliant <strong className="text-slate-900 dark:text-white font-semibold">EHR Annotation Platform</strong>—a
          clinical extraction and OMOP Common Data Model pipeline—migrated from a 600+ line legacy AWS SAM template to
          Syncploy with <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero downtime</span>,{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero stateful replacements</span>, and{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero data loss</span>.
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
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="h-4 w-4" />
            <span>Scale</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">11 Services</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            DynamoDB, S3, SQS, SNS, Firehose, Cognito, SageMaker, EventBridge, IAM, CloudWatch, Lambda
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Data Safety</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">0 Replaced</div>
          <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
            100% preservation of DynamoDB tables & S3 ObjectLock compliance buckets
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Terminal className="h-4 w-4" />
            <span>Ergonomics</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">45% Less Code</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            600+ lines of brittle SAM YAML macros collapsed into ~300 lines of TypeScript
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="h-4 w-4" />
            <span>Performance</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">&lt;50ms</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Sub-50ms compute latency via Bun/Elysia container with direct Function URL ingress
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
                  Live Function URL Ingress
                </div>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                  Wired public invocation permissions and Elysia environment configs. Verified active compute latency under 50ms with zero downtime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mermaid Architecture Showcase Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-xl overflow-hidden mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-200 dark:border-[#232736] bg-slate-50/80 dark:bg-[#0E1017] px-6 py-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-neutral-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Cloud Architecture Flowchart</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>Stack: ehr-annotation-backend</span>
            <span className="text-slate-400 dark:text-neutral-600">&bull;</span>
            <span className="text-indigo-600 dark:text-indigo-400">AWS ap-south-1</span>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {/* Flowchart */}
          <div className="w-full overflow-x-auto flex justify-center py-2">
            <Mermaid
              chart={mermaidChart}
              className="[&>svg]:w-full [&>svg]:max-w-5xl [&>svg]:min-w-[640px] [&>svg]:h-auto [&>svg]:mx-auto"
            />
          </div>

          {/* 3 Architecture Pillar Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-[#1E2433]">
            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Server className="h-4 w-4 text-indigo-500" />
                <span>Ingress & Compute</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                Elysia.js runtime with native Lambda Function URL, CORS, and container packaging with zero API Gateway overhead.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Database className="h-4 w-4 text-emerald-500" />
                <span>Stateful Storage Safety</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                DynamoDB Single-Table schema (<code className="text-indigo-500 font-mono text-[11px]">EhrTable</code>) & HIPAA WORM S3 audit logs preserved with 0 replacements.
              </p>
            </div>

            <div className="space-y-1.5 p-3 rounded-xl bg-slate-50 dark:bg-[#151823]">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white">
                <Radio className="h-4 w-4 text-amber-500" />
                <span>Event Pipelines & Alarms</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                SQS to SageMaker NER inference, Kinesis Firehose to OMOP data lake, and CloudWatch Metric Math circuit breaker.
              </p>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-[#232736] bg-slate-50/50 dark:bg-[#0E1017] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-neutral-400 text-center sm:text-left">
            <strong className="text-slate-900 dark:text-white font-semibold">Want to see the code & safety diff?</strong>{" "}
            Read the full postmortem on zero-replacement diffs, timeout deadlocks, and least-privilege IAM.
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
