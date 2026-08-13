"use client";

import { useEffect, useRef, useState } from "react";

type Plane="coronal"|"horizontal"|"sagittal";type Focus="ventricle"|"caudate"|"hippocampus"|"thalamus";type Display="specimen"|"diagram"|"outline";
type Volume={dims:[number,number,number];t1:Uint8Array;t2:Uint8Array;labels:Uint8Array;mask:Uint8Array;gm:Uint8Array;wm:Uint8Array;csf:Uint8Array};type Mesh={vertices:Float32Array;normals:Float32Array;shade:Float32Array;regions:Float32Array;faces:Uint32Array};
type BigBrain={dims:[number,number,number];values:Uint8Array};
type FixedBrain={dims:[number,number,number];values:Uint8Array;mask:Uint8Array};
type ManualSeg={dims:[number,number,number];labels:Uint8Array};
type Tone={contrast:number;brightness:number;sharpness:number};
type NeurovascularOverlay="none"|"vessels"|"nerves"|"both";
type BasalLandmark="all"|"optic"|"infundibulum"|"mammillary"|"hypothalamic";
type Rotation={x:number;y:number;z?:number};
type SpecimenBlock="none"|"lateral-ventricle"|"diencephalon"|"radiations"|"commissural-system"|"choroid-plexus"|"medial-temporal"|"midbrain-section"|"hindbrain";
type SpecimenPartDefinition={key:string;layer?:string;color:[number,number,number,number];material:1|4};
type LoadedSpecimenPart={mesh:Mesh;definition:SpecimenPartDefinition};
export type HighlightLayer={ids:number[];color:[number,number,number]};
export type IdentifiedPoint={id:number;x:number;y:number;certainty:"atlas"|"manual"|"provisional"};
const DISPLAY_TONE:Tone={contrast:1.07,brightness:1,sharpness:.08};
const SPECIMEN_PARTS:Record<Exclude<SpecimenBlock,"none">,SpecimenPartDefinition[]>={
  "lateral-ventricle":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"ventricular-cavity",layer:"ventricular-cavity",color:[.27,.68,.74,1],material:1},
    {key:"caudate",layer:"caudate",color:[.86,.57,.29,1],material:1},
    {key:"thalamus",layer:"thalamus",color:[.55,.51,.77,1],material:1},
    {key:"hippocampus",layer:"hippocampus",color:[.78,.47,.55,1],material:1},
  ],
  diencephalon:[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"thalami",layer:"thalami",color:[.55,.51,.77,1],material:1},
    {key:"third-ventricle",layer:"third-ventricle",color:[.27,.68,.74,1],material:1},
    {key:"hypothalamus",layer:"hypothalamus",color:[.73,.47,.39,1],material:1},
    {key:"subthalamic-nuclei",layer:"subthalamic-nuclei",color:[.88,.68,.27,1],material:1},
    {key:"mammillary-bodies",layer:"mammillary-bodies",color:[.66,.47,.37,1],material:1},
  ],
  radiations:[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"putamen",layer:"putamen",color:[.85,.52,.31,1],material:1},
    {key:"pallidum-external",layer:"pallidum-external",color:[.82,.68,.36,1],material:1},
    {key:"pallidum-internal",layer:"pallidum-internal",color:[.72,.55,.26,1],material:1},
    {key:"internal-capsule",layer:"internal-capsule",color:[.89,.82,.48,1],material:1},
    {key:"corona-radiata",layer:"corona-radiata",color:[.91,.78,.36,1],material:1},
    {key:"optic-radiation",layer:"optic-radiation",color:[.49,.62,.82,1],material:1},
    {key:"auditory-radiation",layer:"auditory-radiation",color:[.45,.73,.62,1],material:1},
  ],
  "commissural-system":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"corpus-callosum",layer:"corpus-callosum",color:[.86,.76,.44,1],material:1},
    {key:"lateral-ventricles",layer:"lateral-ventricles",color:[.27,.68,.74,1],material:1},
    {key:"fornix",layer:"fornix",color:[.91,.85,.65,1],material:1},
    {key:"septum-pellucidum",layer:"septum-pellucidum",color:[.66,.77,.74,1],material:1},
  ],
  "choroid-plexus":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"ventricular-cavity",layer:"ventricular-cavity",color:[.27,.68,.74,1],material:1},
    {key:"choroid-plexus",layer:"choroid-plexus",color:[.70,.30,.38,1],material:1},
    {key:"hippocampus",layer:"hippocampus",color:[.78,.47,.55,1],material:1},
  ],
  "medial-temporal":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"hippocampus",layer:"hippocampus",color:[.78,.47,.55,1],material:1},
    {key:"amygdala",layer:"amygdala",color:[.61,.42,.68,1],material:1},
    {key:"inferior-horn",layer:"inferior-horn",color:[.27,.68,.74,1],material:1},
    {key:"fimbria",layer:"fimbria",color:[.89,.85,.69,1],material:1},
    {key:"uncus",layer:"uncus",color:[.72,.51,.40,1],material:1},
  ],
  "midbrain-section":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"red-nuclei",layer:"red-nuclei",color:[.82,.31,.29,1],material:1},
    {key:"substantia-nigra",layer:"substantia-nigra",color:[.44,.39,.53,1],material:1},
    {key:"aqueduct",layer:"aqueduct",color:[.27,.68,.74,1],material:1},
    {key:"cerebral-peduncles",layer:"cerebral-peduncles",color:[.82,.60,.33,1],material:1},
  ],
  hindbrain:[
    {key:"pons-medulla",color:[.72,.59,.47,1],material:4},
    {key:"cerebellum",color:[.82,.68,.51,1],material:4},
    {key:"midbrain",color:[.74,.56,.41,1],material:4},
  ],
};
let volumeCache:Promise<Volume>|null=null,bigBrainCache:Promise<BigBrain>|null=null,fixedBrainCache:Promise<FixedBrain>|null=null;const manualSegCache=new Map<string,Promise<ManualSeg>>(),meshCache=new Map<string,Promise<Mesh>>(),zeroHighlightCache=new WeakMap<Mesh,Float32Array>(),surfaceHighlightCache=new WeakMap<Mesh,Map<string,Float32Array>>();

async function loadVolume(){
  if(!volumeCache)volumeCache=fetch("/atlas/mni-cerebra-1mm.bin.gz").then(async r=>{
    if(!r.ok)throw new Error(`volume HTTP ${r.status}`);let buf=await r.arrayBuffer(),v=new DataView(buf);if(v.getUint32(0,false)!==0x424e5634&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}if(v.getUint32(0,false)!==0x424e5634)throw new Error("invalid volume header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,t1:new Uint8Array(buf,10,n),t2:new Uint8Array(buf,10+n,n),labels:new Uint8Array(buf,10+2*n,n),mask:new Uint8Array(buf,10+3*n,n),gm:new Uint8Array(buf,10+4*n,n),wm:new Uint8Array(buf,10+5*n,n),csf:new Uint8Array(buf,10+6*n,n)};
  });return volumeCache;
}
async function loadBigBrain(){
  if(!bigBrainCache)bigBrainCache=fetch("/atlas/bigbrain-icbm500.bin.gz").then(async r=>{
    if(!r.ok)throw new Error(`BigBrain HTTP ${r.status}`);let buf=await r.arrayBuffer(),v=new DataView(buf);
    if(v.getUint32(0,false)!==0x42425631&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}
    if(v.getUint32(0,false)!==0x42425631)throw new Error("invalid BigBrain header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,values:new Uint8Array(buf,10,n)};
  });return bigBrainCache;
}
async function loadFixedBrain(){
  if(!fixedBrainCache)fixedBrainCache=fetch("/atlas/bigbrain-fixed-mri-0444.bin.gz").then(async r=>{
    if(!r.ok)throw new Error(`fixed MRI HTTP ${r.status}`);let buf=await r.arrayBuffer(),v=new DataView(buf),magic=v.getUint32(0,false);if(magic!==0x42464d31&&magic!==0x42464d32&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf);magic=v.getUint32(0,false)}if(magic!==0x42464d31&&magic!==0x42464d32)throw new Error("invalid fixed MRI header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2],values=new Uint8Array(buf,10,n);return{dims,values,mask:new Uint8Array(buf,10+(magic===0x42464d32?2:1)*n,n)};
  });return fixedBrainCache;
}
async function loadManualSeg(name:"icbm500"){
  if(!manualSegCache.has(name))manualSegCache.set(name,fetch(`/atlas/bigbrain-practical-segmentation-${name}.bin.gz`).then(async r=>{if(!r.ok)throw new Error(`practical segmentation HTTP ${r.status}`);let buf=await r.arrayBuffer(),v=new DataView(buf);if(v.getUint32(0,false)!==0x42425331&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}if(v.getUint32(0,false)!==0x42425331)throw new Error("invalid practical segmentation header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,labels:new Uint8Array(buf,10,n)}}));return manualSegCache.get(name)!;
}
function loadMesh(name:string){if(!meshCache.has(name))meshCache.set(name,fetch(`/atlas/${name}.mesh`).then(r=>{if(!r.ok)throw new Error(`${name} HTTP ${r.status}`);return r.arrayBuffer()}).then(buf=>{const v=new DataView(buf),magic=v.getUint32(0,false),nv=v.getUint32(4,true),nf=v.getUint32(8,true),hasShade=magic===0x424e4d32||magic===0x424e4d33,vertices=new Float32Array(buf,12,nv*3),normals=new Float32Array(buf,12+nv*12,nv*3),shade=hasShade?new Float32Array(buf,12+nv*24,nv):new Float32Array(nv).fill(1),regions=magic===0x424e4d33?new Float32Array(buf,12+nv*28,nv):new Float32Array(nv),faceOffset=magic===0x424e4d33?12+nv*32:magic===0x424e4d32?12+nv*28:12+nv*24,faces=new Uint32Array(buf,faceOffset,nf*3);return{vertices,normals,shade,regions,faces}}));return meshCache.get(name)!}

function vertexHighlights(mesh:Mesh,layers:HighlightLayer[]){
  if(layers.length===0){let empty=zeroHighlightCache.get(mesh);if(!empty){empty=new Float32Array(mesh.regions.length*4);zeroHighlightCache.set(mesh,empty)}return empty}
  const key=layers.map(layer=>`${layer.ids.join(",")}:${layer.color.join(",")}`).join("|");let cache=surfaceHighlightCache.get(mesh);if(!cache){cache=new Map;surfaceHighlightCache.set(mesh,cache)}const existing=cache.get(key);if(existing)return existing;
  const colors=new Map<number,[number,number,number]>();layers.forEach(layer=>layer.ids.forEach(id=>colors.set(id,layer.color)));const result=new Float32Array(mesh.regions.length*4);for(let i=0;i<mesh.regions.length;i++){const color=colors.get(Math.round(mesh.regions[i]));if(!color)continue;const offset=i*4;result[offset]=color[0]/255;result[offset+1]=color[1]/255;result[offset+2]=color[2]/255;result[offset+3]=1}if(cache.size>=6)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}

const colors:Record<Focus,[number,number,number]>={ventricle:[73,169,180],caudate:[225,151,73],hippocampus:[200,121,141],thalamus:[141,130,196]};
const idx=(x:number,y:number,z:number,d:[number,number,number])=>x+d[0]*(y+d[1]*z);
function sectionSize(d:[number,number,number],plane:Plane):[number,number]{return plane==="sagittal"?[d[1],d[2]]:plane==="horizontal"?[d[0],d[1]]:[d[0],d[2]]}
function sectionVoxel(a:number,b:number,d:[number,number,number],plane:Plane,p:number):[number,number,number]{const[dx,dy,dz]=d;if(plane==="horizontal")return[a,dy-1-b,Math.round((1-p/100)*(dz-1))];if(plane==="sagittal")return[Math.round(p/100*(dx-1)),a,dz-1-b];return[a,Math.round(p/100*(dy-1)),dz-1-b]}
function viewTransform(w:number,h:number,d:[number,number,number],plane:Plane,zoom:number,pan:{x:number;y:number}){const[sw,sh]=sectionSize(d,plane),fit=Math.min((w-10)/sw,(h-10)/sh),scale=fit*zoom;return{sw,sh,scale,ox:(w-sw*scale)/2+pan.x,oy:(h-sh*scale)/2+pan.y}}
function drawScale(c:CanvasRenderingContext2D,h:number,scale:number,voxelSizeMm:number){const width=20/voxelSizeMm*scale,x=18,y=h-20;c.save();c.strokeStyle="#d3d6d4";c.fillStyle="#d3d6d4";c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+width,y);c.moveTo(x,y-4);c.lineTo(x,y+3);c.moveTo(x+width,y-4);c.lineTo(x+width,y+3);c.stroke();c.font="10px monospace";c.fillText("20 mm",x,y-7);c.restore()}

export function AtlasVolumeCanvas({kind,plane,position,focus,display,rotation,view="inside",contrast="t1",highlights=[],surfaceHighlights=[],neurovascularHighlights=[],specimenLayers=[],onIdentify,onViewChange,showFocus=true,showCutPlane=true,hemisphere="both",showCerebellum=true,showPonsMedulla=true,specimenBlock="none",neurovascularOverlay="none",showBasalLandmarks=false,basalLandmark="all"}:{kind:"surface"|"slice";plane:Plane;position:number;focus:Focus;display:Display;rotation:Rotation;view?:"inside"|"ghost"|"extracted"|"segmented";contrast?:"t1"|"t2"|"bigbrain"|"single";highlights?:HighlightLayer[];surfaceHighlights?:HighlightLayer[];neurovascularHighlights?:HighlightLayer[];specimenLayers?:string[];onIdentify?:(point:IdentifiedPoint)=>void;onViewChange?:()=>void;showFocus?:boolean;showCutPlane?:boolean;hemisphere?:"both"|"left"|"right";showCerebellum?:boolean;showPonsMedulla?:boolean;specimenBlock?:SpecimenBlock;neurovascularOverlay?:NeurovascularOverlay;showBasalLandmarks?:boolean;basalLandmark?:BasalLandmark}){
  const ref=useRef<HTMLCanvasElement>(null),panDrag=useRef<{x:number;y:number;pan:{x:number;y:number}}|null>(null),[data,setData]=useState<Volume|null>(null),[bigBrain,setBigBrain]=useState<BigBrain|null>(null),[fixedBrain,setFixedBrain]=useState<FixedBrain|null>(null),[manualSeg,setManualSeg]=useState<ManualSeg|null>(null),[meshes,setMeshes]=useState<{brain:Mesh;focus:Mesh;surface:Mesh[];segments:Mesh[];overlays:Mesh[];basal:Mesh[]}|null>(null),[blockMeshes,setBlockMeshes]=useState<LoadedSpecimenPart[]|null>(null),[error,setError]=useState(""),[sizeVersion,setSizeVersion]=useState(0),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
  useEffect(()=>{if(kind==="slice"&&(contrast==="t1"||contrast==="t2"))loadVolume().then(setData).catch(e=>setError(String(e)))},[kind,contrast]);useEffect(()=>{if(kind==="surface")Promise.all(["brain",focus,"pial-left","pial-right","segment-cerebellum","segment-pons-medulla","segment-midbrain","segment-deep","segment-ventricles","overlay-arteries-anterior","overlay-arteries-posterior","overlay-nerves-anterior","overlay-nerves-pontine","overlay-nerves-medullary","landmark-optic-pathway","landmark-infundibulum","landmark-mammillary-bodies"].map(loadMesh)).then(([brain,f,left,right,cerebellum,ponsMedulla,midbrain,deep,ventricles,...rest])=>setMeshes({brain,focus:f,surface:[left,right,cerebellum,ponsMedulla,midbrain],segments:[left,right,cerebellum,ponsMedulla,midbrain,deep,ventricles],overlays:rest.slice(0,5),basal:rest.slice(5)})).catch(e=>setError(String(e)))},[kind,focus]);
  useEffect(()=>{if(kind!=="surface"||specimenBlock==="none"){setBlockMeshes(null);return}setBlockMeshes(null);const definitions=SPECIMEN_PARTS[specimenBlock];Promise.all(definitions.map(async definition=>({definition,mesh:await loadMesh(`block-${specimenBlock}-${definition.key}`)}))).then(setBlockMeshes).catch(e=>setError(String(e)))},[kind,specimenBlock]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain")loadBigBrain().then(setBigBrain).catch(e=>setError(String(e)))},[kind,contrast]);
  useEffect(()=>{if(kind==="slice"&&contrast==="single")loadFixedBrain().then(setFixedBrain).catch(e=>setError(String(e)))},[kind,contrast]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain")loadManualSeg("icbm500").then(setManualSeg).catch(e=>setError(String(e)));else setManualSeg(null)},[kind,contrast]);
  useEffect(()=>{const el=ref.current;if(!el||typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(()=>setSizeVersion(value=>value+1));observer.observe(el);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(kind==="slice"){setZoom(1);setPan({x:0,y:0})}},[kind,plane,contrast]);
  useEffect(()=>{const el=ref.current;if(!el)return;const dpr=Math.min(devicePixelRatio||1,2),w=el.clientWidth,h=el.clientHeight;el.width=w*dpr;el.height=h*dpr;const labelColors=new Map<number,[number,number,number]>();highlights.forEach(layer=>layer.ids.forEach(id=>labelColors.set(id,layer.color)));if(kind==="slice"&&contrast==="single"&&fixedBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawFixedSlice(c,w,h,fixedBrain,plane,position,display,DISPLAY_TONE,zoom,pan)}}else if(kind==="slice"&&contrast==="bigbrain"&&bigBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,null,bigBrain,manualSeg,plane,position,display,"bigbrain",DISPLAY_TONE,labelColors,zoom,pan)}}else if(kind==="slice"&&data){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,data,null,null,plane,position,display,contrast==="t2"?"t2":"t1",DISPLAY_TONE,labelColors,zoom,pan)}}else if(kind==="surface"&&meshes&&(specimenBlock==="none"||blockMeshes))drawWebGL(el,meshes.brain,meshes.focus,meshes.surface,meshes.segments,meshes.overlays,meshes.basal,blockMeshes,rotation,colors[focus],plane,position,view,showFocus,contrast,showCutPlane,hemisphere,showCerebellum,showPonsMedulla,neurovascularOverlay,surfaceHighlights,neurovascularHighlights,specimenLayers,showBasalLandmarks,basalLandmark,zoom);},[data,bigBrain,fixedBrain,manualSeg,meshes,blockMeshes,kind,plane,position,focus,display,rotation,view,contrast,sizeVersion,highlights,surfaceHighlights,neurovascularHighlights,specimenLayers,showFocus,showCutPlane,hemisphere,showCerebellum,showPonsMedulla,specimenBlock,neurovascularOverlay,showBasalLandmarks,basalLandmark,zoom,pan]);
  function sourceForView(){return contrast==="single"?fixedBrain:contrast==="bigbrain"?bigBrain:data}
  function identify(e:React.PointerEvent<HTMLCanvasElement>){const el=ref.current;if(kind!=="slice"||!el||!onIdentify||contrast==="single")return;const source=contrast==="bigbrain"?bigBrain:data;if(!source)return;const direct=contrast==="bigbrain";if((direct&&!manualSeg)||(!direct&&!data))return;const rect=el.getBoundingClientRect(),w=el.clientWidth,h=el.clientHeight,{sw,sh,scale,ox,oy}=viewTransform(w,h,source.dims,plane,zoom,pan),a=Math.floor((e.clientX-rect.left-ox)/scale),b=Math.floor((e.clientY-rect.top-oy)/scale);if(a<0||a>=sw||b<0||b>=sh){onIdentify({id:0,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty:direct?"manual":"atlas"});return}const voxel=sectionVoxel(a,b,source.dims,plane,position),sourceIndex=idx(voxel[0],voxel[1],voxel[2],source.dims),inside=direct?!!bigBrain&&bigBrain.values[sourceIndex]<252:!!data&&data.mask[sourceIndex]>0;let id=direct?manualSeg!.labels[sourceIndex]:inside?data!.labels[sourceIndex]:0;if(!direct&&inside&&id===0){const gm=data!.gm[sourceIndex],wm=data!.wm[sourceIndex],csf=data!.csf[sourceIndex];id=wm>=gm&&wm>=csf?201:gm>=csf?202:203}onIdentify({id,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty:direct&&id>22?"provisional":direct?"manual":"atlas"})}
  function handleWheel(e:React.WheelEvent<HTMLCanvasElement>){if(kind==="surface"){e.preventDefault();setZoom(previous=>Math.max(.7,Math.min(2.4,previous*Math.exp(-e.deltaY*.0015))));onViewChange?.();return}const source=sourceForView();if(!source)return;e.preventDefault();const el=e.currentTarget,rect=el.getBoundingClientRect(),localX=e.clientX-rect.left,localY=e.clientY-rect.top,w=el.clientWidth,h=el.clientHeight;setZoom(previous=>{const next=Math.max(.75,Math.min(5,previous*Math.exp(-e.deltaY*.0015)));if(Math.abs(next-previous)<.0001)return previous;setPan(current=>{const oldView=viewTransform(w,h,source.dims,plane,previous,current),nextBase=viewTransform(w,h,source.dims,plane,next,{x:0,y:0}),imageX=(localX-oldView.ox)/oldView.scale,imageY=(localY-oldView.oy)/oldView.scale;return{x:localX-imageX*nextBase.scale-nextBase.ox,y:localY-imageY*nextBase.scale-nextBase.oy}});onViewChange?.();return next})}
  function pointerDown(e:React.PointerEvent<HTMLCanvasElement>){if(kind==="slice"&&(e.button===1||e.shiftKey)){e.currentTarget.setPointerCapture(e.pointerId);panDrag.current={x:e.clientX,y:e.clientY,pan};return}identify(e)}
  function pointerMove(e:React.PointerEvent<HTMLCanvasElement>){const drag=panDrag.current;if(!drag)return;setPan({x:drag.pan.x+e.clientX-drag.x,y:drag.pan.y+e.clientY-drag.y});onViewChange?.()}
  function pointerUp(e:React.PointerEvent<HTMLCanvasElement>){if(!panDrag.current)return;panDrag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
  function resetView(){setZoom(1);setPan({x:0,y:0});onViewChange?.()}
  const ready=kind==="slice"?(contrast==="single"?!!fixedBrain:contrast==="bigbrain"?!!bigBrain:!!data):!!meshes&&(specimenBlock==="none"||!!blockMeshes);return <><canvas ref={ref} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={handleWheel} onDoubleClick={resetView} className={`atlasCanvas ${kind==="slice"&&onIdentify?"identifiable":""} ${zoom>1.01?"zoomed":""}`} aria-label={kind==="surface"?`${specimenBlock==="none"?"MNI高密度皮質表面モデル":"0.5 mm標本から構成した局所3D標本"}${neurovascularOverlay!=="none"?"と模式3D神経血管レイヤー":""}。ホイールで拡大縮小`:`${plane}断面 ${position}。ホイールで拡大縮小、Shiftドラッグで移動`}/>{Math.abs(zoom-1)>.01&&<button type="button" className="zoomReadout" onClick={resetView} title="表示を等倍に戻す">{Math.round(zoom*100)}% <small>リセット</small></button>}{!ready&&<span className={`atlasLoading ${error?"error":""}`}>{error?"データを読み込めませんでした":specimenBlock!=="none"?"局所標本を読み込み中…":contrast==="single"?"0.44 mm 単一固定脳を読み込み中…":contrast==="bigbrain"?"組織切片データを読み込み中…":"1 mm 解剖データを読み込み中…"}</span>}</>;
}

function drawFixedSlice(c:CanvasRenderingContext2D,w:number,h:number,v:FixedBrain,plane:Plane,p:number,display:Display,tone:Tone,zoom:number,pan:{x:number;y:number}){
  const[dx,dy,dz]=v.dims;let sw=dx,sh=dz,get=(a:number,b:number)=>idx(a,Math.round(p/100*(dy-1)),dz-1-b,v.dims);if(plane==="horizontal"){sw=dx;sh=dy;get=(a,b)=>idx(a,dy-1-b,Math.round((1-p/100)*(dz-1)),v.dims)}if(plane==="sagittal"){sw=dy;sh=dz;get=(a,b)=>idx(Math.round(p/100*(dx-1)),a,dz-1-b,v.dims)}
  const values=v.values,off=document.createElement("canvas");off.width=sw;off.height=sh;const oc=off.getContext("2d")!,im=oc.createImageData(sw,sh),sample=(x:number,y:number)=>values[get(Math.max(0,Math.min(sw-1,x)),Math.max(0,Math.min(sh-1,y)))];
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const si=get(x,y),q=(y*sw+x)*4,raw=values[si],near=(sample(x-1,y)+sample(x+1,y)+sample(x,y-1)+sample(x,y+1))*.25,base=raw+(raw-near)*tone.sharpness,val=Math.max(0,Math.min(255,(base-128)*tone.contrast+128+tone.brightness)),edge=Math.min(22,(Math.abs(sample(x+1,y)-sample(x-1,y))+Math.abs(sample(x,y+1)-sample(x,y-1)))*(.07+tone.sharpness*.18));let r,g,b;if(display==="outline"){r=g=b=25+val*.72-edge}else if(display==="diagram"){r=78+val*.66;g=65+val*.59;b=51+val*.49}else{r=36+val*.78-edge;g=31+val*.68-edge*.74;b=25+val*.55-edge*.46}im.data[q]=r;im.data[q+1]=g;im.data[q+2]=b;im.data[q+3]=v.mask[si]?255:0}oc.putImageData(im,0,0);c.clearRect(0,0,w,h);c.fillStyle="#171b1c";c.fillRect(0,0,w,h);const{scale,ox,oy}=viewTransform(w,h,v.dims,plane,zoom,pan);c.imageSmoothingEnabled=false;c.drawImage(off,ox,oy,sw*scale,sh*scale);drawScale(c,h,scale,.444);
}

function drawSlice(c:CanvasRenderingContext2D,w:number,h:number,v:Volume|null,bb:BigBrain|null,manual:ManualSeg|null,plane:Plane,p:number,display:Display,contrast:"t1"|"t2"|"bigbrain",tone:Tone,labelColors:Map<number,[number,number,number]>,zoom:number,pan:{x:number;y:number}){
  const isBB=contrast==="bigbrain"&&!!bb,dims=isBB?bb!.dims:v!.dims,[dx,dy,dz]=dims;let sw=dx,sh=dz,get=(a:number,b:number)=>idx(a,Math.round(p/100*(dy-1)),dz-1-b,dims);if(plane==="horizontal"){sw=dx;sh=dy;get=(a,b)=>idx(a,dy-1-b,Math.round((1-p/100)*(dz-1)),dims)}if(plane==="sagittal"){sw=dy;sh=dz;get=(a,b)=>idx(Math.round(p/100*(dx-1)),a,dz-1-b,dims)}
  const values=isBB?bb!.values:contrast==="t2"?v!.t2:v!.t1,off=document.createElement("canvas");off.width=sw;off.height=sh;const oc=off.getContext("2d")!,im=oc.createImageData(sw,sh);
  const sample=(x:number,y:number)=>values[get(Math.max(0,Math.min(sw-1,x)),Math.max(0,Math.min(sh-1,y)))];
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const si=get(x,y),q=(y*sw+x)*4,label=isBB?(manual?.labels[si]??0):v!.labels[si],highlightColor=labelColors.get(label),cavityLabel=isBB&&label>=23&&label<=26,raw=values[si];
    const cross=(sample(x-1,y)+sample(x+1,y)+sample(x,y-1)+sample(x,y+1))*.25;
    const diagonal=(sample(x-1,y-1)+sample(x+1,y-1)+sample(x-1,y+1)+sample(x+1,y+1))*.25;
    const near=cross*.68+diagonal*.32,base=display==="specimen"?raw+(raw-near)*tone.sharpness:raw;
    const sharpened=Math.max(0,Math.min(255,(base-128)*tone.contrast+128+tone.brightness));
    const gradient=Math.min(42,(Math.abs(sample(x+1,y)-sample(x-1,y))+Math.abs(sample(x,y+1)-sample(x,y-1)))*.42);
    const val=sharpened;let r,g,b;
    if(isBB){
      if(display==="outline"){r=g=b=Math.max(18,34+val*.66-gradient*.68)}
      else if(display==="diagram"){r=76+val*.70;g=64+val*.63;b=49+val*.53}
      else{r=47+val*.81-gradient*.26;g=40+val*.75-gradient*.20;b=32+val*.66-gradient*.14}
    }
    else if(display==="diagram"){r=92+val*.7;g=78+val*.64;b=61+val*.54}
    else if(display==="outline"){const e=x<sw-1&&label!==v!.labels[get(x+1,y)];r=g=b=e?238:24+val*.34}
    else{
      const pg=v!.gm[si]/255,pw=v!.wm[si]/255,pc=v!.csf[si]/255,total=Math.max(.001,pg+pw+pc),ng=pg/total,nw=pw/total,nc=pc/total;
      const texture=(val-128)*.18,edge=gradient*.30,grain=((x*17+y*31)%11-5)*.22;
      r=ng*139+nw*198+nc*48+texture-edge+grain;g=ng*119+nw*186+nc*50+texture*.8-edge*.75+grain;b=ng*100+nw*158+nc*48+texture*.55-edge*.45;
    }
    if(highlightColor&&!cavityLabel){const m=display==="specimen"?.42:.86;r=r*(1-m)+highlightColor[0]*m;g=g*(1-m)+highlightColor[1]*m;b=b*(1-m)+highlightColor[2]*m}
    let alpha=(isBB?raw>=252:v!.mask[si]===0)?0:255;
    if(cavityLabel&&highlightColor){r=highlightColor[0];g=highlightColor[1];b=highlightColor[2];alpha=display==="specimen"?220:245}
    im.data[q]=r;im.data[q+1]=g;im.data[q+2]=b;im.data[q+3]=alpha;
  }
  oc.putImageData(im,0,0);c.clearRect(0,0,w,h);c.fillStyle="#171b1c";c.fillRect(0,0,w,h);const{scale,ox,oy}=viewTransform(w,h,dims,plane,zoom,pan);c.imageSmoothingEnabled=!isBB;c.imageSmoothingQuality="high";c.drawImage(off,ox,oy,sw*scale,sh*scale);drawScale(c,h,scale,isBB ? .5 : 1);
}

function shader(gl:WebGLRenderingContext,type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);return s}
function cutCoordinate(plane:Plane,position:number,contrast:"t1"|"t2"|"bigbrain"|"single"){
  const p=position/100;
  if(contrast==="bigbrain")return plane==="sagittal"?-98+196.5*p:plane==="horizontal"?98.5-188.5*p:-116+232.5*p;
  if(contrast==="single")return plane==="sagittal"?-70.7+139.6*p:plane==="horizontal"?67-125.8*p:-71.6+160.5*p;
  return plane==="sagittal"?-96+192*p:plane==="horizontal"?96-192*p:-114+228*p;
}
function cutPlaneMesh(plane:Plane,value:number):Mesh{
  const xmin=-74,xmax=74,ymin=-72,ymax=70,zmin=-96,zmax=96;
  const q=plane==="sagittal"?[[value,ymin,zmin],[value,ymax,zmin],[value,ymax,zmax],[value,ymin,zmax]]:plane==="horizontal"?[[xmin,value,zmin],[xmax,value,zmin],[xmax,value,zmax],[xmin,value,zmax]]:[[xmin,ymin,value],[xmax,ymin,value],[xmax,ymax,value],[xmin,ymax,value]];
  const normal=plane==="sagittal"?[1,0,0]:plane==="horizontal"?[0,1,0]:[0,0,1],vertices=new Float32Array(q.flatMap(v=>[v[1],v[2],v[0]])),normals=new Float32Array(Array.from({length:4},()=>[normal[1],normal[2],normal[0]]).flat());
  return{vertices,normals,shade:new Float32Array([1,1,1,1]),regions:new Float32Array(4),faces:new Uint32Array([0,1,2,3])};
}
function drawWebGL(canvas:HTMLCanvasElement,brain:Mesh,focus:Mesh,surface:Mesh[],segments:Mesh[],overlays:Mesh[],basal:Mesh[],blockMeshes:LoadedSpecimenPart[]|null,rot:Rotation,focusColor:[number,number,number],plane:Plane,position:number,view:"inside"|"ghost"|"extracted"|"segmented",showFocus:boolean,contrast:"t1"|"t2"|"bigbrain"|"single",showCutPlane:boolean,hemisphere:"both"|"left"|"right",showCerebellum:boolean,showPonsMedulla:boolean,neurovascularOverlay:NeurovascularOverlay,surfaceHighlights:HighlightLayer[],neurovascularHighlights:HighlightLayer[],specimenLayers:string[],showBasalLandmarks:boolean,basalLandmark:BasalLandmark,zoom:number){
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true});if(!gl)return;const vs=`attribute vec3 p,n;attribute float a;attribute vec4 h;uniform mat3 r;uniform float scale;varying float l,s,rim;varying vec3 anatomy;varying vec4 highlight;void main(){vec3 q=vec3(p.z,p.x,p.y);anatomy=q;vec3 nn=normalize(r*vec3(n.z,n.x,n.y));q.y+=16.;q=r*q;float key=max(dot(nn,normalize(vec3(-.46,.55,.72))),0.);float fill=max(dot(nn,normalize(vec3(.72,.18,.48))),0.);l=.16+.72*pow(key,.70)+.20*fill;rim=pow(1.-abs(nn.z),2.2);s=a;highlight=h;gl_Position=vec4(q.x/96.*scale,q.y/96.*scale,q.z/138.*scale,1.);}`;const fs=`precision mediump float;uniform vec4 color;uniform float clipOn,clipAxis,clipValue,material;varying float l,s,rim;varying vec3 anatomy;varying vec4 highlight;void main(){float q=clipAxis<.5?anatomy.x:(clipAxis<1.5?anatomy.y:anatomy.z);if(clipOn>.5&&q<clipValue)discard;vec3 outColor;if(material<.5){float sulcus=pow(clamp((1.-s)/.56,0.,1.),.62);vec3 lit=color.rgb*(.40+.76*min(l,1.));outColor=mix(lit,vec3(.045,.060,.067),sulcus*.86)+vec3(.18,.22,.24)*rim*.28;}else if(material<1.5){float gloss=pow(max(l-.34,0.),2.2);outColor=color.rgb*(.58+.62*min(l,1.))+vec3(.24)*gloss+vec3(.16)*rim*.22;}else if(material<2.5){float groove=pow(clamp((1.-s)/.56,0.,1.),.7);outColor=mix(color.rgb*(.48+.66*min(l,1.)),color.rgb*.33,groove*.68)+vec3(.10)*rim*.18;}else if(material<3.5){outColor=color.rgb;}else{float tissue=smoothstep(.02,.98,s);vec3 hist=mix(vec3(.25,.15,.095),vec3(.91,.80,.62),tissue);hist=mix(hist,hist*color.rgb,0.16);outColor=hist*(.48+.64*min(l,1.))+vec3(.15,.12,.09)*rim*.20;}if(highlight.a>.5)outColor=mix(outColor,highlight.rgb,.78);gl_FragColor=vec4(outColor,color.a);}`;const prog=gl.createProgram()!;gl.attachShader(prog,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.10,.12,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.uniform1f(gl.getUniformLocation(prog,"scale"),zoom);
  const ax=rot.x*Math.PI/180,ay=rot.y*Math.PI/180,az=(rot.z??0)*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az),m=new Float32Array([cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy]);gl.uniformMatrix3fv(gl.getUniformLocation(prog,"r"),false,m);
  const axis=plane==="sagittal"?0:plane==="horizontal"?1:2,clip=cutCoordinate(plane,position,contrast);gl.uniform1f(gl.getUniformLocation(prog,"clipAxis"),axis);gl.uniform1f(gl.getUniformLocation(prog,"clipValue"),clip);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);
  const ext=gl.getExtension("OES_element_index_uint");if(!ext)return;const draw=(mesh:Mesh,color:number[],material:number,mode:number=gl.TRIANGLES,highlights:HighlightLayer[]=[])=>{const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);const pa=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(pa);gl.vertexAttribPointer(pa,3,gl.FLOAT,false,0,0);const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);const na=gl.getAttribLocation(prog,"n");gl.enableVertexAttribArray(na);gl.vertexAttribPointer(na,3,gl.FLOAT,false,0,0);const sb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,mesh.shade,gl.STATIC_DRAW);const sa=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(sa);gl.vertexAttribPointer(sa,1,gl.FLOAT,false,0,0);const hb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,hb);gl.bufferData(gl.ARRAY_BUFFER,vertexHighlights(mesh,highlights),gl.STATIC_DRAW);const ha=gl.getAttribLocation(prog,"h");gl.enableVertexAttribArray(ha);gl.vertexAttribPointer(ha,4,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.faces,gl.STATIC_DRAW);gl.uniform4fv(gl.getUniformLocation(prog,"color"),new Float32Array(color));gl.uniform1f(gl.getUniformLocation(prog,"material"),material);gl.drawElements(mode,mesh.faces.length,gl.UNSIGNED_INT,0);gl.deleteBuffer(pb);gl.deleteBuffer(nb);gl.deleteBuffer(sb);gl.deleteBuffer(hb);gl.deleteBuffer(ib)};
  const visibleSurface=surface.filter((_,i)=>(showCerebellum||i!==2)&&(showPonsMedulla||i!==3)&&(hemisphere==="both"||i>1||(hemisphere==="left"?i===0:i===1)));
  const visibleSegments=segments.filter((_,i)=>(showCerebellum||i!==2)&&(showPonsMedulla||i!==3)&&(hemisphere==="both"||i>1||(hemisphere==="left"?i===0:i===1)));
  const visibleBlocks=blockMeshes?.filter(part=>(showCerebellum||part.definition.key!=="cerebellum")&&(showPonsMedulla||part.definition.key!=="pons-medulla")&&(!part.definition.layer||specimenLayers.includes(part.definition.layer)));
  if(visibleBlocks){gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);visibleBlocks.forEach(part=>draw(part.mesh,part.definition.color,part.definition.material));}
  else if(view==="segmented"){const palette=[[.72,.78,.81,1],[.83,.86,.87,1],[.62,.70,.72,1],[.52,.62,.65,1],[.67,.55,.48,1],[.78,.48,.44,1],[.25,.68,.75,1]];gl.disable(gl.CULL_FACE);visibleSegments.forEach(part=>{const i=segments.indexOf(part);draw(part,palette[i],2)});}
  else{const alpha=view==="ghost"?.13:view==="extracted"?.92:1,shellColors=[[.77,.81,.83,alpha],[.84,.86,.87,alpha],[.69,.75,.77,alpha],[.57,.66,.69,alpha],[.66,.59,.54,alpha]];visibleSurface.forEach(part=>{const i=surface.indexOf(part);draw(part,shellColors[i],0,gl.TRIANGLES,i<2?surfaceHighlights:[])});if(showFocus&&view!=="inside"){gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.CULL_FACE);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);draw(focus,[focusColor[0]/255,focusColor[1]/255,focusColor[2]/255,1],1);}}
  if(showBasalLandmarks){
    if(view==="ghost")gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);const keys:BasalLandmark[]=["optic","infundibulum","mammillary"],palette=[[.88,.82,.67,1],[.78,.52,.46,1],[.70,.55,.43,1]];basal.forEach((part,index)=>{if(basalLandmark==="hypothalamic"&&index===0)return;const active=basalLandmark==="all"||basalLandmark==="hypothalamic"||basalLandmark===keys[index],color=[...palette[index]];color[3]=active?1:.26;draw(part,color,1)});
  }
  if(neurovascularOverlay!=="none"){
    if(view==="ghost")gl.clear(gl.DEPTH_BUFFER_BIT);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);
    if(neurovascularOverlay==="vessels"||neurovascularOverlay==="both"){
      draw(overlays[0],[.86,.18,.14,1],1,gl.TRIANGLES,neurovascularHighlights);draw(overlays[1],[.66,.16,.12,1],1,gl.TRIANGLES,neurovascularHighlights);
    }
    if(neurovascularOverlay==="nerves"||neurovascularOverlay==="both"){
      draw(overlays[2],[.96,.83,.42,1],1,gl.TRIANGLES,neurovascularHighlights);draw(overlays[3],[.90,.67,.31,1],1,gl.TRIANGLES,neurovascularHighlights);draw(overlays[4],[.78,.55,.24,1],1,gl.TRIANGLES,neurovascularHighlights);
    }
  }
  if(showCutPlane){const planeMesh=cutPlaneMesh(plane,clip);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);draw(planeMesh,[.29,.72,.88,.14],3,gl.TRIANGLE_FAN);draw(planeMesh,[.46,.84,.98,.92],3,gl.LINE_LOOP);gl.depthMask(true);gl.enable(gl.DEPTH_TEST)}gl.deleteProgram(prog);
}
