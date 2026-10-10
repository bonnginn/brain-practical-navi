import type {FindProgress,CircuitProgress} from './explorationProgress.mjs';
export const WINDOWS_EXPLORATION_PROGRESS_KEY:string;
export interface WindowsExplorationRegistry {
  revision:string;contentRevision:string;findTasks:readonly unknown[];
  circuits:Record<string,{paths:readonly {key:string;nodes:readonly string[]}[]}>;
  freeKeys:readonly string[];basalCount:number;papezCount:number;visualCount:number;
  structureKeys:readonly string[];themeKeys:readonly string[];surfaceViews:readonly string[];
  regionKeys:readonly string[];landmarkKeys:readonly string[];deepLandmarkKeys:readonly string[];basalLandmarkKeys:readonly string[];
}
export type WindowsExplorationProgress={version:1;revision:string;contentRevision:string;observation?:Record<string,unknown>|null;practice:(FindProgress&{returnTo:unknown|null})|null;circuit:(CircuitProgress&{section:unknown|null;returnTo:unknown|null})|null};
export type WindowsExplorationReadStatus='empty'|'invalid'|'version-mismatch'|'revision-mismatch'|'unrestorable'|'valid';
export function readWindowsObservationSnapshot(value:unknown,registry:WindowsExplorationRegistry):Record<string,unknown>|null;
export function readWindowsExplorationProgress(raw:string|null,registry:WindowsExplorationRegistry):{status:WindowsExplorationReadStatus;value:WindowsExplorationProgress|null};
export function serializeWindowsExplorationProgress(value:{practice:unknown|null;circuit:unknown|null;observation?:unknown|null},registry:WindowsExplorationRegistry):string|null;
export function writeWindowsExplorationProgress(storage:Pick<Storage,'getItem'|'setItem'>,expectedRaw:string|null,raw:string,registry:WindowsExplorationRegistry):{status:Exclude<WindowsExplorationReadStatus,'empty'|'valid'>|'saved'|'conflict'|'unavailable';raw:string|null};

export function preserveAndWriteWindowsExplorationProgress(storage:Pick<Storage,'getItem'|'setItem'>,raw:string,registry:WindowsExplorationRegistry,originals?:string[],archiveKey?:string):{status:'unrestorable'|'saved'|'conflict'|'unavailable';raw:string|null;archiveKey?:string;records?:{key:string;raw:string}[]};
