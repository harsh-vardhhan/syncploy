import type { ResourceGraph, FunctionMutationsIR } from "../../types";
import type { ValidationContext } from "../types";

export function validateInfraRecursion(ctx: ValidationContext, graph: ResourceGraph): void {
  interface GraphEdge {
    target: string;
    constructId: string;
    sourceFile?: string | undefined;
  }

  const adj = new Map<string, GraphEdge[]>();

  const addEdge = (from: string, target: string, constructId: string, sourceFile?: string) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push({ target, constructId, sourceFile });
  };

  // A. Trigger Edges:
  for (const s of graph.tableStreams) {
    addEdge(`Table '${s.tableName}'`, `Stream Consumer '${s.id}'`, s.id, s.sourceFile);
  }

  for (const c of graph.consumers) {
    addEdge(`Queue '${c.queueName}'`, `Queue Consumer '${c.id}'`, c.id, c.sourceFile);
  }

  for (const sub of graph.topicSubscribers) {
    addEdge(`Topic '${sub.topicName}'`, `Topic Subscriber '${sub.id}'`, sub.id, sub.sourceFile);
  }

  for (const topic of graph.topics || []) {
    for (const sub of topic.subscriptions || []) {
      if (sub.protocol === "sqs") {
        const ep = sub.endpoint;
        const matchedQueue = graph.queues.find(
          (q) => q.name === ep || q.queueName === ep || q.id === ep
        );
        const queueNode = matchedQueue ? `Queue '${matchedQueue.name}'` : `Queue '${ep}'`;
        addEdge(`Topic '${topic.name}'`, queueNode, topic.id, topic.sourceFile);
      }
    }
  }

  for (const api of graph.apis) {
    addEdge(`API '${api.id}'`, `API Handler '${api.id}'`, api.id, api.sourceFile);
  }

  for (const b of graph.bindings || []) {
    const bucketNode = b.prefix
      ? `Bucket '${b.sourceBucketName}' [prefix: ${b.prefix}]`
      : `Bucket '${b.sourceBucketName}'`;
    addEdge(bucketNode, `Queue '${b.targetQueueName}'`, b.id);
  }

  for (const d of graph.deliveryStreams || []) {
    const bucketNode = d.prefix
      ? `Bucket '${d.destinationBucketName}' [prefix: ${d.prefix}]`
      : `Bucket '${d.destinationBucketName}'`;
    addEdge(`DeliveryStream '${d.name}'`, bucketNode, d.id, d.sourceFile);
  }

  // B. Mutation / Write Edges:
  const allFunctions: {
    id: string;
    nodeName: string;
    mutations?: FunctionMutationsIR | undefined;
    policies?: any[] | undefined;
    sourceFile?: string | undefined;
  }[] = [
    ...graph.tableStreams.map((s) => ({
      id: s.id,
      nodeName: `Stream Consumer '${s.id}'`,
      mutations: s.mutations,
      policies: s.policies,
      sourceFile: s.sourceFile,
    })),
    ...graph.consumers.map((c) => ({
      id: c.id,
      nodeName: `Queue Consumer '${c.id}'`,
      mutations: c.mutations,
      policies: c.policies,
      sourceFile: c.sourceFile,
    })),
    ...graph.topicSubscribers.map((sub) => ({
      id: sub.id,
      nodeName: `Topic Subscriber '${sub.id}'`,
      mutations: sub.mutations,
      policies: sub.policies,
      sourceFile: sub.sourceFile,
    })),
    ...graph.apis.map((api) => ({
      id: api.id,
      nodeName: `API Handler '${api.id}'`,
      mutations: api.mutations,
      policies: api.policies,
      sourceFile: api.sourceFile,
    })),
  ];

  for (const fn of allFunctions) {
    for (const tbl of fn.mutations?.tablesWritten || []) {
      addEdge(fn.nodeName, `Table '${tbl}'`, fn.id, fn.sourceFile);
    }
    for (const invokedApi of fn.mutations?.httpInvoked || []) {
      addEdge(fn.nodeName, `API '${invokedApi}'`, fn.id, fn.sourceFile);
    }
    for (const bktItem of fn.mutations?.bucketsWritten || []) {
      const bktName = typeof bktItem === "string" ? bktItem : bktItem.name;
      const writePrefix = typeof bktItem === "string" ? undefined : bktItem.prefix;

      const relevantBindings = (graph.bindings || []).filter((b) => b.sourceBucketName === bktName);

      if (relevantBindings.length === 0) {
        addEdge(fn.nodeName, `Bucket '${bktName}'`, fn.id, fn.sourceFile);
      } else {
        for (const b of relevantBindings) {
          const bindingNode = b.prefix
            ? `Bucket '${b.sourceBucketName}' [prefix: ${b.prefix}]`
            : `Bucket '${b.sourceBucketName}'`;

          // If both writePrefix and binding.prefix are defined, check for prefix overlap
          if (writePrefix && b.prefix) {
            const normWrite = writePrefix.endsWith("/") ? writePrefix : writePrefix + "/";
            const normBind = b.prefix.endsWith("/") ? b.prefix : b.prefix + "/";
            if (!normWrite.startsWith(normBind) && !normBind.startsWith(normWrite)) {
              // Disjoint prefixes: this write cannot trigger this binding!
              continue;
            }
          }

          addEdge(fn.nodeName, bindingNode, fn.id, fn.sourceFile);
        }
      }
    }
    for (const q of fn.mutations?.queuesSent || []) {
      addEdge(fn.nodeName, `Queue '${q}'`, fn.id, fn.sourceFile);
    }
    for (const top of fn.mutations?.topicsPublished || []) {
      addEdge(fn.nodeName, `Topic '${top}'`, fn.id, fn.sourceFile);
    }
    for (const d of fn.mutations?.deliveryStreamsWritten || []) {
      addEdge(fn.nodeName, `DeliveryStream '${d}'`, fn.id, fn.sourceFile);
    }

    if (fn.policies) {
      for (const stmt of fn.policies) {
        const acts: string[] = stmt.actions || [];
        const res: string[] = stmt.resources || [];

        if (
          acts.some(
            (a) =>
              a.startsWith("dynamodb:Put") ||
              a.startsWith("dynamodb:Update") ||
              a.startsWith("dynamodb:Delete") ||
              a.startsWith("dynamodb:BatchWrite")
          )
        ) {
          for (const t of graph.tables) {
            if (res.includes("*") || res.some((r) => r.includes(t.name) || (t.tableName && r.includes(t.tableName)))) {
              addEdge(fn.nodeName, `Table '${t.name}'`, fn.id, fn.sourceFile);
            }
          }
        }

        if (acts.some((a) => a === "sqs:SendMessage" || a === "sqs:SendMessageBatch")) {
          for (const q of graph.queues) {
            if (res.includes("*") || res.some((r) => r.includes(q.name) || (q.queueName && r.includes(q.queueName)))) {
              addEdge(fn.nodeName, `Queue '${q.name}'`, fn.id, fn.sourceFile);
            }
          }
        }

        if (acts.some((a) => a === "s3:PutObject" || a === "s3:PutObjectAcl")) {
          for (const b of graph.buckets) {
            if (res.includes("*") || res.some((r) => r.includes(b.name) || (b.bucketName && r.includes(b.bucketName)))) {
              const relevantBindings = (graph.bindings || []).filter((bin) => bin.sourceBucketName === b.name);
              if (relevantBindings.length === 0) {
                addEdge(fn.nodeName, `Bucket '${b.name}'`, fn.id, fn.sourceFile);
              } else {
                for (const bin of relevantBindings) {
                  const nodeName = bin.prefix
                    ? `Bucket '${bin.sourceBucketName}' [prefix: ${bin.prefix}]`
                    : `Bucket '${bin.sourceBucketName}'`;
                  addEdge(fn.nodeName, nodeName, fn.id, fn.sourceFile);
                }
              }
            }
          }
        }

        if (acts.some((a) => a === "sns:Publish")) {
          for (const top of graph.topics || []) {
            if (res.includes("*") || res.some((r) => r.includes(top.name) || (top.topicName && r.includes(top.topicName)))) {
              addEdge(fn.nodeName, `Topic '${top.name}'`, fn.id, fn.sourceFile);
            }
          }
        }

        if (acts.some((a) => a.startsWith("firehose:PutRecord"))) {
          for (const d of graph.deliveryStreams || []) {
            if (res.includes("*") || res.some((r) => r.includes(d.name) || (d.streamName && r.includes(d.streamName)))) {
              addEdge(fn.nodeName, `DeliveryStream '${d.name}'`, fn.id, fn.sourceFile);
            }
          }
        }
      }
    }
  }

  const seenCycles = new Set<string>();

  const normalizeCycle = (nodes: string[]): string => {
    const cycleNodes = nodes.slice(0, -1);
    let minIdx = 0;
    for (let i = 1; i < cycleNodes.length; i++) {
      if (cycleNodes[i]! < cycleNodes[minIdx]!) {
        minIdx = i;
      }
    }
    const rotated = [...cycleNodes.slice(minIdx), ...cycleNodes.slice(0, minIdx)];
    return rotated.join(" -> ");
  };

  const findCycles = (
    current: string,
    currentConstructId: string,
    currentSourceFile: string | undefined,
    currentPath: { node: string; constructId: string; sourceFile?: string | undefined }[]
  ) => {
    const cycleIndex = currentPath.findIndex((p) => p.node === current);
    if (cycleIndex !== -1) {
      const cycleSegment = currentPath.slice(cycleIndex).map((p) => p.node).concat(current);
      const normalized = normalizeCycle(cycleSegment);
      if (!seenCycles.has(normalized)) {
        seenCycles.add(normalized);
        const cycleStr = cycleSegment.join(" -> ");
        ctx.addError(
          "ERR_RECURSIVE_LOOP",
          currentConstructId,
          `Infinite recursion loop detected: ${cycleStr}. This event-driven cycle causes continuous self-amplifying Lambda invocations and exponential Denial-of-Wallet.`,
          currentSourceFile
        );
      }
      return;
    }

    if (currentPath.length >= 20) return; // Prevent runaway search depth on cyclic graphs

    const nextPath: { node: string; constructId: string; sourceFile?: string | undefined }[] = [
      ...currentPath,
      { node: current, constructId: currentConstructId, sourceFile: currentSourceFile },
    ];
    const neighbors = adj.get(current) || [];
    for (const edge of neighbors) {
      findCycles(edge.target, edge.constructId, edge.sourceFile, nextPath);
    }
  };

  for (const startNode of adj.keys()) {
    findCycles(startNode, startNode, undefined, []);
  }
}
