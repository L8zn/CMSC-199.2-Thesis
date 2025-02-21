/*
This module handles parsing the RDLT input into an internal model.
*/

// modules/parser.js

export function parseRDLT(input) {
    // Convert the input (JSON string) into a model.
    try {
      const rdltModel = JSON.parse(input);
      
      return rdltModel;
    } catch (error) {
      throw new Error("Invalid RDLT input: " + error.message);
    }
  }
    