import type { ResourceGraph } from "../types";
import type {
  DeployPolicyDocument,
  DeployPolicyOptions,
  PolicyEvaluationReport,
} from "./types";
import { generateDeployPolicy } from "./generator";
import { evaluateDeployPolicy } from "./evaluator";

export * from "./types";
export * from "./generator";
export * from "./evaluator";

export class PolicyGenerator {
  /**
   * Synthesize a minimal, least-privilege AWS IAM deployment policy for CI/CD runners.
   * Derives exact required actions from the ResourceGraph and synthesized template.
   */
  public generate(
    graph: ResourceGraph,
    template: any,
    options: DeployPolicyOptions
  ): DeployPolicyDocument {
    return generateDeployPolicy(graph, template, options);
  }

  /**
   * Evaluate an existing deploy policy against the compiler-generated optimal policy.
   * Pinpoints dead permissions, over-privileged wildcards, and missing CloudFormation actions.
   */
  public evaluate(
    existing: DeployPolicyDocument,
    generated: DeployPolicyDocument,
    graph: ResourceGraph
  ): PolicyEvaluationReport {
    return evaluateDeployPolicy(existing, generated, graph);
  }
}
