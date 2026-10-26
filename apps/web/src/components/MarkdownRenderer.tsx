"use client";

import React from "react";
import { CodeBlock } from "./CodeBlock";
import { Mermaid } from "./Mermaid";
import { Info, AlertTriangle, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
}

function formatInline(text: string): string {
  return text
    .replace(
      /`([^`]+)`/g,
      '<code class="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#1A1D28] text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-[#232736] font-medium">$1</code>'
    )
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-indigo-600 dark:text-indigo-400 font-medium underline underline-offset-2 hover:brightness-110">$1</a>'
    );
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const lines = content.trim().split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;

    // 1. Code Blocks: ```language
    if (line.startsWith("```")) {
      const language = line.replace("```", "").trim();
      const codeBuffer: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.startsWith("```")) {
        codeBuffer.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```

      if (language === "mermaid") {
        elements.push(
          <div
            key={`mermaid-${i}`}
            className="my-8 rounded-2xl border border-slate-200 dark:border-[#232736] bg-slate-50/70 dark:bg-[#0E1017] p-4 sm:p-6 shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E2433] pb-3 mb-4 text-xs font-mono text-slate-500 dark:text-neutral-400">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-neutral-200">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                Architecture Diagram
              </span>
              <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Mermaid Live Flow</span>
            </div>
            <Mermaid chart={codeBuffer.join("\n")} className="[&>svg]:w-full [&>svg]:max-w-4xl [&>svg]:min-w-[600px] [&>svg]:h-auto [&>svg]:mx-auto" />
          </div>
        );
        continue;
      }

      elements.push(
        <div key={`code-${i}`} className="my-6">
          <CodeBlock
            code={codeBuffer.join("\n")}
            language={language || "typescript"}
            filename={language ? `${language}` : undefined}
          />
        </div>
      );
      continue;
    }

    // 2. Alert / Callout Blocks: > [!NOTE] or > [!WARNING] or > [!TIP] or > [!IMPORTANT]
    if (line.startsWith("> ")) {
      const alertLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) {
        alertLines.push(lines[i]!.replace(/^>\s?/, ""));
        i++;
      }
      const fullText = alertLines.join(" ").trim();
      let alertType: "note" | "warning" | "tip" | "important" = "note";
      let bodyText = fullText;

      if (fullText.startsWith("[!WARNING]")) {
        alertType = "warning";
        bodyText = fullText.replace("[!WARNING]", "").trim();
      } else if (fullText.startsWith("[!TIP]")) {
        alertType = "tip";
        bodyText = fullText.replace("[!TIP]", "").trim();
      } else if (fullText.startsWith("[!IMPORTANT]")) {
        alertType = "important";
        bodyText = fullText.replace("[!IMPORTANT]", "").trim();
      } else if (fullText.startsWith("[!NOTE]")) {
        alertType = "note";
        bodyText = fullText.replace("[!NOTE]", "").trim();
      }

      const alertConfig = {
        note: {
          bg: "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-900 dark:text-blue-200",
          icon: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />,
          title: "Note",
        },
        tip: {
          bg: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200",
          icon: <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />,
          title: "Pro Tip",
        },
        warning: {
          bg: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-200",
          icon: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />,
          title: "Warning",
        },
        important: {
          bg: "bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/40 text-indigo-900 dark:text-indigo-200",
          icon: <ShieldAlert className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />,
          title: "Important",
        },
      }[alertType];

      elements.push(
        <div
          key={`alert-${i}`}
          className={`my-6 p-4 rounded-xl border flex items-start gap-3.5 shadow-sm ${alertConfig.bg}`}
        >
          {alertConfig.icon}
          <div className="flex-1 text-sm leading-relaxed">
            <span className="font-semibold block mb-0.5 text-xs uppercase tracking-wider">
              {alertConfig.title}
            </span>
            <div dangerouslySetInnerHTML={{ __html: formatInline(bodyText) }} />
          </div>
        </div>
      );
      continue;
    }

    // 3. Tables: lines starting with |
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        tableLines.push(lines[i]!);
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0]!
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);

        const bodyRows = tableLines.slice(2).map((r) =>
          r
            .split("|")
            .map((c) => c.trim())
            .filter((c, idx, arr) => (idx > 0 && idx < arr.length - 1) || c.length > 0)
        );

        elements.push(
          <div
            key={`table-${i}`}
            className="overflow-x-auto my-6 rounded-xl border border-slate-200 dark:border-[#232736] shadow-sm bg-white dark:bg-[#12141C]"
          >
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 dark:bg-[#161922] border-b border-slate-200 dark:border-[#232736] text-slate-900 dark:text-white">
                  {headerRow.map((h, hIdx) => (
                    <th key={hIdx} className="p-3.5 font-semibold text-xs uppercase tracking-wider font-mono">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-[#232736]">
                {bodyRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-[#181B26] transition-colors">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className="p-3.5 text-slate-700 dark:text-neutral-300 text-xs sm:text-sm"
                        dangerouslySetInnerHTML={{ __html: formatInline(cell) }}
                      />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // 4. Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4"
        >
          {line.replace("# ", "")}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight mt-10 mb-3 border-b border-slate-200 dark:border-[#232736] pb-2"
        >
          {line.replace("## ", "")}
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-lg font-semibold text-slate-900 dark:text-white tracking-tight mt-6 mb-2"
        >
          {line.replace("### ", "")}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("#### ")) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-base font-semibold text-slate-900 dark:text-white tracking-tight mt-4 mb-1"
        >
          {line.replace("#### ", "")}
        </h4>
      );
      i++;
      continue;
    }

    // 5. Bullet Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i]!.startsWith("- ") || lines[i]!.startsWith("* "))) {
        listItems.push(lines[i]!.replace(/^[-*]\s/, ""));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-3 ml-4 list-disc text-slate-700 dark:text-neutral-300">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="text-sm sm:text-base leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatInline(item) }}
            />
          ))}
        </ul>
      );
      continue;
    }

    // 6. Numbered Lists
    if (/^\d+\.\s/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        listItems.push(lines[i]!.replace(/^\d+\.\s/, ""));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="space-y-2 my-4 ml-5 list-decimal text-slate-700 dark:text-neutral-300 font-medium"
        >
          {listItems.map((item, idx) => (
            <li
              key={idx}
              className="text-sm sm:text-base leading-relaxed pl-1"
              dangerouslySetInnerHTML={{ __html: formatInline(item) }}
            />
          ))}
        </ol>
      );
      continue;
    }

    // 7. Paragraphs
    if (line.trim().length > 0) {
      elements.push(
        <p
          key={`p-${i}`}
          className="text-slate-700 dark:text-neutral-300 text-sm sm:text-base leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    }

    i++;
  }

  return <div className="space-y-2 max-w-none">{elements}</div>;
}
