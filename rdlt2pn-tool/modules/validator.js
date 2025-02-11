/*
This module checks whether the generated Petri Net meets basic soundness criteria.
*/

// modules/validator.js
export function validatePetriNet(petriNet) {
  // Simple validation: ensure at least one place and one transition exist.
  let isSound = true;
  if (petriNet.places.length === 0 || petriNet.transitions.length === 0) {
    isSound = false;
  }
  // Further validations (e.g., checking for deadlocks or proper reset arc configurations) can be added.
  return isSound;
}