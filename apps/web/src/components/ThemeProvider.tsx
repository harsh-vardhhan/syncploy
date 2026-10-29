"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "system",
  resolvedTheme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = "syncploy_theme_preference";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always default to "system" on load
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  });
  const [, setMounted] = useState(false);

  const applyThemeClass = (effective: "light" | "dark") => {
    const root = document.documentElement;
    if (effective === "dark") {
      root.classList.add("dark");
      root.style.colorScheme = "dark";
    } else {
      root.classList.remove("dark");
      root.style.colorScheme = "light";
    }
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const getSystemTheme = (): "light" | "dark" => {
      return mediaQuery.matches ? "dark" : "light";
    };

    // Clean up legacy storage key to remove any stale dark-mode locks
    try {
      if (localStorage.getItem("syncploy_theme")) {
        localStorage.removeItem("syncploy_theme");
      }
    } catch {
      // Ignore localStorage errors
    }

    // Read stored preference, defaulting to "system" on load
    let saved: Theme | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      // Ignore localStorage errors
    }

    const initialTheme: Theme =
      saved === "light" || saved === "dark" || saved === "system"
        ? saved
        : "system";

    setThemeState(initialTheme);

    const initialResolved =
      initialTheme === "system" ? getSystemTheme() : initialTheme;
    setResolvedTheme(initialResolved);
    applyThemeClass(initialResolved);
    setMounted(true);

    // Live listener for OS system theme changes
    const handleMediaChange = (e: MediaQueryListEvent | MediaQueryList) => {
      try {
        const current = localStorage.getItem(STORAGE_KEY);
        // Only react to OS changes if theme is system (or no override set)
        if (!current || current === "system") {
          const isDark = "matches" in e ? e.matches : mediaQuery.matches;
          const newResolved: "light" | "dark" = isDark ? "dark" : "light";
          setResolvedTheme(newResolved);
          applyThemeClass(newResolved);
        }
      } catch {
        // Safe fallback
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleMediaChange);
    } else if (typeof (mediaQuery as unknown as { addListener: (cb: typeof handleMediaChange) => void }).addListener === "function") {
      (mediaQuery as unknown as { addListener: (cb: typeof handleMediaChange) => void }).addListener(handleMediaChange);
    }

    return () => {
      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleMediaChange);
      } else if (typeof (mediaQuery as unknown as { removeListener: (cb: typeof handleMediaChange) => void }).removeListener === "function") {
        (mediaQuery as unknown as { removeListener: (cb: typeof handleMediaChange) => void }).removeListener(handleMediaChange);
      }
    };
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      if (newTheme === "system") {
        // Remove override so system setting takes control cleanly
        localStorage.removeItem(STORAGE_KEY);
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const resolved = mediaQuery.matches ? "dark" : "light";
        setResolvedTheme(resolved);
        applyThemeClass(resolved);
      } else {
        localStorage.setItem(STORAGE_KEY, newTheme);
        setResolvedTheme(newTheme);
        applyThemeClass(newTheme);
      }
    } catch {
      // Ignore storage errors
    }
  };

  const toggleTheme = () => {
    // Cycles: system -> light -> dark -> system
    if (theme === "system") {
      setTheme("light");
    } else if (theme === "light") {
      setTheme("dark");
    } else {
      setTheme("system");
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
