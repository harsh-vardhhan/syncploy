import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const ROOT_DIR = resolve(import.meta.dirname, "..");
const PLUGIN_DIR = join(ROOT_DIR, "plugins", "syncploy");
const DIST_DIR = join(ROOT_DIR, "dist");

console.log("⚡ [Syncploy Plugin Packager] Validating plugin bundle...");

// 1. Ensure dist directory exists
if (!existsSync(DIST_DIR)) {
  mkdirSync(DIST_DIR, { recursive: true });
}

// 2. Validate plugin.json
const manifestPath = join(PLUGIN_DIR, "plugin.json");
if (!existsSync(manifestPath)) {
  console.error("❌ Missing plugin.json in", PLUGIN_DIR);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
if (!manifest.name || !manifest.version || !manifest.description) {
  console.error("❌ plugin.json is missing required fields (name, version, description)");
  process.exit(1);
}

if (!manifest.displayName) {
  console.warn("⚠️  Warning: plugin.json is missing 'displayName'");
}

if (!Array.isArray(manifest.suggestedPrompts) || manifest.suggestedPrompts.length !== 3) {
  console.warn(`⚠️  Antigravity recommends exactly 3 suggestedPrompts (found: ${manifest.suggestedPrompts?.length ?? 0})`);
}

// 3. Ensure critical files exist
const requiredFiles = [
  join(PLUGIN_DIR, "README.md"),
  join(PLUGIN_DIR, "assets", "logo.svg"),
  join(PLUGIN_DIR, "rules", "AGENTS.md"),
  join(PLUGIN_DIR, "skills", "syncploy", "SKILL.md"),
];

for (const file of requiredFiles) {
  if (!existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}

// 4. Sync live llms.txt & llms-full.txt from web app if available
const webLlms = join(ROOT_DIR, "apps", "web", "public", "llms.txt");
const webLlmsFull = join(ROOT_DIR, "apps", "web", "public", "llms-full.txt");
const refDir = join(PLUGIN_DIR, "skills", "syncploy", "references");

if (!existsSync(refDir)) {
  mkdirSync(refDir, { recursive: true });
}

if (existsSync(webLlms)) {
  copyFileSync(webLlms, join(refDir, "llms.txt"));
  console.log("✓ Synchronized latest references/llms.txt from web app");
}
if (existsSync(webLlmsFull)) {
  copyFileSync(webLlmsFull, join(refDir, "llms-full.txt"));
  console.log("✓ Synchronized latest references/llms-full.txt from web app");
}

// 5. Create zip archive
const zipPath = join(DIST_DIR, "syncploy-plugin.zip");
console.log(`📦 Packaging ${zipPath}...`);

// Use native zip command to archive 'syncploy' directory preserving relative structure
const zipProcess = spawnSync("zip", ["-r", zipPath, "syncploy", "-x", "*.DS_Store"], {
  cwd: join(ROOT_DIR, "plugins"),
  stdio: "inherit",
});

if (zipProcess.status !== 0) {
  console.error("❌ Failed to create zip archive");
  process.exit(1);
}

// 6. Compute SHA-256
const zipBuffer = readFileSync(zipPath);
const sha256 = createHash("sha256").update(zipBuffer).digest("hex");
const sha256Path = join(DIST_DIR, "syncploy-plugin.zip.sha256");
writeFileSync(sha256Path, `${sha256}  syncploy-plugin.zip\n`, "utf-8");

console.log(`\n🔒 SHA-256: ${sha256}`);
console.log(`✓ Saved checksum to ${sha256Path}`);

// 7. Generate Marketplace catalog JSON entry
const versionTag = process.env.GITHUB_REF_NAME || `v${manifest.version}`;
const releaseUrl = `https://github.com/harsh-vardhhan/syncploy/releases/download/${versionTag}/syncploy-plugin.zip`;

const catalogEntry = {
  name: manifest.name,
  displayName: manifest.displayName || "Syncploy: Pure AWS Serverless",
  version: manifest.version,
  description: manifest.description,
  category: "Cloud",
  keywords: [
    "syncploy",
    "aws",
    "serverless",
    "lambda",
    "dynamodb",
    "sqs",
    "s3",
    "cloudformation",
    "typescript",
    "infrastructure",
    "devops",
  ],
  logo: "https://raw.githubusercontent.com/harsh-vardhhan/syncploy/main/plugins/syncploy/assets/logo.svg",
  suggestedPrompts: manifest.suggestedPrompts,
  author: manifest.author || {
    name: "Syncploy",
    url: "https://www.syncploy.com",
  },
  homepage: manifest.homepage || "https://www.syncploy.com",
  repository: manifest.repository || "https://github.com/harsh-vardhhan/syncploy",
  license: "MIT",
  source: {
    type: "archive",
    url: releaseUrl,
    sha256: sha256,
  },
};

const catalogPath = join(DIST_DIR, "marketplace-entry.json");
writeFileSync(catalogPath, JSON.stringify(catalogEntry, null, 2) + "\n", "utf-8");

console.log(`✓ Generated marketplace entry in ${catalogPath}`);
console.log("\n=======================================================");
console.log("🎉 Plugin Bundle Ready for Antigravity Marketplace!");
console.log("=======================================================\n");
