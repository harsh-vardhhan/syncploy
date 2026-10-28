import type { ResourceGraph } from "../types";
import type { DeployPolicyDocument, PolicyEvaluationReport } from "./types";

export function evaluateDeployPolicy(
  existing: DeployPolicyDocument,
  generated: DeployPolicyDocument,
  _graph: ResourceGraph
): PolicyEvaluationReport {
  const deadPermissions: PolicyEvaluationReport["deadPermissions"] = [];
  const wildcardReductions: PolicyEvaluationReport["wildcardReductions"] = [];
  const missingActionsInExisting: PolicyEvaluationReport["missingActionsInExisting"] = [];

  // Map generated actions by service namespace prefix
  const generatedActionsByService = new Map<string, Set<string>>();
  for (const stmt of generated.Statement) {
    for (const act of stmt.Action) {
      const prefix = act.split(":")[0];
      if (!prefix) continue;
      if (!generatedActionsByService.has(prefix)) {
        generatedActionsByService.set(prefix, new Set());
      }
      generatedActionsByService.get(prefix)!.add(act);
    }
  }

  // 1. Identify Dead Permissions in Existing Policy
  for (const stmt of existing.Statement) {
    const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
    const services = new Set(actions.map((a) => a.split(":")[0]));

    for (const svc of services) {
      if (!svc) continue;
      if (!generatedActionsByService.has(svc)) {
        deadPermissions.push({
          sid: stmt.Sid,
          reason: `Service '${svc}' is not declared in application infrastructure code.`,
          actions: actions.filter((a) => a.startsWith(`${svc}:`)),
          resources: stmt.Resource,
        });
      }
    }
  }

  // 2. Identify Insecure Wildcards in Existing Policy
  for (const stmt of existing.Statement) {
    const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
    const isWildcardResource = stmt.Resource === "*" || (Array.isArray(stmt.Resource) && stmt.Resource.includes("*"));

    if (isWildcardResource) {
      // Find if generated policy scopes this service to exact ARNs
      const svc = actions[0]?.split(":")[0];
      // ecr:GetAuthorizationToken legitimately requires '*' by AWS IAM rules
      if (svc && svc !== "ecr" && svc !== "sts" && svc !== "cloudfront") {
        const matchingGenStmt = generated.Statement.find((gs) =>
          gs.Action.some((ga) => ga.startsWith(`${svc}:`))
        );
        if (matchingGenStmt) {
          wildcardReductions.push({
            sid: stmt.Sid,
            service: svc,
            existingResource: stmt.Resource,
            minimalScopedResource: matchingGenStmt.Resource,
          });
        }
      }
    }
  }

  // 3. Identify Missing Actions in Existing Policy (Required by CFN Providers)
  for (const genStmt of generated.Statement) {
    const genActions = genStmt.Action;
    const svc = genActions[0]?.split(":")[0] || "unknown";

    // Find all actions currently allowed for this service in existing policy
    const existingActionsForSvc = new Set<string>();
    let hasWildcardAction = false;

    for (const exStmt of existing.Statement) {
      const acts = Array.isArray(exStmt.Action) ? exStmt.Action : [exStmt.Action];
      for (const a of acts) {
        if (a === `${svc}:*` || a === "*") {
          hasWildcardAction = true;
        }
        if (a.startsWith(`${svc}:`)) {
          existingActionsForSvc.add(a);
        }
      }
    }

    if (!hasWildcardAction) {
      const missing = genActions.filter((ga) => !existingActionsForSvc.has(ga));
      if (missing.length > 0) {
        missingActionsInExisting.push({
          sid: genStmt.Sid,
          service: svc,
          missingActions: missing,
        });
      }
    }
  }

  return {
    summary: {
      generatedStatements: generated.Statement.length,
      existingStatements: existing.Statement.length,
      deadStatementsCount: deadPermissions.length,
      wildcardReductionsCount: wildcardReductions.length,
      missingActionsCount: missingActionsInExisting.length,
    },
    deadPermissions,
    wildcardReductions,
    missingActionsInExisting,
  };
}
