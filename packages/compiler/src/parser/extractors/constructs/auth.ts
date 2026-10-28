import {
  SyntaxKind,
  type ObjectLiteralExpression,
  type SourceFile,
  type VariableDeclaration,
} from "ts-morph";
import type { AuthIR } from "../../../types";
import {
  extractBoolean,
  extractNumber,
  extractString,
} from "../ast-utils";

export function extractAuth(
  decl: VariableDeclaration,
  sourceFile: SourceFile
): { auth: AuthIR; authName: string } | undefined {
  const init = decl.getInitializer();
  if (!init || !init.isKind(SyntaxKind.NewExpression)) return undefined;
  if (init.getExpression().getText() !== "Auth") return undefined;

  const varName = decl.getName();
  const args = init.getArguments();
  if (args.length === 0 || !args[0]?.isKind(SyntaxKind.StringLiteral)) {
    throw new Error(
      `Auth '${varName}' in ${sourceFile.getFilePath()} must have a string literal name as first argument.`
    );
  }
  const authName = args[0].getLiteralValue();

  let signInMethod: AuthIR["signInMethod"] = "email";
  let autoVerify: ("email" | "phone")[] | undefined;
  let adminOnly: boolean | undefined = true;
  let passwordPolicy: AuthIR["passwordPolicy"];
  let client: AuthIR["client"];
  let logicalId: string | undefined;
  let userPoolName: string | undefined;

  if (args.length > 1 && args[1]?.isKind(SyntaxKind.ObjectLiteralExpression)) {
    const opts = args[1] as ObjectLiteralExpression;
    logicalId = extractString(opts.getProperty("logicalId"));
    userPoolName = extractString(opts.getProperty("userPoolName"));
    const methodStr = extractString(opts.getProperty("signInMethod"));
    if (methodStr === "email" || methodStr === "phone" || methodStr === "username") {
      signInMethod = methodStr;
    }
    const adminOnlyVal = extractBoolean(opts.getProperty("adminOnly"));
    if (adminOnlyVal !== undefined) {
      adminOnly = adminOnlyVal;
    }

    const autoVerifyProp = opts.getProperty("autoVerify");
    if (autoVerifyProp && autoVerifyProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = autoVerifyProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ArrayLiteralExpression)) {
        autoVerify = initProp
          .getElements()
          .filter((e) => e.isKind(SyntaxKind.StringLiteral))
          .map((e) => (e as any).getLiteralValue() as "email" | "phone");
      }
    }

    const policyProp = opts.getProperty("passwordPolicy");
    if (policyProp && policyProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = policyProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const policyOpts = initProp as ObjectLiteralExpression;
        passwordPolicy = {
          minLength: extractNumber(policyOpts.getProperty("minLength")),
          requireUppercase: extractBoolean(policyOpts.getProperty("requireUppercase")),
          requireLowercase: extractBoolean(policyOpts.getProperty("requireLowercase")),
          requireNumbers: extractBoolean(policyOpts.getProperty("requireNumbers")),
          requireSymbols: extractBoolean(policyOpts.getProperty("requireSymbols")),
          tempPasswordValidityDays: extractNumber(policyOpts.getProperty("tempPasswordValidityDays")),
        };
      }
    }

    const clientProp = opts.getProperty("client");
    if (clientProp && clientProp.isKind(SyntaxKind.PropertyAssignment)) {
      const initProp = clientProp.getInitializer();
      if (initProp && initProp.isKind(SyntaxKind.ObjectLiteralExpression)) {
        const clientOpts = initProp as ObjectLiteralExpression;
        let explicitAuthFlows: string[] | undefined;
        const flowsProp = clientOpts.getProperty("explicitAuthFlows");
        if (flowsProp && flowsProp.isKind(SyntaxKind.PropertyAssignment)) {
          const flowsInit = flowsProp.getInitializer();
          if (flowsInit && flowsInit.isKind(SyntaxKind.ArrayLiteralExpression)) {
            explicitAuthFlows = flowsInit
              .getElements()
              .filter((e) => e.isKind(SyntaxKind.StringLiteral))
              .map((e) => (e as any).getLiteralValue());
          }
        }
        client = {
          generateSecret: extractBoolean(clientOpts.getProperty("generateSecret")),
          explicitAuthFlows,
          preventUserExistenceErrors: extractBoolean(clientOpts.getProperty("preventUserExistenceErrors")),
          clientLogicalId: extractString(clientOpts.getProperty("clientLogicalId")),
          clientName: extractString(clientOpts.getProperty("clientName")),
        };
      }
    }
  }

  return {
    auth: {
      id: varName,
      name: authName,
      signInMethod,
      autoVerify,
      adminOnly,
      passwordPolicy,
      client,
      sourceFile: sourceFile.getFilePath(),
      logicalId,
      userPoolName,
    },
    authName,
  };
}
