// src/modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { preprocessRDLT } from './preprocessor.js';
import { mapToPetriNet } from './mapper.js';
import { checkRDLTSoundness, checkPNSoundness } from './validator.js';
import { generateRDLTDOT, generatePNDOT, writeDOTToFile, renderDOT } from './visualization.js';

export function convert(rdltInput) {
  // Step 1: Parse the RDLT input.
  const rdltModel = parseRDLT(rdltInput);

  // Generate, write, render the RDLT DOT file.
  const rdltDOT = generateRDLTDOT(rdltModel);
  writeDOTToFile(rdltDOT, 'outputs/DOT/input_RDLT.dot');
  console.log("Input RDLT DOT generated as 'outputs/DOT/input_RDLT.dot'.");
  renderDOT('outputs/DOT/input_RDLT.dot', 'outputs/renderedDOT/input_RDLT.png');

  // Step 2: Preprocess the parsed RDLT model into level-1 and level-2 models.
  const preprocessedModel = preprocessRDLT(rdltModel);

  // Visualize Level-1 RDLT:
  const level1DOT = generateRDLTDOT(preprocessedModel.level1);
  writeDOTToFile(level1DOT, 'outputs/DOT/preprocessed_RDLT_level1.dot');
  renderDOT('outputs/DOT/preprocessed_RDLT_level1.dot', 
    'outputs/renderedDOT/preprocessed_RDLT_level1.png');

  // Visualize Level-2 RDLTs for each RBS:
  for (let rbsId in preprocessedModel.level2) {
    const level2DOT = generateRDLTDOT(preprocessedModel.level2[rbsId]);
    writeDOTToFile(level2DOT, `outputs/DOT/preprocessed_RDLT_level2_${rbsId}.dot`);
    renderDOT(`outputs/DOT/preprocessed_RDLT_level2_${rbsId}.dot`, 
      `outputs/renderedDOT/preprocessed_RDLT_level2_${rbsId}.png`);
  }
  
  // Step 3: Map the preprocessed RDLT model to a Petri Net.
  const pnModel = mapToPetriNet(preprocessedModel);

  const pnDOT = generatePNDOT(pnModel);
  writeDOTToFile(pnDOT, 'outputs/DOT/output_PN.dot');
  console.log("Output PN DOT generated as 'outputs/DOT/output_PN.dot'.");
  renderDOT('outputs/DOT/output_PN.dot', 'outputs/renderedDOT/output_PN.png');
  
  // Step 4: Validate Soundness Preservation.
  // Dummy implementations: In the future these functions will perform a full
  // analysis of the soundness properties (e.g., classical vs. relaxed soundness).
  const rdltSoundness = checkRDLTSoundness(rdltModel);
  const pnSoundness = checkPNSoundness(pnModel);
  const soundnessPreserved = (rdltSoundness === pnSoundness);
  console.log(`RDLT soundness: ${rdltSoundness}, PN soundness: ${pnSoundness}`);
  
  return { petriNet: pnModel, soundness: soundnessPreserved };
}
