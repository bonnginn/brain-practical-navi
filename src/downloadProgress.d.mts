export type DownloadProgressPhase="idle"|"downloading"|"processing";

export type DownloadProgressSnapshot={
  phase:DownloadProgressPhase;
  loaded:number;
  total:number|null;
  percent:number|null;
  resourceCount:number;
};

export type DownloadProgressTracker={
  begin:(id:string)=>number;
  setTotal:(id:string,total:number,token:number)=>void;
  update:(id:string,loaded:number,token:number)=>void;
  processing:(id:string,token:number)=>void;
  complete:(id:string,token:number)=>void;
  fail:(id:string,token:number)=>void;
  reset:()=>void;
  snapshot:()=>DownloadProgressSnapshot;
  subscribe:(listener:(snapshot:DownloadProgressSnapshot)=>void)=>(()=>void);
};

export const EMPTY_DOWNLOAD_PROGRESS:Readonly<DownloadProgressSnapshot>;
export function createDownloadProgressTracker():DownloadProgressTracker;
export function formatDownloadBytes(bytes:number):string;
