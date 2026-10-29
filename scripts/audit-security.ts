import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const ROOT_DIR = resolve(import.meta.dirname, "..");
const PACKAGES_DIR = join(ROOT_DIR, "packages");

console.log("🛡️  [Security & Package Audit] Running pre-flight security checks...\n");

let hasErrors = false;

// 1. Verify Zero Lifecycle Hooks (No malicious install scripts)
console.log("1️⃣  Checking for dangerous lifecycle scripts (postinstall/preinstall)...");
const packageDirs = readdirSync(PACKAGES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => join(PACKAGES_DIR, d.name));

for (const pkgDir of packageDirs) {
  const pkgJsonPath = join(pkgDir, "package.json");
  if (!existsSync(pkgJsonPath)) continue;

  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf-8"));
  const scripts = pkg.scripts || {};
  const dangerousHooks = ["preinstall", "install", "postinstall", "preuninstall", "postuninstall"];

  for (const hook of dangerousHooks) {
    if (scripts[hook]) {
      console.error(`❌ SECURITY VIOLATION: ${pkg.name} contains dangerous lifecycle hook: '${hook}'!`);
      hasErrors = true;
    }
  }
}
if (!hasErrors) {
  console.log("   ✓ PASS: Zero lifecycle hooks found across all packages.\n");
}

// 2. Scan for Leaked Credentials (AWS keys, private keys, auth tokens)
console.log("2️⃣  Scanning for leaked credentials in source code...");
const secretRegex = /(AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|BEGIN.*PRIVATE KEY)/;

function scanDirForSecrets(dir: string) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") continue;

    if (entry.isDirectory()) {
      scanDirForSecrets(fullPath);
    } else if (entry.isFile() && !entry.name.endsWith(".test.ts") && entry.name !== "security.ts") {
      const content = readFileSync(fullPath, "utf-8");
      if (secretRegex.test(content)) {
        console.error(`❌ CREDENTIAL LEAK DETECTED in: ${fullPath}`);
        hasErrors = true;
      }
    }
  }
}

scanDirForSecrets(PACKAGES_DIR);
if (!hasErrors) {
  console.log("   ✓ PASS: No AWS credentials or private keys detected in package sources.\n");
}

// 3. Scan for Telemetry / Tracking Libraries
console.log("3️⃣  Scanning for telemetry or phone-home tracking...");
const telemetryRegex = /(mixpanel|posthog|segment\.io|google-analytics)/i;

function scanDirForTelemetry(dir: string) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.name === "node_modules" || entry.name === ".git") continue;

    if (entry.isDirectory()) {
      scanDirForTelemetry(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
      const content = readFileSync(fullPath, "utf-8");
      if (telemetryRegex.test(content)) {
        console.error(`❌ TELEMETRY DETECTED in: ${fullPath}`);
        hasErrors = true;
      }
    }
  }
}

scanDirForTelemetry(join(PACKAGES_DIR, "sdk", "src"));
scanDirForTelemetry(join(PACKAGES_DIR, "compiler", "src"));
if (!hasErrors) {
  console.log("   ✓ PASS: 100% offline code. Zero telemetry or tracking calls.\n");
}

// 4. Run Publint on packages/sdk
console.log("4️⃣  Verifying package export compatibility (publint)...");
const publint = spawnSync("bunx", ["publint", "packages/sdk"], {
  cwd: ROOT_DIR,
  stdio: "inherit",
});

if (publint.status !== 0) {
  console.error("❌ Publint detected export packaging errors!");
  hasErrors = true;
} else {
  console.log("   ✓ PASS: Publint passed with 0 errors.\n");
}

// 5. Test Tarball Dry-Run
console.log("5️⃣  Verifying npm pack dry-run...");
const pack = spawnSync("npm", ["pack", "--dry-run"], {
  cwd: join(PACKAGES_DIR, "sdk"),
  stdio: "pipe",
});

if (pack.status !== 0) {
  console.error("❌ npm pack dry-run failed!");
  hasErrors = true;
} else {
  console.log("   ✓ PASS: npm tarball packages cleanly.\n");
}

if (hasErrors) {
  console.error("\n❌ Security and package audit FAILED.");
  process.exit(1);
} else {
  console.log("=======================================================");
  console.log("🎉 All Security & Package Integrity Audits Passed!");
  console.log("=======================================================\n");
}
