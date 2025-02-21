/*
This file acts as the main entry point of your application.
It imports the conversion façade and visualization functions to process an example input,
generate DOT files, and automatically render them into images.
*/

// index.js
import { convert } from './modules/conversionFacade.js';

function main() {
  // Example RDLT input as a JSON string.
  const rdltInput = JSON.stringify({
    vertices: [
      { id: "x1", type: "b", label: "x1" },
      { id: "y1", type: "c", label: "y1" },
      { id: "y2", type: "c", label: "y2" },
      { id: "y3", type: "c", label: "y3" },
      { id: "y4", type: "c", label: "y4", rbs: "RBS1"  },
      { id: "y5", type: "c", label: "y5", rbs: "RBS1"  },
      { id: "x2", type: "e", label: "x2", rbs: "RBS1" }
    ],
    edges: [
      { from: "x1", to: "y1", C: "a", L: 1 },
      { from: "x1", to: "y2", C: "b", L: 1 },
      { from: "y1", to: "x2", C: "ϵ", L: 2 },
      { from: "x2", to: "y5", C: "ϵ", L: 1 },
      { from: "x2", to: "y4", C: "ϵ", L: 1 },
      { from: "y4", to: "y5", C: "ϵ", L: 1 },
      { from: "y2", to: "y3", C: "d", L: 1 },
      { from: "y2", to: "x2", C: "send m", L: 2 },
      { from: "y5", to: "y3", C: "send n, p", L: 1 }
    ],
    resetBound: {
      "RBS1": "x2"
    }
  });

  // Convert RDLT to PN.
  const conversionResult = convert(rdltInput);
  console.log(`PetriNet: ${conversionResult.petriNet}, Soundness Preservation: ${conversionResult.soundness}`);
}

main();
