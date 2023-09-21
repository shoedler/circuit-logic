import { Connector, ConnectorCollection } from "./connector";

export interface IDisposable {
  dispose(): void;
}

export interface IRedrawable {
  redraw(): void;
}

export interface IDetachable {
  detach(): void; // Meaning: remove from DOM
}

/**
 * Construction parameters for a gate.
 * @param bounds The parent html element to which the gate will be appended.
 * @param name The name of the gate. (Displayed in the gate's label)
 * @param inputs The names of the gate's inputs, will be displayed on the left side of the gate.
 * @param outputs The names of the gate's outputs, will be displayed on the right side of the gate.
 * @param color The color of the gate.
 * @param init A function that will be called when the gate is created. Can be used to add additional elements to the gate. It's context is also available in the gate's logic function, @see GateConfig.logic
 * @param logic The logic function of the gate. Will be called when the gate is run. The inputs and outputs are passed as boolean arrays. Also receives the gate itself as a third parameter, which can be used to manipulate the gate's DOM Element.
 */
export interface GateConfig {
  bounds: HTMLDivElement;
  name: string;
  logic: (inputs: boolean[], outputs: boolean[], self?: Gate) => void;
  inputs?: string[];
  outputs?: string[];
  gateType?: GateType;
  info?: string;
  color?:
    | "red"
    | "orange"
    | "green"
    | "yellow"
    | "blue"
    | "turquoise"
    | "darkgreen"
    | "gray"
    | "black";
  init?: (self: Gate) => void;
}

export enum GateType {
  input,
  output,
}

export class Gate
  extends HTMLDivElement
  implements IDisposable, IRedrawable, IDetachable
{
  public readonly gateType?: GateType; // optional
  private static _gateCount = 0;
  private readonly _inputs: ConnectorCollection;
  private readonly _name: HTMLParagraphElement;
  private readonly _infoPill: HTMLParagraphElement | undefined;
  private readonly _outputs: ConnectorCollection;
  private readonly _logic: (
    inputs: boolean[],
    outputs: boolean[],
    self?: Gate
  ) => void;

  public get name(): string {
    return this._name.innerText;
  }
  private set name(v: string) {
    this._name.innerText = v;
  }

  public get info(): string | undefined {
    return this._infoPill?.innerText ?? undefined;
  }

  public set info(v: string) {
    if (this._infoPill) this._infoPill.innerText = v;
  }

  public get inputs(): ConnectorCollection {
    return this._inputs;
  }

  public get outputs(): ConnectorCollection {
    return this._outputs;
  }

  constructor(params: GateConfig) {
    super();

    this.classList.add("gate");
    this.id = `gate-${Gate._gateCount++}`;

    if (params.color) {
      this.style.backgroundColor = `var(--color-${params.color})`;
    }

    if (params.inputs) {
      this._inputs = new ConnectorCollection(this, "inputs", params.inputs);
    }

    this._name = document.createElement("p");
    this._name.classList.add("gate-label");
    this.appendChild(this._name);

    if (params.info) {
      this._infoPill = document.createElement("p");
      this._infoPill.classList.add("gate-info-pill");
      this.appendChild(this._infoPill);
      this.info = params.info;
    }

    if (params.outputs) {
      this._outputs = new ConnectorCollection(this, "outputs", params.outputs);
    }

    this.name = params.name;

    if (params.gateType !== undefined) {
      this.gateType = params.gateType;
    }

    const logicContext: any = {};
    this._logic = params.logic.bind(logicContext);
    if (params.init) {
      params.init.bind(logicContext)(this);
    }

    params.bounds.appendChild(this);
  }

  public run = (): void => {
    const inputs = this._inputs.toBoolArray();
    const outputs = this._outputs.toBoolArray();
    this._logic(inputs, outputs, this);
    this._outputs.fromBoolArray(outputs);
  };

  public redraw(): void {
    this._inputs.redraw();
    this._outputs.redraw();
  }

  public dispose = () => {
    this._inputs.dispose();
    this._outputs.dispose();
    this.remove();
  };

  public detach = (): void => {
    this._inputs.detach();
    this._outputs.detach();
    this.remove();
  };
}
