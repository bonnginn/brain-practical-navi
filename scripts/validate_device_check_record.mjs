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
const finite=(value)=>typeof value==="number"&&Number.isFinite(value);
const validDate=(value)=>typeof value==="string"&&!Number.isNaN(Date.parse(value));

if(record?.format!=="brain-practical-device-check"||record?.schemaVersion!==3)errors.push("unsupported format or schemaVersion (expected schemaVersion 3)");
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

for(const warning of warnings)console.warn(`WARN\t${warning}`);
if(errors.length){for(const error of errors)console.error(`FAIL\t${error}`);process.exitCode=1}else{
  console.log(`PASS\tdevice check ${record.recordedAt}`);
  console.log(`PASS\tconfirmed touch, ${walkthroughKeys.length}/${walkthroughKeys.length} walkthrough items, and 3/3 PWA checkpoints`);
  console.log("PASS\tdevice check record is structurally complete; this is not beta gate approval");
}
