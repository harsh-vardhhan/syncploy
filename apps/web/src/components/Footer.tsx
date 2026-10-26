import React from "react";
import Link from "next/link";
import { Terminal, Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-background/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <Terminal className="h-4 w-4" />
              </div>
              <span className="text-lg font-bold text-white">Syncploy</span>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Infrastructure-from-Code Compiler and Runtime SDK for Pure AWS Serverless in TypeScript.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Core Constructs</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="/docs/construct-auth" className="hover:text-white transition-colors">Cognito Auth</Link></li>
              <li><Link href="/docs/construct-table" className="hover:text-white transition-colors">DynamoDB Table</Link></li>
              <li><Link href="/docs/construct-bucket" className="hover:text-white transition-colors">S3 Storage</Link></li>
              <li><Link href="/docs/construct-queue" className="hover:text-white transition-colors">SQS & DLQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Compiler & Safety</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li><Link href="/docs/safety-rails" className="hover:text-white transition-colors">Infinite Loop Shield</Link></li>
              <li><Link href="/docs/safety-rails" className="hover:text-white transition-colors">Denial of Wallet Audits</Link></li>
              <li><Link href="/docs/brownfield-adoption" className="hover:text-white transition-colors">Brownfield Adoption</Link></li>
              <li><Link href="/docs/cli-reference" className="hover:text-white transition-colors">Least-Privilege IAM</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Ecosystem</h4>
            <ul className="space-y-2 text-sm text-neutral-400">
              <li>
                <a href="https://github.com/harsh-vardhhan/syncploy" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                  <Github className="h-4 w-4" /> GitHub Repository
                </a>
              </li>
              <li>
                <a href="https://www.npmjs.com/package/@syncploy/sdk" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  npm: @syncploy/sdk
                </a>
              </li>
              <li>
                <span className="text-xs text-neutral-500">MIT Licensed &bull; Open Source</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between text-xs text-neutral-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Syncploy. Designed for AWS Serverless Engineers.</p>
          <p className="font-mono">Clean 4 Serverless Standard</p>
        </div>
      </div>
    </footer>
  );
}
