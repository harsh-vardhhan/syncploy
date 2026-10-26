import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090A0F",
        foreground: "#EDEDED",
        surface: "#12141C",
        "surface-hover": "#1A1D28",
        border: "#232736",
        primary: {
          DEFAULT: "#6366F1",
          hover: "#4F46E5",
          light: "#818CF8",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          light: "#22D3EE",
        },
        emerald: {
          DEFAULT: "#10B981",
          light: "#34D399",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
