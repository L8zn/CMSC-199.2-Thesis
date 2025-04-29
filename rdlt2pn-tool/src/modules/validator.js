/*
This module checks whether the generated Petri Net meets basic soundness criteria.
*/

// modules/validator.js
export function checkRDLTSoundness(model) {
  // TODO: Implement full soundness checking for RDLT input (e.g., classical vs. relaxed vs. unsound).
  // For now, assume every input RDLT is "classical" sound.
  return "Classical";
}

export function checkPNSoundness(model) {
  // TODO: Implement full soundness checking for the mapped Petri Net.
  // For now, assume every output PN is "classical" sound.
  return "Classical";
}