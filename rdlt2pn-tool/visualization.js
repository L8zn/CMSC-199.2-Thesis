// visualization.js
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Define a constant for the output directory.
const OUTPUT_DIR = 'diagrams';

/**
 * Generates a DOT representation for an RDLT model.
 * Vertices are visualized using custom images based on type:
 * - 'b' (boundary): uses "assets/images/rdlt/boundary.png"
 * - 'e' (entity): uses "assets/images/rdlt/entity.png"
 * - 'c' (controller): uses "assets/images/rdlt/controller.png"
 * 
 * The vertex label now contains only the vertex's label.
 * Edge labels are simplified to "<C-value>: <L-value>".
 * The graph is arranged horizontally using rankdir=LR.
 */
export function generateRDLTDOT(rdltModel) {
  let dot = 'digraph RDLT {\n';
  dot += '  rankdir=LR;\n';
  // Set node style to allow image scaling based on the label.
  dot += '  node [fontname="Helvetica", shape=none, fixedsize=true, width=1.5, height=1.5];\n';
  
  // Define nodes for each vertex using custom images.
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

  // Define edges for each arc.
  rdltModel.edges.forEach(e => {
    dot += `  ${e.from} -> ${e.to} [label="${e.C || 'ε'}: ${e.L || 1}"];\n`;
  });

  dot += '}\n';
  return dot;
}

/**
 * Generates a DOT representation for a PN model.
 * - Places are drawn as circles with two pieces of information combined into one label:
 *   If the token count is > 0, the label is: "<place_label>\n<m> tokens";
 *   otherwise, it shows just the place's name.
 *   These nodes use shape=circle, width=1.0, height=1.0, and labelloc="b" so that the label appears at the bottom.
 * - Transitions are drawn as rectangles with an external label for the transition name,
 *   using shape=rectangle, width=0.2, height=1.0, and labelloc="b".
 * - Arcs are drawn without labels. If an arc is of type 'reset', it uses arrowhead="normalnormal".
 * The graph is arranged horizontally using rankdir=LR.
 */
export function generatePNDOT(pnModel) {
  let dot = 'digraph PN {\n';
  dot += '  rankdir=LR;\n';
  dot += '  node [fontname="Helvetica"];\n';
  
  // Define places.
  dot += '  // Places\n';
  pnModel.places.forEach(place => {
    // Build the label: include token count only if tokens > 0.
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
      // For reset arcs, set the arrowhead to "normalnormal".
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
 * The command will render the input DOT file (dotFilename) to the specified output image (outputFilename).
 */
export function renderDOT(dotFilename, outputFilename) {
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
 * Utility function to write a DOT string to a file.
 * The file will be placed in the specified output directory.
 */
export function writeDOTToFile(dotString, filename) {
  // Ensure the output directory exists.
  const outputDir = path.dirname(filename);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(filename, dotString);
}
