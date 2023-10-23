import { DEFAULT_GATE_BUILDERS } from "./defaultGates";
import { Gate } from "./gate";

type BlueprintGatesDeclaration = {
  [key: string]:
    | keyof typeof DEFAULT_GATE_BUILDERS
    | {
        type: keyof typeof DEFAULT_GATE_BUILDERS;
        args: Parameters<
          (typeof DEFAULT_GATE_BUILDERS)[keyof typeof DEFAULT_GATE_BUILDERS]
        >;
      };
};

type Blueprint<T extends BlueprintGatesDeclaration> = {
  declaration: T;
  connections: `${string} to ${string}`[];
  positions?: {
    [key in keyof T]?: { x: number; y: number };
  };
};

export const createBlueprint = <T extends BlueprintGatesDeclaration>(
  blueprint: Blueprint<T>
): Blueprint<T> => blueprint;

export const parseBlueprint = <T extends BlueprintGatesDeclaration>(
  edgeCanvas: SVGElement,
  origin: HTMLElement,
  blueprint: Blueprint<T>
) => {
  const setPos = (el: Gate, pos: { x: number; y: number }) => {
    const x = el.offsetLeft;
    const y = el.offsetTop;
    el.style.transform = `translate(${x + pos.x + origin.offsetLeft}px, ${
      y + pos.y + origin.offsetTop
    }px)`;
  };

  const gates: { [key: string]: Gate } = {};
  const { declaration, connections } = blueprint;

  Object.entries(declaration).forEach(([name, type]) => {
    gates[name] = DEFAULT_GATE_BUILDERS[
      typeof type === "string" ? type : type.type
    ].call(undefined, typeof type === "string" ? undefined : type.args);
    setPos(gates[name], blueprint.positions?.[name] ?? { x: 0, y: 0 });
  });

  connections.forEach((connection) => {
    const [fromDef, toDef] = connection.split(" to ");

    const [fromGateName, fromGateOutputName] = fromDef.split(":");
    const [toGateName, toGateInputName] = toDef.split(":");

    if (!(fromGateName in gates))
      throw new Error(
        `In connection '${connection}': Gate '${fromGateName}' is not defined`
      );

    if (!(toGateName in gates))
      throw new Error(
        `In connection '${connection}': Gate '${toGateName}' is not defined`
      );

    const from = gates[fromGateName];
    const to = gates[toGateName];

    const output =
      fromGateOutputName !== undefined
        ? from.outputs.connectors.find((c) => c.name === fromGateOutputName)
        : from.outputs.connectors[0];

    const input =
      toGateInputName !== undefined
        ? to.inputs.connectors.find((c) => c.name === toGateInputName)
        : to.inputs.connectors[0];

    if (!output)
      throw new Error(
        `In connection '${connection}': Gate '${fromGateName}' does not have a output '${fromGateOutputName}'`
      );

    if (!input)
      throw new Error(
        `In connection '${connection}': Gate '${toGateName}' does not have a input '${toGateInputName}'`
      );

    let edge = output.newEdge(edgeCanvas);
    input.endEdge(edge);
  });

  return Object.values(gates);
};
