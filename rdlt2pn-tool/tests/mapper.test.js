// tests/mapper.test.js
import { advancedMappingStrategy, integrateRBSFragment } from '../src/utils/strategy.js';
import { generatePNDOT, writeDOTToFile, renderDOT } from '../src/modules/visualization.js';
import { createEmptyPN } from '../src/petriNetModel.js';

// Helper: write and render DOT for a given expected PN object and test structure id.
function outputDOT(expectedPN, structureId) {
  const dot = generatePNDOT(expectedPN);
  const dotFilename = `outputs/testDOT/structure${structureId}.dot`;
  const renderedFilename = `outputs/testRenderedDOT/structure${structureId}.png`;
  writeDOTToFile(dot, dotFilename);
  renderDOT(dotFilename, renderedFilename);
}

// --- Structure 1: Single ε-constrained arc (direct flow) ---
describe('Mapping Structure 1 (Single ε Arc)', () => {
  test('should map a single ε arc from x to y correctly', () => {
    // RDLT: Vertex x -> Vertex y with C = ε.
    const rdlStructure1 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" }
      ],
      edges: [
        { from: "x", to: "y", C: "ε", L: 1 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure1);
    // Expected PN snippet:
    const expectedPN1 = {
      transitions: [
        { id: "x", label: "X" },
        { id: "y", label: "Y" }
      ],
      auxiliaryPlaces: []
    };
    // Assertions:
    expect(mapping).toHaveProperty("transitions");
    expect(mapping.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "x", label: "X" }),
        expect.objectContaining({ id: "y", label: "Y" })
      ])
    );
    expect(mapping.auxiliaryPlaces || []).toEqual([]);
    // Output DOT and rendered image:
    outputDOT(expectedPN1, 1);
  });
});

// --- Structure 2: Single Σ-constrained arc ---
describe('Mapping Structure 2 (Single Σ Arc)', () => {
  test('should map a single Σ arc from x to y correctly', () => {
    // RDLT: Vertex x -> Vertex y with C = "a" and L = 2.
    const rdlStructure2 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" }
      ],
      edges: [
        { from: "x", to: "y", C: "a", L: 2 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure2);
    // Expected PN snippet:
    const expectedPN2 = {
      transitions: [
        { id: "x", label: "X" },
        { id: "y", label: "Y" }
      ],
      auxiliaryPlaces: [
        { edge: "x-y", L: 2 }
      ]
    };
    const aux = mapping.auxiliaryPlaces.find(p => p.edge === "x-y");
    expect(aux).toBeDefined();
    expect(aux.L).toBe(2);
    // Output DOT and rendered image:
    outputDOT(expectedPN2, 2);
  });
});

// --- Structure 3: SPLIT with two ε arcs ---
describe('Mapping Structure 3 (SPLIT with two ε arcs)', () => {
  test('should map a SPLIT from x with two outgoing ε arcs to y and z correctly', () => {
    // RDLT: Vertex x splits via two ε arcs to y and z.
    const rdlStructure3 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "y", C: "ε", L: 1 },
        { from: "x", to: "z", C: "ε", L: 1 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure3);
    // Expected PN snippet:
    const expectedPN3 = {
      splitPlace: { id: "Pxsplit", label: "X_split" },
      transitions: [
        { id: "Tε_y", label: "Flow to Y" },
        { id: "Tε_z", label: "Flow to Z" }
      ],
      auxiliaryPlaces: []
    };
    expect(mapping).toHaveProperty("splitPlace");
    expect(mapping.splitPlace).toBeDefined();
    expect(mapping.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "Tε_y" }),
        expect.objectContaining({ id: "Tε_z" })
      ])
    );
    // Output DOT and rendered image:
    outputDOT(expectedPN3, 3);
  });
});

// --- Structure 4: SPLIT with two Σ arcs ---
describe('Mapping Structure 4 (SPLIT with two Σ arcs)', () => {
  test('should map a SPLIT from x with two outgoing Σ arcs to y and z correctly', () => {
    // RDLT: Vertex x splits with arcs: (x->y): C = "a", L = 2; (x->z): C = "b", L = 3.
    const rdlStructure4 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "y", C: "a", L: 2 },
        { from: "x", to: "z", C: "b", L: 3 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure4);
    // Expected PN snippet:
    const expectedPN4 = {
      auxiliaryPlaces: [
        { edge: "x-y", L: 2 },
        { edge: "x-z", L: 3 }
      ],
      transitions: [
        { id: "TJ_y", label: "Join to Y" },
        { id: "TJ_z", label: "Join to Z" }
      ]
    };
    const auxY = mapping.auxiliaryPlaces.find(p => p.edge === "x-y");
    const auxZ = mapping.auxiliaryPlaces.find(p => p.edge === "x-z");
    expect(auxY.L).toBe(2);
    expect(auxZ.L).toBe(3);
    expect(mapping.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "TJ_y" }),
        expect.objectContaining({ id: "TJ_z" })
      ])
    );
    // Output DOT and rendered image:
    outputDOT(expectedPN4, 4);
  });
});

// --- Structure 5: SPLIT with one ε arc and one Σ arc ---
describe('Mapping Structure 5 (Mixed SPLIT: one ε and one Σ arc)', () => {
  test('should map a SPLIT from x with one outgoing ε arc to y and one Σ arc to z correctly', () => {
    // RDLT: Vertex x with (x->y): C = "ε", L = 1; (x->z): C = "c", L = 4.
    const rdlStructure5 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "y", C: "ε", L: 1 },
        { from: "x", to: "z", C: "c", L: 4 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure5);
    // Expected PN snippet:
    const expectedPN5 = {
      auxiliaryPlaces: [
        { edge: "x-z", L: 4 }
      ],
      transitions: [
        { id: "Tε_y", label: "Flow to Y" },
        { id: "TJ_z", label: "Join to Z" }
      ]
    };
    const auxZ = mapping.auxiliaryPlaces.find(p => p.edge === "x-z");
    expect(auxZ.L).toBe(4);
    expect(mapping.transitions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "Tε_y" }),
        expect.objectContaining({ id: "TJ_z" })
      ])
    );
    outputDOT(expectedPN5, 5);
  });
});

// --- Structure 6: JOIN with two ε arcs ---
describe('Mapping Structure 6 (JOIN with two ε arcs)', () => {
  test('should map a JOIN into z with two incoming ε arcs from x and y correctly', () => {
    // RDLT: Vertices x and y both connect to z with C = "ε".
    const rdlStructure6 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "z", C: "ε", L: 1 },
        { from: "y", to: "z", C: "ε", L: 1 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure6);
    // Expected PN snippet:
    const expectedPN6 = {
      joinPlace: { id: "P_join_z", label: "Join for Z" },
      auxiliaryPlaces: []
    };
    expect(mapping).toHaveProperty("joinPlace");
    outputDOT(expectedPN6, 6);
  });
});

// --- Structure 7: JOIN with two Σ arcs ---
describe('Mapping Structure 7 (JOIN with two Σ arcs)', () => {
  test('should map a JOIN into z with two incoming Σ arcs from x and y correctly', () => {
    // RDLT: Vertices x and y both connect to z with C = "d", L = 3 and L = 2 respectively.
    const rdlStructure7 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "z", C: "d", L: 3 },
        { from: "y", to: "z", C: "d", L: 2 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure7);
    // Expected PN snippet:
    const expectedPN7 = {
      auxiliaryPlaces: [
        { joinFor: "z", L: 3 }
      ]
    };
    const joinAux = mapping.auxiliaryPlaces.find(p => p.joinFor === "z");
    expect(joinAux.L).toBe(3);
    outputDOT(expectedPN7, 7);
  });
});

// --- Structure 8: JOIN with three incoming arcs ---
describe('Mapping Structure 8 (JOIN with three incoming arcs)', () => {
  test('should map a JOIN into z with three incoming arcs correctly', () => {
    // RDLT: Vertices w, x, y all connect to z with C = "e" for all, with L values 2, 3, 1 respectively.
    const rdlStructure8 = {
      vertices: [
        { id: "w", type: "c", label: "W" },
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "w", to: "z", C: "e", L: 2 },
        { from: "x", to: "z", C: "e", L: 3 },
        { from: "y", to: "z", C: "e", L: 1 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure8);
    // Expected PN snippet:
    const expectedPN8 = {
      auxiliaryPlaces: [
        { joinFor: "z", L: 2 }
      ]
    };
    const joinAux = mapping.auxiliaryPlaces.find(p => p.joinFor === "z");
    expect(joinAux.L).toBe(2);
    outputDOT(expectedPN8, 8);
  });
});

// --- Structure 9: MIX-JOIN (mixed incoming arcs) ---
describe('Mapping Structure 9 (MIX-JOIN with mixed constraints)', () => {
  test('should map a MIX-JOIN into z with one ε and one Σ arc correctly', () => {
    // RDLT: Vertex x -> z with C = "ε", L = 1; and vertex y -> z with C = "f", L = 3.
    const rdlStructure9 = {
      vertices: [
        { id: "x", type: "c", label: "X" },
        { id: "y", type: "c", label: "Y" },
        { id: "z", type: "c", label: "Z" }
      ],
      edges: [
        { from: "x", to: "z", C: "ε", L: 1 },
        { from: "y", to: "z", C: "f", L: 3 }
      ]
    };
    const mapping = advancedMappingStrategy(rdlStructure9);
    // Expected PN snippet:
    const expectedPN9 = {
      auxiliaryPlaces: [
        { edge: "y-z", L: 3 }
      ],
      abstractArcs: 2
    };
    // Expect two abstract arcs to be created.
    const mixJoinAux = mapping.auxiliaryPlaces.filter(p => p.joinFor === "z");
    expect(mixJoinAux.length).toBe(2);
    const sigmaAux = mixJoinAux.find(p => p.edge === "y-z");
    expect(sigmaAux.L).toBe(3);
    outputDOT(expectedPN9, 9);
  });
});
