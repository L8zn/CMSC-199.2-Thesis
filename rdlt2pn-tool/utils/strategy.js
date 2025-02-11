/*
Defines mapping strategies that the mapper module uses to convert RDLT vertices into Petri Net elements.
*/

// utils/strategy.js
export function basicMappingStrategy(vertex) {
  // For controllers ('c'), map to a transition.
  // For boundary ('b') and entity ('e') objects, map to a place.
  if (vertex.type === 'c') {
    return { 
      type: 'transition', 
      options: { id: vertex.id, label: vertex.label } 
    };
  } else {
    return { 
      type: 'place', 
      options: { id: vertex.id, label: vertex.label, tokens: 0 } 
    };
  }
}
  