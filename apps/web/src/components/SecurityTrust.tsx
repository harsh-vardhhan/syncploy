"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, Lock, EyeOff, FileCode2, ArrowRight, CheckCircle2 } from "lucide-react";

export function SecurityTrust() {
  const securityPillars = [
    {
      icon: <EyeOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
      title: "100% Offline & Zero Telemetry",
      description:
        "The AST compiler runs in <1ms locally in-memory. Zero outbound network calls, zero analytics trackers, and zero code exfiltration.",
      badge: "Air-Gap Friendly",
    },
    {
      icon: <Lock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
      title: "Zero Lifecycle Scripts",
      description:
        "Packages contain zero postinstall or preinstall hooks. It is physically impossible to execute malicious shell commands on npm install.",
      badge: "Malware Immune",
    },
    {
      icon: <FileCode2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />,
      title: "Vanilla CloudFormation Output",
      description:
        "Syncploy is never an intermediary proxy. Handlers deploy directly to your AWS account. We never touch or intercept your credentials.",
      badge: "Zero Proxying",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
      title: "Official AWS SDKs Only",
      description:
        "@syncploy/sdk depends exclusively on official @aws-sdk/* clients maintained by Amazon. Zero unverified open-source micro-packages.",
      badge: "Enterprise Supply Chain",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-slate-200 dark:border-[#232736]">
      <div className="rounded-2xl border border-slate-200 dark:border-[#232736] bg-gradient-to-b from-slate-50/50 to-white dark:from-[#12141F]/60 dark:to-[#0D0F18]/90 p-8 sm:p-12 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Zero-Trust Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Enterprise Supply-Chain & Privacy Guarantees
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-neutral-400 max-w-2xl">
              We believe cloud tooling should be completely transparent, offline-capable, and safe to execute in strict corporate and sovereign environments.
            </p>
          </div>

          <Link
            href="/docs/security"
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors whitespace-nowrap self-start md:self-auto"
          >
            <span>Read Security Spec</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityPillars.map((pillar, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-slate-200/80 dark:border-[#232736]/80 bg-white dark:bg-[#151824]/60 p-6 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-[#1E2235] inline-flex">
                    {pillar.icon}
                  </div>
                  <span className="text-[11px] font-medium font-mono text-slate-500 dark:text-neutral-400 px-2 py-0.5 rounded bg-slate-100 dark:bg-[#1A1D2B]">
                    {pillar.badge}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-1.5">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
