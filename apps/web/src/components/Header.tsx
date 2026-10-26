"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal, Github, BookOpen, Shield, Menu, X } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
            Syncploy
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 font-mono font-medium">
              v0.1.7
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-neutral-300">
          <Link
            href="/docs"
            className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="h-4 w-4 text-slate-400 dark:text-neutral-400" />
            Documentation
          </Link>
          <Link
            href="/docs/safety-rails"
            className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            Safety Rails
          </Link>
          <Link
            href="/docs/brownfield-adoption"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Brownfield Adoption
          </Link>
          <Link
            href="/docs/construct-auth"
            className="hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Constructs
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <a
            href="https://github.com/harsh-vardhhan/syncploy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:bg-surface-hover transition-colors"
          >
            <Github className="h-4 w-4" />
            <span>GitHub</span>
          </a>
          <Link
            href="/docs"
            className="px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 transition-colors"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button & Theme toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-background px-4 pt-2 pb-6 space-y-4">
          <nav className="flex flex-col space-y-3 text-sm font-medium text-slate-700 dark:text-neutral-300">
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface"
            >
              <BookOpen className="h-4 w-4 text-slate-400 dark:text-neutral-400" />
              Documentation
            </Link>
            <Link
              href="/docs/safety-rails"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface"
            >
              <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              Safety Rails
            </Link>
            <Link
              href="/docs/brownfield-adoption"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-surface"
            >
              Brownfield Adoption
            </Link>
            <Link
              href="/docs/construct-auth"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-surface"
            >
              Constructs
            </Link>
          </nav>

          <div className="pt-3 border-t border-border flex items-center justify-between gap-3">
            <a
              href="https://github.com/harsh-vardhhan/syncploy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-border bg-surface text-sm font-medium text-slate-700 dark:text-neutral-300"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
            <Link
              href="/docs"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 text-center px-4 py-2 rounded-lg bg-indigo-600 text-sm font-semibold text-white shadow-md"
            >
              Get Started
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
