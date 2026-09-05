"use client";

import { useLayoutEffect } from "react";
import catalogData from "./english-catalog.json";

const catalog = catalogData as Record<string,string>;
const reviewed:Record<string,string> = {
  "脳実習ナビ":"Brain Practical Navigator",
  "脳解剖実習 学習補助アプリ":"Neuroanatomy Practical Learning Aid",
  "教育目的で教材を開く":"Open the learning material",
  "視床下核":"Subthalamic nucleus",
  "淡蒼球外節":"External globus pallidus (GPe)",
  "淡蒼球内節":"Internal globus pallidus (GPi)",
  "乳頭体":"Mammillary body",
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

function translatedDynamic(core:string){
  let sectionMatch=core.match(/^(\d+)構造を同時表示中$/u);
  if(sectionMatch)return `${sectionMatch[1]} structures displayed`;
  const planeNames:Record<string,string>={"冠状断":"coronal","水平断":"horizontal","矢状断":"sagittal"};
  sectionMatch=core.match(/^(冠状断|水平断|矢状断)の(前後|上下|左右)位置$/u);
  if(sectionMatch)return `${planeNames[sectionMatch[1]]} slice position`;
  sectionMatch=core.match(/^復習問題の(前後|上下|左右)位置$/u);
  if(sectionMatch)return `Quiz slice position (${{"前後":"anteroposterior","上下":"superoinferior","左右":"left–right"}[sectionMatch[1]]})`;
  sectionMatch=core.match(/^(coronal|horizontal|sagittal)断面 ([\d.]+)。ホイールで拡大縮小、Shiftドラッグで移動$/u);
  if(sectionMatch)return `${sectionMatch[1]} slice ${sectionMatch[2]}. Use the wheel to zoom and Shift-drag to pan.`;
  if(core.startsWith("位置：")){
    const location=translations[core.slice(3)];
    if(location)return `Location: ${location}`;
  }
  let match=core.match(/^(.+)（(\d+)問）$/u);
  if(match){const label=translations[match[1]];if(label)return `${label} (${match[2]} questions)`}
  match=core.match(/^次回 (\d+)問候補$/u);
  if(match)return `Next: ${match[1]} candidate questions`;
  match=core.match(/^標準 (\d+)・試作 (\d+)$/u);
  if(match)return `Standard ${match[1]} · Provisional ${match[2]}`;
  match=core.match(/^(\d+)問を上限に(\d+)問（候補(\d+)）$/u);
  if(match)return `Up to ${match[1]} questions; ${match[2]} selected from ${match[3]} candidates`;
  match=core.match(/^(\d+)問（実際(\d+)問）$/u);
  if(match)return `${match[1]} questions (${match[2]} available)`;
  match=core.match(/^(\d+)問$/u);
  if(match)return `${match[1]} questions`;
  return null;
}

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
  for(const attribute of ["aria-label","title","placeholder","alt"]){const value=node.getAttribute(attribute);if(value){const next=translated(value);if(next!==value)node.setAttribute(attribute,next)}}
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
      observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder","alt"]});
    });
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder","alt"]});
    return()=>observer.disconnect();
  },[enabled]);
  return null;
}
