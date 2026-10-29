import React from "react";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { CaseStudyShowcase } from "@/components/CaseStudyShowcase";
import { BenchmarkComparison } from "@/components/BenchmarkComparison";

export default function Home() {
  return (
    <div className="space-y-12 pb-16">
      <Hero />
      <Features />
      <CaseStudyShowcase />
      <BenchmarkComparison />
    </div>
  );
}
