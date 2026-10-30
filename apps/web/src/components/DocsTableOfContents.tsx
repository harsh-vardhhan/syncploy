"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  List,
  Search,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { RULES_CATALOG, RuleDefinition, RuleLayer } from "@/data/rules-catalog";

interface HeadingItem {
  id: string;
  title: string;
}

interface DocsTableOfContentsProps {
  headings: HeadingItem[];
  isSafetyRails?: boolean;
}

export function DocsTableOfContents({
  headings,
  isSafetyRails = false,
}: DocsTableOfContentsProps) {
  const [activeHeadingId, setActiveHeadingId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLayer, setSelectedLayer] = useState<string>("all");
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Scroll spy for headings
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      for (let i = headings.length - 1; i >= 0; i--) {
        const h = headings[i]!;
        const el = document.getElementById(h.id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveHeadingId(h.id);
          return;
        }
      }
      if (headings[0]) {
        setActiveHeadingId(headings[0].id);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [headings]);

  const allRules = useMemo(() => Object.values(RULES_CATALOG), []);

  const filteredRules = useMemo(() => {
    return allRules.filter((r) => {
      if (selectedLayer !== "all" && r.layer !== selectedLayer) return false;
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        return (
          r.id.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q) ||
          r.service.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allRules, selectedLayer, searchQuery]);

  const handleRuleClick = (anchor: string) => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("syncploy:navigate-rule", { detail: { anchor } })
      );
    }

    setTimeout(() => {
      const el = document.getElementById(anchor);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${anchor}`);

        // Temporary pulse animation
        el.classList.add("ring-2", "ring-indigo-500", "dark:ring-indigo-400");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-indigo-500", "dark:ring-indigo-400");
        }, 2000);
      } else {
        const explorer = document.getElementById("rule-explorer");
        if (explorer) {
          explorer.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }, 60);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Mobile/Tablet Floating Rule Jump Bar (visible on < xl for safety-rails) */}
      {isSafetyRails && (
        <div className="xl:hidden w-full mb-6 sticky top-20 z-20">
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            className="w-full flex items-center justify-between p-3 rounded-xl border border-indigo-200 dark:border-indigo-500/30 bg-white/95 dark:bg-[#12141C]/95 backdrop-blur-md shadow-md text-xs font-semibold text-slate-800 dark:text-neutral-200"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              <span>Jump to Rule ({allRules.length} Catalog Rules)</span>
            </div>
            <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-bold">
              <span>{mobileDrawerOpen ? "Close" : "Navigate"}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  mobileDrawerOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </button>

          {mobileDrawerOpen && (
            <div className="mt-2 p-4 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#0E1017] shadow-xl max-h-[60vh] overflow-y-auto space-y-4">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter 26 rules (e.g. SQS, scan, loop)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                {filteredRules.map((rule) => (
                  <button
                    key={rule.id}
                    onClick={() => handleRuleClick(rule.docsAnchor)}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {rule.id}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 truncate">
                        {rule.title}
                      </div>
                    </div>
                    {rule.severity === "error" && (
                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                    {rule.severity === "warning" && (
                      <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
                    )}
                    {rule.severity === "advisory" && (
                      <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Desktop Sticky Right Sidebar (visible on xl+) */}
      <aside className="w-72 shrink-0 hidden xl:block self-stretch">
        <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2 pb-12">
          {/* Section 1: On this page (hidden on safety-rails for clean rule-first sidebar) */}
          {!isSafetyRails && headings.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-neutral-500">
                <List className="h-3.5 w-3.5" />
                <span>On this page</span>
              </div>
              <ul className="space-y-1 border-l border-slate-200 dark:border-[#232736]">
                {headings.map((h) => {
                  const isActive = activeHeadingId === h.id;
                  return (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        onClick={(e) => {
                          e.preventDefault();
                          const el = document.getElementById(h.id);
                          if (el) {
                            el.scrollIntoView({ behavior: "smooth", block: "start" });
                            window.history.replaceState(null, "", `#${h.id}`);
                            setActiveHeadingId(h.id);
                          }
                        }}
                        className={`block text-xs py-1 pl-3 -ml-px border-l-2 transition-colors ${
                          isActive
                            ? "border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-400 font-semibold"
                            : "border-transparent text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
                        }`}
                      >
                        {h.title}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Section 2: Safety Rules Quick Navigator (for safety-rails) */}
          {isSafetyRails && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-neutral-400">
                  <ShieldAlert className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Rule Directory</span>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20">
                  {filteredRules.length} / {allRules.length}
                </span>
              </div>

              {/* Quick Search */}
              <div className="relative">
                <Search className="h-3 w-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter rules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-7 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#12141C] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* Layer Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {[
                  { id: "all", label: "All" },
                  { id: "compute", label: "Compute" },
                  { id: "recursion", label: "Recursion" },
                  { id: "storage", label: "Storage" },
                  { id: "governance", label: "Gov" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedLayer(tab.id)}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                      selectedLayer === tab.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Scrollable Compact Rules List with dynamic viewport height */}
              <div className="space-y-1 max-h-[calc(100vh-15rem)] overflow-y-auto pr-1">
                {filteredRules.map((rule) => {
                  const dotColor =
                    rule.severity === "error"
                      ? "bg-rose-500"
                      : rule.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-sky-500";

                  return (
                    <button
                      key={rule.id}
                      onClick={() => handleRuleClick(rule.docsAnchor)}
                      className="w-full text-left p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-[#161924] transition-colors group flex items-start gap-2"
                      title={`${rule.title} (${rule.service})`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${dotColor} shrink-0 mt-1.5`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                          {rule.id}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-neutral-400 truncate">
                          {rule.title}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#12141C] text-[11px] text-slate-500 dark:text-neutral-400 flex items-center justify-between">
                <span>Legend:</span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" /> Error
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-1" /> Warn
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-500 ml-1" /> Auto
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
