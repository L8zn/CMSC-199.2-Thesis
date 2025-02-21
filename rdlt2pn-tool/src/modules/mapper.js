/*
This module maps the parsed RDLT model to a Petri Net. It demonstrates using both a factory and strategy functions.
*/

// modules/mapper.js
import { createEmptyPN } from '../petriNetModel.js';
import { createElement } from '../utils/factory.js';
import { basicMappingStrategy } from '../utils/strategy.js';

export function mapToPetriNet(model) {
  const petriNet = createEmptyPN();

  // Map vertices to PN elements.
  if (model.vertices) {
    model.vertices.forEach(vertex => {
      // Always use the basicMappingStrategy:
      const mapping = basicMappingStrategy(vertex);
      const pnElement = createElement(mapping.type, mapping.options);
      if (pnElement.type === 'place') {
        petriNet.places.push(pnElement);
      } else if (pnElement.type === 'transition') {
        petriNet.transitions.push(pnElement);
      }
    });
  }

  // Map edges to PN arcs.
  if (model.edges) {
    model.edges.forEach(edge => {
      // Create the arc object including C, L, and initialize T as an array of zeros.
      const arc = {
        from: edge.from,
        to: edge.to,
        // Use the provided constraint symbol from edge.C if available,
        // or fall back to a property in edge.constraints (if defined),
        // or default to ε (i.e., no constraint).
        C: edge.C || (edge.constraints && edge.constraints.constraint) || 'ε',
        L: edge.L || 1,
        T: Array(edge.L || 1).fill(0)
      };

      // Mark the arc as 'reset' if the source vertex is reset-bound (M = 1).
      const sourceVertex = model.vertices.find(v => v.id === edge.from);
      arc.type = (sourceVertex && sourceVertex.M === 1) ? 'reset' : 'normal';

      petriNet.arcs.push(arc);
    });
  }

  // Initialize markings: set each place's token count from its options.
  petriNet.places.forEach(place => {
    petriNet.marking[place.options.id] = place.options.tokens || 0;
  });

  return petriNet;
}