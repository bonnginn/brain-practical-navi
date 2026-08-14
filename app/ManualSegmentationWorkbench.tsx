"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type VolumeData={dims:[number,number,number];image:Uint8Array;labels:Uint8Array};
type Tool="paint"|"erase"|"restore";
type TargetSide="left"|"right"|"bilateral"|"midline"|"mixed";
type EditConfidence="high"|"medium"|"low";
type StrokeChange={index:number;had:boolean;value:number};
type PatchRun={start:number;length:number;label:number};
type PatchLabel={id:number;name:string};
type PatchSliceRange={min:number;max:number;indices:number[]};
type SegmentationPatch={
  format:"brain-practical-segmentation-patch";
  version:1;
  sourceImage:string;
  sourceLabels:string;
  sourceLabelsSha256:string;
  dims:[number,number,number];
  voxelSizeMm:[number,number,number];
  primaryPlane:"horizontal";
  createdAt:string;
  authorNote:string;
  authorGitHub:string;
  targetSide?:TargetSide;
  evidence?:string;
  confidence?:EditConfidence;
  reviewStatus?:"unreviewed";
  reviewer?:string;
  reviewedAt?:string;
  proposedLabels?:PatchLabel[];
  affectedHorizontalSlices?:PatchSliceRange|null;
  editCount:number;
  runs:PatchRun[];
};

const ASSET_BASE=import.meta.env.BASE_URL;
const IMAGE_URL=`${ASSET_BASE}atlas/bigbrain-icbm500.bin.gz`;
const LABEL_URL=`${ASSET_BASE}atlas/bigbrain-practical-segmentation-icbm500.bin.gz`;
const LABEL_SHA256="de30b5c77f4ed4f2902564a5d238b0e733413c247643ef828fb66aa03d8cc8be";
const DRAFT_KEY="brain-practical-segmentation-draft-v1";
const palette:Record<number,[number,number,number]>={
  1:[214,84,72],2:[214,84,72],3:[103,86,133],4:[103,86,133],5:[72,145,128],6:[72,145,128],
  7:[225,151,73],8:[225,151,73],9:[217,133,79],10:[217,133,79],11:[200,164,81],12:[200,164,81],13:[188,148,65],14:[188,148,65],
  15:[141,130,196],16:[141,130,196],17:[200,121,141],18:[200,121,141],19:[120,181,121],20:[120,181,121],21:[199,104,120],22:[199,104,120],
  23:[92,181,192],24:[92,181,192],25:[88,174,184],26:[73,151,176],27:[115,155,114],28:[126,166,143],29:[126,166,143],30:[219,194,112],31:[226,150,79],32:[226,150,79],33:[212,182,91],34:[111,157,176],35:[111,157,176],
};
const labelGroups=[
  {name:"手動ラベル",items:[[1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],[7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],[13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],[19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"]] as [number,string][]},
  {name:"試作ラベル",items:[[23,"左側脳室"],[24,"右側脳室"],[25,"第三脳室"],[26,"第四脳室"],[27,"脳幹"],[28,"左小脳"],[29,"右小脳"],[30,"脳梁候補"],[31,"左内包候補"],[32,"右内包候補"],[33,"視交叉候補"],[34,"左島皮質候補"],[35,"右島皮質候補"]] as [number,string][]},
];
const labelName=new Map(labelGroups.flatMap(group=>group.items));
let dataCache:Promise<VolumeData>|null=null;

async function inflate(url:string,magic:number){
  const response=await fetch(url);if(!response.ok)throw new Error(`${url} HTTP ${response.status}`);
  let buffer=await response.arrayBuffer(),view=new DataView(buffer);
  if(view.getUint32(0,false)!==magic&&view.getUint16(0,false)===0x1f8b){
    buffer=await new Response(new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer();view=new DataView(buffer);
  }
  if(view.getUint32(0,false)!==magic)throw new Error(`${url} header`);
  const dims:[number,number,number]=[view.getUint16(4,true),view.getUint16(6,true),view.getUint16(8,true)],count=dims[0]*dims[1]*dims[2];
  return{dims,values:new Uint8Array(buffer,10,count)};
}
async function loadData(){
  if(!dataCache)dataCache=Promise.all([inflate(IMAGE_URL,0x42425631),inflate(LABEL_URL,0x42425331)]).then(([image,labels])=>{
    if(image.dims.some((value,index)=>value!==labels.dims[index]))throw new Error("image/label grid mismatch");
    return{dims:image.dims,image:image.values,labels:labels.values};
  });
  return dataCache;
}
const index3d=(x:number,y:number,z:number,d:[number,number,number])=>x+d[0]*(y+d[1]*z);
function toRuns(edits:Map<number,number>){
  const sorted=[...edits].sort((a,b)=>a[0]-b[0]),runs:PatchRun[]=[];
  for(const[index,label]of sorted){const last=runs.at(-1);if(last&&last.label===label&&last.start+last.length===index)last.length++;else runs.push({start:index,length:1,label})}
  return runs;
}
function fromRuns(runs:PatchRun[],voxelCount:number){
  const edits=new Map<number,number>();
  for(const run of runs){if(!Number.isInteger(run.start)||!Number.isInteger(run.length)||!Number.isInteger(run.label)||run.start<0||run.length<1||run.start+run.length>voxelCount||run.label<0||run.label>255)throw new Error("差分データの範囲が不正です");for(let offset=0;offset<run.length;offset++)edits.set(run.start+offset,run.label)}
  return edits;
}
function removeNoops(edits:Map<number,number>,original:Uint8Array){for(const[index,label]of edits)if(original[index]===label)edits.delete(index);return edits}
function makePatch(edits:Map<number,number>,note:string,authorGitHub:string,targetSide:TargetSide,evidence:string,confidence:EditConfidence):SegmentationPatch{
  const area=394*466,slices=[...new Set([...edits.keys()].map(index=>Math.floor(index/area)))].sort((a,b)=>a-b),ids=[...new Set(edits.values())].filter(id=>id>0).sort((a,b)=>a-b);
  return{format:"brain-practical-segmentation-patch",version:1,sourceImage:IMAGE_URL,sourceLabels:LABEL_URL,sourceLabelsSha256:LABEL_SHA256,dims:[394,466,378],voxelSizeMm:[.5,.5,.5],primaryPlane:"horizontal",createdAt:new Date().toISOString(),authorNote:note.trim(),authorGitHub:authorGitHub.trim().replace(/^@/,""),targetSide,evidence:evidence.trim(),confidence,reviewStatus:"unreviewed",reviewer:"",reviewedAt:"",proposedLabels:ids.map(id=>({id,name:labelName.get(id)??`label ${id}`})),affectedHorizontalSlices:slices.length?{min:slices[0],max:slices.at(-1)!,indices:slices}:null,editCount:edits.size,runs:toRuns(edits)}
}

export function ManualSegmentationWorkbench(){
  const canvasRef=useRef<HTMLCanvasElement>(null),coronalRef=useRef<HTMLCanvasElement>(null),sagittalRef=useRef<HTMLCanvasElement>(null),fileRef=useRef<HTMLInputElement>(null),editsRef=useRef(new Map<number,number>()),strokeRef=useRef<StrokeChange[]|null>(null),strokeSeen=useRef(new Set<number>()),panRef=useRef<{x:number;y:number;pan:{x:number;y:number}}|null>(null);
  const[data,setData]=useState<VolumeData|null>(null),[error,setError]=useState(""),[position,setPosition]=useState(52),[label,setLabel]=useState(7),[tool,setTool]=useState<Tool>("paint"),[brush,setBrush]=useState(5),[showOriginal,setShowOriginal]=useState(true),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[version,setVersion]=useState(0),[undo,setUndo]=useState<StrokeChange[][]>([]),[redo,setRedo]=useState<StrokeChange[][]>([]),[note,setNote]=useState(""),[authorGitHub,setAuthorGitHub]=useState(""),[targetSide,setTargetSide]=useState<TargetSide>("mixed"),[evidence,setEvidence]=useState(""),[confidence,setConfidence]=useState<EditConfidence>("medium"),[status,setStatus]=useState("端末内に未保存"),[sizeVersion,setSizeVersion]=useState(0),[cursor,setCursor]=useState<{x:number;y:number}|null>(null),[reviewPoint,setReviewPoint]=useState({x:197,y:233});
  const selectedName=labelName.get(label)??`ラベル ${label}`;
  const sliceIndex=data?Math.round((1-position/100)*(data.dims[2]-1)):0;
  const editedOnSlice=useMemo(()=>{if(!data)return 0;const start=data.dims[0]*data.dims[1]*sliceIndex,end=start+data.dims[0]*data.dims[1];let count=0;for(const index of editsRef.current.keys())if(index>=start&&index<end)count++;return count},[data,sliceIndex,version]);
  const editedSlices=useMemo(()=>{if(!data)return[];const area=data.dims[0]*data.dims[1];return[...new Set([...editsRef.current.keys()].map(index=>Math.floor(index/area)))].sort((a,b)=>b-a)},[data,version]);
  const transitions=useMemo(()=>{if(!data)return[];const counts=new Map<string,{from:number;to:number;count:number}>();for(const[index,to]of editsRef.current){const from=data.labels[index],key=`${from}:${to}`,item=counts.get(key);if(item)item.count++;else counts.set(key,{from,to,count:1})}return[...counts.values()].sort((a,b)=>b.count-a.count)},[data,version]);

  useEffect(()=>{loadData().then(setData).catch(reason=>setError(String(reason)))},[]);
  useEffect(()=>{const element=canvasRef.current;if(!element||typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(()=>setSizeVersion(value=>value+1));observer.observe(element);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(!data)return;try{const raw=localStorage.getItem(DRAFT_KEY);if(!raw)return;const patch=JSON.parse(raw) as SegmentationPatch;if(patch.format!=="brain-practical-segmentation-patch"||patch.version!==1||patch.sourceLabelsSha256!==LABEL_SHA256||patch.dims.some((value,index)=>value!==data.dims[index]))return;editsRef.current=removeNoops(fromRuns(patch.runs,data.image.length),data.labels);setNote(patch.authorNote??"");setAuthorGitHub(patch.authorGitHub??"");setTargetSide(patch.targetSide??"mixed");setEvidence(patch.evidence??"");setConfidence(patch.confidence??"medium");setVersion(value=>value+1);setStatus(`端末内ドラフトを復元・${editsRef.current.size.toLocaleString()} voxel`)}catch{setStatus("端末内ドラフトを復元できませんでした")}},[data]);
  useEffect(()=>{if(!data||version===0)return;const timer=window.setTimeout(()=>{try{if(editsRef.current.size>100000){setStatus("差分が大きいため自動保存を停止・JSONを書き出してください");return}localStorage.setItem(DRAFT_KEY,JSON.stringify(makePatch(editsRef.current,note,authorGitHub,targetSide,evidence,confidence)));setStatus(`端末内へ自動保存・${editsRef.current.size.toLocaleString()} voxel`)}catch{setStatus("端末内へ保存できません・JSONを書き出してください")}},700);return()=>window.clearTimeout(timer)},[data,version,note,authorGitHub,targetSide,evidence,confidence]);

  function transform(){const canvas=canvasRef.current;if(!canvas||!data)return null;const w=canvas.clientWidth,h=canvas.clientHeight,fit=Math.min((w-18)/data.dims[0],(h-18)/data.dims[1]),scale=fit*zoom;return{w,h,scale,ox:(w-data.dims[0]*scale)/2+pan.x,oy:(h-data.dims[1]*scale)/2+pan.y}}
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas||!data)return;const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;const context=canvas.getContext("2d");if(!context)return;context.setTransform(dpr,0,0,dpr,0,0);context.fillStyle="#111719";context.fillRect(0,0,w,h);const off=document.createElement("canvas");off.width=data.dims[0];off.height=data.dims[1];const oc=off.getContext("2d")!,image=oc.createImageData(off.width,off.height),z=sliceIndex;
    for(let b=0;b<data.dims[1];b++)for(let x=0;x<data.dims[0];x++){const y=data.dims[1]-1-b,index=index3d(x,y,z,data.dims),pixel=(b*data.dims[0]+x)*4,raw=data.image[index],left=data.image[index3d(Math.max(0,x-1),y,z,data.dims)],right=data.image[index3d(Math.min(data.dims[0]-1,x+1),y,z,data.dims)],up=data.image[index3d(x,Math.min(data.dims[1]-1,y+1),z,data.dims)],down=data.image[index3d(x,Math.max(0,y-1),z,data.dims)],edge=Math.min(24,(Math.abs(right-left)+Math.abs(up-down))*.10),value=Math.max(0,Math.min(255,(raw-128)*1.07+128-edge)),original=data.labels[index],hasEdit=editsRef.current.has(index),effective=hasEdit?editsRef.current.get(index)!:original,color=palette[effective];let r=35+value*.78,g=30+value*.68,blue=24+value*.55;if(color&&((showOriginal&&original>0)||hasEdit)){const alpha=hasEdit ? .72 : .28;r=r*(1-alpha)+color[0]*alpha;g=g*(1-alpha)+color[1]*alpha;blue=blue*(1-alpha)+color[2]*alpha}if(hasEdit&&effective===0){r=80+value*.42;g=84+value*.42;blue=86+value*.42}image.data[pixel]=r;image.data[pixel+1]=g;image.data[pixel+2]=blue;image.data[pixel+3]=data.image[index]<252?255:0}
    oc.putImageData(image,0,0);const view=transform();if(!view)return;context.imageSmoothingEnabled=false;context.drawImage(off,view.ox,view.oy,off.width*view.scale,off.height*view.scale);context.strokeStyle="#f0f3f1";context.lineWidth=1;context.strokeRect(view.ox-.5,view.oy-.5,off.width*view.scale+1,off.height*view.scale+1);context.fillStyle="#f0f3f1";context.font="16px monospace";context.fillText(`Z ${z}  |  0.5 mm`,view.ox+9,view.oy+19);
  },[data,sliceIndex,showOriginal,zoom,pan,version,sizeVersion]);

  useEffect(()=>{if(!data)return;const frame=requestAnimationFrame(()=>{const drawReview=(canvas:HTMLCanvasElement|null,plane:"coronal"|"sagittal")=>{if(!canvas)return;const sw=plane==="coronal"?data.dims[0]:data.dims[1],sh=data.dims[2],context=canvas.getContext("2d");if(!context)return;canvas.width=sw;canvas.height=sh;const image=context.createImageData(sw,sh),selectedColor=palette[label]??[230,230,230];for(let b=0;b<sh;b++){const z=data.dims[2]-1-b;for(let a=0;a<sw;a++){const x=plane==="coronal"?a:reviewPoint.x,y=plane==="coronal"?reviewPoint.y:data.dims[1]-1-a,index=index3d(x,y,z,data.dims),pixel=(b*sw+a)*4,raw=data.image[index],effective=editsRef.current.get(index)??data.labels[index],inside=raw<252;let r=31+raw*.74,g=28+raw*.65,blue=24+raw*.53;if(inside&&effective===label){const alpha=.76;r=r*(1-alpha)+selectedColor[0]*alpha;g=g*(1-alpha)+selectedColor[1]*alpha;blue=blue*(1-alpha)+selectedColor[2]*alpha}image.data[pixel]=r;image.data[pixel+1]=g;image.data[pixel+2]=blue;image.data[pixel+3]=inside?255:0}}context.putImageData(image,0,0);context.strokeStyle="#f6efe4";context.lineWidth=1;const crossX=plane==="coronal"?reviewPoint.x:data.dims[1]-1-reviewPoint.y,crossY=data.dims[2]-1-sliceIndex;context.beginPath();context.moveTo(crossX+.5,0);context.lineTo(crossX+.5,sh);context.moveTo(0,crossY+.5);context.lineTo(sw,crossY+.5);context.stroke();context.fillStyle="#e36e57";context.fillRect(crossX-2,crossY-2,5,5)};drawReview(coronalRef.current,"coronal");drawReview(sagittalRef.current,"sagittal")});return()=>cancelAnimationFrame(frame)},[data,label,reviewPoint,sliceIndex,version]);

  function point(event:React.PointerEvent<HTMLCanvasElement>){const view=transform(),canvas=canvasRef.current;if(!view||!canvas||!data)return null;const rect=canvas.getBoundingClientRect(),x=Math.floor((event.clientX-rect.left-view.ox)/view.scale),b=Math.floor((event.clientY-rect.top-view.oy)/view.scale);if(x<0||x>=data.dims[0]||b<0||b>=data.dims[1])return null;return{x,b}}
  function paintAt(event:React.PointerEvent<HTMLCanvasElement>){const center=point(event);if(!center||!data||!strokeRef.current)return;const z=sliceIndex,value=tool==="paint"?label:0;for(let dy=-brush;dy<=brush;dy++)for(let dx=-brush;dx<=brush;dx++){if(dx*dx+dy*dy>brush*brush)continue;const x=center.x+dx,b=center.b+dy;if(x<0||x>=data.dims[0]||b<0||b>=data.dims[1])continue;const y=data.dims[1]-1-b,index=index3d(x,y,z,data.dims);if(data.image[index]>=252)continue;if(!strokeSeen.current.has(index)){strokeSeen.current.add(index);strokeRef.current.push({index,had:editsRef.current.has(index),value:editsRef.current.get(index)??0})}if(tool==="restore"||value===data.labels[index])editsRef.current.delete(index);else editsRef.current.set(index,value)}setVersion(current=>current+1)}
  function pointerDown(event:React.PointerEvent<HTMLCanvasElement>){if(event.button===1||event.button===2||event.altKey||event.metaKey){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);panRef.current={x:event.clientX,y:event.clientY,pan};return}const selected=point(event);if(selected&&data)setReviewPoint({x:selected.x,y:data.dims[1]-1-selected.b});event.currentTarget.setPointerCapture(event.pointerId);strokeRef.current=[];strokeSeen.current=new Set;paintAt(event)}
  function pointerMove(event:React.PointerEvent<HTMLCanvasElement>){const rect=event.currentTarget.getBoundingClientRect();setCursor({x:event.clientX-rect.left,y:event.clientY-rect.top});if(panRef.current){setPan({x:panRef.current.pan.x+event.clientX-panRef.current.x,y:panRef.current.pan.y+event.clientY-panRef.current.y});return}if(strokeRef.current)paintAt(event)}
  function pointerUp(event:React.PointerEvent<HTMLCanvasElement>){if(panRef.current)panRef.current=null;if(strokeRef.current?.length){const meaningful=strokeRef.current.filter(change=>{const had=editsRef.current.has(change.index);return had!==change.had||(had&&change.had&&editsRef.current.get(change.index)!==change.value)});if(meaningful.length){setUndo(items=>[...items,meaningful].slice(-60));setRedo([])}}strokeRef.current=null;strokeSeen.current.clear();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
  function wheel(event:React.WheelEvent<HTMLCanvasElement>){event.preventDefault();const view=transform(),canvas=canvasRef.current;if(!view||!canvas)return;const rect=canvas.getBoundingClientRect(),localX=event.clientX-rect.left,localY=event.clientY-rect.top,imageX=(localX-view.ox)/view.scale,imageY=(localY-view.oy)/view.scale;setZoom(current=>{const next=Math.max(.7,Math.min(6,current*Math.exp(-event.deltaY*.0015))),w=canvas.clientWidth,h=canvas.clientHeight,fit=Math.min((w-18)/(data?.dims[0]??394),(h-18)/(data?.dims[1]??466)),nextScale=fit*next,nextBaseX=(w-(data?.dims[0]??394)*nextScale)/2,nextBaseY=(h-(data?.dims[1]??466)*nextScale)/2;setPan({x:localX-imageX*nextScale-nextBaseX,y:localY-imageY*nextScale-nextBaseY});return next})}
  function applyHistory(changes:StrokeChange[],direction:"undo"|"redo"){const inverse:StrokeChange[]=[];for(const change of changes){inverse.push({index:change.index,had:editsRef.current.has(change.index),value:editsRef.current.get(change.index)??0});if(change.had)editsRef.current.set(change.index,change.value);else editsRef.current.delete(change.index)}if(direction==="undo"){setUndo(items=>items.slice(0,-1));setRedo(items=>[...items,inverse].slice(-60))}else{setRedo(items=>items.slice(0,-1));setUndo(items=>[...items,inverse].slice(-60))}setVersion(current=>current+1)}
  function download(){const patch=makePatch(editsRef.current,note,authorGitHub,targetSide,evidence,confidence),blob=new Blob([JSON.stringify(patch,null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`bigbrain-seg-patch-${new Date().toISOString().slice(0,10)}.json`;anchor.click();URL.revokeObjectURL(url);setStatus(`JSON書き出し済み・${patch.editCount.toLocaleString()} voxel`)}
  async function importFile(file:File){if(!data)return;try{const patch=JSON.parse(await file.text()) as SegmentationPatch;if(patch.format!=="brain-practical-segmentation-patch"||patch.version!==1||patch.sourceLabelsSha256!==LABEL_SHA256||patch.dims.some((value,index)=>value!==data.dims[index]))throw new Error("現在の0.5 mmラベル版に対応する差分ではありません");if(editsRef.current.size&&!window.confirm("現在の編集を読み込んだ差分で置き換えますか？"))return;editsRef.current=removeNoops(fromRuns(patch.runs,data.image.length),data.labels);setNote(patch.authorNote??"");setAuthorGitHub(patch.authorGitHub??"");setTargetSide(patch.targetSide??"mixed");setEvidence(patch.evidence??"");setConfidence(patch.confidence??"medium");setUndo([]);setRedo([]);setVersion(current=>current+1);setStatus(`JSONを読込・${editsRef.current.size.toLocaleString()} voxel`)}catch(reason){setStatus(`読込エラー: ${reason instanceof Error?reason.message:String(reason)}`)}}
  function clear(){if(!editsRef.current.size||!window.confirm("端末内のすべての編集差分を消去しますか？ 書き出していない変更は戻せません。"))return;editsRef.current.clear();setUndo([]);setRedo([]);localStorage.removeItem(DRAFT_KEY);setVersion(current=>current+1);setStatus("編集差分を消去しました")}
  function jumpToSlice(z:number){if(!data)return;setPosition(Math.round((1-z/(data.dims[2]-1))*1000)/10)}
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.matches("input,textarea,select"))return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();if(event.shiftKey){if(redo.length)applyHistory(redo.at(-1)!,"redo")}else if(undo.length)applyHistory(undo.at(-1)!,"undo")}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[undo,redo]);

  return <div className="segWorkbench">
    <section className="segCanvasCard"><header><div><b>単一標本脳 0.5 mm</b><small>水平断 Z {sliceIndex}・差分 {editsRef.current.size.toLocaleString()} voxel</small></div><span>{Math.round(zoom*100)}%</span></header><div className="segCanvasStage"><canvas ref={canvasRef} onContextMenu={event=>event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerLeave={()=>setCursor(null)} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} aria-label="BigBrain水平断の手動セグメンテーション編集領域"/>{cursor&&<i className={`segBrushCursor ${tool}`} style={{left:cursor.x,top:cursor.y,width:Math.max(4,brush*2*(transform()?.scale??1)),height:Math.max(4,brush*2*(transform()?.scale??1))}}/>}{!data&&<div className={`segLoading ${error?"error":""}`}>{error?"データを読み込めませんでした":"0.5 mm画像とラベルを読み込み中…"}</div>}<div className="segOrientation"><b>A</b><span>L　R</span><b>P</b></div></div><footer><label><span>上方</span><input type="range" min="3" max="97" value={position} onChange={event=>setPosition(Number(event.target.value))}/><span>下方</span></label><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>表示をリセット</button></footer></section>
    <aside className="segControls"><span className="guideIndex">CONTRIBUTOR TOOL · LOCAL DRAFT</span><h2>手動セグメンテーション</h2><p>ブラウザ上では元ラベルを変更せず、修正差分だけを端末に保存します。レビュー用JSONを書き出してPull Requestへ添付してください。</p>
      <div className="segToolRow" role="group" aria-label="編集ツール">{(["paint","erase","restore"] as Tool[]).map(key=><button key={key} className={tool===key?"active":""} onClick={()=>setTool(key)}>{key==="paint"?"塗る":key==="erase"?"背景にする":"元へ戻す"}</button>)}</div>
      <label className="segField"><span>構造ラベル</span><select value={label} onChange={event=>setLabel(Number(event.target.value))} disabled={tool!=="paint"}>{labelGroups.map(group=><optgroup key={group.name} label={group.name}>{group.items.map(([id,name])=><option value={id} key={id}>{id.toString().padStart(2,"0")}　{name}</option>)}</optgroup>)}</select></label>
      <div className="segSelected"><i style={{background:`rgb(${(palette[label]??[230,230,230]).join(",")})`}}/><span><b>{selectedName}</b><small>ID {label}・{tool==="paint"?"新しい差分として塗布":tool==="erase"?"ラベル0へ変更":"この範囲の差分を除去"}</small></span></div>
      <section className="segOrthogonalReview" aria-label="冠状断と矢状断の照合表示"><header><div><b>3方向照合</b><small>水平断をクリックして交点を移動</small></div><span>X {reviewPoint.x} · Y {reviewPoint.y} · Z {sliceIndex}</span></header><div><figure><canvas ref={coronalRef} aria-label={`冠状断で${selectedName}を照合`}/><figcaption>冠状断 <span>S↕I · L↔R</span></figcaption></figure><figure><canvas ref={sagittalRef} aria-label={`矢状断で${selectedName}を照合`}/><figcaption>矢状断 <span>S↕I · A↔P</span></figcaption></figure></div><p>白線は水平断で選んだ交点、橙点は3方向の交差位置です。未保存の差分も選択ラベルの色で反映します。</p></section>
      <label className="segField"><span>ブラシ半径 <b>{brush} voxel / {(brush*.5).toFixed(1)} mm</b></span><input type="range" min="1" max="20" value={brush} onChange={event=>setBrush(Number(event.target.value))}/></label>
      <label className="segCheck"><input type="checkbox" checked={showOriginal} onChange={event=>setShowOriginal(event.target.checked)}/><span>既存セグメンテーションを薄く表示</span></label>
      <div className="segStats"><div><span>全編集</span><b>{editsRef.current.size.toLocaleString()}</b><small>voxel</small></div><div><span>現在断面</span><b>{editedOnSlice.toLocaleString()}</b><small>voxel</small></div></div>
      {editedSlices.length>0&&<div className="segEditedSlices"><header><b>編集済み断面</b><small>{editedSlices.length} slices</small></header><div>{editedSlices.map(z=><button key={z} className={z===sliceIndex?"active":""} onClick={()=>jumpToSlice(z)}>Z {z}</button>)}</div></div>}
      {transitions.length>0&&<div className="segTransitions"><header><b>変更内訳</b><small>上書き先を確認</small></header><div>{transitions.slice(0,8).map(item=><span key={`${item.from}:${item.to}`}><i>{item.from===0?"背景":labelName.get(item.from)??`ID ${item.from}`} → {item.to===0?"背景":labelName.get(item.to)??`ID ${item.to}`}</i><b>{item.count.toLocaleString()}</b></span>)}</div>{transitions.length>8&&<small>ほか {transitions.length-8} 種類</small>}</div>}
      <div className="segHistory"><button disabled={!undo.length} onClick={()=>undo.length&&applyHistory(undo.at(-1)!,"undo")}>↶ 元に戻す</button><button disabled={!redo.length} onClick={()=>redo.length&&applyHistory(redo.at(-1)!,"redo")}>↷ やり直す</button></div>
      <label className="segField"><span>変更内容・根拠メモ</span><textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="例：水平断Z 181–190、左被殻外側境界を組織像に沿って修正。根拠資料・確認者も記載。"/></label>
      <div className="segMetadataGrid"><label className="segField"><span>対象側</span><select value={targetSide} onChange={event=>setTargetSide(event.target.value as TargetSide)}><option value="left">左</option><option value="right">右</option><option value="bilateral">両側</option><option value="midline">正中</option><option value="mixed">複数・混在</option></select></label><label className="segField"><span>編集者の確度</span><select value={confidence} onChange={event=>setConfidence(event.target.value as EditConfidence)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></div>
      <label className="segField"><span>根拠資料・参照箇所</span><input value={evidence} onChange={event=>setEvidence(event.target.value)} placeholder="文献・公開データ・講義資料名と頁など（転載物は添付しない）"/></label>
      <p className="segReviewStatus"><b>確認状態</b><span>未レビュー</span><small>書き出した差分は自動採用されません。確認者と採否はPull Requestで記録します。</small></p>
      <label className="segField"><span>GitHubユーザー名</span><input value={authorGitHub} onChange={event=>setAuthorGitHub(event.target.value)} placeholder="username（任意、PRと照合用）"/></label>
      <div className="segFiles"><button className="primary" onClick={download} disabled={!editsRef.current.size}>差分JSONを書き出す</button><button onClick={()=>fileRef.current?.click()}>差分JSONを読み込む</button><input ref={fileRef} hidden type="file" aria-label="差分JSONファイルを選択" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file)void importFile(file);event.currentTarget.value=""}}/><button className="danger" onClick={clear} disabled={!editsRef.current.size}>編集をすべて消去</button></div>
      <p className="segStatus">{status}</p><div className="accuracyNote warning"><b>編集上の注意</b><p>左クリック／ドラッグで編集、ホイールで拡大、右・中ドラッグまたは⌥ドラッグで移動します。差分はこの端末だけに保存され、公式ラベルには自動反映されません。</p></div>
    </aside>
  </div>;
}
