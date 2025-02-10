// tests/parser.test.js
import { parseRDLT } from '../modules/parser.js';

test('parseRDLT returns a model when valid JSON is provided', () => {
  const input = '{"vertices": [{"id": "v1"}], "edges": []}';
  const model = parseRDLT(input);
  expect(model).toHaveProperty('vertices');
  expect(model.vertices[0]).toHaveProperty('id', 'v1');
});

test('parseRDLT throws an error when invalid JSON is provided', () => {
  const input = '{invalid json}';
  expect(() => parseRDLT(input)).toThrow();
});
