// preprocessor.js

/**
 * Preprocess the input RDLT model into two levels of vertex simplification.
 * Level-1: The overall (extended) RDLT containing vertices that are not inside any RBS,
 *          plus vertices inside an RBS only if they serve as in-bridges or out-bridges.
 *          All vertices are converted to type "c" and any "rbs" property is removed.
 * Level-2: For each reset-bound subsystem (RBS), the internal subgraph (with "rbs"
 *          property removed).
 *
 * Dummy source "i" and sink "o" (of type "c") are also added to the level-1 model.
 *
 * The expanded reusability for an abstract edge (from in-bridge u to out-bridge v)
 * is computed as the sum of L-values for all edges in the corresponding level-2 subgraph.
 *
 * @param {Object} rdltModel - The input RDLT model with properties:
 *   vertices: Array of vertex objects { id, type, label, ... (optional rbs) }
 *   edges: Array of edge objects { from, to, C, L }
 *   resetBound: Object mapping RBS id -> center vertex id
 *
 * @returns {Object} An object with two properties:
 *   level1: { vertices: [...], edges: [...] } (extended with dummy source and sink)
 *   level2: { [rbsID]: { vertices: [...], edges: [...] } }
 */
export function preprocessRDLT(rdltModel) {
  const vertices = rdltModel.vertices;
  const edges = rdltModel.edges;
  const resetBound = rdltModel.resetBound; // e.g. { "RBS1": "x2", ... }

  // --- Step 1: Identify all reset-bound subsystems (RBS) ---
  // For each RBS, perform a BFS over epsilon ("ϵ") edges starting from the center,
  // but only traverse to neighbors whose rbs property matches.
  const RBSmap = {};      // mapping: rbsID -> array of vertex ids in that RBS
  const vertexToRBS = {}; // mapping: vertex id -> rbsID
  for (const rbsID in resetBound) {
    const centerId = resetBound[rbsID];
    const subgraphVertexIds = bfsEpsilon(vertices, edges, centerId, rbsID);
    RBSmap[rbsID] = subgraphVertexIds;
    subgraphVertexIds.forEach(vId => {
      vertexToRBS[vId] = rbsID;
    });
  }

  // --- Step 2: Build Level-1 vertex set (V1) ---
  // Keep vertices that are not inside any RBS, or (if inside) are in-bridges or out-bridges.
  // Also, force each vertex's type to "c" and remove the "rbs" property.
  const V1 = [];
  vertices.forEach(vertex => {
    let vClone = { ...vertex, type: "c" };
    if ("rbs" in vClone) {
      delete vClone.rbs;
    }
    if (!(vertex.id in vertexToRBS)) {
      V1.push(vClone);
    } else if (isInOrOutBridge(vertex, RBSmap, edges, vertexToRBS)) {
      V1.push(vClone);
    }
    // Otherwise skip: vertex is internal to RBS and not a bridge.
  });

  // --- Step 3: Build Level-1 edge set (E1) ---
  // Keep edges whose both endpoints are in V1.
  // (Edges connecting vertices both inside the same RBS are handled in level-2.)
  const V1_ids = new Set(V1.map(v => v.id));
  const E1 = [];
  edges.forEach(edge => {
    if (V1_ids.has(edge.from) && V1_ids.has(edge.to)) {
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
  // For each RBS, determine the in-bridges and out-bridges, then enumerate simple
  // paths (inside the level-2 subgraph) for each inBridge-outBridge pair.
  // For each abstract edge, compute its L-value using the ComputeExpandedReusability logic:
  // Here, we compute the total L-value as the sum of all L values in the level-2 subgraph.
  for (const rbsID in RBSmap) {
    const rbsVertexIds = new Set(RBSmap[rbsID]);
    const inBridges = [];
    const outBridges = [];
    // Only consider vertices that truly belong to this RBS.
    vertices.forEach(vertex => {
      if (rbsVertexIds.has(vertex.id)) {
        if (isInBridge(vertex, rbsID, edges, vertexToRBS)) {
          inBridges.push(vertex);
        }
        if (isOutBridge(vertex, rbsID, edges, vertexToRBS)) {
          outBridges.push(vertex);
        }
      }
    });
    // Build the level-2 graph for this RBS.
    const level2Graph = {
      vertices: vertices
        .filter(v => v.rbs === rbsID)
        .map(v => {
          const { rbs, ...rest } = v;
          return { ...rest, type: "c" };
        }),
      edges: edges.filter(edge =>
        rbsVertexIds.has(edge.from) && rbsVertexIds.has(edge.to)
      )
    };
    // Compute the total expanded reusability for this RBS
    const totalRBS_L = computeExpandedReusability(level2Graph, resetBound[rbsID]);

    // For each inBridge-outBridge pair, enumerate simple paths.
    inBridges.forEach(inV => {
      outBridges.forEach(outV => {
        if (inV.id === outV.id) return;
        const paths = enumerateSimplePaths(level2Graph, inV.id, outV.id);
        // For each distinct path, add an abstract edge.
        // Instead of a fixed value, set L to totalRBS_L.
        paths.forEach(path => {
          E1.push({
            from: inV.id,
            to: outV.id,
            C: "ϵ",
            L: totalRBS_L,
            type: "abstract"
          });
        });
      });
    });
  }

  // --- Step 5: Construct Level-2 subgraphs for each RBS ---
  // For each RBS, level-2 subgraph includes vertices that originally had rbs equal to that rbsID,
  // and all edges whose both endpoints lie in that set.
  const level2 = {};
  for (const rbsID in RBSmap) {
    const subV = vertices
      .filter(v => v.rbs === rbsID)
      .map(v => {
        const { rbs, ...rest } = v;
        return { ...rest, type: "c" };
      });
    const subV_ids = new Set(subV.map(v => v.id));
    const subE = edges.filter(edge =>
      subV_ids.has(edge.from) && subV_ids.has(edge.to)
    );
    level2[rbsID] = { vertices: subV, edges: subE };
  }

  // --- Step 6: Extend Level-1 with dummy source and sink ---
  // Identify source vertices (no incoming edge in E1) and sink vertices (no outgoing edge in E1).
  const incomingCount = {};
  V1.forEach(v => (incomingCount[v.id] = 0));
  E1.forEach(edge => {
    if (incomingCount.hasOwnProperty(edge.to)) incomingCount[edge.to]++;
  });
  const sources = V1.filter(v => incomingCount[v.id] === 0);

  const outgoingCount = {};
  V1.forEach(v => (outgoingCount[v.id] = 0));
  E1.forEach(edge => {
    if (outgoingCount.hasOwnProperty(edge.from)) outgoingCount[edge.from]++;
  });
  const sinks = V1.filter(v => outgoingCount[v.id] === 0);

  // Create dummy vertices for source ("i") and sink ("o"), both of type "c".
  const dummySource = { id: "i", type: "c", label: "i" };
  const dummySink = { id: "o", type: "c", label: "o" };

  const extendedV1 = [...V1, dummySource, dummySink];

  // Create dummy edges: from "i" to each source and from each sink to "o".
  const dummyEdges = [];
  sources.forEach(v => {
    dummyEdges.push({ from: "i", to: v.id, C: "ϵ", L: 1 });
  });
  sinks.forEach(v => {
    dummyEdges.push({ from: v.id, to: "o", C: "x_o", L: 1 });
  });
  const extendedE1 = [...E1, ...dummyEdges];

  return {
    level1: {
      vertices: extendedV1,
      edges: extendedE1
    },
    level2: level2
  };
}

/**
 * Computes the expanded reusability (eRU) for a given graph.
 * This implementation follows the pseudocode:
 * 1. Initialize each arc’s eRU to its L value.
 * 2. Find all cycles in the graph. For each cycle:
 *    - If the cycle is not reset-bounded (i.e. it does not contain the reset center),
 *      set each arc’s eRU to Infinity.
 *    - Otherwise, add a fixed offset (e.g., 1) to the arc’s L value.
 * 3. Aggregate the eRU values of all edges (here, we sum them).
 *
 * @param {Object} graph - An object with properties: vertices and edges.
 *                         Each edge is an object with { from, to, L, ... }.
 * @param {string} centerId - The id of the reset-bound center vertex for the RBS.
 * @returns {number} The aggregated expanded reusability value.
 */
export function computeExpandedReusability(graph, centerId) {
  // Step 1: Initialize eRU for each edge to its L value.
  const eRUMap = new Map();
  for (let edge of graph.edges) {
    const key = `${edge.from}->${edge.to}`;
    eRUMap.set(key, edge.L);
  }

  // Step 2: Find all cycles in the graph using Tarjan's algorithm.
  const cycles = findAllCycles(graph); // cycles: array of cycles, each a list of edge objects.
  for (let cycle of cycles) {
    // Collect all vertices that appear in the cycle.
    let verticesInCycle = new Set();
    for (let edge of cycle) {
      verticesInCycle.add(edge.from);
      verticesInCycle.add(edge.to);
    }
    // Determine if the cycle is reset-bounded by checking if it contains the center.
    const isResetBounded = verticesInCycle.has(centerId);
    for (let edge of cycle) {
      const key = `${edge.from}->${edge.to}`;
      let current = eRUMap.get(key);
      if (!isResetBounded) {
        // If not reset-bounded, mark this arc as having unbounded reuse.
        eRUMap.set(key, Infinity);
      } else {
        // If reset-bounded, add a fixed offset (e.g., 1) to the basic L value.
        eRUMap.set(key, current + 1);
      }
    }
  }

  // Step 3: Aggregate the eRU values over all edges.
  let total = 0;
  for (let value of eRUMap.values()) {
    if (!isFinite(value)) {
      return Infinity;
    }
    total += value;
  }
  return total;
}

/**
 * Implements cycle detection using Tarjan's algorithm.
 * Returns an array of cycles. Each cycle is represented as an array of edge objects
 * that are entirely contained within a strongly connected component (SCC) of more than one vertex,
 * or that form a self-loop.
 *
 * @param {Object} graph - An object with properties: vertices and edges.
 * @returns {Array} Array of cycles (each cycle is an array of edge objects).
 */
function findAllCycles(graph) {
  const indexMap = new Map(); // vertex -> index
  const lowlinkMap = new Map(); // vertex -> lowlink
  const indexCounter = { value: 0 };
  const stack = [];
  const onStack = new Set();
  const SCCs = [];
  
  // Build an adjacency list: vertex id -> list of outgoing edges
  const adj = new Map();
  for (let v of graph.vertices) {
    adj.set(v.id, []);
  }
  for (let edge of graph.edges) {
    if (adj.has(edge.from)) {
      adj.get(edge.from).push(edge);
    }
  }
  
  function strongconnect(vId) {
    indexMap.set(vId, indexCounter.value);
    lowlinkMap.set(vId, indexCounter.value);
    indexCounter.value++;
    stack.push(vId);
    onStack.add(vId);
    
    // Consider successors of v
    const outEdges = adj.get(vId) || [];
    for (let edge of outEdges) {
      const wId = edge.to;
      if (!indexMap.has(wId)) {
        // Successor w has not yet been visited; recurse on it.
        strongconnect(wId);
        lowlinkMap.set(vId, Math.min(lowlinkMap.get(vId), lowlinkMap.get(wId)));
      } else if (onStack.has(wId)) {
        // Successor w is in stack and hence in the current SCC.
        lowlinkMap.set(vId, Math.min(lowlinkMap.get(vId), indexMap.get(wId)));
      }
    }
    
    // If v is a root node, pop the stack and generate an SCC.
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
  
  // Run Tarjan's algorithm.
  for (let v of graph.vertices) {
    if (!indexMap.has(v.id)) {
      strongconnect(v.id);
    }
  }
  
  // From each SCC, if it contains more than one vertex or a self-loop,
  // collect all edges that lie completely within the SCC as a cycle.
  const cycles = [];
  const sccSet = new Set(); // To avoid duplicate cycles, we use SCCs that meet criteria.
  for (let scc of SCCs) {
    if (scc.length > 1) {
      // Collect edges within this SCC.
      const cycleEdges = graph.edges.filter(edge =>
        scc.includes(edge.from) && scc.includes(edge.to)
      );
      cycles.push(cycleEdges);
    } else {
      // For singleton SCCs, check for a self-loop.
      const vId = scc[0];
      const selfLoopEdges = graph.edges.filter(edge =>
        edge.from === vId && edge.to === vId
      );
      if (selfLoopEdges.length > 0) {
        cycles.push(selfLoopEdges);
      }
    }
  }
  return cycles;
}


/**
 * Performs an undirected BFS over edges with C === "ϵ" starting from startId,
 * but only visits neighbors that have rbs equal to the provided rbsID.
 *
 * @param {Array} vertices - The list of vertices.
 * @param {Array} edges - The list of edges.
 * @param {string} startId - The starting vertex id.
 * @param {string} rbsID - The RBS id to restrict traversal.
 * @returns {Array} Array of vertex ids visited that have rbs === rbsID.
 */
function bfsEpsilon(vertices, edges, startId, rbsID) {
  const visited = new Set();
  const queue = [startId];
  visited.add(startId);
  while (queue.length > 0) {
    const current = queue.shift();
    edges.forEach(edge => {
      if (edge.C === "ϵ") {
        if (edge.from === current) {
          const neighbor = vertices.find(v => v.id === edge.to);
          if (neighbor && neighbor.rbs === rbsID && !visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor.id);
          }
        }
        if (edge.to === current) {
          const neighbor = vertices.find(v => v.id === edge.from);
          if (neighbor && neighbor.rbs === rbsID && !visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor.id);
          }
        }
      }
    });
  }
  return Array.from(visited);
}

/**
 * Determines whether a vertex is an in-bridge.
 * A vertex is an in-bridge if it has at least one incoming edge from a vertex
 * that is not in the same RBS.
 *
 * @param {Object} vertex - The vertex object.
 * @param {string} rbsID - The RBS id.
 * @param {Array} edges - The list of edges.
 * @param {Object} vertexToRBS - Mapping from vertex id to rbsID.
 * @returns {boolean}
 */
function isInBridge(vertex, rbsID, edges, vertexToRBS) {
  return edges.some(edge => {
    return edge.to === vertex.id &&
      (!vertexToRBS[edge.from] || vertexToRBS[edge.from] !== rbsID);
  });
}

/**
 * Determines whether a vertex is an out-bridge.
 * A vertex is an out-bridge if it has at least one outgoing edge to a vertex
 * that is not in the same RBS.
 *
 * @param {Object} vertex - The vertex object.
 * @param {string} rbsID - The RBS id.
 * @param {Array} edges - The list of edges.
 * @param {Object} vertexToRBS - Mapping from vertex id to rbsID.
 * @returns {boolean}
 */
function isOutBridge(vertex, rbsID, edges, vertexToRBS) {
  return edges.some(edge => {
    return edge.from === vertex.id &&
      (!vertexToRBS[edge.to] || vertexToRBS[edge.to] !== rbsID);
  });
}

/**
 * Checks whether a vertex (inside an RBS) is either an in-bridge or out-bridge.
 *
 * @param {Object} vertex - The vertex object.
 * @param {Object} RBSmap - Mapping from rbsID to array of vertex ids.
 * @param {Array} edges - The list of edges.
 * @param {Object} vertexToRBS - Mapping from vertex id to rbsID.
 * @returns {boolean}
 */
function isInOrOutBridge(vertex, RBSmap, edges, vertexToRBS) {
  const rbsID = vertexToRBS[vertex.id];
  if (!rbsID) return false;
  return isInBridge(vertex, rbsID, edges, vertexToRBS) ||
         isOutBridge(vertex, rbsID, edges, vertexToRBS);
}

/**
 * Enumerate all simple paths (no repeated vertices) in a graph from startId to endId.
 *
 * @param {Object} graph - An object with properties:
 *   vertices: Array of vertices (each with an id)
 *   edges: Array of edges { from, to, C, L }
 * @param {string} startId - Starting vertex id.
 * @param {string} endId - Ending vertex id.
 * @returns {Array} An array of paths, where each path is an array of vertex ids.
 */
function enumerateSimplePaths(graph, startId, endId) {
  const paths = [];
  function dfs(current, visited, path) {
    if (current === endId) {
      paths.push([...path]);
      return;
    }
    graph.edges.forEach(edge => {
      if (edge.from === current && !visited.has(edge.to)) {
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
