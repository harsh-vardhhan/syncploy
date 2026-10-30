import React from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArchitectureCanvas } from "@/components/observability/ArchitectureCanvas";
import {
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Terminal,
  CheckCircle2,
  ExternalLink,
  Laptop,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Live Architecture & Observability Console | Syncploy",
  description:
    "Interactive visual architecture and live CloudWatch telemetry for Syncploy's real production EHR backend deployed in AWS ap-south-1 ($0.42/mo cloud spend).",
};

export default function LiveShowcasePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <Header />

      {/* Hero Explainer Section */}
      <section className="relative border-b border-zinc-800 bg-gradient-to-b from-zinc-900/80 via-zinc-950 to-zinc-950 px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-medium mb-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                LIVE AWS PRODUCTION TELEMETRY • REGION: ap-south-1
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight font-mono text-white mb-3">
                Real-Time Architecture & Cost Guardrails
              </h1>

              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
                Inspect the actual 7-construct serverless topology powering Syncploy&apos;s HIPAA-ready
                clinical document pipeline in AWS. Total current monthly cloud bill:{" "}
                <span className="text-emerald-400 font-mono font-semibold">$0.42 / month</span> with zero
                idle containers, zero EC2 instances, and zero NAT Gateways.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-3 shrink-0">
              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl font-mono">
                <span className="text-[11px] text-zinc-500 block">RUNNING REGION</span>
                <span className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  ap-south-1
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl font-mono">
                <span className="text-[11px] text-zinc-500 block">CURRENT SPEND (MTD)</span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block">
                  $0.42 / $4.80 cap
                </span>
              </div>

              <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-xl font-mono col-span-2 sm:col-span-1 lg:col-span-2">
                <span className="text-[11px] text-zinc-500 block">SAFETY GUARDRAILS</span>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  100% Compiler Enforced
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Interactive Canvas */}
      <main className="flex-1 w-full bg-zinc-950">
        <div className="w-full h-[750px] relative border-b border-zinc-800">
          <ArchitectureCanvas mode="showcase" />
        </div>
      </main>

      {/* In-Depth Guardrails & Case Study Links */}
      <section className="bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 mb-2 text-indigo-400 font-mono text-sm font-semibold">
                <ShieldCheck className="w-4 h-4" />
                No Cloud Relay Liability
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                When using the Syncploy Desktop Console, telemetry streams straight from your local
                AWS credentials to localhost. Your logs, patient records, and credentials never touch
                our servers.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 mb-2 text-emerald-400 font-mono text-sm font-semibold">
                <Zap className="w-4 h-4" />
                Zero Gatekeeper Overhead
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Ingress uses native public Function URLs capped to 2 parallel executions. Maximum
                theoretical DDoS liability is strictly bounded to $2.16/mo before billing alarms fire.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/80">
              <div className="flex items-center gap-2 mb-2 text-purple-400 font-mono text-sm font-semibold">
                <Laptop className="w-4 h-4" />
                Run Locally on Your Machine
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                Run the exact same console on your local workspace:
              </p>
              <div className="px-3 py-1.5 rounded-lg bg-black border border-zinc-800 font-mono text-xs text-zinc-300">
                bunx syncploy console
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
