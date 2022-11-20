import { Gate, GateConnector, GateConnectorCollection } from "./gate";
import { EdgeDragHandler, GateDragHandler, IDragEventHandler } from "./dragEventHandler";

(() => {
  document.addEventListener('DOMContentLoaded', _ => {
    const gates: Gate[] = [ ];

    const gatesContainer  = document.querySelector('.gates') as HTMLDivElement;
    const edgesContainer  = document.querySelector('.edges') as HTMLDivElement;
    const buttonsContainer = document.querySelector('.buttons') as HTMLDivElement;

    customElements.define('cl-gate', Gate, { extends: 'div' });
    customElements.define('cl-gate-connector', GateConnector, { extends: 'div' });
    customElements.define('cl-gate-connector-collection', GateConnectorCollection, { extends: 'div' });

    const gateBuilders: { [key: string]: () => Gate} = {
      "And": () => new Gate({
        bounds: gatesContainer,
        name: 'AND',
        inputs: ['A', 'B'],
        outputs: ['C'],
        logic: (ins, outs) => {
            outs[0] = ins[0] && ins[1];
        }
      }),
      "Or": () => new Gate({
        bounds: gatesContainer,
        name: 'OR',
        inputs: ['A', 'B'],
        outputs: ['C'],
        color: 'turquoise',
        logic: (ins, outs) => {
            outs[0] = ins[0] || ins[1];
        }
      }),
      "True": () => new Gate({
          bounds: gatesContainer,
          name: '1',
          inputs: [],
          outputs: ['C'],
          color: 'green',
          logic: (ins, outs) => {
              outs[0] = true;
          }
      }),
      "2Hz Clock": () => new Gate({
        bounds: gatesContainer,
        name: '2Hz',
        inputs: [],
        outputs: ['C'],
        color: 'darkgreen',
        logic: (ins, outs) => {
            outs[0] = (new Date().getMilliseconds() % 500) < 250;
        }
      }),
      "1Hz Clock": () => new Gate({
        bounds: gatesContainer,
        name: '1Hz',
        inputs: [],
        outputs: ['C'],
        color: 'darkgreen',
        logic: (ins, outs) => {
            outs[0] = (new Date().getMilliseconds() % 1000) < 500;
        }
      }),
      "Probe": () => new Gate({
        bounds: gatesContainer,
        name: 'Probe',
        inputs: ['A'],
        outputs: ['C'],
        color: 'gray',
        logic: function(ins, outs, self) {
          if (this.lastOn === undefined && this.lastOff === undefined) {
            this.lastOn = null
            this.lastOff = null
          }
          
          if (ins[0] && this.lastOn === null) {
            this.lastOn = Date.now()
          }
          else if (!ins[0] && this.lastOn !== null) {
            console.log(`Probe on for ${Date.now() - this.lastOn}ms`)
            this.lastOn = null
          }
          
          if (!ins[0] && this.lastOff === null) {
            this.lastOff = Date.now()
          }
          else if (ins[0] && this.lastOff !== null) {
            console.log(`Probe off for ${Date.now() - this.lastOff}ms`)
            this.lastOff = null
          }

          outs[0] = ins[0];
        }
      }),
      "Not": () => new Gate({
          bounds: gatesContainer,
          name: 'NOT',
          inputs: ['A'],
          outputs: ['C'],
          color: 'red',
          logic: (ins, outs) => {
              outs[0] = !ins[0]
          }
      }),
      "Switch": () => new Gate({
          bounds: gatesContainer,
          name: "Switch",
          inputs: [],
          outputs: ['C'],
          color: 'gray',
          logic: function(_, outs, self) {
            if (this.clicked === undefined) {
              this.clicked = false;
              self.addEventListener('click', _ => this.clicked = !this.clicked);
            }
            else {
              outs[0] = this.clicked ?? false;
            }
          }
      }),
    }

    Object.entries(gateBuilders).forEach(([name, builder]) => {
      const button = document.createElement('button');
      button.textContent = '➕ ' + name;
      button.addEventListener('click', _ => gates.push(builder()));
      buttonsContainer.appendChild(button);
    });

    setInterval(() => {
      gates.forEach(g => g.run());
    }, 1000 / 60);


    let currentDragHandler: IDragEventHandler = null;

    document.addEventListener('mousedown', (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);
      
      if (element instanceof GateConnector) {
        currentDragHandler = new EdgeDragHandler();
      }
      else if (element instanceof Gate || element.classList.contains('gate-label')) {
        currentDragHandler = new GateDragHandler();
      }
      else
        return;
    
      currentDragHandler.onStart(e);
    });
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (currentDragHandler) {
        currentDragHandler.onDrag(e);
      }
    });
    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (currentDragHandler) {
        currentDragHandler.onDrop(e);
        currentDragHandler = null;
      }
    });

    EdgeDragHandler.attach({ attachee: edgesContainer })
  });
})()