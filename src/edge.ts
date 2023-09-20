import { IDisposable, IRedrawable } from "./gate";
import { Connector } from "./connector";

export class Edge implements IDisposable, IRedrawable {
  public readonly path: SVGPathElement;
  public readonly start: Connector;
  private readonly _svg: Omit<SVGElement, "remove">;

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
