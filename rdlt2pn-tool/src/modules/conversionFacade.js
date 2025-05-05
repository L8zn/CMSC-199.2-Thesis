// src/modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { preprocessRDLT } from './preprocessor.js';
import { mapToPetriNet } from './mapper.js';
import { RDLTModel } from '../models/rdltModel.js';
import { structuralAnalysis } from './structuralAnalysis.js';
import { behavioralAnalysis} from './behavioralAnalysis.js';

export function convert(rdltInput, extend = true) {
  let parsedRDLT;
  try{
    // Step 1: Parse the RDLT input.
    parsedRDLT = parseRDLT(rdltInput, extend);
    // Step 2: Initialize RDLTModel from JSON using the static fromJSON method.
    const inputRdltModel = RDLTModel.fromJSON(parsedRDLT.rdltJSON);
    // Step 3: Preprocess the parsed RDLT model into level-1 and level-2 models.
    const preprocessedModel = preprocessRDLT(inputRdltModel, extend);
    // Step 4: Combine the two levels into one RDLT.
    const combinedRDLT = combineLevels(preprocessedModel.level1, preprocessedModel.level2);
    // Step 5: Map the preprocessed RDLT model to a Petri Net.
    const mappingResult = mapToPetriNet(combinedRDLT);
    const outputPnModel = mappingResult.petriNet;

    let payload = {
      rdlt: inputRdltModel, 
      preprocess: preprocessedModel, 
      combinedModel: combinedRDLT, 
      petriNet: outputPnModel,
      visualizeConversion: mappingResult.conversionDOT
    };
    // Only apply analysis if preprocessed RDLT is extended 
    if(!extend) {
      return { data: payload, warnings: parsedRDLT.warnings };
    }
    // Run structural analysis and behavioral analysis.
    payload.structAnalysis = structuralAnalysis(outputPnModel);;
    payload.behaviorAnalysis = behavioralAnalysis(outputPnModel, 1000); 
    return { data: payload, warnings: parsedRDLT.warnings };
  } catch (err) {
    return { error: err.message, warnings: parsedRDLT.warnings };
  }
}

function combineLevels(level1, level2) {
  // Create a new RDLT model to hold the combined levels.
  const combinedModel = new RDLTModel();

  // First, add all nodes and edges from level1.
  Object.values(level1.nodes).forEach(node => {
    combinedModel.addNode({ ...node });
  });
  level1.edges.forEach(edge => {
    combinedModel.addEdge({ ...edge });
  });

  // Then, for each level2 model (each corresponding to a reset-bound subsystem),
  // rename the nodes and edges (for example, by appending an apostrophe)
  // and add them to the combined model.
  for (const centerId in level2) {
    const level2Model = level2[centerId];
    // Optionally, store the group info:
    combinedModel.rbsGroups = combinedModel.rbsGroups || {};
    combinedModel.rbsGroups[centerId] = [];

    // Rename and add nodes.
    Object.values(level2Model.nodes).forEach(node => {
      const renamedNode = {
        ...node,
        id: node.id + "'",
        label: node.label ? node.label + "'" : "",
        // Mark if this node is the center of the RBS:
        center: (node.id === centerId),
        rbsGroup: centerId
      };
      combinedModel.addNode(renamedNode);
      combinedModel.rbsGroups[centerId].push(node.id);
    });

    // Rename and add edges.
    level2Model.edges.forEach(edge => {
      const renamedEdge = {
        ...edge,
        from: edge.from + "'",
        to: edge.to + "'",
        rbsGroup: centerId
      };
      combinedModel.addEdge(renamedEdge);
    });
  }

  return combinedModel;
}