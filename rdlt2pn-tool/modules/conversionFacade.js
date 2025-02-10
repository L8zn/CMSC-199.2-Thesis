/*
This module orchestrates parsing, mapping, and validating the input—hiding the complexity from the rest of the application.
*/

// modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { mapToPetriNet } from './mapper.js';
import { validatePetriNet } from './validator.js';

export function convert(input) {
  const model = parseRDLT(input);
  const petriNet = mapToPetriNet(model);
  const isSound = validatePetriNet(petriNet);
  
  return {
    petriNet,
    soundness: isSound
  };
}
