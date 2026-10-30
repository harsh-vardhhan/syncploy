import React, { useState, useEffect } from "react";
import { ArchitectureCanvas } from "./components/observability/ArchitectureCanvas";
import {
  Terminal,
  ShieldCheck,
  Zap,
  FolderGit2,
  ExternalLink,
  Laptop,
  CheckCircle2,
  FileCode,
} from "lucide-react";

interface SystemInfo {
  platform: string;
  arch: string;
  nodeVersion: string;
  awsRegion: string;
  awsProfile: string;
  cwd: string;
  localOnly: boolean;
  dataRelay: string;
}

declare global {
  interface Window {
    syncployDesktop?: {
      getSystemInfo: () => Promise<SystemInfo>;
      openUrl: (url: string) => Promise<boolean>;
    };
  }
}

export function App() {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [activeStack, setActiveStack] = useState<string>("EHR-backend");

  useEffect(() => {
    if (window.syncployDesktop) {
      window.syncployDesktop.getSystemInfo().then(setSystemInfo).catch(console.error);
    } else {
      // Browser fallback for previewing
      setSystemInfo({
        platform: "darwin",
        arch: "arm64",
        nodeVersion: "v22.0.0",
        awsRegion: "ap-south-1",
        awsProfile: "default",
        cwd: "/Users/harshvardhan/Documents/GitHub/syncploy",
        localOnly: true,
        dataRelay: "0% — Direct local AWS credentials only",
      });
    }
  }, []);

  const openExternal = (url: string) => {
    if (window.syncployDesktop) {
      window.syncployDesktop.openUrl(url);
    } else {
      window.open(url, "_blank");
    }
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#090A0F] text-zinc-100 overflow-hidden font-sans select-none">
      {/* Mac Title Bar / App Bar */}
      <header className="h-11 bg-zinc-950 border-b border-zinc-800/80 px-4 flex items-center justify-between text-xs select-none">
        {/* Left: Window spacing for macOS traffic lights & App Title */}
        <div className="flex items-center gap-3 pl-16">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Terminal className="w-3 h-3" />
            </div>
            <span className="font-bold text-white font-mono tracking-tight">Syncploy Desktop</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
              v0.1.0
            </span>
          </div>

          <div className="h-4 w-px bg-zinc-800 mx-1" />

          {/* Stack Selector */}
          <div className="flex items-center gap-1.5 font-mono">
            <span className="text-zinc-500 text-[11px]">STACK:</span>
            <select
              value={activeStack}
              onChange={(e) => setActiveStack(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded px-2 py-0.5 focus:outline-none focus:border-indigo-500"
            >
              <option value="EHR-backend">EHR-backend (AWS Production)</option>
              <option value="Local Workspace">Local Workspace (app.ts)</option>
            </select>
          </div>
        </div>

        {/* Center: Zero-Cloud Privacy Guarantee */}
        <div className="hidden lg:flex items-center gap-2 font-mono text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Local-First (0% Telemetry Relay — Credentials stay on your machine)</span>
        </div>

        {/* Right: AWS Profile & Region Pill */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="bg-zinc-900/80 border border-zinc-800 px-2.5 py-0.5 rounded flex items-center gap-2 text-zinc-300 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>{systemInfo?.awsProfile || "default"}</span>
            <span className="text-zinc-500">({systemInfo?.awsRegion || "ap-south-1"})</span>
          </div>

          <button
            onClick={() => openExternal("https://syncploy.com/docs")}
            type="button"
            className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-800 transition-colors"
            title="Open Documentation"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Architecture & Telemetry Canvas */}
      <main className="flex-1 w-full h-[calc(100vh-44px)] relative bg-zinc-950">
        <ArchitectureCanvas mode="desktop" />
      </main>
    </div>
  );
}
export default App;
