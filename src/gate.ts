interface IDisposable {
  dispose(): void;
}

interface IRedrawable {
  redraw(): void;
}

interface IPackable {
  pack(): void;
}

/**
 * Construction parameters for a gate.
 * @param bounds The parent html element to which the gate will be appended.
 * @param name The name of the gate. (Displayed in the gate's label)
 * @param inputs The names of the gate's inputs, will be displayed on the left side of the gate.
 * @param outputs The names of the gate's outputs, will be displayed on the right side of the gate.
 * @param color The color of the gate.
 * @param init A function that will be called when the gate is created. Can be used to add additional elements to the gate. It's context is also available in the gate's logic function, @see GateParams.logic
 * @param logic The logic function of the gate. Will be called when the gate is run. The inputs and outputs are passed as boolean arrays. Also receives the gate itself as a third parameter, which can be used to manipulate the gate's DOM Element.
 */
export interface GateParams {
  bounds: HTMLDivElement;
  name: string;
  inputs?: string[];
  outputs?: string[];
  color?:
    | "red"
    | "orange"
    | "green"
    | "yellow"
    | "blue"
    | "turquoise"
    | "darkgreen"
    | "gray";
  init?: (self: Gate) => void;
  logic: (inputs: boolean[], outputs: boolean[], self?: Gate) => void;
}

export enum GateType {
  input,
  output,
}

export class Gate
  extends HTMLDivElement
  implements IDisposable, IRedrawable, IPackable
{
  public gateType?: GateType; // optional
  private static _gateCount = 0;
  private readonly _inputs: ConnectorCollection;
  private readonly _name: HTMLParagraphElement;
  private readonly _outputs: ConnectorCollection;
  private _logic: (inputs: boolean[], outputs: boolean[], self?: Gate) => void;

  public get name(): string {
    return this._name.innerText;
  }
  private set name(v: string) {
    this._name.innerText = v;
  }

  public get inputs(): ConnectorCollection {
    return this._inputs;
  }

  public get outputs(): ConnectorCollection {
    return this._outputs;
  }

  constructor(params: GateParams) {
    super();
    const logicContext: any = {};

    this.classList.add("gate");
    this.id = `gate-${Gate._gateCount++}`;
    this._logic = params.logic.bind(logicContext);

    if (params.init) {
      params.init.bind(logicContext)(this);
    }

    if (params.color) {
      this.style.backgroundColor = `var(--color-${params.color})`;
    }

    if (params.inputs) {
      this._inputs = new ConnectorCollection(this, "inputs", params.inputs);
    }

    this._name = document.createElement("p");
    this._name.classList.add("gate-label");
    this.appendChild(this._name);

    if (params.outputs) {
      this._outputs = new ConnectorCollection(this, "outputs", params.outputs);
    }

    this.name = params.name;

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

  public pack = (): void => {
    this._inputs.pack();
    this._outputs.pack();
    this.remove();
  };
}

export class ConnectorCollection
  extends HTMLDivElement
  implements IDisposable, IRedrawable, IPackable
{
  private readonly _connectors: Connector[] = [];
  public readonly type: "inputs" | "outputs";

  constructor(owner: Gate, type: "inputs" | "outputs", connectors: string[]) {
    super();

    this.classList.add(`gate-${type}`);
    this.type = type;
    owner.appendChild(this);

    connectors.forEach(c => this._connectors.push(new Connector(this, c)));
  }

  public toBoolArray = (): boolean[] => this._connectors.map(c => c.state);

  public fromBoolArray = (values: boolean[]): void => {
    if (this.type === "inputs")
      throw new Error("Cannot set input values on an output collection");
    this._connectors.forEach((c, i) => (c.state = values[i]));
  };

  public redraw = (): void => {
    this._connectors.forEach(c => c.redraw());
  };

  public dispose = (): void => {
    this._connectors.forEach(c => c.dispose());
    this.remove();
  };

  public pack = (): void => {
    this._connectors.forEach(c => c.pack());
  };
}

export class Connector
  extends HTMLDivElement
  implements IDisposable, IRedrawable, IPackable
{
  public readonly type: () => "inputs" | "outputs";
  public readonly name: string;
  private _connections: Edge[] = []; // Can be a connector because when packing, edges are removed

  public get state(): boolean {
    return this._connections.some(edge => edge.state);
  }
  public set state(v: boolean) {
    if (this.type() === "inputs") return;
    this._connections.forEach(e => (e.state = v));
  }

  public set illegal(v: boolean) {
    v ? this.classList.add("illegal") : this.classList.remove("illegal");
  }

  constructor(parent: ConnectorCollection, name: string) {
    super();

    this.classList.add("gate-connector");
    parent.appendChild(this);
    this.type = function () {
      return parent.type;
    };

    this.name = name;
  }

  public newEdge = (parent: SVGElement): Edge => {
    const edge = new Edge({ parent, start: this });
    this._connections.push(edge);
    return edge;
  };

  public endEdge = (end: Edge): void => {
    end.end = this;
    this._connections.push(end);
  };

  public removeEdge = (edge: Edge): void => {
    const index = this._connections.indexOf(edge);
    if (index > -1) {
      this._connections.splice(index, 1);
    }
  };

  public redraw = (): void => {
    this._connections.forEach(e => e.redraw());
  };

  public dispose = (): void => {
    this._connections.forEach(e => e.dispose());
    this.remove();
  };

  public pack = (): void => {
    this._connections.forEach(e => e.remove());
  };
}

export class Edge implements IDisposable, IRedrawable {
  public readonly path: SVGPathElement;
  private readonly _svg: Omit<SVGElement, "remove">;
  public readonly start: Connector;

  private _end: Connector;
  public get end(): Connector {
    return this._end;
  }
  public set end(v: Connector) {
    this._end = v;
    this.path.classList.remove("drawing");
  }

  private _state: boolean = false;
  public get state(): boolean {
    return this._state;
  }
  public set state(v: boolean) {
    this._state = v;
    v
      ? this.path.classList.add("active")
      : this.path.classList.remove("active");
  }

  public set illegal(v: boolean) {
    v
      ? this.path.classList.add("illegal")
      : this.path.classList.remove("illegal");
  }

  public set legal(v: boolean) {
    v ? this.path.classList.add("legal") : this.path.classList.remove("legal");
  }

  constructor(params: { parent: SVGElement; start: Connector }) {
    this.start = params.start;
    this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path.classList.add("drawing");
    this.path.addEventListener("dblclick", _ => {
      if (this.end) this.end.removeEdge(this);
      if (this.start) this.start.removeEdge(this);
      this.dispose();
    });
    this._svg = params.parent;
    this._svg.appendChild(this.path);
  }

  public draw = (pos?: { x: number; y: number }): void => {
    const offset = this._svg.getBoundingClientRect();
    const startOffset = this.start.getBoundingClientRect();

    const start = {
      left: startOffset.left - offset.left,
      top: startOffset.top - offset.top,
      width: startOffset.width / 2,
      height: startOffset.height / 2,
    };

    const end = pos
      ? {
          left: pos.x - offset.left,
          top: pos.y - offset.top,
          width: 0,
          height: 0,
        }
      : this.end
      ? {
          left: this.end.getBoundingClientRect().left - offset.left,
          top: this.end.getBoundingClientRect().top - offset.top,
          width: this.end.getBoundingClientRect().width / 2,
          height: this.end.getBoundingClientRect().height / 2,
        }
      : null;

    if (!end) {
      throw new Error("Cannot draw edge without end or position");
    }

    // Draw bezier. Start always has an angle of 0, end always has an angle of 180.
    // Additional control points are calculated based on the distance between the two points.
    // We want to make sure that there are always control points to the right of the start point, even if the end point is to the left.
    // We also want to take the vertical distance between the two points into account, so that the curve doesn't
    // have too sharp of a turn if the end point is above or below the start point.
    const distance = Math.sqrt(
      Math.pow(end.left - start.left, 2) + Math.pow(end.top - start.top, 2)
    );
    const controlPointDistance = Math.max(distance / 2, 100);

    const startControlPoint = {
      x: start.left + start.width + controlPointDistance,
      y: start.top + start.height,
    };
    const endControlPoint = {
      x: end.left - end.width - controlPointDistance,
      y: end.top + end.height,
    };
    const midControlPoint = {
      x: (start.left + start.width + end.left + end.width) / 2,
      y: (start.top + start.height + end.top + end.height) / 2,
    };

    const useControlPoints =
      Math.abs(start.top - end.top) > Math.abs(start.left - end.left);

    const path = useControlPoints
      ? `M ${start.left + start.width} ${start.top + start.height} C ${
          startControlPoint.x
        } ${startControlPoint.y} ${endControlPoint.x} ${endControlPoint.y} ${
          end.left - end.width
        } ${end.top + end.height}`
      : `M ${start.left + start.width} ${start.top + start.height} C ${
          midControlPoint.x
        } ${start.top + start.height}, ${midControlPoint.x} ${
          end.top + end.height
        }, ${end.left + end.width} ${end.top + end.height}`;

    this.path.setAttribute("d", path);
  };

  public redraw = (): void => {
    this.draw();
  };

  public remove = (): void => {
    this.path.remove();
  };

  public dispose = (): void => {
    this.path.remove();
    if (this.end) {
      this.end.removeEdge(this);
      this.end = null;
    }
    if (this.start) {
      this.start.removeEdge(this);
      this.start;
    }
  };
}
