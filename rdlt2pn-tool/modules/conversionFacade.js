/*
This module orchestrates parsing, mapping, and validating the input—hiding the complexity from the rest of the application.
*/

// modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { mapToPetriNet } from './mapper.js';
import { validatePetriNet } from './validator.js';

export function convert(rdltInput) {
  // Step 1: Parse the RDLT input.
  const rdltModel = parseRDLT(rdltInput);
  // Step 2: Map the RDLT model to a Petri Net.
  const petriNet = mapToPetriNet(rdltModel);
  // Step 3: Validate the resulting Petri Net.
  const isSound = validatePetriNet(petriNet);
  return { petriNet, soundness: isSound };
}
