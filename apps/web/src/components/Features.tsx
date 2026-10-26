import React from "react";
import {
  ShieldAlert,
  ServerOff,
  GitCompare,
  FileCheck,
  Flame,
  KeyRound,
  Boxes,
  Zap,
} from "lucide-react";

export function Features() {
  const features = [
    {
      icon: <ServerOff className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
      title: "Pure AWS Serverless",
      description:
        "Scale-to-zero compute and storage. First-class constructs for Lambda Function URLs, DynamoDB Single-Table, S3, SQS, SNS, Firehose, and Cognito with zero idle costs.",
    },
    {
      icon: <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-red-400" />,
      title: "Compile-Time Recursion Shield",
      description:
        "Statically maps database and queue mutations from AST. Detects direct and multi-hop infinite loops before code is pushed to AWS, halting exponential cloud bill runaway.",
    },
    {
      icon: <GitCompare className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />,
      title: "0-Replacement Brownfield Diff",
      description:
        "Pre-flight diff engine matches existing SAM/CloudFormation stacks line-by-line. Flags destructive stateful replacements to ensure zero data-loss migrations.",
    },
    {
      icon: <FileCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
      title: "Least-Privilege Policy Generator",
      description:
        "Syncploy synthesizes minimal IAM deployment policies for GitHub Actions runners. Prunes dead services and scopes wildcards down to exact stack ARNs.",
    },
    {
      icon: <KeyRound className="h-6 w-6 text-amber-600 dark:text-amber-400" />,
      title: "Enterprise Security Defaults",
      description:
        "Bank-grade security out of the box: immutable S3 ObjectLock audit trails, strict Cognito password policies, and zero public bucket exposures.",
    },
    {
      icon: <Boxes className="h-6 w-6 text-purple-600 dark:text-purple-400" />,
      title: "ElectroDB First-Class Integration",
      description:
        "Infers Single-Table primary keys and unions GSIs automatically across ElectroDB entities without requiring duplicate manual table schema declarations.",
    },
    {
      icon: <Flame className="h-6 w-6 text-orange-600 dark:text-rose-400" />,
      title: "Denial-of-Wallet (DoW) Safety",
      description:
        "Static audits enforce reserved concurrency caps on public URLs and stream consumers, and validates that SQS visibilityTimeout is at least 6x consumer timeout.",
    },
    {
      icon: <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
      title: "Container & ESM Packaging",
      description:
        "Compile Lambda functions as ultra-fast esbuild ESM bundles or native Docker container images without changing a single line of application logic.",
    },
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      <div className="text-center space-y-3 mb-16">
        <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
          Engineered for Bulletproof Production
        </h2>
        <p className="text-slate-600 dark:text-neutral-400 max-w-2xl mx-auto text-base">
          Everything you need to author, validate, and operate enterprise-grade serverless architectures without infrastructure toil.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((f, i) => (
          <div
            key={i}
            className="p-6 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] hover:border-indigo-500/40 transition-all group flex flex-col justify-between shadow-sm"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#090A0F] border border-slate-200 dark:border-[#232736] group-hover:scale-105 transition-transform mb-4">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">{f.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
