import * as path from "node:path";
import type { ResourceGraph } from "../../types";
import {
  sanitizeName,
  getFunctionLogicalId,
  resolvePhysicalName,
} from "../logical-ids";
import { applyContainerConfig, createLambdaRole, mergeEnvironment } from "../roles";

export function generateApiGateway(
  graph: ResourceGraph,
  resources: Record<string, any>,
  outputs: Record<string, any>
): void {
  const hasApiGateway = graph.apis.some((a) => a.ingress !== "function-url");
  if (!hasApiGateway) return;

  resources["HttpApi"] = {
    Type: "AWS::ApiGatewayV2::HttpApi",
    Properties: {
      Name: { "Fn::Sub": "${AWS::StackName}-api" },
      ProtocolType: "HTTP",
      CorsConfiguration: {
        AllowOrigins: ["*"],
        AllowMethods: ["*"],
        AllowHeaders: ["*"],
      },
    },
  };

  resources["HttpApiStage"] = {
    Type: "AWS::ApiGatewayV2::Stage",
    Properties: {
      ApiId: { Ref: "HttpApi" },
      StageName: "$default",
      AutoDeploy: true,
      DefaultRouteSettings: {
        DetailedMetricsEnabled: true,
        ThrottlingBurstLimit: 100,
        ThrottlingRateLimit: 50,
      },
    },
  };

  outputs["ApiEndpoint"] = {
    Description: "HTTP API Gateway endpoint URL",
    Value: {
      "Fn::Sub": "https://${HttpApi}.execute-api.${AWS::Region}.amazonaws.com",
    },
  };
}

export function generateLambdaApis(
  graph: ResourceGraph,
  resources: Record<string, any>,
  outputs: Record<string, any>,
  lambdaArtifactDirs: Record<string, string>,
  workDir: string,
  envVars: Record<string, any>
): void {
  for (const api of graph.apis) {
    const baseId = api.logicalId || sanitizeName(api.id);
    const funcKey = getFunctionLogicalId(api);
    const integKey = `Integration${baseId}`;
    const routeKey = `Route${baseId}`;
    const permKey = `Permission${baseId}`;

    const artifactDir = lambdaArtifactDirs[api.id];
    const relArtifactDir = path.relative(workDir, artifactDir || "");
    const apiGatewayPath = api.path.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");

    const roleKey = api.roleLogicalId || `Role${baseId}`;
    resources[roleKey] = createLambdaRole(
      baseId,
      { tables: true, buckets: true, policies: api.policies },
      graph
    );

    const funcProps: any = {
      Runtime: "nodejs20.x",
      Handler: "index.handler",
      Code: relArtifactDir,
      Timeout: api.timeout ?? 30,
      MemorySize: api.memory ?? 256,
      Role: { "Fn::GetAtt": [roleKey, "Arn"] },
    };
    if (api.functionName) {
      funcProps.FunctionName = resolvePhysicalName(api.functionName, undefined);
    }

    const functionEnv = mergeEnvironment(envVars, api.environment);
    // Remove self-referential variables to prevent CloudFormation circular dependency
    const upperName = api.id.toUpperCase().replace(/[^A-Z0-9]/g, "_");
    delete functionEnv[`SYNCPLOY_FUNCTION_${upperName}`];
    delete functionEnv[`FUNCTION_${upperName}_NAME`];
    delete functionEnv[`${upperName}_FUNCTION_NAME`];
    delete functionEnv[api.id];
    if (api.id.toLowerCase().includes("backend")) {
      delete functionEnv["BACKEND_FUNCTION_NAME"];
    }
    if (api.logicalId) {
      const upperLogical = api.logicalId.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      delete functionEnv[`SYNCPLOY_FUNCTION_${upperLogical}`];
      delete functionEnv[`FUNCTION_${upperLogical}_NAME`];
      delete functionEnv[`${upperLogical}_FUNCTION_NAME`];
      delete functionEnv[api.logicalId];
    }

    if (Object.keys(functionEnv).length > 0) {
      funcProps["Environment"] = { Variables: functionEnv };
    }

    if (api.concurrency !== undefined) {
      funcProps["ReservedConcurrentExecutions"] = api.concurrency;
    }

    resources[funcKey] = {
      Type: "AWS::Lambda::Function",
      Properties: funcProps,
    };
    applyContainerConfig(funcProps, api.container, api.id, resources, funcKey);

    if (api.ingress === "function-url") {
      const urlKey = api.logicalId ? `${api.logicalId}Url` : `FunctionUrl${baseId}`;
      const urlPermKey = api.permissionLogicalId || (api.logicalId ? `Permission${api.logicalId}Url` : `Permission${baseId}Url`);
      const invokePermKey = api.invokePermissionLogicalId || (api.logicalId ? `${api.logicalId}URLInvokeAllowPublicAccess` : `${funcKey}URLInvokeAllowPublicAccess`);

      const corsProp: any = {
        AllowOrigins: ["*"],
        AllowMethods: [api.method],
        AllowHeaders: ["Content-Type", "Authorization", "X-Amz-Date", "X-Api-Key"],
      };

      if (typeof api.cors === "object" && api.cors !== null) {
        if (api.cors.allowOrigins) corsProp.AllowOrigins = api.cors.allowOrigins;
        if (api.cors.allowMethods) corsProp.AllowMethods = api.cors.allowMethods;
        if (api.cors.allowHeaders) corsProp.AllowHeaders = api.cors.allowHeaders;
      }

      resources[urlKey] = {
        Type: "AWS::Lambda::Url",
        Properties: {
          TargetFunctionArn: { Ref: funcKey },
          AuthType: "NONE",
          Cors: corsProp,
        },
      };

      resources[urlPermKey] = {
        Type: "AWS::Lambda::Permission",
        Properties: {
          FunctionName: { Ref: funcKey },
          Action: "lambda:InvokeFunctionUrl",
          Principal: "*",
          FunctionUrlAuthType: "NONE",
        },
      };

      resources[invokePermKey] = {
        Type: "AWS::Lambda::Permission",
        Properties: {
          FunctionName: { Ref: funcKey },
          Action: "lambda:InvokeFunction",
          Principal: "*",
          InvokedViaFunctionUrl: true,
        },
      };

      outputs[`${baseId}Url`] = {
        Description: `Direct Lambda Function URL for ${api.id}`,
        Value: { "Fn::GetAtt": [urlKey, "FunctionUrl"] },
      };

      if (!outputs["ApiEndpoint"]) {
        outputs["ApiEndpoint"] = {
          Description: "Lambda Function URL",
          Value: { "Fn::GetAtt": [urlKey, "FunctionUrl"] },
        };
      }
    } else {
      resources[integKey] = {
        Type: "AWS::ApiGatewayV2::Integration",
        Properties: {
          ApiId: { Ref: "HttpApi" },
          IntegrationType: "AWS_PROXY",
          IntegrationUri: { "Fn::GetAtt": [funcKey, "Arn"] },
          PayloadFormatVersion: "2.0",
        },
      };

      resources[routeKey] = {
        Type: "AWS::ApiGatewayV2::Route",
        Properties: {
          ApiId: { Ref: "HttpApi" },
          RouteKey: `${api.method} ${apiGatewayPath}`,
          Target: { "Fn::Sub": `integrations/\${${integKey}}` },
        },
      };

      resources[permKey] = {
        Type: "AWS::Lambda::Permission",
        Properties: {
          FunctionName: { Ref: funcKey },
          Action: "lambda:InvokeFunction",
          Principal: "apigateway.amazonaws.com",
          SourceArn: {
            "Fn::Sub": [
              "arn:aws:execute-api:${AWS::Region}:${AWS::AccountId}:${HttpApi}/*/*",
              { HttpApi: { Ref: "HttpApi" } },
            ],
          },
        },
      };
    }
  }
}
