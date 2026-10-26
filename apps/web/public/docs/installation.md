# Installation & Tooling

Syncploy is distributed as two lightweight npm packages:
- **`@syncploy/sdk`**: Runtime constructs and zero-dependency cloud clients used in your application code.
- **`syncploy` / `@syncploy/compiler`**: The CLI and compiler engine used during build, diff, adopt, and deployment.

---

## 1. Package Installation

Using **Bun** (recommended for fastest builds):
```bash
bun add @syncploy/sdk
bun add -d syncploy @syncploy/compiler
```

Using **npm**:
```bash
npm install @syncploy/sdk
npm install --save-dev syncploy @syncploy/compiler
```

Using **pnpm**:
```bash
pnpm add @syncploy/sdk
pnpm add -D syncploy @syncploy/compiler
```

---

## 2. TypeScript Configuration (`tsconfig.json`)

Syncploy expects modern ECMAScript module resolution. Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*"]
}
```

---

## 3. Recommended Project Layout

Syncploy works seamlessly with single microservices, modular apps, or monorepos:

```text
my-serverless-app/
├── package.json
├── tsconfig.json
├── .syncploy/               # Generated CloudFormation & bundled assets
│   ├── template.json
│   └── build/
├── src/
│   ├── infra.ts             # Cloud constructs (Table, Queue, Auth, Bucket)
│   ├── api/                 # Public HTTP endpoints
│   │   ├── checkout.ts
│   │   └── webhooks.ts
│   └── workers/             # Asynchronous stream & queue workers
│       ├── order-worker.ts
│       └── audit-worker.ts
```

---

## 4. `package.json` Scripts

Add Syncploy workflow commands to your `package.json`:

```json
{
  "scripts": {
    "build": "syncploy build",
    "diff": "syncploy diff . -a template.yaml --check-replacement",
    "policy": "syncploy policy . -s my-production-stack -o deploy-policy.json",
    "test": "bun test"
  }
}
```
