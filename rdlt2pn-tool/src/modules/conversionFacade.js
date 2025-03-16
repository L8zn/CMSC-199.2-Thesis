// src/modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { preprocessRDLT } from './preprocessor.js';
import { mapToPetriNet } from './mapper.js';
import { checkRDLTSoundness, checkPNSoundness } from './validator.js';
import { RDLTModel } from '../models/rdltModel.js';

export function convert(rdltInput) {
  // Step 1: Parse the RDLT input.
  const rdltJSON = parseRDLT(rdltInput);
  // Create the RDLTModel from JSON using the static fromJSON method.
  const inputRdltModel = RDLTModel.fromJSON(rdltJSON);

  // Step 2: Preprocess the parsed RDLT model into level-1 and level-2 models.
  const preprocessedModel = preprocessRDLT(inputRdltModel);

  // console.log(JSON.stringify(preprocessedModel,null,2));
  // console.log(JSON.stringify(preprocessedModel.level1.toJSON(),null,2));
  
  // Step 3: Map the preprocessed RDLT model to a Petri Net.
  const outputPnModel = mapToPetriNet(preprocessedModel);
  
  // console.log(JSON.stringify(preprocessedModel.level1.toJSON(), null, 2));
  
  // Step 4: Validate Soundness Preservation.
  const rdltSoundness = checkRDLTSoundness(inputRdltModel);
  const pnSoundness = checkPNSoundness(outputPnModel);
  const soundnessPreserved = (rdltSoundness === pnSoundness);
  console.log(`RDLT soundness: ${rdltSoundness}, PN soundness: ${pnSoundness}`);
  
  return { rdlt: inputRdltModel, preprocess: preprocessedModel,
    petriNet: outputPnModel, soundness: soundnessPreserved };
}
