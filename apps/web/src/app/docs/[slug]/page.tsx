import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DOCS_DATA } from "@/data/docs";
import Link from "next/link";
import { ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { RuleExplorer } from "@/components/RuleExplorer";
import { DocsTableOfContents } from "@/components/DocsTableOfContents";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = DOCS_DATA.find((d) => d.slug === slug);
  if (!doc) return { title: "Documentation" };
  return {
    title: doc.title,
    description: doc.description,
  };
}

export async function generateStaticParams() {
  return DOCS_DATA.map((d) => ({
    slug: d.slug,
  }));
}

export default async function DocArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const docIndex = DOCS_DATA.findIndex((d) => d.slug === slug);

  if (docIndex === -1) {
    notFound();
  }

  const doc = DOCS_DATA[docIndex]!;
  const prevDoc = docIndex > 0 ? DOCS_DATA[docIndex - 1] : null;
  const nextDoc = docIndex < DOCS_DATA.length - 1 ? DOCS_DATA[docIndex + 1] : null;

  const rawHeadings = doc.content
    .split("\n")
    .filter((l) => l.startsWith("## "))
    .map((l) => {
      const title = l.replace(/^##\s*/, "").trim();
      const id = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      return { title, id };
    });

  const headings =
    slug === "safety-rails"
      ? [
          ...rawHeadings,
          { title: "6. Interactive Rule Explorer", id: "rule-explorer" },
        ]
      : rawHeadings;

  return (
    <div className="flex flex-col xl:flex-row gap-8 w-full">
      <article className="flex-1 min-w-0 max-w-4xl space-y-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
          <Link href="/docs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Docs
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>{doc.category}</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-900 dark:text-neutral-200 font-medium">{doc.title}</span>
        </nav>

        {/* Main Body via MarkdownRenderer */}
        <MarkdownRenderer content={doc.content} />

        {slug === "safety-rails" && (
          <section id="rule-explorer" className="pt-8 border-t border-slate-200 dark:border-slate-800 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Interactive Denial-of-Wallet Rule Explorer
              </h2>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 w-fit">
                LIVE AUDIT CATALOG (26)
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
              Explore, filter, and inspect all compile-time Denial-of-Wallet rules, graph cycle diagnostics, and financial blast-radius limits. Switch between hazardous patterns and safe code remediations.
            </p>
            <RuleExplorer />
          </section>
        )}

        {/* Navigation Footer */}
        <div className="pt-10 border-t border-slate-200 dark:border-[#232736] flex items-center justify-between gap-4">
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors p-3 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] shadow-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              <div className="text-left">
                <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">Previous</div>
                <div className="font-medium text-slate-800 dark:text-neutral-200">{prevDoc.title}</div>
              </div>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors p-3 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] hover:bg-slate-50 dark:hover:bg-[#1A1D28] ml-auto shadow-sm"
            >
              <div className="text-right">
                <div className="text-[10px] text-slate-400 dark:text-neutral-500 uppercase font-semibold">Next</div>
                <div className="font-medium text-slate-800 dark:text-neutral-200">{nextDoc.title}</div>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </article>

      <DocsTableOfContents
        headings={headings}
        isSafetyRails={slug === "safety-rails"}
      />
    </div>
  );
}
