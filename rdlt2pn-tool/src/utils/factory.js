// src/utils/factory.js

/**
 * Creates a Petri Net element (either a place or a transition) with the given options.
 * Options may include: id, label, tokens, and any additional properties.
 *
 * @param {string} type - The type of PN element: "place" or "transition".
 * @param {Object} options - An object containing properties for the element.
 * @returns {Object} The created PN element.
 */
export function createElement(type, options) {
  const element = { type, options };
  // For places, ensure tokens is defined.
  if (type === 'place') {
    element.options.tokens = options.tokens || 0;
  }
  return element;
}
