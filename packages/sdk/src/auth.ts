export type AuthSignInMethod = "email" | "phone" | "username";

export interface AuthPasswordPolicy {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSymbols?: boolean;
  tempPasswordValidityDays?: number;
}

export type AuthExplicitFlow =
  | "ALLOW_USER_PASSWORD_AUTH"
  | "ALLOW_USER_SRP_AUTH"
  | "ALLOW_REFRESH_TOKEN_AUTH"
  | "ALLOW_CUSTOM_AUTH"
  | "ALLOW_ADMIN_USER_PASSWORD_AUTH";

export interface AuthClientOptions {
  generateSecret?: boolean;
  explicitAuthFlows?: AuthExplicitFlow[];
  preventUserExistenceErrors?: boolean;
  clientLogicalId?: string;
  clientName?: string;
}

export interface AuthOptions {
  signInMethod?: AuthSignInMethod;
  autoVerify?: ("email" | "phone")[];
  adminOnly?: boolean;
  passwordPolicy?: AuthPasswordPolicy;
  client?: AuthClientOptions;
  logicalId?: string;
  userPoolName?: string;
}

export class Auth {
  readonly _kind = "auth" as const;
  readonly name: string;
  readonly options: AuthOptions;

  constructor(name: string, options: AuthOptions = {}) {
    this.name = name;
    this.options = options;
  }

  public get userPoolId(): string {
    const envKey = `SYNCPLOY_AUTH_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_USER_POOL_ID`;
    return (
      process.env[envKey] ||
      process.env.COGNITO_USER_POOL_ID ||
      process.env[`${this.name}_USER_POOL_ID`] ||
      ""
    );
  }

  public get userPoolClientId(): string {
    const envKey = `SYNCPLOY_AUTH_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_CLIENT_ID`;
    return (
      process.env[envKey] ||
      process.env.COGNITO_CLIENT_ID ||
      process.env[`${this.name}_CLIENT_ID`] ||
      ""
    );
  }

  public get userPoolArn(): string {
    const envKey = `SYNCPLOY_AUTH_${this.name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_ARN`;
    return process.env[envKey] || "";
  }
}
