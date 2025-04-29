/**
 * Compute the reuse count (ru) of a single arc (x,y) in R according to the
 * expanded Reusability (eRU) pseudocode.
 *
 * @param {string} x       - source vertex id of the arc
 * @param {string} y       - target vertex id of the arc
 * @param {RDLTModel} R    - the RDLT model
 * @returns {number}       - the ru count for (x,y)
 */
function RU(x, y, R) {
  // 1. Gather all simple cycles containing (x,y)
  const allCycles = findAllSimpleCycles(R);
  const cycles = allCycles.filter(cycle =>
    cycle.some(e => e.from === x && e.to === y)
  );
  if (cycles.length === 0) {
    return 0;
  }

  let ru = 0;
  let seenPCA = new Set();

  // helper: minimal-critical-arcs in a cycle
  function PCA_of_cycle(cycle) {
    // critical arcs = those arcs in cycle that are in‑ or out‑bridges of the RBS center
    const center = R.vertices.find(v => v.M === 1)?.id;
    if (!center) return [];
    const crits = cycle.filter(e => {
      const inB = R.inBridges(center).some(b => b.from === e.from && b.to === e.to);
      const outB = R.outBridges(center).some(b => b.from === e.from && b.to === e.to);
      return inB || outB;
    });
    if (crits.length === 0) return [];
    // pick those with minimum L
    const minL = Math.min(...crits.map(e => R.getEdge(e.from, e.to).L));
    return crits.filter(e => R.getEdge(e.from, e.to).L === minL);
  }

  for (let k = 0; k < cycles.length; k++) {
    const cycle = cycles[k];
    const pcas = PCA_of_cycle(cycle);
    if (pcas.length === 0) continue;
    const pick = pcas[0];
    const keySet = pcas.map(e => `${e.from}-${e.to}`);
    // 3. decide indicator
    const intersects = keySet.some(k => seenPCA.has(k));
    if (k === 0 || intersects) {
      const Luv = R.getEdge(pick.from, pick.to).L;
      ru += Luv;
      keySet.forEach(k => seenPCA.add(k));
    }
  }
  return ru;
}

/**
 * eRU(x,y,R): compute the expanded reuse eRU of (x,y) in R
 */
function eRU(x, y, R) {
  // 1) find RBS center
  const centers = R.vertices.filter(v => v.M === 1);
  if (centers.length === 0) {
    return RU(x, y, R);
  }
  const center = centers[0].id;
  // build RBS subgraph
  const B = RBS_subgraph(R, center); // { vertices: [], edges: [] }

  // helper: all cycles that partly lie inside B and partly outside
  function Cycles_part(R, B) {
    const allCycles = findAllSimpleCycles(R);
    return allCycles.filter(cycle => {
      let inside = false, outside = false;
      for (const e of cycle) {
        if (B.edges.some(be => be.from===e.from && be.to===e.to)) inside = true;
        else outside = true;
        if (inside && outside) return true;
      }
      return false;
    });
  }
  // helper: Build one PCA per cycle
  function Build_PCAs(R, B) {
    const pcaSet = new Set();
    for (const cycle of Cycles_part(R, B)) {
      const pcas = PCA_of_cycle(cycle);
      if (pcas.length > 0) {
        const e = pcas[0];
        pcaSet.add(`${e.from}-${e.to}`);
      }
    }
    return Array.from(pcaSet).map(k => {
      const [u,v] = k.split(`-`);
      return { from: u, to: v };
    });
  }

  // 2) if (x,y) is inside the RBS
  if (B.edges.some(e => e.from===x && e.to===y)) {
    const allPCAs = Build_PCAs(R, B);
    if (allPCAs.some(e => e.from===x && e.to===y)) {
      return R.getEdge(x, y).L;
    } else {
      // restrict R to B.edges
      const localR = R.restrictToEdges(B.edges);
      return RU(x, y, localR);
    }
  }

  // 3) (x,y) is outside the RBS
  const RUinside = RU(x, y, R.restrictToEdges(B.edges));
  const PCAs = Build_PCAs(R, B);

  let total = 0;
  // for each in‑bridge into the RBS center
  for (const br of R.inBridges(center)) {
    let found = false;
    for (const cycle of Cycles_part(R, B)) {
      if (cycle.some(e => e.from===br.from && e.to===br.to)
       && cycle.some(e => e.from===x    && e.to===y)) {
        found = true;
        break;
      }
    }
    let l_uv;
    if (found) {
      // pick the PCA on that same cycle
      const cyclePCAs = PCAs.filter(e =>
        cycle.some(ce => ce.from===e.from && ce.to===e.to)
      );
      const pca = cyclePCAs[0];
      l_uv = Math.min(
        R.getEdge(br.from, br.to).L,
        R.getEdge(pca.from, pca.to).L
      );
    } else {
      l_uv = 1;
    }
    total += l_uv * (RUinside + 1);
  }

  return total;
}

/**
 * Build a global map of eRU for every edge in R
 */
function buildErUMap(R) {
  const eRUMap = new Map();
  for (const e of R.edges) {
    eRUMap.set(`${e.from}-${e.to}`, eRU(e.from, e.to, R));
  }
  return eRUMap;
}
