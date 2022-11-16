import { Gate, GateConnector, GateConnectorCollection, GateEdge, GateEdgeFactory } from "./gate";

(() => {

  
  document.addEventListener('DOMContentLoaded', _ => {
    const gates = document.querySelector('.gates') as HTMLDivElement;
    const edges = document.querySelector('.edges') as HTMLDivElement;

    customElements.define('cl-gate', Gate, { extends: 'div' });
    customElements.define('cl-gate-connector', GateConnector, { extends: 'div' });
    customElements.define('cl-gate-connector-collection', GateConnectorCollection, { extends: 'div' });

    const andGate = new Gate({ bounds: gates, name: 'AND', inputs: ['A', 'B'], outputs: ['C'] });
    const orGate = new Gate({ bounds: gates, name: 'OR', inputs: ['A', 'B'], outputs: ['C'] });
    const notGate = new Gate({ bounds: gates, name: 'NOT', inputs: ['A'], outputs: ['C'] });

    GateEdgeFactory.attach({ attachee: edges })
    
  });
})()