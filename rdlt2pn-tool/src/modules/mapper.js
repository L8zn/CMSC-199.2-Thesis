// src/modules/mapper.js

import { PNModel } from "../models/pnModel.js";
import { mapVertexToTransition, 
  handleSplitPlaces, 
  handleIncomingArcs, 
  handleEpsilonArcs,
  handleSigmaArcs,
  handleRBS,
  handleBridgeArcs,
  handleAuxiliaryPlaces,
  handleSourceTransitions } from "../utils/strategy.js";
import { generateRDLTDOT, generatePNDOT, writeDOTToFile, renderDOT } from './visualization.js';

/**
 * mapToPetriNet() expects a preprocessedModel with the structure:
 * {
 *   level1: level1Graph,  // RDLTModel for level 1 (graph-based)
 *   level2: level2       // object mapping each RBS id to an RDLTModel instance (graph-based)
 * }
 * 
 * Castillo's Mapping Algo is split into 9 Steps:
 * 
 * Step 1 (Lines 1–2): Map each RDLT node to a PN transition.
 * Step 2 (Lines 3–8): Process split nodes. 
 *  Analyze outgoing edges to decide if the node qualifies as a split. 
 *  Then, based on sibling detection, decide if a split place (Pxsplit) is created.
 * Step 3 (Lines 9–17): For each node with incoming edges, 
 *  create the input place (Pym) and—if needed for Σ‑constrained arcs—create auxiliary PN components (TJy, PJy).
 * Step 4 (Lines 18–29): Process epsilon arcs and create the appropriate auxiliary PN components.
 * Step 5 (Lines 30–46): Process Σ‑constrained arcs, ensuring that extra auxiliary places and reset arcs are created.
 * Step 6 (Lines 47–55): Map reset-bound subsystems by processing the level‑2 RDLT graphs.
 * Step 7 (Lines 56–60): Process bridge arcs that connect level‑1 and level‑2.
 * Step 8 (Lines 61–68): Process auxiliary places and properly wire reset arcs.
 * Step 9 (Line 69): Connect all source nodes to a global source place.
 */
// Function to combine level1 and level2 RDLT models into a single RDLT model.
// For vertices and edges from level2, append an apostrophe (') to the id and label.
import { RDLTModel } from '../models/rdltModel.js';

export function mapToPetriNet(preprocessedModel) {
  // Initialize Empty PetriNet Model
  const petriNet = new PNModel();

  const combinedRDLT = combineLevels(preprocessedModel.level1,preprocessedModel.level2)

  // console.log(JSON.stringify(combinedRDLT.toJSON(), null, 2));
  console.log(combinedRDLT.rbsGroups);

  // Step 1
  mapVertexToTransition(combinedRDLT, petriNet);
  // Step 2 
  handleSplitPlaces(combinedRDLT, petriNet);
  // Step 3
  handleIncomingArcs(combinedRDLT, petriNet);
  // Step 4
  handleEpsilonArcs(combinedRDLT, petriNet);
  // Step 5
  handleSigmaArcs(combinedRDLT, petriNet);
  // Step 6
  handleRBS(combinedRDLT, petriNet);
  // Step 7
  handleBridgeArcs(combinedRDLT, petriNet);
  // Step 8
  handleAuxiliaryPlaces(combinedRDLT, petriNet);
  // Step 9
  handleSourceTransitions(petriNet);

  return petriNet;
}

function combineLevels(level1Model, level2Mapping) {
  const combinedModel = new RDLTModel();
  
  // Prepare an object to keep track of RBS groups.
  combinedModel.rbsGroups = {}; // Maps a center id to an array of node ids belonging to that RBS.
  
  // Add all nodes and edges from level1 as-is.
  Object.values(level1Model.nodes).forEach(node => {
    combinedModel.addNode({ ...node });
  });
  level1Model.edges.forEach(edge => {
    combinedModel.addEdge({ ...edge });
  });
  
  // For each level2 subgraph (each RBS), rename its nodes and edges, tag them, and add them.
  for (const centerId in level2Mapping) {
    const level2Model = level2Mapping[centerId];
    combinedModel.rbsGroups[centerId] = [];
    
    // Rename and add level2 nodes.
    Object.values(level2Model.nodes).forEach(node => {
      const renamedNode = {
        ...node,
        // Append an apostrophe to distinguish level2 nodes.
        id: node.id + "'",
        label: node.label ? node.label + "'" : node.id + "'",
        // Mark as center if it is the center of this RBS.
        center: (node.id === centerId),
        // New property: tag the node with the RBS group (its center id).
        rbsGroup: centerId
      };
      combinedModel.addNode(renamedNode);
      combinedModel.rbsGroups[centerId].push(renamedNode.id);
    });
    
    // Rename and add level2 edges.
    level2Model.edges.forEach(edge => {
      const renamedEdge = {
        ...edge,
        from: edge.from + "'",
        to: edge.to + "'",
        // Mark these edges as part of an RBS.
        rbsGroup: centerId
      };
      combinedModel.addEdge(renamedEdge);
    });
  }
  
  return combinedModel;
}