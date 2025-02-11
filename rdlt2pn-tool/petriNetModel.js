// petriNetModel.js
export function createEmptyPN() {
    return {
      places: [],
      transitions: [],
      arcs: [],
      marking: {} // Maps place IDs to token counts.
    };
  }