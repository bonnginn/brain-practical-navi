"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { planeAxisSize, planePositionForSlice, planeShape, planeSliceIndex, planeVoxel, segmentationPlaneNames, type SegmentationPlane as Plane } from "./segmentationGeometry";
import { buildSegmentationPatch, type PatchRun, type SegmentationPatch } from "./segmentationPatchMetadata";
import { SEGMENTATION_LABEL_REVISION, SEGMENTATION_LABEL_SHA256 } from "./segmentationLabelRevision";

type VolumeData={dims:[number,number,number];image:Uint8Array;labels:Uint8Array};
type Tool="paint"|"erase"|"restore";
type TargetSide="left"|"right"|"bilateral"|"midline"|"mixed";
type EditConfidence="high"|"medium"|"low";
type StrokeChange={index:number;had:boolean;value:number};

const ASSET_BASE=import.meta.env.BASE_URL;
const IMAGE_URL=`${ASSET_BASE}atlas/bigbrain-icbm500.bin.gz`;
const LABEL_URL=`${ASSET_BASE}atlas/bigbrain-practical-segmentation-icbm500.bin.gz`;
const LABEL_SHA256=SEGMENTATION_LABEL_SHA256;
const LABEL_FETCH_URL=`${LABEL_URL}?v=${SEGMENTATION_LABEL_REVISION}`;
const DRAFT_KEY="brain-practical-segmentation-draft-v1";
const palette:Record<number,[number,number,number]>={
  1:[214,84,72],2:[214,84,72],3:[103,86,133],4:[103,86,133],5:[72,145,128],6:[72,145,128],
  7:[225,151,73],8:[225,151,73],9:[217,133,79],10:[217,133,79],11:[200,164,81],12:[200,164,81],13:[188,148,65],14:[188,148,65],
  15:[141,130,196],16:[141,130,196],17:[200,121,141],18:[200,121,141],19:[120,181,121],20:[120,181,121],21:[199,104,120],22:[199,104,120],
  23:[92,181,192],24:[92,181,192],25:[88,174,184],26:[73,151,176],27:[115,155,114],28:[126,166,143],29:[126,166,143],30:[219,194,112],31:[226,150,79],32:[226,150,79],33:[212,182,91],34:[111,157,176],35:[111,157,176],
  36:[235,204,83],37:[229,171,72],38:[229,171,72],39:[166,103,73],40:[166,103,73],
};
const labelGroups=[
  {name:"手動ラベル",items:[[1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],[7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],[13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],[19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"]] as [number,string][]},
  {name:"試作ラベル",items:[[23,"左側脳室"],[24,"右側脳室"],[25,"第三脳室"],[26,"第四脳室"],[27,"脳幹"],[28,"左小脳"],[29,"右小脳"],[30,"脳梁候補"],[31,"左内包候補"],[32,"右内包候補"],[33,"視交叉候補"],[34,"左島皮質候補"],[35,"右島皮質候補"]] as [number,string][]},
  {name:"画像由来の分割作業用",items:[[36,"視交叉（正中）"],[37,"左視索"],[38,"右視索"],[39,"左乳頭体"],[40,"右乳頭体"]] as [number,string][]},
];
const labelName=new Map(labelGroups.flatMap(group=>group.items));
let dataCache:Promise<VolumeData>|null=null;

const comparisonLabelIds=[39,40,33,27] as const;
const comparisonLabelNames:Record<(typeof comparisonLabelIds)[number],string>={39:"左乳頭体",40:"右乳頭体",33:"旧ID 33 視交叉候補",27:"ID 27 脳幹"};
function planeDescription(plane:Plane){return segmentationPlaneNames[plane];}

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
  if(!dataCache)dataCache=Promise.all([inflate(IMAGE_URL,0x42425631),inflate(LABEL_FETCH_URL,0x42425331)]).then(([image,labels])=>{
    if(image.dims.some((value,index)=>value!==labels.dims[index]))throw new Error("image/label grid mismatch");
    return{dims:image.dims,image:image.values,labels:labels.values};
  });
  return dataCache;
}
const index3d=(x:number,y:number,z:number,d:[number,number,number])=>x+d[0]*(y+d[1]*z);
function fromRuns(runs:PatchRun[],voxelCount:number){
  const edits=new Map<number,number>();
  for(const run of runs){if(!Number.isInteger(run.start)||!Number.isInteger(run.length)||!Number.isInteger(run.label)||run.start<0||run.length<1||run.start+run.length>voxelCount||run.label<0||run.label>255)throw new Error("差分データの範囲が不正です");for(let offset=0;offset<run.length;offset++)edits.set(run.start+offset,run.label)}
  return edits;
}
function removeNoops(edits:Map<number,number>,original:Uint8Array){for(const[index,label]of edits)if(original[index]===label)edits.delete(index);return edits}
function makePatch(edits:Map<number,number>,data:VolumeData,note:string,authorGitHub:string,targetSide:TargetSide,evidence:string,confidence:EditConfidence):SegmentationPatch{
  return buildSegmentationPatch({
    edits,labels:data.labels,dims:data.dims,sourceLabelsSha256:LABEL_SHA256,
    createdAt:new Date().toISOString(),authorNote:note,authorGitHub,targetSide,evidence,confidence,
  });
}

export function ManualSegmentationWorkbench(){
  const canvasRef=useRef<HTMLCanvasElement>(null),fileRef=useRef<HTMLInputElement>(null),editsRef=useRef(new Map<number,number>()),strokeRef=useRef<StrokeChange[]|null>(null),strokeSeen=useRef(new Set<number>()),panRef=useRef<{x:number;y:number;pan:{x:number;y:number}}|null>(null);
  const[data,setData]=useState<VolumeData|null>(null),[error,setError]=useState(""),[plane,setPlane]=useState<Plane>("horizontal"),[position,setPosition]=useState(52),[label,setLabel]=useState(7),[tool,setTool]=useState<Tool>("paint"),[brush,setBrush]=useState(5),[showOriginal,setShowOriginal]=useState(true),[zoom,setZoom]=useState(1),[pan,setPan]=useState({x:0,y:0}),[version,setVersion]=useState(0),[undo,setUndo]=useState<StrokeChange[][]>([]),[redo,setRedo]=useState<StrokeChange[][]>([]),[note,setNote]=useState(""),[authorGitHub,setAuthorGitHub]=useState(""),[targetSide,setTargetSide]=useState<TargetSide>("mixed"),[evidence,setEvidence]=useState(""),[confidence,setConfidence]=useState<EditConfidence>("medium"),[status,setStatus]=useState("端末内に未保存"),[sizeVersion,setSizeVersion]=useState(0),[cursor,setCursor]=useState<{x:number;y:number}|null>(null),[cursorVoxel,setCursorVoxel]=useState<[number,number,number]|null>(null);
  const planeInfo=planeDescription(plane),isEditablePlane=plane==="horizontal";
  const selectedName=labelName.get(label)??`ラベル ${label}`;
  const sliceIndex=data?planeSliceIndex(position,plane,data.dims):0;
  const editedOnSlice=useMemo(()=>{if(!data)return 0;const[dx,dy]=data.dims;let count=0;for(const index of editsRef.current.keys()){const x=index%dx,y=Math.floor(index/dx)%dy,z=Math.floor(index/(dx*dy)),axis=plane==="sagittal"?x:plane==="coronal"?y:z;if(axis===sliceIndex)count++}return count},[data,plane,sliceIndex,version]);
  const editedSlices=useMemo(()=>{if(!data)return[];const[dx,dy]=data.dims,values=new Set<number>();for(const index of editsRef.current.keys()){const x=index%dx,y=Math.floor(index/dx)%dy,z=Math.floor(index/(dx*dy));values.add(plane==="sagittal"?x:plane==="coronal"?y:z)}return[...values].sort((a,b)=>plane==="horizontal"?b-a:a-b)},[data,plane,version]);
  const transitions=useMemo(()=>{if(!data)return[];const counts=new Map<string,{from:number;to:number;count:number}>();for(const[index,to]of editsRef.current){const from=data.labels[index],key=`${from}:${to}`,item=counts.get(key);if(item)item.count++;else counts.set(key,{from,to,count:1})}return[...counts.values()].sort((a,b)=>b.count-a.count)},[data,version]);
  const comparisonCounts=useMemo(()=>{
    if(!data)return[];
    const[width,height]=planeShape(data.dims,plane),counts=new Map<number,{original:number;current:number;changed:number}>();
    comparisonLabelIds.forEach(id=>counts.set(id,{original:0,current:0,changed:0}));
    for(let b=0;b<height;b++)for(let a=0;a<width;a++){
      const voxel=planeVoxel(a,b,sliceIndex,plane,data.dims),index=index3d(voxel[0],voxel[1],voxel[2],data.dims),original=data.labels[index],current=editsRef.current.get(index)??original;
      const originalCount=counts.get(original),currentCount=counts.get(current);
      if(originalCount)originalCount.original++;
      if(currentCount)currentCount.current++;
      if(original!==current){if(originalCount)originalCount.changed++;if(currentCount)currentCount.changed++;}
    }
    return comparisonLabelIds.map(id=>({id,name:comparisonLabelNames[id],...counts.get(id)!}));
  },[data,plane,sliceIndex,version]);

  useEffect(()=>{let active=true;loadData().then(value=>{if(active)setData(value)}).catch(reason=>{if(active)setError(String(reason))});return()=>{active=false;dataCache=null}},[]);
  useEffect(()=>{const element=canvasRef.current;if(!element||typeof ResizeObserver==="undefined")return;const observer=new ResizeObserver(()=>setSizeVersion(value=>value+1));observer.observe(element);return()=>observer.disconnect()},[]);
  useEffect(()=>{if(!data)return;try{const raw=localStorage.getItem(DRAFT_KEY);if(!raw)return;const patch=JSON.parse(raw) as SegmentationPatch;if(patch.format!=="brain-practical-segmentation-patch"||patch.version!==1||patch.sourceLabelsSha256!==LABEL_SHA256||patch.dims.some((value,index)=>value!==data.dims[index]))return;editsRef.current=removeNoops(fromRuns(patch.runs,data.image.length),data.labels);setNote(patch.authorNote??"");setAuthorGitHub(patch.authorGitHub??"");setTargetSide(patch.targetSide??"mixed");setEvidence(patch.evidence??"");setConfidence(patch.confidence??"medium");setVersion(value=>value+1);setStatus(`端末内ドラフトを復元・${editsRef.current.size.toLocaleString()} voxel`)}catch{setStatus("端末内ドラフトを復元できませんでした")}},[data]);
  useEffect(()=>{if(!data||version===0)return;const timer=window.setTimeout(()=>{try{if(editsRef.current.size>100000){setStatus("差分が大きいため自動保存を停止・JSONを書き出してください");return}localStorage.setItem(DRAFT_KEY,JSON.stringify(makePatch(editsRef.current,data,note,authorGitHub,targetSide,evidence,confidence)));setStatus(`端末内へ自動保存・${editsRef.current.size.toLocaleString()} voxel`)}catch{setStatus("端末内へ保存できません・JSONを書き出してください")}},700);return()=>window.clearTimeout(timer)},[data,version,note,authorGitHub,targetSide,evidence,confidence]);

  function transform(){const canvas=canvasRef.current;if(!canvas||!data)return null;const[wImage,hImage]=planeShape(data.dims,plane),w=canvas.clientWidth,h=canvas.clientHeight,fit=Math.min((w-18)/wImage,(h-18)/hImage),scale=fit*zoom;return{w,h,scale,ox:(w-wImage*scale)/2+pan.x,oy:(h-hImage*scale)/2+pan.y,wImage,hImage}}
  useEffect(()=>{const canvas=canvasRef.current;if(!canvas||!data)return;const dpr=Math.min(devicePixelRatio||1,2),w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w*dpr;canvas.height=h*dpr;const context=canvas.getContext("2d");if(!context)return;context.setTransform(dpr,0,0,dpr,0,0);context.fillStyle="#111719";context.fillRect(0,0,w,h);const[width,height]=planeShape(data.dims,plane),off=document.createElement("canvas");off.width=width;off.height=height;const oc=off.getContext("2d")!,image=oc.createImageData(off.width,off.height),slice=sliceIndex;
    const imageIndex=(a:number,b:number)=>{const voxel=planeVoxel(Math.max(0,Math.min(width-1,a)),Math.max(0,Math.min(height-1,b)),slice,plane,data.dims);return index3d(voxel[0],voxel[1],voxel[2],data.dims)};
    for(let b=0;b<height;b++)for(let a=0;a<width;a++){const index=imageIndex(a,b),pixel=(b*width+a)*4,raw=data.image[index],left=data.image[imageIndex(a-1,b)],right=data.image[imageIndex(a+1,b)],up=data.image[imageIndex(a,b-1)],down=data.image[imageIndex(a,b+1)],edge=Math.min(24,(Math.abs(right-left)+Math.abs(up-down))*.10),value=Math.max(0,Math.min(255,(raw-128)*1.07+128-edge)),original=data.labels[index],hasEdit=editsRef.current.has(index),effective=hasEdit?editsRef.current.get(index)!:original,color=palette[effective];let r=35+value*.78,g=30+value*.68,blue=24+value*.55;if(color&&((showOriginal&&original>0)||hasEdit)){const alpha=hasEdit ? .72 : .28;r=r*(1-alpha)+color[0]*alpha;g=g*(1-alpha)+color[1]*alpha;blue=blue*(1-alpha)+color[2]*alpha}if(hasEdit&&effective===0){r=80+value*.42;g=84+value*.42;blue=86+value*.42}image.data[pixel]=r;image.data[pixel+1]=g;image.data[pixel+2]=blue;image.data[pixel+3]=data.image[index]<252?255:0}
    oc.putImageData(image,0,0);const view=transform();if(!view)return;context.imageSmoothingEnabled=false;context.drawImage(off,view.ox,view.oy,off.width*view.scale,off.height*view.scale);context.strokeStyle="#f0f3f1";context.lineWidth=1;context.strokeRect(view.ox-.5,view.oy-.5,off.width*view.scale+1,off.height*view.scale+1);context.fillStyle="#f0f3f1";context.font="16px monospace";context.fillText(`${planeInfo.label} ${planeInfo.axis} ${slice}  |  0.5 mm`,view.ox+9,view.oy+19);
  },[data,plane,planeInfo,sliceIndex,showOriginal,zoom,pan,version,sizeVersion]);

  function point(event:React.PointerEvent<HTMLCanvasElement>){const view=transform(),canvas=canvasRef.current;if(!view||!canvas||!data)return null;const rect=canvas.getBoundingClientRect(),a=Math.floor((event.clientX-rect.left-view.ox)/view.scale),b=Math.floor((event.clientY-rect.top-view.oy)/view.scale);if(a<0||a>=view.wImage||b<0||b>=view.hImage)return null;return{a,b,voxel:planeVoxel(a,b,sliceIndex,plane,data.dims)}}
  function paintAt(event:React.PointerEvent<HTMLCanvasElement>){if(!isEditablePlane)return;const center=point(event);if(!center||!data||!strokeRef.current)return;const slice=sliceIndex,value=tool==="paint"?label:0,[width,height]=planeShape(data.dims,plane);for(let db=-brush;db<=brush;db++)for(let da=-brush;da<=brush;da++){if(da*da+db*db>brush*brush)continue;const a=center.a+da,b=center.b+db;if(a<0||a>=width||b<0||b>=height)continue;const voxel=planeVoxel(a,b,slice,plane,data.dims),index=index3d(voxel[0],voxel[1],voxel[2],data.dims);if(data.image[index]>=252)continue;if(!strokeSeen.current.has(index)){strokeSeen.current.add(index);strokeRef.current.push({index,had:editsRef.current.has(index),value:editsRef.current.get(index)??0})}if(tool==="restore"||value===data.labels[index])editsRef.current.delete(index);else editsRef.current.set(index,value)}setVersion(current=>current+1)}
  function pointerDown(event:React.PointerEvent<HTMLCanvasElement>){if(event.button===1||event.button===2||event.altKey||event.metaKey){event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);panRef.current={x:event.clientX,y:event.clientY,pan};return}if(!isEditablePlane)return;event.currentTarget.setPointerCapture(event.pointerId);strokeRef.current=[];strokeSeen.current=new Set;paintAt(event)}
  function pointerMove(event:React.PointerEvent<HTMLCanvasElement>){const rect=event.currentTarget.getBoundingClientRect(),next=point(event);setCursor(next?{x:event.clientX-rect.left,y:event.clientY-rect.top}:null);setCursorVoxel(next?.voxel??null);if(panRef.current){setPan({x:panRef.current.pan.x+event.clientX-panRef.current.x,y:panRef.current.pan.y+event.clientY-panRef.current.y});return}if(strokeRef.current&&isEditablePlane)paintAt(event)}
  function pointerUp(event:React.PointerEvent<HTMLCanvasElement>){if(panRef.current)panRef.current=null;if(strokeRef.current?.length&&isEditablePlane){const meaningful=strokeRef.current.filter(change=>{const had=editsRef.current.has(change.index);return had!==change.had||(had&&change.had&&editsRef.current.get(change.index)!==change.value)});if(meaningful.length){setUndo(items=>[...items,meaningful].slice(-60));setRedo([])}}strokeRef.current=null;strokeSeen.current.clear();if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
  function wheel(event:React.WheelEvent<HTMLCanvasElement>){event.preventDefault();const view=transform(),canvas=canvasRef.current;if(!view||!canvas)return;const rect=canvas.getBoundingClientRect(),localX=event.clientX-rect.left,localY=event.clientY-rect.top,imageX=(localX-view.ox)/view.scale,imageY=(localY-view.oy)/view.scale;setZoom(current=>{const next=Math.max(.7,Math.min(6,current*Math.exp(-event.deltaY*.0015))),w=canvas.clientWidth,h=canvas.clientHeight,[width,height]=planeShape(data?.dims??[394,466,378],plane),fit=Math.min((w-18)/width,(h-18)/height),nextScale=fit*next,nextBaseX=(w-width*nextScale)/2,nextBaseY=(h-height*nextScale)/2;setPan({x:localX-imageX*nextScale-nextBaseX,y:localY-imageY*nextScale-nextBaseY});return next})}
  function applyHistory(changes:StrokeChange[],direction:"undo"|"redo"){if(!isEditablePlane)return;const inverse:StrokeChange[]=[];for(const change of changes){inverse.push({index:change.index,had:editsRef.current.has(change.index),value:editsRef.current.get(change.index)??0});if(change.had)editsRef.current.set(change.index,change.value);else editsRef.current.delete(change.index)}if(direction==="undo"){setUndo(items=>items.slice(0,-1));setRedo(items=>[...items,inverse].slice(-60))}else{setRedo(items=>items.slice(0,-1));setUndo(items=>[...items,inverse].slice(-60))}setVersion(current=>current+1)}
  function download(){if(!data)return;if(!evidence.trim()){setStatus("根拠資料・参照箇所を入力してからJSONを書き出してください");return}const patch=makePatch(editsRef.current,data,note,authorGitHub,targetSide,evidence,confidence),blob=new Blob([JSON.stringify(patch,null,2)+"\n"],{type:"application/json"}),url=URL.createObjectURL(blob),anchor=document.createElement("a");anchor.href=url;anchor.download=`bigbrain-seg-patch-${new Date().toISOString().slice(0,10)}.json`;anchor.click();URL.revokeObjectURL(url);setStatus(`JSON書き出し済み・${patch.editCount.toLocaleString()} voxel`)}
  async function importFile(file:File){if(!data)return;try{const patch=JSON.parse(await file.text()) as SegmentationPatch;if(patch.format!=="brain-practical-segmentation-patch"||patch.version!==1||patch.sourceLabelsSha256!==LABEL_SHA256||patch.dims.some((value,index)=>value!==data.dims[index]))throw new Error("現在の0.5 mmラベル版に対応する差分ではありません");if(editsRef.current.size&&!window.confirm("現在の編集を読み込んだ差分で置き換えますか？"))return;editsRef.current=removeNoops(fromRuns(patch.runs,data.image.length),data.labels);setNote(patch.authorNote??"");setAuthorGitHub(patch.authorGitHub??"");setTargetSide(patch.targetSide??"mixed");setEvidence(patch.evidence??"");setConfidence(patch.confidence??"medium");setUndo([]);setRedo([]);setVersion(current=>current+1);setStatus(`JSONを読込・${editsRef.current.size.toLocaleString()} voxel`)}catch(reason){setStatus(`読込エラー: ${reason instanceof Error?reason.message:String(reason)}`)}}
  function clear(){if(!isEditablePlane||!editsRef.current.size||!window.confirm("端末内のすべての編集差分を消去しますか？ 書き出していない変更は戻せません。"))return;editsRef.current.clear();setUndo([]);setRedo([]);localStorage.removeItem(DRAFT_KEY);setVersion(current=>current+1);setStatus("編集差分を消去しました")}
  function jumpToSlice(index:number){if(!data)return;const bounded=Math.max(0,Math.min(planeAxisSize(data.dims,plane)-1,index));setPosition(planePositionForSlice(bounded,plane,data.dims));setCursor(null);setCursorVoxel(null)}
  function shiftSlice(delta:number){jumpToSlice(sliceIndex+delta)}
  function changePlane(next:Plane){setPlane(next);setCursor(null);setCursorVoxel(null);setPan({x:0,y:0});setZoom(1)}
  useEffect(()=>{const handler=(event:KeyboardEvent)=>{const target=event.target as HTMLElement|null;if(target?.matches("input,textarea,select"))return;if(!isEditablePlane)return;if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();if(event.shiftKey){if(redo.length)applyHistory(redo.at(-1)!,"redo")}else if(undo.length)applyHistory(undo.at(-1)!,"undo")}};window.addEventListener("keydown",handler);return()=>window.removeEventListener("keydown",handler)},[undo,redo,isEditablePlane]);

  return <div className="segWorkbench">
    <section className="segCanvasCard"><header><div><b>単一標本脳 0.5 mm</b><small>{planeInfo.label} {planeInfo.axis} {sliceIndex}・差分 {editsRef.current.size.toLocaleString()} voxel</small></div><span>{Math.round(zoom*100)}%</span></header><div className="segCanvasStage"><canvas ref={canvasRef} onContextMenu={event=>event.preventDefault()} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerLeave={()=>{setCursor(null);setCursorVoxel(null)}} onPointerUp={pointerUp} onPointerCancel={pointerUp} onWheel={wheel} aria-label={`BigBrain${planeInfo.label}${isEditablePlane?"の手動セグメンテーション編集領域":"の照合専用表示"}`}/>{cursor&&isEditablePlane&&<i className={`segBrushCursor ${tool}`} style={{left:cursor.x,top:cursor.y,width:Math.max(4,brush*2*(transform()?.scale??1)),height:Math.max(4,brush*2*(transform()?.scale??1))}}/>}{!isEditablePlane&&<div className="segReadOnlyNotice" role="status"><b>照合専用</b><span>{planeInfo.label}では塗布・消去・復元できません</span></div>}{!data&&<div className={`segLoading ${error?"error":""}`}>{error?"データを読み込めませんでした":"0.5 mm画像とラベルを読み込み中…"}</div>}<div className="segOrientation"><b>{planeInfo.top}</b><span>{planeInfo.left}　{planeInfo.right}</span><b>{planeInfo.bottom}</b></div></div><div className="segCoordinateReadout" aria-live="polite"><b>格子座標</b><span>X {cursorVoxel?.[0]??"—"}　Y {cursorVoxel?.[1]??"—"}　Z {cursorVoxel?.[2]??"—"}</span><small>{planeInfo.label} {planeInfo.axis} {sliceIndex} / 0.5 mm voxel</small></div><footer><div className="segSliceNavigation"><button onClick={()=>shiftSlice(1)} aria-label={`${planeInfo.increment}へ1 voxel移動`} title={`${planeInfo.increment}へ1 voxel`} disabled={!data||sliceIndex>=planeAxisSize(data.dims,plane)-1}>{planeInfo.increment}へ1枚</button><label><span>{planeInfo.rangeStart}</span>{plane==="horizontal"?<input type="range" min="0" max="100" step={data?100/(data.dims[2]-1):.25} value={position} onChange={event=>setPosition(Number(event.target.value))}/>:<input type="range" min="0" max="100" step={data?100/(planeAxisSize(data.dims,plane)-1):.25} value={position} onChange={event=>setPosition(Number(event.target.value))}/>}<span>{planeInfo.rangeEnd}</span></label><button onClick={()=>shiftSlice(-1)} aria-label={`${planeInfo.decrement}へ1 voxel移動`} title={`${planeInfo.decrement}へ1 voxel`} disabled={!data||sliceIndex<=0}>{planeInfo.decrement}へ1枚</button></div><button onClick={()=>{setZoom(1);setPan({x:0,y:0})}}>表示をリセット</button></footer></section>
    <aside className="segControls"><span className="guideIndex">CONTRIBUTOR TOOL · LOCAL DRAFT</span><h2>手動セグメンテーション</h2><p>ブラウザ上では元ラベルを変更せず、修正差分だけを端末に保存します。レビュー用JSONを書き出してPull Requestへ添付してください。</p>
      <div className="segPlaneTabs" role="tablist" aria-label="照合する断面方向">{(["horizontal","coronal","sagittal"] as Plane[]).map(key=><button key={key} role="tab" aria-selected={plane===key} className={plane===key?"active":""} onClick={()=>changePlane(key)}>{segmentationPlaneNames[key].label}<small>{segmentationPlaneNames[key].axis}軸</small></button>)}</div>
      {!isEditablePlane&&<div className="segReadOnlyPanel" role="status"><b>照合専用</b><p>{planeInfo.label}は、同じBigBrain原画像・現行ラベル・端末内差分を重ねて確認する表示です。塗布・消去・復元、Undo/Redo、差分の消去はできません。</p></div>}
      <div className="segToolRow" role="group" aria-label="編集ツール">{(["paint","erase","restore"] as Tool[]).map(key=><button key={key} className={tool===key?"active":""} disabled={!isEditablePlane} aria-disabled={!isEditablePlane} onClick={()=>setTool(key)}>{key==="paint"?"塗る":key==="erase"?"背景にする":"元へ戻す"}</button>)}</div>
      <label className="segField"><span>構造ラベル</span><select value={label} onChange={event=>setLabel(Number(event.target.value))} disabled={tool!=="paint"||!isEditablePlane}>{labelGroups.map(group=><optgroup key={group.name} label={group.name}>{group.items.map(([id,name])=><option value={id} key={id}>{id.toString().padStart(2,"0")}　{name}</option>)}</optgroup>)}</select></label>
      <div className="segSelected"><i style={{background:`rgb(${(palette[label]??[230,230,230]).join(",")})`}}/><span><b>{selectedName}</b><small>ID {label}・{tool==="paint"?"新しい差分として塗布":tool==="erase"?"ラベル0へ変更":"この範囲の差分を除去"}</small></span></div>
      <label className="segField"><span>ブラシ半径 <b>{brush} voxel / {(brush*.5).toFixed(1)} mm</b></span><input type="range" min="1" max="20" value={brush} disabled={!isEditablePlane} onChange={event=>setBrush(Number(event.target.value))}/></label>
      <label className="segCheck"><input type="checkbox" checked={showOriginal} onChange={event=>setShowOriginal(event.target.checked)}/><span>既存セグメンテーションを薄く表示</span></label>
      <div className="segStats"><div><span>全編集</span><b>{editsRef.current.size.toLocaleString()}</b><small>voxel</small></div><div><span>{planeInfo.label}の編集</span><b>{editedOnSlice.toLocaleString()}</b><small>voxel</small></div></div>
      <div className="segComparison" aria-label="直交断照合ラベル"><header><b>照合対象ラベル</b><small>現行ラベル＋端末内差分</small></header><div>{comparisonCounts.map(item=><span key={item.id}><i style={{background:`rgb(${(palette[item.id]??[150,150,150]).join(",")})`}}/><b>{item.name}</b><small>元 {item.original.toLocaleString()} ／ 現在 {item.current.toLocaleString()}{item.changed?` ／ 差分 ${item.changed.toLocaleString()}`:""}</small></span>)}</div><p>39/40乳頭体、旧33視交叉候補、27脳幹を同じ格子で比較します。36–38は自動生成しません。</p></div>
      {editedSlices.length>0&&<div className="segEditedSlices"><header><b>編集済み断面</b><small>{editedSlices.length} slices</small></header><div>{editedSlices.map(index=><button key={index} className={index===sliceIndex?"active":""} onClick={()=>jumpToSlice(index)}>{planeInfo.axis} {index}</button>)}</div></div>}
      {transitions.length>0&&<div className="segTransitions"><header><b>変更内訳</b><small>上書き先を確認</small></header><div>{transitions.slice(0,8).map(item=><span key={`${item.from}:${item.to}`}><i>{item.from===0?"背景":labelName.get(item.from)??`ID ${item.from}`} → {item.to===0?"背景":labelName.get(item.to)??`ID ${item.to}`}</i><b>{item.count.toLocaleString()}</b></span>)}</div>{transitions.length>8&&<small>ほか {transitions.length-8} 種類</small>}</div>}
      <div className="segHistory"><button disabled={!isEditablePlane||!undo.length} onClick={()=>isEditablePlane&&undo.length&&applyHistory(undo.at(-1)!,"undo")}>↶ 元に戻す</button><button disabled={!isEditablePlane||!redo.length} onClick={()=>isEditablePlane&&redo.length&&applyHistory(redo.at(-1)!,"redo")}>↷ やり直す</button></div>
      <label className="segField"><span>変更内容・根拠メモ</span><textarea value={note} onChange={event=>setNote(event.target.value)} placeholder="例：水平断Z 181–190、左被殻外側境界を組織像に沿って修正。根拠資料・確認者も記載。"/></label>
      <div className="segMetadataGrid"><label className="segField"><span>対象側</span><select value={targetSide} onChange={event=>setTargetSide(event.target.value as TargetSide)}><option value="left">左</option><option value="right">右</option><option value="bilateral">両側</option><option value="midline">正中</option><option value="mixed">複数・混在</option></select></label><label className="segField"><span>編集者の確度</span><select value={confidence} onChange={event=>setConfidence(event.target.value as EditConfidence)}><option value="high">高</option><option value="medium">中</option><option value="low">低</option></select></label></div>
      <label className="segField"><span>根拠資料・参照箇所</span><input required value={evidence} onChange={event=>setEvidence(event.target.value)} placeholder="文献・公開データ・講義資料名と頁など（転載物は添付しない）"/></label>
      <p className="segReviewStatus"><b>確認状態</b><span>未レビュー</span><small>書き出した差分は自動採用されません。確認者と採否はPull Requestで記録します。</small></p>
      <label className="segField"><span>GitHubユーザー名</span><input value={authorGitHub} onChange={event=>setAuthorGitHub(event.target.value)} placeholder="username（任意、PRと照合用）"/></label>
      <div className="segFiles"><button className="primary" onClick={download} disabled={!editsRef.current.size}>差分JSONを書き出す</button><button onClick={()=>fileRef.current?.click()} disabled={!isEditablePlane}>差分JSONを読み込む</button><input ref={fileRef} hidden type="file" aria-label="差分JSONファイルを選択" accept="application/json,.json" onChange={event=>{const file=event.target.files?.[0];if(file&&isEditablePlane)void importFile(file);event.currentTarget.value=""}}/><button className="danger" onClick={clear} disabled={!isEditablePlane||!editsRef.current.size}>編集をすべて消去</button></div>
      <p className="segStatus">{status}</p><div className="accuracyNote warning"><b>{isEditablePlane?"編集上の注意":"照合上の注意"}</b><p>{isEditablePlane?"左クリック／ドラッグで編集、ホイールで拡大、右・中ドラッグまたは⌥ドラッグで移動します。差分はこの端末だけに保存され、公式ラベルには自動反映されません。":"冠状断・矢状断は照合専用です。元画像・現行ラベル・端末内差分の一致を確認し、曖昧な境界を推測で塗らないでください。"}</p></div>
    </aside>
  </div>;
}
