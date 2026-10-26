"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCS_DATA } from "@/data/docs";
import { BookOpen, Shield, Code, Terminal } from "lucide-react";

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const categories = Array.from(new Set(DOCS_DATA.map((d) => d.category)));

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "Getting Started":
        return <BookOpen className="h-4 w-4 text-indigo-400" />;
      case "Core Constructs":
        return <Code className="h-4 w-4 text-cyan-400" />;
      case "Compiler & Safety":
        return <Shield className="h-4 w-4 text-emerald-400" />;
      case "CLI Reference":
        return <Terminal className="h-4 w-4 text-amber-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex gap-8">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 hidden md:block">
        <div className="sticky top-24 space-y-8 pr-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          {categories.map((cat) => (
            <div key={cat} className="space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-neutral-400 px-2">
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
                            ? "bg-indigo-600/15 text-indigo-300 font-semibold border-l-2 border-indigo-500"
                            : "text-neutral-400 hover:text-white hover:bg-surface-hover/50"
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
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 max-w-4xl pb-16">{children}</div>
    </div>
  );
}
