import { useEffect, useRef, useState } from "react";
import { useBigBrainSectionGuideData } from "./AtlasVolumeCanvas";
import { coronalGuidePixels, coronalGuidePoint, FORAMEN_GUIDE, type CoronalCrop, type SectionGuideData } from "./foramenGuideData";

function GuideImage({data,y,crop,colored,overview,label}:{data:SectionGuideData;y:number;crop:CoronalCrop;colored:boolean;overview?:boolean;label:string}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=ref.current;if(!canvas)return;
    // Integer enlargement preserves the 0.5 mm sampling; annotations use the same transform.
    const scale=overview?2:5;
    canvas.width=crop.width*scale;canvas.height=crop.height*scale;
    const context=canvas.getContext("2d");if(!context)return;
    const source=document.createElement("canvas");source.width=crop.width;source.height=crop.height;
    source.getContext("2d")!.putImageData(new ImageData(coronalGuidePixels(data,y,crop,colored),crop.width,crop.height),0,0);
    context.imageSmoothingEnabled=false;context.drawImage(source,0,0,canvas.width,canvas.height);
    context.save();context.scale(scale,scale);context.strokeStyle="#ad4a00";context.lineWidth=overview?1.5:.65;
    if(overview){
      const detail=FORAMEN_GUIDE.crop,top=coronalGuidePoint(detail.x,detail.z+detail.height-1,crop);
      context.strokeRect(top.x-.5,top.y-.5,detail.width,detail.height);
    }else{
      const point=coronalGuidePoint(FORAMEN_GUIDE.center[0],FORAMEN_GUIDE.center[2],crop);
      context.setLineDash([1.3,1.3]);context.beginPath();context.arc(point.x,point.y,5.5,0,Math.PI*2);context.stroke();
    }
    context.restore();
  },[data,y,crop,colored,overview]);
  return <figure><figcaption>{label}</figcaption><div className="foramenGuideImage"><canvas ref={ref} role="img" aria-label={label}/><span className="foramenGuideLeft">L</span><span className="foramenGuideRight">R</span><span className="foramenGuideSuperior">S</span></div></figure>;
}

function GuideContent({english,onObserve}:{english:boolean;onObserve:(y:number)=>void}){
  const {data,error,retry}=useBigBrainSectionGuideData();
  const [y,setY]=useState<number>(FORAMEN_GUIDE.center[1]);
  return <div className="foramenGuideBody" lang={english?"en":"ja"}>
    <p>{english?"The foramina of Monro connect each lateral ventricle to the third ventricle, between the fornix and thalamus. This guide locates the reviewed passage on the right side of this specimen.":"モンロー孔（脳室間孔）は、脳弓と視床の間で左右それぞれの側脳室を第三脳室につなぐ通路です。この図では、この標本で画像照合した右側の通路周辺を示します。"}</p>
    <div className="foramenGuideControls"><div role="group" aria-label={english?"Adjacent coronal slices":"隣接する冠状断"}>{FORAMEN_GUIDE.slices.map(slice=><button type="button" key={slice} aria-pressed={slice===y} onClick={()=>setY(slice)}>Y {slice}</button>)}</div><span>{english?"0.5 mm apart · anterior → posterior":"1枚＝0.5 mm・前方 → 後方"}</span><button type="button" onClick={()=>onObserve(y)}>{english?"Open this slice in the viewer":"この断面をメイン表示"}</button></div>
    {error?<p role="alert">{english?"The images could not be loaded.":"画像を読み込めませんでした。"} <button type="button" onClick={retry}>{english?"Retry":"再読み込み"}</button></p>:!data?<p role="status">{english?"Loading specimen images…":"標本画像を読み込み中…"}</p>:<div className="foramenGuideFigures">
      <GuideImage data={data} y={y} crop={{x:0,z:0,width:data.dims[0],height:data.dims[2]}} colored={false} overview label={english?"1 · Whole section — box marks enlargement":"1 · 全体位置 — 枠内を拡大"}/>
      <GuideImage data={data} y={y} crop={FORAMEN_GUIDE.crop} colored={false} label={english?"2 · Original image, enlarged":"2 · 原画像の拡大"}/>
      <GuideImage data={data} y={y} crop={FORAMEN_GUIDE.crop} colored label={english?"3 · Current ventricular labels":"3 · 現在の脳室ラベル"}/>
    </div>}
    <div className="foramenGuideLegend"><span><i className="lateral"/>{english?"Lateral ventricles":"側脳室"}</span><span><i className="third"/>{english?"Third ventricle":"第三脳室"}</span><span>{english?"Dashed circle: observation region, not a boundary":"点線の円：観察位置の目安（境界ではありません）"}</span></div>
    <p className="foramenGuideNote">{english?"Follow the white space in the raw image into the midline cavity, comparing the three adjacent slices. Current teaching labels use contrasting colors in this guide; their transition does not define the exact margin of the foramen. The foramen has no separate label. This location is a project interpretation, not expert-validated.":"原画像の白い腔が正中の腔へ続く位置を、隣接する3枚で見比べてください。現行ラベルをこの図専用の比較しやすい配色で表示しています。色の切り替わりが孔の厳密な境界を示すわけではありません。孔の独立ラベルはありません。位置の解釈はプロジェクト内の判断で、専門家確認前です。"}</p>
    <small>{english?"BigBrain · 0.5 mm display resampling · grayscale without cavity masking. Anatomical reference: ":"BigBrain・表示用0.5 mm再標本化・腔を背景処理しないグレースケール。解剖学的な参考："}<a href="https://doi.org/10.3389/fnana.2022.894606" target="_blank" rel="noreferrer">Rushmore et al., 2022</a>{english?" (naming conventions are not transferred to this specimen).":"（文献の区分規約をこの標本へ転用したものではありません）。"}</small>
  </div>;
}

export function ForamenGuide({english,onObserve}:{english:boolean;onObserve:(y:number)=>void}){
  const [open,setOpen]=useState(false);
  return <details className="foramenGuide" open={open} onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{english?"Where is the foramen of Monro? — right-sided observation guide":"モンロー孔はどこ？ — 右脳室間孔周辺の観察ガイド"}</summary>
    {open&&<GuideContent english={english} onObserve={y=>{setOpen(false);onObserve(y)}}/>}
  </details>;
}
