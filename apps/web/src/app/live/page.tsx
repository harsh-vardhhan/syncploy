import React from "react";
import type { Metadata } from "next";
import { ArchitectureCanvas } from "@/components/observability/ArchitectureCanvas";
import {
  ShieldCheck,
  Zap,
  Lock,
  Laptop,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Live Architecture & Observability Console | Syncploy",
  description:
    "Interactive visual architecture and telemetry console for Syncploy's real production EHR backend deployed in AWS ap-south-1 ($0.42/mo cloud spend).",
};

export default function LiveShowcasePage() {
  return (
    <div className="w-full bg-white dark:bg-[#090A0F] text-slate-900 dark:text-white transition-colors duration-200 flex flex-col">
      {/* Hero Explainer Section */}
      <section className="relative border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/60 dark:bg-gradient-to-b dark:from-zinc-900/60 dark:via-zinc-950 dark:to-zinc-950 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                AWS PRODUCTION TOPOLOGY • REGION: ap-south-1
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-mono text-slate-900 dark:text-white mb-3">
                Visual Architecture & Cost Guardrails
              </h1>

              <p className="text-sm sm:text-base text-slate-600 dark:text-zinc-400 leading-relaxed">
                Explore the actual 7-construct serverless topology powering Syncploy&apos;s HIPAA-ready
                clinical document pipeline in AWS. Total current production cloud spend:{" "}
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">$0.42 / month</span> with zero
                idle containers, zero EC2 instances, and zero NAT Gateways.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0">
              <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl font-mono shadow-sm">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">RUNNING REGION</span>
                <span className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ap-south-1
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl font-mono shadow-sm">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">ACTUAL SPEND (MTD)</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  $0.42 / $4.80 cap
                </span>
              </div>

              <div className="bg-white dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 p-3 rounded-xl font-mono col-span-2 sm:col-span-1 lg:col-span-2 shadow-sm">
                <span className="text-[11px] text-slate-400 dark:text-zinc-500 block">SAFETY GUARDRAILS</span>
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Compiler Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Canvas */}
      <section className="w-full bg-slate-50 dark:bg-zinc-950">
        <div className="w-full h-[750px] relative border-b border-slate-200 dark:border-zinc-800">
          <ArchitectureCanvas mode="showcase" />
        </div>
      </section>

      {/* Observability Accuracy & Privacy Transparency Section */}
      <section className="bg-slate-50/50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-zinc-900">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h2 className="text-lg font-bold font-mono text-slate-900 dark:text-white mb-2">
              How Is This Observability Data Served?
            </h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-3xl">
              Syncploy believes in radical transparency. Here is how observability works on this public
              showcase versus the developer desktop console:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-indigo-600 dark:text-indigo-400 font-mono text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                100% Real Architecture
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                The 7 constructs, SQS visibility timeout (180s = 6x worker timeout), Function URL concurrency
                caps, DynamoDB single-table keys, and the $0.42/mo AWS cost are the exact production setup
                deployed in AWS ap-south-1.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-emerald-600 dark:text-emerald-400 font-mono text-sm font-semibold">
                <Lock className="w-4 h-4" />
                Sanitized Public Snapshot
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                The web view displays a production baseline snapshot with masked clinical logs. Unrestricted
                public streaming from AWS is disabled to guarantee zero patient data (PHI) leakage and prevent
                CloudWatch API rate amplification.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-slate-200 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 font-mono text-sm font-semibold">
                <Laptop className="w-4 h-4" />
                Live Streams in Desktop Console
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed mb-3">
                To stream unfiltered live CloudWatch metrics and real-time logs directly to your machine using
                your own local AWS credentials with 0 third-party proxy:
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-black border border-slate-800 text-indigo-300 font-mono text-xs">
                bunx syncploy console
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
