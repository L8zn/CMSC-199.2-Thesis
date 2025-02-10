/*
This file acts as the main entry point of your application. It imports the conversion façade and uses it to process an example input.
*/

// index.js
import { convert } from './modules/conversionFacade.js';
import config from './config/config.js';

function main() {
  // Example input: a placeholder JSON string representing an RDLT model.
  const rdltInput = '{"vertices": [{"id": "v1", "type": "entity", "label": "Entity 1"}, {"id": "v2", "type": "controller", "label": "Controller 1", "guard": "m"}], "edges": []}';
  const result = convert(rdltInput);
  console.log("Conversion Result:");
  console.log(result);
}

main();
