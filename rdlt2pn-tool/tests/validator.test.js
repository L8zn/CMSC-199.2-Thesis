// tests/validator.test.js
import { validatePetriNet } from '../modules/validator.js';

test('validatePetriNet returns true for a valid Petri Net structure', () => {
  const pn = {
    places: [{ id: 'p1' }],
    transitions: [{ id: 't1' }],
    arcs: []
  };
  expect(validatePetriNet(pn)).toBe(true);
});

test('validatePetriNet returns false when no places exist', () => {
  const pn = {
    places: [],
    transitions: [{ id: 't1' }],
    arcs: []
  };
  expect(validatePetriNet(pn)).toBe(false);
});
