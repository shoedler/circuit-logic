import { GateConnector, Gate, GateEdge } from "./gate";

export interface IDragEventHandler {
  onStart: (event: MouseEvent) => any;
  onDrag: (event: MouseEvent) => any;
  onDrop: (event: MouseEvent) => any;
}

export class EdgeDragHandler implements IDragEventHandler {
  private static _svg: SVGElement;
  private _currentEdge: GateEdge;
  public static attach = (params: { attachee: HTMLDivElement; }) => {
    this._svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    params.attachee.appendChild(this._svg);
  };

  public onStart = (e: MouseEvent): any => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    console.assert(el instanceof GateConnector);
    const startConnector = el as GateConnector;

    if (startConnector.type() === 'inputs') {
      startConnector.toggleIllegal(true);
      setTimeout(() => startConnector.toggleIllegal(false), 500);
      return;
    }

    this._currentEdge = startConnector.newEdge(EdgeDragHandler._svg);
    e.preventDefault();
    return false;
  };

  public onDrag = (e: MouseEvent): any => {
    if (this._currentEdge) {
      this._currentEdge.draw({ x: e.clientX, y: e.clientY });

      // Visually show that the edge is valid
      const potentialEndConnector = document.elementFromPoint(e.clientX, e.clientY);
      if (potentialEndConnector instanceof GateConnector) {
        if (potentialEndConnector.type() === 'outputs') {
          this._currentEdge.toggleIllegal(true);
          this._currentEdge.toggleLegal(false);
        }
        else if (potentialEndConnector.type() === 'inputs') {
          this._currentEdge.toggleIllegal(false);
          this._currentEdge.toggleLegal(true);
        }
      }
      else {
        this._currentEdge.toggleIllegal(false);
        this._currentEdge.toggleLegal(false);
      }

      return false;
    }
  };

  public onDrop = (e: MouseEvent): any => {
    if (this._currentEdge) {
      this._currentEdge.toggleIllegal(false);
      this._currentEdge.toggleLegal(false);

      const potentialEndConnector = document.elementFromPoint(e.clientX, e.clientY);
      if (potentialEndConnector instanceof GateConnector) {
        if (potentialEndConnector.type() === 'outputs') {
          this._currentEdge.dispose();
          return;
        }
        potentialEndConnector.endEdge(this._currentEdge);
        this._currentEdge.draw(); // Update with the final position
      }
      else {
        this._currentEdge.dispose();
      }

      this._currentEdge = null;
      e.preventDefault();
      return false;
    }
  };
}

export class GateDragHandler implements IDragEventHandler {
  private _origin: { x: number; y: number; };
  private _currentGate: Gate;
  public static attach = (params: { attachee: HTMLDivElement; }) => {
  };

  public onStart = (e: MouseEvent): any => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    console.assert(el instanceof Gate || el.classList.contains('gate-label'));
    this._currentGate = el instanceof Gate ? el : el.parentElement as Gate;

    const style = window.getComputedStyle(this._currentGate, null);

    this._origin = {
      x: (parseInt(style.getPropertyValue("left"), 10) - e.clientX),
      y: (parseInt(style.getPropertyValue("top"), 10) - e.clientY)
    };
  };

  public onDrag = (e: MouseEvent): any => {
    if (this._currentGate) {
      let left = e.clientX + this._origin.x;
      let top = e.clientY + this._origin.y;

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
      this._currentGate.redraw();

      e.preventDefault();
      return false;
    }
  };

  public onDrop = (e: MouseEvent): any => this.onDrag(e);
}