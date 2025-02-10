// tests/mapper.test.js
import { mapToPetriNet } from '../modules/mapper.js';

test('mapToPetriNet returns an object with places and transitions arrays', () => {
  const model = {
    vertices: [
      { id: 'v1', type: 'entity', label: 'Entity 1' },
      { id: 'v2', type: 'controller', label: 'Controller 1', guard: 'm' }
    ],
    edges: []
  };
  const pn = mapToPetriNet(model);
  expect(pn).toHaveProperty('places');
  expect(pn).toHaveProperty('transitions');
});
