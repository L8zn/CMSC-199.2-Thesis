// src/utils/strategy.js

// Helper: Format a Petri Net node id/label based on whether the original id contains an apostrophe.
function formatPNId(prefix, id, suffix = "") {
  // If the id contains an apostrophe, then we assume it belongs to an RBS (level2).
  // Return e.g. "T'" + id with apostrophes removed + suffix.
  if (id.includes("'")) {
    return `${prefix}'${id.replace(/'/g, "")}${suffix}`;
  } else {
    return `${prefix}${id}${suffix}`;
  }
}

// Step 1 (Lines 1–2): Map each RDLT node to a PN transition.
export function mapVertexToTransition(preprocessedRDLTModel, petriNetModel) {
  // Map each vertex into a transition.
  for (const vertex of Object.values(preprocessedRDLTModel.nodes)) {
    const transition = { 
      id: formatPNId("T", vertex.id), 
      label: `check(${vertex.id})`,
      checkTransition: true
    };
    petriNetModel.addTransition(transition);
    if(vertex.label.trim()!=='' && !vertex.rbsGroup) petriNetModel.vertexLabelMap[vertex.id] = vertex.label;
  }
  // Map each edge into an arc.
  for (const edge of preprocessedRDLTModel.edges) {
    const arc = {
      from: formatPNId("T", edge.from),
      to: formatPNId("T", edge.to),
      type: edge.type === "abstract" ? "abstract" : "normal"
    };
    petriNetModel.addArc(arc);
  }
}

// Step 2 (Lines 3–8): Process split nodes. 
//  Analyze outgoing edges to decide if the node qualifies as a split. 
//  Then, based on sibling detection, decide if a split place (Pxsplit) is created.
export function handleSplitPlaces(preprocessedRDLTModel, petriNetModel) {
  for (const vertex of Object.values(preprocessedRDLTModel.nodes)) {
    if (preprocessedRDLTModel.checkIfSplitCase1(vertex) === true) {
      // Use formatPNId for places. Here the suffix "split" is appended.
      const splitPlace = {
        id: formatPNId("P", vertex.id, "split"),
        // label: formatPNId("P", vertex.label, "split"),
        label: `checked(${vertex.id})`,
        splitPlace: true,
        // checkedPlace: true,
        tokens: 0
      };
      vertex.splitPlace = true;
      petriNetModel.addPlace(splitPlace);
      // Insert the split place between the transition corresponding to this vertex and its outgoing arcs.
      petriNetModel.insertNodeOnOutgoingArcs(formatPNId("T", vertex.id), splitPlace.id);
      console.log(`Step2: Vertex ${vertex.id} qualifies as SPLIT case 1`);
    }
  }
}

// Step 3 (Lines 9–17): For each node with incoming edges, 
//   create the input place (Pym) 
//   and—if needed for Σ‑constrained arcs—create auxiliary PN components (TJy, PJy).
export function handleIncomingArcs(preprocessedRDLTModel, petriNetModel) {
  for (const vertex of Object.values(preprocessedRDLTModel.nodes)) {
    // Filter for edges whose 'to' equals the current vertex's id.
    const incomingEdges = preprocessedRDLTModel.edges.filter(edge => edge.to === vertex.id);
    if (incomingEdges.length > 0) {
      // Create input place "P<id>m" for vertex.
      let traversedArcs = `(${incomingEdges[0].from},${incomingEdges[0].to})`;
      for(const incomingEdge of incomingEdges) {
        if(incomingEdge !== incomingEdges[0])
          traversedArcs += `,(${incomingEdge.from},${incomingEdge.to})`;
      }
      const Pym = { 
        id: formatPNId("P", vertex.id, "m"), 
        // label: formatPNId("P", vertex.label, "m"), 
        label: `traversed(${traversedArcs})`,
        traversedPlace: true,
        tokens: 0 
      };
      petriNetModel.addPlace(Pym);
      petriNetModel.insertNodeOnIncomingArcs(formatPNId("T", vertex.id), Pym.id);
      // If the vertex is the sink ("o"), create Po and connect its transition to Po.
      if (vertex.id === "o") {
        const sinkPlace = { id: "Po", label: "Sink", globalSink: true, tokens: 0 };
        petriNetModel.addPlace(sinkPlace);
        petriNetModel.addArc({ 
          from: formatPNId("T", vertex.id), 
          to: sinkPlace.id, 
          type: "normal" 
        });
      }
      // Process incoming Σ‑constrained edges (where C !== "ϵ").
      const sigmaEdges = incomingEdges.filter(edge => edge.C !== "ϵ");
      if (sigmaEdges.length > 0) {
        let traversableArcs = `(${sigmaEdges[0].from},${sigmaEdges[0].to})`;
        // Create transition "TJ<id>" for the vertex.
        let TJy = { 
          id: formatPNId("T", `J${vertex.id}`), 
          // label: formatPNId("T", `J${vertex.label}`) 
          label: `traverse(${traversableArcs})`,
          traverseTransition: true, 
          activities: traversableArcs
        };
        // petriNetModel.addTransition(TJy);
        if (sigmaEdges.length === 1) {
          // If the source node of the single sigma edge qualifies as a split,
          // use its split place.
          petriNetModel.addTransition(TJy);
          const sourceNode = preprocessedRDLTModel.getNode(sigmaEdges[0].from);
          if (sourceNode.splitPlace)
            petriNetModel.insertNodeOnArc(
              formatPNId("P", sigmaEdges[0].from, "split"), 
              Pym.id, 
              TJy.id
            );
          else 
            petriNetModel.insertNodeOnArc(
              formatPNId("T", sigmaEdges[0].from), 
              Pym.id, 
              TJy.id
            );
        } else {
          // Check if any incoming arc from Pym.id is an epsilon arc
          for(const sigmaEdge of sigmaEdges) {
            if(sigmaEdge !== sigmaEdges[0])
              traversableArcs += `,(${sigmaEdge.from},${sigmaEdge.to})`;
          }
          TJy.label = `traverse(${traversableArcs})`;
          TJy.activities = traversableArcs;
          petriNetModel.addTransition(TJy);
          const incomingEpsilonEdges = incomingEdges.filter(edge => edge.C === "ϵ");
          if (incomingEpsilonEdges) {
            // console.log("IncomingEpsilonEdgesDetected");
            // console.log("incomingEpsilonEdges",incomingEpsilonEdges);
            petriNetModel.insertNodeOnIncomingArcs(Pym.id, TJy.id, true, incomingEpsilonEdges); // if epsilon arc exist 
          } else {
            // Perform the normal insertion for mapping structure 7
            petriNetModel.insertNodeOnIncomingArcs(Pym.id, TJy.id);
          }
        }
        // Create auxiliary place "PJ<id>" for the vertex.
        const allSameNonEpsilon = sigmaEdges.every(edge => edge.C === sigmaEdges[0].C && edge.C !== 'ϵ');
        const tokenCount = allSameNonEpsilon
          ? sigmaEdges.reduce((sum, edge) => sum + edge.L, 0)
          : Math.min(...sigmaEdges.map(edge => edge.L));

        let splitString = traversableArcs.split(',');
        let auxLabel = `L${splitString[0]},${splitString[1]}`;
        for(let i=0; i<splitString.length-2; i+=2){
          if(i===0) {
            let tokenrule = allSameNonEpsilon ? 'sum':'min';
            auxLabel = tokenrule+'{'+auxLabel;
          }
          auxLabel += `,L${splitString[2+i]},${splitString[2+i+1]}`;
          if(i+2===splitString.length-2) auxLabel += '}';
        }
        let PJy = { 
          id: formatPNId("P", `J${vertex.id}`), 
          // label: formatPNId("PJ", vertex.label), 
          label: auxLabel,
          tokens: tokenCount,
          auxiliary: true,
          resetTarget: formatPNId("T", vertex.id)
        };
        if(vertex.rbsGroup) PJy.rbsGroup = vertex.rbsGroup;
        // console.log(vertex,PJy);
        petriNetModel.addPlace(PJy);
        petriNetModel.addArc({ from: PJy.id, to: TJy.id, type: "normal" });
      }
      console.log(`[Step3] Processed incoming arcs for vertex ${vertex.id}`);
    }
  }
}

// Step 4 (Lines 18–29): Process epsilon arcs 
// and create the appropriate auxiliary PN components.
export function handleEpsilonArcs(preprocessedRDLTModel, petriNetModel) {
  // Filter for edges whose constraint is exactly epsilon.
  const epsilonArcs = preprocessedRDLTModel.edges.filter(edge => edge.C === 'ϵ');
  // let abstractIndex = 0;
  let indexMap = new Map();
  epsilonArcs.forEach(arc => {
    const sourceId = arc.from;
    const targetId = arc.to;
    if (arc.type === "abstract") {
      if(!indexMap[sourceId,targetId]) indexMap[sourceId,targetId] = 1;
      else indexMap[sourceId,targetId]++;
      // abstractIndex++;
      const transitionId = formatPNId("T", `ϵ${targetId}`, `_${indexMap[sourceId,targetId]}`);
      // const transitionLabel = formatPNId("T", `ϵ${targetLabel}`, `_${abstractIndex}`);
      const transitionLabel = `traverse((${sourceId},${targetId}))\\nrbsPath(${arc.path})`;
      const T_epsilon = { 
        id: transitionId,
        label: transitionLabel,
        traverseTransition: true,
        activities: `(${sourceId},${targetId})`
      };
      petriNetModel.addTransition(T_epsilon);
      if(petriNetModel.places[formatPNId("P", `${sourceId}`, "split")]){ // if multiple abstract arcs
        const pnAbstractArcs = petriNetModel.arcs.filter(
          arc => arc.from === formatPNId("P", `${sourceId}`, "split") && arc.type === "abstract");
        for (const pnAbstractArc of pnAbstractArcs) {
          petriNetModel.removeArc(pnAbstractArc);
        }
        petriNetModel.addArc({ from: formatPNId("P", `${sourceId}`, "split"), to: T_epsilon.id, type: "normal" });
        petriNetModel.addArc({ from: T_epsilon.id, to: formatPNId("P", `${targetId}`, "m"), type: "normal" });
      } else { // if single abstract arc
        const pnAbstractArcs = petriNetModel.arcs.filter(
          arc => arc.from === formatPNId("T", sourceId) && arc.type === "abstract");
        for (const pnAbstractArc of pnAbstractArcs) {
          petriNetModel.removeArc(pnAbstractArc);
        }
        petriNetModel.addArc({ from: formatPNId("T", sourceId), to: T_epsilon.id, type: "normal" });
        petriNetModel.addArc({ from: T_epsilon.id, to: formatPNId("P", `${targetId}`, "m"), type: "normal" });
        petriNetModel.addPlace({ 
          id: formatPNId("P", `ϵ${targetId}${sourceId}`), 
          label: `checked(${sourceId})`,
          checkedPlace: true,
          tokens: 0 
        });
        petriNetModel.insertNodeOnArc(
          formatPNId("T", sourceId), 
          T_epsilon.id, 
          formatPNId("P", `ϵ${targetId}${sourceId}`)
        );
      }      
      const epsilonAuxPlace = {
        id: formatPNId("P", `ϵn${targetId}`, `_${indexMap[sourceId,targetId]}`),
        // label: formatPNId("P", `ϵn${targetLabel}`, `,${abstractIndex}`),
        label: `L((${sourceId},${targetId}))\\nrbsPath(${arc.path})`,
        tokens: arc.L,
        auxiliary: true,
        resetTarget: formatPNId("T", targetId)
      };
      petriNetModel.addPlace(epsilonAuxPlace);
      petriNetModel.addArc({ from: epsilonAuxPlace.id, to: T_epsilon.id, type: "normal" });
    } else {
      // Non-abstract epsilon arc.
      const transitionId = formatPNId("T", `ϵ${targetId}${sourceId}`);
      // const transitionLabel = formatPNId("T", `ϵ${targetLabel}`);
      const transitionLabel = `traverse((${sourceId},${targetId}))`;
      const T_epsilon = { 
        id: transitionId, 
        label: transitionLabel,
        traverseTransition: true,
        activities: `(${sourceId},${targetId})`
      };
      petriNetModel.addTransition(T_epsilon);
      // Check whether the source node already has a split place.
      if (!preprocessedRDLTModel.getNode(sourceId).splitPlace) {
        petriNetModel.insertNodeOnArc(
          formatPNId("T", sourceId), 
          formatPNId("P", targetId, "m"), 
          T_epsilon.id
        );
        petriNetModel.addPlace({ 
          id: formatPNId("P", `ϵ${targetId}${sourceId}`), 
          // label: formatPNId("P", `ϵ${targetLabel}`), 
          label: `checked(${sourceId})`,
          checkedPlace: true,
          tokens: 0 
        });
        petriNetModel.insertNodeOnArc(
          formatPNId("T", sourceId), 
          T_epsilon.id, 
          formatPNId("P", `ϵ${targetId}${sourceId}`)
        );
      } else {
        petriNetModel.insertNodeOnArc(
          formatPNId("P", sourceId, "split"), 
          formatPNId("P", targetId, "m"), 
          T_epsilon.id
        );
      }
      // Create auxiliary epsilon place for the target.
      const epsilonAuxPlace = { 
        id: formatPNId("P", `ϵn${targetId}${sourceId}`), 
        // label: formatPNId("P", `ϵn${targetLabel}`), 
        label: `L(${sourceId},${targetId})`,
        tokens: arc.L,
        auxiliary: true,
        resetTarget: formatPNId("T", targetId)
      };
      // console.log(epsilonAuxPlace);
      if(arc.rbsGroup) epsilonAuxPlace.rbsGroup = arc.rbsGroup;
      // console.log(arc.from,arc.to,arc.rbsGroup);
      // console.log(epsilonAuxPlace);
      petriNetModel.addPlace(epsilonAuxPlace);
      petriNetModel.addArc({ from: epsilonAuxPlace.id, to: T_epsilon.id, type: "normal" });
    }
  });
  console.log("Step 4: Completed processing epsilon arcs.");
}

// Step 5 (Lines 30–46): Process Σ‑constrained arcs, 
// ensuring that extra auxiliary places and reset arcs are created.
export function handleSigmaArcs(preprocessedRDLTModel, petriNetModel) {
  // Filter for edges where constraint is not epsilon.
  // first pull out the ones you actually care about:
  const allSigma = preprocessedRDLTModel.edges.filter(e => e.C !== 'ϵ');
  // split singles vs. “the rest”
  const singleCharArcs = [];
  const multiCharArcs  = [];
  for (const arc of allSigma) {
    if (arc.C.length === 1) singleCharArcs.push(arc);
    else multiCharArcs.push(arc);
  }
  // sort only the single‑character ones:
  singleCharArcs.sort((a, b) => a.C.localeCompare(b.C));
  // then recombine: sorted singles first, then the unsorted remainder
  const sigmaArcs = [...singleCharArcs, ...multiCharArcs];
  sigmaArcs.forEach(edge => {
    const sourceId = edge.from;
    const targetId = edge.to;
    const origC = edge.C;
    // const targetLabel = preprocessedRDLTModel.getNode(targetId).label;
    // Normalize the constraint string: remove commas and extra spaces.
    // const origC = edge.C.replace(/,+/g, '').trim();  // strip commas & whitespace
    const constraint = petriNetModel.getShortConstraint(origC);
    // console.log(sourceId,targetId,preprocessedRDLTModel.getNode(sourceId).splitPlace);
    if (!preprocessedRDLTModel.getNode(sourceId).splitPlace) {
      const sigmaPlaceId = formatPNId("P", `${constraint}${targetId}`);
      // console.log(sigmaPlaceId);
      // const sigmaPlaceLabel = formatPNId("P", `${constraint}${targetLabel}`);
      const sigmaPlaceLabel = `checked(${sourceId})`;
      let sigmaPlace = petriNetModel.places[sigmaPlaceId];
      // If the auxiliary sigma place does not exist, create it.
      if (!sigmaPlace) {
        sigmaPlace = { 
          id: sigmaPlaceId,
          label: sigmaPlaceLabel, 
          checkedPlace: true,
          tokens: 0 
        };
        petriNetModel.addPlace(sigmaPlace);
        petriNetModel.insertNodeOnArc( 
          formatPNId("T", sourceId), 
          formatPNId("T", `J${targetId}`), 
          sigmaPlaceId
        );
        // Get the prefix for epsilon transitions for the target vertex.
        const epsilonPrefix = formatPNId("T", `ϵ${targetId}`);
        // console.log(epsilonPrefix);
        // Build a list of all transitions whose id starts with the epsilonPrefix.
        const T_epsilon_list = Object.values(petriNetModel.transitions)
          .filter(transition => transition.id.startsWith(epsilonPrefix));


        if (T_epsilon_list.length > 0) { // For structure 9 mix-join.
          // console.log("MIX JOIN FOUND");
          const incomingEpsilonArcs = preprocessedRDLTModel.edges.filter(edge => edge.C === 'ϵ' && edge.to === targetId);
          let unconstrainedEpsilonArcs = `(${incomingEpsilonArcs[0].from},${incomingEpsilonArcs[0].to})`;
          for(const incomingEpsilonArc of incomingEpsilonArcs) {
            if(incomingEpsilonArc !== incomingEpsilonArcs[0])
              unconstrainedEpsilonArcs += `,(${incomingEpsilonArc.from},${incomingEpsilonArc.to})`;
          }
          // console.log(incomingEpsilonArcs);
          const sigmaEpsilonPlaceId = formatPNId("P", `${constraint}ϵ`);
          let sigmaEpsilonPlace = petriNetModel.places[sigmaEpsilonPlaceId];
          
          if (!sigmaEpsilonPlace) {
            petriNetModel.addPlace({ 
              id: sigmaEpsilonPlaceId, 
              // label: sigmaEpsilonPlaceId, 
              label: `unconstrained(${unconstrainedEpsilonArcs})`,
              unconstrainedPlace: true,
              tokens: 0 
            });
          }
          // For each epsilon transition, add the corresponding arc connections.
          for (const T_epsilon of T_epsilon_list) {
            petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: T_epsilon.id, type: "normal" });
            petriNetModel.addArc({ from: T_epsilon.id, to: sigmaEpsilonPlaceId, type: "normal" });
          }
          for (const incomingSigmaEdge of sigmaArcs.filter(edge => edge.to === targetId && edge.C === origC)) {
            petriNetModel.addArc({ 
              from: formatPNId("T", incomingSigmaEdge.from), 
              to: sigmaEpsilonPlaceId, 
              type: "normal" });
          }
          // petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: formatPNId("T", targetId), type: "reset" });
          if(preprocessedRDLTModel.nodes['o']) petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: "To", type: "reset" });
          if (!petriNetModel.arcs.some(arc => arc.from === formatPNId('P', targetId,'m') && arc.type === "reset")){
            petriNetModel.addArc({ from: formatPNId('P', targetId,'m'), to: formatPNId("T", targetId), type: "reset" }); // not in Castillo's Algo
            petriNetModel.places[formatPNId('P', targetId,'m')].mixJoinPlace = true;
          }
          let sigmaTransition = petriNetModel.transitions[`T'${targetId}`];
          // console.log(targetId,formatPNId("T",targetId),sigmaTransition);
          if(sigmaTransition)
            petriNetModel.addArc({ from: formatPNId('P', targetId,'m'), to: sigmaTransition.id, type: "reset" });
        }
      } else {
        // if the sigmaPlace already exist change the arc connection T<sourceID> -> TJ<targetID> 
        // into T<sourceID> -> sigmaPlaceId
        petriNetModel.arcs.find(arc =>
          arc.from === formatPNId("T", sourceId) &&
          arc.to === formatPNId("T", `J${targetId}`)
        ).to = sigmaPlaceId;
      }
    }
  });
  console.log("Step 5: Completed handling sigma-constrained (and epsilon) arcs.");
}


// Step 6 (Lines 47–55): Map reset-bound subsystems
// by processing the level‑2 RDLT graphs.
export function handleRBS(preprocessedRDLTModel, petriNetModel) {
  // Iterate over each RBS group stored in combinedModel.rbsGroups.
  // Each key is a centerId and its value is an array of node IDs in that RBS.
  // console.log(preprocessedRDLTModel.nodes);
  // console.log(preprocessedRDLTModel.rbsGroups);
  for (const centerId in preprocessedRDLTModel.rbsGroups) {
    const rbsNodeIds = preprocessedRDLTModel.rbsGroups[centerId];
    // Determine if any node in this RBS has an outgoing edge.
    let hasOutBridge = false;
    // Iterate over each original ID in the RBS.
    // let outBrides = [];
    for (const rbsNodeId of rbsNodeIds) {
      const rbsNode = preprocessedRDLTModel.nodes[rbsNodeId];
      // console.log(rbsNode);
      if (rbsNode && rbsNode.isOutBridge) {
        // outBrides.push(rbsNodeId);
        hasOutBridge = true;
        break;
      }
    }
    // If there is an outbridge in the RBS
    if (hasOutBridge) {
      // Create consensus place (Pcons) and reset transition (Trr) for this RBS.
      const Pcons = {
        id: `Pcons${centerId}`,
        label: `exited(RBS(${centerId}))`,
        consensusPlace: true,
        tokens: 0
      };
      const Trr = {
        id: `Trr${centerId}`,
        // label: `Trr`
        label: `reset(RBS(${centerId}))`,
        resetTransition: true
      };
      petriNetModel.addPlace(Pcons);
      petriNetModel.addTransition(Trr);
      // Connect Pcons to Trr with a normal arc and also add a reset arc.
      petriNetModel.addArc({from: Pcons.id, to: Trr.id, type: "normal"});
      petriNetModel.addArc({from: Pcons.id, to: Trr.id, type: "reset"});

      // For each edge that is an out-bridge for this RBS, connect the corresponding Petri net
      // transition (T'<node.id>) to Pcons if not already connected.
      for (const rbsNodeId of rbsNodeIds) {
        // let level1NodeId = rbsNodeId.slice(0, -1);
        if(preprocessedRDLTModel.nodes[rbsNodeId] && preprocessedRDLTModel.nodes[rbsNodeId].isOutBridge) {
          preprocessedRDLTModel.nodes[rbsNodeId].outgoing.forEach(edge => {
            let TprimeId = `T'${edge.from}`;
            if (!petriNetModel.arcs.some(arc => 
              arc.from === TprimeId && arc.to === Pcons.id && arc.type === "normal"
            )) {
              petriNetModel.addArc({from: TprimeId, to: Pcons.id, type: "normal"});
            }
          });
        }
      }
      
      console.log(`[Step6] Processed RBS with center ${centerId}: Created ${Pcons.id} and ${Trr.id}`);
    }
  }
}

// Step 7 (Lines 56–60): Process bridge arcs 
// that connect level‑1 and level‑2.
export function handleBridgeArcs(preprocessedRDLTModel, petriNetModel){
  for (const vertex of Object.values(preprocessedRDLTModel.nodes)) {
    if(vertex.isInBridge && !vertex.rbsGroup){
      petriNetModel.addArc({ from: `P${vertex.id}m`, to: `T'${vertex.id}`, type: "normal" });
      // petriNetModel.places[`P${vertex.id}m`].splitPlace = true;
    }
    if(vertex.isOutBridge && !vertex.rbsGroup){ 
      for( const arc of petriNetModel.transitions[`T${vertex.id}`].outgoing) {
        petriNetModel.addArc({ from: `T'${vertex.id}`, to: arc.to, type: "normal" });
      }
    }
  };
  console.log("Step 7: Completed processing bridge arcs.");
}

// Step 8 (Lines 61–68): Process auxiliary places 
// and properly wire reset arcs.
export function handleAuxiliaryPlaces(preprocessedRDLTModel, petriNetModel){
  const auxiliaryPlaceList = Object.values(petriNetModel.places).filter(auxiliaryPlace => auxiliaryPlace.auxiliary);
  // console.log(auxiliaryPlaceList);

  for (const auxiliaryPlace of auxiliaryPlaceList) {
    if(petriNetModel.transitions['To']) petriNetModel.addArc({ from: auxiliaryPlace.id, to: 'To', type: "reset" });
    if(auxiliaryPlace.rbsGroup){
      petriNetModel.addArc({ from: auxiliaryPlace.id, to: `Trr${auxiliaryPlace.rbsGroup}`, type: "reset" });
      petriNetModel.addArc({ from: `Trr${auxiliaryPlace.rbsGroup}`, to: auxiliaryPlace.id, type: "normal", weight: auxiliaryPlace.tokens});
    }
    let targetId = auxiliaryPlace.resetTarget.replace(/'/g, '').slice(1); 
    if(!preprocessedRDLTModel.hasLoopingArc(targetId) && targetId !== 'o') {
      petriNetModel.addArc({ from: auxiliaryPlace.id, to: auxiliaryPlace.resetTarget, type: "reset" });
    }
  }
  console.log("Step 8: Completed processing auxiliary places and reset arcs.");
}

// Step 9 (Line 69): Connect all source nodes 
// to a global source place.
export function handleSourceTransitions(preprocessedRDLTModel, petriNetModel){
  if(preprocessedRDLTModel.nodes['i']) {
    petriNetModel.addPlace({ 
      id: 'Pim', 
      label: 'Source', 
      globalSource: true,
      tokens: 1 
    });
    petriNetModel.addArc({ from: 'Pim', to: 'Ti', type: "normal" });
    console.log("Step 9: Completed connecting source transitions to global source place.");
  }
}