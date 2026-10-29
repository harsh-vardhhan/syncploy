import React from "react";
import { Hero } from "@/components/Hero";
import { DeveloperSleepComparison } from "@/components/DeveloperSleepComparison";
import { AwsCostExplorerMock } from "@/components/AwsCostExplorerMock";
import { DenialOfWalletShowcase } from "@/components/DenialOfWalletShowcase";
import { CaseStudyShowcase } from "@/components/CaseStudyShowcase";
import { Features } from "@/components/Features";
import { BenchmarkComparison } from "@/components/BenchmarkComparison";
import { InteractiveComparison } from "@/components/InteractiveComparison";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Github } from "lucide-react";

export default function Home() {
  return (
    <div className="space-y-8">
      <Hero />
      <DeveloperSleepComparison />
      <AwsCostExplorerMock />
      <DenialOfWalletShowcase />
      <CaseStudyShowcase />
      <Features />
      <BenchmarkComparison />
      <InteractiveComparison />

      {/* Bottom CTA Banner */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="relative rounded-3xl border border-indigo-200 dark:border-indigo-500/30 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 dark:from-indigo-950/40 dark:via-[#12141C] dark:to-[#090A0F] p-8 sm:p-14 overflow-hidden text-center space-y-6 shadow-xl dark:shadow-2xl">
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-96 h-96 bg-indigo-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-xs font-semibold text-indigo-700 dark:text-indigo-400 shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Open Source &bull; MIT Licensed &bull; Zero Vendor Lock-in</span>
          </div>

          <h2 className="text-3xl sm:text-6xl font-black text-slate-900 dark:text-white tracking-tight">
            Stop Paying the PaaS Tax Out of Fear.
          </h2>

          <p className="max-w-2xl mx-auto text-slate-600 dark:text-neutral-300 text-base sm:text-lg leading-relaxed">
            Deploy to native AWS with true scale-to-zero pricing, \$0 gateway fees, and mathematically guaranteed bill ceilings. Sleep through the night.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/docs"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-indigo-600 text-white font-bold shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 transition-all text-base"
            >
              <span>Start Building with Zero-DoW</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://github.com/harsh-vardhhan/syncploy"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] text-slate-800 dark:text-white font-semibold transition-all shadow-sm text-base"
            >
              <Github className="h-4 w-4" />
              <span>Star on GitHub</span>
            </a>
          </div>

          <div className="pt-2 text-xs font-mono text-slate-500 dark:text-neutral-400">
            <span>npm: </span>
            <code className="text-slate-800 dark:text-neutral-200 font-bold">@syncploy/sdk</code>
            <span> &bull; Bun & Node.js Native &bull; Standard CloudFormation Output</span>
          </div>
        </div>
      </section>
    </div>
  );
}
