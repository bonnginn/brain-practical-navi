"use client";

import { useEffect, useRef, useState } from "react";

type Plane="coronal"|"horizontal"|"sagittal";type Focus="ventricle"|"caudate"|"hippocampus"|"thalamus";type Display="specimen"|"diagram"|"outline";
type Volume={dims:[number,number,number];t1:Uint8Array;t2:Uint8Array;labels:Uint8Array;mask:Uint8Array;gm:Uint8Array;wm:Uint8Array;csf:Uint8Array};type Mesh={vertices:Float32Array;normals:Float32Array;shade:Float32Array;faces:Uint32Array};
type BigBrain={dims:[number,number,number];values:Uint8Array};
type FixedBrain={dims:[number,number,number];values:Uint8Array;mask:Uint8Array};
type ManualSeg={dims:[number,number,number];labels:Uint8Array};
type Tone={contrast:number;brightness:number;sharpness:number};
export type IdentifiedPoint={id:number;x:number;y:number;certainty:"atlas"|"manual"};
const DISPLAY_TONE:Tone={contrast:1.07,brightness:1,sharpness:.08};
let volumeCache:Promise<Volume>|null=null,bigBrainCache:Promise<BigBrain>|null=null,fixedBrainCache:Promise<FixedBrain>|null=null;const manualSegCache=new Map<string,Promise<ManualSeg>>(),meshCache=new Map<string,Promise<Mesh>>();

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
  if(!manualSegCache.has(name))manualSegCache.set(name,fetch(`/atlas/bigbrain-manual-subcortical-${name}.bin.gz`).then(async r=>{if(!r.ok)throw new Error(`manual segmentation HTTP ${r.status}`);let buf=await r.arrayBuffer(),v=new DataView(buf);if(v.getUint32(0,false)!==0x42425331&&v.getUint16(0,false)===0x1f8b){const stream=new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"));buf=await new Response(stream).arrayBuffer();v=new DataView(buf)}if(v.getUint32(0,false)!==0x42425331)throw new Error("invalid manual segmentation header");const dims:[number,number,number]=[v.getUint16(4,true),v.getUint16(6,true),v.getUint16(8,true)],n=dims[0]*dims[1]*dims[2];return{dims,labels:new Uint8Array(buf,10,n)}}));return manualSegCache.get(name)!;
}
function loadMesh(name:string){if(!meshCache.has(name))meshCache.set(name,fetch(`/atlas/${name}.mesh`).then(r=>{if(!r.ok)throw new Error(`${name} HTTP ${r.status}`);return r.arrayBuffer()}).then(buf=>{const v=new DataView(buf),magic=v.getUint32(0,false),nv=v.getUint32(4,true),nf=v.getUint32(8,true),vertices=new Float32Array(buf,12,nv*3),normals=new Float32Array(buf,12+nv*12,nv*3),shade=magic===0x424e4d32?new Float32Array(buf,12+nv*24,nv):new Float32Array(nv).fill(1),faceOffset=magic===0x424e4d32?12+nv*28:12+nv*24,faces=new Uint32Array(buf,faceOffset,nf*3);return{vertices,normals,shade,faces}}));return meshCache.get(name)!}

const colors:Record<Focus,[number,number,number]>={ventricle:[73,169,180],caudate:[225,151,73],hippocampus:[200,121,141],thalamus:[141,130,196]};
const idx=(x:number,y:number,z:number,d:[number,number,number])=>x+d[0]*(y+d[1]*z);
function sectionSize(d:[number,number,number],plane:Plane):[number,number]{return plane==="sagittal"?[d[1],d[2]]:plane==="horizontal"?[d[0],d[1]]:[d[0],d[2]]}
function sectionVoxel(a:number,b:number,d:[number,number,number],plane:Plane,p:number):[number,number,number]{const[dx,dy,dz]=d;if(plane==="horizontal")return[a,dy-1-b,Math.round((1-p/100)*(dz-1))];if(plane==="sagittal")return[Math.round(p/100*(dx-1)),a,dz-1-b];return[a,Math.round(p/100*(dy-1)),dz-1-b]}

export function AtlasVolumeCanvas({kind,plane,position,focus,display,rotation,view="inside",contrast="t1",highlightIds=[],highlightColor=colors[focus],onIdentify,showFocus=true}:{kind:"surface"|"slice";plane:Plane;position:number;focus:Focus;display:Display;rotation:{x:number;y:number};view?:"inside"|"ghost"|"extracted"|"segmented";contrast?:"t1"|"t2"|"bigbrain"|"single";highlightIds?:number[];highlightColor?:[number,number,number];onIdentify?:(point:IdentifiedPoint)=>void;showFocus?:boolean}){
  const ref=useRef<HTMLCanvasElement>(null),[data,setData]=useState<Volume|null>(null),[bigBrain,setBigBrain]=useState<BigBrain|null>(null),[fixedBrain,setFixedBrain]=useState<FixedBrain|null>(null),[manualSeg,setManualSeg]=useState<ManualSeg|null>(null),[meshes,setMeshes]=useState<{brain:Mesh;focus:Mesh;surface:Mesh[];segments:Mesh[]}|null>(null),[error,setError]=useState(""),[sizeVersion,setSizeVersion]=useState(0);
  useEffect(()=>{if(kind==="slice"&&(contrast==="t1"||contrast==="t2"))loadVolume().then(setData).catch(e=>setError(String(e)))},[kind,contrast]);useEffect(()=>{if(kind==="surface")Promise.all(["brain",focus,"pial-left","pial-right","segment-cerebellum","segment-brainstem","segment-deep","segment-ventricles"].map(loadMesh)).then(([brain,f,left,right,cerebellum,brainstem,deep,ventricles])=>setMeshes({brain,focus:f,surface:[left,right,cerebellum,brainstem],segments:[left,right,cerebellum,brainstem,deep,ventricles]})).catch(e=>setError(String(e)))},[kind,focus]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain")loadBigBrain().then(setBigBrain).catch(e=>setError(String(e)))},[kind,contrast]);
  useEffect(()=>{if(kind==="slice"&&contrast==="single")loadFixedBrain().then(setFixedBrain).catch(e=>setError(String(e)))},[kind,contrast]);
  useEffect(()=>{if(kind==="slice"&&contrast==="bigbrain")loadManualSeg("icbm500").then(setManualSeg).catch(e=>setError(String(e)));else setManualSeg(null)},[kind,contrast]);
  useEffect(()=>{const el=ref.current;if(!el||typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(()=>setSizeVersion(value=>value+1));observer.observe(el);return()=>observer.disconnect()},[]);
  useEffect(()=>{const el=ref.current;if(!el)return;const dpr=Math.min(devicePixelRatio||1,2),w=el.clientWidth,h=el.clientHeight;el.width=w*dpr;el.height=h*dpr;const selected=new Set(highlightIds);if(kind==="slice"&&contrast==="single"&&fixedBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawFixedSlice(c,w,h,fixedBrain,null,plane,position,display,DISPLAY_TONE,selected,highlightColor)}}else if(kind==="slice"&&contrast==="bigbrain"&&bigBrain){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,null,bigBrain,manualSeg,plane,position,focus,display,"bigbrain",DISPLAY_TONE,selected,highlightColor)}}else if(kind==="slice"&&data){const c=el.getContext("2d");if(c){c.setTransform(dpr,0,0,dpr,0,0);drawSlice(c,w,h,data,null,null,plane,position,focus,display,contrast==="t2"?"t2":"t1",DISPLAY_TONE,selected,highlightColor)}}else if(kind==="surface"&&meshes)drawWebGL(el,meshes.brain,meshes.focus,meshes.surface,meshes.segments,rotation,colors[focus],plane,position,view,showFocus);},[data,bigBrain,fixedBrain,manualSeg,meshes,kind,plane,position,focus,display,rotation,view,contrast,sizeVersion,highlightIds,highlightColor,showFocus]);
  function identify(e:React.PointerEvent<HTMLCanvasElement>){const el=ref.current;if(kind!=="slice"||!el||!onIdentify||contrast==="single")return;const source=contrast==="bigbrain"?bigBrain:data;if(!source)return;const direct=contrast==="bigbrain";if((direct&&!manualSeg)||(!direct&&!data))return;const rect=el.getBoundingClientRect(),w=el.clientWidth,h=el.clientHeight,[sw,sh]=sectionSize(source.dims,plane),scale=Math.min((w-10)/sw,(h-10)/sh),ox=(w-sw*scale)/2,oy=(h-sh*scale)/2,a=Math.floor((e.clientX-rect.left-ox)/scale),b=Math.floor((e.clientY-rect.top-oy)/scale),certainty=direct?"manual":"atlas";if(a<0||a>=sw||b<0||b>=sh){onIdentify({id:0,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty});return}const voxel=sectionVoxel(a,b,source.dims,plane,position),sourceIndex=idx(voxel[0],voxel[1],voxel[2],source.dims),inside=contrast==="bigbrain"?!!bigBrain&&bigBrain.values[sourceIndex]<252:!!data&&data.mask[sourceIndex]>0;let id=inside?(direct?manualSeg!.labels[sourceIndex]:data!.labels[sourceIndex]):0;if(!direct&&inside&&id===0){const gm=data!.gm[sourceIndex],wm=data!.wm[sourceIndex],csf=data!.csf[sourceIndex];id=wm>=gm&&wm>=csf?201:gm>=csf?202:203}onIdentify({id,x:e.clientX-rect.left,y:e.clientY-rect.top,certainty})}
  const ready=kind==="slice"?(contrast==="single"?!!fixedBrain:contrast==="bigbrain"?!!bigBrain:!!data):!!meshes;return <><canvas ref={ref} onPointerDown={identify} className={`atlasCanvas ${kind==="slice"&&onIdentify?"identifiable":""}`} aria-label={kind==="surface"?"MNI高密度皮質表面モデル":`${plane}断面 ${position}`}/>{!ready&&<span className={`atlasLoading ${error?"error":""}`}>{error?"データを読み込めませんでした":contrast==="single"?"0.44 mm 単一固定脳を読み込み中…":contrast==="bigbrain"?"組織切片データを読み込み中…":"1 mm 解剖データを読み込み中…"}</span>}</>;
}

function drawFixedSlice(c:CanvasRenderingContext2D,w:number,h:number,v:FixedBrain,manual:ManualSeg|null,plane:Plane,p:number,display:Display,tone:Tone,selected:Set<number>,col:[number,number,number]){
  const[dx,dy,dz]=v.dims;let sw=dx,sh=dz,get=(a:number,b:number)=>idx(a,Math.round(p/100*(dy-1)),dz-1-b,v.dims);if(plane==="horizontal"){sw=dx;sh=dy;get=(a,b)=>idx(a,dy-1-b,Math.round((1-p/100)*(dz-1)),v.dims)}if(plane==="sagittal"){sw=dy;sh=dz;get=(a,b)=>idx(Math.round(p/100*(dx-1)),a,dz-1-b,v.dims)}
  const values=v.values,off=document.createElement("canvas");off.width=sw;off.height=sh;const oc=off.getContext("2d")!,im=oc.createImageData(sw,sh),sample=(x:number,y:number)=>values[get(Math.max(0,Math.min(sw-1,x)),Math.max(0,Math.min(sh-1,y)))];
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const si=get(x,y),q=(y*sw+x)*4,raw=values[si],near=(sample(x-1,y)+sample(x+1,y)+sample(x,y-1)+sample(x,y+1))*.25,base=raw+(raw-near)*tone.sharpness,val=Math.max(0,Math.min(255,(base-128)*tone.contrast+128+tone.brightness)),edge=Math.min(22,(Math.abs(sample(x+1,y)-sample(x-1,y))+Math.abs(sample(x,y+1)-sample(x,y-1)))*(.07+tone.sharpness*.18));let r,g,b;if(display==="outline"){r=g=b=25+val*.72-edge}else if(display==="diagram"){r=78+val*.66;g=65+val*.59;b=51+val*.49}else{r=36+val*.78-edge;g=31+val*.68-edge*.74;b=25+val*.55-edge*.46}const hit=!!manual&&selected.has(manual.labels[si]);if(hit){const m=.42;r=r*(1-m)+col[0]*m;g=g*(1-m)+col[1]*m;b=b*(1-m)+col[2]*m}im.data[q]=r;im.data[q+1]=g;im.data[q+2]=b;im.data[q+3]=v.mask[si]?255:0}oc.putImageData(im,0,0);c.clearRect(0,0,w,h);c.fillStyle="#171b1c";c.fillRect(0,0,w,h);const scale=Math.min((w-10)/sw,(h-10)/sh);c.imageSmoothingEnabled=false;c.drawImage(off,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);
}

function drawSlice(c:CanvasRenderingContext2D,w:number,h:number,v:Volume|null,bb:BigBrain|null,manual:ManualSeg|null,plane:Plane,p:number,focus:Focus,display:Display,contrast:"t1"|"t2"|"bigbrain",tone:Tone,selected:Set<number>,col:[number,number,number]){
  const isBB=contrast==="bigbrain"&&!!bb,dims=isBB?bb!.dims:v!.dims,[dx,dy,dz]=dims;let sw=dx,sh=dz,get=(a:number,b:number)=>idx(a,Math.round(p/100*(dy-1)),dz-1-b,dims);if(plane==="horizontal"){sw=dx;sh=dy;get=(a,b)=>idx(a,dy-1-b,Math.round((1-p/100)*(dz-1)),dims)}if(plane==="sagittal"){sw=dy;sh=dz;get=(a,b)=>idx(Math.round(p/100*(dx-1)),a,dz-1-b,dims)}
  const values=isBB?bb!.values:contrast==="t2"?v!.t2:v!.t1,off=document.createElement("canvas");off.width=sw;off.height=sh;const oc=off.getContext("2d")!,im=oc.createImageData(sw,sh);
  const sample=(x:number,y:number)=>values[get(Math.max(0,Math.min(sw-1,x)),Math.max(0,Math.min(sh-1,y)))];
  for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){
    const si=get(x,y),q=(y*sw+x)*4,label=isBB?(manual?.labels[si]??0):v!.labels[si],hit=selected.has(label),raw=values[si];
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
    if(hit){const m=display==="specimen"?.34:.86;r=r*(1-m)+col[0]*m;g=g*(1-m)+col[1]*m;b=b*(1-m)+col[2]*m}
    im.data[q]=r;im.data[q+1]=g;im.data[q+2]=b;im.data[q+3]=(isBB?raw>=252:v!.mask[si]===0)?0:255;
  }
  oc.putImageData(im,0,0);c.clearRect(0,0,w,h);c.fillStyle="#171b1c";c.fillRect(0,0,w,h);const scale=Math.min((w-10)/sw,(h-10)/sh);c.imageSmoothingEnabled=!isBB;c.imageSmoothingQuality="high";c.drawImage(off,(w-sw*scale)/2,(h-sh*scale)/2,sw*scale,sh*scale);
}

function shader(gl:WebGLRenderingContext,type:number,source:string){const s=gl.createShader(type)!;gl.shaderSource(s,source);gl.compileShader(s);return s}
function drawWebGL(canvas:HTMLCanvasElement,brain:Mesh,focus:Mesh,surface:Mesh[],segments:Mesh[],rot:{x:number;y:number},focusColor:[number,number,number],plane:Plane,position:number,view:"inside"|"ghost"|"extracted"|"segmented",showFocus:boolean){
  const gl=canvas.getContext("webgl",{alpha:false,antialias:true});if(!gl)return;const vs=`attribute vec3 p,n;attribute float a;uniform mat3 r;varying float l,s;varying vec3 anatomy;void main(){vec3 q=vec3(p.z,p.x,p.y);anatomy=q;vec3 nn=normalize(r*vec3(n.z,n.x,n.y));q.y+=16.;q=r*q;float key=max(dot(nn,normalize(vec3(-.42,.58,.70))),0.);float fill=max(dot(nn,normalize(vec3(.72,.12,.52))),0.);l=.12+.72*pow(key,.72)+.18*fill;s=a;gl_Position=vec4(q.x/96.,q.y/96.,q.z/138.,1.);}`;const fs=`precision mediump float;uniform vec4 color;uniform float clipOn,clipAxis,clipValue;varying float l,s;varying vec3 anatomy;void main(){float q=clipAxis<.5?anatomy.x:(clipAxis<1.5?anatomy.y:anatomy.z);if(clipOn>.5&&q<clipValue)discard;float tone=(.55+.60*min(l,1.))*s;vec3 tissue=color.rgb*tone+vec3(.030,.020,.012)*(1.-s);gl_FragColor=vec4(tissue,color.a);}`;const prog=gl.createProgram()!;gl.attachShader(prog,shader(gl,gl.VERTEX_SHADER,vs));gl.attachShader(prog,shader(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);gl.useProgram(prog);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.91,.90,.87,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  const ax=rot.x*Math.PI/180,ay=rot.y*Math.PI/180,cx=Math.cos(ax),sx=Math.sin(ax),cy=Math.cos(ay),sy=Math.sin(ay),m=new Float32Array([cy,sx*sy,-cx*sy,0,cx,sx,sy,-sx*cy,cx*cy]);gl.uniformMatrix3fv(gl.getUniformLocation(prog,"r"),false,m);
  const axis=plane==="sagittal"?0:plane==="horizontal"?1:2,extent=axis===2?114:96,clip=(position/100*2-1)*extent;gl.uniform1f(gl.getUniformLocation(prog,"clipAxis"),axis);gl.uniform1f(gl.getUniformLocation(prog,"clipValue"),clip);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);
  const ext=gl.getExtension("OES_element_index_uint");if(!ext)return;const draw=(mesh:Mesh,color:number[])=>{const pb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pb);gl.bufferData(gl.ARRAY_BUFFER,mesh.vertices,gl.STATIC_DRAW);const pa=gl.getAttribLocation(prog,"p");gl.enableVertexAttribArray(pa);gl.vertexAttribPointer(pa,3,gl.FLOAT,false,0,0);const nb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,nb);gl.bufferData(gl.ARRAY_BUFFER,mesh.normals,gl.STATIC_DRAW);const na=gl.getAttribLocation(prog,"n");gl.enableVertexAttribArray(na);gl.vertexAttribPointer(na,3,gl.FLOAT,false,0,0);const sb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,sb);gl.bufferData(gl.ARRAY_BUFFER,mesh.shade,gl.STATIC_DRAW);const sa=gl.getAttribLocation(prog,"a");gl.enableVertexAttribArray(sa);gl.vertexAttribPointer(sa,1,gl.FLOAT,false,0,0);const ib=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,ib);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,mesh.faces,gl.STATIC_DRAW);gl.uniform4fv(gl.getUniformLocation(prog,"color"),new Float32Array(color));gl.drawElements(gl.TRIANGLES,mesh.faces.length,gl.UNSIGNED_INT,0);gl.deleteBuffer(pb);gl.deleteBuffer(nb);gl.deleteBuffer(sb);gl.deleteBuffer(ib)};
  if(view==="segmented"){const palette=[[.85,.73,.59,1],[.89,.78,.64,1],[.76,.66,.54,1],[.68,.55,.44,1],[.79,.49,.39,1],[.25,.68,.75,1]];gl.disable(gl.CULL_FACE);segments.forEach((part,i)=>draw(part,palette[i]));}
  else{const alpha=view==="ghost"?.14:1;if(view==="ghost")gl.depthMask(false);surface.forEach((part,i)=>draw(part,i===0?[.85,.73,.59,alpha]:i===1?[.89,.78,.64,alpha]:i===2?[.76,.66,.54,alpha]:[.68,.55,.44,alpha]));gl.depthMask(true);if(showFocus){gl.disable(gl.CULL_FACE);gl.uniform1f(gl.getUniformLocation(prog,"clipOn"),view==="extracted"?1:0);draw(focus,[focusColor[0]/255,focusColor[1]/255,focusColor[2]/255,1]);}}gl.deleteProgram(prog);
}
