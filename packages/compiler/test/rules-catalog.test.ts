import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { RULES_CATALOG, RuleCode, getAllRules, getRuleById } from "../src/validator/rules-catalog";

describe("@syncploy/compiler - Rules Catalog Source of Truth", () => {
  it("enforces that all diagnostics emitted across validator rules exist in RULES_CATALOG", () => {
    const validatorDir = path.resolve(__dirname, "../src/validator");
    const catalogKeys = new Set(Object.keys(RULES_CATALOG));
    const emittedCodes = new Set<string>();

    const files = fs.readdirSync(validatorDir, { recursive: true }) as string[];
    for (const f of files) {
      if (!f.endsWith(".ts") || f.includes("test")) continue;
      const fullPath = path.join(validatorDir, f);
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.matchAll(/(addError|addWarning)\s*\(\s*["\x27]([A-Z0-9_]+)["\x27]/g);
      for (const m of matches) {
        if (m[2]) emittedCodes.add(m[2]);
      }
    }

    expect(emittedCodes.size).toBeGreaterThan(50);

    const undocumented = [...emittedCodes].filter((c) => !catalogKeys.has(c));
    expect(undocumented).toEqual([]);
  });

  it("enforces complete metadata on every rule definition in the catalog", () => {
    const rules = getAllRules();
    expect(rules.length).toBeGreaterThanOrEqual(70);

    for (const rule of rules) {
      expect(rule.id).toBeTruthy();
      expect(rule.title).toBeTruthy();
      expect(["compute", "recursion", "storage", "governance", "security"]).toContain(rule.layer);
      expect(["error", "warning", "advisory"]).toContain(rule.severity);
      expect(rule.service).toBeTruthy();
      expect(rule.summary).toBeTruthy();
      expect(rule.remediation).toBeTruthy();
      expect(rule.docsAnchor).toBeTruthy();
      expect(getRuleById(rule.id)).toBe(rule);
      expect((RuleCode as Record<string, string>)[rule.id]).toBe(rule.id);
    }
  });
});
