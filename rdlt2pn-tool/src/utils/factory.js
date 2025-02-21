/*
A simple factory function for creating Petri Net elements.
*/

// utils/factory.js
export function createElement(type, options) {
    // For now, simply return an object with type and options.
    return {
      type,
      options
    };
  }
  