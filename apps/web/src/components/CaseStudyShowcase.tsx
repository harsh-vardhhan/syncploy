"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ArrowRight,
  Database,
  Lock,
  Layers,
  Terminal,
  Activity,
  Server,
  Radio,
  FileText,
  Github,
} from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { Mermaid } from "./Mermaid";

export function CaseStudyShowcase() {
  const [activeTab, setActiveTab] = useState<"architecture" | "code" | "diff" | "api">("architecture");

  const mermaidChart = `flowchart TD
    subgraph Ingress["Ingress & Authentication"]
        Client["Clinician Web Portal"]
        Cognito["Amazon Cognito UserPool<br/><b>EhrUserPool</b> (SRP Invariants)"]
    end

    subgraph Compute["Elysia.js Backend Compute"]
        FUrl["AWS Lambda Function URL<br/><b>EhrBackendFunction</b> (Bun/Elysia)"]
        KillSwitch["DDoS Circuit Breaker<br/><b>EhrLambdaKillSwitchFunction</b>"]
    end

    subgraph Storage["Stateful Storage (0-Replacement)"]
        Dynamo[("DynamoDB Single-Table<br/><b>EhrTable</b> (PK, SK, GSIs)")]
        S3Docs[("S3 Medical Documents<br/><b>DocumentsBucket</b> (SSE-S3)")]
    end

    subgraph AsyncPipeline["Asynchronous Clinical Extraction"]
        SQS["SQS Processing Queue<br/><b>EhrAnnotationQueue</b>"]
        DLQ["SQS Dead Letter Queue<br/><b>EhrAnnotationDLQ</b>"]
        Worker["Clinical NER Lambda<br/><b>EhrAnnotationWorkerFunction</b>"]
        SageMaker["AWS SageMaker Endpoint<br/><b>GLiNER ReLex Model</b>"]
    end

    subgraph CompliancePipeline["HIPAA Audit & OMOP Data Lake"]
        DDBStream["DynamoDB Streams<br/>(NEW_IMAGE)"]
        FirehoseAudit["Kinesis Firehose<br/><b>EhrAuditDeliveryStream</b>"]
        FirehoseOmop["Kinesis Firehose<br/><b>EhrOmopDeliveryStream</b>"]
        S3Audit[("S3 HIPAA Audit Vault<br/><b>EhrAuditLogsBucket</b> (ObjectLock WORM)")]
        S3Omop[("OMOP CDM Data Lake<br/><b>Parquet Clinical Lakehouse</b>")]
    end

    subgraph SafetyRails["Denial-of-Wallet Shield"]
        CWAlarm["CloudWatch Metric Math<br/><b>EhrLambdaTrafficAlarm</b> (>2000 req/min)"]
        SNSTopic["SNS Alert Topic<br/><b>EhrKillSwitchTopic</b>"]
    end

    Client -->|1. Authenticate SRP| Cognito
    Client -->|2. HTTPS REST| FUrl
    FUrl -->|3. Query Patient Encounters| Dynamo
    FUrl -->|4. Store Clinical Documents| S3Docs

    S3Docs -->|5. ObjectCreated Event| SQS
    SQS -->|6. Batch Poll 180s Timeout| Worker
    SQS -.->|Failed 3x Retries| DLQ
    Worker -->|7. Infer Named Entities| SageMaker
    Worker -->|8. Save Entity Graph| Dynamo

    Dynamo -->|9. Mutation Stream| DDBStream
    DDBStream -->|10. Stream Ingestion| FirehoseAudit
    DDBStream -->|11. Extract OMOP Entities| FirehoseOmop
    FirehoseAudit -->|12. 900s GZIP Buffer| S3Audit
    FirehoseOmop -->|13. 900s GZIP Buffer| S3Omop

    FUrl -.->|Track Invocations + Throttles| CWAlarm
    CWAlarm -->|Trigger on DDoS Spikes| SNSTopic
    SNSTopic -->|Trigger Emergency Shutdown| KillSwitch
    KillSwitch -->|Set Concurrency = 0| FUrl`;

  const tsSnippet = `// packages/shared/src/infra.ts & packages/api/src/infra.ts
import { Table, Bucket, Queue, Topic, Alarm, DeliveryStream, Auth, api } from "@syncploy/sdk";

// 1. Single-Table DynamoDB with zero stateful replacement
export const ehrTable = new Table("ehr", {
  logicalId: "EhrTable",
  tableName: process.env.EHR_TABLE_NAME || "ehr-table",
  deletionPolicy: "Retain",
  partitionKey: { name: "PK", type: "string" },
  sortKey: { name: "SK", type: "string" },
  billingMode: "PAY_PER_REQUEST",
  stream: "NEW_IMAGE",
  indexes: {
    SKIndex: { partitionKey: { name: "SK", type: "string" }, sortKey: { name: "PK", type: "string" }, projection: "ALL" },
    GSI1Index: { partitionKey: { name: "GSI1PK", type: "string" }, sortKey: { name: "GSI1SK", type: "string" }, projection: "ALL" },
  },
});

// 2. S3 Bucket with HIPAA Object Lock (COMPLIANCE mode, account-scoped)
export const ehrAuditLogsBucket = new Bucket("audit_logs", {
  logicalId: "EhrAuditLogsBucket",
  bucketName: "\${AWS::StackName}-audit-logs-\${AWS::AccountId}",
  deletionPolicy: "Retain",
  objectLock: { mode: "COMPLIANCE", days: 1 },
  publicAccessBlock: true,
  accountScoped: true,
});

// 3. High-Performance Lambda Function URL Ingress
export const ehrBackendFunction = api(
  {
    logicalId: "EhrBackendFunction",
    roleLogicalId: "EhrBackendFunctionRole",
    path: "/",
    ingress: "function-url",
    container: { dockerfile: "Dockerfile", context: "." },
    timeout: "30s",
    concurrency: 2,
    cors: { allowOrigins: ["https://ehr-backend-frontend.vercel.app"], allowMethods: ["*"] },
  },
  async (_req, ctx) => app.handle(ctx.request)
);`;

  const diffOutput = `$ syncploy diff --against template.yaml --check-replacement

Compiling TypeScript infrastructure...
Parsed 14 cloud resources from AST across 3 workspaces.
Comparing against existing template: template.yaml
Validating stateful resource replacements...

Resource Changes:
  ~ [UPDATE] EhrBackendFunction (AWS::Serverless::Function -> AWS::Lambda::Function)
      • Migrated from SAM macro to native Lambda Function URL
  ~ [UPDATE] EhrAnnotationWorkerFunctionRole (AWS::IAM::Role)
      • Synthesized least-privilege policies (sagemaker:InvokeEndpoint)
  = [EQUAL]  EhrTable (AWS::DynamoDB::Table)
      • Primary keys (PK, SK) & GSIs (SKIndex, GSI1Index) perfectly preserved
  = [EQUAL]  DocumentsBucket (AWS::S3::Bucket)
      • Encryption, EventBridge notifications preserved
  = [EQUAL]  EhrAuditLogsBucket (AWS::S3::Bucket)
      • ObjectLock COMPLIANCE configuration preserved
  = [EQUAL]  EhrAnnotationQueue (AWS::SQS::Queue)
  = [EQUAL]  EhrAnnotationDLQ (AWS::SQS::Queue)
  = [EQUAL]  EhrKillSwitchTopic (AWS::SNS::Topic)

Diff Summary:
  + 0 to create | ~ 3 to update | ! 0 to replace | - 0 to delete | 9 unchanged

✔ Pre-flight safety check PASSED: No stateful resources will be replaced.`;

  const apiVerification = `# 1. Health & Framework Status
$ curl -s https://ofxtuegfgi6kqg4wfzfyuqu6be0mubmk.lambda-url.ap-south-1.on.aws/
{
  "status": "ok",
  "framework": "elysia",
  "version": "1.0.0",
  "timestamp": "2026-10-26T15:40:00.000Z"
}

# 2. Query DynamoDB Single-Table via Function URL
$ curl -s https://ofxtuegfgi6kqg4wfzfyuqu6be0mubmk.lambda-url.ap-south-1.on.aws/documents
{
  "count": 10,
  "documents": [
    { "id": "doc-001", "patientId": "pt-4821", "title": "Cardiology Consultation Note", "status": "processed" },
    { "id": "doc-002", "patientId": "pt-9104", "title": "Neurology Discharge Summary", "status": "processed" }
  ]
}

# 3. Retrieve S3 Document Body & Extracted Clinical NER Entities
$ curl -s https://ofxtuegfgi6kqg4wfzfyuqu6be0mubmk.lambda-url.ap-south-1.on.aws/documents/doc-001
{
  "id": "doc-001",
  "source": "s3://prod-ehr-documents-583489814421/documents/doc-001.txt",
  "entitiesExtracted": 10,
  "relationshipsMapped": 7,
  "omopCdmExported": true
}`;

  return (
    <section id="showcase" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-t border-slate-200 dark:border-[#232736]">
      {/* Section Header */}
      <div className="text-center space-y-4 mb-16">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-purple-200 dark:border-purple-500/30 bg-purple-50 dark:bg-purple-950/30 text-xs font-semibold text-purple-700 dark:text-purple-300 shadow-sm">
          <Layers className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
          <span>PROVEN IN LIVE</span>
          <span className="text-slate-400 dark:text-neutral-500">&bull;</span>
          <span className="text-slate-600 dark:text-neutral-400">HIPAA Clinical Pipeline</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Real-World Showcase:{" "}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 dark:from-purple-400 dark:via-indigo-400 dark:to-cyan-400 bg-clip-text text-transparent">
            EHR Annotation Platform
          </span>
        </h2>

        <p className="max-w-3xl mx-auto text-base sm:text-lg text-slate-600 dark:text-neutral-400 leading-relaxed">
          How the live HIPAA-compliant <strong className="text-slate-900 dark:text-white font-semibold">EHR Annotation Platform</strong>—a
          clinical extraction and OMOP Common Data Model pipeline—migrated from a 350+ line legacy AWS SAM template to
          Syncploy with <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero downtime</span>,{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero stateful replacements</span>, and{" "}
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">zero data loss</span>.
        </p>

        {/* Live Status Pill */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <a
            href="https://ehr-backend-frontend.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 text-xs font-semibold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-sm hover:scale-105 group"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live App: ehr-backend-frontend.vercel.app</span>
            <ExternalLink className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </a>

          <a
            href="https://github.com/harsh-vardhhan/EHR-backend"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] text-xs font-medium text-slate-700 dark:text-neutral-300 hover:bg-slate-50 dark:hover:bg-[#1A1D28] transition-colors shadow-xs"
          >
            <Github className="h-3.5 w-3.5" />
            <span>GitHub Repository</span>
          </a>
        </div>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Layers className="h-4 w-4" />
            <span>Scale</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">11 Services</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            DynamoDB, S3, SQS, SNS, Firehose, Cognito, SageMaker, CloudWatch, Lambda
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/30 dark:bg-emerald-950/10 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Data Safety</span>
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400">0 Replaced</div>
          <div className="text-xs text-slate-600 dark:text-neutral-400 mt-1">
            100% preservation of DynamoDB tables & S3 ObjectLock compliance buckets
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Terminal className="h-4 w-4" />
            <span>Ergonomics</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">43% Less Code</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            350+ lines of brittle SAM YAML macros collapsed into ~200 lines of TypeScript
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-sm">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Activity className="h-4 w-4" />
            <span>Performance</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 dark:text-white">&lt;50ms</div>
          <div className="text-xs text-slate-500 dark:text-neutral-400 mt-1">
            Sub-50ms cold starts via Bun/Elysia container with direct Function URL ingress
          </div>
        </div>
      </div>

      {/* Main Interactive Showcase Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#12141C] shadow-xl overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 dark:border-[#232736] bg-slate-50/80 dark:bg-[#0E1017] px-4 sm:px-6 py-3 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("architecture")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "architecture"
                  ? "bg-white dark:bg-[#1A1D28] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-[#2E3447]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              1. Cloud Topology
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "code"
                  ? "bg-white dark:bg-[#1A1D28] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-[#2E3447]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              2. TypeScript Infra
            </button>
            <button
              onClick={() => setActiveTab("diff")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "diff"
                  ? "bg-white dark:bg-[#1A1D28] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-[#2E3447]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              3. Zero-Replacement Diff
            </button>
            <button
              onClick={() => setActiveTab("api")}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                activeTab === "api"
                  ? "bg-white dark:bg-[#1A1D28] text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-[#2E3447]"
                  : "text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              4. Live Endpoint Query
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 dark:text-neutral-400 font-mono">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span>Stack: ehr-annotation-backend</span>
          </div>
        </div>

        {/* Tab Content Panes */}
        <div className="p-6 sm:p-8">
          {activeTab === "architecture" && (
            <div className="space-y-6">
              {/* Architecture Blueprint Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#232736] bg-slate-50/50 dark:bg-[#151823] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
                    <Server className="h-4 w-4 text-indigo-500" />
                    <span>Ingress & Compute</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Elysia.js API running on AWS Lambda with public Function URL, native CORS, and container runtime.
                    Replaces API Gateway while reducing latency and cost to zero when idle.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                    Construct: EhrBackendFunction
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#232736] bg-slate-50/50 dark:bg-[#151823] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
                    <Database className="h-4 w-4 text-emerald-500" />
                    <span>Stateful Storage</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    Single-Table DynamoDB schema (<code className="text-indigo-500 font-mono text-[11px]">EhrTable</code>)
                    with secondary indexes (<code className="text-indigo-500 font-mono text-[11px]">SKIndex</code>, <code className="text-indigo-500 font-mono text-[11px]">GSI1Index</code>) and HIPAA WORM audit logs in S3 Object Lock.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    Retain Policy: 0 Data Loss
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 dark:border-[#232736] bg-slate-50/50 dark:bg-[#151823] space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white text-sm">
                    <Radio className="h-4 w-4 text-amber-500" />
                    <span>Pipelines & Circuit Breaker</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed">
                    SQS Queue & DLQ for SageMaker NER model inference, Kinesis Firehose for OMOP CDM clinical data lakes,
                    and CloudWatch Metric Math alarm triggering an automated DDoS kill-switch.
                  </p>
                  <div className="pt-2 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    Alarms: EhrLambdaTrafficAlarm
                  </div>
                </div>
              </div>

              {/* Interactive Mermaid Architecture Flowchart */}
              <div className="rounded-2xl border border-slate-200 dark:border-[#232736] bg-slate-50/70 dark:bg-[#0B0E17] p-4 sm:p-6 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-[#1E2433] pb-3 mb-4 text-xs font-mono text-slate-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-neutral-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Interactive Cloud Architecture Flowchart
                  </span>
                  <span className="text-[11px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Mermaid Rendered Live</span>
                </div>
                <Mermaid chart={mermaidChart} />
              </div>
            </div>
          )}

          {activeTab === "code" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center justify-between">
                <span>Infrastructure-from-Code declarations with exact logical IDs and compiler safety rails:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">TypeScript</span>
              </div>
              <CodeBlock code={tsSnippet} language="typescript" filename="packages/shared/src/infra.ts" />
            </div>
          )}

          {activeTab === "diff" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center justify-between">
                <span>Automated pre-flight diff comparing synthesized CloudFormation against the live AWS ChangeSet:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400">--check-replacement</span>
              </div>
              <CodeBlock code={diffOutput} language="bash" filename="syncploy diff output" />
            </div>
          )}

          {activeTab === "api" && (
            <div className="space-y-4">
              <div className="text-xs text-slate-600 dark:text-neutral-400 flex items-center justify-between">
                <span>Live production verification against the deployed Lambda Function URL in AWS ap-south-1:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">Live Endpoint Test</span>
              </div>
              <CodeBlock code={apiVerification} language="bash" filename="curl live tests" />
            </div>
          )}
        </div>

        {/* Action Bottom Bar */}
        <div className="border-t border-slate-200 dark:border-[#232736] bg-slate-50/50 dark:bg-[#0E1017] p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-600 dark:text-neutral-400 text-center sm:text-left">
            <strong className="text-slate-900 dark:text-white font-semibold">Ready to see the full breakdown?</strong>{" "}
            Read about zero-replacement AST parsing, ChangeSet audits, and automated least-privilege policies.
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <a
              href="https://ehr-backend-frontend.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-emerald-300 dark:border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold transition-all shadow-xs"
            >
              <span>Launch Live App</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            <Link
              href="/docs/ehr-backend-case-study"
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold transition-all shadow-md shadow-indigo-600/20"
            >
              <span>Read Full Case Study</span>
              <ArrowRight className="h-4 w-4" />
            </Link>

            <a
              href="https://github.com/harsh-vardhhan/EHR-backend"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-[#232736] bg-white dark:bg-[#1A1D28] hover:bg-slate-100 dark:hover:bg-[#232736] text-slate-800 dark:text-white text-xs sm:text-sm font-medium transition-colors shadow-xs"
            >
              <Github className="h-4 w-4" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
