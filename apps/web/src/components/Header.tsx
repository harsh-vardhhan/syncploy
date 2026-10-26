"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Terminal, Github, BookOpen, Shield, Menu, X } from "lucide-react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Terminal className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            Syncploy
            <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono">
              v0.1.7
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-300">
          <Link href="/docs" className="hover:text-white transition-colors flex items-center gap-1.5">
            <BookOpen className="h-4 w-4 text-neutral-400" />
            Documentation
          </Link>
          <Link href="/docs/safety-rails" className="hover:text-white transition-colors flex items-center gap-1.5">
            <Shield className="h-4 w-4 text-emerald-400" />
            Safety Rails
          </Link>
          <Link href="/docs/brownfield-adoption" className="hover:text-white transition-colors">
            Brownfield Adoption
          </Link>
          <Link href="/docs/construct-auth" className="hover:text-white transition-colors">
            Constructs
          </Link>
        </nav>

        {/* Right CTA */}
        <div className="hidden md:flex items-center gap-4">
          <a
            href="https://github.com/harsh-vardhhan/syncploy"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-neutral-300 hover:text-white hover:bg-surface-hover transition-colors"
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

        {/* Mobile menu button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-border bg-surface/95 px-4 pt-3 pb-6 space-y-3">
          <Link
            href="/docs"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-neutral-200 hover:text-white"
          >
            Documentation
          </Link>
          <Link
            href="/docs/safety-rails"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-neutral-200 hover:text-white"
          >
            Safety Rails
          </Link>
          <Link
            href="/docs/brownfield-adoption"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-neutral-200 hover:text-white"
          >
            Brownfield Adoption
          </Link>
          <Link
            href="/docs/construct-auth"
            onClick={() => setMobileMenuOpen(false)}
            className="block text-base font-medium text-neutral-200 hover:text-white"
          >
            Constructs
          </Link>
          <div className="pt-3 flex gap-3">
            <a
              href="https://github.com/harsh-vardhhan/syncploy"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-border bg-surface-hover text-sm font-medium text-white"
            >
              <Github className="h-4 w-4" />
              GitHub
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
