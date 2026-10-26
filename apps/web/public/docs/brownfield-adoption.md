# Brownfield Adoption & Diff

Migrating existing production applications to an Infrastructure-from-Code framework is historically terrifying: if a framework alters a table's logical ID or physical name, CloudFormation will delete the existing table and recreate an empty one, wiping out production data.

Syncploy guarantees **Zero Stateful Replacements**.

---

## Step 1: Automatic Adoption (`syncploy adopt`)

Generate type-safe TypeScript infrastructure directly from your existing SAM or CloudFormation template:

```bash
syncploy adopt template.yaml -c samconfig.toml -o src/infra.ts
```

Syncploy automatically:
- Preserves all logical IDs (e.g. `logicalId: "EhrTable"`).
- Matches exact partition and sort key schemas.
- Preserves parameter overrides from `samconfig.toml`.

---

## Step 2: Pre-Flight Verification (`syncploy diff`)

Before applying changes, verify 100% equivalence:

```bash
syncploy diff . -a template.yaml --check-replacement
```

Output preview:
```text
🔍 Comparing synthesized template against template.yaml...

Infrastructure Diff Preview:
  = [IN_SYNC] EhrTable (AWS::DynamoDB::Table)
  = [IN_SYNC] EhrUserPool (AWS::Cognito::UserPool)
  = [IN_SYNC] EhrUserPoolClient (AWS::Cognito::UserPoolClient)
  ~ [UPDATE]  EhrBackendFunction (AWS::Serverless::Function -> AWS::Lambda::Function)
      • Migrated from Serverless macro to pure CloudFormation function

Diff Summary:
  0 to replace | 0 data-loss risks | 100% template equivalence verified
```

> [!IMPORTANT]
> The `--check-replacement` flag exits with error code 1 if any stateful resource (Table, Bucket, UserPool) would be replaced, making it an ideal pre-merge CI/CD gatekeeper.
