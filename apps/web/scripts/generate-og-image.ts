import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const TEMPLATE_PATH = path.resolve(__dirname, "./og-template.html");
const PUBLIC_OG_IMAGE = path.resolve(__dirname, "../public/og-image.png");
const APP_OG_IMAGE = path.resolve(__dirname, "../src/app/opengraph-image.png");
const APP_TWITTER_IMAGE = path.resolve(__dirname, "../src/app/twitter-image.png");

// Candidate chrome paths
const CHROME_PATHS = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

const chromeExecutable = CHROME_PATHS.find((p) => fs.existsSync(p));

if (!chromeExecutable) {
  console.log("Chrome executable not found. Keeping existing OG images.");
  process.exit(0);
}

try {
  console.log("Generating 1200x630 Open Graph & Twitter preview image using Headless Chrome...");
  const tempOutput = path.resolve("/tmp/og-image-generated.png");

  execSync(
    `"${chromeExecutable}" --headless --screenshot="${tempOutput}" --window-size=1200,630 --virtual-time-budget=3000 --hide-scrollbars "file://${TEMPLATE_PATH}" 2>/dev/null`,
    { stdio: "inherit" }
  );

  if (fs.existsSync(tempOutput)) {
    fs.copyFileSync(tempOutput, PUBLIC_OG_IMAGE);
    fs.copyFileSync(tempOutput, APP_OG_IMAGE);
    fs.copyFileSync(tempOutput, APP_TWITTER_IMAGE);
    console.log("✓ Successfully generated and synchronized:");
    console.log(`  - ${PUBLIC_OG_IMAGE}`);
    console.log(`  - ${APP_OG_IMAGE}`);
    console.log(`  - ${APP_TWITTER_IMAGE}`);
  }
} catch (err) {
  console.error("Error generating OG image:", err);
}
