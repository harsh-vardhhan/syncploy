import React from "react";
import { notFound } from "next/navigation";
import { DOCS_DATA } from "@/data/docs";
import Link from "next/link";
import { ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
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

  // Simple Markdown-to-JSX renderer for titles, code blocks, lists, and paragraphs
  const renderContent = (content: string) => {
    const lines = content.trim().split("\n");
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeLanguage = "";
    let codeBuffer: string[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith("```")) {
        if (inCodeBlock) {
          // Closing code block
          elements.push(
            <div key={`code-${index}`} className="my-6 rounded-xl border border-border bg-[#0b0d14] overflow-hidden shadow-lg">
              {codeLanguage && (
                <div className="px-4 py-1.5 border-b border-border/50 bg-background/50 text-[11px] font-mono text-neutral-400">
                  {codeLanguage}
                </div>
              )}
              <pre className="p-4 text-xs sm:text-sm font-mono text-neutral-200 overflow-x-auto leading-relaxed">
                <code>{codeBuffer.join("\n")}</code>
              </pre>
            </div>
          );
          codeBuffer = [];
          inCodeBlock = false;
        } else {
          // Opening code block
          inCodeBlock = true;
          codeLanguage = line.replace("```", "").trim();
        }
        return;
      }

      if (inCodeBlock) {
        codeBuffer.push(line);
        return;
      }

      if (line.startsWith("# ")) {
        elements.push(
          <h1 key={`h1-${index}`} className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4">
            {line.replace("# ", "")}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2 key={`h2-${index}`} className="text-2xl font-bold text-white tracking-tight mt-10 mb-3 border-b border-border/40 pb-2">
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3 key={`h3-${index}`} className="text-lg font-semibold text-white tracking-tight mt-6 mb-2">
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li key={`li-${index}`} className="text-neutral-300 text-sm sm:text-base ml-4 list-disc mb-1 leading-relaxed">
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.trim().length > 0) {
        elements.push(
          <p key={`p-${index}`} className="text-neutral-300 text-sm sm:text-base leading-relaxed mb-4">
            {line}
          </p>
        );
      }
    });

    return elements;
  };

  return (
    <article className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-medium text-neutral-400">
        <Link href="/docs" className="hover:text-white transition-colors">
          Docs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{doc.category}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-neutral-200">{doc.title}</span>
      </nav>

      {/* Main Body */}
      <div className="prose prose-invert max-w-none">{renderContent(doc.content)}</div>

      {/* Navigation Footer */}
      <div className="pt-10 border-t border-border/60 flex items-center justify-between gap-4">
        {prevDoc ? (
          <Link
            href={`/docs/${prevDoc.slug}`}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            <div className="text-left">
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">Previous</div>
              <div>{prevDoc.title}</div>
            </div>
          </Link>
        ) : (
          <div />
        )}

        {nextDoc ? (
          <Link
            href={`/docs/${nextDoc.slug}`}
            className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors p-3 rounded-lg border border-border bg-surface/50 hover:bg-surface-hover ml-auto"
          >
            <div className="text-right">
              <div className="text-[10px] text-neutral-500 uppercase font-semibold">Next</div>
              <div>{nextDoc.title}</div>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
