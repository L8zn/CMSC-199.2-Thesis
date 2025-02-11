// tests/conversion.test.js
import { convert } from '../modules/conversionFacade.js';

test('Converts RDLT model with reset-bound subsystem to PN with reset arcs', () => {
  const rdltInput = JSON.stringify({
    vertices: [
      { id: 'v1', type: 'boundary', label: 'Start' },
      { id: 'v2', type: 'entity', label: 'Entity A' },
      { id: 'v3', type: 'controller', label: 'Controller X', guard: 'm > 0' }
    ],
    edges: [
      { from: 'v1', to: 'v2', constraints: { input: true }, L: 1 },
      { from: 'v2', to: 'v3', constraints: { output: true }, L: 3 }
    ],
    resetBound: {
      'v2': true
    }
  });

  const result = convert(rdltInput);
  const { petriNet, soundness } = result;
  
  // Verify that we have at least one place and one transition.
  expect(petriNet.places.length).toBeGreaterThan(0);
  expect(petriNet.transitions.length).toBeGreaterThan(0);
  
  // Verify that at least one arc is marked as a reset arc.
  const resetArcs = petriNet.arcs.filter(arc => arc.type === 'reset');
  expect(resetArcs.length).toBeGreaterThan(0);
  
  // Check that soundness is true.
  expect(soundness).toBe(true);
});
