import type { ResourceGraph } from "../../types";
import {
  sanitizeName,
  getAuthLogicalId,
  getAuthClientLogicalId,
  resolvePhysicalName,
} from "../logical-ids";

export function generateAuth(
  graph: ResourceGraph,
  resources: Record<string, any>,
  outputs: Record<string, any>
): void {
  for (const auth of graph.auths) {
    const userPoolKey = getAuthLogicalId(auth, graph);
    const clientKey = getAuthClientLogicalId(auth, graph);

    const usernameAttrs = auth.signInMethod === "phone" ? ["phone_number"] : ["email"];
    const autoVerifiedAttrs = auth.autoVerify ?? (auth.signInMethod === "phone" ? ["phone_number"] : ["email"]);

    const passwordPolicy = auth.passwordPolicy ?? {};
    const userPoolProps: any = {
      UserPoolName: resolvePhysicalName(auth.userPoolName, { "Fn::Sub": `\${AWS::StackName}-${auth.name}` }),
      UsernameAttributes: usernameAttrs,
      AutoVerifiedAttributes: autoVerifiedAttrs,
      Policies: {
        PasswordPolicy: {
          MinimumLength: passwordPolicy.minLength ?? 12,
          RequireUppercase: passwordPolicy.requireUppercase ?? true,
          RequireLowercase: passwordPolicy.requireLowercase ?? true,
          RequireNumbers: passwordPolicy.requireNumbers ?? true,
          RequireSymbols: passwordPolicy.requireSymbols ?? true,
          ...(passwordPolicy.tempPasswordValidityDays !== undefined
            ? { TemporaryPasswordValidityDays: passwordPolicy.tempPasswordValidityDays }
            : {}),
        },
      },
    };

    if (auth.adminOnly !== false) {
      userPoolProps.AdminCreateUserConfig = {
        AllowAdminCreateUserOnly: true,
      };
    }

    userPoolProps.UserPoolTags = {
      StackName: { "Fn::Sub": "${AWS::StackName}" },
    };

    resources[userPoolKey] = {
      Type: "AWS::Cognito::UserPool",
      Properties: userPoolProps,
    };

    const clientOpts = auth.client ?? {};
    const clientProps: any = {
      ClientName: resolvePhysicalName(clientOpts.clientName, { "Fn::Sub": `\${AWS::StackName}-${auth.name}-Client` }),
      UserPoolId: { Ref: userPoolKey },
      GenerateSecret: clientOpts.generateSecret ?? false,
      ExplicitAuthFlows: clientOpts.explicitAuthFlows ?? [
        "ALLOW_USER_PASSWORD_AUTH",
        "ALLOW_USER_SRP_AUTH",
        "ALLOW_REFRESH_TOKEN_AUTH",
      ],
      PreventUserExistenceErrors: clientOpts.preventUserExistenceErrors !== false ? "ENABLED" : "LEGACY",
    };

    resources[clientKey] = {
      Type: "AWS::Cognito::UserPoolClient",
      Properties: clientProps,
    };

    outputs[`${sanitizeName(userPoolKey)}Id`] = {
      Description: `Cognito User Pool ID for ${auth.name}`,
      Value: { Ref: userPoolKey },
      Export: {
        Name: { "Fn::Sub": `\${AWS::StackName}-${userPoolKey}Id` },
      },
    };

    outputs[`${sanitizeName(clientKey)}Id`] = {
      Description: `Cognito User Pool Client ID for ${auth.name}`,
      Value: { Ref: clientKey },
      Export: {
        Name: { "Fn::Sub": `\${AWS::StackName}-${clientKey}Id` },
      },
    };

    if (userPoolKey.toLowerCase().includes("userpool")) {
      outputs["CognitoUserPoolId"] = {
        Description: "Cognito User Pool ID",
        Value: { Ref: userPoolKey },
        Export: {
          Name: { "Fn::Sub": `\${AWS::StackName}-UserPoolId` },
        },
      };
    }
    if (clientKey.toLowerCase().includes("client")) {
      outputs["CognitoUserPoolClientId"] = {
        Description: "Cognito User Pool Client ID",
        Value: { Ref: clientKey },
        Export: {
          Name: { "Fn::Sub": `\${AWS::StackName}-UserPoolClientId` },
        },
      };
    }
  }
}
