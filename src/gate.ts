interface IDisposable {
    dispose(): void;
}

interface IRedrawable {
    redraw(): void;
}

export class Gate extends HTMLDivElement implements IDisposable, IRedrawable {
  private static _gateCount = 0;
  private readonly _inputs: GateConnectorCollection;
  private readonly _name: HTMLParagraphElement;
  private readonly _outputs: GateConnectorCollection;
  private readonly _logic: (inputs: boolean[], outputs: boolean[], self?: Gate) => void

  public get name(): string { return this._name.innerText;  }
  private set name(v: string) { this._name.innerText = v; }

  constructor(params: { 
    bounds: HTMLDivElement, 
    name: string, 
    inputs?: string[], 
    outputs?: string[], 
    color?: "red" | "green" | "blue" | "turquoise" | "darkgreen" | "gray",
    logic: (inputs: boolean[], outputs: boolean[], self?: Gate) => void
  }) {
    super();

    this.classList.add('gate');
    this.id = `gate-${Gate._gateCount++}`;
    this._logic = params.logic;

    if (params.color) {
      this.style.backgroundColor = `var(--color-${params.color})`;
    }

    if (params.inputs) {
      this._inputs = new GateConnectorCollection(this, 'inputs', params.inputs);
    }
 
    this._name = document.createElement('p');
    this._name.classList.add('gate-label');
    this.appendChild(this._name);
    
    if (params.outputs) {
      this._outputs = new GateConnectorCollection(this, 'outputs', params.outputs);
    }

    this.name = params.name;

    params.bounds.appendChild(this);
  }

  public run = (): void => {
    const inputs = this._inputs.toBoolArray()
    const outputs = this._outputs.toBoolArray()
    this._logic(inputs, outputs, this)
    this._outputs.fromBoolArray(outputs)
  }

  public redraw(): void {
      this._inputs.redraw();
      this._outputs.redraw();
  }

  public dispose = () => {
    this._inputs.dispose();
    this._outputs.dispose();
    this.remove();
  }
}

export class GateConnectorCollection extends HTMLDivElement implements IDisposable, IRedrawable {
  private readonly _connectors: GateConnector[] = [];
  public readonly type: 'inputs' | 'outputs';
  constructor(owner: Gate, type: 'inputs' | 'outputs', connectors: string[]) {
    super();

    this.classList.add(`gate-${type}`);
    this.type = type;
    owner.appendChild(this);

    connectors.forEach(c => this._connectors.push(new GateConnector(this, c)));
  }

  public toBoolArray = (): boolean[] => this._connectors.map(c => c.isActive);
  public fromBoolArray = (values: boolean[]): void => {
    if (this.type === 'inputs') 
      throw new Error('Cannot set input values on an output collection');
    this._connectors.forEach((c, i) => c.toggleActive(values[i]));
  }

  public redraw = (): void => {
    this._connectors.forEach(c => c.redraw());
  }

  public dispose = (): void => {
    this._connectors.forEach(c => c.dispose());
    this.remove();
  }
}

export class GateConnector extends HTMLDivElement implements IDisposable, IRedrawable {
  private readonly _name: string;
  private readonly _edges: GateEdge[] = [];
  public get isActive(): boolean { return this._edges.some(edge => edge.isActive); }
  public readonly type: () => 'inputs' | 'outputs';
  constructor(parent: GateConnectorCollection, name: string) {
    super();

    this.classList.add('gate-connector');
    parent.appendChild(this);
    this.type = function () { return parent.type };

    this._name = name;
  }

  public toggleIllegal = (illegal: boolean): void => illegal ? this.classList.add('illegal') : this.classList.remove('illegal');
  public toggleActive = (active: boolean): void => {
    if (this.type() === 'inputs') 
      throw new Error('Cannot toggle active state of input connector');
    this._edges.forEach(e => e.toggleActive(active));
  }

  public newEdge = (parent: SVGElement): GateEdge => {
    const edge = new GateEdge({ parent, start: this });
    this._edges.push(edge);
    return edge;
  }

  public endEdge = (end: GateEdge): void => {
    end.end = this;
    this._edges.push(end);
  }

  public removeEdge = (edge: GateEdge): void => {
    const index = this._edges.indexOf(edge);
    if (index > -1) {
      this._edges.splice(index, 1);
    }
  }

  public redraw = (): void => {
    this._edges.forEach(e => e.redraw());
  }

  public dispose = (): void => {
    this._edges.forEach(e => e.dispose());
    this.remove();
  }
}

export class GateEdge implements IDisposable, IRedrawable {
  public readonly path: SVGPathElement
  public readonly start: GateConnector;
  private readonly _svg: Omit<SVGElement, 'remove'>;
  public get isActive(): boolean { return this.path.classList.contains('active'); }
  private _end : GateConnector;
  public get end() : GateConnector { return this._end; }
  public set end(v : GateConnector) { 
    this._end = v; 
    this.path.classList.remove('drawing');
  }

  constructor(params: { parent: SVGElement, start: GateConnector }) {
    this.start = params.start;
    this.path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    this.path.classList.add('drawing');
    this.path.addEventListener('dblclick', _ => {
      if (this.end) this.end.removeEdge(this);
      if (this.start) this.start.removeEdge(this);
      this.dispose();
    });
    this._svg = params.parent;
    this._svg.appendChild(this.path);
  }

  public toggleIllegal = (illegal: boolean): void => illegal ? this.path.classList.add('illegal') : this.path.classList.remove('illegal');
  public toggleLegal = (legal: boolean): void => legal ? this.path.classList.add('legal') : this.path.classList.remove('legal');
  public toggleActive = (active: boolean): void => active ? this.path.classList.add('active') : this.path.classList.remove('active');

  public draw = (pos?: { x: number, y: number }): void => {
    const offset = this._svg.getBoundingClientRect();
    const startOffset = this.start.getBoundingClientRect();

    const start = {
      left: startOffset.left - offset.left,
      top: startOffset.top - offset.top,
      width: startOffset.width / 2,
      height: startOffset.height / 2
    }

    const end = pos ? {
      left: pos.x - offset.left,
      top: pos.y - offset.top,
      width: 0,
      height: 0
    } : this.end ? {
      left: this.end.getBoundingClientRect().left - offset.left,
      top: this.end.getBoundingClientRect().top - offset.top,
      width: this.end.getBoundingClientRect().width / 2,
      height: this.end.getBoundingClientRect().height / 2
    } : null;

    if (!end) {
      throw new Error('Cannot draw edge without end or position');
    }

    // Draw bezier. Start always has an angle of 0, end always has an angle of 180.
    // Additional control points are calculated based on the distance between the two points.
    // We want to make sure that there are always control points to the right of the start point, even if the end point is to the left.
    // We also want to take the vertical distance between the two points into account, so that the curve doesn't 
    // have too sharp of a turn if the end point is above or below the start point.
    const distance = Math.sqrt(Math.pow(end.left - start.left, 2) + Math.pow(end.top - start.top, 2));
    const controlPointDistance = Math.max(distance / 2, 100);

    const startControlPoint = {
      x: start.left + start.width + controlPointDistance,
      y: start.top + start.height
    }
    const endControlPoint = {
      x: end.left - end.width - controlPointDistance,
      y: end.top + end.height
    }
    const midControlPoint = {
      x: (start.left + start.width + end.left + end.width) / 2,
      y: (start.top + start.height + end.top + end.height) / 2
    }

    const useControlPoints = Math.abs(start.top - end.top) > Math.abs(start.left - end.left);

    const path = useControlPoints ? 
      `M ${start.left + start.width} ${start.top + start.height} C ${startControlPoint.x} ${startControlPoint.y} ${endControlPoint.x} ${endControlPoint.y} ${end.left - end.width} ${end.top + end.height}` :
      `M ${start.left + start.width} ${start.top + start.height} C ${midControlPoint.x} ${start.top + start.height}, ${midControlPoint.x} ${end.top + end.height}, ${end.left + end.width} ${end.top + end.height}`;

    this.path.setAttribute('d', path);
  }


  public redraw = (): void => {
    this.draw()
  }

  public dispose = (): void => {
    this.path.remove();
    if (this.end) {
      this.end.removeEdge(this);
      this.end = null;
    }
    if (this.start) {
      this.start.removeEdge(this);
      this.start
    }
  }
}

