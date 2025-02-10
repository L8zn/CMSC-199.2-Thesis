/*
This module maps the parsed RDLT model to a Petri Net. It demonstrates using both a factory and strategy functions.
*/

// modules/mapper.js
import { createElement } from '../utils/factory.js';
import { basicMappingStrategy, guardedMappingStrategy } from '../utils/strategy.js';

export function mapToPetriNet(model) {
  // Create an empty Petri Net model
  const petriNet = {
    places: [],
    transitions: [],
    arcs: []
  };

  // Example: iterate over vertices to create corresponding PN elements.
  if (model.vertices) {
    model.vertices.forEach(vertex => {
      let mappedElement;
      // Choose mapping strategy based on vertex attributes
      if (vertex.type === 'controller') {
        mappedElement = guardedMappingStrategy(vertex);
      } else {
        mappedElement = basicMappingStrategy(vertex);
      }
      // Create an element using the factory.
      const pnElement = createElement(mappedElement.type, mappedElement.options);
      if (pnElement.type === 'place') {
        petriNet.places.push(pnElement);
      } else if (pnElement.type === 'transition') {
        petriNet.transitions.push(pnElement);
      }
      // Extend to edges and arcs as needed...
    });
  }
  
  return petriNet;
}
