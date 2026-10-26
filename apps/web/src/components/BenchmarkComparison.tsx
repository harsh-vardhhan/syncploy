import React from "react";
import { Check, X } from "lucide-react";

export function BenchmarkComparison() {
  const rows = [
    {
      feature: "Pure AWS Serverless Focus",
      syncploy: true,
      cdk: "mixed",
      sst: "mixed",
      serverlessFramework: "mixed",
      encore: "mixed",
    },
    {
      feature: "Compile-Time Recursion Cycle Detection",
      syncploy: true,
      cdk: false,
      sst: false,
      serverlessFramework: false,
      encore: false,
    },
    {
      feature: "Zero-Replacement Brownfield Diff",
      syncploy: true,
      cdk: false,
      sst: false,
      serverlessFramework: false,
      encore: false,
    },
    {
      feature: "Automatic IAM Deploy Policy Synthesis",
      syncploy: true,
      cdk: false,
      sst: false,
      serverlessFramework: false,
      encore: false,
    },
    {
      feature: "1:1 Standard CloudFormation Export",
      syncploy: true,
      cdk: true,
      sst: "Pulumi/CFN",
      serverlessFramework: true,
      encore: false,
    },
    {
      feature: "TypeScript Native (No Go / Rust runtime required)",
      syncploy: true,
      cdk: true,
      sst: true,
      serverlessFramework: true,
      encore: false,
    },
    {
      feature: "Denial-of-Wallet (DoW) Concurrency Auditing",
      syncploy: true,
      cdk: false,
      sst: false,
      serverlessFramework: false,
      encore: false,
    },
  ];

  const renderIcon = (val: boolean | string) => {
    if (val === true) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          <Check className="h-4 w-4" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-slate-100 dark:bg-[#1F2433] text-slate-400 dark:text-neutral-500">
          <X className="h-4 w-4" />
        </span>
      );
    }
    return <span className="text-xs font-mono text-slate-600 dark:text-neutral-400">{val}</span>;
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">How Syncploy Compares</h2>
        <p className="text-slate-600 dark:text-neutral-400 max-w-xl mx-auto text-sm sm:text-base">
          Engineered to give TypeScript teams the safety of a compiler with the freedom of 100% native AWS CloudFormation export.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-[#232736] bg-slate-100 dark:bg-[#161922] text-slate-900 dark:text-white">
              <th className="p-4 font-semibold">Architectural Capability</th>
              <th className="p-4 font-semibold text-indigo-600 dark:text-indigo-400">Syncploy</th>
              <th className="p-4 font-medium text-slate-600 dark:text-neutral-400">AWS CDK</th>
              <th className="p-4 font-medium text-slate-600 dark:text-neutral-400">SST (Ion)</th>
              <th className="p-4 font-medium text-slate-600 dark:text-neutral-400">Encore (Go)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-[#232736]">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-50 dark:hover:bg-[#181B26] transition-colors">
                <td className="p-4 font-medium text-slate-800 dark:text-neutral-200">{row.feature}</td>
                <td className="p-4 font-semibold bg-indigo-50/70 dark:bg-indigo-500/10">{renderIcon(row.syncploy)}</td>
                <td className="p-4">{renderIcon(row.cdk)}</td>
                <td className="p-4">{renderIcon(row.sst)}</td>
                <td className="p-4">{renderIcon(row.encore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
