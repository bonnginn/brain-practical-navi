import type {PapezInlineViewportProgress} from './explorationProgress.mjs';
type Update<T> = T | ((previous:T)=>T);
export function papezInlineViewportForContext(saved:PapezInlineViewportProgress|null|undefined,step:number,plane:PapezInlineViewportProgress['plane']):PapezInlineViewportProgress;
export function updatePapezInlineViewport(saved:PapezInlineViewportProgress|null|undefined,step:number,plane:PapezInlineViewportProgress['plane'],update:{zoom?:Update<number>;pan?:Update<{x:number;y:number}>}):PapezInlineViewportProgress;
