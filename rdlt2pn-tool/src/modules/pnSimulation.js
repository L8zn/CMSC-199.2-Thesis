// Updated Petri Net Simulation Module for PNModel
// Assumptions based on your provided PNModel structure:
// - pnModel.places: an object keyed by place id; each place has properties:
//      id, label, tokens, incoming (array of arcs), outgoing (array of arcs)
// - pnModel.transitions: an object keyed by transition id; each transition has properties:
//      id, label, incoming (array of arcs), outgoing (array of arcs)
// - Each arc is an object with: { from, to, type, weight }.
//   If weight is not defined, assume weight = 1.
// - A "reset" arc (arc.type === 'reset') does not need tokens to enable firing.
//   When fired, it resets the tokens of its source place to zero.
// - A sink place is one whose 'outgoing' array is empty.
// - The simulation returns an array of firing sequences. Each firing sequence is an array
//   of time step objects (each reporting the fired transitions and the resulting marking).

/**
 * Returns a deep copy of the current marking as an object: { placeId: tokenCount, ... }
 */
function getMarking(pnModel) {
  const marking = {};
  Object.values(pnModel.places).forEach(place => {
    marking[place.id] = place.tokens;
  });
  return marking;
}

/**
 * Checks if a transition is enabled under a given marking.
 * A transition is enabled if, for every incoming arc (except for reset arcs), the source place
 * has at least the required number of tokens.
 */
function isTransitionEnabled(transition, marking, pnModel) {
  for (let arc of transition.incoming) {
    
    // For reset arcs, we do not require tokens to be present.
    if (arc.type === 'reset') {
      continue;
    }
    const required = arc.weight || 1;
    if(transition.id === "Tx1") {
      console.log("place id:",arc.from,"marking:", marking[arc.from]);
      console.log(transition.id,arc.from,marking[arc.from],!marking[arc.from],required,marking[arc.from] < required);
    }
    
    if (marking[arc.from] < required) {
      return false;
    }
  }
  return true;
}

/**
 * Returns a list of all enabled transitions in the PN under the given marking.
 */
function getEnabledTransitions(marking, pnModel) {
  const enabled = [];
  Object.values(pnModel.transitions).forEach(transition => {
    if (isTransitionEnabled(transition, marking, pnModel)) {
      enabled.push(transition);
    }
  });
  return enabled;
}

/**
 * Groups enabled transitions by a conflict key.
 * We form a key by taking the sorted list of input place IDs (ignoring reset arcs).
 * If two transitions have the same set of non-reset input places, they are considered to be in conflict.
 */
function groupTransitions(enabled) {
  const groups = {};
  enabled.forEach(trans => {
    const inputs = trans.incoming
      .filter(arc => arc.type !== 'reset')
      .map(arc => arc.from)
      .sort();
    const key = inputs.join(',');
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(trans);
  });
  return groups;
}

/**
 * Fires a set of transitions concurrently on the given marking.
 * For each incoming arc:
 *   - If arc.type is 'reset', set the tokens of the source place to 0.
 *   - Otherwise, subtract the specified number of tokens (weight, default 1).
 * Then, for each outgoing arc, add tokens (using arc.weight, default 1).
 * Returns the new marking.
 */
function fireTransitions(marking, transitions, pnModel) {
  // Create a copy of the current marking.
  const newMarking = { ...marking };

  // Process incoming arcs for each transition.
  transitions.forEach(trans => {
    trans.incoming.forEach(arc => {
      if (arc.type === 'reset') {
        newMarking[arc.from] = 0;
      } else {
        const weight = arc.weight || 1;
        newMarking[arc.from] = (newMarking[arc.from] || 0) - weight;
      }
    });
  });

  // Process outgoing arcs for each transition.
  transitions.forEach(trans => {
    trans.outgoing.forEach(arc => {
      const weight = arc.weight || 1;
      newMarking[arc.to] = (newMarking[arc.to] || 0) + weight;
    });
  });
  return newMarking;
}

/**
 * Checks if the current marking is "terminal" (i.e. a sink marking).
 * We define a marking as terminal if every place with tokens is a sink (has no outgoing arcs).
 */
function isTerminalMarking(marking, pnModel) {
  for (let placeId in marking) {
    if (marking[placeId] > 0) {
      const place = pnModel.places[placeId];
      if (place.outgoing && place.outgoing.length > 0) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Recursive simulation function.
 * currentMarking: the current marking (object).
 * sequence: an array of time step reports so far.
 * sequences: a collection of full firing sequences.
 */
function simulateRecursive(currentMarking, sequence, sequences, pnModel) {
  // if (isTerminalMarking(currentMarking, pnModel)) {
  //   sequences.push(sequence.slice());
  //   return;
  // }
  const enabled = getEnabledTransitions(currentMarking, pnModel);
  // if() console.log(enabled);
  if (enabled.length === 0) {
    // Deadlock encountered.
    return;
  }
  const groups = groupTransitions(enabled);
  const conflictGroups = [];
  for (let key in groups) {
    conflictGroups.push(groups[key]);
  }

  // Helper function to compute the Cartesian product of arrays.
  function cartesianProduct(arrays) {
    return arrays.reduce((a, b) =>
      a.flatMap(d => b.map(e => d.concat([e]))),
      [[]]
    );
  }
  const concurrentSets = cartesianProduct(conflictGroups);

  // For each set of concurrently fired transitions, fire them and simulate recursively.
  concurrentSets.forEach(transitionsToFire => {
    const newMarking = fireTransitions(currentMarking, transitionsToFire, pnModel);
    const timeStepReport = {
      fired: transitionsToFire.map(t => t.id),
      marking: newMarking
    };
    sequence.push(timeStepReport);
    simulateRecursive(newMarking, sequence, sequences, pnModel);
    sequence.pop();
  });
}

/**
 * Main simulation function.
 * It takes a PNModel instance and returns an array of firing sequences.
 * Each firing sequence is an array of time step reports.
 */
export function simulatePN(pnModel) {
  const initialMarking = getMarking(pnModel);
  // console.log(initialMarking);
  const sequences = [];
  simulateRecursive(initialMarking, [], sequences, pnModel);
  console.log(sequences);
  return sequences;
}
