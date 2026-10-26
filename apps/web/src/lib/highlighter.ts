import Prism from "prismjs";

if (typeof globalThis !== "undefined") {
  (globalThis as any).Prism = Prism;
}

// Load grammars synchronously
import "prismjs/components/prism-typescript.js";
import "prismjs/components/prism-javascript.js";
import "prismjs/components/prism-json.js";
import "prismjs/components/prism-yaml.js";
import "prismjs/components/prism-bash.js";

export function highlightCode(code: string, language: string = "typescript"): string {
  const norm = (language || "typescript").toLowerCase().trim();
  let grammar = Prism.languages[norm];
  let langId = norm;

  if (norm === "ts" || norm === "tsx" || norm === "typescript") {
    grammar = Prism.languages.typescript;
    langId = "typescript";
  } else if (norm === "js" || norm === "jsx" || norm === "javascript") {
    grammar = Prism.languages.javascript;
    langId = "javascript";
  } else if (norm === "yml" || norm === "yaml") {
    grammar = Prism.languages.yaml;
    langId = "yaml";
  } else if (norm === "json") {
    grammar = Prism.languages.json;
    langId = "json";
  } else if (norm === "bash" || norm === "sh" || norm === "shell") {
    grammar = Prism.languages.bash;
    langId = "bash";
  }

  if (!grammar) {
    grammar = Prism.languages.typescript || Prism.languages.javascript;
    langId = "typescript";
  }

  try {
    return Prism.highlight(code, grammar, langId);
  } catch {
    return escapeHtml(code);
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
