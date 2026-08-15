import { appBuildInfo, currentAppBaseUrl, type AppBuildInfo } from "./buildInfo";

export type DeviceRouteKey="home"|"surface"|"sections"|"blocks"|"quiz"|"segment"|"offlineSurface"|"offlineSections"|"offlineBlocks"|"offlineQuiz";

export type DevicePerformanceObservation={
  key:DeviceRouteKey;
  recordedAt:string;
  routeHash:string;
  online:boolean;
  viewport:{width:number;height:number};
  canvasCount:number;
  horizontalOverflowPx:number;
  resourceCount:number;
  transferBytes:number;
  encodedBodyBytes:number;
  decodedBodyBytes:number;
  longestResourceMs:number;
  navigation:{type:string;durationMs:number;domContentLoadedMs:number;loadMs:number;transferBytes:number;encodedBodyBytes:number;decodedBodyBytes:number}|null;
  currentJsHeapBytes:number|null;
  peakJsHeapBytes:number|null;
};

export type DeviceColdStartObservation=Omit<DevicePerformanceObservation,"key">&{key:"coldHome"};

export type DevicePerformanceSession={
  format:"brain-practical-device-performance";
  schemaVersion:2;
  application:AppBuildInfo&{runtimeBaseUrl:string};
  origin:string;
  startedAt:string;
  stoppedAt:string|null;
  active:boolean;
  memorySupported:boolean;
  peakJsHeapBytes:number|null;
  coldStart:DeviceColdStartObservation;
  observations:Partial<Record<DeviceRouteKey,DevicePerformanceObservation>>;
};

const PERFORMANCE_KEY="brain-practical-device-performance-v2";
const LEGACY_PERFORMANCE_KEY="brain-practical-device-performance-v1";
const LAST_CONTENT_ROUTE_KEY="brain-practical-last-content-route-v1";
export const CONTENT_ROUTE_HISTORY_KEY="brainPracticalContentRoute";
const routeKeys:DeviceRouteKey[]=["home","surface","sections","blocks","quiz","segment","offlineSurface","offlineSections","offlineBlocks","offlineQuiz"];
const overlayPattern=/^#workspace\/(help|offline|device-check|feedback|legal)(?:\/|$)/;
const round=(value:number,digits=1)=>Number(value.toFixed(digits));
const memory=()=>((performance as Performance&{memory?:{usedJSHeapSize:number}}).memory?.usedJSHeapSize??null);
let sampledPeak:number|null=null,lastPeakPersistedAt=0;

function readSession(){
  try{const value=JSON.parse(localStorage.getItem(PERFORMANCE_KEY)??"null");return value?.format==="brain-practical-device-performance"&&value?.schemaVersion===2&&value?.application?.commit===appBuildInfo.commit&&value?.application?.dirty===appBuildInfo.dirty&&value?.application?.basePath===appBuildInfo.basePath&&value?.coldStart?.key==="coldHome"?value as DevicePerformanceSession:null}catch{return null}
}

function writeSession(session:DevicePerformanceSession){
  try{localStorage.setItem(PERFORMANCE_KEY,JSON.stringify(session))}catch{/* best-effort local evidence */}
  window.dispatchEvent(new CustomEvent("brain-practical-performance-change",{detail:session}));
  return session;
}

export function rememberDeviceContentRoute(hash=location.hash){
  if(!hash||overlayPattern.test(hash))return;
  try{sessionStorage.setItem(LAST_CONTENT_ROUTE_KEY,hash)}catch{/* route hint is best effort */}
}

function routeHashForEvidence(){
  let routeHash=location.hash;
  if(!overlayPattern.test(routeHash))return routeHash;
  try{
    const historyRoute=(history.state as Record<string,unknown>|null)?.[CONTENT_ROUTE_HISTORY_KEY];
    if(typeof historyRoute==="string"&&historyRoute&&!overlayPattern.test(historyRoute))return historyRoute;
    return sessionStorage.getItem(LAST_CONTENT_ROUTE_KEY)??routeHash;
  }catch{return routeHash}
}

export function getDevicePerformanceSession(){return typeof window==="undefined"?null:readSession()}

export function startDevicePerformanceSession(){
  rememberDeviceContentRoute();
  const current=memory(),recordedAt=new Date().toISOString(),resources=performance.getEntriesByType("resource") as PerformanceResourceTiming[],navigation=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
  const routeHash=routeHashForEvidence();
  const coldStart:DeviceColdStartObservation={key:"coldHome",recordedAt,routeHash,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight},canvasCount:document.querySelectorAll("canvas").length,horizontalOverflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),resourceCount:resources.length,transferBytes:resources.reduce((sum,entry)=>sum+entry.transferSize,0),encodedBodyBytes:resources.reduce((sum,entry)=>sum+entry.encodedBodySize,0),decodedBodyBytes:resources.reduce((sum,entry)=>sum+entry.decodedBodySize,0),longestResourceMs:round(Math.max(0,...resources.map(entry=>entry.duration))),navigation:navigation?{type:navigation.type,durationMs:round(navigation.duration),domContentLoadedMs:round(navigation.domContentLoadedEventEnd),loadMs:round(navigation.loadEventEnd),transferBytes:navigation.transferSize,encodedBodyBytes:navigation.encodedBodySize,decodedBodyBytes:navigation.decodedBodySize}:null,currentJsHeapBytes:current,peakJsHeapBytes:current};
  sampledPeak=current;lastPeakPersistedAt=Date.now();performance.setResourceTimingBufferSize?.(500);
  const session=writeSession({format:"brain-practical-device-performance",schemaVersion:2,application:{...appBuildInfo,runtimeBaseUrl:currentAppBaseUrl()},origin:location.origin,startedAt:recordedAt,stoppedAt:null,active:true,memorySupported:current!==null,peakJsHeapBytes:current,coldStart,observations:{}});
  performance.clearResourceTimings();return session;
}

export function resetDevicePerformanceSession(){
  sampledPeak=null;lastPeakPersistedAt=0;
  try{localStorage.removeItem(PERFORMANCE_KEY);localStorage.removeItem(LEGACY_PERFORMANCE_KEY)}catch{/* nothing to clear */}
  window.dispatchEvent(new CustomEvent("brain-practical-performance-change",{detail:null}));
}

export function startDevicePerformanceSampler(){
  rememberDeviceContentRoute();
  sampledPeak=readSession()?.peakJsHeapBytes??sampledPeak;
  const routeListener=()=>rememberDeviceContentRoute();
  const timer=window.setInterval(()=>{
    const session=readSession(),current=memory();
    if(!session?.active||current===null)return;
    sampledPeak=Math.max(sampledPeak??0,current);
    if(sampledPeak<=(session.peakJsHeapBytes??0)||(Date.now()-lastPeakPersistedAt<2000&&sampledPeak<(session.peakJsHeapBytes??0)+4*1048576))return;
    lastPeakPersistedAt=Date.now();writeSession({...session,memorySupported:true,peakJsHeapBytes:sampledPeak});
  },250);
  window.addEventListener("hashchange",routeListener);
  window.addEventListener("popstate",routeListener);
  return()=>{window.clearInterval(timer);window.removeEventListener("hashchange",routeListener);window.removeEventListener("popstate",routeListener)};
}

export function recordDevicePerformanceObservation(key:DeviceRouteKey,recordedAt=new Date().toISOString()){
  const session=readSession();
  if(!session?.active)return null;
  const current=memory(),peak=Math.max(session.peakJsHeapBytes??0,sampledPeak??0,current??0)||null;
  const resources=performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const navigation=performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming|undefined;
  const routeHash=routeHashForEvidence();
  const observation:DevicePerformanceObservation={
    key,recordedAt,routeHash,online:navigator.onLine,viewport:{width:innerWidth,height:innerHeight},canvasCount:document.querySelectorAll("canvas").length,
    horizontalOverflowPx:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),resourceCount:resources.length,
    transferBytes:resources.reduce((sum,entry)=>sum+entry.transferSize,0),encodedBodyBytes:resources.reduce((sum,entry)=>sum+entry.encodedBodySize,0),decodedBodyBytes:resources.reduce((sum,entry)=>sum+entry.decodedBodySize,0),longestResourceMs:round(Math.max(0,...resources.map(entry=>entry.duration))),
    navigation:navigation?{type:navigation.type,durationMs:round(navigation.duration),domContentLoadedMs:round(navigation.domContentLoadedEventEnd),loadMs:round(navigation.loadEventEnd),transferBytes:navigation.transferSize,encodedBodyBytes:navigation.encodedBodySize,decodedBodyBytes:navigation.decodedBodySize}:null,
    currentJsHeapBytes:current,peakJsHeapBytes:peak,
  };
  const observations={...session.observations,[key]:observation};
  const complete=routeKeys.every(routeKey=>observations[routeKey]);
  writeSession({...session,stoppedAt:complete?recordedAt:null,active:!complete,memorySupported:session.memorySupported||current!==null,peakJsHeapBytes:peak,observations});
  performance.clearResourceTimings();
  return observation;
}

export function removeDevicePerformanceObservation(key:DeviceRouteKey){
  const session=readSession();if(!session)return null;
  const observations={...session.observations};delete observations[key];
  return writeSession({...session,observations,active:true,stoppedAt:null});
}
