interface IDisposable {
    dispose(): void;
}

export class Gate extends HTMLDivElement implements IDisposable {
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
      const gate = document.getElementById(data[2]) as HTMLElement;
    
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
    
      e.preventDefault();
      return false;
    }

    this._dispose = () => {
      this.removeEventListener('dragstart', this._dragStart, false);
      document.body.removeEventListener('dragover', this._dragOver, false);
      document.body.removeEventListener('drop', this._drop, false);
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

  public dispose = () => this._dispose();
}

export class GateConnectorCollection extends HTMLDivElement implements IDisposable {
  private readonly _connectors: GateConnector[] = [];

  constructor(owner: Gate, type: 'inputs' | 'outputs', connectors: string[]) {
    super();

    this.classList.add(`gate-${type}`);
    owner.appendChild(this);

    connectors.forEach(c => this._connectors.push(new GateConnector(this, c)));
  }

  public dispose = () => {
    this._connectors.forEach(c => c.dispose());
    this.remove();
  }
}

export class GateConnector extends HTMLDivElement implements IDisposable {
  private readonly _name: string;
  constructor(owner: GateConnectorCollection, name: string) {
    super();

    this.classList.add('gate-connector');
    owner.appendChild(this);

    this._name = name;
  }

  dispose = () => {
    this.remove();
  }
}

export class GateEdge implements IDisposable {
  public readonly path: SVGPathElement
  public readonly start: GateConnector;

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
    params.parent.appendChild(this.path);
  }

  dispose = () => {
    this.path.remove();
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
        this._currentEdge = new GateEdge({ parent: this._svg, start: startConnector });
        e.preventDefault();
        return false;
      }
    });

    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (this._currentEdge) {
        const startOffset = this._currentEdge.start.getBoundingClientRect();
        const offset = this._svg.getBoundingClientRect();

        const start = {
          left: startOffset.left - offset.left,
          top: startOffset.top - offset.top,
          width: startOffset.width / 2,
          height: startOffset.height / 2
        }

        const end = {
          left: e.clientX - offset.left,
          top: e.clientY - offset.top,
          width: 0,
          height: 0
        };

        const path = `M ${start.left + start.width} ${start.top + start.height} L ${end.left} ${end.top}`;
        this._currentEdge.path.setAttribute('d', path);

        e.preventDefault();
        return false;
      }
    });

    document.addEventListener('mouseup', (e: MouseEvent) => {
      if (this._currentEdge) {
        const endConnector = document.elementFromPoint(e.clientX, e.clientY) as GateConnector;
        if (this.isConnector(endConnector) && endConnector !== this._currentEdge.start) {
          this._currentEdge.end = endConnector;

          const startOffset = this._currentEdge.start.getBoundingClientRect();
          const endOffset = this._currentEdge.end.getBoundingClientRect();
          const offset = this._svg.getBoundingClientRect();

          const start = {
            left: startOffset.left - offset.left,
            top: startOffset.top - offset.top,
            width: startOffset.width / 2,
            height: startOffset.height / 2
          }

          const end = {
            left: endOffset.left - offset.left,
            top: endOffset.top - offset.top,
            width: endOffset.width / 2,
            height: endOffset.height / 2
          }

          const path = `M ${start.left + start.width} ${start.top + start.height} L ${end.left + end.width} ${end.top + end.height}`;
          this._currentEdge.path.setAttribute('d', path);

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