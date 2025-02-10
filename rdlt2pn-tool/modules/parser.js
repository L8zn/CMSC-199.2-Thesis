/*
This module handles parsing the RDLT input into an internal model.
*/

// modules/parser.js
export function parseRDLT(input) {
    // Convert the input (JSON string) into a model.
    try {
      const model = JSON.parse(input);
      // You can add more validation or transformation logic here.
      return model;
    } catch (error) {
      throw new Error("Invalid RDLT input: " + error.message);
    }
  }
// modules/parser.js
export function parseRDLT(input) {
    // Convert the input (JSON string) into a model.
    try {
      const model = JSON.parse(input);
      // You can add more validation or transformation logic here.
      return model;
    } catch (error) {
      throw new Error("Invalid RDLT input: " + error.message);
    }
  }
    