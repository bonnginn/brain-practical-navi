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
};
const translations={...catalog,...reviewed};
const replacementKeys=Object.keys(translations).filter(key=>/[\u3040-\u30ff\u3400-\u9fff]/u.test(key)).sort((a,b)=>b.length-a.length);
const excludedTags=new Set(["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"]);

function translated(value:string){
  if(!/[\u3040-\u30ff\u3400-\u9fff]/u.test(value))return value;
  const exact=translations[value];
  if(exact)return exact;
  const leading=value.match(/^\s*/u)?.[0]??"";
  const trailing=value.match(/\s*$/u)?.[0]??"";
  const core=value.slice(leading.length,value.length-trailing.length);
  if(translations[core])return `${leading}${translations[core]}${trailing}`;
  let next=value;
  for(const key of replacementKeys)if(next.includes(key))next=next.split(key).join(translations[key]);
  return next;
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
  for(const attribute of ["aria-label","title","placeholder"]){const value=node.getAttribute(attribute);if(value){const next=translated(value);if(next!==value)node.setAttribute(attribute,next)}}
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
      observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder"]});
    });
    observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["aria-label","title","placeholder"]});
    return()=>observer.disconnect();
  },[enabled]);
  return null;
}
