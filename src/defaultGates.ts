import { State, Ui } from ".";
import { Gate, GateType } from "./gate";

export const DEFAULT_GATE_BUILDERS = {
  Label: (label?: string) =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Label",
      inputs: [],
      outputs: [],
      color: "black",
      init: function (self) {
        (self as any).name =
          label ?? prompt("Enter a name for the label", "Label");
      },
      logic: function (_, outs, self) {
        // Nothing to do
      },
    }),
  And: () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "AND",
      inputs: ["A", "B"],
      outputs: ["C"],
      logic: (ins, outs) => {
        outs[0] = ins[0] && ins[1];
      },
    }),
  Or: () =>
    new Gate({
      bounds: Ui.gatesContainer,
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
      bounds: Ui.gatesContainer,
      name: "NOT",
      inputs: ["A"],
      outputs: ["B"],
      color: "red",
      logic: (ins, outs) => {
        outs[0] = !ins[0];
      },
    }),
  Xor: () =>
    new Gate({
      bounds: Ui.gatesContainer,
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
      bounds: Ui.gatesContainer,
      name: "Switch",
      inputs: [],
      outputs: ["A"],
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
  Button: () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Button",
      inputs: [],
      outputs: ["A"],
      color: "darkgreen",
      init: function (self) {
        this.pressing = false;
        self.addEventListener("mousedown", (_) => (this.pressing = true));
        self.addEventListener("mouseup", (_) => (this.pressing = false));
        self.classList.add("button");
      },
      logic: function (_, outs, self) {
        outs[0] = this.pressing;
      },
    }),
  True: () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "1",
      inputs: [],
      outputs: ["A"],
      color: "green",
      logic: (ins, outs) => {
        outs[0] = true;
      },
    }),
  "1Hz Clock": () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Clock",
      info: "1Hz",
      inputs: [],
      outputs: ["A"],
      color: "darkgreen",
      logic: (ins, outs) => {
        outs[0] = new Date().getMilliseconds() % 1000 < 500;
      },
    }),
  "2Hz Clock": () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Clock",
      info: "2Hz",
      inputs: [],
      outputs: ["A"],
      color: "darkgreen",
      logic: (ins, outs) => {
        outs[0] = new Date().getMilliseconds() % 500 < 250;
      },
    }),
  "5Hz Clock": () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Clock",
      info: "5Hz",
      inputs: [],
      outputs: ["A"],
      color: "darkgreen",
      logic: (ins, outs) => {
        outs[0] = new Date().getMilliseconds() % 200 < 100;
      },
    }),
  Probe: () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Probe",
      info: State.nextProbeGateMarker(),
      inputs: ["A"],
      outputs: ["B"],
      color: "gray",
      init: function (self) {
        this.lastOn = null;
        this.lastOff = null;
      },
      logic: function (ins, outs, self) {
        if (ins[0] && this.lastOn === null) {
          this.lastOn = Date.now();
        } else if (!ins[0] && this.lastOn !== null) {
          console.log(
            `${self.name} ${self.info} on for  ${Date.now() - this.lastOn}ms`
          );
          this.lastOn = null;
        }

        if (!ins[0] && this.lastOff === null) {
          this.lastOff = Date.now();
        } else if (ins[0] && this.lastOff !== null) {
          console.log(
            `${self.name} ${self.info} off for ${Date.now() - this.lastOff}ms`
          );
          this.lastOff = null;
        }

        outs[0] = ins[0];
      },
    }),
  Lamp: () =>
    new Gate({
      bounds: Ui.gatesContainer,
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
  Counter: () =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Counter",
      info: "0",
      inputs: ["A"],
      outputs: [],
      color: "gray",
      init: function (self) {
        this.on = false;
      },
      logic: function (ins, _, self) {
        if (ins[0] !== this.on) {
          this.on = ins[0];

          if (this.on) {
            self.info = (parseInt(self.info) + 1).toString();
          }
        }
      },
    }),
  Input: (name?: string) =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "In",
      info: name ?? State.nextInputGateId(),
      inputs: [],
      outputs: [name ?? "A"],
      color: "gray",
      gateType: GateType.input,
      logic: function (_, outs, self) {
        // Nothing to do
      },
    }),
  Output: (name?: string) =>
    new Gate({
      bounds: Ui.gatesContainer,
      name: "Out",
      info: name ?? State.nextOutputGateId(),
      inputs: [name ?? "A"],
      outputs: [],
      color: "gray",
      gateType: GateType.output,
      logic: function (ins, _, self) {
        // Nothing to do
      },
    }),
};
