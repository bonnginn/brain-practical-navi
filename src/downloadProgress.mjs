export const EMPTY_DOWNLOAD_PROGRESS=Object.freeze({
  phase:"idle",
  loaded:0,
  total:null,
  percent:null,
  resourceCount:0,
});

export function createDownloadProgressTracker(){
  const resources=new Map();
  const listeners=new Set();
  let serial=0;

  const snapshot=()=>{
    if(resources.size===0)return EMPTY_DOWNLOAD_PROGRESS;
    const entries=[...resources.values()];
    const downloading=entries.some(entry=>entry.phase==="downloading");
    const processing=entries.some(entry=>entry.phase==="processing");
    const loaded=entries.reduce((sum,entry)=>sum+entry.loaded,0);
    const allTotalsKnown=entries.every(entry=>entry.total!==null);
    const total=allTotalsKnown?entries.reduce((sum,entry)=>sum+entry.total,0):null;
    return{
      phase:downloading?"downloading":processing?"processing":"idle",
      loaded,
      total,
      percent:total!==null&&total>0?Math.min(100,Math.floor(loaded/total*100)):null,
      resourceCount:entries.length,
    };
  };

  const publish=()=>{const current=snapshot();for(const listener of listeners)listener(current)};
  const begin=id=>{
    if(resources.size>0&&[...resources.values()].every(entry=>entry.phase==="done"||entry.phase==="failed"))resources.clear();
    const token=++serial;
    resources.set(id,{loaded:0,total:null,phase:"downloading",token});
    publish();
    return token;
  };
  const setTotal=(id,total,token)=>{
    const entry=resources.get(id);if(!entry||entry.token!==token)return;
    entry.total=Number.isFinite(total)&&total>0?Math.floor(total):null;
    publish();
  };
  const update=(id,loaded,token)=>{
    const entry=resources.get(id);if(!entry||entry.token!==token||entry.phase!=="downloading")return;
    entry.loaded=Math.max(entry.loaded,Math.max(0,Math.floor(loaded)));
    if(entry.total!==null)entry.loaded=Math.min(entry.loaded,entry.total);
    publish();
  };
  const processing=(id,token)=>{
    const entry=resources.get(id);if(!entry||entry.token!==token)return;
    if(entry.total!==null)entry.loaded=entry.total;
    entry.phase="processing";
    publish();
  };
  const complete=(id,token)=>{const entry=resources.get(id);if(!entry||entry.token!==token)return;entry.phase="done";publish()};
  const fail=(id,token)=>{const entry=resources.get(id);if(!entry||entry.token!==token)return;entry.phase="failed";publish()};
  const reset=()=>{resources.clear();publish()};
  const subscribe=listener=>{listeners.add(listener);listener(snapshot());return()=>listeners.delete(listener)};

  return{begin,setTotal,update,processing,complete,fail,reset,snapshot,subscribe};
}

export function formatDownloadBytes(bytes){
  if(bytes<1024)return`${bytes} B`;
  if(bytes<1024*1024)return`${(bytes/1024).toFixed(bytes<10240?1:0)} KB`;
  return`${(bytes/(1024*1024)).toFixed(bytes<10*1024*1024?1:0)} MB`;
}
