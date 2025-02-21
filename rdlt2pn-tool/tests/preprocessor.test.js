// tests/preprocessor.test.js
import { preprocessRDLT, computeExpandedReusability } from '../src/modules/preprocessor.js';

describe('preprocessRDLT - Single RBS and No RBS cases', () => {
  test('should process an RDLT with no RBS correctly', () => {
    const rdltInput = {
      vertices: [
        { id: "v1", type: "b", label: "Boundary" },
        { id: "v2", type: "c", label: "Controller" },
        { id: "v3", type: "e", label: "Entity" }
      ],
      edges: [
        { from: "v1", to: "v2", C: "a", L: 1 },
        { from: "v2", to: "v3", C: "b", L: 2 }
      ],
      resetBound: {}  // no RBS defined
    };

    const result = preprocessRDLT(rdltInput);
    // Level1 should include all vertices (converted to type "c" without rbs) + dummy nodes.
    expect(result.level1.vertices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "v1", type: "c", label: "Boundary" }),
        expect.objectContaining({ id: "v2", type: "c", label: "Controller" }),
        expect.objectContaining({ id: "v3", type: "c", label: "Entity" }),
        expect.objectContaining({ id: "i" }),
        expect.objectContaining({ id: "o" })
      ])
    );
    // Level2 should be empty.
    expect(result.level2).toEqual({});
  });

  test('should process an RDLT with a single RBS correctly', () => {
    const rdltInput = {
      vertices: [
        { id: "x1", type: "b", label: "x1" },
        { id: "y1", type: "c", label: "y1" },
        { id: "y2", type: "c", label: "y2" },
        { id: "y3", type: "c", label: "y3" },
        { id: "y4", type: "c", label: "y4", rbs: "RBS1" },
        { id: "y5", type: "c", label: "y5", rbs: "RBS1" },
        { id: "x2", type: "e", label: "x2", rbs: "RBS1" }
      ],
      edges: [
        { from: "x1", to: "y1", C: "a", L: 1 },
        { from: "x1", to: "y2", C: "b", L: 1 },
        { from: "y1", to: "x2", C: "ϵ", L: 2 },
        { from: "x2", to: "y5", C: "ϵ", L: 1 },
        { from: "x2", to: "y4", C: "ϵ", L: 1 },
        { from: "y4", to: "y5", C: "ϵ", L: 1 },
        { from: "y2", to: "y3", C: "d", L: 1 },
        { from: "y2", to: "x2", C: "send m", L: 2 },
        { from: "y5", to: "y3", C: "send n, p", L: 1 },
        // Bridging edges: from global to RBS and from RBS to global
        { from: "y1", to: "x2", C: "ϵ", L: 2 }, // x2 serves as an in-bridge.
        { from: "y5", to: "y3", C: "ϵ", L: 1 }  // y5 serves as an out-bridge.
      ],
      resetBound: { "RBS1": "x2" }
    };

    const result = preprocessRDLT(rdltInput);
    const level1Ids = result.level1.vertices.map(v => v.id);
    // Expected level1: vertices outside RBS (x1, y1, y2, y3) + in/out bridges (x2, y5) + dummy nodes.
    expect(level1Ids).toEqual(expect.arrayContaining(["x1", "y1", "y2", "y3", "x2", "y5", "i", "o"]));
    // Internal vertex y4 should be omitted from level1.
    expect(level1Ids).not.toContain("y4");

    // Check that level1 vertices have no rbs property.
    result.level1.vertices.forEach(v => {
      expect(v.type).toBe("c");
      expect(v).not.toHaveProperty("rbs");
    });

    // For RBS1, level2 should contain vertices originally with rbs === "RBS1": y4, y5, x2.
    expect(result.level2).toHaveProperty("RBS1");
    const level2RBS = result.level2["RBS1"];
    const level2Ids = level2RBS.vertices.map(v => v.id);
    expect(level2Ids.sort()).toEqual(["x2", "y4", "y5"].sort());
    
    // Check abstract edges in level1: 
    // The internal level2 for RBS1 contains three edges:
    //   (x2, y5) L=1, (x2, y4) L=1, (y4, y5) L=1; so total expanded reusability = 3.
    // In this model, assume in-bridge is x2 (has an incoming edge from y1) and out-bridge is y5 (has outgoing edge to y3).
    // Therefore, expect two abstract edges from x2 to y5.
    const abstractEdges = result.level1.edges.filter(e => e.type === "abstract");
    abstractEdges.forEach(edge => {
      expect(edge.from).toBe("x2");
      expect(edge.to).toBe("y5");
      expect(edge.L).toBe(3);
    });
    expect(abstractEdges.length).toBe(2);
  });
});

describe('preprocessRDLT - Multiple RBS scenario', () => {
  test('should correctly process an RDLT with two distinct RBS', () => {
    // Global vertices outside any RBS.
    // Two RBS: "RBS1" with center "r2", and "RBS2" with center "s3".
    // RBS1 vertices: r1, r2, r3.
    // RBS2 vertices: s1, s2, s3.
    // Also add global vertices: g1 and g2.
    // Bridging edges:
    //  - For RBS1: an edge from global g1 to r2 (in-bridge) and an edge from r3 to global g2 (out-bridge).
    //  - For RBS2: an edge from global g2 to s1 (in-bridge) and an edge from s3 to global g1 (out-bridge).
    // Level2 edges for RBS1: 
    //   r2 -> r3 (L:1), r2 -> r1 (L:1), r1 -> r3 (L:1)  => sum = 3.
    // Level2 edges for RBS2:
    //   s1 -> s2 (L:2), s2 -> s3 (L:2), s1 -> s3 (L:1)  => sum = 5.
    const rdltInput = {
      vertices: [
        { id: "g1", type: "b", label: "g1" },
        { id: "g2", type: "e", label: "g2" },
        // RBS1 vertices
        { id: "r1", type: "c", label: "r1", rbs: "RBS1" },
        { id: "r2", type: "c", label: "r2", rbs: "RBS1" },
        { id: "r3", type: "c", label: "r3", rbs: "RBS1" },
        // RBS2 vertices
        { id: "s1", type: "c", label: "s1", rbs: "RBS2" },
        { id: "s2", type: "c", label: "s2", rbs: "RBS2" },
        { id: "s3", type: "c", label: "s3", rbs: "RBS2" }
      ],
      edges: [
        // Global edges
        { from: "g1", to: "r2", C: "ϵ", L: 1 },  // bridge into RBS1
        { from: "r3", to: "g2", C: "ϵ", L: 1 },  // bridge out of RBS1
        { from: "g2", to: "s1", C: "ϵ", L: 1 },  // bridge into RBS2
        { from: "s3", to: "g1", C: "ϵ", L: 1 },  // bridge out of RBS2

        // Internal edges for RBS1
        { from: "r2", to: "r3", C: "ϵ", L: 1 },
        { from: "r2", to: "r1", C: "ϵ", L: 1 },
        { from: "r1", to: "r3", C: "ϵ", L: 1 },

        // Internal edges for RBS2
        { from: "s1", to: "s2", C: "ϵ", L: 2 },
        { from: "s2", to: "s3", C: "ϵ", L: 2 },
        { from: "s1", to: "s3", C: "ϵ", L: 1 }
      ],
      // Two reset-bound subsystems: RBS1 center is r2, RBS2 center is s3.
      resetBound: { "RBS1": "r2", "RBS2": "s3" }
    };

    const result = preprocessRDLT(rdltInput);

    // --- Level-1 checks ---
    // Global vertices should appear plus bridges from each RBS.
    const level1Ids = result.level1.vertices.map(v => v.id);
    // For RBS1, expect bridges: r2 (in-bridge) and r3 (out-bridge)
    // For RBS2, expect bridges: s1 (in-bridge) and s3 (out-bridge)
    expect(level1Ids).toEqual(
      expect.arrayContaining(["g1", "g2", "r2", "r3", "s1", "s3", "i", "o"])
    );
    // Internal vertices not serving as bridges should not appear:
    expect(level1Ids).not.toContain("r1");
    expect(level1Ids).not.toContain("s2");

    // --- Level-2 checks ---
    // For RBS1, level2 should contain r1, r2, r3 (with rbs removed)
    expect(result.level2).toHaveProperty("RBS1");
    const level2RBS1Ids = result.level2["RBS1"].vertices.map(v => v.id);
    expect(level2RBS1Ids.sort()).toEqual(["r1", "r2", "r3"].sort());
    // For RBS2, level2 should contain s1, s2, s3
    expect(result.level2).toHaveProperty("RBS2");
    const level2RBS2Ids = result.level2["RBS2"].vertices.map(v => v.id);
    expect(level2RBS2Ids.sort()).toEqual(["s1", "s2", "s3"].sort());

    // --- Abstract edge checks ---
    // For RBS1, the internal level2 edges are:
    //   r2->r3 (L:1), r2->r1 (L:1), r1->r3 (L:1) => sum = 3.
    // The only possible in-bridge/out-bridge pair is r2 (in) to r3 (out).
    // enumerateSimplePaths should yield two distinct paths (direct [r2, r3] and indirect [r2, r1, r3]),
    // so we expect two abstract edges from r2 to r3 with L = 3.
    const abstractEdgesRBS1 = result.level1.edges.filter(e => e.type === "abstract" && e.from === "r2" && e.to === "r3");
    expect(abstractEdgesRBS1.length).toBe(2);
    abstractEdgesRBS1.forEach(edge => {
      expect(edge.L).toBe(3);
    });

    // For RBS2, the internal edges are:
    //   s1->s2 (L:2), s2->s3 (L:2), s1->s3 (L:1) => sum = 5.
    // The bridge pair is s1 (in-bridge) and s3 (out-bridge).
    // So, expect abstract edges from s1 to s3 with L = 5.
    const abstractEdgesRBS2 = result.level1.edges.filter(e => e.type === "abstract" && e.from === "s1" && e.to === "s3");
    expect(abstractEdgesRBS2.length).toBeGreaterThanOrEqual(1);
    abstractEdgesRBS2.forEach(edge => {
      expect(edge.L).toBe(5);
    });
  });
});

describe('computeExpandedReusability (cycle handling)', () => {
  test('should correctly compute eRU on a graph with a cycle containing the reset center', () => {
    // Construct a level2-like graph with a cycle.
    // Vertices: a, b, c.
    // Edges: a -> b (L:1), b -> c (L:2), c -> a (L:1).
    // Let the reset center be "a". Since the cycle contains "a", it is reset-bounded,
    // so each edge gets an offset of 1.
    // Effective eRU: (a,b)=2, (b,c)=3, (c,a)=2; Total = 7.
    const graph = {
      vertices: [
        { id: "a", type: "c", label: "a" },
        { id: "b", type: "c", label: "b" },
        { id: "c", type: "c", label: "c" }
      ],
      edges: [
        { from: "a", to: "b", C: "ϵ", L: 1 },
        { from: "b", to: "c", C: "ϵ", L: 2 },
        { from: "c", to: "a", C: "ϵ", L: 1 }
      ]
    };
    const result = computeExpandedReusability(graph, "a");
    expect(result).toBe(7);
  });

  test('should return Infinity if a cycle is not reset-bounded', () => {
    // Construct a graph with a cycle that does NOT contain the reset center.
    // Vertices: a, b.
    // Edges: a -> b (L:1), b -> a (L:2).
    // Let the reset center be "x" (which is not in this cycle).
    // Then, each edge in the cycle is marked as unbounded (Infinity) so the aggregate becomes Infinity.
    const graph = {
      vertices: [
        { id: "a", type: "c", label: "a" },
        { id: "b", type: "c", label: "b" }
      ],
      edges: [
        { from: "a", to: "b", C: "ϵ", L: 1 },
        { from: "b", to: "a", C: "ϵ", L: 2 }
      ]
    };
    const result = computeExpandedReusability(graph, "x"); // "x" is not in the cycle
    expect(result).toBe(Infinity);
  });
});
