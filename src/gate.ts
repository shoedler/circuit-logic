interface IDisposable {
    dispose(): void;
}

interface IUpdatable {
    update(): void;
}

export class Gate extends HTMLDivElement implements IDisposable, IUpdatable {
  private static _gateCount = 0;
  private readonly _inputs: GateConnectorCollection;
  private readonly _name: HTMLParagraphElement;
  private readonly _outputs: GateConnectorCollection;

  public get name(): string { return this._name.innerText;  }
  private set name(v: string) { this._name.innerText = v; }
  
  constructor(params: { bounds: HTMLDivElement, name: string, inputs?: string[], outputs?: string[] }) {
    super();

    this.classList.add('gate');
    this.id = `gate-${Gate._gateCount++}`;

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

  public update(): void {
      this._inputs.update();
      this._outputs.update();
  }

  public dispose = () => {
    this._inputs.dispose();
    this._outputs.dispose();
    this.remove();
  }
}

export class GateConnectorCollection extends HTMLDivElement implements IDisposable, IUpdatable {
  private readonly _connectors: GateConnector[] = [];
  public readonly type: 'inputs' | 'outputs';
  constructor(owner: Gate, type: 'inputs' | 'outputs', connectors: string[]) {
    super();

    this.classList.add(`gate-${type}`);
    this.type = type;
    owner.appendChild(this);

    connectors.forEach(c => this._connectors.push(new GateConnector(this, c)));
  }

  public forEach = (callback: (connector: GateConnector) => void) => this._connectors.forEach(callback);

  public update(): void {
    this._connectors.forEach(c => c.update());
  }

  public dispose = () => {
    this._connectors.forEach(c => c.dispose());
    this.remove();
  }
}

export class GateConnector extends HTMLDivElement implements IDisposable, IUpdatable {
  private readonly _name: string;
  private readonly _parent: GateConnectorCollection;
  private readonly _edges: GateEdge[] = [];
  public readonly type: () => 'inputs' | 'outputs';
  constructor(parent: GateConnectorCollection, name: string) {
    super();

    this.classList.add('gate-connector');
    parent.appendChild(this);
    this.type = function () { return parent.type };

    this._name = name;
  }

  public toggleIllegal = (illegal: boolean) => {
    if (illegal) {
      this.classList.add('illegal');
    } else {
      this.classList.remove('illegal');
    }
  }

  public newEdge = (parent: SVGElement): GateEdge => {
    const edge = new GateEdge({ parent, start: this });
    this._edges.push(edge);
    return edge;
  }

  public endEdge = (end: GateEdge) => {
    end.end = this;
    this._edges.push(end);
  }

  public removeEdge = (edge: GateEdge) => {
    const index = this._edges.indexOf(edge);
    if (index > -1) {
      this._edges.splice(index, 1);
    }
  }

  public update(): void {
    this._edges.forEach(e => e.update());
  }

  dispose = () => {
    this.remove();
  }
}

export class GateEdge implements IDisposable, IUpdatable {
  public readonly path: SVGPathElement
  public readonly start: GateConnector;
  private readonly _svg: Omit<SVGElement, 'remove'>;

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

    this._svg = params.parent;
    this._svg.appendChild(this.path);
  }

  public toggleIllegal = (illegal: boolean) => {
    if (illegal) {
      this.path.classList.add('illegal');
    } else {
      this.path.classList.remove('illegal');
    }
  }

  public draw = (pos?: { x: number, y: number }) => {
    const offset = this._svg.getBoundingClientRect();
    const startOffset = this.start.getBoundingClientRect();
    const start = {
      left: startOffset.left - offset.left,
      top: startOffset.top - offset.top,
      width: startOffset.width / 2,
      height: startOffset.height / 2
    }

    if (pos) {
      const end = {
        left: pos.x - offset.left,
        top: pos.y - offset.top,
        width: 0,
        height: 0
      };

      const path = `M ${start.left + start.width} ${start.top + start.height} L ${end.left} ${end.top}`;
      this.path.setAttribute('d', path);
    }
    else if (this.end) {
      const endOffset = this.end.getBoundingClientRect();
      const end = {
        left: endOffset.left - offset.left,
        top: endOffset.top - offset.top,
        width: endOffset.width / 2,
        height: endOffset.height / 2
      }

      const path = `M ${start.left + start.width} ${start.top + start.height} L ${end.left + end.width} ${end.top + end.height}`;
      this.path.setAttribute('d', path);
    }
    else {
      throw new Error('Cannot draw edge without end or position');
    }
  }

  public update(): void {
    this.draw()
  }

  dispose = () => {
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

interface IDragEventHandler {
  onStart: (event: MouseEvent) => void;
  onDrag: (event: MouseEvent) => void;
  onDrop: (event: MouseEvent) => void;
}

let currentDragHandler: IDragEventHandler = null;

document.addEventListener('mousedown', (e: MouseEvent) => {
  const element = document.elementFromPoint(e.clientX, e.clientY);
  if (element instanceof GateConnector) {
    currentDragHandler = new EdgeDragHandler();
  }
  else if (element instanceof Gate || element.classList.contains('gate-label')) {
    currentDragHandler = new GateDragHandler();
  }
  else {
    return
  }

  currentDragHandler.onStart(e);
})

document.addEventListener('mousemove', (e: MouseEvent) => {
  if (currentDragHandler) {
    currentDragHandler.onDrag(e);
  }
})

document.addEventListener('mouseup', (e: MouseEvent) => {
  if (currentDragHandler) {
    currentDragHandler.onDrop(e);
    currentDragHandler = null;
  }
})

export class EdgeDragHandler implements IDragEventHandler {
  private static _svg: SVGElement;
  private _currentEdge: GateEdge;
  public static attach = (params: { attachee: HTMLDivElement }) => {
    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    params.attachee.appendChild(this._svg);
  }

  public onStart = (e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    console.assert(el instanceof GateConnector);
    const startConnector = el as GateConnector;

    if (startConnector.type() === 'inputs') {
      startConnector.toggleIllegal(true);
      setTimeout(() => startConnector.toggleIllegal(false), 500);
      return 
    }
    
    this._currentEdge = startConnector.newEdge(EdgeDragHandler._svg);
    e.preventDefault();
    return false;
  }

   public onDrag = (e: MouseEvent) => {
    if (this._currentEdge) {
      this._currentEdge.draw({ x: e.clientX, y: e.clientY });

      // Visually show that the edge is valid
      const endConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
      if (endConnector instanceof GateConnector) {
        if (endConnector.type() === 'outputs')
          this._currentEdge.toggleIllegal(true);
      }
      else {
        this._currentEdge.toggleIllegal(false);
      }

      return false;
    }
  }

  public onDrop = (e: MouseEvent) => {
    if (this._currentEdge) {
      const endConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
      if (endConnector instanceof GateConnector) {
        if (endConnector.type() === 'outputs') {
          this._currentEdge.dispose();
          return
        }
        endConnector.endEdge(this._currentEdge);
      }
      else {
        this._currentEdge.dispose();
      }

      this._currentEdge = null;
      e.preventDefault();
      return false;
    }
  }
}

export class GateDragHandler implements IDragEventHandler {
  private _origin: { x: number, y: number };
  private _currentGate: Gate;
  public static attach = (params: { attachee: HTMLDivElement }) => {

  }

  public onStart = (e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    console.assert(el instanceof Gate || el.classList.contains('gate-label'));
    this._currentGate = el instanceof Gate ? el : el.parentElement as Gate;

    const style = window.getComputedStyle(this._currentGate, null);
    
    this._origin = {
      x: (parseInt(style.getPropertyValue("left"), 10) - e.clientX),
      y: (parseInt(style.getPropertyValue("top"), 10) - e.clientY)
    };
  }

  public onDrag = (e: MouseEvent) => {
    if (this._currentGate) {
      let left = e.clientX + this._origin.x
      let top = e.clientY + this._origin.y
      
      // // Bind to the bounds of the sketch
      // if (left < 0) left = 0;
      // if (top < 0) top = 0;
      // if (left > bounds.clientWidth - gate.clientWidth) left = bounds.clientWidth - gate.clientWidth;
      // if (top > bounds.clientHeight - gate.clientHeight) top = bounds.clientHeight - gate.clientHeight;
      // // left %= bounds.clientWidth - gate.clientWidth;
      // // top %= bounds.clientHeight - gate.clientHeight;
      
      this._currentGate.style.left = left + 'px';
      this._currentGate.style.top = top + 'px';
    
      // Propagating call to update, will update the edges
      this._currentGate.update();
    
      e.preventDefault();
      return false;
    }
  }

  public onDrop = (e: MouseEvent) => this.onDrag(e);
}