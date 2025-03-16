export class PNModel {
  constructor() {
    // Use dictionaries to store places and transitions for easy lookup.
    this.places = {};
    this.transitions = {};
    // Array of arcs.
    this.arcs = [];
  }

  // Add a place to the Petri Net.
  addPlace(place) {
    this.places[place.id] = {
      ...place,
      incoming: [],
      outgoing: []
    };
  }

  // Add a transition to the Petri Net.
  addTransition(transition) {
    this.transitions[transition.id] = {
      ...transition,
      incoming: [],
      outgoing: []
    };
  }

  // Add an arc connecting a source to a target.
  addArc(arc) {
    this.arcs.push(arc);
    // Attach the arc to the outgoing list of the source and incoming list of the target.
    if (this.places[arc.from]) {
      this.places[arc.from].outgoing.push(arc);
    }
    if (this.transitions[arc.from]) {
      this.transitions[arc.from].outgoing.push(arc);
    }
    if (this.places[arc.to]) {
      this.places[arc.to].incoming.push(arc);
    }
    if (this.transitions[arc.to]) {
      this.transitions[arc.to].incoming.push(arc);
    }
  }

  // Helper function to remove an arc from the model and update incoming/outgoing arrays.
  removeArc(arc) {
    // Remove from the arcs array.
    const index = this.arcs.indexOf(arc);
    if (index !== -1) {
      this.arcs.splice(index, 1);
    }
    // Remove from the source node's outgoing array.
    if (this.places[arc.from]) {
      const idx = this.places[arc.from].outgoing.indexOf(arc);
      if (idx !== -1) this.places[arc.from].outgoing.splice(idx, 1);
    }
    if (this.transitions[arc.from]) {
      const idx = this.transitions[arc.from].outgoing.indexOf(arc);
      if (idx !== -1) this.transitions[arc.from].outgoing.splice(idx, 1);
    }
    // Remove from the target node's incoming array.
    if (this.places[arc.to]) {
      const idx = this.places[arc.to].incoming.indexOf(arc);
      if (idx !== -1) this.places[arc.to].incoming.splice(idx, 1);
    }
    if (this.transitions[arc.to]) {
      const idx = this.transitions[arc.to].incoming.indexOf(arc);
      if (idx !== -1) this.transitions[arc.to].incoming.splice(idx, 1);
    }
  }

  // Retrieve a place by id.
  getPlace(id) {
    return this.places[id];
  }

  // Retrieve a transition by id.
  getTransition(id) {
    return this.transitions[id];
  }

  // Returns the JSON representation of the PNModel.
  toJSON() {
    return {
      places: Object.values(this.places),
      transitions: Object.values(this.transitions),
      arcs: this.arcs
    };
  }

  // Static method: Create a PNModel from a JSON representation.
  static fromJSON(json) {
    const model = new PNModel();
    if (json.places && Array.isArray(json.places)) {
      json.places.forEach(p => {
        model.addPlace(p);
      });
    }
    if (json.transitions && Array.isArray(json.transitions)) {
      json.transitions.forEach(t => {
        model.addTransition(t);
      });
    }
    if (json.arcs && Array.isArray(json.arcs)) {
      json.arcs.forEach(a => {
        model.addArc(a);
      });
    }
    return model;
  }

  // Insert a new node (newNodeId) on a single arc (first matching arc)
  // that goes from sourceId to targetId.
  insertNodeOnArc(sourceId, targetId, newNodeId) {
    // Find the first arc that goes from sourceId to targetId.
    const arcIndex = this.arcs.findIndex(arc => arc.from === sourceId && arc.to === targetId);
    if (arcIndex === -1) {
      console.error(`Arc from ${sourceId} to ${targetId} not found.`);
      return;
    }
    const arcToRemove = this.arcs[arcIndex];
    this.removeArc(arcToRemove);

    // Create new arcs: source -> new node, new node -> target.
    this.addArc({ from: sourceId, to: newNodeId, type: "normal" });
    this.addArc({ from: newNodeId, to: targetId, type: "normal" });
  }

  // Insert a node (newNodeId) on all outgoing arcs from sourceId.
  // This method removes all arcs with source === sourceId,
  // adds an arc from sourceId to newNodeId,
  // then reattaches each removed arc from newNodeId to its original target.
  insertNodeOnOutgoingArcs(sourceId, newNodeId) {
    // Get all outgoing arcs from sourceId.
    const outgoingArcs = this.arcs.filter(arc => arc.from === sourceId);
    // Remove these arcs from the model.
    for (const arc of outgoingArcs) {
      this.removeArc(arc);
    }
    // Create an arc from sourceId to newNodeId.
    this.addArc({ from: sourceId, to: newNodeId, type: "normal" });
    // For every removed outgoing arc, reattach it from newNodeId.
    for (const arc of outgoingArcs) {
      this.addArc({ from: newNodeId, to: arc.to, type: arc.type });
    }
  }

  // Insert a node (newNodeId) on all incoming arcs to a given target.
  // This method removes all arcs with to === targetId,
  // adds an arc from newNodeId to targetId,
  // then reattaches each removed arc from its original source to newNodeId.
  insertNodeOnIncomingArcs(targetId, newNodeId) {
    // Get all incoming arcs to targetId.
    const incomingArcs = this.arcs.filter(arc => arc.to === targetId);
    // Remove these arcs from the model.
    for (const arc of incomingArcs) {
      this.removeArc(arc);
    }
    // Create an arc from newNodeId to targetId.
    this.addArc({ from: newNodeId, to: targetId, type: "normal" });
    // Reattach every removed arc: source now goes to newNodeId.
    for (const arc of incomingArcs) {
      this.addArc({ from: arc.from, to: newNodeId, type: arc.type });
    }
  }
}
