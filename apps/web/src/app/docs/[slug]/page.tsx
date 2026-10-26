import React from "react";
import { notFound } from "next/navigation";
import { DOCS_DATA } from "@/data/docs";
import Link from "next/link";
import { ChevronRight, ArrowLeft, ArrowRight } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";

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

  // Simple Markdown-to-JSX renderer with full syntax-highlighted CodeBlocks
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
            <div key={`code-${index}`} className="my-6">
              <CodeBlock
                code={codeBuffer.join("\n")}
                language={codeLanguage || "typescript"}
                filename={codeLanguage ? `${codeLanguage}` : undefined}
              />
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
          <h1
            key={`h1-${index}`}
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4"
          >
            {line.replace("# ", "")}
          </h1>
        );
      } else if (line.startsWith("## ")) {
        elements.push(
          <h2
            key={`h2-${index}`}
            className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-10 mb-3 border-b border-border pb-2"
          >
            {line.replace("## ", "")}
          </h2>
        );
      } else if (line.startsWith("### ")) {
        elements.push(
          <h3
            key={`h3-${index}`}
            className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight mt-6 mb-2"
          >
            {line.replace("### ", "")}
          </h3>
        );
      } else if (line.startsWith("- ")) {
        elements.push(
          <li
            key={`li-${index}`}
            className="text-slate-700 dark:text-neutral-300 text-sm sm:text-base ml-4 list-disc mb-1 leading-relaxed"
          >
            {line.replace("- ", "")}
          </li>
        );
      } else if (line.trim().length > 0) {
        elements.push(
          <p
            key={`p-${index}`}
            className="text-slate-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed mb-4"
          >
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
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-neutral-400">
        <Link href="/docs" className="hover:text-slate-900 dark:hover:text-white transition-colors">
          Docs
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span>{doc.category}</span>
        <ChevronRight className="h-3 w-3" />
        <span className="text-slate-900 dark:text-neutral-200 font-medium">{doc.title}</span>
      </nav>

      {/* Main Body */}
      <div className="max-w-none">{renderContent(doc.content)}</div>

      {/* Navigation Footer */}
      <div className="pt-10 border-t border-border flex items-center justify-between gap-4">
        {prevDoc ? (
          <Link
            href={`/docs/${prevDoc.slug}`}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover shadow-sm"
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
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white transition-colors p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover ml-auto shadow-sm"
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
  );
}
