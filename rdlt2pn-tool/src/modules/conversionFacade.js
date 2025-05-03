// src/modules/conversionFacade.js
import { parseRDLT } from './parser.js';
import { preprocessRDLT } from './preprocessor.js';
import { mapToPetriNet } from './mapper.js';
import { checkRDLTSoundness, checkPNSoundness } from './validator.js';
import { RDLTModel } from '../models/rdltModel.js';
import { structuralAnalysis } from './structuralAnalysis.js';
import { behavioralAnalysis, simulateBehavior } from './behavioralAnalysis.js';

export function convert(rdltInput, extend = true) {
  // Step 1: Parse the RDLT input.
  // const rdltJSON = parseRDLT(rdltInput);
  const parsedRDLT = parseRDLT(rdltInput, extend);
  console.log('parsed OK,', parsedRDLT.warnings.length === 0? '0 warnings': ' warnings: '+ parsedRDLT.warnings);

  // Create the RDLTModel from JSON using the static fromJSON method.
  const inputRdltModel = RDLTModel.fromJSON(parsedRDLT.rdltJSON);

  // console.log(inputRdltModel);

  // Step 2: Preprocess the parsed RDLT model into level-1 and level-2 models.
  const preprocessedModel = preprocessRDLT(inputRdltModel,extend);

  // console.log(preprocessedModel.level1);

  // NEW: Combine the two levels into one RDLT.
  const combinedRDLT = combineLevels(preprocessedModel.level1, preprocessedModel.level2);

  // console.log(combinedRDLT);
  
  // Step 3: Map the preprocessed RDLT model to a Petri Net.
  const mappingResult = mapToPetriNet(combinedRDLT)
  const outputPnModel = mappingResult.petriNet;
  
  // console.log(outputPnModel);
  if(!extend) {
    return { 
      rdlt: inputRdltModel, 
      preprocess: preprocessedModel, 
      combinedModel: combinedRDLT, 
      petriNet: outputPnModel,
      visualizeConversion: mappingResult.conversionDOT
    };
  }
  // Run structural analysis.
  const structuralResult = structuralAnalysis(outputPnModel);
  // console.log("Strongly Connected:",structuralResult.connectivityDetails.stronglyConnected);
  // console.log(`Counted a total of ${structuralResult.transitionsCount} transitions with:`);
  // console.log(` - Transitions that Corresponds to a Check Operation (${structuralResult.checkTransitions.length})`);
  // console.log(` - Transitions that Corresponds to a Traverse Operation (${structuralResult.traverseTransitions.length})`);
  // console.log(` - Reset Transitions (${structuralResult.resetTransitions.length})`);
  // console.log(`Counted a total of ${structuralResult.placesCount} places with:`);
  // console.log(` - Global Source Place (${structuralResult.globalSource.length})`);
  // console.log(` - Global Sink Place (${structuralResult.globalSink.length})`);
  // console.log(` - Auxiliary Places (${structuralResult.auxiliaryPlaces.length})`);
  // console.log(` - Places that Corresponds to a Checked Arc (${structuralResult.checkedPlaces.length})`);
  // console.log(` - Places that Corresponds to a Traversed Arc (${structuralResult.traversedPlaces.length})`);
  // console.log(` - Consensus Places (${structuralResult.consensusPlaces.length})`);
  // console.log(` - Places that Corresponds to an Unconstrained Epsilon Arc (${structuralResult.unconstrainedPlaces.length})`);
  // console.log(` - Split Places that Corresponds to Checked Arcs (${structuralResult.splitPlaces.length})`);
  // console.log(structuralResult.connectivityDetails.report);

  // console.log("Structural Issues:");
  // structuralResult.issues.forEach(issue => console.log(" -", issue));
  
  // Run behavioral analysis.
  const behavioralResult = behavioralAnalysis(outputPnModel, 1000);

  // console.log(behavioralResult.simulationResults[0]);
  console.log("Firing Sequence Count:",behavioralResult.simulationResults.length);

  console.log("Firing Sequence Simulated: ");
  for(const firingSequence of behavioralResult.simulationResults){
    let fireseq = [];
    let activities = [];
    let activityCount = 0;
    for (let i = 0; i < firingSequence.length; i++) {
      if (i === 0 || i === firingSequence.length - 1) continue; // Skip first and last elements
      fireseq.push(`${firingSequence[i].firedTransitions}`);
      let activity = [];
      firingSequence[i].firedTransitions.forEach(transitionId => {
        if(outputPnModel.transitions[transitionId].activities) 
          activity.push(outputPnModel.transitions[transitionId].activities);
      });
      if(activity.length!==0) {
        activityCount++;
        activities.push(`S(${activityCount})={${activity.join(',')}}`);
      }
      // if (i !== firingSequence.length - 2) {
      //   fireseq += " → "; // Only add arrow if it's not the second to last element
      // }
    }
    // console.log("Firing Seqence",behavioralResult.simulationResults.indexOf(firingSequence)+1);
    // console.log(fireseq);
    // console.log(activities);
    // console.log("Activity Extraction");
    // const activityExtraction = activities.join(',');
    // console.log(activityExtraction);
    behavioralResult.perSequenceResults[behavioralResult.simulationResults.indexOf(firingSequence)].firingSequence = fireseq;
    behavioralResult.perSequenceResults[behavioralResult.simulationResults.indexOf(firingSequence)].activityExtraction = activities;
  }

  // console.log(result.simulationResults);

  // console.log(behavioralResult.perSequenceResults);
  // console.log("Overall Liveness: ",behavioralResult.overallLiveness);
  // console.log("Overall Termination: ",behavioralResult.overallTermination);
  // console.log("Output PN Soundness: ",behavioralResult.overallSoundness);

  // // Step 4: Validate Soundness Preservation.
  const rdltSoundness = checkRDLTSoundness(inputRdltModel);
  const pnSoundness = checkPNSoundness(outputPnModel);
  console.log(`Input RDLT Soundness: ${rdltSoundness} (placeholder)`);
  // const soundnessPreserved = (rdltSoundness.toLowerCase() === result.overallSoundness.toLowerCase());
  // console.log(`RDLT soundness: ${rdltSoundness}, PN soundness: ${result.overallSoundness}`);
  
  return { 
    rdlt: inputRdltModel,
    preprocess: preprocessedModel, 
    combinedModel: combinedRDLT,
    petriNet: outputPnModel, 
    structAnalysis: structuralResult, 
    behaviorAnalysis: behavioralResult,
    visualizeConversion: mappingResult.conversionDOT
  };
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