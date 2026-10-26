"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Terminal,
  Github,
  BookOpen,
  Shield,
  Menu,
  X,
  Layers,
  Sparkles,
  Code,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-[#232736] bg-white/80 dark:bg-[#090A0F]/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            Syncploy
            <span className="hidden sm:inline-flex text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-mono font-medium">
              v0.1.7
            </span>
          </span>
        </Link>

        {/* Desktop Navigation (visible on lg+) */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-8 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <Link
            href="/docs"
            className={`hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 ${
              pathname === "/docs" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : ""
            }`}
          >
            <BookOpen className="h-4 w-4 text-slate-400 dark:text-neutral-400" />
            Documentation
          </Link>
          <Link
            href="/docs/safety-rails"
            className={`hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5 ${
              pathname === "/docs/safety-rails" ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""
            }`}
          >
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Safety Rails
          </Link>
          <Link
            href="/docs/brownfield-adoption"
            className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
              pathname === "/docs/brownfield-adoption" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : ""
            }`}
          >
            Brownfield Adoption
          </Link>
          <Link
            href="/docs/ehr-backend-case-study"
            className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
              pathname === "/docs/ehr-backend-case-study" ? "text-indigo-600 dark:text-indigo-400 font-semibold" : ""
            }`}
          >
            Case Study
          </Link>
          <Link
            href="/docs/construct-auth"
            className={`hover:text-slate-900 dark:hover:text-white transition-colors ${
              pathname.includes("construct") ? "text-indigo-600 dark:text-indigo-400 font-semibold" : ""
            }`}
          >
            Constructs
          </Link>
        </nav>

        {/* Right CTA (visible on lg+) */}
        <div className="hidden lg:flex items-center gap-2.5 xl:gap-3">
          <ThemeToggle />
          <a
            href="https://github.com/harsh-vardhhan/syncploy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-sm font-medium text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-[#1A1D28] transition-colors"
            title="Star Syncploy on GitHub"
          >
            <Github className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">GitHub</span>
          </a>
          <Link
            href="/docs"
            className="px-3.5 py-1.5 xl:px-4 xl:py-2 rounded-lg bg-indigo-600 text-xs xl:text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors shrink-0"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile & Tablet menu button + Theme toggle (visible on < lg) */}
        <div className="flex lg:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile & Tablet Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-b border-slate-200 dark:border-[#232736] bg-white/95 dark:bg-[#090A0F]/95 backdrop-blur-md px-4 sm:px-6 pt-3 pb-6 space-y-4 shadow-xl max-h-[calc(100vh-4.5rem)] overflow-y-auto">
          <nav className="flex flex-col space-y-1 text-sm font-medium">
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                pathname === "/docs"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#12141C]"
              }`}
            >
              <BookOpen className="h-4 w-4 shrink-0 text-slate-400 dark:text-neutral-400" />
              <span>Documentation</span>
            </Link>
            <Link
              href="/docs/safety-rails"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                pathname === "/docs/safety-rails"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#12141C]"
              }`}
            >
              <Shield className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>Safety Rails</span>
            </Link>
            <Link
              href="/docs/brownfield-adoption"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                pathname === "/docs/brownfield-adoption"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#12141C]"
              }`}
            >
              <Layers className="h-4 w-4 shrink-0 text-indigo-500" />
              <span>Brownfield Adoption</span>
            </Link>
            <Link
              href="/docs/ehr-backend-case-study"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                pathname === "/docs/ehr-backend-case-study"
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#12141C]"
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0 text-purple-500" />
              <span>Real-World Case Study</span>
            </Link>
            <Link
              href="/docs/construct-auth"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors ${
                pathname.includes("construct")
                  ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold"
                  : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#12141C]"
              }`}
            >
              <Code className="h-4 w-4 shrink-0 text-cyan-500" />
              <span>Serverless Constructs</span>
            </Link>
          </nav>

          <div className="pt-3 border-t border-slate-200 dark:border-[#232736] flex items-center justify-between gap-3">
            <a
              href="https://github.com/harsh-vardhhan/syncploy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-sm font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#1A1D28] transition-colors"
            >
              <Github className="h-4 w-4" />
              <span>GitHub Star</span>
            </a>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center px-4 py-2.5 rounded-xl bg-indigo-600 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
