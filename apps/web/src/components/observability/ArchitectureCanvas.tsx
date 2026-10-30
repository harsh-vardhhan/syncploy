"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ServiceNode } from "./ServiceNode";
import { NodeDetailDrawer } from "./NodeDetailDrawer";
import { INITIAL_NODES, INITIAL_EDGES, EHR_TELEMETRY } from "./ehr-data";
import type { ServiceNodeData } from "./types";
import {
  Activity,
  Maximize2,
  RefreshCw,
  ShieldCheck,
  Zap,
  DollarSign,
  Layers,
  Sparkles,
} from "lucide-react";

interface ArchitectureCanvasProps {
  mode?: "showcase" | "desktop";
  className?: string;
}

const nodeTypes = {
  serviceNode: ServiceNode,
};

export function ArchitectureCanvas({
  mode = "showcase",
  className = "",
}: ArchitectureCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, _setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("api-ingress");
  const [isLiveActive, setIsLiveActive] = useState<boolean>(true);
  const [lastHeartbeat, setLastHeartbeat] = useState<string>("Just now");

  // Simulated live telemetry heartbeat for public showcase
  useEffect(() => {
    if (!isLiveActive) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      setLastHeartbeat(timeStr);

      setNodes((currentNodes) =>
        currentNodes.map((n) => {
          const serviceData = n.data as ServiceNodeData;
          const updatedMetrics = { ...serviceData.metrics };

          // Micro-fluctuations for realistic live telemetry
          if (serviceData.serviceType === "api" && updatedMetrics.latencyMs) {
            const jitter = Math.floor(Math.random() * 7) - 3;
            updatedMetrics.latencyMs = Math.max(19, 28 + jitter);
          } else if (serviceData.serviceType === "worker" && updatedMetrics.latencyMs) {
            const jitter = Math.floor(Math.random() * 21) - 10;
            updatedMetrics.latencyMs = Math.max(380, 420 + jitter);
          }

          return {
            ...n,
            data: {
              ...serviceData,
              metrics: updatedMetrics,
            },
          };
        })
      );
    }, 3500);

    return () => clearInterval(interval);
  }, [isLiveActive, setNodes]);

  const selectedNodeData = useMemo<ServiceNodeData | null>(() => {
    if (!selectedNodeId) return null;
    const foundNode = nodes.find((n) => n.id === selectedNodeId);
    return foundNode ? (foundNode.data as ServiceNodeData) : null;
  }, [selectedNodeId, nodes]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  return (
    <div className={`relative w-full h-full flex flex-col bg-zinc-950 select-none overflow-hidden ${className}`}>
      {/* Top Telemetry & Control Bar */}
      <div className="relative z-10 w-full bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Stack Title & Cloud Details */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-white font-mono tracking-tight">
                EHR-backend Architecture & Live Telemetry
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-semibold">
                ap-south-1
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono hidden sm:block">
              HIPAA-Ready Clinical Document Pipeline • 7 Managed Constructs
            </p>
          </div>
        </div>

        {/* Center: Live Spend & Health Metrics */}
        <div className="flex items-center gap-3 font-mono text-xs">
          {/* MTD Spend Pill */}
          <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">MTD Spend:</span>
            <span className="font-bold text-emerald-400">$0.42</span>
            <span className="text-[10px] text-zinc-500">/ $4.80 cap</span>
          </div>

          {/* Health Pill */}
          <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2 hidden md:flex">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">Health:</span>
            <span className="text-zinc-200 font-semibold">100% (7/7 Healthy)</span>
          </div>

          {/* Mode & Heartbeat Badge */}
          <div className="bg-zinc-900/90 border border-zinc-800 px-3 py-1.5 rounded-lg flex items-center gap-2 hidden lg:flex text-zinc-400">
            <Activity className="w-3.5 h-3.5 text-indigo-400" />
            <span>{mode === "desktop" ? "Local Console" : "Live Showcase"}</span>
            <span className="text-zinc-500 font-mono text-[10px]">({lastHeartbeat})</span>
          </div>
        </div>

        {/* Right: Actions & Live Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLiveActive(!isLiveActive)}
            type="button"
            className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-2 transition-all ${
              isLiveActive
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <span className="relative flex h-2 w-2">
              {isLiveActive && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isLiveActive ? "bg-emerald-500" : "bg-zinc-500"
                }`}
              />
            </span>
            <span>{isLiveActive ? "LIVE TELEMETRY" : "PAUSED"}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 w-full h-[calc(100vh-65px)] min-h-[600px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.3}
          maxZoom={1.8}
          proOptions={{ hideAttribution: true }}
          className="bg-zinc-950"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.5}
            color="#27272a"
          />

          <Controls
            className="!bg-zinc-900 !border-zinc-800 !shadow-xl !rounded-lg [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!text-zinc-300 hover:[&>button]:!bg-zinc-800 hover:[&>button]:!text-white"
          />

          <MiniMap
            nodeColor="#6366f1"
            maskColor="rgba(9, 9, 11, 0.7)"
            className="!bg-zinc-900/90 !border-zinc-800 !rounded-xl !overflow-hidden hidden sm:block"
          />
        </ReactFlow>

        {/* Floating Instructions Banner */}
        <div className="absolute bottom-6 left-6 z-10 pointer-events-none hidden md:block">
          <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-800/80 px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 font-mono text-xs text-zinc-400">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Click any node to inspect real CloudWatch metrics, logs, and compiler guardrails
            </span>
          </div>
        </div>

        {/* Selected Node Details Drawer */}
        <NodeDetailDrawer
          node={selectedNodeData}
          onClose={() => setSelectedNodeId(null)}
        />
      </div>
    </div>
  );
}
