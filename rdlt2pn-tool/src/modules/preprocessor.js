// src/modules/preprocessor.js

import { RDLTModel } from '../models/rdltModel.js';

/*
  preprocessRDLT now expects an RDLTModel instance as input.
  It uses the graph-based operations provided by RDLTModel for efficient processing.
*/
export function preprocessRDLT(rdltGraph) {
  // Get all nodes (vertices) and edges from the graph.
  const vertices = Object.values(rdltGraph.nodes);
  const edges = rdltGraph.edges;

  // --- Step 1: Identify all reset-bound subsystems (RBS) ---
  // A node with M === 1 is treated as an RBS center.
  // For each such center, perform a BFS (using rdltGraph.bfsEpsilon) to collect all node IDs reachable via epsilon ("ϵ") edges.
  const RBSmap = {};      // Mapping: center id -> array of node ids in that RBS
  const vertexToRBS = {}; // Mapping: node id -> center id (if the node is in an RBS)
  vertices.forEach(node => {
    if (node.M === 1) {
      const centerId = node.id;
      const subgraphNodeIds = rdltGraph.bfsEpsilon(centerId);
      RBSmap[centerId] = subgraphNodeIds;
      subgraphNodeIds.forEach(id => {
        vertexToRBS[id] = centerId;
      });
    }
  });

  // --- Step 2: Build Level-1 vertex set (V1) ---
  // Include nodes that are not in any RBS, or if in a RBS, only if they serve as in-bridges or out-bridges.
  // Also, reset their M attribute to 0 and set type to "c".
  const V1 = [];
  vertices.forEach(node => {
    let clone = { ...node, type: "c", M: 0, isInBridge: false, isOutBridge: false };
    if (node.id in vertexToRBS) {
      const rbsCenter = vertexToRBS[node.id];
      clone.isInBridge = isInBridge(node, rbsCenter, vertexToRBS);
      clone.isOutBridge = isOutBridge(node, rbsCenter, vertexToRBS);
    }
    // Include node if it's not in any RBS, or if it qualifies as a bridge.
    if (!(node.id in vertexToRBS) || clone.isInBridge || clone.isOutBridge) {
      V1.push(clone);
    }
  });

  // --- Step 3: Build Level-1 edge set (E1) ---
  // Keep only edges whose both endpoints are in V1.
  const V1_ids = new Set(V1.map(n => n.id));
  const E1 = [];
  edges.forEach(edge => {
    if (V1_ids.has(edge.from) && V1_ids.has(edge.to)) {
      // If both endpoints belong to the same RBS, skip this edge.
      if (
        (edge.from in vertexToRBS) &&
        (edge.to in vertexToRBS) &&
        vertexToRBS[edge.from] === vertexToRBS[edge.to]
      ) {
        return;
      }
      E1.push({ ...edge });
    }
  });

  // --- Step 4: Add abstract (bridge) edges for each RBS ---
  for (const centerId in RBSmap) {
    const rbsNodeIds = new Set(RBSmap[centerId]);
    const inBridges = [];
    const outBridges = [];
    // Identify in-bridges and out-bridges in the RBS.
    vertices.forEach(node => {
      if (rbsNodeIds.has(node.id)) {
        if (isInBridge(node, centerId, vertexToRBS)) {
          node.isInBridge = true;
          inBridges.push(node);
        }
        if (isOutBridge(node, centerId, vertexToRBS)) {
          node.isOutBridge = true;
          outBridges.push(node);
        }
      }
    });
    // Build the level-2 graph for this RBS.
    const level2Graph = new RDLTModel();
    rbsNodeIds.forEach(id => {
      const orig = rdltGraph.getNode(id);
      level2Graph.addNode({ ...orig, type: "c", M: 0 });
    });
    edges.forEach(edge => {
      if (rbsNodeIds.has(edge.from) && rbsNodeIds.has(edge.to)) {
        level2Graph.addEdge({ ...edge });
      }
    });
    // Compute the total expanded reusability for the RBS.
    const totalRBS_L = computeExpandedReusabilityGraph(level2Graph, centerId);
    // For each inBridge-outBridge pair, enumerate simple paths and add an abstract edge for each.
    inBridges.forEach(inNode => {
      outBridges.forEach(outNode => {
        if (inNode.id === outNode.id) return;
        const paths = enumerateSimplePathsGraph(level2Graph, inNode.id, outNode.id);
        paths.forEach(path => {
          E1.push({
            from: inNode.id,
            to: outNode.id,
            C: "ϵ",
            L: totalRBS_L,
            type: "abstract"
          });
        });
      });
    });
  }

  // --- Step 5: Construct Level-2 subgraphs for each RBS ---
  const level2 = {};
  for (const centerId in RBSmap) {
    const subModel = new RDLTModel();
    const nodeIds = RBSmap[centerId];
    nodeIds.forEach(id => {
      const orig = rdltGraph.getNode(id);
      subModel.addNode({ ...orig, type: "c", M: 0 });
    });
    subModel.edges = edges.filter(edge =>
      nodeIds.includes(edge.from) && nodeIds.includes(edge.to)
    );
    level2[centerId] = subModel;
  }

  // --- Step 6: Extend Level-1 with dummy source and sink ---
  const incomingCount = {};
  V1.forEach(n => { incomingCount[n.id] = 0; });
  E1.forEach(edge => {
    if (incomingCount.hasOwnProperty(edge.to)) incomingCount[edge.to]++;
  });
  const sources = V1.filter(n => incomingCount[n.id] === 0);

  const outgoingCount = {};
  V1.forEach(n => { outgoingCount[n.id] = 0; });
  E1.forEach(edge => {
    if (outgoingCount.hasOwnProperty(edge.from)) outgoingCount[edge.from]++;
  });
  const sinks = V1.filter(n => outgoingCount[n.id] === 0);

  const dummySource = { id: "i", type: "c", label: "i", M: 0 };
  const dummySink = { id: "o", type: "c", label: "o", M: 0 };

  const extendedV1 = [...V1, dummySource, dummySink];

  const dummyEdges = [];
  sources.forEach(n => {
    dummyEdges.push({ from: "i", to: n.id, C: "ϵ", L: 1 });
  });
  sinks.forEach(n => {
    dummyEdges.push({ from: n.id, to: "o", C: "x_o", L: 1 });
  });
  const extendedE1 = [...E1, ...dummyEdges];

  // Build the level-1 graph as a new RDLTModel.
  const level1Graph = new RDLTModel();
  extendedV1.forEach(n => {
    level1Graph.addNode(n);
  });
  extendedE1.forEach(edge => {
    level1Graph.addEdge(edge);
  });

  return {
    level1: level1Graph,
    level2: level2
  };
}

/* --- Helper Functions (Graph-Based) --- */

// Checks if a node is an in-bridge within an RBS.
// A node is an in-bridge if it has at least one incoming edge from a node not in the same RBS.
function isInBridge(node, rbsCenter, vertexToRBS) {
  return node.incoming.some(edge => {
    return (!vertexToRBS[edge.from] || vertexToRBS[edge.from] !== rbsCenter);
  });
}

// Checks if a node is an out-bridge within an RBS.
// A node is an out-bridge if it has at least one outgoing edge to a node not in the same RBS.
function isOutBridge(node, rbsCenter, vertexToRBS) {
  return node.outgoing.some(edge => {
    return (!vertexToRBS[edge.to] || vertexToRBS[edge.to] !== rbsCenter);
  });
}

// Returns true if the node is either an in-bridge or an out-bridge.
function isInOrOutBridge(node, vertexToRBS) {
  const rbsCenter = vertexToRBS[node.id];
  if (!rbsCenter) return false;
  return isInBridge(node, rbsCenter, vertexToRBS) || isOutBridge(node, rbsCenter, vertexToRBS);
}

// Enumerates all simple paths (without repeated nodes) between startId and endId using DFS.
function enumerateSimplePathsGraph(model, startId, endId) {
  const paths = [];
  function dfs(current, visited, path) {
    if (current === endId) {
      paths.push([...path]);
      return;
    }
    const node = model.getNode(current);
    if (!node || !node.outgoing) return;
    node.outgoing.forEach(edge => {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        path.push(edge.to);
        dfs(edge.to, visited, path);
        path.pop();
        visited.delete(edge.to);
      }
    });
  }
  dfs(startId, new Set([startId]), [startId]);
  return paths;
}

// Computes the expanded reusability (eRU) for a given model.
// It initializes each edge's eRU to its L value, processes cycles using Tarjan's algorithm,
// and returns the aggregated total. If any edge is unbounded, returns Infinity.
function computeExpandedReusabilityGraph(model, centerId) {
  const eRUMap = new Map();
  model.edges.forEach(edge => {
    const key = `${edge.from}->${edge.to}`;
    eRUMap.set(key, edge.L);
  });

  const cycles = findAllCyclesGraph(model);
  cycles.forEach(cycle => {
    const verticesInCycle = new Set();
    cycle.forEach(edge => {
      verticesInCycle.add(edge.from);
      verticesInCycle.add(edge.to);
    });
    const isResetBounded = verticesInCycle.has(centerId);
    cycle.forEach(edge => {
      const key = `${edge.from}->${edge.to}`;
      let current = eRUMap.get(key);
      if (!isResetBounded) {
        eRUMap.set(key, Infinity);
      } else {
        eRUMap.set(key, current + 1);
      }
    });
  });

  let total = 0;
  for (let value of eRUMap.values()) {
    if (!isFinite(value)) return Infinity;
    total += value;
  }
  return total;
}

// Cycle detection using Tarjan's algorithm for an RDLTModel.
// Returns an array of cycles, where each cycle is represented as an array of edge objects.
function findAllCyclesGraph(model) {
  const nodesArr = Object.values(model.nodes);
  const indexMap = new Map();
  const lowlinkMap = new Map();
  const indexCounter = { value: 0 };
  const stack = [];
  const onStack = new Set();
  const SCCs = [];

  // Build an adjacency list: node id -> array of outgoing edges.
  const adj = new Map();
  nodesArr.forEach(node => {
    adj.set(node.id, node.outgoing);
  });

  function strongconnect(vId) {
    indexMap.set(vId, indexCounter.value);
    lowlinkMap.set(vId, indexCounter.value);
    indexCounter.value++;
    stack.push(vId);
    onStack.add(vId);

    const outEdges = adj.get(vId) || [];
    outEdges.forEach(edge => {
      const wId = edge.to;
      if (!indexMap.has(wId)) {
        strongconnect(wId);
        lowlinkMap.set(vId, Math.min(lowlinkMap.get(vId), lowlinkMap.get(wId)));
      } else if (onStack.has(wId)) {
        lowlinkMap.set(vId, Math.min(lowlinkMap.get(vId), indexMap.get(wId)));
      }
    });

    if (lowlinkMap.get(vId) === indexMap.get(vId)) {
      const scc = [];
      let w;
      do {
        w = stack.pop();
        onStack.delete(w);
        scc.push(w);
      } while (w !== vId);
      SCCs.push(scc);
    }
  }

  nodesArr.forEach(node => {
    if (!indexMap.has(node.id)) {
      strongconnect(node.id);
    }
  });

  // Extract cycles from SCCs.
  const cycles = [];
  SCCs.forEach(scc => {
    if (scc.length > 1) {
      const cycleEdges = model.edges.filter(edge =>
        scc.includes(edge.from) && scc.includes(edge.to)
      );
      cycles.push(cycleEdges);
    } else {
      const vId = scc[0];
      const selfLoopEdges = model.edges.filter(edge =>
        edge.from === vId && edge.to === vId
      );
      if (selfLoopEdges.length > 0) {
        cycles.push(selfLoopEdges);
      }
    }
  });
  return cycles;
}
