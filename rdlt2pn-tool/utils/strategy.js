/*
Defines mapping strategies that the mapper module uses to convert RDLT vertices into Petri Net elements.
*/

// utils/strategy.js
export function basicMappingStrategy(vertex) {
    // Map a vertex to a basic Petri Net element.
    return {
      type: vertex.type === 'controller' ? 'transition' : 'place',
      options: {
        id: vertex.id,
        label: vertex.label || ''
      }
    };
  }
  
  export function guardedMappingStrategy(vertex) {
    // Map a vertex to a Petri Net transition with guard conditions.
    return {
      type: 'transition',
      options: {
        id: vertex.id,
        label: vertex.label || '',
        guard: vertex.guard || null
      }
    };
  }
  