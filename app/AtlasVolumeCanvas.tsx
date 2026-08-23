"use client";

import { useEffect, useRef, useState } from "react";
import { SEGMENTATION_LABEL_REVISION } from "./segmentationLabelRevision";
import { createDownloadProgressTracker, formatDownloadBytes } from "../src/downloadProgress.mjs";

const ASSET_BASE=import.meta.env.BASE_URL;

type Plane="coronal"|"horizontal"|"sagittal";type Focus="ventricle"|"caudate"|"hippocampus"|"thalamus";type Display="specimen"|"diagram"|"outline";
type Volume={dims:[number,number,number];t1:Uint8Array;t2:Uint8Array;labels:Uint8Array;mask:Uint8Array;gm:Uint8Array;wm:Uint8Array;csf:Uint8Array};type Mesh={vertices:Float32Array;normals:Float32Array;shade:Float32Array;regions:Float32Array;faces:Uint32Array;auditSource?:{path:string;sha256:string}};
type BigBrain={dims:[number,number,number];values:Uint8Array};
type FixedBrain={dims:[number,number,number];values:Uint8Array;mask:Uint8Array};
type ManualSeg={dims:[number,number,number];labels:Uint8Array};
type Tone={contrast:number;brightness:number;sharpness:number};
type NeurovascularOverlay="none"|"vessels"|"nerves"|"both";
type BasalLandmark="all"|"olfactory"|"optic"|"hypothalamus"|"infundibulum"|"mammillary"|"perforated"|"peduncles"|"midbrain"|"superior-colliculi"|"inferior-colliculi"|"pons"|"medulla"|"pyramids"|"olives"|"hypothalamic"|"brainstem-only"|"without-brainstem-patches";
type SurfaceLandmark="central-sulcus"|"precentral-sulcus"|"lateral-sulcus"|"superior-frontal-sulcus"|"parieto-occipital-sulcus"|"calcarine-sulcus"|"olfactory-sulcus"|"longitudinal-fissure";
type SurfaceDeepLandmark="corpus-callosum"|"septum-pellucidum"|"fornix"|"thalami"|"hypothalamus";
type SpecimenTissueMode="solid"|"ghost"|"hidden";
type Rotation={x:number;y:number;z?:number};
type SpecimenBlock="none"|"lateral-ventricle"|"diencephalon"|"radiations"|"commissural-system"|"choroid-plexus"|"medial-temporal"|"midbrain-section"|"hindbrain"|"model-strategy-current-ventricles"|"model-strategy-ventricle";
type BlockContextSpecimen="none"|"lateral-ventricle"|"diencephalon"|"radiations"|"commissural-system"|"choroid-plexus"|"medial-temporal"|"midbrain-section"|"hindbrain";
type SpecimenPartDefinition={key:string;asset?:string;layer?:string;attachment?:"pons-medulla";color:[number,number,number,number];material:1|4};
type LoadedSpecimenPart={mesh:Mesh;definition:SpecimenPartDefinition};
const EMPTY_MESH:Mesh={vertices:new Float32Array(),normals:new Float32Array(),shade:new Float32Array(),regions:new Float32Array(),faces:new Uint32Array()};
function mergeMeshes(meshes:Mesh[]):Mesh{
  const vertexCount=meshes.reduce((sum,mesh)=>sum+mesh.vertices.length/3,0),faceIndexCount=meshes.reduce((sum,mesh)=>sum+mesh.faces.length,0),vertices=new Float32Array(vertexCount*3),normals=new Float32Array(vertexCount*3),shade=new Float32Array(vertexCount),regions=new Float32Array(vertexCount),faces=new Uint32Array(faceIndexCount);let vertexOffset=0,faceOffset=0;
  for(const mesh of meshes){vertices.set(mesh.vertices,vertexOffset*3);normals.set(mesh.normals,vertexOffset*3);shade.set(mesh.shade,vertexOffset);regions.set(mesh.regions,vertexOffset);for(let index=0;index<mesh.faces.length;index++)faces[faceOffset+index]=mesh.faces[index]+vertexOffset;vertexOffset+=mesh.vertices.length/3;faceOffset+=mesh.faces.length}
  return{vertices,normals,shade,regions,faces};
}
export type HighlightLayer={ids:number[];color:[number,number,number];conditional?:{ids:number[];axis:0|1|2;min?:number;max?:number}};
export type SelectionMeshLayer={files:string[];color:[number,number,number]};
export type IdentifiedPoint={id:number;x:number;y:number;certainty:"atlas"|"manual"|"provisional"|"reviewed"};
export type SurfaceIdentifiedPoint={source:"surface"|"neurovascular";id:number};
export type { BlockContextSpecimen };
const DISPLAY_TONE:Tone={contrast:1.07,brightness:1,sharpness:.08};
// Transparency is a display policy only: no atlas vertices, faces, or labels
// are changed here. Keep the shell and teaching layers on the same scale so a
// ghost view does not make one hindbrain component look opaque by accident.
const SURFACE_GHOST_OPACITY=.18;
const TEACHING_OVERLAY_OPACITY=.78;
const TEACHING_OVERLAY_SELECTED_OPACITY=.98;
function teachingColor(color:number[],opacity=TEACHING_OVERLAY_OPACITY){return [color[0],color[1],color[2],opacity]}
function selectionColor(color:[number,number,number],opacity=TEACHING_OVERLAY_SELECTED_OPACITY){return [color[0]/255,color[1]/255,color[2]/255,opacity]}
let sharedAtlasRenderCanvas:HTMLCanvasElement|null=null;
function atlasRenderCanvas(width:number,height:number){
  if(!sharedAtlasRenderCanvas||sharedAtlasRenderCanvas.getContext("webgl")?.isContextLost())sharedAtlasRenderCanvas=document.createElement("canvas");
  if(sharedAtlasRenderCanvas.width!==width)sharedAtlasRenderCanvas.width=width;
  if(sharedAtlasRenderCanvas.height!==height)sharedAtlasRenderCanvas.height=height;
  return sharedAtlasRenderCanvas;
}
const SURFACE_LANDMARKS:{key:SurfaceLandmark;color:[number,number,number,number]}[]=[
  {key:"central-sulcus",color:[1,.95,.42,1]},
  {key:"precentral-sulcus",color:[1,.55,.82,1]},
  {key:"lateral-sulcus",color:[.45,.90,1,1]},
  {key:"superior-frontal-sulcus",color:[.78,1,.40,1]},
  {key:"parieto-occipital-sulcus",color:[1,.71,.36,1]},
  {key:"calcarine-sulcus",color:[.74,.64,1,1]},
  {key:"olfactory-sulcus",color:[1,.47,.44,1]},
  {key:"longitudinal-fissure",color:[.97,.97,.95,1]},
];
const SURFACE_BOUNDARY_LABELS:Partial<Record<SurfaceLandmark,{a:number[];b:number[]}>>={
  "central-sulcus":{a:[86,35],b:[64,13]},
  "precentral-sulcus":{a:[86,35],b:[89,38,93,42,52,103,83,32,73,22]},
  "superior-frontal-sulcus":{a:[89,38],b:[93,42,52,103]},
  "parieto-occipital-sulcus":{a:[82,31],b:[94,43]},
  "calcarine-sulcus":{a:[57,6],b:[94,43]},
  "olfactory-sulcus":{a:[66,15],b:[58,7]},
};
const SURFACE_DEEP_LANDMARKS:{key:SurfaceDeepLandmark;color:[number,number,number,number]}[]=[
  {key:"corpus-callosum",color:[.86,.76,.44,1]},
  {key:"septum-pellucidum",color:[.66,.77,.74,.88]},
  {key:"fornix",color:[.91,.85,.65,1]},
  {key:"thalami",color:[.55,.51,.77,1]},
  {key:"hypothalamus",color:[.73,.47,.39,1]},
];
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
  ],
  "midbrain-section":[
    {key:"tissue",color:[.79,.64,.49,1],material:4},
    {key:"red-nuclei",layer:"red-nuclei",color:[.82,.31,.29,1],material:1},
    {key:"substantia-nigra",layer:"substantia-nigra",color:[.44,.39,.53,1],material:1},
    {key:"aqueduct",layer:"aqueduct",color:[.27,.68,.74,1],material:1},
    {key:"cerebral-peduncles",layer:"cerebral-peduncles",color:[.82,.60,.33,1],material:1},
    {key:"superior-colliculi",layer:"superior-colliculi",color:[.74,.44,.34,1],material:1},
    {key:"inferior-colliculi",layer:"inferior-colliculi",color:[.66,.36,.31,1],material:1},
    {key:"lateral-geniculate-bodies",layer:"lateral-geniculate-bodies",color:[.39,.56,.76,1],material:1},
    {key:"medial-geniculate-bodies",layer:"medial-geniculate-bodies",color:[.41,.65,.54,1],material:1},
    {key:"interpeduncular-fossa",layer:"interpeduncular-fossa",color:[.56,.43,.35,1],material:1},
  ],
  hindbrain:[
    {key:"pons-medulla",color:[.72,.59,.47,1],material:4},
    {key:"cerebellum",color:[.82,.68,.51,1],material:4},
    {key:"midbrain",color:[.74,.56,.41,1],material:4},
    {key:"fourth-ventricle",layer:"fourth-ventricle",attachment:"pons-medulla",color:[.27,.68,.74,1],material:1},
    {key:"superior-cerebellar-peduncles",layer:"superior-cerebellar-peduncles",attachment:"pons-medulla",color:[.91,.73,.32,1],material:1},
    {key:"middle-cerebellar-peduncles",layer:"middle-cerebellar-peduncles",attachment:"pons-medulla",color:[.86,.53,.28,1],material:1},
    {key:"inferior-cerebellar-peduncles",layer:"inferior-cerebellar-peduncles",attachment:"pons-medulla",color:[.43,.68,.48,1],material:1},
    {key:"facial-colliculi",layer:"facial-colliculi",attachment:"pons-medulla",color:[.83,.43,.50,1],material:1},
    {key:"vestibular-areas",layer:"vestibular-areas",attachment:"pons-medulla",color:[.34,.62,.75,1],material:1},
    {key:"hypoglossal-trigones",layer:"hypoglossal-trigones",attachment:"pons-medulla",color:[.64,.53,.75,1],material:1},
    {key:"vagal-trigones",layer:"vagal-trigones",attachment:"pons-medulla",color:[.48,.42,.65,1],material:1},
    {key:"pyramids",layer:"pyramids",attachment:"pons-medulla",color:[.82,.66,.39,1],material:1},
    {key:"olives",layer:"olives",attachment:"pons-medulla",color:[.74,.43,.36,1],material:1},
  ],
  "model-strategy-current-ventricles":[
    {key:"lateral-ventricles",asset:"block-commissural-system-lateral-ventricles",layer:"ventricular-cavity",color:[.27,.68,.74,1],material:1},
    {key:"third-ventricle",asset:"block-diencephalon-third-ventricle",layer:"ventricular-cavity",color:[.27,.68,.74,1],material:1},
  ],
  "model-strategy-ventricle":[
    {key:"schematic-ventricular-cavity",asset:"comparison-schematic-ventricle",layer:"ventricular-cavity",color:[.27,.68,.74,1],material:1},
  ],
};
let volumeCache:Promise<Volume>|null=null,bigBrainCache:Promise<BigBrain>|null=null,fixedBrainCache:Promise<FixedBrain>|null=null,largeVolumeConsumers=0,largeVolumeReleaseTimer:number|null=null,surfaceMeshConsumers=0,surfaceMeshReleaseTimer:number|null=null;const manualSegCache=new Map<string,Promise<ManualSeg>>(),meshCache=new Map<string,Promise<Mesh>>(),zeroHighlightCache=new WeakMap<Mesh,Float32Array>(),surfaceHighlightCache=new WeakMap<Mesh,Map<string,Float32Array>>(),surfaceBoundaryCache=new WeakMap<Mesh,Map<string,Mesh>>(),surfaceRimCache=new WeakMap<Mesh,Map<string,Mesh>>(),surfaceLevelCache=new WeakMap<Mesh,Map<string,Mesh>>(),ventralSurfacePatchCache=new WeakMap<Mesh,Map<string,Mesh>>(),brainstemLevelCache=new WeakMap<Mesh,Map<string,Mesh>>(),midbrainDorsalPatchCache=new WeakMap<Mesh,Map<string,Mesh>>(),surfaceSpatialCache=new WeakMap<Mesh,Map<string,number[]>>(),surfaceFilledPointCache=new WeakMap<Mesh,Map<string,{point:number[];normal:number[]}>>(),conservativeSeptumCache=new WeakMap<Mesh,Mesh>();
const ATLAS_RETRY_EVENT="brain-practical-navi:retry-atlas-data";
const atlasDownloadProgress=createDownloadProgressTracker();

async function fetchAtlasBuffer(url:string,id:string,errorLabel:string,token:number){
  try{
    const response=await fetch(url);
    if(!response.ok)throw new Error(`${errorLabel} HTTP ${response.status}`);
    const contentLength=Number(response.headers.get("content-length"));
    atlasDownloadProgress.setTotal(id,contentLength,token);
    if(!response.body){
      const buffer=await response.arrayBuffer();
      atlasDownloadProgress.update(id,buffer.byteLength,token);
      atlasDownloadProgress.processing(id,token);
      return buffer;
    }
    let received=0;
    const measuredStream=response.body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({transform(chunk,controller){received+=chunk.byteLength;atlasDownloadProgress.update(id,received,token);controller.enqueue(chunk)}}));
    const buffer=await new Response(measuredStream).arrayBuffer();
    atlasDownloadProgress.processing(id,token);
    return buffer;
  }catch(error){atlasDownloadProgress.fail(id,token);throw error}
}

async function trackAtlasProcessing<T>(id:string,task:(token:number)=>Promise<T>){
  const token=atlasDownloadProgress.begin(id);
  try{const result=await task(token);atlasDownloadProgress.complete(id,token);return result}
  catch(error){atlasDownloadProgress.fail(id,token);throw error}
}

const COMPRESSED_MESH_ASSETS:Readonly<Record<string,string>>=Object.freeze({"pial-left":"pial-left.mesh.gz","pial-right":"pial-right.mesh.gz"});
const COMPRESSED_MESH_AUDIT_SHA256:Readonly<Record<string,string>>=Object.freeze({"pial-left.mesh.gz":"d8112512d0bd930a44d3dc49a63c6a5caeb2342f850ba8f859ad8c26cbb29e5e","pial-right.mesh.gz":"1b41e9d74fed63f6e60aa3f05a7de8a0fad435725e0d3524e0df9ec5f04342dd"});
function meshAssetFileName(name:string){return COMPRESSED_MESH_ASSETS[name]||`${name}.mesh`}
function quizVisibilityAuditEnabled(){return typeof window!=="undefined"&&(location.hostname==="127.0.0.1"||location.hostname==="localhost"||location.hostname==="::1")&&new URLSearchParams(location.search).get("quizVisibilityAudit")==="1"}
async function sha256Hex(buffer:ArrayBuffer){return [...new Uint8Array(await crypto.subtle.digest("SHA-256",buffer))].map(value=>value.toString(16).padStart(2,"0")).join("")}
function hasGzipMagic(buffer:ArrayBuffer){return buffer.byteLength>=2&&new DataView(buffer).getUint16(0,false)===0x1f8b}

function clearLargeVolumeCaches(){volumeCache=null;bigBrainCache=null;fixedBrainCache=null;manualSegCache.clear()}
function retainLargeVolumeCaches(){largeVolumeConsumers++;if(largeVolumeReleaseTimer!==null){window.clearTimeout(largeVolumeReleaseTimer);largeVolumeReleaseTimer=null}}
function releaseLargeVolumeCaches(){largeVolumeConsumers=Math.max(0,largeVolumeConsumers-1);if(largeVolumeConsumers>0)return;if(largeVolumeReleaseTimer!==null)window.clearTimeout(largeVolumeReleaseTimer);largeVolumeReleaseTimer=window.setTimeout(()=>{if(largeVolumeConsumers===0)clearLargeVolumeCaches();largeVolumeReleaseTimer=null},750)}
function retainSurfaceMeshCaches(){surfaceMeshConsumers++;if(surfaceMeshReleaseTimer!==null){window.clearTimeout(surfaceMeshReleaseTimer);surfaceMeshReleaseTimer=null}}
function releaseSurfaceMeshCaches(){surfaceMeshConsumers=Math.max(0,surfaceMeshConsumers-1);if(surfaceMeshConsumers>0)return;if(surfaceMeshReleaseTimer!==null)window.clearTimeout(surfaceMeshReleaseTimer);surfaceMeshReleaseTimer=window.setTimeout(()=>{if(surfaceMeshConsumers===0)meshCache.clear();surfaceMeshReleaseTimer=null},750)}

async function loadVolume(){
  const id="volume:mni-cerebra-1mm";
  if(!volumeCache)volumeCache=trackAtlasProcessing(id,async token=>{
    let buf=await fetchAtlasBuffer(`${ASSET_BASE}atlas/mni-cerebra-1mm.bin.gz`,id,"volume",token),v=new DataView(buf);if(v.getUint32(0,false)!==0x424e5634&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}if(v.getUint32(0,false)!==0x424e5634)throw new Error("invalid volume header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,t1:new Uint8Array(buf,10,n),t2:new Uint8Array(buf,10+n,n),labels:new Uint8Array(buf,10+2*n,n),mask:new Uint8Array(buf,10+3*n,n),gm:new Uint8Array(buf,10+4*n,n),wm:new Uint8Array(buf,10+5*n,n),csf:new Uint8Array(buf,10+6*n,n)};
  });return volumeCache;
}
async function loadBigBrain(){
  const id="volume:bigbrain-icbm500";
  if(!bigBrainCache)bigBrainCache=trackAtlasProcessing(id,async token=>{
    let buf=await fetchAtlasBuffer(`${ASSET_BASE}atlas/bigbrain-icbm500.bin.gz`,id,"BigBrain",token),v=new DataView(buf);
    if(v.getUint32(0,false)!==0x42425631&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}
    if(v.getUint32(0,false)!==0x42425631)throw new Error("invalid BigBrain header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,values:new Uint8Array(buf,10,n)};
  });return bigBrainCache;
}
async function loadFixedBrain(){
  const id="volume:bigbrain-fixed-mri-0444";
  if(!fixedBrainCache)fixedBrainCache=trackAtlasProcessing(id,async token=>{
    let buf=await fetchAtlasBuffer(`${ASSET_BASE}atlas/bigbrain-fixed-mri-0444.bin.gz`,id,"fixed MRI",token),v=new DataView(buf),magic=v.getUint32(0,false);if(magic!==0x42464d31&&magic!==0x42464d32&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf);magic=v.getUint32(0,false)}if(magic!==0x42464d31&&magic!==0x42464d32)throw new Error("invalid fixed MRI header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2],values=new Uint8Array(buf,10,n);return{dims,values,mask:new Uint8Array(buf,10+(magic===0x42464d32?2:1)*n,n)};
  });return fixedBrainCache;
}
async function loadManualSeg(name:"icbm500"){
  const id=`segmentation:${name}`;
  if(!manualSegCache.has(name))manualSegCache.set(name,trackAtlasProcessing(id,async token=>{let buf=await fetchAtlasBuffer(`${ASSET_BASE}atlas/bigbrain-practical-segmentation-${name}.bin.gz?v=${SEGMENTATION_LABEL_REVISION}`,id,"practical segmentation",token),v=new DataView(buf);if(v.getUint32(0,false)!==0x42425331&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}if(v.getUint32(0,false)!==0x42425331)throw new Error("invalid practical segmentation header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,labels:new Uint8Array(buf,10,n)}}));return manualSegCache.get(name)!;
}
function loadMesh(name:string){
  const fileName=meshAssetFileName(name),id=`mesh:${fileName}`;
  if(!meshCache.has(name))meshCache.set(name,trackAtlasProcessing(id,async token=>{let buf=await fetchAtlasBuffer(`${ASSET_BASE}atlas/${fileName}`,id,name,token);const auditSource=quizVisibilityAuditEnabled()?{path:`public/atlas/${fileName}`,sha256:COMPRESSED_MESH_AUDIT_SHA256[fileName]??await sha256Hex(buf)}:undefined;if(hasGzipMagic(buf)){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer()}
    const v=new DataView(buf),magic=v.getUint32(0,false),nv=v.getUint32(4,true),declaredFaces=v.getUint32(8,true),hasShade=magic===0x424e4d32||magic===0x424e4d33;
    if(magic!==0x424e4d31&&magic!==0x424e4d32&&magic!==0x424e4d33)throw new Error(`${name} invalid mesh header`);
    const faceOffset=magic===0x424e4d33?12+nv*32:magic===0x424e4d32?12+nv*28:12+nv*24,faceBytes=buf.byteLength-faceOffset;
    if(faceBytes<0||faceBytes%12!==0)throw new Error(`${name} invalid mesh length`);
    const storedFaces=faceBytes/12,nf=declaredFaces===storedFaces?storedFaces:declaredFaces===storedFaces*3?storedFaces:0;
    if(!nf)throw new Error(`${name} face count does not match mesh length`);
    const vertices=new Float32Array(buf,12,nv*3),normals=new Float32Array(buf,12+nv*12,nv*3),shade=hasShade?new Float32Array(buf,12+nv*24,nv):new Float32Array(nv).fill(1),regions=magic===0x424e4d33?new Float32Array(buf,12+nv*28,nv):new Float32Array(nv),faces=new Uint32Array(buf,faceOffset,nf*3);
    const mesh={vertices,normals,shade,regions,faces};if(auditSource)(mesh as Mesh).auditSource=auditSource;
    return name==="segment-cerebellum"||name==="block-hindbrain-cerebellum"?smoothCerebellarDisplayNormals(mesh):mesh;
  }));return meshCache.get(name)!
}

function smoothCerebellarDisplayNormals(mesh:Mesh){
  // The CerebrA voxel boundary is kept bit-for-bit: only display normals are
  // averaged. A crease threshold avoids blending opposing banks of deep folia.
  let current=new Float32Array(mesh.normals),next=new Float32Array(current.length);
  const counts=new Uint16Array(current.length/3),blend=.42,creaseDot=.18;
  for(let pass=0;pass<4;pass++){
    next.set(current);counts.fill(1);
    const addNeighbour=(target:number,source:number)=>{
      const to=target*3,from=source*3,dot=current[to]*current[from]+current[to+1]*current[from+1]+current[to+2]*current[from+2];
      if(dot<creaseDot)return;
      next[to]+=current[from];next[to+1]+=current[from+1];next[to+2]+=current[from+2];counts[target]++;
    };
    for(let offset=0;offset<mesh.faces.length;offset+=3){
      const a=mesh.faces[offset],b=mesh.faces[offset+1],c=mesh.faces[offset+2];
      addNeighbour(a,b);addNeighbour(b,a);addNeighbour(b,c);addNeighbour(c,b);addNeighbour(c,a);addNeighbour(a,c);
    }
    for(let vertex=0;vertex<counts.length;vertex++){
      const offset=vertex*3,weight=counts[vertex],x=current[offset]*(1-blend)+next[offset]/weight*blend,y=current[offset+1]*(1-blend)+next[offset+1]/weight*blend,z=current[offset+2]*(1-blend)+next[offset+2]/weight*blend,length=Math.hypot(x,y,z)||1;
      next[offset]=x/length;next[offset+1]=y/length;next[offset+2]=z/length;
    }
    [current,next]=[next,current];
  }
  return{...mesh,normals:current};
}

function conservativeSeptumMesh(mesh:Mesh){
  const cached=conservativeSeptumCache.get(mesh);if(cached)return cached;
  const faces:number[]=[];
  for(let offset=0;offset<mesh.faces.length;offset+=3){
    const triangle=[mesh.faces[offset],mesh.faces[offset+1],mesh.faces[offset+2]];
    const inside=triangle.every(index=>{const vertex=index*3,vertical=mesh.vertices[vertex],anteriorPosterior=mesh.vertices[vertex+1],lower=-5+((anteriorPosterior+4)/31)*14;return anteriorPosterior>=-4&&anteriorPosterior<=27&&vertical>=lower&&vertical<=10});
    if(inside)faces.push(...triangle);
  }
  const result={...mesh,faces:new Uint32Array(faces)};conservativeSeptumCache.set(mesh,result);return result;
}

function vertexHighlights(mesh:Mesh,layers:HighlightLayer[]){
  if(layers.length===0){let empty=zeroHighlightCache.get(mesh);if(!empty){empty=new Float32Array(mesh.regions.length*4);zeroHighlightCache.set(mesh,empty)}return empty}
  const key=layers.map(layer=>`${layer.ids.join(",")}:${layer.color.join(",")}:${layer.conditional?`${layer.conditional.ids.join(",")}/${layer.conditional.axis}/${layer.conditional.min??""}/${layer.conditional.max??""}`:""}`).join("|");let cache=surfaceHighlightCache.get(mesh);if(!cache){cache=new Map;surfaceHighlightCache.set(mesh,cache)}const existing=cache.get(key);if(existing)return existing;
  const colors=new Map<number,[number,number,number]>();layers.forEach(layer=>layer.ids.forEach(id=>colors.set(id,layer.color)));const conditional=layers.flatMap(layer=>layer.conditional?[{...layer.conditional,ids:new Set(layer.conditional.ids),color:layer.color}]:[]),result=new Float32Array(mesh.regions.length*4);for(let i=0;i<mesh.regions.length;i++){const id=Math.round(mesh.regions[i]),coordinate=i*3;let color=colors.get(id);for(const rule of conditional){const value=mesh.vertices[coordinate+rule.axis];if(rule.ids.has(id)&&(rule.min===undefined||value>=rule.min)&&(rule.max===undefined||value<rule.max))color=rule.color}if(!color)continue;const offset=i*4;result[offset]=color[0]/255;result[offset+1]=color[1]/255;result[offset+2]=color[2]/255;result[offset+3]=1}if(cache.size>=6)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}

function locallyFilledSurfacePoint(mesh:Mesh,index:number,strength:number){
  let pointCache=surfaceFilledPointCache.get(mesh);if(!pointCache){pointCache=new Map;surfaceFilledPointCache.set(mesh,pointCache)}const cacheKey=`${index}:${strength}`,existing=pointCache.get(cacheKey);if(existing)return existing;
  let bins=surfaceSpatialCache.get(mesh);if(!bins){bins=new Map;surfaceSpatialCache.set(mesh,bins);for(let vertex=0;vertex<mesh.vertices.length/3;vertex++){const offset=vertex*3,key=`${Math.floor(mesh.vertices[offset]/10)},${Math.floor(mesh.vertices[offset+1]/10)},${Math.floor(mesh.vertices[offset+2]/10)}`,bucket=bins.get(key);if(bucket)bucket.push(vertex);else bins.set(key,[vertex])}}
  const center=[-1.5,.6,0],radius=[66,90,70],offset=index*3,point=[mesh.vertices[offset],mesh.vertices[offset+1],mesh.vertices[offset+2]],delta=[point[0]-center[0],point[1]-center[1],point[2]-center[2]],rho=Math.sqrt((delta[0]/radius[0])**2+(delta[1]/radius[1])**2+(delta[2]/radius[2])**2)||1,bx=Math.floor(point[0]/10),by=Math.floor(point[1]/10),bz=Math.floor(point[2]/10);let localOuter=rho;
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)for(const candidate of bins.get(`${bx+x},${by+y},${bz+z}`)??[]){const candidateOffset=candidate*3,dx=mesh.vertices[candidateOffset]-point[0],dy=mesh.vertices[candidateOffset+1]-point[1],dz=mesh.vertices[candidateOffset+2]-point[2];if(dx*dx+dy*dy+dz*dz>121)continue;const cx=mesh.vertices[candidateOffset]-center[0],cy=mesh.vertices[candidateOffset+1]-center[1],cz=mesh.vertices[candidateOffset+2]-center[2],candidateRho=Math.sqrt((cx/radius[0])**2+(cy/radius[1])**2+(cz/radius[2])**2);if(candidateRho>localOuter)localOuter=candidateRho}
  const filledRho=rho+(Math.min(localOuter,rho+.12)-rho)*strength,scale=filledRho/rho,filled=[center[0]+delta[0]*scale,center[1]+delta[1]*scale,center[2]+delta[2]*scale],gradient=[(filled[0]-center[0])/(radius[0]*radius[0]),(filled[1]-center[1])/(radius[1]*radius[1]),(filled[2]-center[2])/(radius[2]*radius[2])],normalLength=Math.hypot(gradient[0],gradient[1],gradient[2])||1,normal=[gradient[0]/normalLength,gradient[1]/normalLength,gradient[2]/normalLength];filled[0]+=normal[0]*.4;filled[1]+=normal[1]*.4;filled[2]+=normal[2]*.4;const result={point:filled,normal};pointCache.set(cacheKey,result);return result;
}

function surfaceBoundaryMesh(mesh:Mesh,key:SurfaceLandmark,width:number,fillStrength:number){
  let cache=surfaceBoundaryCache.get(mesh);if(!cache){cache=new Map;surfaceBoundaryCache.set(mesh,cache)}const cacheKey=`${key}:${width}:${fillStrength}`,existing=cache.get(cacheKey);if(existing)return existing;
  const definition=SURFACE_BOUNDARY_LABELS[key];if(!definition){cache.set(cacheKey,mesh);return mesh}const a=new Set(definition.a),b=new Set(definition.b),edges:[number,number][]=[],seen=new Set<string>();
  for(let face=0;face<mesh.faces.length;face+=3){const vertices=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]];for(const [from,to] of [[vertices[0],vertices[1]],[vertices[1],vertices[2]],[vertices[2],vertices[0]]] as [number,number][]){const left=Math.round(mesh.regions[from]),right=Math.round(mesh.regions[to]);if(!((a.has(left)&&b.has(right))||(b.has(left)&&a.has(right))))continue;const low=Math.min(from,to),high=Math.max(from,to),edge=`${low}:${high}`;if(seen.has(edge))continue;seen.add(edge);edges.push([from,to])}}
  const positions:number[]=[],normals:number[]=[],faces:number[]=[],half=width/2;
  for(const [from,to] of edges){
    const start=locallyFilledSurfacePoint(mesh,from,fillStrength),end=locallyFilledSurfacePoint(mesh,to,fillStrength),p0=start.point,p1=end.point,n0=start.normal,n1=end.normal,t=[p1[0]-p0[0],p1[1]-p0[1],p1[2]-p0[2]],tl=Math.hypot(t[0],t[1],t[2])||1,n=[n0[0]+n1[0],n0[1]+n1[1],n0[2]+n1[2]],nl=Math.hypot(n[0],n[1],n[2])||1;
    t[0]/=tl;t[1]/=tl;t[2]/=tl;n[0]/=nl;n[1]/=nl;n[2]/=nl;
    const s=[t[1]*n[2]-t[2]*n[1],t[2]*n[0]-t[0]*n[2],t[0]*n[1]-t[1]*n[0]],sl=Math.hypot(s[0],s[1],s[2])||1;s[0]=s[0]/sl*half;s[1]=s[1]/sl*half;s[2]=s[2]/sl*half;
    const fromOffset=from*3,toOffset=to*3,original0=[mesh.vertices[fromOffset]+mesh.normals[fromOffset]*.15,mesh.vertices[fromOffset+1]+mesh.normals[fromOffset+1]*.15,mesh.vertices[fromOffset+2]+mesh.normals[fromOffset+2]*.15],original1=[mesh.vertices[toOffset]+mesh.normals[toOffset]*.15,mesh.vertices[toOffset+1]+mesh.normals[toOffset+1]*.15,mesh.vertices[toOffset+2]+mesh.normals[toOffset+2]*.15],bottomSide=[s[0]*.42,s[1]*.42,s[2]*.42],base=positions.length/3;
    positions.push(
      p0[0]+s[0],p0[1]+s[1],p0[2]+s[2], p0[0]-s[0],p0[1]-s[1],p0[2]-s[2],
      p1[0]-s[0],p1[1]-s[1],p1[2]-s[2], p1[0]+s[0],p1[1]+s[1],p1[2]+s[2],
      original0[0]+bottomSide[0],original0[1]+bottomSide[1],original0[2]+bottomSide[2], original0[0]-bottomSide[0],original0[1]-bottomSide[1],original0[2]-bottomSide[2],
      original1[0]-bottomSide[0],original1[1]-bottomSide[1],original1[2]-bottomSide[2], original1[0]+bottomSide[0],original1[1]+bottomSide[1],original1[2]+bottomSide[2],
    );
    normals.push(...n0,...n0,...n1,...n1,...n0,...n0,...n1,...n1);
    faces.push(
      base,base+1,base+2, base,base+2,base+3,
      base+4,base+6,base+5, base+4,base+7,base+6,
      base,base+4,base+5, base,base+5,base+1,
      base+3,base+2,base+6, base+3,base+6,base+7,
      base,base+3,base+7, base,base+7,base+4,
      base+1,base+5,base+6, base+1,base+6,base+2,
    );
  }
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(cacheKey,result);return result;
}

function surfaceRegionUpperRimMesh(mesh:Mesh,ids:number[],width:number,fillStrength:number){
  let cache=surfaceRimCache.get(mesh);if(!cache){cache=new Map;surfaceRimCache.set(mesh,cache)}const cacheKey=`${ids.join(",")}:${width}:${fillStrength}`,existing=cache.get(cacheKey);if(existing)return existing;
  const labels=new Set(ids),rimVertices:number[]=[];
  // Sample the superior temporal region from anterior to posterior.  Selecting
  // its dorsalmost pial point in each short A-P interval makes one continuous
  // Sylvian guide even where atlas labels on the opposite bank contain gaps.
  for(let anteriorPosterior=36;anteriorPosterior>=-24;anteriorPosterior-=2){
    let best=-1,bestSuperior=-Infinity;
    for(let vertex=0;vertex<mesh.regions.length;vertex++){
      if(!labels.has(Math.round(mesh.regions[vertex])))continue;const offset=vertex*3,y=mesh.vertices[offset+1],x=Math.abs(mesh.vertices[offset+2]);
      if(y>anteriorPosterior||y<=anteriorPosterior-2||x<42)continue;
      const superior=mesh.vertices[offset];if(superior>bestSuperior){bestSuperior=superior;best=vertex}
    }
    if(best>=0&&rimVertices[rimVertices.length-1]!==best)rimVertices.push(best);
  }
  const samples=rimVertices.map(index=>locallyFilledSurfacePoint(mesh,index,fillStrength)),positions:number[]=[],normals:number[]=[],faces:number[]=[],half=width/2;
  for(let index=0;index<samples.length-1;index++){
    const start=samples[index],end=samples[index+1],tangent=[end.point[0]-start.point[0],end.point[1]-start.point[1],end.point[2]-start.point[2]],tangentLength=Math.hypot(tangent[0],tangent[1],tangent[2])||1,normal=[start.normal[0]+end.normal[0],start.normal[1]+end.normal[1],start.normal[2]+end.normal[2]],normalLength=Math.hypot(normal[0],normal[1],normal[2])||1;
    tangent[0]/=tangentLength;tangent[1]/=tangentLength;tangent[2]/=tangentLength;normal[0]/=normalLength;normal[1]/=normalLength;normal[2]/=normalLength;const side=[tangent[1]*normal[2]-tangent[2]*normal[1],tangent[2]*normal[0]-tangent[0]*normal[2],tangent[0]*normal[1]-tangent[1]*normal[0]],sideLength=Math.hypot(side[0],side[1],side[2])||1,midAnteriorPosterior=(start.point[1]+end.point[1])/2,anteriorExpansion=Math.max(0,Math.min(1,(midAnteriorPosterior+4)/32)),segmentHalf=half*(1+1.55*anteriorExpansion);side[0]=side[0]/sideLength*segmentHalf;side[1]=side[1]/sideLength*segmentHalf;side[2]=side[2]/sideLength*segmentHalf;
    const base=positions.length/3;positions.push(start.point[0]+side[0],start.point[1]+side[1],start.point[2]+side[2],start.point[0]-side[0],start.point[1]-side[1],start.point[2]-side[2],end.point[0]-side[0],end.point[1]-side[1],end.point[2]-side[2],end.point[0]+side[0],end.point[1]+side[1],end.point[2]+side[2]);normals.push(...normal,...normal,...normal,...normal);faces.push(base,base+1,base+2,base,base+2,base+3);
  }
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(cacheKey,result);return result;
}

function surfaceLevelMesh(mesh:Mesh,ids:number[],axis:0|1|2,level:number,width:number){
  let cache=surfaceLevelCache.get(mesh);if(!cache){cache=new Map;surfaceLevelCache.set(mesh,cache)}const cacheKey=`${ids.join(",")}:${axis}:${level}:${width}`,existing=cache.get(cacheKey);if(existing)return existing;const labels=new Set(ids),positions:number[]=[],normals:number[]=[],faces:number[]=[],half=width/2;
  for(let face=0;face<mesh.faces.length;face+=3){const triangle=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]],crossings:{point:number[];normal:number[]}[]=[];for(const [from,to] of [[triangle[0],triangle[1]],[triangle[1],triangle[2]],[triangle[2],triangle[0]]] as [number,number][]){if(!labels.has(Math.round(mesh.regions[from]))||!labels.has(Math.round(mesh.regions[to])))continue;const fromOffset=from*3,toOffset=to*3,a=mesh.vertices[fromOffset+axis],b=mesh.vertices[toOffset+axis];if((a<level&&b<level)||(a>=level&&b>=level)||Math.abs(b-a)<1e-5)continue;const t=(level-a)/(b-a),point=[0,0,0],normal=[0,0,0];for(let component=0;component<3;component++){point[component]=mesh.vertices[fromOffset+component]+(mesh.vertices[toOffset+component]-mesh.vertices[fromOffset+component])*t;normal[component]=mesh.normals[fromOffset+component]+(mesh.normals[toOffset+component]-mesh.normals[fromOffset+component])*t}const normalLength=Math.hypot(normal[0],normal[1],normal[2])||1;normal[0]/=normalLength;normal[1]/=normalLength;normal[2]/=normalLength;point[0]+=normal[0]*.55;point[1]+=normal[1]*.55;point[2]+=normal[2]*.55;crossings.push({point,normal})}if(crossings.length<2)continue;const start=crossings[0],end=crossings[1],tangent=[end.point[0]-start.point[0],end.point[1]-start.point[1],end.point[2]-start.point[2]],tangentLength=Math.hypot(tangent[0],tangent[1],tangent[2])||1,normal=[start.normal[0]+end.normal[0],start.normal[1]+end.normal[1],start.normal[2]+end.normal[2]],normalLength=Math.hypot(normal[0],normal[1],normal[2])||1;tangent[0]/=tangentLength;tangent[1]/=tangentLength;tangent[2]/=tangentLength;normal[0]/=normalLength;normal[1]/=normalLength;normal[2]/=normalLength;const side=[tangent[1]*normal[2]-tangent[2]*normal[1],tangent[2]*normal[0]-tangent[0]*normal[2],tangent[0]*normal[1]-tangent[1]*normal[0]],sideLength=Math.hypot(side[0],side[1],side[2])||1;side[0]=side[0]/sideLength*half;side[1]=side[1]/sideLength*half;side[2]=side[2]/sideLength*half;const base=positions.length/3;positions.push(start.point[0]+side[0],start.point[1]+side[1],start.point[2]+side[2],start.point[0]-side[0],start.point[1]-side[1],start.point[2]-side[2],end.point[0]-side[0],end.point[1]-side[1],end.point[2]-side[2],end.point[0]+side[0],end.point[1]+side[1],end.point[2]+side[2]);normals.push(...start.normal,...start.normal,...end.normal,...end.normal);faces.push(base,base+1,base+2,base,base+2,base+3)}
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(cacheKey,result);return result;
}

function ventralSurfacePatchMesh(mesh:Mesh,key:"pyramids"|"olives"){
  let cache=ventralSurfacePatchCache.get(mesh);if(!cache){cache=new Map;ventralSurfacePatchCache.set(mesh,cache)}const existing=cache.get(key);if(existing)return existing;
  const frontByBin=new Map<string,number>();
  for(let vertex=0;vertex<mesh.vertices.length;vertex+=3){const z=mesh.vertices[vertex],y=mesh.vertices[vertex+1],x=mesh.vertices[vertex+2],bin=`${Math.round(z/3)},${Math.round(x/3)}`,front=frontByBin.get(bin);if(front===undefined||y>front)frontByBin.set(bin,y)}
  const candidates:{indices:number[];side:0|1}[]=[];
  for(let face=0;face<mesh.faces.length;face+=3){const indices=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]],centroid=[0,0,0];for(const index of indices){const offset=index*3;centroid[0]+=mesh.vertices[offset]/3;centroid[1]+=mesh.vertices[offset+1]/3;centroid[2]+=mesh.vertices[offset+2]/3}const z=centroid[0],y=centroid[1],signedX=centroid[2],x=Math.abs(signedX),bin=`${Math.round(z/3)},${Math.round(signedX/3)}`,frontY=frontByBin.get(bin)??y;if(y<frontY-5)continue;const inside=key==="pyramids"?x>=.8&&x<=7.2&&((x-4.2)/4.2)**2+((z+67)/21)**2<=1:x>=7.2&&((x-12)/7.5)**2+((z+65.5)/18.5)**2<=1;if(inside)candidates.push({indices,side:signedX<0?0:1})}
  const selected:number[]=[];
  for(const side of [0,1] as const){const byVertex=new Map<number,number[]>(),eligible:number[]=[];candidates.forEach((candidate,index)=>{if(candidate.side!==side)return;eligible.push(index);for(const vertex of candidate.indices){const linked=byVertex.get(vertex);if(linked)linked.push(index);else byVertex.set(vertex,[index])}});const seen=new Set<number>();let largest:number[]=[];for(const start of eligible){if(seen.has(start))continue;const component:number[]=[],stack=[start];seen.add(start);while(stack.length){const current=stack.pop()!;component.push(current);for(const vertex of candidates[current].indices)for(const neighbour of byVertex.get(vertex)??[])if(!seen.has(neighbour)){seen.add(neighbour);stack.push(neighbour)}}if(component.length>largest.length)largest=component}selected.push(...largest)}
  const positions:number[]=[],normals:number[]=[],faces:number[]=[];for(const candidateIndex of selected){const base=positions.length/3;for(const index of candidates[candidateIndex].indices){const offset=index*3;positions.push(mesh.vertices[offset],mesh.vertices[offset+1]+.55,mesh.vertices[offset+2]);normals.push(mesh.normals[offset],mesh.normals[offset+1],mesh.normals[offset+2])}faces.push(base,base+1,base+2)}
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(key,result);return result;
}

function brainstemLevelMesh(mesh:Mesh,key:"pons"|"medulla"){
  let cache=brainstemLevelCache.get(mesh);if(!cache){cache=new Map;brainstemLevelCache.set(mesh,cache)}const existing=cache.get(key);if(existing)return existing;const positions:number[]=[],normals:number[]=[],faces:number[]=[];
  for(let face=0;face<mesh.faces.length;face+=3){const source=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]],meanSuperior=source.reduce((sum,index)=>sum+mesh.vertices[index*3],0)/3;if(key==="pons"?meanSuperior< -58:meanSuperior>=-58)continue;const base=positions.length/3;for(const index of source){const offset=index*3;positions.push(mesh.vertices[offset]+mesh.normals[offset]*.35,mesh.vertices[offset+1]+mesh.normals[offset+1]*.35,mesh.vertices[offset+2]+mesh.normals[offset+2]*.35);normals.push(mesh.normals[offset],mesh.normals[offset+1],mesh.normals[offset+2])}faces.push(base,base+1,base+2)}
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(key,result);return result;
}

function midbrainDorsalPatchMesh(mesh:Mesh,key:"superior-colliculi"|"inferior-colliculi"){
  let cache=midbrainDorsalPatchCache.get(mesh);if(!cache){cache=new Map;midbrainDorsalPatchCache.set(mesh,cache)}const existing=cache.get(key);if(existing)return existing;const positions:number[]=[],normals:number[]=[],faces:number[]=[];
  // Colour faces copied from the midbrain shell itself. Keep their coordinates
  // exactly coplanar with that shell; the renderer's tiny depth bias handles
  // z-fighting without turning either colliculus into a floating object.
  for(let face=0;face<mesh.faces.length;face+=3){const source=[mesh.faces[face],mesh.faces[face+1],mesh.faces[face+2]],centroid=[0,0,0];for(const index of source){const offset=index*3;centroid[0]+=mesh.vertices[offset]/3;centroid[1]+=mesh.vertices[offset+1]/3;centroid[2]+=mesh.vertices[offset+2]/3}const superior=centroid[0],posterior=centroid[1],lateral=Math.abs(centroid[2]),inside=key==="superior-colliculi"?superior>=-29&&superior<=-21.5&&posterior<=-18&&lateral>=2&&lateral<=12:superior>=-36&&superior< -28&&posterior<=-19&&lateral>=2&&lateral<=11;if(!inside)continue;const base=positions.length/3;for(const index of source){const offset=index*3;positions.push(mesh.vertices[offset],mesh.vertices[offset+1],mesh.vertices[offset+2]);normals.push(mesh.normals[offset],mesh.normals[offset+1],mesh.normals[offset+2])}faces.push(base,base+1,base+2)}
  const count=positions.length/3,result={vertices:new Float32Array(positions),normals:new Float32Array(normals),shade:new Float32Array(count).fill(1),regions:new Float32Array(count),faces:new Uint32Array(faces)};cache.set(key,result);return result;
}

const idx=(x:number,y:number,z:number,d:[number,number,number])=>x+d[0]*(y+d[1]*z);
function sectionSize(d:[number,number,number],plane:Plane):[number,number]{return plane==="sagittal"?[d[1],d[2]]:plane==="horizontal"?[d[0],d[1]]:[d[0],d[2]]}
function sectionVoxel(a:number,b:number,d:[number,number,number],plane:Plane,p:number):[number,number,number]{const[dx,dy,dz]=d;if(plane==="horizontal")return[a,dy-1-b,Math.round((1-p/100)*(dz-1))];if(plane==="sagittal")return[Math.round(p/100*(dx-1)),a,dz-1-b];return[a,Math.round(p/100*(dy-1)),dz-1-b]}
function viewTransform(w:number,h:number,d:[number,number,number],plane:Plane,zoom:number,pan:{x:number;y:number}){const[sw,sh]=sectionSize(d,plane),fit=Math.min((w-10)/sw,(h-10)/sh),scale=fit*zoom;return{sw,sh,scale,ox:(w-sw*scale)/2+pan.x,oy:(h-sh*scale)/2+pan.y}}
function drawScale(c:CanvasRenderingContext2D,h:number,scale:number,voxelSizeMm:number){const width=20/voxelSizeMm*scale,x=18,y=h-20;c.save();c.strokeStyle="#f0f3f1";c.fillStyle="#f0f3f1";c.lineWidth=1;c.beginPath();c.moveTo(x,y);c.lineTo(x+width,y);c.moveTo(x,y-4);c.lineTo(x,y+3);c.moveTo(x+width,y-4);c.lineTo(x+width,y+3);c.stroke();c.font="16px monospace";c.fillText("20 mm",x,y-7);c.restore()}

function meshHighlightEvidence(meshes:Mesh[]|null,layers:HighlightLayer[]){
  const ids=new Set(layers.flatMap(layer=>layer.ids));
  if(!meshes||ids.size===0)return {selectedVertexCount:0,incidentTriangleCount:0,selectedIds:[...ids]};
  let selectedVertexCount=0,incidentTriangleCount=0;
  for(const mesh of meshes){
    const selected=new Uint8Array(mesh.regions.length);
    for(let vertex=0;vertex<mesh.regions.length;vertex++)if(ids.has(Math.round(mesh.regions[vertex]))){selected[vertex]=1;selectedVertexCount++}
    for(let face=0;face+2<mesh.faces.length;face+=3){
      if(selected[mesh.faces[face]]||selected[mesh.faces[face+1]]||selected[mesh.faces[face+2]])incidentTriangleCount++;
    }
  }
  return {selectedVertexCount,incidentTriangleCount,selectedIds:[...ids]};
}

type QuizVisibilityProjection={builder:"AtlasVolumeCanvas.selected-highlight-alpha-v2";namespace:"surface"|"neurovascular";activeLayer:"surfaceHighlights"|"vessels"|"nerves";sourceMeshes:{path:string;sha256:string}[];selectedIds:number[];hemisphere:"both"|"left"|"right";transform:{rotation:Rotation;zoom:number;pan:{x:number;y:number}};projection:{canvasWidth:number;canvasHeight:number;scale:number;clipPolicy:"canvas-bounds";cullPolicy:"conservative-no-depth"|"disabled-no-depth"};mask:Uint8Array};
type QuizVisibilityCanvas=HTMLCanvasElement&{__quizVisibilityProjectionMask?:QuizVisibilityProjection};
function selectedTriangleProjection(meshes:Mesh[],layers:HighlightLayer[],width:number,height:number,rotation:Rotation,zoom:number,namespace:"surface"|"neurovascular",activeLayer:"surfaceHighlights"|"vessels"|"nerves",hemisphere:"both"|"left"|"right"):QuizVisibilityProjection|null{
  const selectedIds=[...new Set(layers.flatMap(layer=>layer.ids))];if(!selectedIds.length||!meshes.length||width<1||height<1)return null;const ids=new Set(selectedIds),mask=new Uint8Array(width*height),ax=rotation.x*Math.PI/180,ay=rotation.y*Math.PI/180,az=(rotation.z??0)*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az),m=[cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy],scale=zoom*(namespace==="neurovascular"?.88:1);
  const project=(mesh:Mesh,index:number)=>{const offset=index*3,q0=mesh.vertices[offset+2],q1=mesh.vertices[offset]+16,q2=mesh.vertices[offset+1],rx=m[0]*q0+m[3]*q1+m[6]*q2,ry=m[1]*q0+m[4]*q1+m[7]*q2;return [(rx/96*scale*.5+.5)*width,(.5-ry/96*scale*.5)*height] as const};
  const edge=(a:readonly number[],b:readonly number[],x:number,y:number)=>(x-a[0])*(b[1]-a[1])-(y-a[1])*(b[0]-a[0]);
  for(const mesh of meshes){const selected=new Uint8Array(mesh.regions.length);for(let i=0;i<selected.length;i++)if(ids.has(Math.round(mesh.regions[i])))selected[i]=1;for(let face=0;face+2<mesh.faces.length;face+=3){const ia=mesh.faces[face],ib=mesh.faces[face+1],ic=mesh.faces[face+2];if(!selected[ia]&&!selected[ib]&&!selected[ic])continue;const a=project(mesh,ia),b=project(mesh,ib),c=project(mesh,ic),area=edge(a,b,c[0],c[1]);if(Math.abs(area)<1e-6)continue;const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(width-1,Math.ceil(Math.max(a[0],b[0],c[0]))),minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(height-1,Math.ceil(Math.max(a[1],b[1],c[1])));for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){const e0=edge(a,b,x+.5,y+.5),e1=edge(b,c,x+.5,y+.5),e2=edge(c,a,x+.5,y+.5),inside=(e0>=0&&e1>=0&&e2>=0)||(e0<=0&&e1<=0&&e2<=0);if(!inside)continue;const highlightAlpha=(selected[ia]*e1+selected[ib]*e2+selected[ic]*e0)/area;if(highlightAlpha>.5)mask[y*width+x]=1}}}
  const conservative=mask.slice();for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(mask[y*width+x])for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height)conservative[ny*width+nx]=1}const sourceMeshes=meshes.map(mesh=>mesh.auditSource).filter((source):source is {path:string;sha256:string}=>!!source);if(sourceMeshes.length!==meshes.length||!conservative.some(value=>value===1))return null;
  return {builder:"AtlasVolumeCanvas.selected-highlight-alpha-v2",namespace,activeLayer,sourceMeshes,selectedIds,hemisphere,transform:{rotation:{x:rotation.x,y:rotation.y,z:rotation.z??0},zoom,pan:{x:0,y:0}},projection:{canvasWidth:width,canvasHeight:height,scale:namespace==="neurovascular"?.88:1,clipPolicy:"canvas-bounds",cullPolicy:namespace==="surface"?"conservative-no-depth":"disabled-no-depth"},mask:conservative};
}

function sectionHighlightEvidence(segmentation:ManualSeg|null,plane:Plane,position:number,layers:HighlightLayer[]){
  const ids=new Set(layers.flatMap(layer=>layer.ids));
  if(!segmentation||ids.size===0)return {targetVoxelCount:0,projectedWidth:0,projectedHeight:0,selectedIds:[...ids]};
  const[sw,sh]=sectionSize(segmentation.dims,plane);let targetVoxelCount=0;
  for(let b=0;b<sh;b++)for(let a=0;a<sw;a++){const[x,y,z]=sectionVoxel(a,b,segmentation.dims,plane,position);if(ids.has(segmentation.labels[idx(x,y,z,segmentation.dims)]))targetVoxelCount++}
  return {targetVoxelCount,projectedWidth:sw,projectedHeight:sh,selectedIds:[...ids]};
}

export function AtlasVolumeCanvas({kind,plane,position,focus,display,rotation,view="inside",contrast="t1",highlights=[],surfaceHighlights=[],surfaceLandmarks=[],surfaceDeepLandmarks=[],neurovascularHighlights=[],quizVisibilityExpectedHighlights=[],specimenLayers=[],specimenTissueMode="solid",selectionMeshLayers=[],onIdentify,onSurfaceIdentify,onViewChange,onWebGLUnavailableChange,showFocus=true,showCutPlane=true,showZoomControls=true,hemisphere="both",showCerebellum=true,showPonsMedulla=true,showMidbrain=true,specimenBlock="none",blockContext="none",neurovascularOverlay="none",showBrainstemNerves=true,showBasalLandmarks=false,basalLandmark="all",basalHighlights=[],basalOnlySelected=false,surfaceAriaLabel}:{kind:"surface"|"slice";plane:Plane;position:number;focus:Focus;display:Display;rotation:Rotation;view?:"inside"|"ghost"|"extracted"|"segmented";contrast?:"t1"|"t2"|"bigbrain"|"single";highlights?:HighlightLayer[];surfaceHighlights?:HighlightLayer[];surfaceLandmarks?:SurfaceLandmark[];surfaceDeepLandmarks?:SurfaceDeepLandmark[];neurovascularHighlights?:HighlightLayer[];quizVisibilityExpectedHighlights?:HighlightLayer[];specimenLayers?:string[];specimenTissueMode?:SpecimenTissueMode;selectionMeshLayers?:SelectionMeshLayer[];onIdentify?:(point:IdentifiedPoint)=>void;onSurfaceIdentify?:(point:SurfaceIdentifiedPoint)=>void;onViewChange?:()=>void;onWebGLUnavailableChange?:(unavailable:boolean)=>void;showFocus?:boolean;showCutPlane?:boolean;showZoomControls?:boolean;hemisphere?:"both"|"left"|"right";showCerebellum?:boolean;showPonsMedulla?:boolean;showMidbrain?:boolean;specimenBlock?:SpecimenBlock;blockContext?:BlockContextSpecimen;neurovascularOverlay?:NeurovascularOverlay;showBrainstemNerves?:boolean;showBasalLandmarks?:boolean;basalLandmark?:BasalLandmark;basalHighlights?:BasalLandmark[];basalOnlySelected?:boolean;surfaceAriaLabel?:string}){
  const ref=useRef<HTMLCanvasElement>(null),panDrag=useRef<{x:number;y:number;pan:{x:number;y:number}}|null>(null),surfaceClick=useRef<{x:number;y:number;moved:boolean}|null>(null),[data,setData]=useState<Volume|null>(null),[bigBrain,setBigBrain]=useState<BigBrain|null>(null),[fixedBrain,setFixedBrain]=useState<FixedBrain|null>(null),[manualSeg,setManualSeg]=useState<ManualSeg|null>(null),[meshes,setMeshes]=useState<{surface:Mesh[];segments:Mesh[];overlays:Mesh[];basal:Mesh[];deep:Mesh[];landmarks:Mesh[]}|null>(null),[selectionLayers,setSelectionLayers]=useState<{meshes:Mesh[];color:[number,number,number]}[]>([]),[blockMeshes,setBlockMeshes]=useState<LoadedSpecimenPart[]|null>(null),[blockContextMesh,setBlockContextMesh]=useState<Mesh|null>(null),[error,setError]=useState(""),[retryVersion,setRetryVersion]=useState(0),[sizeVersion,setSizeVersion]=useState(0),[webglUnavailable,setWebglUnavailable]=useState(false),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0});
  const [downloadProgress,setDownloadProgress]=useState(()=>atlasDownloadProgress.snapshot());
  const surfaceLandmarkKey=surfaceLandmarks.join(","),surfaceDeepLandmarkKey=surfaceDeepLandmarks.join(",");
  const quizVisibilityEvidenceEnabled=quizVisibilityAuditEnabled();
  const surfaceMeshEvidence=quizVisibilityEvidenceEnabled?meshHighlightEvidence(meshes?.surface.slice(0,2)??null,surfaceHighlights):null;
  const neurovascularEvidenceMeshes=!quizVisibilityEvidenceEnabled||!meshes?null:neurovascularOverlay==="vessels"?meshes.overlays.slice(0,2):neurovascularOverlay==="nerves"?meshes.overlays.slice(2,5):neurovascularOverlay==="both"?meshes.overlays:null;
  const neurovascularMeshEvidence=quizVisibilityEvidenceEnabled?meshHighlightEvidence(neurovascularEvidenceMeshes,neurovascularHighlights):null;
  const sectionEvidence=quizVisibilityEvidenceEnabled?sectionHighlightEvidence(manualSeg,plane,position,highlights):null;
  useEffect(()=>atlasDownloadProgress.subscribe(setDownloadProgress),[]);
  useEffect(()=>{if(kind!=="slice")return;retainLargeVolumeCaches();return releaseLargeVolumeCaches},[kind]);
  useEffect(()=>{if(kind!=="surface")return;retainSurfaceMeshCaches();return releaseSurfaceMeshCaches},[kind]);
  useEffect(()=>{if(kind==="slice"&&(contrast==="t1"||contrast==="t2")){setError("");loadVolume().then(setData).catch(e=>setError(String(e)))}},[kind,contrast,retryVersion]);
  useEffect(()=>{
    if(kind!=="surface")return;
    if(specimenBlock!=="none"){setMeshes({surface:[],segments:[],overlays:[],basal:[],deep:[],landmarks:[]});return}
    let active=true;setError("");
    const segmented=view==="segmented",wantVessels=neurovascularOverlay==="vessels"||neurovascularOverlay==="both",wantNerves=neurovascularOverlay==="nerves"||neurovascularOverlay==="both";
    const loadOptional=(needed:boolean,name:string)=>needed?loadMesh(name):Promise.resolve(EMPTY_MESH);
    Promise.all([
      loadMesh("pial-left"),loadMesh("pial-right"),loadMesh("segment-cerebellum"),loadMesh("segment-pons-medulla"),loadMesh("segment-midbrain"),
      loadOptional(segmented,"segment-deep"),loadOptional(segmented,"segment-ventricles"),
      loadOptional(wantVessels,"overlay-arteries-anterior"),loadOptional(wantVessels,"overlay-arteries-posterior"),loadOptional(wantNerves,"overlay-nerves-anterior"),loadOptional(wantNerves,"overlay-nerves-pontine"),loadOptional(wantNerves,"overlay-nerves-medullary"),
      ...["landmark-olfactory-pathway","landmark-optic-pathway","landmark-infundibulum","landmark-mammillary-bodies","landmark-anterior-perforated-substance","block-midbrain-section-cerebral-peduncles","block-hindbrain-pyramids","block-hindbrain-olives"].map(name=>loadOptional(showBasalLandmarks,name)),
      ...SURFACE_DEEP_LANDMARKS.map(item=>loadOptional(surfaceDeepLandmarks.includes(item.key)||(showBasalLandmarks&&item.key==="hypothalamus"),item.key==="corpus-callosum"?"block-commissural-system-corpus-callosum":item.key==="septum-pellucidum"?"block-commissural-system-septum-pellucidum":item.key==="fornix"?"block-commissural-system-fornix":item.key==="thalami"?"block-diencephalon-thalami":"block-diencephalon-hypothalamus")),
      ...SURFACE_LANDMARKS.map(item=>loadOptional(surfaceLandmarks.includes(item.key),`surface-landmark-${item.key}`)),
    ]).then(([left,right,cerebellum,ponsMedulla,midbrain,deep,ventricles,...rest])=>{if(active)setMeshes({surface:[left,right,cerebellum,ponsMedulla,midbrain],segments:[left,right,cerebellum,ponsMedulla,midbrain,deep,ventricles],overlays:rest.slice(0,5),basal:rest.slice(5,13),deep:rest.slice(13,18),landmarks:rest.slice(18)})}).catch(e=>{if(active)setError(String(e))});
    return()=>{active=false};
  },[kind,specimenBlock,view,neurovascularOverlay,showBasalLandmarks,surfaceLandmarkKey,surfaceDeepLandmarkKey,retryVersion]);
  useEffect(()=>{
    if(kind!=="surface"||specimenBlock==="none"){setBlockMeshes(null);return}
    let active=true;setBlockMeshes(null);setError("");
    const definitions=SPECIMEN_PARTS[specimenBlock];
    Promise.all(definitions.map(async definition=>({definition,mesh:await loadMesh(definition.asset??`block-${specimenBlock}-${definition.key}`)})))
      .then(parts=>{if(active)setBlockMeshes(parts)})
      .catch(e=>{if(active)setError(String(e))});
    return()=>{active=false};
  },[kind,specimenBlock,retryVersion]);
  useEffect(()=>{
    if(kind!=="surface"||blockContext==="none"||specimenBlock!=="none"){setBlockContextMesh(null);return}
    let active=true;setBlockContextMesh(null);setError("");
    const definitions=SPECIMEN_PARTS[blockContext].filter(definition=>definition.material===4);
    Promise.all(definitions.map(definition=>loadMesh(definition.asset??`block-${blockContext}-${definition.key}`)))
      .then(parts=>{if(active)setBlockContextMesh(parts.length===1?parts[0]:mergeMeshes(parts))})
      .catch(e=>{if(active)setError(String(e))});
    return()=>{active=false};
  },[kind,blockContext,specimenBlock,retryVersion]);
  const selectionLayerKey=selectionMeshLayers.map(layer=>`${layer.files.join(",")}:${layer.color.join(",")}`).join("|");
  useEffect(()=>{if(kind!=="surface"||!selectionMeshLayers.length){setSelectionLayers([]);return}let active=true;Promise.all(selectionMeshLayers.map(async layer=>({meshes:await Promise.all(layer.files.map(loadMesh)),color:layer.color}))).then(layers=>{if(active)setSelectionLayers(layers)}).catch(e=>{if(active){setSelectionLayers([]);setError(String(e))}});return()=>{active=false}},[kind,selectionLayerKey,retryVersion]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain"){setError("");loadBigBrain().then(setBigBrain).catch(e=>setError(String(e)))}},[kind,contrast,retryVersion]);
  useEffect(()=>{if(kind==="slice"&&contrast==="single"){setError("");loadFixedBrain().then(setFixedBrain).catch(e=>setError(String(e)))}},[kind,contrast,retryVersion]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain")loadManualSeg("icbm500").then(setManualSeg).catch(e=>setError(String(e)));else setManualSeg(null)},[kind,contrast,retryVersion]);
  useEffect(()=>{
    if(!error)return;
    const retry=()=>{
      setError("");
      atlasDownloadProgress.reset();
      if(kind==="surface"){meshCache.clear();setMeshes(null);setBlockMeshes(null);setSelectionLayers([])}
      else if(contrast==="bigbrain"){bigBrainCache=null;manualSegCache.delete("icbm500");setBigBrain(null);setManualSeg(null)}
      else if(contrast==="single"){fixedBrainCache=null;setFixedBrain(null)}
      else{volumeCache=null;setData(null)}
      setRetryVersion(value=>value+1);
    };
    window.addEventListener(ATLAS_RETRY_EVENT,retry);
    return()=>window.removeEventListener(ATLAS_RETRY_EVENT,retry);
  },[error,kind,contrast]);
  useEffect(()=>{const el=ref.current;if(!el||typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(()=>setSizeVersion(value=>value+1));observer.observe(el);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(kind==="slice"){setZoom(1);setPan({x:0,y:0})}},[kind,plane,contrast]);
  useEffect(()=>{const el=ref.current;if(!el)return;const dpr=Math.min(devicePixelRatio||1,2),w=el.clientWidth,h=el.clientHeight;if(w<1||h<1)return;el.width=w*dpr;el.height=h*dpr;const labelColors=new Map<number,[number,number,number]>();highlights.forEach(layer=>layer.ids.forEach(id=>labelColors.set(id,layer.color)));if(kind==="slice"&&contrast==="single"&&fixedBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawFixedSlice(c,w,h,fixedBrain,plane,position,display,DISPLAY_TONE,zoom,pan)}}else if(kind==="slice"&&contrast==="bigbrain"&&bigBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,null,bigBrain,manualSeg,plane,position,display,"bigbrain",DISPLAY_TONE,labelColors,zoom,pan)}}else if(kind==="slice"&&data){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,data,null,null,plane,position,display,contrast==="t2"?"t2":"t1",DISPLAY_TONE,labelColors,zoom,pan)}}else if(kind==="surface"&&meshes&&(specimenBlock==="none"||blockMeshes)){const localHost=location.hostname==="127.0.0.1"||location.hostname==="localhost",mockUnavailable=(import.meta.env.DEV||localHost)&&new URLSearchParams(location.search).has("mock-webgl-unavailable"),unavailable=mockUnavailable||!drawWebGL(el,selectionLayers,meshes.surface,meshes.segments,meshes.overlays,meshes.basal,meshes.deep,meshes.landmarks,blockMeshes,blockContextMesh,rotation,plane,position,view,showFocus,contrast,showCutPlane,hemisphere,showCerebellum,showPonsMedulla,showMidbrain,neurovascularOverlay,showBrainstemNerves,surfaceHighlights,surfaceLandmarks,surfaceDeepLandmarks,neurovascularHighlights,specimenLayers,specimenTissueMode,showBasalLandmarks,basalLandmark,basalHighlights,basalOnlySelected,specimenBlock,blockContext,zoom);setWebglUnavailable(unavailable);onWebGLUnavailableChange?.(unavailable)}},[data,bigBrain,fixedBrain,manualSeg,meshes,selectionLayers,blockMeshes,blockContextMesh,kind,plane,position,focus,display,rotation,view,contrast,sizeVersion,highlights,surfaceHighlights,surfaceLandmarks,surfaceDeepLandmarks,neurovascularHighlights,specimenLayers,specimenTissueMode,showFocus,showCutPlane,hemisphere,showCerebellum,showPonsMedulla,showMidbrain,specimenBlock,blockContext,neurovascularOverlay,showBrainstemNerves,showBasalLandmarks,basalLandmark,basalHighlights,basalOnlySelected,zoom,pan,onWebGLUnavailableChange]);
  useEffect(()=>{const canvas=ref.current as QuizVisibilityCanvas|null;if(!canvas)return;if(!quizVisibilityEvidenceEnabled||kind!=="surface"||!meshes){delete canvas.__quizVisibilityProjectionMask;return}const neuro=neurovascularOverlay!=="none",sourceMeshes=neuro?(neurovascularEvidenceMeshes??[]):meshes.surface.slice(0,2).filter((_,index)=>hemisphere==="both"||(hemisphere==="left"?index===0:index===1)),activeLayer=neuro?(neurovascularOverlay==="vessels"?"vessels":"nerves"):"surfaceHighlights";canvas.__quizVisibilityProjectionMask=selectedTriangleProjection(sourceMeshes,quizVisibilityExpectedHighlights,canvas.width,canvas.height,rotation,zoom,neuro?"neurovascular":"surface",activeLayer,hemisphere)??undefined},[quizVisibilityEvidenceEnabled,kind,meshes,neurovascularEvidenceMeshes,neurovascularOverlay,hemisphere,quizVisibilityExpectedHighlights,rotation,zoom,sizeVersion]);
  function sourceForView(){return contrast==="single"?fixedBrain:contrast==="bigbrain"?bigBrain:data}
  function identify(e:React.PointerEvent<HTMLCanvasElement>){const el=ref.current;if(kind!=="slice"||!el||!onIdentify||contrast==="single")return;const source=contrast==="bigbrain"?bigBrain:data;if(!source)return;const direct=contrast==="bigbrain";if((direct&&!manualSeg)||(!direct&&!data))return;const rect=el.getBoundingClientRect(),w=el.clientWidth,h=el.clientHeight,{sw,sh,scale,ox,oy}=viewTransform(w,h,source.dims,plane,zoom,pan),a=Math.floor((e.clientX-rect.left-ox)/scale),b=Math.floor((e.clientY-rect.top-oy)/scale);if(a<0||a>=sw||b<0||b>=sh){onIdentify({id:0,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty:direct?"manual":"atlas"});return}const voxel=sectionVoxel(a,b,source.dims,plane,position),sourceIndex=idx(voxel[0],voxel[1],voxel[2],source.dims),inside=direct?!!bigBrain&&bigBrain.values[sourceIndex]<252:!!data&&data.mask[sourceIndex]>0;let id=direct?manualSeg!.labels[sourceIndex]:inside?data!.labels[sourceIndex]:0;if(!direct&&inside&&id===0){const gm=data!.gm[sourceIndex],wm=data!.wm[sourceIndex],csf=data!.csf[sourceIndex];id=wm>=gm&&wm>=csf?201:gm>=csf?202:203}const certainty=direct&&[39,40].includes(id)?"reviewed":direct&&id>22?"provisional":direct?"manual":"atlas";onIdentify({id,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty})}
  function identifySurface(e:React.PointerEvent<HTMLCanvasElement>){const el=ref.current;if(kind!=="surface"||!el||!meshes||!onSurfaceIdentify)return;const rect=el.getBoundingClientRect(),w=el.clientWidth,h=el.clientHeight,targetX=e.clientX-rect.left,targetY=e.clientY-rect.top,ax=rotation.x*Math.PI/180,ay=rotation.y*Math.PI/180,az=(rotation.z??0)*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az),m=[cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy],pial=hemisphere==="left"?[meshes.surface[0]]:hemisphere==="right"?[meshes.surface[1]]:meshes.surface.slice(0,2),candidates:{mesh:Mesh;source:"surface"|"neurovascular"}[]=[...pial.map(mesh=>({mesh,source:"surface" as const}))];if(neurovascularOverlay==="vessels"||neurovascularOverlay==="both")candidates.push({mesh:meshes.overlays[0],source:"neurovascular"},{mesh:meshes.overlays[1],source:"neurovascular"});if(neurovascularOverlay==="nerves"||neurovascularOverlay==="both")candidates.push({mesh:meshes.overlays[2],source:"neurovascular"},{mesh:meshes.overlays[3],source:"neurovascular"},{mesh:meshes.overlays[4],source:"neurovascular"});let bestId=0,bestSource:"surface"|"neurovascular"="surface",bestDepth=Infinity,bestDistance=Infinity;for(const candidate of candidates){const mesh=candidate.mesh;for(let index=0;index<mesh.regions.length;index++){const id=Math.round(mesh.regions[index]);if(id<=0)continue;const offset=index*3,qx=mesh.vertices[offset+2],qy=mesh.vertices[offset]+16,qz=mesh.vertices[offset+1],rx=m[0]*qx+m[3]*qy+m[6]*qz,ry=m[1]*qx+m[4]*qy+m[7]*qz,rz=m[2]*qx+m[5]*qy+m[8]*qz,screenX=(rx/96*zoom+1)*w/2,screenY=(1-ry/96*zoom)*h/2,dx=screenX-targetX,dy=screenY-targetY,distance=dx*dx+dy*dy;if(distance>196)continue;if(rz<bestDepth-1||(Math.abs(rz-bestDepth)<=1&&distance<bestDistance)){bestId=id;bestSource=candidate.source;bestDepth=rz;bestDistance=distance}}}if(bestId)onSurfaceIdentify({source:bestSource,id:bestId})}
  function handleWheel(e:React.WheelEvent<HTMLCanvasElement>){if(kind==="surface"){e.preventDefault();setZoom(previous=>Math.max(.7,Math.min(2.4,previous*Math.exp(-e.deltaY*.0015))));onViewChange?.();return}const source=sourceForView();if(!source)return;e.preventDefault();const el=e.currentTarget,rect=el.getBoundingClientRect(),localX=e.clientX-rect.left,localY=e.clientY-rect.top,w=el.clientWidth,h=el.clientHeight;setZoom(previous=>{const next=Math.max(.75,Math.min(5,previous*Math.exp(-e.deltaY*.0015)));if(Math.abs(next-previous)<.0001)return previous;setPan(current=>{const oldView=viewTransform(w,h,source.dims,plane,previous,current),nextBase=viewTransform(w,h,source.dims,plane,next,{x:0,y:0}),imageX=(localX-oldView.ox)/oldView.scale,imageY=(localY-oldView.oy)/oldView.scale;return{x:localX-imageX*nextBase.scale-nextBase.ox,y:localY-imageY*nextBase.scale-nextBase.oy}});onViewChange?.();return next})}
  function pointerDown(e:React.PointerEvent<HTMLCanvasElement>){if(kind==="surface"&&onSurfaceIdentify)surfaceClick.current={x:e.clientX,y:e.clientY,moved:false};if(kind==="slice"&&(e.button===1||e.shiftKey)){e.currentTarget.setPointerCapture(e.pointerId);panDrag.current={x:e.clientX,y:e.clientY,pan};return}identify(e)}
  function pointerMove(e:React.PointerEvent<HTMLCanvasElement>){if(surfaceClick.current&&Math.hypot(e.clientX-surfaceClick.current.x,e.clientY-surfaceClick.current.y)>5)surfaceClick.current.moved=true;const drag=panDrag.current;if(!drag)return;setPan({x:drag.pan.x+e.clientX-drag.x,y:drag.pan.y+e.clientY-drag.y});onViewChange?.()}
  function pointerUp(e:React.PointerEvent<HTMLCanvasElement>){if(surfaceClick.current){const click=surfaceClick.current;surfaceClick.current=null;if(!click.moved)identifySurface(e)}if(panDrag.current)panDrag.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId)}
  function pointerCancel(){surfaceClick.current=null;panDrag.current=null}
  function resetView(){setZoom(1);setPan({x:0,y:0});onViewChange?.()}
  function adjustSurfaceZoom(factor:number){setZoom(previous=>Math.max(.7,Math.min(2.4,previous*factor)));onViewChange?.()}
  function retryLoad(){window.dispatchEvent(new Event(ATLAS_RETRY_EVENT))}
  const loadingTitle=specimenBlock==="model-strategy-ventricle"?"比較用模式モデルを読み込み中…":specimenBlock!=="none"?"局所標本を読み込み中…":blockContext!=="none"?"全脳と標本位置を読み込み中…":contrast==="single"?"0.444 mm 単一固定脳を読み込み中…":contrast==="bigbrain"?"組織切片データを読み込み中…":"1 mm 解剖データを読み込み中…";
  const measuredProgress=downloadProgress.total!==null&&downloadProgress.percent!==null;
  const progressText=downloadProgress.phase==="processing"?"受信完了・展開中…":measuredProgress?`${formatDownloadBytes(downloadProgress.loaded)} / ${formatDownloadBytes(downloadProgress.total!)}（${downloadProgress.percent}%）`:downloadProgress.loaded>0?`${formatDownloadBytes(downloadProgress.loaded)} 受信済み（総量不明）`:"受信準備中…";
  const ready=kind==="slice"?(contrast==="single"?!!fixedBrain:contrast==="bigbrain"?!!bigBrain&&!!manualSeg:!!data):!!meshes&&(specimenBlock==="none"||!!blockMeshes)&&(blockContext==="none"||!!blockContextMesh);return <><canvas ref={ref} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={pointerCancel} onWheel={handleWheel} onDoubleClick={resetView} className={`atlasCanvas ${(kind==="slice"&&onIdentify)||(kind==="surface"&&onSurfaceIdentify)?"identifiable":""} ${zoom>1.01?"zoomed":""}`} data-atlas-zoom={zoom} data-atlas-rotation-x={rotation.x} data-atlas-rotation-y={rotation.y} data-atlas-rotation-z={rotation.z??0} data-atlas-surface-selected-vertex-count={surfaceMeshEvidence?.selectedVertexCount} data-atlas-surface-incident-triangle-count={surfaceMeshEvidence?.incidentTriangleCount} data-atlas-surface-selected-ids={surfaceMeshEvidence?.selectedIds.join(",")} data-atlas-neurovascular-selected-vertex-count={neurovascularMeshEvidence?.selectedVertexCount} data-atlas-neurovascular-incident-triangle-count={neurovascularMeshEvidence?.incidentTriangleCount} data-atlas-neurovascular-selected-ids={neurovascularMeshEvidence?.selectedIds.join(",")} data-atlas-neurovascular-layer={quizVisibilityEvidenceEnabled?neurovascularOverlay:undefined} data-atlas-section-target-voxel-count={sectionEvidence?.targetVoxelCount} data-atlas-section-projected-width={sectionEvidence?.projectedWidth} data-atlas-section-projected-height={sectionEvidence?.projectedHeight} aria-hidden={kind==="surface"&&webglUnavailable?true:undefined} aria-label={kind==="surface"?(surfaceAriaLabel??`${specimenBlock==="none"?"MNI高密度皮質表面モデル":"0.5 mm標本から構成した局所3D標本"}${blockContext!=="none"?"と収録済み標本の位置目安":""}${neurovascularOverlay!=="none"?"と模式3D神経血管レイヤー":""}。ホイールで拡大縮小${showZoomControls?"、画面ボタンでも操作可能":""}${onSurfaceIdentify?"、クリックで構造を選択":""}`):`${plane}断面 ${position}。ホイールで拡大縮小、Shiftドラッグで移動`}/>{kind==="surface"&&showZoomControls&&!webglUnavailable?<div className="modelZoomControls" aria-label="3D表示の拡大縮小" onPointerDown={event=>event.stopPropagation()}><button type="button" onClick={()=>adjustSurfaceZoom(1/1.15)} aria-label="縮小">−</button><button type="button" onClick={resetView} title="100%に戻す" aria-label="拡大率を100パーセントに戻す">{Math.round(zoom*100)}%</button><button type="button" onClick={()=>adjustSurfaceZoom(1.15)} aria-label="拡大">＋</button></div>:kind==="slice"&&Math.abs(zoom-1)>.01&&<button type="button" className="zoomReadout" onClick={resetView} title="表示を等倍に戻す">{Math.round(zoom*100)}% <small>リセット</small></button>}{kind==="surface"&&webglUnavailable&&<div className="atlasWebglFallback" role="alert" aria-live="assertive" onPointerDown={event=>event.stopPropagation()}><b>3Dを表示できません</b><p>この環境では3Dを表示できません。WebGL対応ブラウザ、PCまたは横向きタブレットでお試しください。</p></div>}{(!ready||error)&&(error?<div className="atlasLoading error" role="alert"><b>データを読み込めませんでした</b><button type="button" onClick={retryLoad}>再読み込み</button></div>:<span className="atlasLoading" role="status" aria-live="polite"><span>{loadingTitle}</span><span className="atlasLoadingValue">{progressText}</span><progress aria-label="データ読込の進捗" aria-valuetext={progressText} value={measuredProgress?downloadProgress.loaded:undefined} max={measuredProgress?downloadProgress.total!:undefined}/></span>)}</>;
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
      if(contrast==="t2"){
        r=ng*160+nw*105+nc*222+texture-edge+grain;g=ng*143+nw*97+nc*210+texture*.8-edge*.75+grain;b=ng*125+nw*90+nc*188+texture*.55-edge*.45;
      }else{
        r=ng*139+nw*198+nc*48+texture-edge+grain;g=ng*119+nw*186+nc*50+texture*.8-edge*.75+grain;b=ng*100+nw*158+nc*48+texture*.55-edge*.45;
      }
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

function drawWebGL(canvas:HTMLCanvasElement,selectionLayers:{meshes:Mesh[];color:[number,number,number]}[],surface:Mesh[],segments:Mesh[],overlays:Mesh[],basal:Mesh[],deep:Mesh[],landmarks:Mesh[],blockMeshes:LoadedSpecimenPart[]|null,blockContextMesh:Mesh|null,rot:Rotation,plane:Plane,position:number,view:"inside"|"ghost"|"extracted"|"segmented",showFocus:boolean,contrast:"t1"|"t2"|"bigbrain"|"single",showCutPlane:boolean,hemisphere:"both"|"left"|"right",showCerebellum:boolean,showPonsMedulla:boolean,showMidbrain:boolean,neurovascularOverlay:NeurovascularOverlay,showBrainstemNerves:boolean,surfaceHighlights:HighlightLayer[],surfaceLandmarks:SurfaceLandmark[],surfaceDeepLandmarks:SurfaceDeepLandmark[],neurovascularHighlights:HighlightLayer[],specimenLayers:string[],specimenTissueMode:SpecimenTissueMode,showBasalLandmarks:boolean,basalLandmark:BasalLandmark,basalHighlights:BasalLandmark[],basalOnlySelected:boolean,specimenBlock:SpecimenBlock,blockContext:BlockContextSpecimen,zoom:number):boolean{
  const targetCanvas=canvas;canvas=atlasRenderCanvas(targetCanvas.width,targetCanvas.height);
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true});if(!gl)return false;const vs=`attribute vec3 p,n;attribute float a;attribute vec4 h;uniform mat3 r;uniform float scale,depthBias;varying float l,s,rim;varying vec3 anatomy;varying vec4 highlight;void main(){vec3 q=vec3(p.z,p.x,p.y);anatomy=q;vec3 nn=normalize(r*vec3(n.z,n.x,n.y));q.y+=16.;q=r*q;float key=max(dot(nn,normalize(vec3(-.46,.55,.72))),0.);float fill=max(dot(nn,normalize(vec3(.72,.18,.48))),0.);l=.16+.72*pow(key,.70)+.20*fill;rim=pow(1.-abs(nn.z),2.2);s=a;highlight=h;gl_Position=vec4(q.x/96.*scale,q.y/96.*scale,q.z/138.*scale-depthBias,1.);}`;const fs=`precision mediump float;uniform vec4 color;uniform float clipOn,clipAxis,clipValue,material,hemiMode,selectedOpacity;varying float l,s,rim;varying vec3 anatomy;varying vec4 highlight;void main(){float q=clipAxis<.5?anatomy.x:(clipAxis<1.5?anatomy.y:anatomy.z);if(clipOn>.5&&q<clipValue)discard;if(hemiMode<-.5&&anatomy.x>0.)discard;if(hemiMode>.5&&anatomy.x<0.)discard;vec3 outColor;if(material<.5){float sulcus=pow(clamp((1.-s)/.56,0.,1.),.62);vec3 lit=color.rgb*(.40+.76*min(l,1.));outColor=mix(lit,vec3(.045,.060,.067),sulcus*.86)+vec3(.18,.22,.24)*rim*.28;}else if(material<1.5){float gloss=pow(max(l-.34,0.),2.2);outColor=color.rgb*(.58+.62*min(l,1.))+vec3(.24)*gloss+vec3(.16)*rim*.22;}else if(material<2.5){float groove=pow(clamp((1.-s)/.56,0.,1.),.7);outColor=mix(color.rgb*(.48+.66*min(l,1.)),color.rgb*.33,groove*.68)+vec3(.10)*rim*.18;}else if(material<3.5){outColor=color.rgb;}else{float tissue=smoothstep(.02,.98,s);vec3 hist=mix(vec3(.25,.15,.095),vec3(.91,.80,.62),tissue);hist=mix(hist,hist*color.rgb,0.16);outColor=hist*(.48+.64*min(l,1.))+vec3(.15,.12,.09)*rim*.20;}if(highlight.a>.5)outColor=mix(outColor,highlight.rgb,.78);float outputAlpha=mix(color.a,selectedOpacity,clamp(highlight.a,0.,1.));gl_FragColor=vec4(outColor,outputAlpha);}`;const prog=gl.createProgram()!,vertexShader=shader(gl,gl.VERTEX_SHADER,vs),fragmentShader=shader(gl,gl.FRAGMENT_SHADER,fs);gl.attachShader(prog,vertexShader);gl.attachShader(prog,fragmentShader);gl.linkProgram(prog);gl.deleteShader(vertexShader);gl.deleteShader(fragmentShader);gl.useProgram(prog);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.10,.12,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);const specimenScale=specimenBlock==="midbrain-section"?2:specimenBlock==="medial-temporal"?1.3:specimenBlock==="diencephalon"?1.18:1;gl.uniform1f(gl.getUniformLocation(prog,"scale"),zoom*specimenScale);gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),0);gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),0);gl.uniform1f(gl.getUniformLocation(prog,"selectedOpacity"),TEACHING_OVERLAY_SELECTED_OPACITY);
  if(neurovascularOverlay!=="none")gl.uniform1f(gl.getUniformLocation(prog,"scale"),zoom*.88);
  const ax=rot.x*Math.PI/180,ay=rot.y*Math.PI/180,az=(rot.z??0)*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),cz=Math.cos(az),sz=Math.sin(az),m=new Float32Array([cz*cy-sz*sx*sy,sz*cy+cz*sx*sy,-cx*sy,-sz*cx,cz*cx,sx,cz*sy+sz*sx*cy,sz*sy-cz*sx*cy,cx*cy]);gl.uniformMatrix3fv(gl.getUniformLocation(prog,"r"),false,m);
  const axis=plane==="sagittal"?0:plane==="horizontal"?1:2,clip=cutCoordinate(plane,position,contrast);gl.uniform1f(gl.getUniformLocation(prog,"clipAxis"),axis);gl.uniform1f(gl.getUniformLocation(prog,"clipValue"),clip);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);
  const ext=gl.getExtension("OES_element_index_uint");if(!ext){gl.deleteProgram(prog);return false}const draw=(mesh:Mesh,color:number[],material:number,mode:number=gl.TRIANGLES,highlights:HighlightLayer[]=[])=>{const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);const pa=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(pa);gl.vertexAttribPointer(pa,3,gl.FLOAT,false,0,0);const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);const na=gl.getAttribLocation(prog,"n");gl.enableVertexAttribArray(na);gl.vertexAttribPointer(na,3,gl.FLOAT,false,0,0);const sb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,mesh.shade,gl.STATIC_DRAW);const sa=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(sa);gl.vertexAttribPointer(sa,1,gl.FLOAT,false,0,0);const hb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,hb);gl.bufferData(gl.ARRAY_BUFFER,vertexHighlights(mesh,highlights),gl.STATIC_DRAW);const ha=gl.getAttribLocation(prog,"h");gl.enableVertexAttribArray(ha);gl.vertexAttribPointer(ha,4,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.faces,gl.STATIC_DRAW);gl.uniform4fv(gl.getUniformLocation(prog,"color"),new Float32Array(color));gl.uniform1f(gl.getUniformLocation(prog,"material"),material);gl.drawElements(mode,mesh.faces.length,gl.UNSIGNED_INT,0);gl.deleteBuffer(pb);gl.deleteBuffer(nb);gl.deleteBuffer(sb);gl.deleteBuffer(hb);gl.deleteBuffer(ib)};
  const visibleSurface=surface.filter((_,i)=>(showCerebellum||i!==2)&&(showPonsMedulla||i!==3)&&(showMidbrain||i!==4)&&(hemisphere==="both"||i>1||(hemisphere==="left"?i===0:i===1)));
  const visibleSegments=segments.filter((_,i)=>(showCerebellum||i!==2)&&(showPonsMedulla||i!==3)&&(showMidbrain||i!==4)&&(hemisphere==="both"||i>1||(hemisphere==="left"?i===0:i===1)));
  const visibleBlocks=blockMeshes?.filter(part=>(showCerebellum||part.definition.key!=="cerebellum")&&(showPonsMedulla||(part.definition.key!=="pons-medulla"&&part.definition.attachment!=="pons-medulla"))&&(!part.definition.layer||specimenLayers.includes(part.definition.layer)));
  const contextOverlay=blockContext!=="none"&&specimenBlock==="none"&&!!blockContextMesh;
  const ghostSurface=view==="ghost"&&blockMeshes===null&&!contextOverlay;
  const drawSurfaceShell=()=>{
    const alpha=view==="ghost"?SURFACE_GHOST_OPACITY:view==="extracted"?.92:1;
    const shellColors=[[.78,.80,.79,alpha],[.84,.85,.83,alpha],[.62,.54,.42,alpha],[.57,.66,.69,alpha],[.66,.59,.54,alpha]];
    visibleSurface.forEach(part=>{const i=surface.indexOf(part);draw(part,shellColors[i],0,gl.TRIANGLES,i<2?surfaceHighlights:[])});
  };
  if(contextOverlay){
    // The tissue mesh is already in the shared specimen grid. Draw it without
    // transforming or resizing it, then composite the whole-brain shell in
    // the existing ghost mode so the position remains a guide, not a border.
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);gl.depthMask(true);draw(blockContextMesh,[.79,.64,.49,.34],4);gl.enable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LESS);gl.depthMask(true);drawSurfaceShell();
  }
  else if(visibleBlocks){
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);
    const hasSelectableStructures=blockMeshes?.some(part=>!!part.definition.layer)??false;
    if(!hasSelectableStructures)visibleBlocks.forEach(part=>draw(part.mesh,part.definition.color,part.definition.material));
    else{
      const tissue=visibleBlocks.filter(part=>!part.definition.layer),structures=visibleBlocks.filter(part=>!!part.definition.layer);
      if(specimenTissueMode!=="hidden"){
        if(specimenTissueMode==="ghost")gl.depthMask(false);
        tissue.forEach(part=>draw(part.mesh,specimenTissueMode==="ghost"?[part.definition.color[0],part.definition.color[1],part.definition.color[2],.18]:part.definition.color,part.definition.material));
        if(specimenTissueMode==="ghost")gl.depthMask(true);
      }
      const ponsSurface=showPonsMedulla?blockMeshes?.find(part=>part.definition.key==="pons-medulla")?.mesh:undefined;structures.forEach(part=>{if(part.definition.key==="pyramids"||part.definition.key==="olives"){if(ponsSurface)draw(ventralSurfacePatchMesh(ponsSurface,part.definition.key),part.definition.color,3);return}if(part.definition.key==="septum-pellucidum"){gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),.006);draw(conservativeSeptumMesh(part.mesh),part.definition.color,part.definition.material);gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),0);return}draw(part.mesh,part.definition.color,part.definition.material)});
    }
  }
  else if(view==="segmented"){const palette=[[.72,.78,.81,1],[.83,.86,.87,1],[.68,.56,.38,1],[.52,.62,.65,1],[.67,.55,.48,1],[.78,.48,.44,1],[.25,.68,.75,1]];gl.disable(gl.CULL_FACE);visibleSegments.forEach(part=>{const i=segments.indexOf(part);draw(part,palette[i],2)});}
  else if(!ghostSurface)drawSurfaceShell();
  if(showFocus&&selectionLayers.length){if(!ghostSurface)gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.CULL_FACE);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);selectionLayers.forEach(layer=>layer.meshes.forEach(part=>draw(part,selectionColor(layer.color),1)));}
  const drawSurfaceLandmarks=()=>{
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),hemisphere==="left"?-1:hemisphere==="right"?1:0);gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);
    SURFACE_LANDMARKS.forEach((definition,index)=>{if(!surfaceLandmarks.includes(definition.key))return;const color=teachingColor(definition.color,TEACHING_OVERLAY_SELECTED_OPACITY);if(definition.key==="longitudinal-fissure")draw(landmarks[index],color,1);else if(definition.key==="lateral-sulcus")visibleSurface.slice(0,2).forEach(part=>draw(surfaceRegionUpperRimMesh(part,[96,45],2.05,.9),color,3));else if(definition.key==="calcarine-sulcus")visibleSurface.slice(0,2).forEach(part=>draw(surfaceLevelMesh(part,[57,6],0,-14,.9),color,3));else visibleSurface.slice(0,2).forEach(part=>draw(surfaceBoundaryMesh(part,definition.key,2.05,.9),color,3))});
    gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),0);
  };
  if(surfaceLandmarks.length&&blockMeshes===null&&!ghostSurface)drawSurfaceLandmarks();
  if(surfaceDeepLandmarks.length&&blockMeshes===null){
    // These are explicit teaching overlays, never part of the default surface.
    // Keep depth testing active so a selected relation follows the model rather
    // than becoming an always-front decal in a transparent view.
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),hemisphere==="left"?-1:hemisphere==="right"?1:0);gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),.006);gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);
    SURFACE_DEEP_LANDMARKS.forEach((definition,index)=>{if(surfaceDeepLandmarks.includes(definition.key))draw(definition.key==="septum-pellucidum"?conservativeSeptumMesh(deep[index]):deep[index],teachingColor(definition.color,TEACHING_OVERLAY_SELECTED_OPACITY),1)});
    gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),0);gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),0);
  }
  if(showBasalLandmarks){
    // Do not clear depth here: helpers must remain depth-tested in ghost mode.
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);const keys:BasalLandmark[]=["olfactory","optic","infundibulum","mammillary","perforated","peduncles","pyramids","olives"],palette=[[.88,.65,.27,1],[.95,.84,.42,1],[.85,.42,.54,1],[.73,.44,.27,1],[.31,.65,.63,1],[.31,.47,.72,1],[.89,.68,.26,1],[.84,.42,.33,1]],neutral=[.78,.82,.83,1],hypothalamicOnly=basalLandmark==="hypothalamic",brainstemOnly=basalLandmark==="brainstem-only",hideBrainstemPatches=basalLandmark==="without-brainstem-patches",nerveOverlayVisible=neurovascularOverlay==="nerves"||neurovascularOverlay==="both";basal.forEach((part,index)=>{const key=keys[index];if(key==="mammillary")return;if(nerveOverlayVisible&&(["olfactory","optic"] as BasalLandmark[]).includes(key))return;if(hideBrainstemPatches&&(key==="pyramids"||key==="olives"))return;if(brainstemOnly&&!(["peduncles","pyramids","olives"] as BasalLandmark[]).includes(key))return;if(hypothalamicOnly&&!(["infundibulum","mammillary"] as BasalLandmark[]).includes(key))return;const active=hypothalamicOnly||basalHighlights.includes(key);if(basalOnlySelected&&!active)return;
      // Pyramids and olives are generated colour patches on the real
      // pons-medulla mesh, not independent anatomy. Never leave their helper
      // polygons visible in the neutral/default model.
      if((key==="pyramids"||key==="olives")&&!hypothalamicOnly){if(active&&showPonsMedulla)draw(ventralSurfacePatchMesh(surface[3],key),teachingColor(palette[index],TEACHING_OVERLAY_SELECTED_OPACITY),3);return}draw(part,teachingColor(active?palette[index]:neutral,active?TEACHING_OVERLAY_SELECTED_OPACITY:TEACHING_OVERLAY_OPACITY),active?1:0)});
    // Brainstem lesson targets reuse the actual midbrain/pons-medulla shells.
    // The colliculi remain depth-tested dorsal landmarks: an inferior viewer
    // must rotate the model rather than seeing them falsely projected through.
    if(!hypothalamicOnly){gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),.003);
      if(basalHighlights.includes("hypothalamus"))draw(deep[4],teachingColor([.77,.34,.51],TEACHING_OVERLAY_SELECTED_OPACITY),1);else if(!basalOnlySelected&&basalLandmark==="all")draw(deep[4],teachingColor(neutral),0);
      if(showMidbrain&&basalHighlights.includes("midbrain"))draw(surface[4],teachingColor([.46,.40,.69],TEACHING_OVERLAY_SELECTED_OPACITY),1);
      if(showPonsMedulla&&basalHighlights.includes("pons"))draw(brainstemLevelMesh(surface[3],"pons"),teachingColor([.21,.60,.60],TEACHING_OVERLAY_SELECTED_OPACITY),1);
      if(showPonsMedulla&&basalHighlights.includes("medulla"))draw(brainstemLevelMesh(surface[3],"medulla"),teachingColor([.40,.61,.41],TEACHING_OVERLAY_SELECTED_OPACITY),1);
      if(showMidbrain&&basalHighlights.includes("superior-colliculi"))draw(midbrainDorsalPatchMesh(surface[4],"superior-colliculi"),teachingColor([.85,.33,.40],TEACHING_OVERLAY_SELECTED_OPACITY),3);
      if(showMidbrain&&basalHighlights.includes("inferior-colliculi"))draw(midbrainDorsalPatchMesh(surface[4],"inferior-colliculi"),teachingColor([.89,.54,.26],TEACHING_OVERLAY_SELECTED_OPACITY),3);
      gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),0);
    }
  }
  if(neurovascularOverlay!=="none"){
    // Vessels and nerves use the same depth-tested teaching-layer policy in
    // normal and ghost views. Their selected vertices receive the stronger
    // opacity through the shader highlight channel.
    gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.disable(gl.CULL_FACE);gl.depthFunc(gl.LEQUAL);
    if(neurovascularOverlay==="vessels"||neurovascularOverlay==="both"){
      draw(overlays[0],teachingColor([.86,.18,.14]),1,gl.TRIANGLES,neurovascularHighlights);draw(overlays[1],teachingColor([.66,.16,.12]),1,gl.TRIANGLES,neurovascularHighlights);
    }
    if(neurovascularOverlay==="nerves"||neurovascularOverlay==="both"){
      draw(overlays[2],teachingColor([.96,.83,.42]),1,gl.TRIANGLES,neurovascularHighlights);if(showBrainstemNerves){draw(overlays[3],teachingColor([.90,.67,.31]),1,gl.TRIANGLES,neurovascularHighlights);draw(overlays[4],teachingColor([.78,.55,.24]),1,gl.TRIANGLES,neurovascularHighlights)}
    }
  }
  if(ghostSurface){
    // The transparent shell is composited after depth-tested overlays. This
    // lets an inside vessel be seen through the shell without making every
    // overlay a screen-space, always-front annotation.
    gl.enable(gl.CULL_FACE);gl.enable(gl.DEPTH_TEST);gl.depthMask(true);gl.depthFunc(gl.LESS);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);gl.uniform1f(gl.getUniformLocation(prog,"hemiMode"),0);gl.uniform1f(gl.getUniformLocation(prog,"depthBias"),0);drawSurfaceShell();
    if(surfaceLandmarks.length)drawSurfaceLandmarks();
  }
  if(showCutPlane){const planeMesh=cutPlaneMesh(plane,clip);gl.clear(gl.DEPTH_BUFFER_BIT);gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);gl.depthMask(false);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),0);draw(planeMesh,[.29,.72,.88,.14],3,gl.TRIANGLE_FAN);draw(planeMesh,[.46,.84,.98,.92],3,gl.LINE_LOOP);gl.depthMask(true);gl.enable(gl.DEPTH_TEST)}gl.deleteProgram(prog);
  const target=targetCanvas.getContext("2d");if(target){target.clearRect(0,0,targetCanvas.width,targetCanvas.height);target.drawImage(canvas,0,0)}return true
}
