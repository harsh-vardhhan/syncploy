export interface DeployPolicyStatement {
  Sid: string;
  Effect: "Allow" | "Deny";
  Action: string[];
  Resource: string | string[];
}

export interface DeployPolicyDocument {
  Version: "2012-10-17";
  Statement: DeployPolicyStatement[];
}

export interface DeployPolicyOptions {
  stackName: string;
  region?: string;
  accountId?: string;
}

export interface PolicyEvaluationReport {
  summary: {
    generatedStatements: number;
    existingStatements: number;
    deadStatementsCount: number;
    wildcardReductionsCount: number;
    missingActionsCount: number;
  };
  deadPermissions: {
    sid?: string;
    reason: string;
    actions: string[];
    resources: string | string[];
  }[];
  wildcardReductions: {
    sid?: string;
    service: string;
    existingResource: string | string[];
    minimalScopedResource: string | string[];
  }[];
  missingActionsInExisting: {
    sid?: string;
    service: string;
    missingActions: string[];
  }[];
}
