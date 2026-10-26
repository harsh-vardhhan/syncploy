# CLI Command Reference

The `syncploy` CLI is the central operational tool for compilation, diffing, adoption, and policy generation.

---

## 1. `syncploy build`

Compiles your TypeScript application into CloudFormation templates and bundles Lambda assets.

```bash
syncploy build [dir] [options]
```

### Options
- `[dir]`: Root directory of your TypeScript project (default: `.`).
- `-o, --out <path>`: Output directory for synthesized templates and assets (default: `.syncploy`).
- `--minify`: Minifies bundled JavaScript assets with `esbuild`.
- `--sourcemap`: Generates source maps for Lambda error stack traces.

---

## 2. `syncploy diff`

Compares synthesized CloudFormation templates against an existing template or deployed AWS stack.

```bash
syncploy diff [dir] [options]
```

### Options
- `-a, --against <file>`: Path to existing template (e.g. `template.yaml` or `template.json`).
- `--check-replacement`: **Critical CI flag.** Returns exit code 1 if any stateful resource would be replaced.
- `--json`: Formats diff preview as structured JSON.

---

## 3. `syncploy adopt`

Adopts an existing AWS SAM or CloudFormation template into clean TypeScript code.

```bash
syncploy adopt <template-file> [options]
```

### Options
- `-o, --out <file>`: Path to write generated TypeScript file (default: `src/infra.ts`).
- `-c, --config <file>`: Path to `samconfig.toml` to automatically adopt stack parameters.

---

## 4. `syncploy policy`

Synthesizes a minimal, least-privilege IAM deployment policy for CI/CD runners.

```bash
syncploy policy [dir] [options]
```

### Options
- `-s, --stack-name <name>`: Target CloudFormation stack name (**required**).
- `-r, --region <region>`: AWS region (default: `ap-south-1`).
- `-c, --compare <file>`: Audits an existing policy JSON file against optimal compiler policy.
- `-o, --out <file>`: Writes policy JSON to disk (e.g. `deploy-policy.json`).
