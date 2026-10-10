import type {ReactNode} from 'react';

// Bibliographies moved verbatim from the existing authored lessons.
export function SectionThemeBibliography({themeKey,english,collapsible=false}:{themeKey:string;english:boolean;collapsible?:boolean}){
 let content:ReactNode=null;
 if(themeKey==='csf-route')content=<><ul>
   <li><a href="https://nba.uth.tmc.edu/neuroanatomy/L4/Lab04p01_index.html" target="_blank" rel="noreferrer">UTHealth — Ventricles and CSF circulation</a></li>
   <li><a href="https://medlineplus.gov/ency/article/001571.htm" target="_blank" rel="noreferrer">MedlinePlus — Hydrocephalus</a></li>
   <li><a href="https://www.nhs.uk/conditions/hydrocephalus/causes/" target="_blank" rel="noreferrer">NHS — Causes of hydrocephalus</a></li>
  </ul><p>{english?'The sources support the anatomical route and general obstruction concept. Flow, volume and lesion location are not determined by these specimen labels. Teaching-scope adoption and precise label boundaries require instructor review.':'出典で経路と一般的な流れの障害を確認しています。標本ラベルから流量・量・病変局在は判断しません。授業範囲への採用と精密なラベル境界には指導者の確認が必要です。'}</p></>;
 if(!content)return null;
 return collapsible?<details className="sectionThemeBibliography"><summary>{english?'References and limits':'出典と表現の範囲'}</summary>{content}</details>:<div className="sectionThemeBibliography">{content}</div>;
}
