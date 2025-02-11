/*
This file acts as the main entry point of your application.
It imports the conversion façade and visualization functions to process an example input,
generate DOT files, and automatically render them into images.
*/

// index.js
import { convert } from './modules/conversionFacade.js';
import { generateRDLTDOT, generatePNDOT, writeDOTToFile, renderDOT } from './visualization.js';

function main() {
  // Example RDLT input as a JSON string.
  const rdltInput = JSON.stringify({
    vertices: [
      { id: 'v1', type: 'b', label: 'Start' },
      { id: 'v2', type: 'e', label: 'Entity A' },
      { id: 'v3', type: 'c', label: 'Controller X' }
    ],
    edges: [
      { from: 'v1', to: 'v2', C: 'ε', L: 1 },
      { from: 'v2', to: 'v3', C: 'constraint1', L: 3 }
    ],
    resetBound: {
      'v2': true
    }
  });

  // Parse the input RDLT.
  const rdltModel = JSON.parse(rdltInput);

  // Generate and write the RDLT DOT file.
  const rdltDOT = generateRDLTDOT(rdltModel);
  writeDOTToFile(rdltDOT, 'diagrams/input_RDLT.dot');
  console.log("Input RDLT DOT generated as 'diagrams/input_RDLT.dot'.");

  // Automatically render the RDLT DOT file to a PNG image.
  renderDOT('diagrams/input_RDLT.dot', 'diagrams/input_RDLT.png');

  // Convert RDLT to PN.
  const conversionResult = convert(rdltInput);
  const pnDOT = generatePNDOT(conversionResult.petriNet);
  writeDOTToFile(pnDOT, 'diagrams/output_PN.dot');
  console.log("Output PN DOT generated as 'diagrams/output_PN.dot'.");

  // Automatically render the PN DOT file to a PNG image.
  renderDOT('diagrams/output_PN.dot', 'diagrams/output_PN.png');
}

main();
