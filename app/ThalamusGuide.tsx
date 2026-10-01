import {useEffect,useRef,useState} from "react";
import {loadThalamusGuideMesh,loadThalamusGuideLgnMesh} from "./AtlasVolumeCanvas";
import "./thalamus-guide.css";
import vimReference from "./thalamusVimReference.json";
import mgbReference from "./thalamusMgbReference.json";
import {sectionLinkHash} from "../src/sectionLink.mjs";
import {SEGMENTATION_LABEL_SHA256} from "./segmentationLabelRevision";

// Seven coarse authored anchors, NOT registered atlas coordinates or nucleus bounds.
// VIM is separately sourced from a single BigBrain histology annotation.
// Fractions: medial→lateral, posterior→anterior, inferior→superior.
type Region={key:string;name:[string,string];at?:number[];where:[string,string];role:[string,string]};
const regions:Region[]=[
  {key:"A",name:["前核群","Anterior group"],at:[.28,.82,.72],where:["前上方。内側寄りの前端が目印です。","Anterosuperior, near the medial part of the anterior pole."],role:["乳頭体からの入力と帯状回への投射を通じ、記憶に関わります。","Memory-related connections link mammillary bodies with cingulate cortex."]},
  {key:"MD",name:["背内側核","Mediodorsal nucleus"],at:[.24,.52,.65],where:["内側寄り。外側核群とは内髄板を挟む位置関係です。","Medial, across the internal medullary lamina from the lateral group."],role:["前頭前野との結びつきが強く、認知・情動に関わります。","Strong prefrontal connections contribute to cognition and emotion."]},
  {key:"VA",name:["腹側前核","Ventral anterior nucleus"],at:[.55,.73,.45],where:["外側核群の前方・腹側。前核群より外側・下方を目安にします。","Anterior and ventral in the lateral group, lateral and inferior to the anterior group."],role:["大脳基底核からの入力を前頭葉の運動関連領域へつなぎます。","Basal ganglia inputs reach frontal motor-related cortex through this motor relay."]},
  {key:"VL",name:["腹側外側核","Ventral lateral nucleus"],at:[.70,.55,.36],where:["VAの後方。外側核群の腹側にある運動中継領域です。","Behind VA, in the ventral tier of the lateral group."],role:["小脳・大脳基底核と運動皮質を結ぶ中継に関わります。","Motor relay connections link cerebellar and basal ganglia outputs with motor cortex."]},
  {key:"VPL",name:["腹側後外側核","Ventral posterolateral nucleus"],at:[.76,.34,.32],where:["腹側核群の後方・外側寄り。VPMとの位置関係に注目します。","Posterior and lateral in the ventral tier; lateral to VPM."],role:["体幹・四肢の体性感覚を中継します。内側毛帯・脊髄視床路の入力を受けます。","Relays body somatosensation, receiving medial lemniscal and spinothalamic inputs."]},
  {key:"VPM",name:["腹側後内側核","Ventral posteromedial nucleus"],at:[.48,.34,.32],where:["VPLの内側。腹側後核群の中で顔の感覚を担う領域です。","Medial to VPL in the ventral posterior group."],role:["三叉神経系からの顔の体性感覚を中継します。","Relays facial somatosensation from trigeminal pathways."]},
  {key:"Pul",name:["視床枕","Pulvinar"],at:[.52,.13,.58],where:["視床後端の膨らみ。膝状体はその下方に位置します。","The expanded posterior pole; geniculate bodies lie inferiorly."],role:["頭頂・側頭・後頭皮質との結びつきを持つ連合領域です。","An association region connected with parietal, temporal and occipital cortex."]},

  {key:"VIM",name:["腹側中間核 · BigBrain参照","Ventral intermediate · BigBrain reference"],where:["腹側外側核群の運動中継領域。BigBrain第3797切片で注釈された輪郭を表示します。前後への広がりはこの一枚だけでは分かりません。","A motor relay region in the ventral lateral group. The contour was annotated on BigBrain section 3797; this single section does not show its anterior–posterior extent."],role:["小脳と運動関連皮質を結ぶ中継に関わります。VL・VIMなどの区分名はアトラスにより異なるため、VL全体と同じ範囲とは読みません。","Participates in cerebellar–motor cortical relay connections. VL/VIM subdivisions differ between atlases; this contour is not the whole VL territory."]},
  {key:"MGB",name:["内側膝状体 · BigBrain参照","Medial geniculate · BigBrain reference"],where:["視床枕の後下方、外側膝状体より内側。BigBrainの公表された3区分の和集合を桃色の参照形状で示します。金色の点はその代表位置です。","Posteroinferior to the pulvinar and medial to the lateral geniculate body. The pink reference shape comes from the union of three published BigBrain subdivisions; the gold dot marks a representative position."],role:["下丘からの聴覚情報を中継し、聴放線を経て横側頭回の聴覚皮質へ送ります。外側膝状体の視覚中継と対比して覚えます。","Relays auditory input from the inferior colliculus toward auditory cortex in the transverse temporal gyri through the auditory radiation. Contrast this auditory relay with the visual relay in the lateral geniculate body."]},
  {key:"LGN",name:["外側膝状体 · 標本形状","Lateral geniculate · specimen shape"],where:["視床枕の下方、内側膝状体より外側。青色の形は、この標本の採用済み外側膝状体です。内側膝状体の聴覚中継との位置関係を比べます。","Inferior to the pulvinar and lateral to the medial geniculate body. The blue shape is the adopted lateral geniculate segmentation of this specimen. Compare its position with the auditory relay in MGB."],role:["視索から網膜の情報を受け、視放線を通じて一次視覚野へ送ります。外側膝状体は視覚、内側膝状体は聴覚の中継部です。","Receives retinal input through the optic tract and sends output through the optic radiation to primary visual cortex. LGN relays vision; MGB relays hearing."]},
];
type GuideMesh=Awaited<ReturnType<typeof loadThalamusGuideMesh>>;
function xyzPoints(mesh:GuideMesh):Array<[number,number,number]>{
  const points:Array<[number,number,number]>=[];
  for(let i=0;i<mesh.vertices.length;i+=3)points.push([mesh.vertices[i+2],mesh.vertices[i+1],mesh.vertices[i]]);
  return points;
}
// A label leader on the existing surface, not an anatomical nuclear centre.
function lgnLabelPoint(mesh:GuideMesh){
  const left=xyzPoints(mesh).filter(point=>point[0]<0);
  return [0,1,2].map(axis=>left.reduce((sum,point)=>sum+point[axis],0)/left.length);
}
function leftBounds(mesh:GuideMesh){
  const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(const point of xyzPoints(mesh))if(point[0]<0)for(let axis=0;axis<3;axis++){lo[axis]=Math.min(lo[axis],point[axis]);hi[axis]=Math.max(hi[axis],point[axis])}
  return {lo,hi};
}
function referencePoint(region:Region,mesh:GuideMesh,lgn:GuideMesh|null):number[]|null{
  if(region.key==="LGN")return lgn?lgnLabelPoint(lgn):null;
  if(region.key==="VIM")return vimReference.displayReferencePointXYZmm;
  if(region.key==="MGB")return mgbReference.references.find(r=>r.side==="left")!.displayReferencePointXYZmm;
  const {lo,hi}=leftBounds(mesh),at=region.at!;
  return [hi[0]-at[0]*(hi[0]-lo[0]),lo[1]+at[1]*(hi[1]-lo[1]),lo[2]+at[2]*(hi[2]-lo[2])];
}
type View="dorsal"|"medial"|"oblique"|"coronal";
type ReferenceSurface={verticesXYZmm:number[][];faces:number[][]};
function Shape({mesh,lgn,mgb,selected,view,english,compare}:{mesh:GuideMesh;lgn:GuideMesh|null;mgb:ReferenceSurface|null;selected:number;view:View;english:boolean;compare:boolean}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const c=ref.current?.getContext("2d");if(!c)return;
    const points=xyzPoints(mesh),lgnPoints=lgn?xyzPoints(lgn):[];
    // Current mesh is Z,Y,X in mm; select left X<0 without altering the mesh.
    const left=points.filter(p=>p[0]<0);if(!left.length)return;
    const {lo,hi}=leftBounds(mesh);
    const center=lo.map((v,a)=>(v+hi[a])/2);
    const project=(p:readonly number[])=>{const [x,y,z]=p.map((v,a)=>v-center[a]);return view==="dorsal"?[x,-y,z]:view==="medial"?[-y,-z,x]:view==="coronal"?[x,-z,y]:[x*.8-y*.6,-z*.8-y*.4,x*.6+y*.8]};
    const faces:Array<{p:number[][];depth:number;lgn?:boolean;mgb?:boolean}>=[];
    for(let i=0;i<mesh.faces.length;i+=3){const tri=[points[mesh.faces[i]],points[mesh.faces[i+1]],points[mesh.faces[i+2]]];if(tri.some(p=>p[0]>=0))continue;const p=tri.map(project);faces.push({p,depth:p.reduce((n,v)=>n+v[2],0)/3})}
    const showLgn=compare||["LGN","MGB"].includes(regions[selected].key);
    if(lgn&&showLgn)for(let i=0;i<lgn.faces.length;i+=3){const tri=[lgnPoints[lgn.faces[i]],lgnPoints[lgn.faces[i+1]],lgnPoints[lgn.faces[i+2]]];if(tri.some(point=>point[0]>=0))continue;const p=tri.map(project);faces.push({p,depth:p.reduce((n,v)=>n+v[2],0)/3,lgn:true})}
    const showMgb=compare||["MGB","LGN"].includes(regions[selected].key);
    if(mgb&&showMgb)for(const face of mgb.faces){const p=face.map(index=>project(mgb.verticesXYZmm[index]));faces.push({p,depth:p.reduce((n,v)=>n+v[2],0)/3,mgb:true})}
    const bounds=[Infinity,Infinity,-Infinity,-Infinity];for(const p of [...left,...lgnPoints.filter(point=>point[0]<0),...(mgb?mgb.verticesXYZmm:[])].map(project)){bounds[0]=Math.min(bounds[0],p[0]);bounds[1]=Math.min(bounds[1],p[1]);bounds[2]=Math.max(bounds[2],p[0]);bounds[3]=Math.max(bounds[3],p[1])}
    const [xmin,ymin,xmax,ymax]=bounds,scale=Math.min(270/(xmax-xmin),190/(ymax-ymin)),cx=(xmin+xmax)/2,cy=(ymin+ymax)/2;
    const screen=(p:number[])=>[180+(p[0]-cx)*scale,125+(p[1]-cy)*scale];
    c.fillStyle="#182225";c.fillRect(0,0,360,250);faces.sort((a,b)=>a.depth-b.depth);
    for(const face of faces){const p=face.p.map(screen);c.beginPath();c.moveTo(p[0][0],p[0][1]);c.lineTo(p[1][0],p[1][1]);c.lineTo(p[2][0],p[2][1]);c.closePath();const light=Math.max(85,Math.min(175,125+face.depth*2));c.fillStyle=face.mgb?`rgb(${Math.min(235,light+55)},${Math.round(light*.65)},${Math.min(225,light+35)})`:face.lgn?`rgb(${Math.round(light*.55)},${light},${Math.min(225,light+60)})`:`rgb(${light},${light},${light+15})`;c.fill()}
    // Draw the selected marker last so it remains distinct in overlapping views.
    const markerIndices=compare?[...regions.keys()].filter(index=>index!==selected).concat(selected):[selected];
    for(const index of markerIndices){
      const region=regions[index],anchor=referencePoint(region,mesh,lgn);if(!anchor)continue;
      const [sx,sy]=screen(project(anchor)),active=index===selected;
      c.strokeStyle=active?"#ffc86b":"#b8d3d8";c.fillStyle=c.strokeStyle;c.lineWidth=active?2:1;
      if(active&&region.key==="VIM"){const contour=vimReference.displayContourXYZmm.map(point=>screen(project(point)));c.beginPath();contour.forEach((p,i)=>{if(i===0)c.moveTo(p[0],p[1]);else c.lineTo(p[0],p[1])});c.closePath();c.stroke()}
      if(active&&!["VIM","LGN"].includes(region.key)&&!(region.key==="MGB"&&mgb)){c.setLineDash([3,3]);c.beginPath();c.arc(sx,sy,10,0,Math.PI*2);c.stroke();c.setLineDash([])}
      c.beginPath();c.arc(sx,sy,active?3:2,0,Math.PI*2);c.fill();c.font=active?"bold 16px sans-serif":"12px sans-serif";const leftLabel=["VA","VL","VPL"].includes(region.key),offset=active?14:6;c.fillText(region.key,leftLabel?sx-offset-c.measureText(region.key).width:sx+offset,sy+5);
    }
    c.fillStyle="#fff";c.font="13px sans-serif";c.fillText(english?"Left thalamus":"左視床",12,20);
    if(view==="dorsal"){c.fillText("A",174,36);c.fillText("P",174,240);c.fillText("L",12,130);c.fillText("M",333,130)}
    if(view==="medial"){c.fillText("A",10,130);c.fillText("P",337,130);c.fillText("S",174,36);c.fillText("I",174,240)}
    if(view==="coronal"){c.fillText("L",12,130);c.fillText("M",333,130);c.fillText("S",174,36);c.fillText("I",174,240)}
    if(view==="oblique")for(const [label,dx,dy] of [["A",-.6,-.4],["L",-.8,0],["S",0,-.8]] as const){const x=320+dx*35,y=225+dy*35;c.strokeStyle="#fff";c.lineWidth=1;c.beginPath();c.moveTo(320,225);c.lineTo(x,y);c.stroke();c.fillText(label,x-4,y-5)}
  },[mesh,lgn,mgb,selected,view,english,compare]);
  return <canvas width={360} height={250} ref={ref} role="img" aria-label={english?`Left thalamus: approximate projected location of ${regions[selected].name[1]}`:`左視床上に投影した${regions[selected].name[0]}の参考位置`}/>;
}
function Content({english,initialRegion}:{english:boolean;initialRegion?:string}){
  const [mesh,setMesh]=useState<GuideMesh|null>(null),[lgn,setLgn]=useState<GuideMesh|null>(null),[lgnFailed,setLgnFailed]=useState(false),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0),[selected,setSelected]=useState(()=>Math.max(0,regions.findIndex(region=>region.key===initialRegion))),[view,setView]=useState<View>("oblique"),[compare,setCompare]=useState(false);
  const [mgb,setMgb]=useState<ReferenceSurface|null>(null),[mgbFailed,setMgbFailed]=useState(false);
  const needMgb=compare||["MGB","LGN"].includes(regions[selected].key);
  useEffect(()=>{if(!needMgb)return;let active=true;setMgbFailed(false);import("./thalamusMgbSurface.json").then(module=>{if(active)setMgb(module.default)},()=>{if(active)setMgbFailed(true)});return()=>{active=false}},[needMgb,attempt]);
  useEffect(()=>{let active=true;setFailed(false);loadThalamusGuideMesh().then(value=>{if(active)setMesh(value)},()=>{if(active)setFailed(true)});return()=>{active=false}},[attempt]);
  useEffect(()=>{let active=true;setLgnFailed(false);loadThalamusGuideLgnMesh().then(value=>{if(active)setLgn(value)},()=>{if(active)setLgnFailed(true)});return()=>{active=false}},[attempt]);
  const region=regions[selected],lang=english?1:0;
  const anchor=mesh?referencePoint(region,mesh,lgn):null;
  // Use exactly the point drawn in the guide, including schematic anchors.
  // Display coordinates use the application's origin, not native BigBrain mm.
  const sourcePosition=anchor?.map((value,axis)=>(value-[-98,-116,-90][axis])/.5);
  const referenceVisible=["MGB","LGN"].includes(region.key)?["thalamus","lateralGeniculateBodies","brainstem"]:region.key==="VIM"?["thalamus","internalCapsule"]:["thalamus","internalCapsule","thirdVentricle"];
  const referenceLink=sourcePosition?sectionLinkHash("coronal",{version:1,positions:{coronal:sourcePosition[1]/(vimReference.applicationDimensionsXYZ[1]-1)*100,horizontal:52,sagittal:52},visible:referenceVisible,selected:region.key==="LGN"?"lateralGeniculateBodies":"thalamus",layout:"both",views:1,share:50},referenceVisible,SEGMENTATION_LABEL_SHA256):null;
  return <div className="thalamusGuideBody" lang={english?"en":"ja"}>
    <p>{english?"Explore anterior memory-related, medial prefrontal-related, ventral motor/sensory and posterior association regions.":"前方の記憶関連、内側の前頭前野関連、腹側の運動・感覚中継、後方の連合領域という並びを確認します。"}</p>
    <div className="thalamusGuideRegions" role="group" aria-label={english?"Thalamic regions":"視床の領域"}>{regions.map((item,index)=><button key={item.key} type="button" aria-pressed={selected===index} onClick={()=>{setSelected(index);if(item.key==="VIM")setView("coronal")}}>{item.key} · {item.name[lang]}</button>)}</div>
    <div className="thalamusGuideLayout"><div><div className="thalamusGuideViews">{(["oblique","dorsal","medial","coronal"] as View[]).map((item,index)=><button key={item} type="button" aria-pressed={view===item} onClick={()=>setView(item)}>{(english?["Oblique","From above","From medial side","From behind"]:["斜め","上から","内側から","後ろから"])[index]}</button>)}</div><label className="thalamusGuideCompare"><input type="checkbox" checked={compare} onChange={event=>setCompare(event.target.checked)}/>{english?"Compare all reference positions":"ほかの核群の参考位置も重ねる"}</label>{mesh?<Shape mesh={mesh} lgn={lgn} mgb={mgb} selected={selected} view={view} english={english} compare={compare}/>:failed?<p role="alert">{english?"Image unavailable":"形状を読み込めませんでした"} <button onClick={()=>setAttempt(n=>n+1)}>{english?"Retry":"再試行"}</button></p>:<p role="status">{english?"Loading thalamic shape…":"視床の形状を読み込み中…"}</p>}</div><article aria-live="polite"><h4>{region.key} · {region.name[lang]}</h4><p>{region.where[lang]}</p><p>{region.role[lang]}</p>{referenceLink&&<p><a href={referenceLink}>{region.at?(english?"Compare this level in sections and 3D":"この前後位置を断面と3Dで比べる"):(english?"View this location in sections and 3D":"この位置の断面と3Dを見る")}</a><br/><small>{region.key==="LGN"?(english?"The adopted LGN labels are shown with the thalamus and brainstem.":"採用済み外側膝状体ラベルを、視床・脳幹とともに表示します。"):region.key==="MGB"?(english?"Thalamus, lateral geniculate bodies and brainstem provide landmarks; MGB is not coloured separately.":"視床・外側膝状体・脳幹を位置の基準に表示します。MGBの個別着色ではありません。"):region.key==="VIM"?(english?"The whole thalamus and internal capsule are shown as landmarks; VIM is not coloured separately.":"位置の基準として視床全体と内包を表示します。VIMの個別着色ではありません。"):(english?"Find the thalamus between the third ventricle medially and internal capsule laterally. This level follows the schematic point; the nucleus is not coloured separately.":"内側の第三脳室と外側の内包の間にある視床を探します。模式点の前後位置を示し、核の個別着色ではありません。")}</small></p>}</article></div>
    <p className="thalamusGuideScope">{english?"Grey: left thalamus. Blue: adopted LGN shape. Pink: published MGB reference shape. Gold: selected reference location. The seven A–Pul points are schematic; VIM and MGB use same-BigBrain research references. Reference points do not show nuclear boundaries.":"灰色は左視床、青色は採用済み外側膝状体、桃色は文献由来の内側膝状体参照形状、金色は選択した参考位置。A〜Pulの7点は模式的な目印、VIMとMGBは同一BigBrainの研究資料に基づきます。点は核の境界を示しません。"}</p>{mgbFailed&&<p role="alert">{english?"MGB reference shape unavailable; its reference point remains visible.":"内側膝状体の参照形状を読み込めません。参考点は引き続き表示します。"} <button onClick={()=>setAttempt(n=>n+1)}>{english?"Retry":"再試行"}</button></p>}{lgnFailed&&<p role="alert">{english?"LGN landmark unavailable; other locations remain available.":"外側膝状体の形状を読み込めません。ほかの参考位置は観察できます。"} <button onClick={()=>setAttempt(n=>n+1)}>{english?"Retry":"再試行"}</button></p>}
    <details><summary>{english?"References and method":"出典・表示方法"}</summary><p className="thalamusGuideScope">{english?"Blue shape: the adopted left LGN (union of six published same-BigBrain layers). It is shown when LGN/MGB is selected or comparison is enabled. Its label point is a surface-based label leader, not a nuclear centre. ":"青色の形状は採用済みの左外側膝状体（同一BigBrainの公表6層の和集合）。LGN/MGB選択時または比較時に示します。LGNの点は文字の位置目印で、核の中心ではありません。"}</p><p className="thalamusGuideScope">{english?"Grey: this specimen’s left thalamus. Gold: the selected reference location; pale blue: other reference locations when comparison is enabled. The seven A–Pul points are coarse schematic positions. VIM uses a reference point from a published BigBrain section; its gold outline appears when selected. This single contour is not a 3D nuclear boundary. The pink MGB reference surface is reconstructed from the union of three published same-BigBrain subdivisions sampled at 0.5 mm. It lies below the grey thalamic body and is kept separate from the application segmentation. Its point marks a representative position; a dashed circle shown before the surface loads does not indicate size. Locations are projected through the shape, not surface features. The VIM contour is left-sided only; schematic arrangements can be read as mirrored on the right. Most nuclei cannot be identified on gross slices.":"灰色は本標本の左視床。金色は選択した核群の目印、淡い青は比較時のほかの核群の目印。A〜Pulの7点は模式的な目印。VIMはBigBrain文献切片から移した参照点で、選択時に金色の輪郭を示します。この一枚の輪郭は核全体の3D境界ではありません。桃色MGB参照形状は同一BigBrainの公表3区分の和集合を0.5 mmで標本化して再構築し、灰色の視床本体より下に位置します。アプリの分節ラベルとは別です。金色の点は代表位置で、形状読込前の点線の円は大きさを示しません。内部位置を形状越しに投影しており、表面構造ではありません。VIM輪郭は左側のみ。模式的な配置は右側も左右対称の関係として読みます。多くの核は肉眼断面だけでは同定できません。"}</p><p>{english?"The seven marker fractions are authored orientation aids. VIM uses a registered single-section contour; MGB uses a registered published-volume representative point. No nucleus labels or specimen voxels were changed.":"7点の位置比率は方向を学ぶ目安です。VIMは文献切片の参照輪郭、MGBは文献3D地図からの代表位置を登録座標へ移しています。核ラベルや標本voxelは変更していません。"}</p><a href="https://nba.uth.tmc.edu/neuroanatomy/L5/Lab05p10_index.html" target="_blank" rel="noreferrer">UTHealth · Thalamic nuclei</a><p><a href="https://doi.org/10.1016/j.morpho.2018.07.060" target="_blank" rel="noreferrer">Pascal et al. (2018) · BigBrain / Dejerine</a> — {english?"Research precedent (abstract reviewed); its nucleus data were not obtained or used here.":"BigBrainでの研究例（抄録確認）。核データは未取得で、この図には使用していません。"}</p><p><a href="https://siibra-python.readthedocs.io/en/latest/examples/tutorials/2025-paper-fig6.html" target="_blank" rel="noreferrer">siibra · BigBrain VIM reference, section 3797</a> — {english?"A single histology reference contour, kept distinct from warped probabilistic maps in the same tutorial.":"同じ教材の別標本確率地図とは区別した、一枚の組織切片の参照輪郭。"} <a href={`${import.meta.env.BASE_URL}THALAMUS-VIM-REFERENCE-NOTICE.txt`} target="_blank" rel="noreferrer">{english?"Attribution / licence":"帰属・利用条件"}</a></p><p><a href="https://doi.org/10.3389/fnana.2022.837485" target="_blank" rel="noreferrer">Kiwitz et al. (2022) · BigBrain MGB</a> · <a href="https://doi.org/10.25493/PNY0-NCW" target="_blank" rel="noreferrer">{english?"Source 3D maps":"元の3D地図"}</a> · <a href={`${import.meta.env.BASE_URL}THALAMUS-MGB-REFERENCE-NOTICE.txt`} target="_blank" rel="noreferrer">{english?"Attribution / licence":"帰属・利用条件"}</a></p><p><a href="https://doi.org/10.25493/33Z0-BX" target="_blank" rel="noreferrer">BigBrain LGN · six-layer maps</a> — {english?"Existing project adoption, reconstructed directly from labels 44/45; CC BY-NC-SA 4.0.":"既存のプロジェクト採用ラベル44/45から再構築した形状。CC BY-NC-SA 4.0。"}</p></details>
  </div>;
}
export function ThalamusGuide({english,initialRegion}:{english:boolean;initialRegion?:string}){
  const [open,setOpen]=useState(false);
  return <details className="thalamusGuide" onToggle={event=>setOpen(event.currentTarget.open)} data-no-localize><summary>{english?"Inside the thalamus · reference locations":"視床の内部 — 核群の参考位置"}</summary>{open&&<Content english={english} initialRegion={initialRegion}/>}</details>;
}
