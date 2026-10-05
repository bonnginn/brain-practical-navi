export type CircuitHistoryContext={circuitKey:string;pathIndex:number;nodeIndex:number;section?:{plane:'coronal'|'horizontal'|'sagittal';position:number;structureKey:string}};
export function readCircuitHistory(state:unknown,route:string):CircuitHistoryContext|null;
export function circuitHistoryState(state:unknown,route:string,context:unknown):Record<string,unknown>;
