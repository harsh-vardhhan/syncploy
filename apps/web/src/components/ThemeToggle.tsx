"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { useTheme, type Theme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (!mounted) {
    return (
      <div className={`w-9 h-9 rounded-lg border border-border bg-surface ${className}`} />
    );
  }

  const options: { value: Theme; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      value: "system",
      label: "System",
      icon: <Monitor className="h-4 w-4 text-slate-500 dark:text-neutral-400" />,
      desc: "Default • Automatic sync with OS setting",
    },
    {
      value: "light",
      label: "Light",
      icon: <Sun className="h-4 w-4 text-amber-500" />,
      desc: "Clean high-contrast daytime UI",
    },
    {
      value: "dark",
      label: "Dark",
      icon: <Moon className="h-4 w-4 text-indigo-400" />,
      desc: "Deep OLED serverless night mode",
    },
  ];

  const currentIcon =
    theme === "system" ? (
      <Monitor className="h-4 w-4 text-slate-600 dark:text-neutral-300" />
    ) : theme === "light" ? (
      <Sun className="h-4 w-4 text-amber-500 hover:rotate-45 transition-transform" />
    ) : (
      <Moon className="h-4 w-4 text-indigo-400 hover:-rotate-12 transition-transform" />
    );

  const getTitle = () => {
    if (theme === "system") {
      return `Theme: System (${resolvedTheme}) — Click to change`;
    }
    return `Theme: ${theme === "dark" ? "Dark" : "Light"} — Click to change`;
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        title={getTitle()}
        aria-label={getTitle()}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground hover:bg-surface-hover hover:border-indigo-500/40 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {currentIcon}

        {/* Small badge dot if in system auto-detect mode */}
        {theme === "system" && (
          <span
            className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-indigo-500 ring-2 ring-surface"
            title="Automatically following OS appearance"
          />
        )}
      </button>

      {/* Floating Theme Selection Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-52 rounded-xl border border-slate-200 dark:border-[#232736] bg-white/95 dark:bg-[#12141C]/95 backdrop-blur-md p-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/50 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-2.5 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-semibold border-b border-slate-100 dark:border-slate-800/60 mb-1">
            Appearance
          </div>

          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  role="menuitem"
                  onClick={() => {
                    setTheme(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors text-left ${
                    isSelected
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-[#1A1D28]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {opt.icon}
                    <div>
                      <div className="font-semibold">{opt.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">
                        {opt.desc}
                      </div>
                    </div>
                  </div>

                  {isSelected && (
                    <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
