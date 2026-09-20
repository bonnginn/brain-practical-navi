"use client";

import { useLayoutEffect } from "react";
import catalogData from "./english-catalog.json";
import { englishDynamic } from "../src/englishDynamic.mjs";

const catalog = catalogData as Record<string,string>;
const reviewed:Record<string,string> = {
  "画像確認済み部分断面":"Image-reviewed partial segmentation",
  "同一標本・画像確認済み部分断面":"Same specimen · image-reviewed partial segmentation",
  "脳実習ナビ":"Brain Practical Navigator",
  "脳解剖実習 学習補助アプリ":"Neuroanatomy Practical Learning Aid",
  "教育目的で教材を開く":"Open the learning material",
  "視床下核":"Subthalamic nucleus",
  "淡蒼球外節":"External globus pallidus (GPe)",
  "淡蒼球内節":"Internal globus pallidus (GPi)",
  "乳頭体":"Mammillary body",
  "前交連（部分）":"Anterior commissure (partial)",
  "原画像で追跡した前交連の主要部を、左右へ横走する連続した束として示します。内包との重なりを局所修正した教材用の概略分節です。全外縁と側頭葉側の終末は未収録で、投射全体を示すものではありません。":"Shows the source-traced main core of the anterior commissure as a continuous transverse bundle. This approximate teaching segmentation includes local correction of overlap with the internal capsule. Its complete outer boundary and temporal terminations remain unrecorded; it does not show the full projection.",
  "正中を横切り左右へ伸びる交連線維の一部。側頭葉間を結ぶ主な走行の位置目安":"Part of the commissural fibres crossing the midline and extending bilaterally; a landmark for the main course connecting the temporal lobes",
  "前交連は左右の大脳半球を結ぶ交連線維です。ここでは正中を横切り、側頭葉間へ向かう主な走行の一部を位置関係の基準として示します。":"The anterior commissure is a commissural fibre bundle connecting the cerebral hemispheres. Here, part of its main course across the midline toward the temporal lobes is shown as a positional landmark.",
  "透明中隔（部分）":"Septum pellucidum (partial)",
  "外側膝状体":"Lateral geniculate bodies",
  "左外側膝状体":"Left lateral geniculate body",
  "右外側膝状体":"Right lateral geniculate body",
  "脳弓体部・脚・柱（部分）":"Fornix body, crura and columns (partial)",
  "視交叉中央部（部分）":"Optic chiasm central region (partial)",
  "視索（部分）":"Optic tracts (partial)",
  "同一BigBrain原画像から追った体部・脚・柱の部分分節です。0.5 mm格子の概略境界で、左右の脚を海馬側へ延長し、体部・柱まで連続して観察できます。前交連の後方から視床下部内を下る柱を、乳頭体に接する位置まで概略収録しています。海馬采・脚の全長と全外縁は未収録です。乳頭体付近の終端境界は概略で、接触表示は個々の線維の連続性を証明しません。脳弓全体の完成や専門家確認を意味しません。":"Partial source-image-traced segmentation of the fornix body, crura and columns in the same BigBrain specimen. Approximate boundaries on a 0.5 mm grid show both crural portions extended toward hippocampal attachment and continuing through the body and columns. The postcommissural columns descend through the hypothalamus to a gross contact with the mammillary bodies. The full fimbria and crura and complete outer boundaries remain unrecorded. Mammillary terminal boundaries are approximate; displayed contact does not establish individual fiber continuity. This is neither a complete fornix segmentation nor expert validation.",
  "側脳室体部の下内側から前交連後方を通り、乳頭体側へ下降する柱までの一部":"Parts of the body inferomedial to the lateral ventricle and the postcommissural columns descending toward the mammillary bodies",
  "同一BigBrain標本の原画像から、視交叉中央部の厚みを概略的に収録した部分ラベルです。0.5 mm格子で中央内部の形を示し、細かな外縁には部分体積を含みます。左右視索への主なラベルは連続し、名称の切替面は教材上の規約です。全外縁、視神経との境界、交叉線維の走行、視放線までの連続性は収録していません。画像確認済みですが、専門家レビューは未完了です。":"A partial label tracing the approximate thickness of the central optic chiasm in source images of the same BigBrain specimen. The central interior is shown on a 0.5 mm grid, with partial volume at fine edges. Its main labels continue to both optic tracts, with an operational teaching boundary between the names. The complete outer boundary, optic-nerve boundaries, fibre-crossing trajectories and continuity to the optic radiations are not included. The images have been reviewed, but expert review is pending.",
  "視床下部前方寄りの正中近くにある視交叉中央部の部分収録":"A partial capture of the central optic chiasm near the midline, toward the anterior hypothalamus",
  "視交叉中央部の内部を部分的に示します。視交叉全体、視神経・視索との境界、交叉線維の走行、視放線までの連続性を示すものではありません。画像確認済みですが、専門家レビューは未完了です。":"Shows part of the interior of the central optic chiasm. It does not represent the whole optic chiasm, its boundaries with the optic nerves or tracts, crossing-fibre trajectories, or continuity to the optic radiations. The images have been reviewed, but expert review is pending.",
  "同一BigBrain標本のnative原画像から追った左右の視索内部の短い区間を部分的に示します。視交叉や外側膝状体への全連続性、全外縁、視放線までの連続性は収録しておらず、専門家レビューは未完了です。":"Shows short partial segments of the left and right optic-tract interiors traced from native source images of the same BigBrain specimen. The complete continuity to the optic chiasm or lateral geniculate bodies, the full outer boundaries, and continuity to the optic radiations are not included; expert review is pending.",
  "視交叉後方から外側膝状体方向へ向かう左右の視索の部分収録":"Partial captures of the left and right optic tracts running posteriorly from the optic chiasm toward the lateral geniculate bodies",
  "視索は視交叉から外側膝状体などへ視覚情報を伝えます。このモデルは同一BigBrain原画像から追った左右の内部短区間のみで、視交叉・外側膝状体への全連続性、全外縁、視放線は収録していません。":"The optic tracts carry visual information from the optic chiasm toward the lateral geniculate bodies and related targets. This model contains only short interior segments traced from native BigBrain source images; complete continuity to the chiasm or lateral geniculate bodies, the full outer boundaries, and the optic radiations are not included.",
  "視交叉では左右の視神経線維の一部が交叉し、両眼の視野情報を左右半球へ振り分けます。この部分モデルは交叉線維の走行を示しません。":"At the optic chiasm, some fibres from the two optic nerves cross and distribute visual-field information from both eyes to the two cerebral sides. This partial model does not show crossing-fibre trajectories.",
  "海馬系から乳頭体・中隔領域へ向かう脳弓のうち、海馬側へ延びる左右の脚、正中近くの体部、前交連後方から乳頭体側へ下降する柱を部分的に示します。":"Shows parts of both crura extending toward hippocampal attachment, the body near the midline and the postcommissural columns descending toward the mammillary bodies, along the fornix route from the hippocampal formation toward the mammillary and septal regions.",
  "同一BigBrain標本で公開された左右6層分節の和集合を、公式変換で0.5 mm断面格子へ最近傍再標本化した範囲です。視索と視放線は未完成で、視覚路全体の連続分節ではありません。":"Union of the six publicly released layers in each lateral geniculate body from the same BigBrain specimen, resampled by nearest neighbour through the official transform onto the 0.5 mm section grid. The optic tracts and radiations remain incomplete, so this is not a continuous segmentation of the whole visual pathway.",
  "視床後下方にある視覚中継核。視索が入る側と視放線が出る側の位置関係を断面で確認します":"A visual relay nucleus posteroinferior to the thalamus; use sections to examine the sides where the optic tract enters and the optic radiation leaves",
  "網膜からの情報を視索から受け、視放線を介して視覚皮質へ中継する視床後方の核です。":"A posterior thalamic nucleus that receives retinal information through the optic tract and relays it to visual cortex through the optic radiation.",
  "原画像で追跡できた薄い隔壁の一部を示します。上下の付着部や細い箇所は未収録です。中隔核や脳弓とは分けて観察してください。":"Shows part of the thin partition traced in the source images. Superior and inferior attachments and fine portions remain unrecorded. Distinguish it from the septal nuclei and fornix.",
  "左右の側脳室前角の間、脳梁の下方、脳弓の上方":"Between the frontal horns of the lateral ventricles, below the corpus callosum and above the fornix",
  "左右の側脳室前角を隔てる薄い隔壁です。脳梁と脳弓の位置関係を観察する手がかりになります。":"A thin partition between the frontal horns of the lateral ventricles. It provides a landmark for observing the relationship between the corpus callosum and fornix.",
  "画像誘導・確認済み":"Image-guided, project-reviewed",
  "専門家レビュー未完了":"Expert review pending",
  "5問":"5 questions",
  "10問":"10 questions",
  "15問":"15 questions",
  "20問":"20 questions",
  "教材の誤りや操作上の問題を、匿名で非公開送信できます。":"You can privately submit an anonymous report about an error in the material or a usability problem.",
};
const translations={...catalog,...reviewed};
// Single-character substitutions can corrupt an otherwise untranslated sentence
// (for example, replacing every Japanese possessive particle independently).
// Exact single-character text nodes remain supported through translations[value].
const replacementKeys=Object.keys(translations).filter(key=>key.length>=2&&/[\u3040-\u30ff\u3400-\u9fff]/u.test(key)).sort((a,b)=>b.length-a.length);
const excludedTags=new Set(["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"]);

const translatedDynamic=(core:string)=>englishDynamic(core,translations);

function translated(value:string){
  const direct=translations[value];
  if(direct)return direct;
  if(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(value))return value;
  const leading=value.match(/^\s*/u)?.[0]??"";
  const trailing=value.match(/\s*$/u)?.[0]??"";
  const core=value.slice(leading.length,value.length-trailing.length);
  if(translations[core])return `${leading}${translations[core]}${trailing}`;
  const dynamic=translatedDynamic(core);
  if(dynamic)return `${leading}${dynamic}${trailing}`;
  let next=value;
  for(const key of replacementKeys)if(next.includes(key))next=next.split(key).join(translations[key]);
  // Dynamic counters and interpolated labels can be assembled from reviewed
  // fragments. If any Japanese remains, fail closed instead of publishing a
  // half-translated and potentially misleading sentence.
  return /[\u3040-\u30ff\u3400-\u9fff]/u.test(next)?value:next;
}

function localizeNode(node:Node){
  if(node.nodeType===Node.TEXT_NODE){
    const parent=node.parentElement;
    if(!parent||excludedTags.has(parent.tagName)||parent.closest("[data-no-localize]"))return;
    const value=node.nodeValue??"";
    const next=translated(value);
    if(next!==value)node.nodeValue=next;
    return;
  }
  if(!(node instanceof Element)||excludedTags.has(node.tagName)||node.closest("[data-no-localize]"))return;
  for(const attribute of ["aria-label","title","placeholder","alt","label"]){const value=node.getAttribute(attribute);if(value){const next=translated(value);if(next!==value)node.setAttribute(attribute,next)}}
  for(const child of node.childNodes)localizeNode(child);
}

export function EnglishLocalization({enabled}:{enabled:boolean}){
  useLayoutEffect(()=>{
    if(!enabled)return;
    document.documentElement.lang="en";
    document.title="Brain Practical Navigator — Neuroanatomy Practical Learning Aid";
    document.querySelectorAll<HTMLMetaElement>('meta[name="description"],meta[property="og:description"]').forEach(meta=>meta.content="Interactive learning aid for practical neuroanatomy. Explore brain surfaces, serial sections, specimen blocks, and review quizzes.");
    const ogTitle=document.querySelector<HTMLMetaElement>('meta[property="og:title"]');
    if(ogTitle)ogTitle.content="Brain Practical Navigator";
    const root=document.querySelector("main.appShell");
    if(!root)return;
    localizeNode(root);
    root.setAttribute("data-locale-ready","en");
    const observer=new MutationObserver(records=>{
      observer.disconnect();
      for(const record of records){if(record.type==="characterData")localizeNode(record.target);else if(record.type==="attributes")localizeNode(record.target);else for(const node of record.addedNodes)localizeNode(node)}
      observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder","alt","label"]});
    });
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder","alt","label"]});
    return()=>observer.disconnect();
  },[enabled]);
  return null;
}
