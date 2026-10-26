"use client";

import React, { useState } from "react";
import { Check, Copy, FileCode, Terminal } from "lucide-react";
import { highlightCode } from "@/lib/highlighter";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  badge?: string;
  badgeColor?: "indigo" | "cyan" | "emerald" | "amber" | "red";
  className?: string;
  showLineNumbers?: boolean;
}

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  badge,
  badgeColor = "indigo",
  className = "",
  showLineNumbers = false,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const cleanCode = code.trim();
  const highlighted = highlightCode(cleanCode, language);

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const badgeStyles = {
    indigo:
      "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20",
    cyan: "text-cyan-700 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20",
    emerald:
      "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20",
    amber:
      "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20",
    red: "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20",
  }[badgeColor];

  return (
    <div
      className={`rounded-xl border border-slate-200 dark:border-[#232736] bg-[#f8fafc] dark:bg-[#0B0E17] overflow-hidden shadow-sm dark:shadow-2xl transition-colors ${className}`}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200 dark:border-[#1E2433] bg-slate-100/80 dark:bg-[#121624]">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400">
          {language === "bash" || language === "sh" ? (
            <Terminal className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
          ) : (
            <FileCode className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          )}
          <span className="font-medium text-slate-800 dark:text-neutral-300">
            {filename || (language ? `${language}` : "code")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${badgeStyles}`}
            >
              {badge}
            </span>
          )}

          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium text-slate-500 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors"
            title="Copy code"
            aria-label="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-[11px]">Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      <div className="overflow-x-auto p-4 sm:p-5 text-xs sm:text-sm font-mono leading-relaxed selection:bg-indigo-500/20">
        {showLineNumbers ? (
          <div className="table w-full">
            {cleanCode.split("\n").map((_, i) => (
              <div key={i} className="table-row">
                <span className="table-cell select-none pr-4 text-right text-xs text-slate-400 dark:text-neutral-600 w-8">
                  {i + 1}
                </span>
                <span className="table-cell">
                  {/* render line */}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <pre className="text-slate-900 dark:text-neutral-200">
            <code
              className={`language-${language}`}
              dangerouslySetInnerHTML={{ __html: highlighted }}
            />
          </pre>
        )}
      </div>
    </div>
  );
}
