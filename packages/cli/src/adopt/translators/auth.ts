import { toVarName, toResourceName } from "../resolvers";
import type { TranslatorContext, TranslationResult } from "./types";

export function translateAuth(ctx: TranslatorContext): TranslationResult {
  const adopted: string[] = [];
  const authDefs: string[] = [];
  const { resources } = ctx;

  for (const [key, res] of Object.entries<any>(resources)) {
    if (res.Type === "AWS::Cognito::UserPool") {
      adopted.push(key);
      const props = res.Properties || {};
      const varName = toVarName(key);
      const resName = toResourceName(key, "UserPool");

      // Find matching UserPoolClient
      let clientKey: string | undefined;
      let clientProps: any = undefined;
      for (const [cKey, cRes] of Object.entries<any>(resources)) {
        if (cRes.Type === "AWS::Cognito::UserPoolClient") {
          const upId = cRes.Properties?.UserPoolId;
          if (upId && (upId === key || (typeof upId === "object" && upId.Ref === key))) {
            clientKey = cKey;
            clientProps = cRes.Properties;
            adopted.push(cKey);
            break;
          }
        }
      }

      const lines: string[] = [];
      lines.push(`export const ${varName} = new Auth(${JSON.stringify(resName)}, {`);
      lines.push(`  logicalId: ${JSON.stringify(key)},`);

      if (props.AdminCreateUserConfig?.AllowAdminCreateUserOnly !== undefined) {
        lines.push(`  adminOnly: ${props.AdminCreateUserConfig.AllowAdminCreateUserOnly},`);
      }

      if (props.UsernameAttributes?.includes("email")) {
        lines.push(`  signInMethod: "email",`);
      } else if (props.UsernameAttributes?.includes("phone_number")) {
        lines.push(`  signInMethod: "phone",`);
      }

      if (props.Policies?.PasswordPolicy) {
        const pol = props.Policies.PasswordPolicy;
        lines.push(`  passwordPolicy: {`);
        if (pol.MinimumLength) lines.push(`    minLength: ${pol.MinimumLength},`);
        if (pol.RequireUppercase !== undefined) lines.push(`    requireUppercase: ${pol.RequireUppercase},`);
        if (pol.RequireLowercase !== undefined) lines.push(`    requireLowercase: ${pol.RequireLowercase},`);
        if (pol.RequireNumbers !== undefined) lines.push(`    requireNumbers: ${pol.RequireNumbers},`);
        if (pol.RequireSymbols !== undefined) lines.push(`    requireSymbols: ${pol.RequireSymbols},`);
        lines.push(`  },`);
      }

      if (clientProps) {
        lines.push(`  client: {`);
        if (clientKey) lines.push(`    clientLogicalId: ${JSON.stringify(clientKey)},`);
        if (clientProps.GenerateSecret !== undefined) lines.push(`    generateSecret: ${clientProps.GenerateSecret},`);
        if (clientProps.ExplicitAuthFlows) lines.push(`    explicitAuthFlows: ${JSON.stringify(clientProps.ExplicitAuthFlows)},`);
        if (clientProps.PreventUserExistenceErrors) {
          lines.push(`    preventUserExistenceErrors: ${clientProps.PreventUserExistenceErrors === "ENABLED"},`);
        }
        lines.push(`  },`);
      }

      lines.push(`});`);
      authDefs.push(lines.join("\n"));
    }
  }

  const code = authDefs.length > 0 ? "// --- Cognito Authentication ---\n" + authDefs.join("\n\n") : "";
  return { code, adopted };
}
