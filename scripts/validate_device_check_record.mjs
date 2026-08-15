import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const recordPath=process.argv.slice(2).find(argument=>argument!=="--");
if(!recordPath){console.error("Usage: npm run validate:device-check -- <record.json>");process.exit(2)}

let record;
try{record=JSON.parse(await readFile(resolve(process.cwd(),recordPath),"utf8"))}
catch(error){console.error(`FAIL\tcannot read device check JSON: ${error instanceof Error?error.message:String(error)}`);process.exit(1)}

const errors=[],warnings=[];
const walkthroughKeys=["home","surface","sections","blocks","quiz","segment","offlineSurface","offlineSections","offlineBlocks","offlineQuiz"];
const onlineWalkthroughKeys=walkthroughKeys.slice(0,6),offlineWalkthroughKeys=walkthroughKeys.slice(6);
const packIds=["surface","sections","blocks"];
const routePatterns={home:/^#workspace\/home$/,surface:/^#workspace\/surface\//,sections:/^#workspace\/sections\//,blocks:/^#workspace\/blocks\//,quiz:/^#workspace\/quiz$/,segment:/^#workspace\/segment$/,offlineSurface:/^#workspace\/surface\//,offlineSections:/^#workspace\/sections\//,offlineBlocks:/^#workspace\/blocks\//,offlineQuiz:/^#workspace\/quiz$/};
const finite=(value)=>typeof value==="number"&&Number.isFinite(value);
const validDate=(value)=>typeof value==="string"&&!Number.isNaN(Date.parse(value));

if(record?.format!=="brain-practical-device-check"||record?.schemaVersion!==4)errors.push("unsupported format or schemaVersion (expected schemaVersion 4)");
if(!validDate(record?.recordedAt))errors.push("recordedAt must be an ISO date");
if(typeof record?.deviceLabel!=="string")errors.push("deviceLabel must be a string");
else if(!record.deviceLabel.trim())warnings.push("deviceLabel is empty; identify the device and browser before review");
if(record?.route?.hash!=="#workspace/device-check")errors.push("route.hash must be #workspace/device-check");
if(typeof record?.environment?.userAgent!=="string"||!record.environment.userAgent.trim())errors.push("environment.userAgent is required");
if(!finite(record?.environment?.viewport?.width)||record.environment.viewport.width<=0||!finite(record?.environment?.viewport?.height)||record.environment.viewport.height<=0)errors.push("environment.viewport must contain positive width and height");
if(!Number.isInteger(record?.environment?.maxTouchPoints)||record.environment.maxTouchPoints<1)errors.push("environment.maxTouchPoints must show touch capability");
if(record?.touch?.confirmed!==true||record?.touch?.pointerType!=="touch"||!validDate(record?.touch?.recordedAt))errors.push("touch must contain a confirmed touch pointer and timestamp");
if(record?.capabilities?.serviceWorkerControlled!==true)errors.push("the page must be controlled by a Service Worker");
if(record?.capabilities?.cacheStorage!==true)errors.push("Cache Storage support is required");
if(record?.graphics?.webgl!==true)errors.push("WebGL rendering must be available");
for(const edge of ["top","right","bottom","left"])if(!finite(record?.safeArea?.[edge])||record.safeArea[edge]<0)errors.push(`safeArea.${edge} must be a non-negative number`);
if(!finite(record?.frameSample?.durationMs)||record.frameSample.durationMs<500)errors.push("frameSample.durationMs must cover at least 500 ms");
if(!Number.isInteger(record?.frameSample?.frames)||record.frameSample.frames<1)errors.push("frameSample.frames must be a positive integer");
for(const metric of ["medianIntervalMs","p95IntervalMs","maxIntervalMs"])if(!finite(record?.frameSample?.[metric])||record.frameSample[metric]<0)errors.push(`frameSample.${metric} must be a non-negative number`);
if(!record?.walkthrough||typeof record.walkthrough!=="object")errors.push("walkthrough is required");
else for(const key of walkthroughKeys){const item=record.walkthrough[key];if(item?.confirmed!==true)errors.push(`walkthrough.${key} is not confirmed`);if(!validDate(item?.recordedAt))errors.push(`walkthrough.${key}.recordedAt must be an ISO date`)}
const performanceSession=record?.performanceSession;
if(performanceSession?.format!=="brain-practical-device-performance"||performanceSession?.schemaVersion!==1)errors.push("performanceSession format/schemaVersion is invalid");
else{
  try{const origin=new URL(performanceSession.origin);if(origin.protocol!=="https:"||["localhost","127.0.0.1","::1"].includes(origin.hostname))errors.push("performanceSession.origin must be a public HTTPS origin")}catch{errors.push("performanceSession.origin must be a valid URL origin")}
  if(!validDate(performanceSession.startedAt))errors.push("performanceSession.startedAt must be an ISO date");
  if(!validDate(performanceSession.stoppedAt))errors.push("performanceSession.stoppedAt must be an ISO date");
  if(performanceSession.active!==false)errors.push("performanceSession must be stopped after all routes are recorded");
  if(typeof performanceSession.memorySupported!=="boolean")errors.push("performanceSession.memorySupported must be boolean");
  if(performanceSession.memorySupported&&(!finite(performanceSession.peakJsHeapBytes)||performanceSession.peakJsHeapBytes<=0))errors.push("performanceSession.peakJsHeapBytes is required when memory is supported");
  const coldStart=performanceSession.coldStart;
  if(!coldStart||typeof coldStart!=="object")errors.push("performanceSession.coldStart is required");
  else{
    if(coldStart.key!=="coldHome"||coldStart.routeHash!=="#workspace/home"||coldStart.online!==true)errors.push("performanceSession.coldStart must describe the online home route");
    if(!validDate(coldStart.recordedAt)||coldStart.recordedAt!==performanceSession.startedAt)errors.push("performanceSession.coldStart.recordedAt must match session start");
    if(!finite(coldStart.viewport?.width)||coldStart.viewport.width<=0||!finite(coldStart.viewport?.height)||coldStart.viewport.height<=0||!Number.isInteger(coldStart.canvasCount)||coldStart.canvasCount<1||coldStart.horizontalOverflowPx!==0)errors.push("performanceSession.coldStart must confirm a rendered, overflow-free viewport");
    if(!Number.isInteger(coldStart.resourceCount)||coldStart.resourceCount<1)errors.push("performanceSession.coldStart.resourceCount must capture the initial load");
    for(const metric of ["transferBytes","encodedBodyBytes","decodedBodyBytes","longestResourceMs"])if(!finite(coldStart[metric])||coldStart[metric]<0)errors.push(`performanceSession.coldStart.${metric} must be non-negative`);
    if(coldStart.transferBytes===0)warnings.push("cold-start transfer is zero; confirm that a cleared-site-data first load was measured on the target device");
    const navigation=coldStart.navigation;if(!navigation||!["navigate","reload"].includes(navigation.type)||!["durationMs","domContentLoadedMs","loadMs","transferBytes","encodedBodyBytes","decodedBodyBytes"].every(metric=>finite(navigation[metric])&&navigation[metric]>=0))errors.push("performanceSession.coldStart navigation timing is required");
  }
  if(!performanceSession.observations||typeof performanceSession.observations!=="object")errors.push("performanceSession.observations is required");
  else{
    const observationTimes=[];
    for(const key of walkthroughKeys){
      const observation=performanceSession.observations[key];
      if(!observation||typeof observation!=="object"){errors.push(`performanceSession.observations.${key} is required`);continue}
      if(observation.key!==key)errors.push(`performanceSession.observations.${key}.key must be ${key}`);
      if(!validDate(observation.recordedAt))errors.push(`performanceSession.observations.${key}.recordedAt must be an ISO date`);else observationTimes.push(Date.parse(observation.recordedAt));
      if(observation.recordedAt!==record?.walkthrough?.[key]?.recordedAt)errors.push(`performanceSession.observations.${key}.recordedAt must match walkthrough.${key}`);
      if(typeof observation.routeHash!=="string"||!routePatterns[key].test(observation.routeHash))errors.push(`performanceSession.observations.${key}.routeHash does not match the route`);
      if(observation.online!==!key.startsWith("offline"))errors.push(`performanceSession.observations.${key}.online is invalid`);
      if(!finite(observation.viewport?.width)||observation.viewport.width<=0||!finite(observation.viewport?.height)||observation.viewport.height<=0)errors.push(`performanceSession.observations.${key}.viewport is invalid`);
      if(!Number.isInteger(observation.canvasCount)||observation.canvasCount<1)errors.push(`performanceSession.observations.${key}.canvasCount must confirm rendered content`);
      if(observation.horizontalOverflowPx!==0)errors.push(`performanceSession.observations.${key}.horizontalOverflowPx must be zero`);
      if(!Number.isInteger(observation.resourceCount)||observation.resourceCount<0)errors.push(`performanceSession.observations.${key}.resourceCount is invalid`);
      for(const metric of ["transferBytes","encodedBodyBytes","decodedBodyBytes","longestResourceMs"])if(!finite(observation[metric])||observation[metric]<0)errors.push(`performanceSession.observations.${key}.${metric} must be non-negative`);
      if(key.startsWith("offline")&&observation.transferBytes!==0)errors.push(`performanceSession.observations.${key}.transferBytes must be zero offline`);
      if(performanceSession.memorySupported){if(!finite(observation.currentJsHeapBytes)||observation.currentJsHeapBytes<=0||!finite(observation.peakJsHeapBytes)||observation.peakJsHeapBytes<observation.currentJsHeapBytes||observation.peakJsHeapBytes>performanceSession.peakJsHeapBytes)errors.push(`performanceSession.observations.${key} heap values are invalid`)}
    }
    if(observationTimes.length===walkthroughKeys.length&&observationTimes.some((time,index)=>index>0&&time<=observationTimes[index-1]))errors.push("performance observations must follow the documented route order");
    if(observationTimes.length&&validDate(performanceSession.startedAt)&&Date.parse(performanceSession.startedAt)>=observationTimes[0])errors.push("performanceSession must start before the first observation");
    if(observationTimes.length&&validDate(performanceSession.stoppedAt)&&Date.parse(performanceSession.stoppedAt)<observationTimes.at(-1))errors.push("performanceSession.stoppedAt must follow the final observation");
    const homeNavigation=performanceSession.observations.home?.navigation;
    if(!homeNavigation||!["navigate","reload"].includes(homeNavigation.type)||!["durationMs","domContentLoadedMs","loadMs","transferBytes","encodedBodyBytes","decodedBodyBytes"].every(metric=>finite(homeNavigation[metric])&&homeNavigation[metric]>=0))errors.push("performanceSession home navigation timing is required");
  }
}
const checkpoints={};
for(const [kind,expectedOnline] of [["online",true],["offline",false],["restored",true]]){
  const checkpoint=record?.pwaEvidence?.[kind];checkpoints[kind]=checkpoint;
  if(!checkpoint||typeof checkpoint!=="object"){errors.push(`pwaEvidence.${kind} is required`);continue}
  if(checkpoint.kind!==kind)errors.push(`pwaEvidence.${kind}.kind must be ${kind}`);
  if(!validDate(checkpoint.recordedAt))errors.push(`pwaEvidence.${kind}.recordedAt must be an ISO date`);
  if(checkpoint.online!==expectedOnline)errors.push(`pwaEvidence.${kind}.online must be ${expectedOnline}`);
  if(checkpoint.standalone!==true)errors.push(`pwaEvidence.${kind}.standalone must confirm home-screen standalone launch`);
  if(checkpoint.serviceWorkerControlled!==true)errors.push(`pwaEvidence.${kind}.serviceWorkerControlled must be true`);
  if(typeof checkpoint.catalogVersion!=="string"||!/^[0-9a-f]{12}$/.test(checkpoint.catalogVersion))errors.push(`pwaEvidence.${kind}.catalogVersion is invalid`);
  if(!Array.isArray(checkpoint.packs)){errors.push(`pwaEvidence.${kind}.packs is required`);continue}
  if(checkpoint.packs.length!==packIds.length)errors.push(`pwaEvidence.${kind}.packs must contain exactly ${packIds.length} packs`);
  for(const id of packIds){
    const matches=checkpoint.packs.filter(pack=>pack?.id===id);
    if(matches.length!==1){errors.push(`pwaEvidence.${kind}.packs must contain one ${id} pack`);continue}
    const pack=matches[0];
    if(typeof pack.version!=="string"||!/^[0-9a-f]{12}$/.test(pack.version))errors.push(`pwaEvidence.${kind}.${id}.version is invalid`);
    if(!Number.isInteger(pack.expectedResources)||pack.expectedResources<1||pack.cachedResources!==pack.expectedResources)errors.push(`pwaEvidence.${kind}.${id} must have every expected resource cached`);
    if(pack.markerComplete!==true||pack.markerVersion!==pack.version||pack.current!==true)errors.push(`pwaEvidence.${kind}.${id} must be the complete current pack version`);
  }
}
if(validDate(checkpoints.online?.recordedAt)&&validDate(checkpoints.offline?.recordedAt)&&validDate(checkpoints.restored?.recordedAt)){
  const onlineAt=Date.parse(checkpoints.online.recordedAt),offlineAt=Date.parse(checkpoints.offline.recordedAt),restoredAt=Date.parse(checkpoints.restored.recordedAt);
  if(!(onlineAt<offlineAt&&offlineAt<restoredAt))errors.push("PWA checkpoints must be ordered online, offline, restored");
  for(const key of onlineWalkthroughKeys){const at=Date.parse(record?.walkthrough?.[key]?.recordedAt);if(Number.isFinite(at)&&!(onlineAt<at&&at<offlineAt))errors.push(`walkthrough.${key} must be confirmed after the online checkpoint and before the offline checkpoint`)}
  for(const key of offlineWalkthroughKeys){const at=Date.parse(record?.walkthrough?.[key]?.recordedAt);if(Number.isFinite(at)&&!(onlineAt<at&&at<offlineAt))errors.push(`walkthrough.${key} must be confirmed in airplane mode before the offline checkpoint`)}
  if(new Set([checkpoints.online.catalogVersion,checkpoints.offline.catalogVersion,checkpoints.restored.catalogVersion]).size!==1)errors.push("PWA checkpoints must use the same offline catalog version");
  const versions=Object.values(checkpoints).map(checkpoint=>packIds.map(id=>checkpoint?.packs?.find(pack=>pack?.id===id)?.version??"").join(":"));
  if(new Set(versions).size!==1)errors.push("PWA checkpoints must use the same three pack versions");
}
if(typeof record?.problemNotes!=="string"||!record.problemNotes.trim())errors.push("problemNotes must describe problems or explicitly say none");
if(typeof record?.gateDisclaimer!=="string"||!record.gateDisclaimer.includes("実機ゲート合格になりません"))errors.push("gateDisclaimer is missing");

if(record?.capabilities?.standalone!==true)warnings.push("PWA standalone mode was not detected");
if(record?.storage?.persisted!==true)warnings.push("persistent storage was not confirmed");
if(!record?.capabilities?.performanceMemory)warnings.push("browser did not expose JavaScript heap data; collect peak memory separately when possible");
if(!record?.capabilities?.network)warnings.push("browser did not expose connection data; record public-network measurements separately");
if(performanceSession?.memorySupported===false)warnings.push("browser did not expose route peak JavaScript heap; collect peak memory with platform tooling");

for(const warning of warnings)console.warn(`WARN\t${warning}`);
if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\tdevice check ${record.recordedAt}`);
  console.log(`PASS\tconfirmed touch, ${walkthroughKeys.length}/${walkthroughKeys.length} route/performance observations, and 3/3 PWA checkpoints`);
  console.log("PASS\tdevice check record is structurally complete; this is not beta gate approval");
}
