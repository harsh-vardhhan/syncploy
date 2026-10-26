"use client";

import React, { useState } from "react";
import { Terminal, Shield, CheckCircle2, AlertTriangle, FileCode } from "lucide-react";

interface TabOption {
  id: string;
  name: string;
  description: string;
  tsCode: string;
  cfnOutput: string;
  benefits: string[];
}

const TABS: TabOption[] = [
  {
    id: "auth",
    name: "Cognito Auth",
    description: "First-class healthcare-compliant authentication with zero YAML.",
    tsCode: `import { Auth, api } from "@syncploy/sdk";

// Single declaration with Clean 4 healthcare compliance
export const ehrAuth = new Auth("ehr", {
  logicalId: "EhrUserPool",
  adminOnly: true,              // Blocks self-signups
  signInMethod: "email",
  passwordPolicy: { minLength: 12 },
  client: {
    clientLogicalId: "EhrUserPoolClient",
    preventUserExistenceErrors: true,
  },
});

export const backendApi = api({ ingress: "function-url" }, async (req) => {
  // COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID are
  // automatically injected into Lambda environment!
  return Response.json({ poolId: ehrAuth.userPoolId });
});`,
    cfnOutput: `Resources:
  EhrUserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: !Sub "\${AWS::StackName}-ehr"
      UsernameAttributes: [email]
      AutoVerifiedAttributes: [email]
      AdminCreateUserConfig:
        AllowAdminCreateUserOnly: true
      Policies:
        PasswordPolicy:
          MinimumLength: 12
          RequireUppercase: true
          RequireLowercase: true
          RequireNumbers: true
          RequireSymbols: true

  EhrUserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref EhrUserPool
      GenerateSecret: false
      PreventUserExistenceErrors: ENABLED

  BackendFunction:
    Type: AWS::Lambda::Function
    Properties:
      Environment:
        Variables:
          COGNITO_USER_POOL_ID: !Ref EhrUserPool
          COGNITO_CLIENT_ID: !Ref EhrUserPoolClient`,
    benefits: [
      "Auto-wires COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID into Lambda",
      "Enforces 12-char HIPAA passwords & PreventUserExistenceErrors",
      "Protected as stateful resource in diff engine (prevents user wipeout)",
    ],
  },
  {
    id: "recursion",
    name: "Recursion Shield",
    description: "Compile-time detection of infinite Lambda-DynamoDB cycles.",
    tsCode: `import { Table } from "@syncploy/sdk";

export const patientTable = new Table("patients", {
  partitionKey: { name: "id", type: "string" },
  stream: "NEW_IMAGE",
});

// Hazardous infinite event cycle:
export const badStreamWorker = patientTable.stream(
  { batchSize: 50 },
  async (record) => {
    // BUG: Writing back to the stream source table!
    await patientTable.put({
      id: record.id,
      updatedAt: Date.now(),
    });
  }
);`,
    cfnOutput: `⚡ Compiling project at /src...

✖ [ERR_RECURSIVE_LOOP] in src/workers/patient-stream.ts:
  • Infinite recursion loop detected: 
    Table 'patients' -> Stream Consumer 'badStreamWorker' -> Table 'patients'
  
  • This event-driven cycle causes continuous self-amplifying Lambda 
    invocations and exponential Denial-of-Wallet (DoW).

✖ Compilation aborted. 0 AWS resources modified.`,
    benefits: [
      "Statically analyzes AST write mutations before code hits AWS",
      "Prevents runaway $10,000+ surprise cloud bills",
      "Audits cross-service multi-hop cycles (Table -> Queue -> Topic -> Table)",
    ],
  },
  {
    id: "diff",
    name: "0-Replacement Diff",
    description: "Safely adopt brownfield SAM templates with zero data loss.",
    tsCode: `// Adopt existing SAM resources into TypeScript
export const ehrTable = new Table("ehr", {
  logicalId: "EhrTable", // Preserves CloudFormation Logical ID
  tableName: "\${AWS::StackName}-ehr",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
});

// Run verification:
// $ syncploy diff . -a template.yaml --check-replacement`,
    cfnOutput: `🔍 Comparing synthesized template against template.yaml...

Infrastructure Diff Preview:
  = [IN_SYNC] EhrTable (AWS::DynamoDB::Table)
  = [IN_SYNC] EhrUserPool (AWS::Cognito::UserPool)
  = [IN_SYNC] EhrUserPoolClient (AWS::Cognito::UserPoolClient)
  ~ [UPDATE]  EhrBackendFunction (AWS::Serverless::Function -> AWS::Lambda::Function)
      • Migrated from Serverless macro to pure CloudFormation function

Diff Summary:
  0 to replace | 0 data-loss risks | 100% template equivalence verified`,
    benefits: [
      "Pre-flight gatekeeper blocks destructive stateful replacements",
      "Guarantees 1:1 CloudFormation logical ID equivalence",
      "Zero downtime brownfield migration",
    ],
  },
  {
    id: "policy",
    name: "Least-Privilege IAM",
    description: "Generates optimal CI/CD deployment policies matching your AST.",
    tsCode: `// Automatically generated via:
// $ syncploy policy . -s ehr-annotation-backend -o deploy-policy.json

// Scopes every action to your actual code:
// • No dead permissions (prunes apigateway, cloudfront)
// • No wildcards (scopes cognito-idp to exact stack ARNs)
// • Injects all CloudFormation shadow actions (TagResource, etc.)`,
    cfnOutput: `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CognitoUserPoolManagement",
      "Effect": "Allow",
      "Action": [
        "cognito-idp:CreateUserPool",
        "cognito-idp:DescribeUserPool",
        "cognito-idp:TagResource",
        "cognito-idp:ListTagsForResource"
      ],
      "Resource": "arn:aws:cognito-idp:ap-south-1:<ACCOUNT_ID>:userpool/*"
    }
  ]
}`,
    benefits: [
      "Eliminates trial-and-error CI/CD deployment 403 failures",
      "Prunes security debt from services no longer used",
      "Toggles permissions automatically as your TypeScript code evolves",
    ],
  },
];

export function InteractiveComparison() {
  const [activeTab, setActiveTab] = useState(TABS[0]!);

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center space-y-3 mb-10">
        <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
          How the Syncploy Compiler Works
        </h2>
        <p className="text-neutral-400 max-w-2xl mx-auto text-sm sm:text-base">
          Switch tabs below to see how Syncploy translates concise TypeScript into resilient, secure, and production-tested AWS infrastructure.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab.id === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "border border-border bg-surface text-neutral-400 hover:text-white hover:bg-surface-hover"
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Main Grid: TypeScript vs Compiler Output */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left: TypeScript */}
        <div className="rounded-2xl border border-border bg-surface/90 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/60">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <FileCode className="h-4 w-4 text-indigo-400" />
              <span>infrastructure.ts</span>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-400 px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
              Developer Code
            </span>
          </div>
          <pre className="p-4 sm:p-5 text-xs sm:text-sm font-mono text-neutral-200 overflow-x-auto leading-relaxed bg-[#0b0d14]">
            <code>{activeTab.tsCode}</code>
          </pre>
        </div>

        {/* Right: Compiler Output */}
        <div className="rounded-2xl border border-border bg-surface/90 overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/60">
            <div className="flex items-center gap-2 text-xs font-mono text-neutral-400">
              <Terminal className="h-4 w-4 text-cyan-400" />
              <span>
                {activeTab.id === "recursion"
                  ? "Compiler Diagnostic Output"
                  : activeTab.id === "policy"
                  ? "deploy-policy.json"
                  : "synthesized-template.yaml"}
              </span>
            </div>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${
                activeTab.id === "recursion"
                  ? "text-red-400 bg-red-500/10 border-red-500/20"
                  : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
              }`}
            >
              {activeTab.id === "recursion" ? "Safety Shield" : "Compiler Synthesis"}
            </span>
          </div>
          <pre
            className={`p-4 sm:p-5 text-xs sm:text-sm font-mono overflow-x-auto leading-relaxed ${
              activeTab.id === "recursion" ? "bg-[#14080a] text-red-200" : "bg-[#0b0d14] text-neutral-300"
            }`}
          >
            <code>{activeTab.cfnOutput}</code>
          </pre>
        </div>
      </div>

      {/* Benefit Bullets */}
      <div className="mt-6 p-4 rounded-xl border border-border bg-surface/40 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-neutral-300">
          {activeTab.benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
