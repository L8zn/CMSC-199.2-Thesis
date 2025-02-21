// visualization.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

/**
 * Generates a DOT representation for an RDLT model.
 * 
 * If the model is an original (non-preprocessed) RDLT, vertices with an "rbs" attribute are grouped
 * in a subgraph cluster labeled by the RBS id. Otherwise (if preprocessed), it outputs vertices normally.
 *
 * Vertices are visualized using custom images based on type:
 *  - 'b' uses "assets/images/rdlt/boundary.png"
 *  - 'e' uses "assets/images/rdlt/entity.png"
 *  - 'c' uses "assets/images/rdlt/controller.png"
 *
 * Edge labels are "<C-value>: <L-value>".
 * The graph is arranged horizontally (rankdir=LR).
 */
export function generateRDLTDOT(rdltModel) {
  let dot = 'digraph RDLT {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [fontname="Helvetica", shape=none, fixedsize=true, width=1.5, height=1.5];\n';

  // Check if model is preprocessed; if so, don't create subgraph clusters.
  if (!rdltModel.preprocessed) {
    // Partition vertices into those with and without an "rbs" attribute.
    let verticesWithoutRbs = [];
    let verticesWithRbs = {}; // { rbsId: [vertex, ...] }
    rdltModel.vertices.forEach(v => {
      if (v.rbs) {
        if (!verticesWithRbs[v.rbs]) verticesWithRbs[v.rbs] = [];
        verticesWithRbs[v.rbs].push(v);
      } else {
        verticesWithoutRbs.push(v);
      }
    });

    // Output vertices without rbs.
    verticesWithoutRbs.forEach(v => {
      let imageFile = '';
      if (v.type === 'b') {
        imageFile = 'assets/images/rdlt/boundary.png';
      } else if (v.type === 'e') {
        imageFile = 'assets/images/rdlt/entity.png';
      } else if (v.type === 'c') {
        imageFile = 'assets/images/rdlt/controller.png';
      }
      dot += `  ${v.id} [label="${v.label}", image="${imageFile}"];\n`;
    });
    
    // For vertices with an rbs, group them in a subgraph.
    for (let rbsId in verticesWithRbs) {
      dot += `  subgraph cluster_${rbsId} {\n`;
      dot += `    label="${rbsId}";\n`;
      dot += `    color=black;\n`;
      dot += `    style=dashed;\n`;
      verticesWithRbs[rbsId].forEach(v => {
        // Determine the image based on the original vertex type.
        let imageFile = '';
        if (v.type === 'b') {
          imageFile = 'assets/images/rdlt/boundary.png';
        } else if (v.type === 'e') {
          imageFile = 'assets/images/rdlt/entity.png';
        } else if (v.type === 'c') {
          imageFile = 'assets/images/rdlt/controller.png';
        }
        // If this vertex is the center of the RBS, modify its label.
        let label = v.label;
        if (rdltModel.resetBound && rdltModel.resetBound[rbsId] === v.id) {
          label = `${v.label}\\nM(.)=1`;
        }
        dot += `    ${v.id} [label="${label}", image="${imageFile}"];\n`;
      });
      dot += '  }\n';
    }
  } else {
    // Preprocessed model: simply output all vertices.
    rdltModel.vertices.forEach(v => {
      let imageFile = '';
      if (v.type === 'b') {
        imageFile = 'assets/images/rdlt/boundary.png';
      } else if (v.type === 'e') {
        imageFile = 'assets/images/rdlt/entity.png';
      } else if (v.type === 'c') {
        imageFile = 'assets/images/rdlt/controller.png';
      }
      dot += `  ${v.id} [label="${v.label}", image="${imageFile}"];\n`;
    });
  }

  // Output all edges.
  rdltModel.edges.forEach(e => {
    dot += `  ${e.from} -> ${e.to} [label="${e.C || 'ε'}: ${e.L || 1}"];\n`;
  });

  dot += '}\n';
  return dot;
}

/**
 * Generates a DOT representation for a PN model.
 * - Places: circles with an internal label for token count (if > 0) and an external label for the name (labelloc="b").
 * - Transitions: rectangles with an external label for the transition name.
 * - Arcs: no labels; reset arcs use arrowhead="normalnormal".
 * The graph is arranged horizontally (rankdir=LR).
 */
export function generatePNDOT(pnModel) {
  let dot = 'digraph PN {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [fontname="Helvetica"];\n';
  
  // Define places.
  dot += '  // Places\n';
  pnModel.places.forEach(place => {
    const tokens = (place.options.tokens && place.options.tokens > 0) ? `${place.options.tokens} tokens\n\n` : "";
    dot += `  ${place.options.id} [label="${tokens}${place.options.label}", shape=circle, width=1.0, height=1.0, labelloc="b"];\n`;
  });
  
  // Define transitions.
  dot += '  // Transitions\n';
  pnModel.transitions.forEach(trans => {
    dot += `  ${trans.options.id} [label="${trans.options.label}", shape=rectangle, width=0.2, height=1.0, labelloc="b"];\n`;
  });
  
  // Define arcs.
  dot += '  // Arcs\n';
  pnModel.arcs.forEach(arc => {
    let arcLine = `  ${arc.from} -> ${arc.to}`;
    if (arc.type === 'reset') {
      arcLine += ' [arrowhead="normalnormal"]';
    }
    arcLine += ';\n';
    dot += arcLine;
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
}
