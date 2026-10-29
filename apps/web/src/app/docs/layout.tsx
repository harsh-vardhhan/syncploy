"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_DATA } from "@/data/docs";
import { BookOpen, Shield, Code, Terminal, Layers, ChevronDown, ListFilter, Bot } from "lucide-react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const categories = Array.from(new Set(DOCS_DATA.map((d) => d.category)));
  const currentDoc = DOCS_DATA.find((d) => `/docs/${d.slug}` === pathname) || DOCS_DATA[0];

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Getting Started":
        return <BookOpen className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />;
      case "Core Constructs":
        return <Code className="h-4 w-4 text-cyan-700 dark:text-cyan-400" />;
      case "Compiler & Safety":
        return <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "CLI & Operations":
      case "CLI Reference":
        return <Terminal className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "Case Studies":
        return <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex flex-col lg:flex-row gap-8 justify-between">
      {/* Mobile/Tablet Docs Navigator (visible on < lg) */}
      <div className="lg:hidden w-full">
        <button
          onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
          className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-sm font-medium text-slate-800 dark:text-neutral-200 shadow-sm hover:bg-slate-50 dark:hover:bg-[#1A1D28] transition-colors"
          aria-expanded={mobileDrawerOpen}
          aria-label="Toggle documentation navigation"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <ListFilter className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs text-slate-400 dark:text-neutral-500 shrink-0">Topic:</span>
            <span className="truncate font-semibold text-slate-900 dark:text-white">
              {currentDoc?.title || "Browse Documentation"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 font-semibold shrink-0">
            <span>{mobileDrawerOpen ? "Close" : "Browse (15)"}</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                mobileDrawerOpen ? "rotate-180" : ""
              }`}
            />
          </div>
        </button>

        {mobileDrawerOpen && (
          <div className="mt-2 p-4 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white/95 dark:bg-[#0E1017]/95 backdrop-blur-md shadow-xl max-h-[70vh] overflow-y-auto space-y-6">
            {categories.map((cat) => (
              <div key={cat} className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 px-2">
                  {getCategoryIcon(cat)}
                  <span>{cat}</span>
                </div>
                <ul className="space-y-1">
                  {DOCS_DATA.filter((d) => d.category === cat).map((item) => {
                    const href = `/docs/${item.slug}`;
                    const isActive = pathname === href;
                    return (
                      <li key={item.slug}>
                        <Link
                          href={href}
                          onClick={() => setMobileDrawerOpen(false)}
                          className={`block px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            isActive
                              ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-600 dark:border-indigo-500"
                              : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181B26]"
                          }`}
                        >
                          {item.title}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}

            {/* AI Agent Callout (Mobile) */}
            <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
                <Bot className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span>AI Coding Agents</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
                Using Cursor, Devin, or Claude Code? Ingest our token-optimized docs directly:
              </p>
              <div className="flex items-center gap-2 pt-0.5 font-mono text-[11px]">
                <a
                  href="/llms.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  /llms.txt
                </a>
                <span className="text-slate-400">&bull;</span>
                <a
                  href="/llms-full.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  /llms-full.txt
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Sticky Sidebar (visible on lg+) */}
      <aside className="w-64 shrink-0 hidden lg:block">
        <div className="sticky top-24 space-y-8 pr-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-neutral-400 px-2">
                {getCategoryIcon(cat)}
                <span>{cat}</span>
              </div>
              <ul className="space-y-1">
                {DOCS_DATA.filter((d) => d.category === cat).map((item) => {
                  const href = `/docs/${item.slug}`;
                  const isActive = pathname === href;
                  return (
                    <li key={item.slug}>
                      <Link
                        href={href}
                        className={`block px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-indigo-50 dark:bg-indigo-600/15 text-indigo-700 dark:text-indigo-300 font-semibold border-l-2 border-indigo-600 dark:border-indigo-500"
                            : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#181B26]"
                        }`}
                      >
                        {item.title}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {/* AI Agent Callout (Desktop) */}
          <div className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-500/20 bg-indigo-50/50 dark:bg-indigo-950/20 text-xs space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
              <Bot className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span>AI Coding Agents</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-neutral-400 leading-relaxed">
              Using Cursor, Devin, or Claude Code? Ingest our token-optimized docs directly:
            </p>
            <div className="flex items-center gap-2 pt-0.5 font-mono text-[11px]">
              <a
                href="/llms.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                /llms.txt
              </a>
              <span className="text-slate-400">&bull;</span>
              <a
                href="/llms-full.txt"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                /llms-full.txt
              </a>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 pb-16">{children}</div>
    </div>
  );
}
