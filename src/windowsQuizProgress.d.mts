import type {WindowsExplorationRegistry} from './windowsExplorationProgress.mjs';import type {CircuitViewProgress} from './explorationProgress.mjs';
export const WINDOWS_QUIZ_PROGRESS_KEY:string;
export type QuizProgressQuestion={id?:string;target:string;category:string;prompt:string;options:string[];correctAnswer?:string};
export type WindowsQuizProgress={version:1;revision:string;contentRevision:string;queue:string[];options:string[][];index:number;finished:boolean;openMissedNumber:number|null;answers:(string|null)[];title:string|null;origin:Record<string,unknown>|null;originKind:"theme"|"related"|null;circuit:string|null;circuitView:CircuitViewProgress|null;circuitReturn:{observation:Record<string,unknown>;title:{ja:string;en:string};quizTitle:string|null}|null};
export function quizProgressToken(q:QuizProgressQuestion):string;
export function readWindowsQuizProgress(raw:string|null,questions:readonly QuizProgressQuestion[],registry:WindowsExplorationRegistry):{status:string;value:WindowsQuizProgress|null};
export function writeWindowsQuizProgress(storage:Pick<Storage,'getItem'|'setItem'>,expected:string|null,raw:string,questions:readonly QuizProgressQuestion[],registry:WindowsExplorationRegistry,archivedReplacement?:boolean):{status:string;raw:string|null};
