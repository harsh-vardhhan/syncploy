"use client";

import React, { useEffect, useId, useState } from "react";
import { useTheme } from "./ThemeProvider";

interface MermaidProps {
  chart: string;
  className?: string;
}

export function Mermaid({ chart, className = "" }: MermaidProps) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default;
        const isDark = resolvedTheme === "dark";

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: isDark ? "dark" : "neutral",
          fontFamily: "ui-sans-serif, system-ui, sans-serif, -apple-system",
          themeVariables: isDark
            ? {
                darkMode: true,
                background: "transparent",
                mainBkg: "#12141C",
                textColor: "#F1F5F9",
                primaryColor: "#4F46E5",
                primaryTextColor: "#FFFFFF",
                primaryBorderColor: "#6366F1",
                lineColor: "#818CF8",
                secondaryColor: "#0284C7",
                secondaryTextColor: "#FFFFFF",
                secondaryBorderColor: "#38BDF8",
                tertiaryColor: "#1E1B4B",
                tertiaryTextColor: "#E2E8F0",
                tertiaryBorderColor: "#4338CA",
                noteBkgColor: "#1E293B",
                noteTextColor: "#F1F5F9",
                clusterBkg: "#0B0E17",
                clusterBorder: "#232736",
                nodeBorder: "#4338CA",
                edgeLabelBackground: "#0B0E17",
              }
            : {
                darkMode: false,
                background: "transparent",
                mainBkg: "#FFFFFF",
                textColor: "#0F172A",
                primaryColor: "#EEF2FF",
                primaryTextColor: "#312E81",
                primaryBorderColor: "#6366F1",
                lineColor: "#4F46E5",
                secondaryColor: "#F0F9FF",
                secondaryTextColor: "#075985",
                secondaryBorderColor: "#0284C7",
                tertiaryColor: "#F8FAFC",
                tertiaryTextColor: "#334155",
                tertiaryBorderColor: "#CBD5E1",
                clusterBkg: "#F8FAFC",
                clusterBorder: "#CBD5E1",
                nodeBorder: "#6366F1",
                edgeLabelBackground: "#FFFFFF",
              },
        });

        const cleanId = `mermaid_${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(cleanId, chart.trim());
        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
        }
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        if (isMounted) {
          setError(err?.message || "Failed to render chart");
        }
      }
    }

    renderChart();
    return () => {
      isMounted = false;
    };
  }, [chart, resolvedTheme]);

  if (error) {
    return (
      <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 text-xs font-mono">
        <p className="font-semibold mb-1">Mermaid Render Notice:</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{chart}</pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="flex items-center justify-center p-12 text-slate-400 dark:text-neutral-500 text-xs font-mono animate-pulse">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-500 animate-ping" />
          <span>Rendering interactive architecture diagram...</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`mermaid-container w-full overflow-x-auto flex justify-center py-2 [&>svg]:w-full [&>svg]:max-w-full [&>svg]:h-auto ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
