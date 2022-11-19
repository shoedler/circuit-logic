import { Gate, GateConnector, GateConnectorCollection, GateEdge } from "./gate";
import { EdgeDragHandler } from "./dragEventHandler";

(() => {
  document.addEventListener('DOMContentLoaded', _ => {
    const gatesContainer = document.querySelector('.gates') as HTMLDivElement;
    const edgesContainer = document.querySelector('.edges') as HTMLDivElement;

    customElements.define('cl-gate', Gate, { extends: 'div' });
    customElements.define('cl-gate-connector', GateConnector, { extends: 'div' });
    customElements.define('cl-gate-connector-collection', GateConnectorCollection, { extends: 'div' });

    const newAndGate = () => new Gate({
      bounds: gatesContainer,
      name: 'AND',
      inputs: ['A', 'B'],
      outputs: ['C'],
      logic: (ins, outs) => {
          outs[0] = ins[0] && ins[1];
      }
    });
    
    const newOrGate = () => new Gate({
      bounds: gatesContainer,
      name: 'OR',
      inputs: ['A', 'B'],
      outputs: ['C'],
      color: 'turquoise',
      logic: (ins, outs) => {
          outs[0] = ins[0] || ins[1];
      }
    });

    const newTrueGate = () => new Gate({
        bounds: gatesContainer,
        name: '1',
        inputs: [],
        outputs: ['C'],
        color: 'green',
        logic: (ins, outs) => {
            outs[0] = true;
        }
    });

    const new2HzClockGate = () => new Gate({
      bounds: gatesContainer,
      name: '2Hz',
      inputs: [],
      outputs: ['C'],
      color: 'darkgreen',
      logic: (ins, outs) => {
          outs[0] = (new Date().getMilliseconds() % 500) < 250;
      }
    });

    const new1Point5HzClockGate = () => new Gate({
      bounds: gatesContainer,
      name: '1Hz',
      inputs: [],
      outputs: ['C'],
      color: 'darkgreen',
      logic: (ins, outs) => {
          outs[0] = (new Date().getMilliseconds() % 666) < 333;
      }
    });

    const newProbeGate = () => new Gate({
      bounds: gatesContainer,
      name: 'Probe',
      inputs: ['A'],
      outputs: ['C'],
      color: 'gray',
      logic: function(ins, outs) {
          if (ins[0] && !this.didProbe) {
            if (!this.lastCalled)
              this.lastCalled = new Date();
            else {
              this.didProbe = true;
              const now = new Date();
              const delta = now.getTime() - this.lastCalled.getTime();
              this.lastCalled = now;
              console.log(`Probe: ${ins[0]} (${(1000 / delta).toFixed(1)}Hz)`);
            }
          }
          else if (!ins[0]) {
            this.didProbe = null;
          }

          outs[0] = ins[0];
      }
    });
    
    const newNotGate = () => new Gate({
        bounds: gatesContainer,
        name: 'NOT',
        inputs: ['A'],
        outputs: ['C'],
        color: 'red',
        logic: (ins, outs) => {
            outs[0] = !ins[0]
        }
    });

    const gates: Gate[] = [
      newTrueGate(),
      newTrueGate(),
      new2HzClockGate(),
      new2HzClockGate(),
      new1Point5HzClockGate(),
      new1Point5HzClockGate(),
      newProbeGate(),
      newProbeGate(),
      newAndGate(),
      newAndGate(),
      newAndGate(),
      newOrGate(),
      newOrGate(),
      newOrGate(),
      newNotGate(),
      newNotGate(),
      newNotGate(),
    ];

    setInterval(() => {
      gates.forEach(g => g.run());
    }, 1000 / 60);


    EdgeDragHandler.attach({ attachee: edgesContainer })
    
  });
})()