import React from "react";
import { Check, X, Minus } from "lucide-react";

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
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-400">
          <Check className="h-4 w-4" />
        </span>
      );
    }
    if (val === false) {
      return (
        <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-neutral-800 text-neutral-500">
          <X className="h-4 w-4" />
        </span>
      );
    }
    return <span className="text-xs font-mono text-neutral-400">{val}</span>;
  };

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-border/40">
      <div className="text-center space-y-3 mb-12">
        <h2 className="text-3xl font-bold text-white tracking-tight">How Syncploy Compares</h2>
        <p className="text-neutral-400 max-w-xl mx-auto text-sm sm:text-base">
          Engineered to give TypeScript teams the safety of a compiler with the freedom of 100% native AWS CloudFormation export.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface/60">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/60">
              <th className="py-4 px-6 text-neutral-300 font-semibold">Capability</th>
              <th className="py-4 px-6 text-indigo-400 font-bold bg-indigo-500/5">Syncploy</th>
              <th className="py-4 px-6 text-neutral-400 font-medium">AWS CDK</th>
              <th className="py-4 px-6 text-neutral-400 font-medium">SST</th>
              <th className="py-4 px-6 text-neutral-400 font-medium">Encore (Go)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                <td className="py-4 px-6 font-medium text-neutral-200">{row.feature}</td>
                <td className="py-4 px-6 bg-indigo-500/5 font-semibold">{renderIcon(row.syncploy)}</td>
                <td className="py-4 px-6">{renderIcon(row.cdk)}</td>
                <td className="py-4 px-6">{renderIcon(row.sst)}</td>
                <td className="py-4 px-6">{renderIcon(row.encore)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
