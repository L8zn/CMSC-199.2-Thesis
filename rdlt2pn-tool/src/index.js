/*
This file acts as the main entry point of your application.
It imports the conversion façade and visualization functions to process an example input,
generate DOT files, and automatically render them into images.
*/

// index.js
import { convert } from './modules/conversionFacade.js';
import { generateRDLTDOT, generatePNDOT, writeDOTToFile, renderDOT } from './modules/visualization.js';

function main() {
  const rdltInput = JSON.stringify({});

  const castilloInput = JSON.stringify({
    "vertices": [
      { "id": "x1", "type": "b", "label": "x1", "M": 0 },
      { "id": "y1", "type": "c", "label": "y1", "M": 0 },
      { "id": "y2", "type": "c", "label": "y2", "M": 0 },
      { "id": "y3", "type": "c", "label": "y3", "M": 0 },
      // x2 is declared as the RBS center => M=1
      { "id": "x2", "type": "e", "label": "x2", "M": 1 },
      // y4, y5 are "in" the RBS but are NOT centers => M=0
      { "id": "y4", "type": "c", "label": "y4", "M": 0 },
      { "id": "y5", "type": "c", "label": "y5", "M": 0 }
    ],
    
    "edges": [
      // arcs outside or bridging from outside -> outside
      { "from": "x1", "to": "y1", "C": "a",         "L": 1 },
      { "from": "x1", "to": "y2", "C": "b",         "L": 1 },
      { "from": "y2", "to": "y3", "C": "d",         "L": 1 },
      // bridging arcs from outside -> RBS center x2
      { "from": "y1", "to": "x2", "C": "ϵ",         "L": 2 },
      { "from": "y2", "to": "x2", "C": "send m",    "L": 2 },   
      // arcs inside the RBS (x2, y4, y5): all labeled "ϵ"
      { "from": "x2", "to": "y5", "C": "ϵ",         "L": 1 },
      { "from": "x2", "to": "y4", "C": "ϵ",         "L": 1 },
      { "from": "y4", "to": "y5", "C": "ϵ",         "L": 1 },
      // out-bridge from y5 inside RBS to y3 outside
      { "from": "y5", "to": "y3", "C": "send n, p", "L": 1 }
    ]
  });

  const structure1 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "y", "C": "ϵ", "L": 1 }
    ]
  });

  const structure2 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "y", "C": "a", "L": 1 }
    ]
  });

  const structure3 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "y", "C": "ϵ", "L": 1 },
      { "from": "x", "to": "z", "C": "ϵ", "L": 2 }
    ]
  });

  const structure4 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "y", "C": "a", "L": 1 },
      { "from": "x", "to": "z", "C": "b", "L": 2 }
    ]
  });

  const structure5 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "y", "C": "a", "L": 1 },
      { "from": "x", "to": "z", "C": "ϵ", "L": 2 }
    ]
  });

  const structure6 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "z", "C": "ϵ", "L": 1 },
      { "from": "y", "to": "z", "C": "ϵ", "L": 2 }
    ]
  });

  const structure7 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "z", "C": "a", "L": 1 },
      { "from": "y", "to": "z", "C": "b", "L": 2 }
    ]
  });

  const structure8 = JSON.stringify({
    "vertices": [
      { "id": "w", "type": "c", "label": "w", "M": 0 },
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "w", "to": "z", "C": "a", "L": 1 },
      { "from": "x", "to": "z", "C": "a", "L": 2 },
      { "from": "y", "to": "z", "C": "b", "L": 3 }
    ]
  });

  const structure9 = JSON.stringify({
    "vertices": [
      { "id": "x", "type": "c", "label": "x", "M": 0 },
      { "id": "y", "type": "c", "label": "y", "M": 0 },
      { "id": "z", "type": "c", "label": "z", "M": 0 }
    ], 
    "edges": [
      { "from": "x", "to": "z", "C": "ϵ", "L": 1 },
      { "from": "y", "to": "z", "C": "a", "L": 2 }
    ]
  });

  // Convert RDLT to PN. 
  // visualize(convert(rdltInput),"test"); // Empty RDLT input test
  visualize(convert(castilloInput),"castillo");
  visualize(convert(structure1),"struct1");
  visualize(convert(structure2),"struct2");
  visualize(convert(structure3),"struct3");
  visualize(convert(structure4),"struct4");
  visualize(convert(structure5),"struct5");
  visualize(convert(structure6),"struct6");
  visualize(convert(structure7),"struct7");
  visualize(convert(structure8),"struct8");
  visualize(convert(structure9),"struct9");
}

function visualize(conversionResult, filename) {
  console.log(`${filename} Soundness Preservation: ${conversionResult.soundness}`);
  
  // Visualizing input RDLT
  const rdltDOT = generateRDLTDOT(conversionResult.rdlt.toJSON());
  writeDOTToFile(rdltDOT, `outputs/DOT/${filename}_input_RDLT.dot`);
  renderDOT(`outputs/DOT/${filename}_input_RDLT.dot`, `outputs/renderedDOT/${filename}_input_RDLT.png`);
  
  // Visualize Level-1 RDLT:
  const level1DOT = generateRDLTDOT(conversionResult.preprocess.level1.toJSON());
  writeDOTToFile(level1DOT, `outputs/DOT/${filename}_prepro_RDLT_level1.dot`);
  renderDOT(`outputs/DOT/${filename}_prepro_RDLT_level1.dot`, `outputs/renderedDOT/${filename}_prepro_RDLT_level1.png`);

  // Visualize Level-2 RDLTs for each RBS:
  for (let rbsId in conversionResult.preprocess.level2) {
    const level2DOT = generateRDLTDOT(conversionResult.preprocess.level2[rbsId].toJSON());
    writeDOTToFile(level2DOT, `outputs/DOT/${filename}_prepro_RDLT_level2_${rbsId}.dot`);
    renderDOT(`outputs/DOT/${filename}_prepro_RDLT_level2_${rbsId}.dot`, 
      `outputs/renderedDOT/${filename}_prepro_RDLT_level2_${rbsId}.png`);
  }

  // Visualizing output PN
  const pnDOT = generatePNDOT(conversionResult.petriNet);
  writeDOTToFile(pnDOT, `outputs/DOT/${filename}_output_PN.dot`);
  renderDOT(`outputs/DOT/${filename}_output_PN.dot`, `outputs/renderedDOT/${filename}_output_PN.png`);
}

main();
