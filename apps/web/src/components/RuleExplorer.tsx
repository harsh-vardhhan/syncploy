"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  Search,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Layers,
  DollarSign,
} from "lucide-react";
import { RULES_CATALOG, RuleDefinition, RuleLayer } from "../data/rules-catalog";

const LAYER_CONFIG: Record<
  RuleLayer,
  { name: string; icon: string; description: string; color: string }
> = {
  compute: {
    name: "Layer 1: Compute Blast Radius",
    icon: "⚡",
    description: "Lambda concurrency limits, Function URLs, and DDoS containment",
    color: "from-rose-500/10 to-orange-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400",
  },
  recursion: {
    name: "Layer 2: Recursion & Poison-Pills",
    icon: "🔄",
    description: "Infinite loop prevention, DynamoDB scans, and SQS timeout safety",
    color: "from-purple-500/10 to-indigo-500/10 border-purple-500/20 text-purple-600 dark:text-purple-400",
  },
  storage: {
    name: "Layer 3: Storage & Log Leaks",
    icon: "🗄️",
    description: "Automatic 14-day CloudWatch log rotation and S3 multipart aborts",
    color: "from-blue-500/10 to-cyan-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400",
  },
  governance: {
    name: "Layer 4: Financial Governance & Fraud",
    icon: "🛡️",
    description: "AWS Budgets ceilings, SMS toll fraud shields, and zero data-loss diffs",
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  security: {
    name: "Security & Construct Integrity",
    icon: "🔒",
    description: "Secret leak protection and alphanumeric CloudFormation logical IDs",
    color: "from-amber-500/10 to-yellow-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
  },
};

export function RuleExplorer() {
  const [selectedLayer, setSelectedLayer] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTabs, setActiveTabs] = useState<Record<string, "bad" | "good">>({});
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Listen for sidebar rule navigation to ensure target rule is not filtered out
  useEffect(() => {
    const handleNavigate = () => {
      setSelectedLayer("all");
      setSelectedSeverity("all");
      setSearchQuery("");
    };
    window.addEventListener("syncploy:navigate-rule", handleNavigate);
    return () => window.removeEventListener("syncploy:navigate-rule", handleNavigate);
  }, []);

  // Handle direct hash navigation on initial page load
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const hash = window.location.hash.replace("#", "");
      if (hash && hash !== "rule-explorer") {
        setTimeout(() => {
          const el = document.getElementById(hash);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            el.classList.add("ring-2", "ring-indigo-500", "dark:ring-indigo-400");
            setTimeout(() => {
              el.classList.remove("ring-2", "ring-indigo-500", "dark:ring-indigo-400");
            }, 2000);
          }
        }, 300);
      }
    }
  }, []);

  const allRules = useMemo(() => Object.values(RULES_CATALOG), []);

  const filteredRules = useMemo(() => {
    return allRules.filter((rule) => {
      if (selectedLayer !== "all" && rule.layer !== selectedLayer) return false;
      if (selectedSeverity !== "all" && rule.severity !== selectedSeverity) return false;
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesId = rule.id.toLowerCase().includes(query);
        const matchesTitle = rule.title.toLowerCase().includes(query);
        const matchesSummary = rule.summary.toLowerCase().includes(query);
        const matchesService = rule.service.toLowerCase().includes(query);
        const matchesRisk = rule.financialRisk.toLowerCase().includes(query);
        if (!matchesId && !matchesTitle && !matchesSummary && !matchesService && !matchesRisk) {
          return false;
        }
      }
      return true;
    });
  }, [allRules, selectedLayer, selectedSeverity, searchQuery]);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const countsByLayer = useMemo(() => {
    const counts: Record<string, number> = { all: allRules.length };
    for (const rule of allRules) {
      counts[rule.layer] = (counts[rule.layer] || 0) + 1;
    }
    return counts;
  }, [allRules]);

  return (
    <div className="w-full my-8 space-y-6">
      {/* Control Panel: Search & Filters */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-900/40 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by rule code (e.g. SCAN, CONCURRENCY), service, or financial risk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>

          {/* Severity Dropdown */}
          <div className="w-full sm:w-auto flex items-center gap-2">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 text-slate-900 dark:text-slate-100 font-medium cursor-pointer"
            >
              <option value="all">All Severities ({allRules.length})</option>
              <option value="error">🔴 Fatal Errors Only</option>
              <option value="warning">🟡 Financial Warnings Only</option>
              <option value="advisory">🔵 Auto-Synthesized Guards Only</option>
            </select>
          </div>
        </div>

        {/* Layer Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
          <button
            onClick={() => setSelectedLayer("all")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedLayer === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            All Layers ({countsByLayer.all || 0})
          </button>
          {(Object.keys(LAYER_CONFIG) as RuleLayer[]).map((layer) => {
            const count = countsByLayer[layer] || 0;
            if (count === 0) return null;
            const config = LAYER_CONFIG[layer];
            return (
              <button
                key={layer}
                onClick={() => setSelectedLayer(layer)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  selectedLayer === layer
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.name.split(":")[1]?.trim() || config.name}</span>
                <span className="opacity-70 text-[11px]">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Rules Count & Stats */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
        <span>
          Showing <strong className="text-slate-900 dark:text-slate-200">{filteredRules.length}</strong> of{" "}
          {allRules.length} cloud safety &amp; budget rules
        </span>
        <span className="hidden sm:inline">Compiled & enforced deterministically in &lt;1ms</span>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filteredRules.map((rule) => {
          const tab = activeTabs[rule.id] || "bad";
          const layerConfig = LAYER_CONFIG[rule.layer];

          return (
            <div
              key={rule.id}
              id={rule.docsAnchor}
              className="rounded-2xl border border-slate-200 dark:border-slate-800/90 bg-white dark:bg-slate-900/60 shadow-sm overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-all scroll-mt-28"
            >
              {/* Card Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/70 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Severity Pill */}
                    {rule.severity === "error" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                        <XCircle className="h-3.5 w-3.5" />
                        FATAL ERROR
                      </span>
                    )}
                    {rule.severity === "warning" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        FINANCIAL WARNING
                      </span>
                    )}
                    {rule.severity === "advisory" && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        AUTO-IMMUNIZED
                      </span>
                    )}

                    {/* Rule Code */}
                    <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                      {rule.id}
                    </span>

                    {/* Service Pill */}
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      • {rule.service}
                    </span>
                  </div>

                  {/* Layer Pill */}
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500">
                    {layerConfig.name}
                  </span>
                </div>

                {/* Title & Summary */}
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {rule.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {rule.summary}
                  </p>
                </div>

                {/* Financial Risk Callout */}
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/15 text-rose-700 dark:text-rose-300 text-xs leading-relaxed font-medium">
                  <DollarSign className="h-4 w-4 shrink-0 mt-0.5 text-rose-500" />
                  <div>
                    <strong className="font-bold text-rose-900 dark:text-rose-200">Financial Impact: </strong>
                    {rule.financialRisk}
                  </div>
                </div>
              </div>

              {/* Code Comparison Section */}
              <div className="p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40 space-y-3">
                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setActiveTabs((prev) => ({ ...prev, [rule.id]: "bad" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        tab === "bad"
                          ? "bg-rose-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Hazardous Vulnerable Pattern
                    </button>
                    <button
                      onClick={() =>
                        setActiveTabs((prev) => ({ ...prev, [rule.id]: "good" }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        tab === "good"
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                      }`}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Safe Immunized Code
                    </button>
                  </div>

                  {/* Copy Button */}
                  <button
                    onClick={() =>
                      handleCopy(tab === "bad" ? rule.badCode : rule.goodCode, rule.id)
                    }
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    title="Copy snippet"
                  >
                    {copiedCode === rule.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Code Block */}
                <div className="relative rounded-xl overflow-hidden bg-slate-900 dark:bg-black/80 border border-slate-800 p-4 font-mono text-xs text-slate-200 leading-relaxed overflow-x-auto">
                  <pre>{tab === "bad" ? rule.badCode : rule.goodCode}</pre>
                </div>

                {/* Remediation Footer */}
                <div className="flex items-start gap-2 pt-2 text-xs text-slate-600 dark:text-slate-400">
                  <strong className="text-slate-900 dark:text-slate-200 shrink-0">Remediation:</strong>
                  <span>{rule.remediation}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
