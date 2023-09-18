import {
  EdgeDragHandler,
  GateDragHandler,
  IDragEventHandler,
} from "./dragEventHandler";
import { Gate, GateConnector, GateConnectorCollection } from "./gate";

const STATE = {
  probeGateMarker: ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "🟤"],
  probeGateIndex: 0,
  gates: [] as Gate[],
};

(() => {
  document.addEventListener("DOMContentLoaded", (_) => {
    const gatesContainer = document.querySelector(".gates") as HTMLDivElement;
    const edgesContainer = document.querySelector(".edges") as HTMLDivElement;
    const simSpeedometer = document.querySelector(
      ".simulation-speedometer"
    ) as HTMLParagraphElement;
    const builderButtonsContainer = document.querySelector(
      ".builder-buttons"
    ) as HTMLDivElement;
    const controlsContainer = document.querySelector(
      ".controls"
    ) as HTMLDivElement;

    // Register custom elements
    customElements.define("cl-gate", Gate, { extends: "div" });
    customElements.define("cl-gate-connector", GateConnector, {
      extends: "div",
    });
    customElements.define(
      "cl-gate-connector-collection",
      GateConnectorCollection,
      { extends: "div" }
    );

    // Create gate builder buttons
    const gateBuilders = getGateBuilders(gatesContainer);

    Object.entries(gateBuilders).forEach(([name, builder]) => {
      const button = document.createElement("button");
      button.textContent = "➕ " + name;
      button.addEventListener("click", (_) => STATE.gates.push(builder()));
      builderButtonsContainer.appendChild(button);
    });

    // Create control buttons
    const clearButton = document.createElement("button");
    clearButton.textContent = "🗑️ Clear circuit";
    clearButton.addEventListener("click", (_) => {
      if (!confirm("Are you sure you want to clear the circuit?")) return;
      STATE.gates.forEach((g) => g.dispose());
      STATE.gates.length = 0;
    });
    controlsContainer.appendChild(clearButton);

    const trashbinDiv = document.createElement("div");
    trashbinDiv.classList.add("trashbin");
    trashbinDiv.textContent = "Drop here to delete";
    controlsContainer.appendChild(trashbinDiv);

    // Start simulation
    let simulationTimer = performance.now();
    setInterval(() => {
      const simulationTime = performance.now() - simulationTimer;
      const simulationTicks = Math.round(1000 / simulationTime);
      simSpeedometer.textContent = `${simulationTicks} ticks/s`;

      STATE.gates.forEach((g) => g.run());

      simulationTimer = performance.now();
    }, 1000 / 120);

    // Setup drag handler
    let currentDragHandler: IDragEventHandler = null;

    document.addEventListener("mousedown", (e: MouseEvent) => {
      const element = document.elementFromPoint(e.clientX, e.clientY);

      if (element instanceof GateConnector) {
        currentDragHandler = new EdgeDragHandler();
      } else if (
        element instanceof Gate ||
        element.classList.contains("gate-label")
      ) {
        currentDragHandler = new GateDragHandler();
      } else return;

      currentDragHandler.onStart(e);
    });
    document.addEventListener("mousemove", (e: MouseEvent) => {
      if (currentDragHandler) {
        currentDragHandler.onDrag(e);
      }
    });
    document.addEventListener("mouseup", (e: MouseEvent) => {
      if (currentDragHandler) {
        currentDragHandler.onDrop(e);
        currentDragHandler = null;
      }
    });

    EdgeDragHandler.attach({ attachee: edgesContainer });
  });
})();

const getGateBuilders = (
  container: HTMLDivElement
): { [key: string]: () => Gate } => {
  return {
    And: () =>
      new Gate({
        bounds: container,
        name: "AND",
        inputs: ["A", "B"],
        outputs: ["C"],
        logic: (ins, outs) => {
          outs[0] = ins[0] && ins[1];
        },
      }),
    Or: () =>
      new Gate({
        bounds: container,
        name: "OR",
        inputs: ["A", "B"],
        outputs: ["C"],
        color: "turquoise",
        logic: (ins, outs) => {
          outs[0] = ins[0] || ins[1];
        },
      }),
    Not: () =>
      new Gate({
        bounds: container,
        name: "NOT",
        inputs: ["A"],
        outputs: ["C"],
        color: "red",
        logic: (ins, outs) => {
          outs[0] = !ins[0];
        },
      }),
    Xor: () =>
      new Gate({
        bounds: container,
        name: "XOR",
        inputs: ["A", "B"],
        outputs: ["C"],
        color: "orange",
        logic: function (ins, outs, self) {
          outs[0] = ins[0] !== ins[1];
        },
      }),
    Switch: () =>
      new Gate({
        bounds: container,
        name: "Switch",
        inputs: [],
        outputs: ["C"],
        color: "darkgreen",
        init: function (self) {
          this.clicked = false;
          self.addEventListener("click", (_) => (this.clicked = !this.clicked));
          self.classList.add("switch");
        },
        logic: function (_, outs, self) {
          outs[0] = this.clicked;
        },
      }),
    True: () =>
      new Gate({
        bounds: container,
        name: "1",
        inputs: [],
        outputs: ["C"],
        color: "green",
        logic: (ins, outs) => {
          outs[0] = true;
        },
      }),
    "2Hz Clock": () =>
      new Gate({
        bounds: container,
        name: "2Hz",
        inputs: [],
        outputs: ["C"],
        color: "darkgreen",
        logic: (ins, outs) => {
          outs[0] = new Date().getMilliseconds() % 500 < 250;
        },
      }),
    "1Hz Clock": () =>
      new Gate({
        bounds: container,
        name: "1Hz",
        inputs: [],
        outputs: ["C"],
        color: "darkgreen",
        logic: (ins, outs) => {
          outs[0] = new Date().getMilliseconds() % 1000 < 500;
        },
      }),
    Probe: () =>
      new Gate({
        bounds: container,
        name:
          STATE.probeGateMarker[
            STATE.probeGateIndex++ % STATE.probeGateMarker.length
          ] + "Probe",
        inputs: ["A"],
        outputs: ["C"],
        color: "gray",
        init: function (self) {
          this.lastOn = null;
          this.lastOff = null;
        },
        logic: function (ins, outs, self) {
          if (ins[0] && this.lastOn === null) {
            this.lastOn = Date.now();
          } else if (!ins[0] && this.lastOn !== null) {
            console.log(`${self.name} on for  ${Date.now() - this.lastOn}ms`);
            this.lastOn = null;
          }

          if (!ins[0] && this.lastOff === null) {
            this.lastOff = Date.now();
          } else if (ins[0] && this.lastOff !== null) {
            console.log(`${self.name} off for ${Date.now() - this.lastOff}ms`);
            this.lastOff = null;
          }

          outs[0] = ins[0];
        },
      }),
    Lamp: () =>
      new Gate({
        bounds: container,
        name: "💡",
        inputs: ["A"],
        outputs: [],
        color: "gray",
        init: function (self) {
          this.on = false;
        },
        logic: function (ins, _, self) {
          if (ins[0] !== this.on) {
            this.on = ins[0];
            self.classList.toggle("lamp-on", this.on);
          }
        },
      }),
  };
};
