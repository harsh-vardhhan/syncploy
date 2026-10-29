import type { DocItem } from '../types';

export const securityDoc: DocItem = {
  slug: "security",
  title: "Security, Supply Chain & Trust",
  category: "Compiler & Safety",
  description: "Cryptographic supply-chain integrity, zero lifecycle hooks, offline local compilation, and zero-telemetry architecture.",
  content: `
# Security, Supply Chain & Trust Guarantees

In modern software development, engineering teams and enterprise security reviewers are rightfully vigilant about third-party frameworks, CLI tools, and npm packages. Supply chain attacks, rogue \`postinstall\` scripts, and silent telemetry tracking are rampant.

Syncploy is engineered from the ground up under a strict **Zero-Trust Architecture**. It operates as an offline static compiler that respects developer privacy, emits 100% transparent AWS CloudFormation, and guarantees zero supply-chain vulnerabilities.

---

## 🛡️ The 5 Pillars of Syncploy Security

| Pillar | Guarantee | Technical Proof |
| :--- | :--- | :--- |
| **1. Zero Telemetry & 100% Offline** | Never phones home; collects no user code, AST metrics, or environment variables. | Verified in CI via static regex audit; 0 network calls in compiler/runtime. |
| **2. Zero Lifecycle Scripts** | Cannot execute arbitrary shell commands upon \`npm install\` or \`bun add\`. | Audited in CI; zero \`postinstall\`, \`preinstall\`, or \`install\` scripts in any package. |
| **3. Zero Credential Interception** | AWS credentials and cloud traffic never pass through Syncploy servers. | Local-only AST analysis; handler code deploys directly to your own AWS account. |
| **4. Official AWS SDK Only** | No risky open-source micro-packages or unverified transitive dependencies. | Runtime client imports exclusively official \`@aws-sdk/*\` libraries maintained by Amazon. |
| **5. Continuous CI Security Auditing** | Every pull request and release is cryptographically and structurally audited. | Automated GitHub Actions assert \`publint\`, secret leak scanning, and SHA-256 integrity. |

---

## 1. 100% Offline Compilation (Zero Telemetry)

Many modern developer tools collect anonymized telemetry, tracking CLI usage, repository names, and code structures. 

**Syncploy collects zero telemetry:**
- The AST analysis engine runs entirely in-memory on your local CPU in $<1\\text{ms}$.
- No usage data, repository metadata, or synthesized template structures are ever transmitted over the network.
- You can run \`bunx syncploy build\` in a completely air-gapped, isolated network environment with zero internet access.

---

## 2. Zero Lifecycle Scripts (Malware Immunity)

The vast majority of npm supply chain attacks rely on npm lifecycle hooks—specifically \`postinstall\` and \`preinstall\` scripts—to execute malicious shell payloads, scan environment variables, or install hidden backdoors upon package installation.

\`@syncploy/sdk\`, \`@syncploy/compiler\`, and the \`syncploy\` CLI contain **zero lifecycle scripts**.

When your CI pipeline or local machine executes:
\`\`\`bash
bun add @syncploy/sdk
# or: npm install @syncploy/sdk
\`\`\`
The package manager strictly unpacks TypeScript and JavaScript distribution files. It does not spawn a child shell, does not execute arbitrary binaries, and cannot tamper with your local filesystem.

This invariant is verified on every pull request via our automated CI test:
\`\`\`bash
bun run audit:security
# Asserts: Zero dangerous lifecycle hooks found across all packages.
\`\`\`

---

## 3. Zero Credential Exposure & Zero Traffic Interception

Traditional PaaS providers and deployment platforms require you to hand over administrative AWS IAM credentials, OAuth tokens, or route production HTTP traffic through their proprietary edge proxies.

Syncploy is **not an intermediary service**:
- **Direct CloudFormation Output:** Syncploy compiles application code down to standard, 1:1 vanilla AWS CloudFormation JSON templates (\`.syncploy/template.json\`).
- **Standard AWS SDK Transport:** At runtime, Syncploy constructs invoke AWS services using direct, official HTTPS endpoints (\`dynamodb.<region>.amazonaws.com\`, \`sqs.<region>.amazonaws.com\`).
- **No Third-Party Relay:** Your application data and credentials communicate directly between your users and your AWS account with zero middleware in between.

---

## 4. Curated, Enterprise-Grade Dependencies

Supply chain vulnerabilities typically enter through deep, neglected dependency trees. 

The \`@syncploy/sdk\` runtime package intentionally minimizes external dependencies:
- **Zero utility bloat:** No \`lodash\`, \`left-pad\`, or unmaintained helper libraries.
- **Strictly Official AWS Clients:**
  - \`@aws-sdk/client-dynamodb\`
  - \`@aws-sdk/client-s3\`
  - \`@aws-sdk/client-sns\`
  - \`@aws-sdk/client-sqs\`
  - \`@aws-sdk/lib-dynamodb\`

All dependencies are maintained directly by the official Amazon Web Services engineering team, carrying enterprise-grade security and vulnerability response SLAs.

---

## 5. Automated CI Supply-Chain Gatekeepers

Every commit pushed to the Syncploy repository triggers an automated security gatekeeper workflow in GitHub Actions:

1. **Lifecycle Script Verification:** Recursively inspects every \`package.json\` to block the introduction of any installation hooks.
2. **Credential Leak Scanning:** Scans all source trees and distribution files for AWS Access Key patterns (\`AKIA...\`), session tokens, and PEM private keys.
3. **Export Integrity Audits (\`publint\`):** Validates that all ESM \`exports\` and TypeScript declaration mappings strictly follow Node.js and web standards.
4. **Tarball Content Validation (\`npm pack --dry-run\`):** Guarantees that internal test suites, environment variables (\`.env\`), and secret keys never leak into published npm releases.
5. **Cryptographic Release Hashes:** Every official release generates a deterministic SHA-256 hash published directly to GitHub Release assets.

---

## 🔗 Verification Resources

- **GitHub Actions Security Pipeline:** [github.com/harsh-vardhhan/syncploy/actions](https://github.com/harsh-vardhhan/syncploy/actions)
- **Latest Release Assets & SHA-256:** [github.com/harsh-vardhhan/syncploy/releases](https://github.com/harsh-vardhhan/syncploy/releases)
- **Live AI Specification:** [syncploy.com/llms.txt](https://www.syncploy.com/llms.txt)
- **Responsible Disclosure:** If you discover a potential vulnerability, please email \`harsh.vardhan.611@gmail.com\` for coordinated disclosure.
`,
};
