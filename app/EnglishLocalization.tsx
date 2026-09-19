"use client";

import { useLayoutEffect } from "react";
import catalogData from "./english-catalog.json";
import { englishDynamic } from "../src/englishDynamic.mjs";

const catalog = catalogData as Record<string,string>;
const reviewed:Record<string,string> = {
  "脳実習ナビ":"Brain Practical Navigator",
  "脳解剖実習 学習補助アプリ":"Neuroanatomy Practical Learning Aid",
  "教育目的で教材を開く":"Open the learning material",
  "視床下核":"Subthalamic nucleus",
  "淡蒼球外節":"External globus pallidus (GPe)",
  "淡蒼球内節":"Internal globus pallidus (GPi)",
  "乳頭体":"Mammillary body",
  "前交連（部分）":"Anterior commissure (partial)",
  "原画像で追跡した前交連内部の一部だけを示します。全外縁、側頭葉へ向かう終末、内包に近接する区間は未収録で、完全に連続した経路を示すものではありません。":"Shows only part of the interior of the anterior commissure traced in the source images. Its complete outer boundary, temporal terminations, and the segment near the internal capsule remain unrecorded; this is not a complete continuous pathway.",
  "正中を横切り左右へ伸びる交連線維の一部。側頭葉間を結ぶ主な走行の位置目安":"Part of the commissural fibres crossing the midline and extending bilaterally; a landmark for the main course connecting the temporal lobes",
  "前交連は左右の大脳半球を結ぶ交連線維です。ここでは正中を横切り、側頭葉間へ向かう主な走行の一部を位置関係の基準として示します。":"The anterior commissure is a commissural fibre bundle connecting the cerebral hemispheres. Here, part of its main course across the midline toward the temporal lobes is shown as a positional landmark.",
  "透明中隔（部分）":"Septum pellucidum (partial)",
  "外側膝状体":"Lateral geniculate bodies",
  "脳弓体部（部分）":"Fornix body (partial)",
  "同一BigBrain標本のnative原画像で追跡できた前方延長を含む約10 mmの体部内部だけを示します。脚・柱・上方の透明中隔付着部を含む全境界は未収録で、脳弓全体の連続分節ではありません。":"Shows only an approximately 10 mm portion inside the fornix body, including its anterior extension, traced in the native source images of the same BigBrain specimen. The complete boundary, including the crura, columns and superior septum pellucidum attachment, remains unrecorded; this is not a continuous segmentation of the whole fornix.",
  "側脳室体部の下内側、透明中隔の下方に位置する脳弓体部の一部":"Part of the fornix body inferomedial to the body of the lateral ventricle and below the septum pellucidum",
  "海馬系から乳頭体・中隔領域へ向かう脳弓のうち、左右が正中近くを前後に走る体部の一部です。":"Part of the fornix body where the bilateral bundles run anteroposteriorly near the midline on their course from the hippocampal system toward the mammillary and septal regions.",
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
