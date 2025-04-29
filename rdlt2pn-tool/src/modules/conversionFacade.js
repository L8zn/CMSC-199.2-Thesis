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
  const parsedRDLT = parseRDLT(rdltInput);
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
  const outputPnModel = mapToPetriNet(combinedRDLT);
  
  // console.log(outputPnModel);
  if(!extend) 
      return { rdlt: inputRdltModel, preprocess: preprocessedModel, combinedModel: combinedRDLT, petriNet: outputPnModel};
  // Run structural analysis.
  const structResults = structuralAnalysis(outputPnModel);
  console.log("Strongly Connected:",structResults.connectivityDetails.stronglyConnected);
  console.log(`Counted a total of ${structResults.transitionsCount} transitions with:`);
  console.log(` - Transitions that Correspons to a Check Operation (${structResults.checkTransitions.length})`);
  console.log(` - Transitions that Corresponds to a Traverse Operation (${structResults.traverseTransitions.length})`);
  console.log(` - Reset Transitions (${structResults.resetTransitions.length})`);
  console.log(`Counted a total of ${structResults.placesCount} places with:`);
  console.log(` - Global Source Place (${structResults.globalSource.length})`);
  console.log(` - Global Sink Place (${structResults.globalSink.length})`);
  console.log(` - Auxiliary Places (${structResults.auxiliaryPlaces.length})`);
  console.log(` - Places that Corresponds to a Checked Arc (${structResults.checkedPlaces.length})`);
  console.log(` - Places that Corresponds to a Traversed Arc (${structResults.traversedPlaces.length})`);
  console.log(` - Consensus Places (${structResults.consensusPlaces.length})`);
  console.log(` - Places that Corresponds to an Unconstrained Epsilon Arc (${structResults.unconstrainedPlaces.length})`);
  console.log(` - Split Places that Corresponds to Checked Arcs (${structResults.splitPlaces.length})`);
  console.log(structResults.connectivityDetails.report);

  console.log("Structural Issues:");
  structResults.issues.forEach(issue => console.log(" -", issue));
  
  // Run behavioral analysis.
  const result = behavioralAnalysis(outputPnModel, 1000);

  // console.log(result.simulationResults[0]);
  console.log("Firing Sequence Count:",result.simulationResults.length);

  console.log("Firing Sequence Simulated: ");
  for(const firingSequence of result.simulationResults){
    let fireseq = [];
    let activities = [];
    let activityCount = 0;
    for (let i = 0; i < firingSequence.length; i++) {
      if (i === 0 || i === firingSequence.length - 1) continue; // Skip first and last elements
      fireseq.push(`${firingSequence[i].firedTransitions}`);
      let activity = [];
      firingSequence[i].firedTransitions.forEach(transitionId => {
        if(outputPnModel.transitions[transitionId].activities) 
          activity.push(outputPnModel.transitions[transitionId].activities.split('),'));
      });
      if(activity.length!==0) {
        activityCount++;
        activities.push(`S(${activityCount})={${activity.join(',')}}`);
      }
      // if (i !== firingSequence.length - 2) {
      //   fireseq += " → "; // Only add arrow if it's not the second to last element
      // }
    }
    console.log("Firing Seqence",result.simulationResults.indexOf(firingSequence)+1);
    console.log(fireseq);
    console.log(activities);
    // console.log("Activity Extraction");
    // const activityExtraction = activities.join(',');
    // console.log(activityExtraction);
    // const simulation = {
    //   firingSequence: fireseq,
    //   activityExtraction: activityExtraction
    // };
    // firingSequence.push(simulation);
    result.perSequenceResults[result.simulationResults.indexOf(firingSequence)].firingSequence = fireseq;
    result.perSequenceResults[result.simulationResults.indexOf(firingSequence)].activityExtraction = activities;
  }

  // console.log(result.simulationResults);

  console.log(result.perSequenceResults);
  console.log("Overall Liveness: ",result.overallLiveness);
  console.log("Overall Termination: ",result.overallTermination);
  console.log("Output PN Soundness: ",result.overallSoundness);

  // // Step 4: Validate Soundness Preservation.
  const rdltSoundness = checkRDLTSoundness(inputRdltModel);
  const pnSoundness = checkPNSoundness(outputPnModel);
  console.log(`Input RDLT Soundness: ${rdltSoundness} (placeholder)`);
  // const soundnessPreserved = (rdltSoundness.toLowerCase() === result.overallSoundness.toLowerCase());
  // console.log(`RDLT soundness: ${rdltSoundness}, PN soundness: ${result.overallSoundness}`);
  
  return { rdlt: inputRdltModel, preprocess: preprocessedModel, combinedModel: combinedRDLT,
    petriNet: outputPnModel, soundness: pnSoundness };
}


// Moved combineLevels function:
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