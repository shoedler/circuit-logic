import { Edge } from "./edge";
import { IDisposable, IRedrawable, IPackable } from "./gate";

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

export class ConnectorCollection
  extends HTMLDivElement
  implements IDisposable, IRedrawable, IPackable
{
  public readonly type: "inputs" | "outputs";
  private readonly _connectors: Connector[] = [];

  constructor(
    owner: HTMLElement,
    type: "inputs" | "outputs",
    connectors: string[]
  ) {
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

  public force = (i: number, v: boolean): boolean =>
    (this._connectors[i].state = v);

  public read = (i: number): boolean => this._connectors[i].state;

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
