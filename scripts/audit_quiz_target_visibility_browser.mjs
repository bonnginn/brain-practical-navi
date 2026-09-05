import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import { EXPECTED_QUIZ_CONTENT_SHA256, parseQuizGranularity } from "./audit_quiz_granularity.mjs";
import { EXPECTED_NEUROVASCULAR_QUIZ_SHA256, parseNeurovascularQuizInventory, parseNeurovascularRegistry } from "./audit_neurovascular_quiz.mjs";
import { attachObservers, closeChrome, configurePage, createMeasurementState, evaluate, launchChrome, navigate, resetMeasurementState, waitForRuntimeProbe } from "./measure_browser_performance.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
export const QUIZ_TARGET_VISIBILITY_SCHEMA_VERSION = 2;
export const QUIZ_TARGET_VISIBILITY_TOOL = "scripts/audit_quiz_target_visibility_browser.mjs";
export const QUIZ_TARGET_VISIBILITY_SOURCE_PATH = "app/page.tsx";
export const QUIZ_TARGET_VISIBILITY_THRESHOLD = 24;
export const QUIZ_TARGET_VISIBILITY_MIN_CHANGED_AREA = 16;
export const QUIZ_TARGET_VISIBILITY_MIN_COMPONENT = 9;
export const QUIZ_TARGET_VISIBILITY_MIN_BBOX = 4;
export const QUIZ_TARGET_VISIBILITY_MIN_MEDIAN_RGB_DELTA = 32;
export const QUIZ_TARGET_VISIBILITY_PROVENANCE = Object.freeze({ LIVE: "live-browser", FIXTURE: "unit-fixture" });

export const QUIZ_TARGET_VISIBILITY_VIEWPORTS = Object.freeze([
  Object.freeze({ id:"pc",label:"PC",width:1366,height:768,dpr:1,deviceScaleFactor:1,mobile:false,isMobile:false,touch:false,hasTouch:false,coarse:false,pointer:"fine" }),
  Object.freeze({ id:"tablet-landscape",label:"tablet landscape",width:1024,height:768,dpr:1,deviceScaleFactor:1,mobile:false,isMobile:false,touch:false,hasTouch:false,coarse:false,pointer:"fine" }),
  Object.freeze({ id:"phone",label:"phone",width:390,height:768,dpr:1,deviceScaleFactor:1,mobile:true,isMobile:true,touch:true,hasTouch:true,coarse:true,pointer:"coarse" }),
]);
export const EXPECTED_QUIZ_TARGET_COUNTS = Object.freeze({ section:17,surface:6,neurovascular:22,total:45 });
export const EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT = 135;
export const EXPECTED_QUIZ_TARGET_INVENTORY_SHA256 = "673aa770a5c78fc09e1baa197abfe0a6aec31d33e3ce8f2e40c8f98183550c61";
// Covers target, format, options, and the render namespace/IDs used by this audit.
export const EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256 = "f3c501553d9dd7f298360fa6ee90007d151352d0e48ff64105ddfd46ab2423d7";

const VIEWPORT_KEYS=["id","label","width","height","dpr","deviceScaleFactor","mobile","isMobile","touch","hasTouch","coarse","pointer"];
const IDENTITY_KEYS=["key","target","format","plane","position","view","detail","viewportId"];
const STATE_KEYS=["readyState","stable","loadingCount","overflow","horizontalOverflow","webglFallback","errors","consoleErrors","requestErrors","uiErrors"];
const ARTIFACT_KEYS=["ref","sha256","byteLength","mediaType"];
const PHASES=["H1","C","H2"];
const LABEL_ASSET_PATH="public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz";
const LABEL_ASSET_SHA256="8cc65edf36e1e3a420168bfb663d6440418dd67189808263d11c180c4b403d16";
const LABEL_DIMS=[394,466,378];
const CANVAS_MINIMUMS={pc:{width:240,height:180,area:43200},"tablet-landscape":{width:200,height:160,area:32000},phone:{width:180,height:140,area:25200}};
const LIVE_MESH_MANIFEST=Object.freeze({"pial-left.mesh.gz":"d8112512d0bd930a44d3dc49a63c6a5caeb2342f850ba8f859ad8c26cbb29e5e","pial-right.mesh.gz":"1b41e9d74fed63f6e60aa3f05a7de8a0fad435725e0d3524e0df9ec5f04342dd","segment-cerebellum.mesh":"73b7e030945719a60d296fa793bcfc97322752c68531f376d8eb03b256b1c046","segment-pons-medulla.mesh":"3141cfca126b426af1824998d6b9408cc451cf804e46eeb7e8bf47f5b2afce51","segment-midbrain.mesh":"7ff7671db841c8430747cccd7541b03fbe1b5ce6cd7d8e75bab578a902db1598","overlay-arteries-anterior.mesh":"eb1102991e5616cc9b776f0766bda45e86580f2abdb8cb21cb36608f8ce355eb","overlay-arteries-posterior.mesh":"b4bb74af5491644ca8e8dc697a75ad2cd7d8b0bf9606f7fa202eb1f29f6aa46b","overlay-nerves-anterior.mesh":"b30f480b37b596bdc0711bb3eda08bda09a0da3eee4923c8f5344097a4265df8","overlay-nerves-pontine.mesh":"a6c912f35ad37e5a98f4f482e72df22a74f7dee22fbc1cb05e07aba050d11b1f","overlay-nerves-medullary.mesh":"e4528cc306b535837d049385817c49aada20d25bf37a7a2caf7fa81d18ad157e"});

function isRecord(value){return value!==null&&typeof value==="object"&&!Array.isArray(value)}
function exactKeys(value,keys){return isRecord(value)&&Object.keys(value).sort().join("\0")===[...keys].sort().join("\0")}
function same(left,right){return JSON.stringify(left)===JSON.stringify(right)}
function errorText(error){return error instanceof Error?error.message:String(error)}
function add(errors,message){errors.push(message)}
function sha256(value){return createHash("sha256").update(value).digest("hex")}
export function sha256Bytes(value){return sha256(toBytes(value))}
function toBytes(value){if(value instanceof Uint8Array)return value;if(Buffer.isBuffer(value))return new Uint8Array(value);if(Array.isArray(value)&&value.every(v=>Number.isInteger(v)&&v>=0&&v<=255))return Uint8Array.from(value);throw new TypeError("artifact loader must return bytes")}

function parseIds(text){return [...text.matchAll(/-?\d+/g)].map(match=>Number(match[0]))}
function parseRotationLiteral(text,label){const match=text.match(/rotation:\{([^}]*)\}/)??text.match(/=\{([^}]*)\}/);if(!match)throw new Error(`${label} rotation missing`);const field=name=>Number(match[1].match(new RegExp(`${name}:(-?\\d+(?:\\.\\d+)?)`))?.[1]??(name==="z"?0:NaN));const rotation={x:field("x"),y:field("y"),z:field("z")};if(!Object.values(rotation).every(Number.isFinite))throw new Error(`${label} rotation invalid`);return rotation}
function parseQuizRuntimeTransforms(source){
  const homeLine=source.match(/const homeRotation:Rotation=\{[^\n]+/)?.[0];if(!homeLine)throw new Error("homeRotation missing");const sectionRotation=parseRotationLiteral(homeLine,"section quiz");
  const block=source.match(/const surfaceViews:[\s\S]*?= \{(?<body>[\s\S]*?)\n\};/);if(!block)throw new Error("surfaceViews missing");const views=new Map();for(const line of block.groups.body.split(/\r?\n/)){const view=line.match(/^\s*(lateral|superior|inferior|medial|arteries|cranialNerves):/)?.[1];if(view)views.set(view,parseRotationLiteral(line,view))}return {section:{rotation:sectionRotation,zoom:1,pan:{x:0,y:0}},views};
}
function registryIds(source,startPattern,endPattern,field){
  const start=source.match(startPattern);
  if(!start)return new Map();
  const body=source.slice(start.index+start[0].length).split(endPattern)[0]??"";
  const result=new Map();
  for(const line of body.split(/\r?\n/)){
    const key=line.match(/^\s*([A-Za-z][A-Za-z0-9]*):\s*\{/)?.[1];
    const ids=line.match(new RegExp(`${field}:\\[([^\\]]*)\\]`))?.[1];
    if(key&&ids!==undefined)result.set(key,parseIds(ids));
  }
  return result;
}

function canonicalIdentity(question,format){
  const section=format==="section",model=!section;
  return {target:question.target,format,plane:section?question.plane:null,position:section?question.position:null,view:model?question.view:null,detail:question.detail??(section?question.plane:question.view)};
}

export function parseQuizTargetVisibilityInventory(source){
  if(typeof source!=="string")throw new Error("app source must be text");
  const primary=parseQuizGranularity(source), neuroQuestions=parseNeurovascularQuizInventory(source);
  const runtimeTransforms=parseQuizRuntimeTransforms(source);
  const sectionIds=registryIds(source,/const structures:[^{]+\{/m,/\n\};/,"bigbrainIds");
  const surfaceIds=registryIds(source,/const surfaceRegions:[^{]+\{/m,/\n\};/,"ids");
  const neuroRegistry=parseNeurovascularRegistry(source);
  const make=(question,format)=>{
    const identity=canonicalIdentity(question,format);
    const expectedIds=format==="section"?sectionIds.get(question.target):format==="surface"?surfaceIds.get(question.target):neuroRegistry.get(question.target)?.ids;
    if(!expectedIds?.length)throw new Error(`${format}:${question.target} has no positive render IDs`);
    const namespace=format==="section"?"bigbrain-label":format==="surface"?"surface":"neurovascular";
    const activeLayer=format==="section"?"sectionHighlights":format==="surface"?"surfaceHighlights":question.detail==="arteries"?"vessels":"nerves";
    const rotation=format==="section"?runtimeTransforms.section.rotation:runtimeTransforms.views.get(question.view);if(!rotation)throw new Error(`${format}:${question.target} runtime rotation missing`);
    return {...identity,options:[...question.options],expectedIds:[...expectedIds],namespace,activeLayer,expectedTransform:{rotation:{...rotation},zoom:1,pan:{x:0,y:0}}};
  };
  return [
    ...primary.filter(q=>q.format==="section").map(q=>make(q,"section")),
    ...primary.filter(q=>q.format==="surface").map(q=>make(q,"surface")),
    ...neuroQuestions.map(q=>make(q,"neurovascular")),
  ];
}

function identityInventory(inventory){return inventory.map(({target,format,plane,position,view,detail})=>({target,format,plane,position,view,detail}))}
export function quizTargetInventorySha256(inventory){return sha256(JSON.stringify(identityInventory(inventory)))}
export function quizVisibilityOptionsSha256(inventory){return sha256(JSON.stringify(inventory.map(({target,format,options,expectedIds,namespace,activeLayer,expectedTransform})=>({target,format,options,expectedIds,namespace,activeLayer,expectedTransform}))))}
export const QUIZ_TARGET_VISIBILITY_INVENTORY=Object.freeze(parseQuizTargetVisibilityInventory(fs.readFileSync(path.join(REPOSITORY_ROOT,QUIZ_TARGET_VISIBILITY_SOURCE_PATH),"utf8")));

export function buildQuizTargetVisibilityMatrix({inventory=QUIZ_TARGET_VISIBILITY_INVENTORY,viewports=QUIZ_TARGET_VISIBILITY_VIEWPORTS}={}){
  return viewports.flatMap(viewport=>inventory.map((entry,order)=>({
    key:`${entry.target}:${viewport.id}`,order,target:entry.target,format:entry.format,plane:entry.plane,position:entry.position,view:entry.view,detail:entry.detail,viewportId:viewport.id,viewport:{...viewport},
  })));
}

function expectedEmulationCommands(){return QUIZ_TARGET_VISIBILITY_VIEWPORTS.map(viewport=>({viewportId:viewport.id,deviceMetrics:{method:"Emulation.setDeviceMetricsOverride",params:{width:viewport.width,height:viewport.height,deviceScaleFactor:viewport.deviceScaleFactor,mobile:viewport.mobile}},touch:{method:"Emulation.setTouchEmulationEnabled",params:viewport.touch?{enabled:true,maxTouchPoints:1}:{enabled:false}}}))}
function expectedObservedViewport(viewport){const screen=viewport.mobile?{width:viewport.width,height:viewport.height,availWidth:viewport.width,availHeight:viewport.height}:{width:800,height:600,availWidth:800,availHeight:600};return {innerWidth:viewport.width,innerHeight:viewport.height,clientWidth:viewport.width,clientHeight:viewport.height,visualViewport:{width:viewport.width,height:viewport.height,scale:1},screen,devicePixelRatio:viewport.dpr,maxTouchPoints:viewport.touch?1:10,coarsePointer:viewport.coarse,hover:!viewport.coarse,touchEvent:viewport.touch}}

export function scaleCssPixelRect(rect,dpr){
  if(!exactKeys(rect,["x","y","width","height"])||!Object.values(rect).every(Number.isFinite))throw new Error("CSS rectangle must be finite");
  if(!Number.isFinite(dpr)||dpr<=0)throw new Error("DPR must be positive");
  return {x:Math.round(rect.x*dpr),y:Math.round(rect.y*dpr),width:Math.round(rect.width*dpr),height:Math.round(rect.height*dpr)};
}

function median(values){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);return sorted.length%2?sorted[mid]:(sorted[mid-1]+sorted[mid])/2}
function componentStats(changed,width,height){
  const visited=new Uint8Array(width*height),moves=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];let largest=0,largestBox=null;
  for(let seed=0;seed<changed.length;seed++){
    if(!changed[seed]||visited[seed])continue;const stack=[seed];visited[seed]=1;let count=0,minX=width,minY=height,maxX=-1,maxY=-1;
    while(stack.length){const i=stack.pop(),x=i%width,y=Math.floor(i/width);count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);for(const[dx,dy]of moves){const nx=x+dx,ny=y+dy,index=ny*width+nx;if(nx>=0&&ny>=0&&nx<width&&ny<height&&changed[index]&&!visited[index]){visited[index]=1;stack.push(index)}}}
    if(count>largest){largest=count;largestBox={x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}}
  }
  return {largest,largestBox:largestBox??{x:null,y:null,width:0,height:0}};
}

export function diffRgbaBuffers(before,after,{width,height,threshold=QUIZ_TARGET_VISIBILITY_THRESHOLD}={}){
  const a=toBytes(before),b=toBytes(after);if(!Number.isInteger(width)||width<=0||!Number.isInteger(height)||height<=0)throw new Error("dimensions invalid");
  if(a.length!==width*height*4||b.length!==a.length)throw new Error("RGBA byte length mismatch");
  const changed=new Uint8Array(width*height),deltas=[];let changedArea=0,maxChannelDelta=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let p=0;p<width*height;p++){const o=p*4,dr=Math.abs(a[o]-b[o]),dg=Math.abs(a[o+1]-b[o+1]),db=Math.abs(a[o+2]-b[o+2]),m=Math.max(dr,dg,db);maxChannelDelta=Math.max(maxChannelDelta,m);if(m<threshold)continue;changed[p]=1;changedArea++;const x=p%width,y=Math.floor(p/width);minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);deltas.push(Math.sqrt(dr*dr+dg*dg+db*db))}
  const component=componentStats(changed,width,height);
  return {width,height,threshold,changedArea,largest8Connected:component.largest,bbox:changedArea?{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1}:{x:null,y:null,width:0,height:0},largestComponentBbox:component.largestBox,medianRgbEuclideanDelta:median(deltas),maxChannelDelta};
}

function expectedIdentity(item){return {key:item.key,target:item.target,format:item.format,plane:item.plane,position:item.position,view:item.view,detail:item.detail,viewportId:item.viewportId}}
function expectedUrl(baseUrl,item,highlight){const url=new URL(baseUrl);url.search="";url.hash="";url.searchParams.set("quizVisibilityAudit","1");url.searchParams.set("target",item.target);url.searchParams.set("highlight",highlight);url.hash="workspace/quiz";return url.href}
function expectedQuestion(item,entry){return {target:item.target,format:item.format,plane:item.plane,position:item.position,view:item.view,detail:item.detail,queueLength:1,queueIndex:0,inventorySha256:EXPECTED_QUIZ_TARGET_INVENTORY_SHA256,options:[...entry.options]}}
function expectedDependency(){return {granularityAudit:{tool:"scripts/audit_quiz_granularity.mjs",ok:true,contentSha256:EXPECTED_QUIZ_CONTENT_SHA256},neurovascularAudit:{tool:"scripts/audit_neurovascular_quiz.mjs",ok:true,contentSha256:EXPECTED_NEUROVASCULAR_QUIZ_SHA256},runtimeReachability:{ok:true,targetCount:45,optionsPerQuestion:4,targetQueryRequired:true,optionsSha256:EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256}}}
function validState(){return {readyState:"complete",stable:true,loadingCount:0,overflow:false,horizontalOverflow:false,webglFallback:false,errors:[],consoleErrors:[],requestErrors:[],uiErrors:[]}}
function artifactDescriptor(ref,bytes,mediaType){return {ref,sha256:sha256Bytes(bytes),byteLength:bytes.length,mediaType}}
function maskStats(bytes,width,height){const positive=[];for(let i=0;i<bytes.length;i++)if(bytes[i]===1)positive.push(i);const xs=positive.map(i=>i%width),ys=positive.map(i=>Math.floor(i/width));return {positiveCount:positive.length,bbox:positive.length?{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs)+1,height:Math.max(...ys)-Math.min(...ys)+1}:{x:null,y:null,width:0,height:0}}}
const liveMeshToleranceHashes=new Set;
function stableMeshInterior(mask,width,height){const core=new Uint8Array(width*height);for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){let stable=true;for(let dy=-1;dy<=1&&stable;dy++)for(let dx=-1;dx<=1;dx++)if(!mask[(y+dy)*width+x+dx]){stable=false;break}if(stable)core[y*width+x]=1}return core}
function sectionCoverage(mask,on,off,width,height){if(liveMeshToleranceHashes.has(sha256Bytes(mask)))return meshVisibilityCoverage(stableMeshInterior(mask,width,height),mask,on,off,width,height);const changed=new Uint8Array(width*height);for(let p=0;p<changed.length;p++){const o=p*4;changed[p]=Math.max(Math.abs(on[o]-off[o]),Math.abs(on[o+1]-off[o+1]),Math.abs(on[o+2]-off[o+2]))>=QUIZ_TARGET_VISIBILITY_THRESHOLD?1:0}let inside=0,outside=0,maskPositive=0;for(let i=0;i<changed.length;i++){if(mask[i])maskPositive++;if(changed[i]&&(mask[i]?inside++:outside++));}return {maskPositive,changedInside:inside,changedOutside:outside,coverageRatio:maskPositive?inside/maskPositive:0,outsideRatio:inside+outside?outside/(inside+outside):0}}
function meshVisibilityCoverage(core,tolerance,on,off,width,height){let maskPositive=0,changedInside=0,changedOutside=0,changedTotal=0;for(let p=0;p<width*height;p++){const o=p*4,changed=Math.max(Math.abs(on[o]-off[o]),Math.abs(on[o+1]-off[o+1]),Math.abs(on[o+2]-off[o+2]))>=QUIZ_TARGET_VISIBILITY_THRESHOLD;if(core[p])maskPositive++;if(changed){changedTotal++;if(core[p])changedInside++;if(!tolerance[p])changedOutside++}}return {maskPositive,changedInside,changedOutside,coverageRatio:maskPositive?changedInside/maskPositive:0,outsideRatio:changedTotal?changedOutside/changedTotal:0}}

const MESH_MASK_BUILDER="AtlasVolumeCanvas.visible-highlight-depth-v3";
function expectedMeshFiles(entry){if(entry.format==="surface")return entry.view==="medial"?["pial-left.mesh.gz"]:["pial-left.mesh.gz","pial-right.mesh.gz","segment-cerebellum.mesh","segment-pons-medulla.mesh","segment-midbrain.mesh"];return entry.activeLayer==="vessels"?["overlay-arteries-anterior.mesh","overlay-arteries-posterior.mesh"]:["overlay-nerves-anterior.mesh","overlay-nerves-pontine.mesh","overlay-nerves-medullary.mesh"]}
function expectedMeshSources(entry,sourceLoader,mode){return expectedMeshFiles(entry).map(file=>{const assetPath=`public/atlas/${file}`,digest=sha256Bytes(sourceLoader(assetPath));if(mode==="live"&&digest!==LIVE_MESH_MANIFEST[file])throw new Error(`${file} differs from frozen live mesh manifest`);return {path:assetPath,sha256:digest}})}
function expectedMeshProvenance(entry,capture,sourceLoader,mode){return {builder:MESH_MASK_BUILDER,namespace:entry.namespace,activeLayer:entry.activeLayer,sourceMeshes:expectedMeshSources(entry,sourceLoader,mode),selectedIds:[...entry.expectedIds],hemisphere:entry.view==="medial"?"left":"both",transform:structuredClone(capture.transform),projection:{canvasWidth:capture.canvas.intrinsicWidth,canvasHeight:capture.canvas.intrinsicHeight,scale:entry.format==="neurovascular"?.88:1,clipPolicy:"canvas-bounds",cullPolicy:entry.format==="surface"?"back-face-depth-less":"disabled-depth-lequal-alpha-composite-order"}}}
export function compositeProjectionSelection(current,highlightAlpha,namespace){if(!["surface","neurovascular"].includes(namespace)||!(current===0||current===1)||!Number.isFinite(highlightAlpha))throw new TypeError("projection selection inputs invalid");return highlightAlpha>.5?1:namespace==="surface"?0:current}
const decodedMeshCache=new Map;
function decodeBnm3(bytes){const key=sha256Bytes(bytes),cached=decodedMeshCache.get(key);if(cached)return cached;let raw=Buffer.from(bytes);if(raw[0]===0x1f&&raw[1]===0x8b)raw=gunzipSync(raw);const magic=raw.subarray(0,4).toString("ascii"),stride=magic==="BNM3"?32:magic==="BNM2"?28:magic==="BNM1"?24:0;if(!stride)throw new Error("mesh asset must be BNM1/2/3");const nv=raw.readUInt32LE(4),declared=raw.readUInt32LE(8),faceOffset=12+nv*stride;if(faceOffset>raw.length||(raw.length-faceOffset)%12)throw new Error("invalid BNM mesh length");const nf=(raw.length-faceOffset)/12;if(declared!==nf&&declared!==nf*3)throw new Error("invalid BNM face count");const result={vertices:new Float32Array(raw.buffer,raw.byteOffset+12,nv*3),regions:magic==="BNM3"?new Float32Array(raw.buffer,raw.byteOffset+12+nv*28,nv):new Float32Array(nv),faces:new Uint32Array(raw.buffer,raw.byteOffset+faceOffset,nf*3)};decodedMeshCache.set(key,result);return result}
function rebuildExpectedMeshMask(entry,capture,sourceLoader,mode="unit-fixture",includeCore=false){
  if(mode==="unit-fixture"){for(const file of expectedMeshFiles(entry))decodeBnm3(sourceLoader(`public/atlas/${file}`));const width=capture.canvas.intrinsicWidth,height=capture.canvas.intrinsicHeight,mask=new Uint8Array(width*height),seed=entry.target.split("").reduce((sum,char)=>sum+char.charCodeAt(0),0),ox=2+seed%Math.max(1,width-8),oy=2+seed%Math.max(1,height-8);for(let y=oy;y<Math.min(height,oy+4);y++)for(let x=ox;x<Math.min(width,ox+4);x++)mask[y*width+x]=1;return includeCore?{core:mask,tolerance:mask}:mask}
  const width=capture.canvas.intrinsicWidth,height=capture.canvas.intrinsicHeight,mask=new Uint8Array(width*height),depth=new Float64Array(width*height);depth.fill(Infinity);const ids=new Set(entry.expectedIds),rot=capture.transform.rotation,ax=rot.x*Math.PI/180,ay=rot.y*Math.PI/180,az=rot.z*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az),m=[cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy],scale=capture.transform.zoom*(entry.format==="neurovascular"?.88:1),edge=(a,b,x,y)=>(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
  for(const file of expectedMeshFiles(entry)){const mesh=decodeBnm3(sourceLoader(`public/atlas/${file}`)),selected=new Uint8Array(mesh.regions.length),project=index=>{const o=index*3,q0=mesh.vertices[o+2],q1=mesh.vertices[o]+16,q2=mesh.vertices[o+1],rx=m[0]*q0+m[3]*q1+m[6]*q2,ry=m[1]*q0+m[4]*q1+m[7]*q2,rz=m[2]*q0+m[5]*q1+m[8]*q2;return [(rx/96*scale*.5+.5)*width,(.5-ry/96*scale*.5)*height,rz/138*scale]};for(let i=0;i<selected.length;i++)if(ids.has(Math.round(mesh.regions[i])))selected[i]=1;for(let f=0;f<mesh.faces.length;f+=3){const ia=mesh.faces[f],ib=mesh.faces[f+1],ic=mesh.faces[f+2],a=project(ia),b=project(ib),c=project(ic),area=edge(a,b,c[0],c[1]);if(Math.abs(area)<1e-6||(entry.format==="surface"&&area<=0))continue;const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const e0=edge(a,b,x+.5,y+.5),e1=edge(b,c,x+.5,y+.5),e2=edge(c,a,x+.5,y+.5),inside=(e0>=0&&e1>=0&&e2>=0)||(e0<=0&&e1<=0&&e2<=0);if(!inside)continue;const z=(a[2]*e1+b[2]*e2+c[2]*e0)/area,index=y*width+x,passes=entry.format==="surface"?z<depth[index]:z<=depth[index];if(!passes)continue;depth[index]=z;const highlightAlpha=(selected[ia]*e1+selected[ib]*e2+selected[ic]*e0)/area;mask[index]=compositeProjectionSelection(mask[index],highlightAlpha,entry.format==="surface"?"surface":"neurovascular")}}}const conservative=mask.slice();for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height)conservative[ny*width+nx]=1}return includeCore?{core:mask,tolerance:conservative}:conservative
}

let labelVolumeCache=null;
function loadPinnedLabelVolume(){
  if(labelVolumeCache)return labelVolumeCache;const compressed=fs.readFileSync(path.join(REPOSITORY_ROOT,LABEL_ASSET_PATH));if(sha256Bytes(compressed)!==LABEL_ASSET_SHA256)throw new Error("pinned BBS1 label asset SHA mismatch");const raw=gunzipSync(compressed);if(raw.subarray(0,4).toString("ascii")!=="BBS1")throw new Error("pinned label asset header mismatch");const dims=[raw.readUInt16LE(4),raw.readUInt16LE(6),raw.readUInt16LE(8)];if(!same(dims,LABEL_DIMS))throw new Error("pinned label dimensions mismatch");labelVolumeCache={dims,labels:new Uint8Array(raw.buffer,raw.byteOffset+10,dims[0]*dims[1]*dims[2])};return labelVolumeCache;
}
function sectionSize(dims,plane){return plane==="sagittal"?[dims[1],dims[2]]:plane==="horizontal"?[dims[0],dims[1]]:[dims[0],dims[2]]}
function sectionVoxel(a,b,dims,plane,position){const[dx,dy,dz]=dims;if(plane==="horizontal")return[a,dy-1-b,Math.round((1-position/100)*(dz-1))];if(plane==="sagittal")return[Math.round(position/100*(dx-1)),a,dz-1-b];return[a,Math.round(position/100*(dy-1)),dz-1-b]}
function expectedMaskProvenance(entry,capture){return {builder:"bbs1-screen-mask-v2",labelAsset:{path:LABEL_ASSET_PATH,sha256:LABEL_ASSET_SHA256,dims:[...LABEL_DIMS]},plane:entry.plane,position:entry.position,sourceIds:[...entry.expectedIds],viewTransform:{algorithm:"AtlasVolumeCanvas.client-box-viewTransform-v2",cssWidth:capture.canvas.intrinsicWidth/capture.canvas.dpr,cssHeight:capture.canvas.intrinsicHeight/capture.canvas.dpr,dpr:capture.canvas.dpr,zoom:capture.transform.zoom,pan:{...capture.transform.pan}}}}
function rebuildExpectedSectionMask(entry,capture,mode){
  const width=capture.canvas.intrinsicWidth,height=capture.canvas.intrinsicHeight;
  if(mode==="unit-fixture"){const mask=new Uint8Array(width*height);for(let y=2;y<Math.min(6,height);y++)for(let x=2;x<Math.min(6,width);x++)mask[y*width+x]=1;return mask}
  const volume=loadPinnedLabelVolume(),ids=new Set(entry.expectedIds),[sw,sh]=sectionSize(volume.dims,entry.plane),cssWidth=width/capture.canvas.dpr,cssHeight=height/capture.canvas.dpr,fit=Math.min((cssWidth-10)/sw,(cssHeight-10)/sh),scale=fit*capture.transform.zoom,ox=(cssWidth-sw*scale)/2+capture.transform.pan.x,oy=(cssHeight-sh*scale)/2+capture.transform.pan.y,mask=new Uint8Array(width*height);
  if(scale<=0)return mask;for(let py=0;py<height;py++)for(let px=0;px<width;px++){const cssX=(px+.5)/capture.canvas.dpr,cssY=(py+.5)/capture.canvas.dpr,a=Math.floor((cssX-ox)/scale),b=Math.floor((cssY-oy)/scale);if(a<0||b<0||a>=sw||b>=sh)continue;const[x,y,z]=sectionVoxel(a,b,volume.dims,entry.plane,entry.position),index=x+volume.dims[0]*(y+volume.dims[1]*z);if(ids.has(volume.labels[index]))mask[py*width+px]=1}return mask;
}

function loadArtifact(descriptor,loader,errors,prefix){
  const safeRef=typeof descriptor?.ref==="string"&&/^(?:artifacts|masks)\/[A-Za-z0-9._/-]+$/.test(descriptor.ref)&&path.posix.normalize(descriptor.ref)===descriptor.ref&&!descriptor.ref.split("/").some(part=>part===".."||part===".");
  if(!exactKeys(descriptor,ARTIFACT_KEYS)||!safeRef||!Number.isInteger(descriptor.byteLength)||descriptor.byteLength<=0||typeof descriptor.sha256!=="string"||!/^[0-9a-f]{64}$/.test(descriptor.sha256)) {add(errors,`${prefix}: artifact descriptor invalid`);return null}
  if(typeof loader!=="function"){add(errors,`${prefix}: rawArtifactLoader is required`);return null}
  try{const bytes=toBytes(loader(descriptor.ref));if(bytes.length!==descriptor.byteLength)add(errors,`${prefix}: artifact byte length mismatch`);if(sha256Bytes(bytes)!==descriptor.sha256)add(errors,`${prefix}: artifact SHA mismatch`);return bytes}catch(error){add(errors,`${prefix}: artifact load failed: ${errorText(error)}`);return null}
}

function validateState(state,errors,prefix){
  if(!exactKeys(state,STATE_KEYS)){add(errors,`${prefix}: probe keys invalid`);return}
  if(state.readyState!=="complete"||state.stable!==true||state.loadingCount!==0)add(errors,`${prefix}: not ready/stable or loader present`);
  if(state.overflow!==false||state.horizontalOverflow!==false)add(errors,`${prefix}: overflow present`);
  if(state.webglFallback!==false)add(errors,`${prefix}: fallback present`);
  for(const key of ["errors","consoleErrors","requestErrors","uiErrors"])if(!Array.isArray(state[key])||state[key].length)add(errors,`${prefix}: ${key} non-empty`);
}

function validateCapture(capture,{phase,item,entry,baseUrl,loader,mode,sourceLoader},errors,prefix){
  const keys=["phase","url","question","canvas","viewport","transform","probe","visibility"];
  if(!exactKeys(capture,keys)){add(errors,`${prefix}: capture keys invalid`);return null}
  if(capture.phase!==phase)add(errors,`${prefix}: phase mismatch`);
  const highlight=phase==="C"?"off":"on";
  if(capture.url!==expectedUrl(baseUrl,item,highlight))add(errors,`${prefix}: URL/query mismatch`);
  const normalizedQuestion=isRecord(capture.question)?{...capture.question,detail:capture.question.detail??entry.detail}:capture.question;
  if(!same(normalizedQuestion,expectedQuestion(item,entry)))add(errors,`${prefix}: DOM question identity mismatch`);
  if(!exactKeys(capture.viewport,["commanded","observed"])||!same(capture.viewport.commanded,item.viewport)||!same(capture.viewport.observed,expectedObservedViewport(item.viewport)))add(errors,`${prefix}: commanded/observed viewport mismatch`);
  if(!exactKeys(capture.transform,["rotation","zoom","pan"])||!exactKeys(capture.transform.rotation,["x","y","z"])||!Object.values(capture.transform.rotation).every(Number.isFinite)||!Number.isFinite(capture.transform.zoom)||capture.transform.zoom<=0||!exactKeys(capture.transform.pan,["x","y"])||!Object.values(capture.transform.pan).every(Number.isFinite))add(errors,`${prefix}: transform invalid`);
  if(!same(capture.transform,entry.expectedTransform))add(errors,`${prefix}: runtime quiz default transform mismatch`);
  validateState(capture.probe,errors,`${prefix}.probe`);
  const canvas=capture.canvas;
  if(!exactKeys(canvas,["selector","canvasCount","artifact","intrinsicWidth","intrinsicHeight","cssRect","dpr"])){add(errors,`${prefix}: canvas schema invalid`);return null}
  if(canvas.selector!==".quizImageStage > canvas"||canvas.canvasCount!==1)add(errors,`${prefix}: canvas selector/count mismatch`);
  if(!Number.isInteger(canvas.intrinsicWidth)||canvas.intrinsicWidth<=0||!Number.isInteger(canvas.intrinsicHeight)||canvas.intrinsicHeight<=0||canvas.dpr!==item.viewport.dpr)add(errors,`${prefix}: canvas intrinsic/DPR invalid`);
  const rect=canvas.cssRect;
  const rectValid=exactKeys(rect,["x","y","width","height"])&&Object.values(rect).every(Number.isFinite)&&rect.x>=0&&rect.y>=0&&rect.width>0&&rect.height>0&&rect.x+rect.width<=item.viewport.width&&rect.y+rect.height<=item.viewport.height;
  if(!rectValid)add(errors,`${prefix}: CSS rect not positive or inside viewport`);
  if(rectValid&&(canvas.intrinsicWidth!==Math.round(rect.width*canvas.dpr)||canvas.intrinsicHeight!==Math.round(rect.height*canvas.dpr)))add(errors,`${prefix}: intrinsic canvas does not exactly match rounded CSS×DPR`);
  if(mode==="live"&&rectValid){const minimum=CANVAS_MINIMUMS[item.viewportId];if(rect.width<minimum.width||rect.height<minimum.height||rect.width*rect.height<minimum.area)add(errors,`${prefix}: live canvas CSS dimensions/area below viewport minimum`)}
  const expectedCanvasRef=`artifacts/${item.viewportId}/${item.target}/${phase}.rgba`;if(canvas.artifact?.ref!==expectedCanvasRef)add(errors,`${prefix}: canvas artifact ref is not exact`);
  const rgba=loadArtifact(canvas.artifact,loader,errors,`${prefix}.canvas`);
  if(canvas.artifact?.mediaType!=="application/x-rgba8")add(errors,`${prefix}: canvas media type mismatch`);
  if(rgba&&rgba.length!==canvas.intrinsicWidth*canvas.intrinsicHeight*4)add(errors,`${prefix}: raw RGBA length does not match intrinsic canvas`);
  if(entry.format==="section"){
    const visibility=capture.visibility;
    if(!exactKeys(visibility,["kind","namespace","activeLayer","targetIds","provenance","mask"])||visibility.kind!=="section-mask"||visibility.namespace!==entry.namespace||visibility.activeLayer!==entry.activeLayer||!same(visibility.targetIds,entry.expectedIds)||!same(visibility.provenance,expectedMaskProvenance(entry,capture))){add(errors,`${prefix}: section namespace/IDs/provenance mismatch`);return {rgba,mask:null}}
    const mask=visibility.mask;
    if(!exactKeys(mask,["artifact","width","height","positiveCount","bbox"])||mask.width!==canvas.intrinsicWidth||mask.height!==canvas.intrinsicHeight){add(errors,`${prefix}: mask schema/dimensions invalid`);return {rgba,mask:null}}
    const maskBytes=loadArtifact(mask.artifact,loader,errors,`${prefix}.mask`);
    if(mask.artifact?.ref!==`masks/${item.viewportId}/${item.target}.bin`)add(errors,`${prefix}: mask artifact ref is not exact`);
    if(mask.artifact?.mediaType!=="application/x-binary-mask")add(errors,`${prefix}: mask media type mismatch`);
    if(maskBytes){if(maskBytes.length!==mask.width*mask.height||![...maskBytes].every(v=>v===0||v===1))add(errors,`${prefix}: mask bytes invalid`);const calculated=maskStats(maskBytes,mask.width,mask.height);if(calculated.positiveCount<=0||calculated.positiveCount!==mask.positiveCount||!same(calculated.bbox,mask.bbox))add(errors,`${prefix}: mask positive count/bbox fabricated`);try{const expectedMask=rebuildExpectedSectionMask(entry,capture,mode);if(!Buffer.from(maskBytes).equals(Buffer.from(expectedMask)))add(errors,`${prefix}: mask differs from independently rebuilt label projection`)}catch(error){add(errors,`${prefix}: mask rebuild failed: ${errorText(error)}`)}}
    return {rgba,mask:maskBytes};
  }
  const visibility=capture.visibility,expectedLayer=entry.activeLayer,on=phase!=="C";
  if(!exactKeys(visibility,["kind","namespace","activeLayer","selectedIds","selectedVertexCount","incidentTriangleCount","projectionMask"])||visibility.kind!=="mesh"||visibility.namespace!==entry.namespace||visibility.activeLayer!==expectedLayer)add(errors,`${prefix}: mesh namespace/layer mismatch`);
  if(on){if(!same(visibility.selectedIds,entry.expectedIds)||!Number.isInteger(visibility.selectedVertexCount)||visibility.selectedVertexCount<=0||!Number.isInteger(visibility.incidentTriangleCount)||visibility.incidentTriangleCount<=0)add(errors,`${prefix}: highlighted mesh IDs/counts invalid`)}
  else if(!same(visibility.selectedIds,[])||visibility.selectedVertexCount!==0||visibility.incidentTriangleCount!==0)add(errors,`${prefix}: control mesh evidence must be zero`);
  const projection=visibility.projectionMask;let coreMask=null;
  let expectedProvenance=null;try{expectedProvenance=expectedMeshProvenance(entry,capture,sourceLoader,mode)}catch(error){add(errors,`${prefix}: mesh source asset read failed: ${errorText(error)}`)}
  if(!exactKeys(projection,["artifact","width","height","positiveCount","bbox","provenance"])||projection.width!==canvas.intrinsicWidth||projection.height!==canvas.intrinsicHeight||!same(projection.provenance,expectedProvenance)){add(errors,`${prefix}: mesh projection mask provenance/schema invalid`);return {rgba,mask:null}}
  const maskBytes=loadArtifact(projection.artifact,loader,errors,`${prefix}.meshMask`);
  if(projection.artifact?.ref!==`masks/${item.viewportId}/${item.target}.bin`)add(errors,`${prefix}: mesh projection mask artifact ref is not exact`);
  if(projection.artifact?.mediaType!=="application/x-binary-mask")add(errors,`${prefix}: mesh projection mask media type mismatch`);
  if(maskBytes){const calculated=maskStats(maskBytes,projection.width,projection.height);if(maskBytes.length!==projection.width*projection.height||![...maskBytes].every(v=>v===0||v===1)||calculated.positiveCount<=0||calculated.positiveCount!==projection.positiveCount||!same(calculated.bbox,projection.bbox))add(errors,`${prefix}: mesh projection mask bytes/summary invalid`);try{const rebuilt=rebuildExpectedMeshMask(entry,capture,sourceLoader,mode,true);coreMask=mode==="unit-fixture"?maskBytes:stableMeshInterior(maskBytes,projection.width,projection.height);if(!Buffer.from(maskBytes).equals(Buffer.from(rebuilt.tolerance)))add(errors,`${prefix}: mesh projection mask differs from independently rebuilt BNM3 projection`)}catch(error){add(errors,`${prefix}: mesh projection rebuild failed: ${errorText(error)}`)}}
  return {rgba,mask:maskBytes,core:coreMask};
}

function metricsPass(metrics,errors,prefix){if(metrics.maxChannelDelta<24)add(errors,`${prefix}: max channel below 24`);if(metrics.changedArea<16)add(errors,`${prefix}: changed area below 16`);if(metrics.largest8Connected<9)add(errors,`${prefix}: largest component below 9`);if(metrics.bbox.width<4||metrics.bbox.height<4)add(errors,`${prefix}: bbox below 4x4`);if(metrics.medianRgbEuclideanDelta<32)add(errors,`${prefix}: median RGB delta below 32`)}

function validateResult(result,item,entry,context,errors,index){
  const prefix=`results[${index}]`,identity=expectedIdentity(item);
  if(!exactKeys(result,["key","identity","captures","comparisons"]))return add(errors,`${prefix}: result keys invalid`);
  if(result.key!==item.key||!same(result.identity,identity))add(errors,`${prefix}: identity mismatch`);
  if(!exactKeys(result.captures,PHASES))return add(errors,`${prefix}: H1/C/H2 captures missing`);
  const loaded={};for(const phase of PHASES)loaded[phase]=validateCapture(result.captures[phase],{phase,item,entry,baseUrl:context.baseUrl,loader:context.loader,mode:context.mode,sourceLoader:context.sourceLoader},errors,`${prefix}.${phase}`);
  if(!exactKeys(result.comparisons,["h1VsControl","controlVsH2","h1H2Exact","sectionCoverage","meshCoverage"]))return add(errors,`${prefix}: comparisons schema invalid`);
  const captureGeometry=phase=>{const capture=result.captures[phase];return {intrinsicWidth:capture?.canvas?.intrinsicWidth,intrinsicHeight:capture?.canvas?.intrinsicHeight,cssRect:capture?.canvas?.cssRect,dpr:capture?.canvas?.dpr,viewport:capture?.viewport}};
  if(!same(captureGeometry("H1"),captureGeometry("C"))||!same(captureGeometry("H1"),captureGeometry("H2")))add(errors,`${prefix}: canvas/viewport geometry changed across captures`);
  if(entry.format==="section"){
    const hashes=PHASES.map(phase=>result.captures[phase]?.visibility?.mask?.artifact?.sha256);
    if(new Set(hashes).size!==1)add(errors,`${prefix}: section mask changed across captures`);
  }else {const hashes=PHASES.map(phase=>result.captures[phase]?.visibility?.projectionMask?.artifact?.sha256);if(new Set(hashes).size!==1)add(errors,`${prefix}: mesh projection mask changed across captures`);if(!same(result.captures.H1?.visibility,result.captures.H2?.visibility))add(errors,`${prefix}: H1/H2 mesh evidence differs`)}
  const h1=loaded.H1?.rgba,c=loaded.C?.rgba,h2=loaded.H2?.rgba;
  if(h1&&c&&h2){
    let first,second;try{first=diffRgbaBuffers(h1,c,{width:result.captures.H1.canvas.intrinsicWidth,height:result.captures.H1.canvas.intrinsicHeight});second=diffRgbaBuffers(c,h2,{width:result.captures.C.canvas.intrinsicWidth,height:result.captures.C.canvas.intrinsicHeight})}catch(error){add(errors,`${prefix}: diff failed: ${errorText(error)}`);return}
    if(!same(first,result.comparisons.h1VsControl)||!same(second,result.comparisons.controlVsH2))add(errors,`${prefix}: fabricated diff metrics`);metricsPass(first,errors,`${prefix}.h1VsControl`);metricsPass(second,errors,`${prefix}.controlVsH2`);
    const exact=sha256Bytes(h1)===sha256Bytes(h2)&&Buffer.from(h1).equals(Buffer.from(h2));if(result.comparisons.h1H2Exact!==exact||!exact)add(errors,`${prefix}: H1/H2 not byte/SHA exact`);
    if(!same(result.captures.H1.transform,result.captures.C.transform)||!same(result.captures.H1.transform,result.captures.H2.transform))add(errors,`${prefix}: rotation/zoom changed across captures`);
    if(entry.format==="section"&&loaded.H1.mask){const coverage=sectionCoverage(loaded.H1.mask,h1,c,result.captures.H1.canvas.intrinsicWidth,result.captures.H1.canvas.intrinsicHeight);if(!same(result.comparisons.sectionCoverage,coverage)||coverage.changedInside<=0||coverage.coverageRatio<.85||coverage.changedInside/(coverage.changedInside+coverage.changedOutside)<.95||coverage.outsideRatio>.05)add(errors,`${prefix}: section mask coverage/outside fabricated or below precision thresholds`)}
    else if(result.comparisons.sectionCoverage!==null)add(errors,`${prefix}: non-section coverage must be null`);
    if(entry.format!=="section"&&loaded.H1.mask&&loaded.H1.core){const coverage=meshVisibilityCoverage(loaded.H1.core,loaded.H1.mask,h1,c,result.captures.H1.canvas.intrinsicWidth,result.captures.H1.canvas.intrinsicHeight),precision=coverage.changedInside/(coverage.changedInside+coverage.changedOutside);if(!same(result.comparisons.meshCoverage,coverage)||coverage.changedInside<=0||coverage.coverageRatio<.5||precision<.95||coverage.outsideRatio>.05)add(errors,`${prefix}: mesh projection coverage/outside fabricated or below precision thresholds`)}
    else if(result.comparisons.meshCoverage!==null)add(errors,`${prefix}: section mesh coverage must be null`);
  }
}

function validateQuizTargetVisibilityReportCore(report,{mode,rawArtifactLoader,sourceAssetLoader,preErrors=[]}){
  const errors=[...preErrors];
  if(!isRecord(report))return {passed:false,ok:false,errors:["report must be object"],summary:{expectedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,observedCount:0,uniqueCount:0,passedCount:0,allPassed:false}};
  if(!["live","unit-fixture"].includes(mode))add(errors,"validator mode invalid");
  const expectedProvenance=mode==="unit-fixture"?QUIZ_TARGET_VISIBILITY_PROVENANCE.FIXTURE:QUIZ_TARGET_VISIBILITY_PROVENANCE.LIVE;
  const reportKeys=["schemaVersion","tool","provenance","status","generatedAt","startedAt","completedAt","baseUrl","environment","dependency","source","inventory","viewports","emulationCommands","matrix","results","summary",...(mode==="live"?["run","artifactRoot","sourceRootIdentity"]:[])];
  const persistedValidation=Object.hasOwn(report,"validation");
  if(!exactKeys(report,persistedValidation?[...reportKeys,"validation"]:reportKeys))add(errors,"report keys invalid");
  if(report.schemaVersion!==2||report.tool!==QUIZ_TARGET_VISIBILITY_TOOL||report.provenance!==expectedProvenance||report.status!=="complete")add(errors,"schema/tool/provenance/status mismatch");
  for(const field of ["startedAt","completedAt","generatedAt"])if(typeof report[field]!=="string"||!Number.isFinite(Date.parse(report[field])))add(errors,`${field} invalid`);
  if(Number.isFinite(Date.parse(report.startedAt))&&Number.isFinite(Date.parse(report.completedAt))&&Date.parse(report.startedAt)>=Date.parse(report.completedAt))add(errors,"timestamps out of order or not strictly increasing");
  if(Number.isFinite(Date.parse(report.completedAt))&&Number.isFinite(Date.parse(report.generatedAt))&&Date.parse(report.completedAt)>Date.parse(report.generatedAt))add(errors,"timestamps out of order");
  let baseUrl=null;try{baseUrl=new URL(report.baseUrl);if(baseUrl.protocol!=="http:"||!["127.0.0.1","localhost","::1"].includes(baseUrl.hostname)||baseUrl.search||baseUrl.hash)add(errors,"baseUrl must be clean loopback HTTP")}catch{add(errors,"baseUrl invalid")}
  const env=report.environment;
  if(!exactKeys(env,["os","nodeVersion","browser"])||!exactKeys(env?.os,["platform","release"])||env.os.platform!=="win32"||typeof env.os.release!=="string"||!env.os.release||!/^v24\./.test(env.nodeVersion)||!exactKeys(env?.browser,["product","userAgent","protocolVersion"])||!/(?:Headless)?Chrome\/152\./.test(env.browser.product)||!/HeadlessChrome\/152\./.test(env.browser.userAgent)||typeof env.browser.protocolVersion!=="string"||!env.browser.protocolVersion)add(errors,"environment must be Windows/Node24/Chrome152 with HeadlessChrome152 user agent exact schema");
  if(!same(report.dependency,expectedDependency()))add(errors,"quiz dependency/reachability mismatch");
  if(mode==="live"){
    const run=report.run,session=run?.browserSession,version=run?.browserVersionEvidence,executable=run?.executableEvidence;
    let executableValid=false;try{const stat=fs.lstatSync(executable?.path);executableValid=stat.isFile()&&!stat.isSymbolicLink()&&comparablePath(fs.realpathSync.native(executable.path))===comparablePath(executable.path)}catch{}
    const sessionValues=[session?.browserTargetId,session?.pageTargetId,session?.pageSessionId];
    if(!exactKeys(run,["runId","browserSession","browserVersionEvidence","executableEvidence"])||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(run?.runId??"")||!exactKeys(session,["browserTargetId","pageTargetId","pageSessionId"])||!sessionValues.every(value=>typeof value==="string"&&/^[A-Za-z0-9._:-]{8,}$/.test(value))||new Set(sessionValues).size!==3||!exactKeys(version,["method","product","userAgent","protocolVersion","jsVersion","revision"])||version?.method!=="Browser.getVersion"||version?.product!==env?.browser?.product||version?.userAgent!==env?.browser?.userAgent||version?.protocolVersion!==env?.browser?.protocolVersion||![version?.jsVersion,version?.revision].every(value=>typeof value==="string"&&value.length>0)||!exactKeys(executable,["source","path"])||executable?.source!=="launch"||typeof executable?.path!=="string"||!path.isAbsolute(executable.path)||!/(?:chrome|chromium)(?:\.exe)?$/i.test(path.basename(executable.path))||!executableValid)add(errors,"live CDP run/session/version/executable evidence invalid");
  }
  if(!exactKeys(report.source,["path","inventorySha256","optionsSha256"])||report.source.path!==QUIZ_TARGET_VISIBILITY_SOURCE_PATH||report.source.inventorySha256!==EXPECTED_QUIZ_TARGET_INVENTORY_SHA256||report.source.optionsSha256!==EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256)add(errors,"source metadata mismatch");
  const inventory=QUIZ_TARGET_VISIBILITY_INVENTORY;
  if(!same(report.inventory,inventory)||quizTargetInventorySha256(inventory)!==EXPECTED_QUIZ_TARGET_INVENTORY_SHA256||quizVisibilityOptionsSha256(inventory)!==EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256)add(errors,"frozen inventory/options mismatch");
  if(!same(report.viewports,QUIZ_TARGET_VISIBILITY_VIEWPORTS))add(errors,"viewport metadata mismatch");
  if(!same(report.emulationCommands,expectedEmulationCommands()))add(errors,"CDP emulation command/params evidence mismatch");
  const matrix=buildQuizTargetVisibilityMatrix();if(!same(report.matrix,matrix))add(errors,"matrix fabricated, incomplete, or reordered");
  const rows=Array.isArray(report.results)?report.results:[];if(rows.length!==EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT)add(errors,`results must contain exactly ${EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT} rows`);const keys=new Set(rows.map(row=>row?.key));if(keys.size!==rows.length)add(errors,"duplicate result keys");
  const expectedImageRefCount=EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT*PHASES.length;const imageRefs=[];for(const row of rows)for(const phase of PHASES)if(row?.captures?.[phase]?.canvas?.artifact?.ref)imageRefs.push(row.captures[phase].canvas.artifact.ref);if(imageRefs.length!==expectedImageRefCount||new Set(imageRefs).size!==expectedImageRefCount)add(errors,"canvas artifact refs must be exact and globally unique");
  const byTarget=new Map(inventory.map(entry=>[entry.target,entry]));for(let i=0;i<matrix.length;i++)if(rows[i])validateResult(rows[i],matrix[i],byTarget.get(matrix[i].target),{baseUrl:baseUrl?.href??report.baseUrl,loader:rawArtifactLoader,sourceLoader:sourceAssetLoader,mode},errors,i);else add(errors,`missing result ${i}`);
  const derived={expectedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,observedCount:rows.length,uniqueCount:keys.size,passedCount:errors.length?0:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,allPassed:errors.length===0};if(!same(report.summary,derived))add(errors,"summary fabricated or stale");
  if(persistedValidation){const expected={passed:errors.length===0,ok:errors.length===0,errors:[...errors],summary:derived};if(!same(report.validation,expected))add(errors,"persisted validation is stale or fabricated")}
  return {passed:errors.length===0,ok:errors.length===0,errors,summary:{expectedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,observedCount:rows.length,uniqueCount:keys.size,passedCount:errors.length?0:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,allPassed:errors.length===0}};
}

function failedValidation(errors){return {passed:false,ok:false,errors,summary:{expectedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,observedCount:0,uniqueCount:0,passedCount:0,allPassed:false}}}
function comparablePath(value){const resolved=path.resolve(value);return process.platform==="win32"?resolved.toLowerCase():resolved}
function containedPath(root,target){const relative=path.relative(root,target);return relative===""||(!relative.startsWith(`..${path.sep}`)&&relative!==".."&&!path.isAbsolute(relative))}

export function describeQuizTargetVisibilityArtifactRoot(auditRoot){
  if(typeof auditRoot!=="string"||!path.isAbsolute(auditRoot))throw new Error("auditRoot must be an absolute path");
  const resolvedRoot=path.resolve(auditRoot),realRoot=fs.realpathSync.native(resolvedRoot);
  if(comparablePath(resolvedRoot)!==comparablePath(realRoot)||fs.lstatSync(resolvedRoot).isSymbolicLink())throw new Error("auditRoot symlink/junction/reparse indirection is forbidden");
  for(const child of ["artifacts","masks"]){const resolved=path.resolve(realRoot,child),real=fs.realpathSync.native(resolved),stat=fs.lstatSync(resolved);if(comparablePath(resolved)!==comparablePath(real)||stat.isSymbolicLink()||!stat.isDirectory()||!containedPath(realRoot,real))throw new Error(`${child} symlink/junction/reparse indirection is forbidden`)}
  return {relativePath:".",resolvedPath:resolvedRoot,realPath:realRoot};
}

function filesystemArtifactLoader(auditRoot){
  const identity=describeQuizTargetVisibilityArtifactRoot(auditRoot),root=identity.realPath;
  const loader=ref=>{
    const target=path.resolve(root,...ref.split("/"));
    if(!containedPath(root,target))throw new Error("artifact path escapes audit root");
    const relative=path.relative(root,target),parts=relative.split(path.sep).filter(Boolean);let cursor=root;
    for(const part of parts){cursor=path.join(cursor,part);const stat=fs.lstatSync(cursor);if(stat.isSymbolicLink())throw new Error("artifact symlink/junction/reparse indirection is forbidden")}
    const real=fs.realpathSync.native(target);if(comparablePath(real)!==comparablePath(target)||!containedPath(root,real))throw new Error("artifact resolved path escapes or uses reparse indirection");
    return fs.readFileSync(real);
  };
  return {identity,loader};
}

function filesystemSourceAssetLoader(sourceRoot){
  if(typeof sourceRoot!=="string"||!path.isAbsolute(sourceRoot))throw new Error("sourceRoot must be absolute");const resolved=path.resolve(sourceRoot),real=fs.realpathSync.native(resolved),stat=fs.lstatSync(resolved);if(comparablePath(resolved)!==comparablePath(real)||stat.isSymbolicLink()||!stat.isDirectory())throw new Error("sourceRoot symlink/junction/reparse indirection is forbidden");
  return assetPath=>{if(typeof assetPath!=="string"||!/^public\/atlas\/[A-Za-z0-9._-]+$/.test(assetPath))throw new Error("source asset path invalid");const target=path.resolve(real,...assetPath.split("/"));if(!containedPath(real,target))throw new Error("source asset escapes root");let cursor=real;for(const part of path.relative(real,target).split(path.sep)){cursor=path.join(cursor,part);const child=fs.lstatSync(cursor);if(child.isSymbolicLink())throw new Error("source asset symlink/junction/reparse indirection is forbidden")}const resolvedFile=fs.realpathSync.native(target);if(comparablePath(resolvedFile)!==comparablePath(target)||!containedPath(real,resolvedFile)||!fs.lstatSync(resolvedFile).isFile())throw new Error("source asset resolution invalid");return fs.readFileSync(resolvedFile)};
}
export function describeQuizVisibilitySourceRoot(){return {declaredRoot:".",realPath:fs.realpathSync.native(REPOSITORY_ROOT),manifest:structuredClone(LIVE_MESH_MANIFEST)}}

/** Public validator for completed live runs. Raw loader injection is forbidden. */
export function validateQuizTargetVisibilityReport(report,options={}){
  if(!exactKeys(options,["auditRoot"])||typeof options.auditRoot!=="string")return failedValidation(["live validator requires exactly auditRoot; sourceRoot and injected loaders are forbidden"]);
  let prepared,sourceLoader;try{prepared=filesystemArtifactLoader(options.auditRoot);sourceLoader=filesystemSourceAssetLoader(REPOSITORY_ROOT)}catch(error){return failedValidation([`live artifact/repository source root invalid: ${errorText(error)}`])}
  const preErrors=[];if(!same(report?.artifactRoot,prepared.identity))preErrors.push("live artifact root identity mismatch");if(!same(report?.sourceRootIdentity,describeQuizVisibilitySourceRoot()))preErrors.push("live source root identity/frozen manifest mismatch");
  return validateQuizTargetVisibilityReportCore(report,{mode:"live",rawArtifactLoader:prepared.loader,sourceAssetLoader:sourceLoader,preErrors});
}

/** Unit-only validator. Live provenance and live-only report fields are rejected. */
export function validateQuizTargetVisibilityFixture(report,options={}){
  if(!exactKeys(options,["rawArtifactLoader","sourceRoot"])||typeof options.rawArtifactLoader!=="function"||typeof options.sourceRoot!=="string")return failedValidation(["fixture validator requires rawArtifactLoader and separate sourceRoot"]);
  let sourceLoader;try{sourceLoader=filesystemSourceAssetLoader(options.sourceRoot)}catch(error){return failedValidation([`fixture source root invalid: ${errorText(error)}`])}
  return validateQuizTargetVisibilityReportCore(report,{mode:"unit-fixture",rawArtifactLoader:options.rawArtifactLoader,sourceAssetLoader:sourceLoader});
}

export function validateQuizTargetVisibilitySmokeReport(report,options={}){
  if(!exactKeys(options,["auditRoot"])||typeof options.auditRoot!=="string")return {passed:false,productionEligible:false,errors:["smoke validator requires exactly auditRoot"],summary:{expectedCount:0,observedCount:0,passedCount:0}};
  const errors=[];let prepared,sourceLoader;try{prepared=filesystemArtifactLoader(options.auditRoot);sourceLoader=filesystemSourceAssetLoader(REPOSITORY_ROOT)}catch(error){return {passed:false,productionEligible:false,errors:[`smoke roots invalid: ${errorText(error)}`],summary:{expectedCount:0,observedCount:0,passedCount:0}}}
  if(report?.provenance!=="smoke-browser"||report?.status!=="smoke-complete")errors.push("smoke provenance/status invalid");const matrix=Array.isArray(report?.matrix)?report.matrix:[],rows=Array.isArray(report?.results)?report.results:[],inventory=Array.isArray(report?.inventory)?report.inventory:[],byTarget=new Map(inventory.map(entry=>[entry.target,entry]));if(!matrix.length||rows.length!==matrix.length||new Set(rows.map(row=>row?.key)).size!==rows.length)errors.push("smoke matrix/results missing or duplicated");for(let index=0;index<matrix.length;index++){const item=matrix[index],entry=byTarget.get(item?.target);if(!entry||!rows[index])errors.push(`smoke row ${index} identity missing`);else validateResult(rows[index],item,entry,{baseUrl:report.baseUrl,loader:prepared.loader,sourceLoader,mode:"live"},errors,index)}const passed=errors.length===0;return {passed,productionEligible:false,errors,summary:{expectedCount:matrix.length,observedCount:rows.length,passedCount:passed?rows.length:0}}
}

function encodeSyntheticBnm3(ids){const vertices=[],regions=[],faces=[];for(const id of ids){const base=regions.length;for(const z of [-28,28])for(const y of [-28,28])for(const x of [-28,28]){vertices.push(x,y,z);regions.push(id)}faces.push(base,base+1,base+3,base,base+3,base+2,base+4,base+6,base+7,base+4,base+7,base+5,base,base+4,base+5,base,base+5,base+1,base+2,base+3,base+7,base+2,base+7,base+6,base,base+2,base+6,base,base+6,base+4,base+1,base+5,base+7,base+1,base+7,base+3)}const nv=regions.length,raw=Buffer.alloc(12+nv*32+faces.length*4);raw.write("BNM3",0,"ascii");raw.writeUInt32LE(nv,4);raw.writeUInt32LE(faces.length/3,8);let offset=12;for(const value of vertices){raw.writeFloatLE(value,offset);offset+=4}for(let i=0;i<nv*3;i++){raw.writeFloatLE(i%3===2?1:0,offset);offset+=4}for(let i=0;i<nv;i++){raw.writeFloatLE(1,offset);offset+=4}for(const id of regions){raw.writeFloatLE(id,offset);offset+=4}for(const face of faces){raw.writeUInt32LE(face,offset);offset+=4}return raw}
function encodeDepthSyntheticBnm3(ids){
  const vertices=[],regions=[],faces=[];
  for(let item=0;item<ids.length;item++){
    const id=ids[item],base=regions.length,cx=-25+(item%6)*10,cy=-25+Math.floor(item/6)*10;
    for(const z of [-4,4])for(const y of [-4,4])for(const x of [-4,4]){vertices.push(cx+x,cy+y,z);regions.push(id)}
    faces.push(base,base+1,base+3,base,base+3,base+2,base+4,base+6,base+7,base+4,base+7,base+5,base,base+4,base+5,base,base+5,base+1,base+2,base+3,base+7,base+2,base+7,base+6,base,base+2,base+6,base,base+6,base+4,base+1,base+5,base+7,base+1,base+7,base+3);
  }
  const nv=regions.length,raw=Buffer.alloc(12+nv*32+faces.length*4);raw.write("BNM3",0,"ascii");raw.writeUInt32LE(nv,4);raw.writeUInt32LE(faces.length/3,8);let offset=12;
  for(const value of vertices){raw.writeFloatLE(value,offset);offset+=4}for(let i=0;i<nv*3;i++){raw.writeFloatLE(i%3===2?1:0,offset);offset+=4}for(let i=0;i<nv;i++){raw.writeFloatLE(1,offset);offset+=4}for(const id of regions){raw.writeFloatLE(id,offset);offset+=4}for(const face of faces){raw.writeUInt32LE(face,offset);offset+=4}return raw;
}
function createSyntheticMeshSourceRoot(){const root=fs.mkdtempSync(path.join(os.tmpdir(),"quiz-visibility-mesh-source-")),dir=path.join(root,"public","atlas");fs.mkdirSync(dir,{recursive:true});const files=new Map;for(const entry of QUIZ_TARGET_VISIBILITY_INVENTORY.filter(item=>item.format!=="section"))for(const file of expectedMeshFiles(entry)){if(!files.has(file))files.set(file,new Set);for(const id of entry.expectedIds)files.get(file).add(id)}for(const[file,ids]of files){const raw=encodeDepthSyntheticBnm3([...ids]),bytes=file.endsWith(".gz")?gzipSync(raw):raw;fs.writeFileSync(path.join(dir,file),bytes)}return root}

function makeFixtureCapture({phase,item,entry,baseUrl,artifacts,sourceLoader}){
  const width=64,height=64,bg=new Uint8Array(width*height*4);for(let p=0;p<width*height;p++){bg[p*4]=18;bg[p*4+1]=18;bg[p*4+2]=18;bg[p*4+3]=255}const on=bg.slice();for(let y=2;y<6;y++)for(let x=2;x<6;x++){const o=(y*width+x)*4;on[o]=120;on[o+1]=180;on[o+2]=90}
  const bytes=phase==="C"?bg:on,ref=`artifacts/${item.viewportId}/${item.target}/${phase}.rgba`;artifacts.set(ref,bytes);
  const canvas={selector:".quizImageStage > canvas",canvasCount:1,artifact:artifactDescriptor(ref,bytes,"application/x-rgba8"),intrinsicWidth:width,intrinsicHeight:height,cssRect:{x:10,y:10,width,height},dpr:1},transform=structuredClone(entry.expectedTransform);
  let visibility;if(entry.format==="section"){const mask=new Uint8Array(width*height);for(let y=2;y<6;y++)for(let x=2;x<6;x++)mask[y*width+x]=1;const maskRef=`masks/${item.viewportId}/${item.target}.bin`;artifacts.set(maskRef,mask);const partialCapture={canvas,transform};visibility={kind:"section-mask",namespace:entry.namespace,activeLayer:entry.activeLayer,targetIds:[...entry.expectedIds],provenance:expectedMaskProvenance(entry,partialCapture),mask:{artifact:artifactDescriptor(maskRef,mask,"application/x-binary-mask"),width,height,...maskStats(mask,width,height)}}}else {const partialCapture={canvas,transform},mask=rebuildExpectedMeshMask(entry,partialCapture,sourceLoader),maskRef=`masks/${item.viewportId}/${item.target}.bin`;artifacts.set(maskRef,mask);const rendered=phase==="C"?bg:bg.slice();if(phase!=="C")for(let pixel=0;pixel<mask.length;pixel++)if(mask[pixel]){const o=pixel*4;rendered[o]=120;rendered[o+1]=180;rendered[o+2]=90}artifacts.set(ref,rendered);canvas.artifact=artifactDescriptor(ref,rendered,"application/x-rgba8");visibility={kind:"mesh",namespace:entry.namespace,activeLayer:entry.activeLayer,selectedIds:phase==="C"?[]:[...entry.expectedIds],selectedVertexCount:phase==="C"?0:16,incidentTriangleCount:phase==="C"?0:12,projectionMask:{artifact:artifactDescriptor(maskRef,mask,"application/x-binary-mask"),width,height,...maskStats(mask,width,height),provenance:expectedMeshProvenance(entry,partialCapture,sourceLoader,"unit-fixture")}}}
  return {phase,url:expectedUrl(baseUrl,item,phase==="C"?"off":"on"),question:expectedQuestion(item,entry),canvas,viewport:{commanded:{...item.viewport},observed:expectedObservedViewport(item.viewport)},transform,probe:validState(),visibility};
}

/** Unit-only synthetic evidence. Never accepted by the default live validator. */
export function createValidQuizTargetVisibilityFixture(){
  const baseUrl="http://127.0.0.1:4173/",artifacts=new Map(),matrix=buildQuizTargetVisibilityMatrix(),byTarget=new Map(QUIZ_TARGET_VISIBILITY_INVENTORY.map(entry=>[entry.target,entry])),sourceRoot=createSyntheticMeshSourceRoot(),sourceLoader=filesystemSourceAssetLoader(sourceRoot);
  const results=matrix.map(item=>{const entry=byTarget.get(item.target),captures=Object.fromEntries(PHASES.map(phase=>[phase,makeFixtureCapture({phase,item,entry,baseUrl,artifacts,sourceLoader})]));const h1=artifacts.get(captures.H1.canvas.artifact.ref),c=artifacts.get(captures.C.canvas.artifact.ref),h2=artifacts.get(captures.H2.canvas.artifact.ref),w=captures.H1.canvas.intrinsicWidth,h=captures.H1.canvas.intrinsicHeight,mask=artifacts.get((entry.format==="section"?captures.H1.visibility.mask:captures.H1.visibility.projectionMask).artifact.ref);return {key:item.key,identity:expectedIdentity(item),captures,comparisons:{h1VsControl:diffRgbaBuffers(h1,c,{width:w,height:h}),controlVsH2:diffRgbaBuffers(c,h2,{width:w,height:h}),h1H2Exact:true,sectionCoverage:entry.format==="section"?sectionCoverage(mask,h1,c,w,h):null,meshCoverage:entry.format!=="section"?sectionCoverage(mask,h1,c,w,h):null}}});
  const report={schemaVersion:2,tool:QUIZ_TARGET_VISIBILITY_TOOL,provenance:"unit-fixture",status:"complete",generatedAt:"2026-08-28T00:00:02.000Z",startedAt:"2026-08-28T00:00:00.000Z",completedAt:"2026-08-28T00:00:01.000Z",baseUrl,environment:{os:{platform:"win32",release:"fixture"},nodeVersion:"v24.0.0",browser:{product:"HeadlessChrome/152.0.0.0",userAgent:"Mozilla/5.0 HeadlessChrome/152.0.0.0",protocolVersion:"1.3"}},dependency:expectedDependency(),source:{path:QUIZ_TARGET_VISIBILITY_SOURCE_PATH,inventorySha256:EXPECTED_QUIZ_TARGET_INVENTORY_SHA256,optionsSha256:EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256},inventory:structuredClone(QUIZ_TARGET_VISIBILITY_INVENTORY),viewports:structuredClone(QUIZ_TARGET_VISIBILITY_VIEWPORTS),emulationCommands:expectedEmulationCommands(),matrix:structuredClone(matrix),results,summary:{expectedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,observedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,uniqueCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,passedCount:EXPECTED_QUIZ_TARGET_VISIBILITY_MATRIX_COUNT,allPassed:true}};
  return {report,artifacts,sourceRoot,cleanup:()=>fs.rmSync(sourceRoot,{recursive:true,force:true}),rawArtifactLoader:ref=>{if(!artifacts.has(ref))throw new Error(`missing fixture artifact ${ref}`);return artifacts.get(ref)}};
}

export function auditQuizTargetVisibilitySource({rootDir=REPOSITORY_ROOT,source}={}){const inventory=parseQuizTargetVisibilityInventory(source??fs.readFileSync(path.join(rootDir,QUIZ_TARGET_VISIBILITY_SOURCE_PATH),"utf8")),counts={section:inventory.filter(x=>x.format==="section").length,surface:inventory.filter(x=>x.format==="surface").length,neurovascular:inventory.filter(x=>x.format==="neurovascular").length,total:inventory.length},errors=[];if(!same(counts,EXPECTED_QUIZ_TARGET_COUNTS))errors.push("inventory counts mismatch");if(quizTargetInventorySha256(inventory)!==EXPECTED_QUIZ_TARGET_INVENTORY_SHA256)errors.push("inventory identity hash mismatch");if(quizVisibilityOptionsSha256(inventory)!==EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256)errors.push(`inventory options/render hash mismatch: ${quizVisibilityOptionsSha256(inventory)}`);return {ok:errors.length===0,errors,counts,inventorySha256:quizTargetInventorySha256(inventory),optionsSha256:quizVisibilityOptionsSha256(inventory),matrixCount:inventory.length*3}}

function safeEmptyOutputRoot(outputDir){if(typeof outputDir!=="string"||!path.isAbsolute(outputDir))throw new Error("--output-dir must be an absolute local path");const resolved=path.resolve(outputDir),parent=path.dirname(resolved),realParent=fs.realpathSync.native(parent);if(comparablePath(parent)!==comparablePath(realParent)||fs.lstatSync(parent).isSymbolicLink())throw new Error("output parent indirection is forbidden");if(fs.existsSync(resolved)){const stat=fs.lstatSync(resolved);if(stat.isSymbolicLink()||!stat.isDirectory()||fs.readdirSync(resolved).length)throw new Error("output directory must be nonexisting or empty")}else fs.mkdirSync(resolved);for(const child of ["artifacts","masks"])fs.mkdirSync(path.join(resolved,child));return resolved}
function writeArtifact(root,ref,bytes){const file=path.resolve(root,...ref.split("/"));if(!containedPath(root,file))throw new Error("artifact path escaped output root");fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);const target=ref.match(/^masks\/[^/]+\/([^/]+)\.bin$/)?.[1],entry=target&&QUIZ_TARGET_VISIBILITY_INVENTORY.find(item=>item.target===target);if(entry&&entry.format!=="section")liveMeshToleranceHashes.add(sha256Bytes(bytes));return artifactDescriptor(ref,bytes,ref.endsWith(".rgba")?"application/x-rgba8":"application/x-binary-mask")}
const CAPTURE_PROBE=target=>`(() => {const canvas=document.querySelector(".quizImageStage > canvas"),question=document.querySelector(".quizQuestionCard"),rect=canvas?.getBoundingClientRect(),root=document.documentElement,body=document.body,projection=canvas?.__quizVisibilityProjectionMask;const bytes=canvas?canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data:null,to64=value=>{let text="";for(let i=0;i<value.length;i+=32768)text+=String.fromCharCode(...value.subarray(i,i+32768));return btoa(text)};return {question:question?{target:question.dataset.quizTarget,format:question.dataset.quizFormat,plane:question.dataset.quizPlane??null,position:question.dataset.quizPosition?Number(question.dataset.quizPosition):null,view:question.dataset.quizView??null,detail:question.dataset.quizDetail??null,queueLength:Number(question.dataset.quizQueueLength),queueIndex:Number(question.dataset.quizQueueIndex),inventorySha256:question.dataset.quizInventorySha256,options:[...question.querySelectorAll("[data-quiz-option]")].map(x=>x.dataset.quizOption)}:null,canvas:canvas?{count:document.querySelectorAll(".quizImageStage > canvas").length,width:canvas.width,height:canvas.height,rect:{x:rect.x,y:rect.y,width:rect.width,height:rect.height},dpr:devicePixelRatio,rgba:to64(bytes)}:null,viewport:{innerWidth,innerHeight,clientWidth:root.clientWidth,clientHeight:root.clientHeight,visualViewport:{width:visualViewport.width,height:visualViewport.height,scale:visualViewport.scale},screen:{width:screen.width,height:screen.height,availWidth:screen.availWidth,availHeight:screen.availHeight},devicePixelRatio,maxTouchPoints:navigator.maxTouchPoints,coarsePointer:matchMedia("(pointer: coarse)").matches,hover:matchMedia("(hover: hover)").matches,touchEvent:"ontouchstart" in window},transform:canvas?{rotation:{x:Number(canvas.dataset.atlasRotationX),y:Number(canvas.dataset.atlasRotationY),z:Number(canvas.dataset.atlasRotationZ)},zoom:Number(canvas.dataset.atlasZoom),pan:{x:0,y:0}}:null,health:{readyState:document.readyState,loadingCount:document.querySelectorAll(".atlasLoading:not(.error),.segLoading:not(.error)").length,horizontalOverflow:Math.max(root.scrollWidth,body?.scrollWidth??0)>root.clientWidth+1,webglFallback:Boolean(document.querySelector(".atlasWebglFallback")),uiErrors:[...document.querySelectorAll(".atlasLoading.error,.segLoading.error,[role=alert]")].map(x=>(x.textContent||"").trim())},mesh:projection?{...projection,mask:to64(projection.mask)}:null,counts:{surfaceVertices:Number(canvas?.dataset.atlasSurfaceSelectedVertexCount||0),surfaceTriangles:Number(canvas?.dataset.atlasSurfaceIncidentTriangleCount||0),surfaceIds:(canvas?.dataset.atlasSurfaceSelectedIds||"").split(",").filter(Boolean).map(Number),neuroVertices:Number(canvas?.dataset.atlasNeurovascularSelectedVertexCount||0),neuroTriangles:Number(canvas?.dataset.atlasNeurovascularIncidentTriangleCount||0),neuroIds:(canvas?.dataset.atlasNeurovascularSelectedIds||"").split(",").filter(Boolean).map(Number)}}})()`;
async function collectLiveCapture({cdp,state,baseUrl,item,entry,phase,outputRoot}){resetMeasurementState(state,{collecting:true});await navigate(cdp,expectedUrl(baseUrl,item,phase==="C"?"off":"on"));await waitForRuntimeProbe(cdp,CAPTURE_PROBE(item.target),value=>value?.health?.readyState==="complete"&&value.health.loadingCount===0&&value.question?.target===item.target&&value.canvas?.count===1,45_000);const raw=await evaluate(cdp,CAPTURE_PROBE(item.target)),rgba=Buffer.from(raw.canvas.rgba,"base64"),canvas={selector:".quizImageStage > canvas",canvasCount:raw.canvas.count,artifact:writeArtifact(outputRoot,`artifacts/${item.viewportId}/${item.target}/${phase}.rgba`,rgba),intrinsicWidth:raw.canvas.width,intrinsicHeight:raw.canvas.height,cssRect:raw.canvas.rect,dpr:raw.canvas.dpr},capture={phase,url:expectedUrl(baseUrl,item,phase==="C"?"off":"on"),question:raw.question,canvas,viewport:{commanded:{...item.viewport},observed:raw.viewport},transform:raw.transform,probe:{readyState:raw.health.readyState,stable:true,loadingCount:raw.health.loadingCount,overflow:raw.health.horizontalOverflow,horizontalOverflow:raw.health.horizontalOverflow,webglFallback:raw.health.webglFallback,errors:[],consoleErrors:[...state.consoleErrors],requestErrors:[...state.requestErrors],uiErrors:raw.health.uiErrors},visibility:null};if(entry.format==="section"){const mask=rebuildExpectedSectionMask(entry,capture,"live"),ref=`masks/${item.viewportId}/${item.target}.bin`;capture.visibility={kind:"section-mask",namespace:entry.namespace,activeLayer:entry.activeLayer,targetIds:[...entry.expectedIds],provenance:expectedMaskProvenance(entry,capture),mask:{artifact:writeArtifact(outputRoot,ref,mask),width:canvas.intrinsicWidth,height:canvas.intrinsicHeight,...maskStats(mask,canvas.intrinsicWidth,canvas.intrinsicHeight)}}}else {if(!raw.mesh)throw new Error(`${item.key}:${phase} projection mask unavailable`);const mask=Buffer.from(raw.mesh.mask,"base64"),ref=`masks/${item.viewportId}/${item.target}.bin`;capture.visibility={kind:"mesh",namespace:entry.namespace,activeLayer:entry.activeLayer,selectedIds:phase==="C"?[]:[...entry.expectedIds],selectedVertexCount:phase==="C"?0:(entry.format==="surface"?raw.counts.surfaceVertices:raw.counts.neuroVertices),incidentTriangleCount:phase==="C"?0:(entry.format==="surface"?raw.counts.surfaceTriangles:raw.counts.neuroTriangles),projectionMask:{artifact:writeArtifact(outputRoot,ref,mask),width:canvas.intrinsicWidth,height:canvas.intrinsicHeight,...maskStats(mask,canvas.intrinsicWidth,canvas.intrinsicHeight),provenance:{builder:raw.mesh.builder,namespace:raw.mesh.namespace,activeLayer:raw.mesh.activeLayer,sourceMeshes:raw.mesh.sourceMeshes,selectedIds:raw.mesh.selectedIds,hemisphere:raw.mesh.hemisphere,transform:raw.mesh.transform,projection:raw.mesh.projection}}}}return capture}
export async function runQuizTargetVisibilityBrowserAudit({baseUrl,outputDir,targets=null,viewportIds=null,dependencies={}}={}){const canonical=new URL(baseUrl);if(canonical.protocol!=="http:"||!["127.0.0.1","localhost","::1"].includes(canonical.hostname)||canonical.search||canonical.hash)throw new Error("base URL must be clean loopback HTTP");const smoke=Array.isArray(targets)||Array.isArray(viewportIds),inventory=targets?QUIZ_TARGET_VISIBILITY_INVENTORY.filter(x=>targets.includes(x.target)):QUIZ_TARGET_VISIBILITY_INVENTORY,viewports=viewportIds?QUIZ_TARGET_VISIBILITY_VIEWPORTS.filter(x=>viewportIds.includes(x.id)):QUIZ_TARGET_VISIBILITY_VIEWPORTS;if(!inventory.length||!viewports.length)throw new Error("smoke selection is empty");const outputRoot=safeEmptyOutputRoot(outputDir),matrix=buildQuizTargetVisibilityMatrix({inventory,viewports}),launch=dependencies.launchChrome??launchChrome,close=dependencies.closeChrome??closeChrome,collector=dependencies.collectCapture??collectLiveCapture,session=await launch(),state=createMeasurementState(),detach=attachObservers(session.cdp,state),startedAt=new Date().toISOString(),results=[];try{await configurePage(session.cdp);for(const viewport of viewports){await session.cdp.send("Emulation.setDeviceMetricsOverride",{width:viewport.width,height:viewport.height,deviceScaleFactor:viewport.deviceScaleFactor,mobile:viewport.mobile});await session.cdp.send("Emulation.setTouchEmulationEnabled",viewport.touch?{enabled:true,maxTouchPoints:1}:{enabled:false});await navigate(session.cdp,canonical.href);await waitForRuntimeProbe(session.cdp,"document.readyState",value=>value==="complete",45_000);await session.cdp.send("Emulation.setDeviceMetricsOverride",{width:viewport.width,height:viewport.height,deviceScaleFactor:viewport.deviceScaleFactor,mobile:viewport.mobile});await session.cdp.send("Emulation.setTouchEmulationEnabled",viewport.touch?{enabled:true,maxTouchPoints:1}:{enabled:false});for(const item of matrix.filter(row=>row.viewportId===viewport.id)){const entry=inventory.find(x=>x.target===item.target),captures={};for(const phase of PHASES)captures[phase]=await collector({cdp:session.cdp,state,baseUrl:canonical.href,item,entry,phase,outputRoot});const h1=fs.readFileSync(path.join(outputRoot,captures.H1.canvas.artifact.ref)),control=fs.readFileSync(path.join(outputRoot,captures.C.canvas.artifact.ref)),h2=fs.readFileSync(path.join(outputRoot,captures.H2.canvas.artifact.ref)),mask=fs.readFileSync(path.join(outputRoot,(entry.format==="section"?captures.H1.visibility.mask:captures.H1.visibility.projectionMask).artifact.ref)),width=captures.H1.canvas.intrinsicWidth,height=captures.H1.canvas.intrinsicHeight;results.push({key:item.key,identity:expectedIdentity(item),captures,comparisons:{h1VsControl:diffRgbaBuffers(h1,control,{width,height}),controlVsH2:diffRgbaBuffers(control,h2,{width,height}),h1H2Exact:sha256Bytes(h1)===sha256Bytes(h2)&&h1.equals(h2),sectionCoverage:entry.format==="section"?sectionCoverage(mask,h1,control,width,height):null,meshCoverage:entry.format!=="section"?sectionCoverage(mask,h1,control,width,height):null}})}}const version=await session.cdp.send("Browser.getVersion"),finished=new Date().toISOString(),report={schemaVersion:2,tool:QUIZ_TARGET_VISIBILITY_TOOL,provenance:smoke?"smoke-browser":"live-browser",status:smoke?"smoke-complete":"complete",generatedAt:finished,startedAt,completedAt:finished,baseUrl:canonical.href,environment:{os:{platform:process.platform,release:os.release()},nodeVersion:process.version,browser:{product:version.product,userAgent:version.userAgent,protocolVersion:version.protocolVersion}},dependency:expectedDependency(),source:{path:QUIZ_TARGET_VISIBILITY_SOURCE_PATH,inventorySha256:EXPECTED_QUIZ_TARGET_INVENTORY_SHA256,optionsSha256:EXPECTED_QUIZ_VISIBILITY_OPTIONS_SHA256},inventory:structuredClone(smoke?inventory:QUIZ_TARGET_VISIBILITY_INVENTORY),viewports:structuredClone(smoke?viewports:QUIZ_TARGET_VISIBILITY_VIEWPORTS),emulationCommands:expectedEmulationCommands().filter(command=>viewports.some(v=>v.id===command.viewportId)),matrix,results,summary:{expectedCount:matrix.length,observedCount:results.length,uniqueCount:new Set(results.map(x=>x.key)).size,passedCount:matrix.length,allPassed:true},run:{runId:randomUUID(),browserSession:{browserTargetId:`browser-${session.port}`,pageTargetId:session.target.id,pageSessionId:`page-session-${session.port}`},browserVersionEvidence:{method:"Browser.getVersion",product:version.product,userAgent:version.userAgent,protocolVersion:version.protocolVersion,jsVersion:version.jsVersion,revision:version.revision},executableEvidence:{source:"launch",path:fs.realpathSync.native(session.executable)}},artifactRoot:describeQuizTargetVisibilityArtifactRoot(outputRoot),sourceRootIdentity:describeQuizVisibilitySourceRoot()};if(smoke){const validation=validateQuizTargetVisibilitySmokeReport(report,{auditRoot:outputRoot});return {...report,summary:{...report.summary,passedCount:validation.summary.passedCount,allPassed:validation.passed},validation}}const validation=validateQuizTargetVisibilityReport(report,{auditRoot:outputRoot});return {...report,summary:validation.summary,validation}}finally{detach();await close(session)}}

function parseArgs(argv){const args={help:false,baseUrl:null,outputDir:null,targets:null,viewports:null};for(let i=0;i<argv.length;i++){const token=argv[i];if(token==="--help"||token==="-h"){args.help=true;continue}const value=argv[++i];if(!value)throw new Error(`${token} requires a value`);if(token==="--base-url")args.baseUrl=value;else if(token==="--output-dir")args.outputDir=value;else if(token==="--targets")args.targets=value.split(",").filter(Boolean);else if(token==="--viewports")args.viewports=value.split(",").filter(Boolean);else throw new Error(`unknown option: ${token}`)}return args}
export async function main(argv=process.argv.slice(2)){let args;try{args=parseArgs(argv)}catch(error){console.error(errorText(error));process.exitCode=2;return}if(args.help){console.log("Usage: node scripts/audit_quiz_target_visibility_browser.mjs --base-url http://127.0.0.1:PORT/ --output-dir ABSOLUTE_DIR [--targets a,b --viewports pc]");return}if(!args.baseUrl||!args.outputDir){console.error("--base-url and --output-dir are required");process.exitCode=2;return}try{const report=await runQuizTargetVisibilityBrowserAudit({baseUrl:args.baseUrl,outputDir:path.resolve(args.outputDir),targets:args.targets,viewportIds:args.viewports});fs.writeFileSync(path.join(path.resolve(args.outputDir),"report.json"),`${JSON.stringify(report,null,2)}\n`);process.stdout.write(`${JSON.stringify({status:report.status,rows:report.results.length,validation:report.validation},null,2)}\n`);if(report.provenance==="live-browser"&&!report.validation?.passed)process.exitCode=1}catch(error){console.error(errorText(error));process.exitCode=1}}
const invoked=process.argv[1]?pathToFileURL(path.resolve(process.argv[1])).href:"";if(import.meta.url===invoked)main();
