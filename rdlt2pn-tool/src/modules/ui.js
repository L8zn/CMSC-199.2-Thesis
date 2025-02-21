/*
For a Node.js version you may simply log output. In a browser, this module could update the DOM.
*/

// modules/ui.js
export function displayResult(result) {
    console.log("=== Petri Net Model ===");
    console.log(JSON.stringify(result, null, 2));
  }
  