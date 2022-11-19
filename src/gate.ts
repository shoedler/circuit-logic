interface IDisposable {
    dispose(): void;
}

interface IUpdatable {
    update(): void;
}

export class Gate extends HTMLDivElement implements IDisposable, IUpdatable {
  private static _gateCount = 0;

  private readonly _dragStart: (e: DragEvent) => void;
  private readonly _dragOver: (e: DragEvent) => boolean;
  private readonly _drop: (e: DragEvent) => boolean;
  private readonly _dispose: () => void;

  private readonly _inputs: GateConnectorCollection;
  private readonly _name: HTMLParagraphElement;
  private readonly _outputs: GateConnectorCollection;

  public get name(): string { return this._name.innerText;  }
  private set name(v: string) { this._name.innerText = v; }
  
  constructor(params: { bounds: HTMLDivElement, name: string, inputs?: string[], outputs?: string[] }) {
    super();

    // Setup drag events
    this._dragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      const style = window.getComputedStyle(target, null);
    
      e.dataTransfer.setData("text/plain", 
        (parseInt(style.getPropertyValue("left"), 10) - e.clientX) + ',' + 
        (parseInt(style.getPropertyValue("top"), 10) - e.clientY) + ',' + target.id);
    }
    
    this._dragOver = (e: DragEvent) => {
      e.preventDefault();
      return false;
    }
    
    this._drop = (e: DragEvent) => {
      const data = e.dataTransfer.getData("text/plain").split(',');
      const gate = document.getElementById(data[2]) as Gate;
    
      let left = (e.clientX + parseInt(data[0], 10))
      let top = (e.clientY + parseInt(data[1], 10))
      
      // // Bind to the bounds of the sketch
      // if (left < 0) left = 0;
      // if (top < 0) top = 0;
      // if (left > bounds.clientWidth - gate.clientWidth) left = bounds.clientWidth - gate.clientWidth;
      // if (top > bounds.clientHeight - gate.clientHeight) top = bounds.clientHeight - gate.clientHeight;
      // // left %= bounds.clientWidth - gate.clientWidth;
      // // top %= bounds.clientHeight - gate.clientHeight;
      
      gate.style.left = left + 'px';
      gate.style.top = top + 'px';

      // Propagating call to update, will update the edges
      gate.update();
    
      e.preventDefault();
      return false;
    }

    this._dispose = () => {
      this.removeEventListener('dragstart', this._dragStart, false);
      document.body.removeEventListener('dragover', this._dragOver, false);
      document.body.removeEventListener('drop', this._drop, false);
      this._inputs.dispose();
      this._outputs.dispose();
      this.remove();
    }

    // Setup gate root element
    this.classList.add('gate');
    this.setAttribute('draggable', 'true');
    this.id = `gate-${Gate._gateCount++}`;

    // Setup inputs
    if (params.inputs) {
      this._inputs = new GateConnectorCollection(this, 'inputs', params.inputs);
    }
    
    // Setup name paragraph 
    this._name = document.createElement('p');
    this.appendChild(this._name);
    
    // Setup outputs
    if (params.outputs) {
      this._outputs = new GateConnectorCollection(this, 'outputs', params.outputs);
    }

    // Set name
    this.name = params.name;

    // Add drag events
    this.addEventListener('dragstart', this._dragStart, false);
    document.body.addEventListener('dragover', this._dragOver, false);
    document.body.addEventListener('drop', this._drop, false);

    params.bounds.appendChild(this);
  }

  public update(): void {
      this._inputs.update();
      this._outputs.update();
  }

  public dispose = () => this._dispose();
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

export class GateEdgeFactory {
  private static _svg: SVGElement;
  private static _currentEdge: GateEdge;
  private static isConnector = (element: HTMLElement) => element ? element.classList.contains('gate-connector') : false; // TODO: Make classnames static props on the classes
  public static attach = (params: { attachee: HTMLDivElement }) => {
    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    params.attachee.appendChild(this._svg);

    document.addEventListener('mousedown', (e: MouseEvent) => {
      const startConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
      if (this.isConnector(startConnector)) { 
        if (startConnector.type() === 'inputs') {
          startConnector.toggleIllegal(true);
          setTimeout(() => startConnector.toggleIllegal(false), 500);
          return 
        }
        
        this._currentEdge = startConnector.newEdge(this._svg);
        e.preventDefault();
        return false;
      }
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this._currentEdge) {
        this._currentEdge.draw({ x: e.clientX, y: e.clientY });

        // Visually show that the edge is valid
        const endConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
        if (this.isConnector(endConnector)) {
          if (endConnector.type() === 'outputs')
            this._currentEdge.toggleIllegal(true);
        }
        else {
          this._currentEdge.toggleIllegal(false);
        }

        return false;
      }
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (this._currentEdge) {
        const endConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
        if (this.isConnector(endConnector)) {
          if (endConnector.type() === 'outputs')
            return
          endConnector.endEdge(this._currentEdge);
        }
        else {
          this._currentEdge.dispose();
        }

        this._currentEdge = null;
        e.preventDefault();
        return false;
      }
    });
  }
}