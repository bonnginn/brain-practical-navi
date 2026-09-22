type Geometry={vertices:Float32Array;faces:Uint32Array};
export function circuitTravel(mesh:Geometry,incoming?:Geometry[],outgoing?:Geometry[]):Float32Array;

export function circuitStageDuration(nodeKey?:string|null):number;
export function corticalCircuitTravel(mesh:Geometry & {regions:Float32Array},ids:number[]):Float32Array;
