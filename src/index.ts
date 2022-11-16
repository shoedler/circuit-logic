import { Gate, GateConnector, GateConnectorCollection } from "./gate";

(() => {

  
  document.addEventListener('DOMContentLoaded', _ => {
    const sketch = document.querySelector('.sketch') as HTMLDivElement;

    customElements.define('cl-gate', Gate, { extends: 'div' });
    customElements.define('cl-gate-connector', GateConnector, { extends: 'div' });
    customElements.define('cl-gate-connector-collection', GateConnectorCollection, { extends: 'div' });

    const andGate = new Gate({ bounds: sketch, name: 'AND', inputs: ['A', 'B'], outputs: ['C'] });
    const orGate = new Gate({ bounds: sketch, name: 'OR', inputs: ['A', 'B'], outputs: ['C'] });
    const notGate = new Gate({ bounds: sketch, name: 'NOT', inputs: ['A'], outputs: ['C'] });
  });
})()