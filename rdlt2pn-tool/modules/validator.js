/*
This module checks whether the generated Petri Net meets basic soundness criteria.
*/

// modules/validator.js
export function validatePetriNet(petriNet) {
    // Example: Ensure there is at least one place and one transition.
    let isSound = true;
    
    if (petriNet.places.length === 0 || petriNet.transitions.length === 0) {
      isSound = false;
    }
    
    // Additional validations can be added here.
    
    return isSound;
  }
  