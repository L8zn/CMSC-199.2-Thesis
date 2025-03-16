// src/modules/visualization.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

/**
 * Generates a DOT representation for an RDLT model using the new JSON structure.
 *
 * This version identifies reset-bound subsystems (RBS) by:
 *  - Finding center vertices (where M === 1).
 *  - Collecting vertices that are connected to the center via epsilon-constrained (ϵ) arcs.
 *    (An edge is considered epsilon-constrained if its C attribute is missing or equal to "ε" or "ϵ".)
 *
 * Vertices in an RBS are rendered within a subgraph cluster labeled with the center vertex's label.
 * The center vertex's label is formatted as "<vertex_label>\nM(.)=1".
 */
export function generateRDLTDOT(rdltModel) {
  // Helper function: Replace any apostrophe in a node id with "prime"
  function sanitizeId(id) {
    return id.replace(/'/g, "prime");
  }

  let dot = 'digraph RDLT {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [fontname="Helvetica", shape=none, fixedsize=true, width=1.5, height=1.5];\n';

  // Build a map for quick lookup of vertices by id.
  const vertexMap = {};
  rdltModel.vertices.forEach(v => {
    vertexMap[v.id] = v;
  });

  // Helper function: returns true if an edge's C attribute is considered epsilon.
  function isEpsilon(edge) {
    return (!edge.C || edge.C === 'ε' || edge.C === 'ϵ');
  }

  // Set to keep track of vertices that have been assigned to an RBS.
  const rbsAssigned = new Set();
  const rbsClusters = []; // Each element: { center: vertex, members: Set of vertex ids }

  // For each vertex that is a center (M === 1), compute its RBS cluster using epsilon-closure.
  rdltModel.vertices.forEach(v => {
    if (v.M === 1 && !rbsAssigned.has(v.id)) {
      const members = new Set();
      const stack = [v.id];
      while (stack.length > 0) {
        const currentId = stack.pop();
        if (!members.has(currentId)) {
          members.add(currentId);
          rbsAssigned.add(currentId);
          // For each outgoing edge from currentId that is epsilon-constrained, add the target.
          rdltModel.edges.forEach(edge => {
            if (edge.from === currentId && isEpsilon(edge)) {
              if (!members.has(edge.to)) {
                stack.push(edge.to);
              }
            }
          });
        }
      }
      rbsClusters.push({ center: v, members });
    }
  });

  // Vertices not part of any RBS.
  const nonRBSVertices = rdltModel.vertices.filter(v => !rbsAssigned.has(v.id));

  // Render non-RBS vertices.
  nonRBSVertices.forEach(v => {
    let imageFile = '';
    if (v.type === 'b') {
      imageFile = 'assets/images/rdlt/boundary.png';
    } else if (v.type === 'e') {
      imageFile = 'assets/images/rdlt/entity.png';
    } else if (v.type === 'c') {
      imageFile = 'assets/images/rdlt/controller.png';
    }
    let label = v.label;
    // If, unexpectedly, a non-RBS vertex is a center, format its label.
    if (v.M === 1) {
      label = `${v.label}\\nM(.)=1`;
    }
    dot += `  ${sanitizeId(v.id)} [label="${label}", image="${imageFile}"];\n`;
  });

  // Render each RBS cluster as a subgraph.
  rbsClusters.forEach(cluster => {
    dot += `  subgraph cluster_RBS_${sanitizeId(cluster.center.id)} {\n`;
    // Label the cluster with the center vertex's label.
    dot += `    label="RBS: ${cluster.center.label}";\n`;
    dot += `    color=black;\n`;
    dot += `    style=dashed;\n`;
    cluster.members.forEach(vid => {
      const v = vertexMap[vid];
      let imageFile = '';
      if (v.type === 'b') {
        imageFile = 'assets/images/rdlt/boundary.png';
      } else if (v.type === 'e') {
        imageFile = 'assets/images/rdlt/entity.png';
      } else if (v.type === 'c') {
        imageFile = 'assets/images/rdlt/controller.png';
      }
      let label = v.label;
      // Format the center vertex's label accordingly.
      if (v.id === cluster.center.id) {
        label = `${v.label}\\nM(.)=1`;
      }
      dot += `    ${sanitizeId(v.id)} [label="${label}", image="${imageFile}"];\n`;
    });
    dot += '  }\n';
  });

  // Output all edges.
  rdltModel.edges.forEach(e => {
    let style = e.type === "abstract" ? 'style=dashed' : ''; // Abstract edges are dashed
    dot += `  ${sanitizeId(e.from)} -> ${sanitizeId(e.to)} [label="${e.C || 'ε'}: ${e.L || 1}" ${style}];\n`;
  });

  dot += '}\n';
  return dot;
}

/**
 * Generates a DOT representation for a PN model using the new JSON structure.
 * The PN JSON now contains places, transitions, and arcs directly.
 */
export function generatePNDOT(pnModel) {
  // Helper: Replace any apostrophe in a node id with the string "prime"
  function sanitizeId(id) {
    return id.replace(/'/g, "prime");
  }

  let dot = 'digraph PN {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [fontname="Helvetica"];\n';

  // Define places.
  dot += '  // Places\n';
  dot += '  node [shape=circle, width=1.0, height=1.0, labelloc=b, fixedsize=true];\n';
  for(const place of Object.values(pnModel.places)) {
    const placeId = sanitizeId(place.id);
    const tokens = (place.tokens && place.tokens > 0) ? `${place.tokens}\\n` : "";
    dot += `  ${placeId} [label="${tokens}${place.label}"];\n`;
  }

  // Define transitions.
  dot += '  // Transitions\n';
  dot += '  node [shape=rectangle, width=0.6, height=1.0, labelloc=b, fixedsize=true];\n';
  for(const trans of Object.values(pnModel.transitions)) {
    const transId = sanitizeId(trans.id);
    if (trans.label && trans.label.includes("Connector")) {
      dot += `  ${transId} [label="${trans.label}", style="dotted"];\n`;
    } else {
      dot += `  ${transId} [label="${trans.label}"];\n`;
    }
  }

  // Initialize auxiliary arrays/objects for special reset arc connections.
  let auxiliaryPlacesTo = [];
  let auxiliaryPlacesTrr = {}; // Mapping from centerId (e.g., "x2" from "Trrx2") to an array of labels
  let TrrResets = [];

  // Process arcs.
  dot += '  // Arcs\n';
  pnModel.arcs.forEach(arc => {
    // Check if the arc targets the special node "To" with reset type.
    if (arc.to === 'To' && arc.type === 'reset' && !arc.from.startsWith('PJo')) {
      auxiliaryPlacesTo.push(pnModel.places[arc.from].label);
    }
    // Check if the arc targets a transition with an ID starting with "Trr"
    // (e.g., "Trrx2") and is of type reset.
    else if (arc.to.startsWith('Trr') && arc.type === 'reset' && !arc.from.startsWith('Pcons')) {
      // Extract the centerId by removing the "Trr" prefix.
      let centerId = arc.to.substring(3);
      if (!auxiliaryPlacesTrr[centerId]) {
        auxiliaryPlacesTrr[centerId] = [];
      }
      auxiliaryPlacesTrr[centerId].push(pnModel.places[arc.from].label);
    }
    else if (arc.weight) {
      let centerId = arc.from.substring(3);
      TrrResets.push({ centerId: centerId, auxLabel: pnModel.places[arc.to].label, weight: arc.weight });
    }
    // Otherwise, handle the arc normally.
    else {
      let arcAttrs = [];
      if (arc.type === 'reset') {
        arcAttrs.push('arrowhead="normalnormal"');
      }
      let attrString = arcAttrs.length > 0 ? ` [${arcAttrs.join(", ")}]` : "";
      dot += `  ${sanitizeId(arc.from)} -> ${sanitizeId(arc.to)}${attrString};\n`;
    }
  });

  // Render auxiliary node for "To" reset arcs.
  dot += '  // Reset Arcs Connection to To\n';
  if (auxiliaryPlacesTo.length > 0) {
    dot += `  AP_To [shape=none, label="", xlabel="`;
    let count = 0;
    for (const auxPlace of auxiliaryPlacesTo) {
      dot += auxPlace;
      if (count < auxiliaryPlacesTo.length - 1) dot += ",";
      if (count % 2 === 1) dot += "\n";
      else dot += " ";
      count++;
    }
    dot += `", width=0, height=0];\n`;
    dot += `  AP_To -> To [arrowhead="normalnormal"];\n`;
    dot += `{rank=same; AP_To; To;}`;
  }

  // Render auxiliary nodes for reset arcs pointing to transitions with IDs starting with "Trr".
  for (const centerId in auxiliaryPlacesTrr) {
    let auxArray = auxiliaryPlacesTrr[centerId];
    let nodeId = `AP_Trr_${centerId}`;
    dot += `  ${nodeId} [shape=none, label="", xlabel="`;
    let count = 0;
    for (const auxPlace of auxArray) {
      dot += auxPlace;
      if (count < auxArray.length - 1) dot += ",";
      if (count % 2 === 1) dot += "\n";
      else dot += " ";
      count++;
    }
    dot += `", width=0, height=0];\n`;
    // Create an edge from the auxiliary node to the corresponding Trr transition.
    // The transition is assumed to have the ID "Trr" concatenated with the centerId.
    dot += `  ${nodeId} -> ${sanitizeId("Trr" + centerId)} [arrowhead="normalnormal"];\n`;
    dot += `{rank=same;  ${nodeId}; ${sanitizeId("Trr" + centerId)};}`;
  }

  // Render separate auxiliary nodes for each reset arc with a weight attribute.
  TrrResets.forEach((entry, index) => {
    let nodeId = `AP_Reset_${entry.centerId}_${index}`;
    dot += ` ${nodeId} [shape=none, label="${entry.auxLabel}", height=0.2];\n`;
    // Create an edge from the auxiliary node to the corresponding Trr transition,
    // and label the edge with the weight.
    dot += ` Trr${entry.centerId} -> ${nodeId} [arrowhead="normal", label="${entry.weight}"];\n`;
  });

  dot += '}\n';
  return dot;
}


/**
 * Executes the dot command to render a DOT file to an image.
 */
export function renderDOT(dotFilename, outputFilename) {
  const outputDir = path.dirname(outputFilename);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  const command = `dot -Tpng ${dotFilename} -o ${outputFilename}`;
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error rendering ${dotFilename}:`, error);
    } else {
      console.log(`Rendered ${dotFilename} to ${outputFilename}`);
    }
  });
}

/**
 * Writes a DOT string to a file.
 */
export function writeDOTToFile(dotString, filename) {
  const outputDir = path.dirname(filename);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(filename, dotString);
  console.log(`GraphViz DOT file written as ${filename}.`);
}
