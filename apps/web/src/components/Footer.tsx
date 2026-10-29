import React from "react";
import Link from "next/link";
import { Terminal, Github, Bot } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-[#232736] bg-slate-50 dark:bg-[#090A0F] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-sm">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white">Syncploy</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-neutral-400 leading-relaxed">
              Infrastructure-from-Code Compiler and Runtime SDK for Pure AWS Serverless in TypeScript.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Core Constructs</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-neutral-400">
              <li><Link href="/docs/construct-auth" className="hover:text-slate-900 dark:hover:text-white transition-colors">Cognito Auth</Link></li>
              <li><Link href="/docs/construct-table" className="hover:text-slate-900 dark:hover:text-white transition-colors">DynamoDB Table</Link></li>
              <li><Link href="/docs/construct-bucket" className="hover:text-slate-900 dark:hover:text-white transition-colors">S3 Storage</Link></li>
              <li><Link href="/docs/construct-queue" className="hover:text-slate-900 dark:hover:text-white transition-colors">SQS & DLQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Compiler & Safety</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-neutral-400">
              <li><Link href="/docs/safety-rails" className="hover:text-slate-900 dark:hover:text-white transition-colors">Infinite Loop Shield</Link></li>
              <li><Link href="/docs/safety-rails" className="hover:text-slate-900 dark:hover:text-white transition-colors">Denial of Wallet Audits</Link></li>
              <li><Link href="/docs/security" className="hover:text-slate-900 dark:hover:text-white transition-colors">Security & Supply Chain</Link></li>
              <li><Link href="/docs/brownfield-adoption" className="hover:text-slate-900 dark:hover:text-white transition-colors">Brownfield Adoption</Link></li>
              <li><Link href="/docs/ehr-backend-case-study" className="hover:text-slate-900 dark:hover:text-white transition-colors">EHR Case Study</Link></li>
              <li><Link href="/docs/cli-reference" className="hover:text-slate-900 dark:hover:text-white transition-colors">Least-Privilege IAM</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wider mb-3">Ecosystem</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-neutral-400">
              <li>
                <a href="https://github.com/harsh-vardhhan/syncploy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
                  <Github className="h-4 w-4" /> GitHub Repository
                </a>
              </li>
              <li>
                <a
                  href="https://www.npmjs.com/package/@syncploy/sdk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <svg className="h-3.5 w-3.5 fill-[#CB3837] shrink-0" viewBox="0 0 24 24" role="img"><title>npm</title><path d="M1.763 0C.786 0 0 .786 0 1.763v20.474C0 23.214.786 24 1.763 24h20.474c.977 0 1.763-.786 1.763-1.763V1.763C24 .786 23.214 0 22.237 0zM5.13 5.323l13.837.019-.009 13.836h-3.464l.01-10.382h-3.456L12.04 19.17H5.113z"/></svg>
                  <span>npm: @syncploy/sdk (v0.1.7)</span>
                </a>
              </li>
              <li>
                <a href="/llms.txt" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 font-mono text-xs">
                  <Bot className="h-3.5 w-3.5 text-indigo-500" />
                  <span>/llms.txt (AI Docs)</span>
                </a>
              </li>
              <li>
                <a href="/llms-full.txt" target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1.5 font-mono text-xs">
                  <Bot className="h-3.5 w-3.5 text-indigo-500" />
                  <span>/llms-full.txt (Full Bundle)</span>
                </a>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-mono">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Public Alpha Stage (v0.1.x)
                </span>
              </li>
              <li>
                <span className="text-xs text-slate-500 dark:text-neutral-500">MIT Licensed &bull; Open Source</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-[#232736] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-neutral-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Syncploy. Designed for AWS Serverless Engineers.</p>
          <p className="font-mono">Pure AWS Serverless Standard</p>
        </div>
        <div className="mt-4 text-[11px] text-slate-400 dark:text-neutral-500 text-center sm:text-left">
          * Terraform is a registered trademark of HashiCorp, Inc. Syncploy is an independent open-source project and is not affiliated with or endorsed by HashiCorp.
        </div>
      </div>
    </footer>
  );
}
