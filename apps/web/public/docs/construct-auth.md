# Auth (Amazon Cognito)

The `Auth` construct synthesizes `AWS::Cognito::UserPool` and `AWS::Cognito::UserPoolClient` with **Enterprise Security** defaults.

```typescript
import { Auth } from "@syncploy/sdk";

export const ehrAuth = new Auth("ehr", {
  logicalId: "EhrUserPool",
  adminOnly: true,              // Enforces admin-created accounts (blocks public self-registration)
  signInMethod: "email",        // Validates email as primary username
  passwordPolicy: {
    minLength: 12,              // HIPAA compliance standard
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSymbols: true,
  },
  client: {
    clientLogicalId: "EhrUserPoolClient",
    generateSecret: false,      // SPA and Web App friendly
    explicitAuthFlows: [
      "ALLOW_USER_SRP_AUTH",
      "ALLOW_REFRESH_TOKEN_AUTH",
      "ALLOW_USER_PASSWORD_AUTH",
    ],
    preventUserExistenceErrors: true, // Prevents email enumeration attacks
  },
});
```

---

## Automatic Environment Variable Injection

When an `Auth` construct is declared in your project, the Syncploy compiler **automatically injects**:
- `COGNITO_USER_POOL_ID: !Ref <LogicalId>`
- `COGNITO_CLIENT_ID: !Ref <ClientLogicalId>`
- `COGNITO_USER_POOL_ARN: !GetAtt <LogicalId>.Arn`

into every synthesized Lambda function environment. You never have to manually wire CloudFormation references.

---

## Runtime Accessors

```typescript
import { ehrAuth } from "./infra";

// Resolved seamlessly from injected environment variables:
const poolId = ehrAuth.userPoolId;
const clientId = ehrAuth.userPoolClientId;
const arn = ehrAuth.userPoolArn;
```

---

## Parameters Reference

| Parameter | Type | Default | Description |
| --- | --- | --- | --- |
| `logicalId` | `string` | `"${name}UserPool"` | CloudFormation logical ID |
| `adminOnly` | `boolean` | `false` | If `true`, blocks public self-registration |
| `signInMethod` | `"email" | "username" | "phone"` | `"email"` | Primary login credential attribute |
| `passwordPolicy.minLength` | `number` | `12` | Minimum password character length |
| `client.preventUserExistenceErrors` | `boolean` | `true` | Returns generic errors to prevent user scraping |
