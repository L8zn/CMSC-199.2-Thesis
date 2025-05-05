// src/index.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { convert } from './modules/conversionFacade.js';
import { exportPNToDOT, exportRDLTToDOT } from './modules/visualization.js';
import { RDLTModel } from './models/rdltModel.js';
import { PNModel } from './models/pnModel.js';
import { behavioralAnalysis } from './modules/behavioralAnalysis.js';

const app = express();
const port = process.env.PORT || 3000;

// For __dirname in ES modules:
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware to parse JSON bodies.
app.use(express.json());

// Serve static files from the "public" directory.
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint for conversion.
app.post('/api/convert', (req, res) => {
  try {
    const rdltInput = req.body.input; // JSON string from client
    const { data, warnings, error } = convert(rdltInput);
    if(error) {
      // console.error('Parsing failed:', error);
      alert(`Error: ${error}`);
      console.error("Parsing error:", error);
      res.status(500).json({ error: 'Parsing failed' });
    } else {
      // console.log('Conversion succeeded:', data);

      const pnDOT = exportPNToDOT(data.petriNet);
      const rdltDOT = exportRDLTToDOT(data.rdlt);
      const combRDLT = exportRDLTToDOT(data.combinedModel);
      
      data.visualizeConversion.forEach( step => {
        step.dot = step.dotLines.join('');
      });
      let fireSeqViz = [];
      data.behaviorAnalysis.simulationResults.forEach( fireseq => {
        let seqDOTList = []; 
        fireseq.forEach( state => {
          data.petriNet.updateState(state);
          seqDOTList.push(exportPNToDOT(data.petriNet));
          data.petriNet.revertState;
        });
        fireSeqViz.push(seqDOTList);
      });
      res.json({ 
        rdltDot: rdltDOT, 
        preproDot: combRDLT, 
        pnDot: pnDOT, 
        structReport: data.structAnalysis,
        behaveReport: data.behaviorAnalysis, 
        convertViz: data.visualizeConversion,
        fireSeqViz: fireSeqViz,
        warnings: warnings
      });
    }
  } catch (error) {
    console.error("Conversion error:", error);
    res.status(500).json({ error: 'Conversion failed' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// import { convert } from './modules/conversionFacade.js';
// import { exportPNToDOT, writeDOTToFile, renderDOT, exportRDLTToDOT } from './modules/visualization.js';

// function main() {
//   const rdltInput = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "w", to: "y", C: "ϵ", L: 3 },
//       { from: "x", to: "z", C: "a", L: 1 },
//       { from: "y", to: "z", C: "b", L: 2 }
//     ]
//   });

//   const castilloInput = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "y1", type: "c", label: "", M: 0 },
//       { id: "y2", type: "c", label: "", M: 0 },
//       { id: "y3", type: "c", label: "", M: 0 },
//       { id: "x2", type: "e", label: "", M: 1 },
//       { id: "y4", type: "c", label: "", M: 0 },
//       { id: "y5", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "y1", C: "a", L: 1 },
//       { from: "x1", to: "y2", C: "b", L: 1 },
//       { from: "y2", to: "y3", C: "d", L: 1 },
//       { from: "y1", to: "x2", C: "ϵ", L: 2 },
//       { from: "y2", to: "x2", C: "send m", L: 2 },
//       { from: "x2", to: "y5", C: "ϵ", L: 1 },
//       { from: "x2", to: "y4", C: "ϵ", L: 1 },
//       { from: "y4", to: "y5", C: "ϵ", L: 1 },
//       { from: "y5", to: "y3", C: "send n, p", L: 1 }
//     ]
//   });

//   const structure1 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 }
//     ], 
//     edges: [
//       { from: "x", to: "y", C: "ϵ", L: 1 }
//     ]
//   });

//   const structure2 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "y", C: "a", L: 1 }
//     ]
//   });

//   const structure3 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const structure4 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "y", C: "a", L: 1 },
//       { from: "x", to: "z", C: "b", L: 2 }
//     ]
//   });

//   const structure5 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "y", C: "a", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const structure6 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const structure7 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "z", C: "a", L: 1 },
//       { from: "y", to: "z", C: "b", L: 2 }
//     ]
//   });

//   const structure8 = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "z", C: "a", L: 1 },
//       { from: "x", to: "z", C: "a", L: 2 },
//       { from: "y", to: "z", C: "b", L: 3 }
//     ]
//   });

//   const structure9 = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "a", L: 2 }
//     ]
//   }
//   );

//   const siblingProcessWithORJOIN = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 2 },
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 2 }
//     ]
//   });
  
//   const siblingProcessWithoutORJOIN = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 2 },
//       { from: "x", to: "z", C: "a", L: 1 },
//       { from: "y", to: "z", C: "b", L: 2 }
//     ]
//   });
  
//   const nonSiblingProcess = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 1 }
//     ]
//   });
  
//   const loopingProcess = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "w", to: "y", C: "ϵ", L: 3 },
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const mixJoinVariant1 = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "z", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "a", L: 2 },
//       { from: "y", to: "z", C: "a", L: 3 }
//     ]
//   });

//   const mixJoinVariant2 = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "z", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "a", L: 2 },
//       { from: "y", to: "z", C: "b", L: 3 }
//     ]
//   });

//   const mixJoinVariant3 = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "z", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "a", L: 3 }
//     ]
//   });
  
//   const abstractArcSingle = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 1 }
//     ]
//   });

//   const abstractArcMultiple = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "x", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 1 }
//     ]
//   });
  
//   const abstractArcSelfLoop = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "x", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "y", C: "ϵ", L: 1 }
//     ]
//   });
  
//   const abstractArcInVertexCycle = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "x", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 1 },
//       { from: "x", to: "w", C: "ϵ", L: 3 }
//     ]
//   });
  
//   const abstractArcOutVertexCycle = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "x", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 1 },
//       { from: "y", to: "x", C: "ϵ", L: 3 }
//     ]
//   });  

//   const abstractArcReverse = JSON.stringify({
//     vertices: [
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "x", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "x", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 1 }
//     ]
//   });

//   const rbsSingleNode = JSON.stringify({
//     vertices: [
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "b", label: "", M: 1 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "a", L: 1 }
//     ]
//   });

//   const rbsMultipleInBridges = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 2 },
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 1 }
//     ]
//   });
  
//   const rbsMixJoinInBridges = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "a", L: 2 },
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 1 }
//     ]
//   });  

//   const rbsMultipleOutBridges = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "x", to: "y", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const rbsMultipleOutVertex = JSON.stringify({
//     vertices: [
//       { id: "u", type: "c", label: "", M: 0 },
//       { id: "v", type: "b", label: "", M: 1 },
//       { id: "w", type: "c", label: "", M: 0 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "u", to: "v", C: "ϵ", L: 1 },
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "v", to: "x", C: "ϵ", L: 2 },
//       { from: "w", to: "y", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 2 }
//     ]
//   });

//   const rbsTypeAlikeOutBridges = JSON.stringify({
//     vertices: [
//       { id: "v", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "v", to: "w", C: "ϵ", L: 1 },
//       { from: "w", to: "x", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 2 },
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "y", to: "z", C: "ϵ", L: 2 }
//     ]
//   });
  
//   const rbsMultipleCenters = JSON.stringify({
//     vertices: [
//       { id: "u", type: "c", label: "", M: 0 },
//       { id: "v", type: "b", label: "", M: 1 },
//       { id: "x", type: "c", label: "", M: 0 },
//       { id: "w", type: "b", label: "", M: 1 },
//       { id: "y", type: "c", label: "", M: 0 },
//       { id: "z", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "u", to: "v", C: "ϵ", L: 1 },
//       { from: "u", to: "w", C: "ϵ", L: 2 },
//       { from: "v", to: "x", C: "ϵ", L: 1 },
//       { from: "x", to: "z", C: "ϵ", L: 1 },
//       { from: "w", to: "y", C: "ϵ", L: 2 },
//       { from: "y", to: "z", C: "ϵ", L: 2 }
//     ]
//   });  

//   const evsaTest = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "c", label: "", M: 0 },
//       { id: "x2", type: "b", label: "", M: 1 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "c", label: "", M: 0 },
//       { id: "x6", type: "c", label: "", M: 0 },
//       { id: "x7", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "a", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 2 },
//       { from: "x2", to: "x4", C: "ϵ", L: 4 },
//       { from: "x3", to: "x4", C: "ϵ", L: 1 },
//       { from: "x3", to: "x2", C: "ϵ", L: 3 },
//       { from: "x4", to: "x5", C: "ϵ", L: 6 },
//       { from: "x4", to: "x6", C: "b", L: 7 },
//       { from: "x5", to: "x6", C: "a", L: 7 },
//       { from: "x6", to: "x2", C: "a", L: 5 },
//       { from: "x6", to: "x7", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundClassicalWithCycles = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "c", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "b", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "c", label: "", M: 0 },
//       { id: "x6", type: "c", label: "", M: 0 },
//       { id: "x7", type: "c", label: "", M: 0 },
//       { id: "x8", type: "c", label: "", M: 0 },
//       { id: "x9", type: "c", label: "", M: 0 },
//       { id: "x10", type: "c", label: "", M: 0 },
//       { id: "x11", type: "c", label: "", M: 0 },
//       { id: "x12", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 2 },
//       { from: "x2", to: "x7", C: "ϵ", L: 1 },
//       { from: "x3", to: "x4", C: "ϵ", L: 7 },
//       { from: "x3", to: "x5", C: "ϵ", L: 8 },
//       { from: "x4", to: "x6", C: "a", L: 6 },
//       { from: "x5", to: "x6", C: "b", L: 6 },
//       { from: "x6", to: "x3", C: "ϵ", L: 3 },
//       { from: "x6", to: "x8", C: "ϵ", L: 3 },
//       { from: "x6", to: "x10", C: "ϵ", L: 2 },
//       { from: "x7", to: "x3", C: "ϵ", L: 2 },
//       { from: "x7", to: "x8", C: "ϵ", L: 6 },
//       { from: "x8", to: "x8", C: "ϵ", L: 7 },
//       { from: "x8", to: "x9", C: "ϵ", L: 3 },
//       { from: "x8", to: "x10", C: "ϵ", L: 2 },
//       { from: "x9", to: "x7", C: "ϵ", L: 9 },
//       { from: "x10", to: "x11", C: "ϵ", L: 2 },
//       { from: "x10", to: "x12", C: "a", L: 1 },
//       { from: "x11", to: "x12", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundClassical = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 1 },
//       { from: "x2", to: "x4", C: "ϵ", L: 1 },
//       { from: "x3", to: "x4", C: "ϵ", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundClassicalMixJoinCase1 = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 1 },
//       { from: "x2", to: "x4", C: "ϵ", L: 1 },
//       { from: "x3", to: "x4", C: "a", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundClassicalMixJoinCase2 = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 1 },
//       { from: "x2", to: "x4", C: "a", L: 1 },
//       { from: "x3", to: "x4", C: "ϵ", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundClassicalWithCycle = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x4", C: "ϵ", L: 2 },
//       { from: "x3", to: "x2", C: "ϵ", L: 1 },
//       { from: "x4", to: "x3", C: "ϵ", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundRelaxed = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 1 },
//       { from: "x2", to: "x4", C: "ϵ", L: 1 },
//       { from: "x3", to: "x2", C: "ϵ", L: 1 },
//       { from: "x4", to: "x3", C: "ϵ", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundWeak = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "b", L: 2 },
//       { from: "x1", to: "x4", C: "ϵ", L: 2 },
//       { from: "x2", to: "x3", C: "ϵ", L: 2 },
//       { from: "x3", to: "x2", C: "a", L: 1 },
//       { from: "x3", to: "x5", C: "ϵ", L: 1 },
//       { from: "x4", to: "x5", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundEasy = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 },
//       { id: "x5", type: "c", label: "", M: 0 },
//       { id: "x6", type: "e", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "ϵ", L: 2 },
//       { from: "x1", to: "x5", C: "ϵ", L: 2 },
//       { from: "x2", to: "x3", C: "b", L: 1 },
//       { from: "x3", to: "x4", C: "ϵ", L: 2 },
//       { from: "x4", to: "x3", C: "a", L: 1 },
//       { from: "x4", to: "x6", C: "ϵ", L: 1 },
//       { from: "x5", to: "x6", C: "ϵ", L: 1 }
//     ]
//   });

//   const soundNoConclusion = JSON.stringify({
//     vertices: [
//       { id: "x1", type: "b", label: "", M: 0 },
//       { id: "x2", type: "c", label: "", M: 0 },
//       { id: "x3", type: "c", label: "", M: 0 },
//       { id: "x4", type: "c", label: "", M: 0 }
//     ],
//     edges: [
//       { from: "x1", to: "x2", C: "a", L: 1 },
//       { from: "x2", to: "x3", C: "ϵ", L: 2 },
//       { from: "x3", to: "x2", C: "b", L: 1 },
//       { from: "x3", to: "x4", C: "ϵ", L: 1 }
//     ]
//   });

  // const pisowifi = JSON.stringify({
  //   vertices: [
  //     { id: "b1", type: "b", label: "AccessPoint", M: 0 },
  //     { id: "c1", type: "c", label: "ConnectToAP", M: 0 },
  //     { id: "b2", type: "b", label: "UserPortal", M: 0 },
  //     { id: "c2", type: "c", label: "NewSession", M: 0 },
  //     { id: "c3", type: "c", label: "StartSession", M: 0 },
  //     { id: "b3", type: "b", label: "CoinSlot", M: 1 },
  //     { id: "c4", type: "c", label: "InsertCoin", M: 0 },
  //     { id: "c5", type: "c", label: "CoinCheck", M: 0 },
  //     // { id: "c6", type: "c", label: "EjectCoin", M: 0 },
  //     { id: "c7", type: "c", label: "AcceptCoin", M: 0 },
  //     { id: "c8", type: "c", label: "AddTime", M: 0 },
  //     { id: "e1", type: "e", label: "WifiManager", M: 1 },
  //     { id: "c9", type: "c", label: "TrackSession", M: 0 },
  //     // { id: "c10", type: "c", label: "PauseSession", M: 0 },
  //     { id: "c11", type: "c", label: "EndSession", M: 0 }
  //   ],
  //   edges: [
  //     { from: "b1", to: "c1", C: "ϵ", L: 1 },
  //     { from: "c1", to: "b2", C: "isConnected", L: 1 },
  //     { from: "b2", to: "c2", C: "ϵ", L: 2 },
  //     { from: "b2", to: "c3", C: "ϵ", L: 2 },
  //     { from: "c2", to: "b3", C: "isCurrentUser", L: 2 },
  //     { from: "c3", to: "e1", C: "hasTime", L: 2 },
  //     { from: "b3", to: "c4", C: "ϵ", L: 1 },
  //     { from: "b3", to: "c5", C: "ϵ", L: 1 },
  //     { from: "c4", to: "c5", C: "isInserted", L: 1 },
  //     // { from: "c5", to: "c6", C: "isInvalidCoin", L: 1 },
  //     // { from: "c6", to: "c11", C: "ϵ", L: 1 },
  //     { from: "c5", to: "c7", C: "isValidCoin", L: 1 },
  //     { from: "c7", to: "c8", C: "ϵ", L: 1 },
  //     { from: "c8", to: "e1", C: "isAdded", L: 1 },
  //     { from: "e1", to: "c9", C: "ϵ", L: 1 },
  //     // { from: "c9", to: "c10", C: "userExit", L: 1 },
  //     { from: "c9", to: "c11", C: "noTime", L: 1 },
  //     // { from: "c10", to: "b2", C: "ϵ", L: 1 }
  //   ]
  // });

//   // Convert RDLT to PN. 
//   visualize(convert(rdltInput,true),"test"); // Empty RDLT input test
//   // visualize(convert(structure1,false),"struct1");
//   // visualize(convert(structure2,false),"struct2");
//   // visualize(convert(structure3,false),"struct3");
//   // visualize(convert(structure4,false),"struct4");
//   // visualize(convert(structure5,false),"struct5");
//   // visualize(convert(structure6,false),"struct6");
//   // visualize(convert(structure7,false),"struct7");
//   // visualize(convert(structure8,false),"struct8");
//   // visualize(convert(structure9,false),"struct9");
//   // visualize(convert(siblingProcessWithORJOIN,false),"splitTestCase1");
//   // visualize(convert(siblingProcessWithoutORJOIN,false),"splitTestCase2");
//   // visualize(convert(nonSiblingProcess,false),"splitTestCase3");
//   // visualize(convert(loopingProcess,false),"splitTestCase4");
//   // visualize(convert(mixJoinVariant1,false),"mixJoinVariant1");
//   // visualize(convert(mixJoinVariant2,false),"mixJoinVariant2");
//   // visualize(convert(mixJoinVariant3,false),"mixJoinVariant3");
//   // visualize(convert(abstractArcSingle,false),"abstractArcSingle");
//   // visualize(convert(abstractArcMultiple,false),"abstractArcMultiple");
//   // visualize(convert(abstractArcSelfLoop,false),"abstractArcSelfLoop");
//   // visualize(convert(abstractArcInVertexCycle,false),"abstractArcInVertexCycle");
//   // visualize(convert(abstractArcOutVertexCycle,false),"abstractArcOutVertexCycle");
//   // visualize(convert(abstractArcReverse,false),"abstractArcReverse");
//   // visualize(convert(rbsSingleNode,false),"rbsSingleNode");
//   // visualize(convert(rbsMultipleInBridges,false),"rbsMultipleInBridges");
//   // visualize(convert(rbsMixJoinInBridges,false),"rbsMixJoinInBridges");
//   // visualize(convert(rbsMultipleOutBridges,false),"rbsMultipleOutBridges");
//   // visualize(convert(rbsMultipleOutVertex,false),"rbsMultipleOutVertex");
//   // visualize(convert(rbsTypeAlikeOutBridges,false),"rbsTypeAlikeOutBridges");
//   // visualize(convert(rbsMultipleCenters,false),"rbsMultipleCenters");
//   // visualize(convert(soundClassicalWithCycles),"soundClassicalWithCycles"); 
//   // visualize(convert(soundClassical),"soundClassical"); 
//   // visualize(convert(soundClassicalMixJoinCase1),"soundClassicalMixJoinCase1"); 
//   // visualize(convert(soundClassicalMixJoinCase2),"soundClassicalMixJoinCase2"); 
//   // visualize(convert(soundClassicalWithCycle),"soundClassicalWithCycle"); 
//   // visualize(convert(soundRelaxed),"soundRelaxed"); 
//   // visualize(convert(soundWeak),"soundWeak"); 
//   // visualize(convert(soundEasy),"soundEasy"); 
//   // visualize(convert(soundNoConclusion),"soundNoConclusion"); 
//   // visualize(convert(evsaTest),"evsaTest");
//   // visualize(convert(castilloInput),"castillo");
//   // visualize(convert(pisowifi),"pisowifi"); 
// }

// function visualize(conversionResult, filename) {
//   console.log(`${filename} Soundness Preservation: ${conversionResult.soundness}`);
  
//   // Visualizing input RDLT
//   const rdltDOT = exportRDLTToDOT(conversionResult.rdlt);
//   writeDOTToFile(rdltDOT, `outputs/DOT/${filename}_input_RDLT.dot`);
//   renderDOT(`outputs/DOT/${filename}_input_RDLT.dot`, `outputs/renderedDOT/input_rdlt/${filename}_input_RDLT.svg`);
  
//   // Visualize Level-1 RDLT:
//   const level1DOT = exportRDLTToDOT(conversionResult.preprocess.level1);
//   writeDOTToFile(level1DOT, `outputs/DOT/${filename}_prepro_RDLT_level1.dot`);
//   renderDOT(`outputs/DOT/${filename}_prepro_RDLT_level1.dot`, `outputs/renderedDOT/level1/${filename}_prepro_RDLT_level1.svg`);

//   // Visualize Level-2 RDLTs for each RBS:
//   for (let rbsId in conversionResult.preprocess.level2) {
//     const level2DOT = exportRDLTToDOT(conversionResult.preprocess.level2[rbsId]);
//     writeDOTToFile(level2DOT, `outputs/DOT/${filename}_prepro_RDLT_level2_${rbsId}.dot`);
//     renderDOT(`outputs/DOT/${filename}_prepro_RDLT_level2_${rbsId}.dot`, 
//       `outputs/renderedDOT/level2/${filename}_prepro_RDLT_level2_${rbsId}.svg`);
//   }

//   const combinedDOT = exportRDLTToDOT(conversionResult.combinedModel);
//   writeDOTToFile(combinedDOT, `outputs/DOT/${filename}_combinedDOT.dot`);
//   renderDOT(`outputs/DOT/${filename}_combinedDOT.dot`, `outputs/renderedDOT/rdlt_combined/${filename}_combinedLevels.svg`);

//   // Visualizing output PN
//   const pnDOT = exportPNToDOT(conversionResult.petriNet);
//   writeDOTToFile(pnDOT, `outputs/DOT/${filename}_output_PN.dot`);
//   renderDOT(`outputs/DOT/${filename}_output_PN.dot`, `outputs/renderedDOT/output_pn/${filename}_output_PN.svg`);
// }

// main();