import React from "react";
import { Hero } from "@/components/Hero";
import { AgentWorkflow } from "@/components/AgentWorkflow";
import { Features } from "@/components/Features";
import { SecurityTrust } from "@/components/SecurityTrust";
import { CaseStudyShowcase } from "@/components/CaseStudyShowcase";
import { BenchmarkComparison } from "@/components/BenchmarkComparison";

export default function Home() {
  return (
    <div className="space-y-12 pb-16">
      <Hero />
      <AgentWorkflow />
      <Features />
      <SecurityTrust />
      <CaseStudyShowcase />
      <BenchmarkComparison />
    </div>
  );
}
