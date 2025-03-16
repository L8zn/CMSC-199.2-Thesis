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
      label: formatPNId("T", vertex.label) 
    };
    petriNetModel.addTransition(transition);
  }
  // Map each edge into an arc.
  for (const edge of preprocessedRDLTModel.edges) {
    const arc = {
      from: formatPNId("T", edge.from),
      to: formatPNId("T", edge.to),
      type: edge.type === "abstract" ? "abstract" : "normal",
      C: edge.C,
      L: edge.L
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
        label: formatPNId("P", vertex.label, "split"),
        tokens: 0
      };
      vertex.splitPlace = true;
      petriNetModel.addPlace(splitPlace);
      // Insert the split place between the transition corresponding to this vertex and its outgoing arcs.
      petriNetModel.insertNodeOnOutgoingArcs(formatPNId("T", vertex.id), splitPlace.id);
      console.log(`[Step2] Vertex ${vertex.id} qualifies as SPLIT case 1`);
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
      const Pym = { 
        id: formatPNId("P", vertex.id, "m"), 
        label: formatPNId("P", vertex.label, "m"), 
        tokens: 0 
      };
      petriNetModel.addPlace(Pym);
      petriNetModel.insertNodeOnIncomingArcs(formatPNId("T", vertex.id), Pym.id);
      // If the vertex is the sink ("o"), create Po and connect its transition to Po.
      if (vertex.id === "o") {
        const sinkPlace = { id: "Po", label: "Po", tokens: 0 };
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
        // Create transition "TJ<id>" for the vertex.
        const TJy = { 
          id: formatPNId("T", `J${vertex.id}`), 
          label: formatPNId("T", `J${vertex.label}`) 
        };
        petriNetModel.addTransition(TJy);
        if (sigmaEdges.length === 1) {
          // If the source node of the single sigma edge qualifies as a split,
          // use its split place.
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
          petriNetModel.insertNodeOnIncomingArcs(Pym.id, TJy.id); // for mapping structure 7
        }
        // Create auxiliary place "PJ<id>" for the vertex.
        const minL = Math.min(...sigmaEdges.map(edge => edge.L));
        const PJy = { 
          id: formatPNId("PJ", vertex.id), 
          label: formatPNId("PJ", vertex.label), 
          tokens: minL
        };
        if(vertex.rbsGroup) PJy.rbsGroup = vertex.rbsGroup;
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
  let abstractIndex = 0;
  epsilonArcs.forEach(arc => {
    const sourceId = arc.from;
    const targetId = arc.to;
    const targetLabel = preprocessedRDLTModel.getNode(targetId).label;
    if (arc.type === "abstract") {
      abstractIndex++;
      const transitionId = formatPNId("T", `ϵ${targetId}`, `_${abstractIndex}`);
      const transitionLabel = formatPNId("T", `ϵ${targetLabel}`, `,${abstractIndex}`);
      const T_epsilon = { 
        id: transitionId,
        label: transitionLabel 
      };
      petriNetModel.addTransition(T_epsilon);
      // Insert the new transition on the arc between the split place of the source and the m place of the target.
      petriNetModel.insertNodeOnArc(
        formatPNId("P", `${sourceId}`, "split"), 
        formatPNId("P", `${targetId}`, "m"), 
        T_epsilon.id
      );
      const epsilonPlace = {
        id: formatPNId("P", `ϵn${targetLabel}`, `_${abstractIndex}`),
        label: formatPNId("P", `ϵn${targetLabel}`, `,${abstractIndex}`),
        tokens: arc.L
      };
      petriNetModel.addPlace(epsilonPlace);
      petriNetModel.addArc({ from: epsilonPlace.id, to: T_epsilon.id, type: "normal" });
    } else {
      // Non-abstract epsilon arc.
      const transitionId = formatPNId("T", `ϵ${targetId}${sourceId}`);
      const transitionLabel = formatPNId("T", `ϵ${targetLabel}`);
      const T_epsilon = { id: transitionId, label: transitionLabel };
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
          label: formatPNId("P", `ϵ${targetLabel}`), 
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
        label: formatPNId("P", `ϵn${targetLabel}`), 
        tokens: arc.L
      };
      if(arc.rbsGroup) epsilonAuxPlace.rbsGroup = arc.rbsGroup;
      // console.log(arc.from,arc.to,arc.rbsGroup);
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
  const sigmaArcs = preprocessedRDLTModel.edges.filter(edge => edge.C !== 'ϵ');
  sigmaArcs.forEach(edge => {
    const sourceId = edge.from;
    const targetId = edge.to;
    const targetLabel = preprocessedRDLTModel.getNode(targetId).label;
    // Normalize the constraint string: remove commas and extra spaces.
    const constraint = edge.C.replace(/,+/g, '').replace(/\s+/g, '_');
    if (!preprocessedRDLTModel.getNode(sourceId).splitPlace) {
      const sigmaPlaceId = formatPNId("P", `${constraint}${targetId}`);
      const sigmaPlaceLabel = formatPNId("P", `${constraint}${targetLabel}`);
      let sigmaPlace = petriNetModel.places[sigmaPlaceId];
      // If the auxiliary sigma place does not exist, create it.
      if (!sigmaPlace) {
        sigmaPlace = { id: sigmaPlaceId, label: sigmaPlaceLabel, tokens: 0 };
        petriNetModel.addPlace(sigmaPlace);
        petriNetModel.insertNodeOnArc( // need to change this sigmaPlace insertion
          formatPNId("T", sourceId), 
          formatPNId("T", `J${targetId}`), 
          sigmaPlaceId
        );
        // Get the prefix for epsilon transitions for the target vertex.
        const epsilonPrefix = formatPNId("T", `ϵ${targetId}`);
        // Build a list of all transitions whose id starts with the epsilonPrefix.
        const T_epsilon_list = Object.values(petriNetModel.transitions)
          .filter(transition => transition.id.startsWith(epsilonPrefix));

        if (T_epsilon_list.length > 0) { // For structure 9 mix-join.
          const sigmaEpsilonPlaceId = formatPNId("P", `${constraint}ϵ`);
          let sigmaEpsilonPlace = petriNetModel.places[sigmaEpsilonPlaceId];
          
          if (!sigmaEpsilonPlace) {
            petriNetModel.addPlace({ 
              id: sigmaEpsilonPlaceId, 
              label: sigmaEpsilonPlaceId, 
              tokens: 0 
            });
          }
          // For each epsilon transition, add the corresponding arc connections.
          for (const T_epsilon of T_epsilon_list) {
            petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: T_epsilon.id, type: "normal" });
            petriNetModel.addArc({ from: T_epsilon.id, to: sigmaEpsilonPlaceId, type: "normal" });
          }
          petriNetModel.addArc({ from: formatPNId("T", sourceId), to: sigmaEpsilonPlaceId, type: "normal" });
          petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: formatPNId("T", targetId), type: "reset" });
          petriNetModel.addArc({ from: sigmaEpsilonPlaceId, to: "To", type: "reset" });
          petriNetModel.addArc({ from: `P${targetId}m`, to: `T${targetId}`, type: "reset" }); // not in Castillo's Algo
          let sigmaTransition = petriNetModel.transitions[`T'${targetId}`];
          // console.log(targetId,formatPNId("T",targetId),sigmaTransition);
          if(sigmaTransition)
            petriNetModel.addArc({ from: `P${targetId}m`, to: sigmaTransition.id, type: "reset" });
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
  for (const centerId in preprocessedRDLTModel.rbsGroups) {
    const rbsNodeIds = preprocessedRDLTModel.rbsGroups[centerId];
    // Determine if any node in this RBS has an outgoing edge.
    let hasOutBridge = false;
    // Iterate over each original ID in the RBS.
    for (const rbsNodeId of rbsNodeIds) {
      const rbsNode = preprocessedRDLTModel.nodes[rbsNodeId];
      if (rbsNode.isOutBridge) {
        hasOutBridge = true;
        break;
      }
    }
    // If there is an outbridge in the RBS
    if (hasOutBridge) {
      // Create consensus place (Pcons) and reset transition (Trr) for this RBS.
      const Pcons = {
        id: `Pcons${centerId}`,
        label: `Pcons`,
        tokens: 0
      };
      const Trr = {
        id: `Trr${centerId}`,
        label: `Trr`
      };
      petriNetModel.addPlace(Pcons);
      petriNetModel.addTransition(Trr);
      // Connect Pcons to Trr with a normal arc and also add a reset arc.
      petriNetModel.addArc({from: Pcons.id, to: Trr.id, type: "normal"});
      petriNetModel.addArc({from: Pcons.id, to: Trr.id, type: "reset"});

      // For each edge that is an out-bridge for this RBS, connect the corresponding Petri net
      // transition (T'<node.id>) to Pcons if not already connected.
      for (const rbsNodeId of rbsNodeIds) {
        let level1NodeId = rbsNodeId.slice(0, -1);
        if(preprocessedRDLTModel.nodes[level1NodeId] && preprocessedRDLTModel.nodes[rbsNodeId].isOutBridge) {
          preprocessedRDLTModel.nodes[level1NodeId].outgoing.forEach(edge => {
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
    }
    if(vertex.isOutBridge && !vertex.rbsGroup){ 
      for( const arc of petriNetModel.transitions[`T${vertex.id}`].outgoing) {
        petriNetModel.addArc({ from: `T'${vertex.id}`, to: arc.to, type: "normal" });
      }
    }
  };
}

// Step 8 (Lines 61–68): Process auxiliary places 
// and properly wire reset arcs.
export function handleAuxiliaryPlaces(preprocessedRDLTModel, petriNetModel){
  function getTargetID(id) {
    // Step 1: Remove prefixes using regex
    let cleanedID = id.replace(/^(PJ|Pϵn|P'J|P'ϵn)/, "");
    // Step 2: Remove everything after a comma (`,`) if it exists
    cleanedID = cleanedID.split(",")[0];
    // Step 3: Ensure apostrophes are re-added if they were part of the original ID
    if (id.includes("'") && !cleanedID.includes("'")) cleanedID = cleanedID + "'";
    return cleanedID;
  }
  const auxiliaryPlaceList = Object.values(petriNetModel.places)
    .filter(auxiliaryPlace => auxiliaryPlace.id.startsWith("Pϵn") 
      || auxiliaryPlace.id.startsWith("PJ")
      || auxiliaryPlace.id.startsWith("P'ϵn")
      || auxiliaryPlace.id.startsWith("P'J"));

  for (const auxiliaryPlace of auxiliaryPlaceList) {
    petriNetModel.addArc({ from: auxiliaryPlace.id, to: 'To', type: "reset" });
    if(auxiliaryPlace.id[1] === "'") {
      // console.log(`Trr${auxiliaryPlace.rbsGroup}`);
      petriNetModel.addArc({ from: auxiliaryPlace.id, to: `Trr${auxiliaryPlace.rbsGroup}`, type: "reset" });
      petriNetModel.addArc({ from: `Trr${auxiliaryPlace.rbsGroup}`, to: auxiliaryPlace.id, type: "normal", weight: auxiliaryPlace.tokens});
    }
    let targetId = getTargetID(auxiliaryPlace.label);
    if(!preprocessedRDLTModel.hasLoopingArc(targetId) && targetId !== 'o') {
      if (targetId.includes("'")) targetId = "'" + targetId.replace(/'/g, "");
      petriNetModel.addArc({ from: auxiliaryPlace.id, to: `T${targetId}`, type: "reset" });
    }
  }
}

// Step 9 (Line 69): Connect all source nodes 
// to a global source place.
export function handleSourceTransitions(petriNetModel){
  petriNetModel.addPlace({ 
    id: 'Pim', 
    label: 'Pim', 
    tokens: 0 
  });
  petriNetModel.addArc({ from: 'Pim', to: 'Ti', type: "normal" });
}