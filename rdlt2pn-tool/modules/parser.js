/*
This module handles parsing the RDLT input into an internal model.
*/

// modules/parser.js
export function parseRDLT(input) {
    // Convert the input (JSON string) into a model.
    try {
      const model = JSON.parse(input);
      // For every vertex, set M to 1 if its id appears in model.resetBound as true
      if (model.vertices && model.resetBound) {
        model.vertices = model.vertices.map(vertex => {
          vertex.M = model.resetBound[vertex.id] ? 1 : 0;
          return vertex;
        });
      }
      return model;
    } catch (error) {
      throw new Error("Invalid RDLT input: " + error.message);
    }
  }
    