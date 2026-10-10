export type FindViewProgress={stage:'search'|'hint'|'answer';answerChecked:boolean;plane:'coronal'|'horizontal'|'sagittal';position:number;rotation:{x:number;y:number;z?:number};zoom:number;pan:{x:number;y:number};guess:{x:number;y:number}|null;reading:{scroll:number;openDetails:number[]}};
export type FindProgress={taskKey:string;signature:string;state:FindViewProgress;start:{plane:FindViewProgress['plane'];position:number}|null};
export type PapezInlineViewportProgress={step:number;plane:FindViewProgress['plane'];zoom:number;pan:{x:number;y:number}};
export type CircuitViewProgress={rotation:FindViewProgress['rotation'];zoom:number;pan:{x:number;y:number};hemisphere:'both'|'left'|'right';mobilePane:'view'|'guide';freeSelections:string[];freeFocused:string|null;ghost:boolean;cerebellum:boolean;vessels:boolean;nerves:boolean;ponsMedulla:boolean;sectionsOpen:boolean;basalStep:number;papezStep:number;visualIndex:number|null;papezSlice?:PapezInlineViewportProgress};
export type CircuitProgress={selected:string|null;inspector:'structures'|'circuits';positions:Record<string,{pathKey:string;nodeIndex:number;nodeKey:string}>;readings:Record<string,{scroll:number;openDetails:number[]}>;view:CircuitViewProgress|null;sectionOrigin:string|null};
export function findTaskSignature(task:unknown):string;
export function readFindProgress(value:unknown,tasks:readonly unknown[]):FindProgress|null;
export function readCircuitProgress(value:unknown,registry:unknown):CircuitProgress|null;
