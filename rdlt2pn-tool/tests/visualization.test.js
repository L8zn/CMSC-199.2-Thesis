// tests/visualization.test.js
import { generateRDLTDOT, generatePNDOT } from '../src/modules/visualization.js';

describe('generateRDLTDOT', () => {
  test('generates DOT for a non-preprocessed RDLT with rbs clusters and modified labels', () => {
    const dummyRDLT = {
      preprocessed: false,
      vertices: [
        { id: "v1", type: "b", label: "Boundary" },
        { id: "v2", type: "c", label: "Controller", rbs: "RBS1" },
        { id: "v3", type: "e", label: "Entity" },
        { id: "v4", type: "c", label: "Center", rbs: "RBS1" }
      ],
      edges: [
        { from: "v1", to: "v2", C: "a", L: 1 },
        { from: "v2", to: "v3", C: "b", L: 2 },
        { from: "v4", to: "v2", C: "ϵ", L: 1 }
      ],
      resetBound: { "RBS1": "v4" }
    };

    const dotString = generateRDLTDOT(dummyRDLT);
    // Check that there is a subgraph cluster for RBS1.
    expect(dotString).toMatch(/subgraph cluster_RBS1/);
    // Check that the center vertex v4 gets the modified label.
    expect(dotString).toMatch(/Center\\nM\(\.\)=1/);
    // Check that a vertex without an rbs is output normally.
    expect(dotString).toMatch(/v1 \[label="Boundary", image="assets\/images\/rdlt\/boundary.png"\]/);
  });

  test('generates DOT for a preprocessed RDLT without clustering', () => {
    const dummyRDLT = {
      preprocessed: true,
      vertices: [
        { id: "v1", type: "b", label: "Boundary" },
        { id: "v2", type: "c", label: "Controller" }
      ],
      edges: [
        { from: "v1", to: "v2", C: "a", L: 1 }
      ]
    };

    const dotString = generateRDLTDOT(dummyRDLT);
    // It should not include subgraph clusters.
    expect(dotString).not.toMatch(/subgraph cluster_/);
    expect(dotString).toMatch(/v1 \[label="Boundary", image="assets\/images\/rdlt\/boundary.png"\]/);
    expect(dotString).toMatch(/v2 \[label="Controller", image="assets\/images\/rdlt\/controller.png"\]/);
  });
});

describe('generatePNDOT', () => {
//   test('generates DOT for a simple PN model', () => {
//     const dummyPN = {
//       places: [
//         { options: { id: "p1", label: "Start", tokens: 1 } },
//         { options: { id: "p2", label: "End", tokens: 0 } }
//       ],
//       transitions: [
//         { options: { id: "t1", label: "Fire" } }
//       ],
//       arcs: [
//         { from: "p1", to: "t1" },
//         { from: "t1", to: "p2" }
//       ]
//     };

//     const dotString = generatePNDOT(dummyPN);
//     expect(dotString).toMatch(/p1 \[label="1 tokens\\n\\nStart"/);
//     expect(dotString).toMatch(/t1 \[label="Fire", shape=rectangle/);
//     expect(dotString).toMatch(/p1 -> t1/);
//     expect(dotString).toMatch(/t1 -> p2/);
//   });
});
