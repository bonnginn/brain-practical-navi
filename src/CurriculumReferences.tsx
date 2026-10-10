import map from '../data/curriculum/runtime-reference-map.json';
import registry from '../public/atlas/structure-provenance.json';
import {surfaceObservationGuides} from './surfaceObservationGuides';
import {createCurriculumLookup} from './curriculumContent.mjs';
const lookup=createCurriculumLookup(map);
const entries=new Map(registry.entries.map(e=>[e.key,e]));
const sourceLabels:Record<string,[string,string]>={'mni-cerebra-browser-assets':['MNI・CerebrAの表示データ','MNI/CerebrA display assets'],'project-authored-teaching-overlays':['教材内の模式ガイド','Project-authored teaching overlays'],'combined-practical-segmentation':['実習用の統合分節データ','Combined practical segmentation'],'specimen-block-assets':['ブロック標本の表示データ','Specimen block assets'],'bigbrain-manual-labels':['BigBrainの手動ラベル','BigBrain manual labels']};
export function CurriculumReferences({materialId,english=false,taskLabels={}}:{materialId:string|null;english?:boolean;taskLabels?:Record<string,string>}){
  const content=lookup(materialId);
  if(!content)return null;
  const guides=content.source_text_refs.filter(r=>r.symbol==='surfaceObservationGuides').map(r=>surfaceObservationGuides[r.key as keyof typeof surfaceObservationGuides]).filter(Boolean);
  return <details key={materialId} className="provenanceDetails" data-curriculum-material-id={materialId} data-no-localize>
    <summary>{english?'Teaching references and evidence':'教材参照・根拠'}</summary>
    <b>{content.material.name}</b>
    <p>{english?'Expert review pending. Image position has not been verified.':'医学判断待ち。画像位置は未検証です。'}</p>
    {content.material.evidence_state.image_position==='画像位置対応不足'&&<p>{english?'Image-position mapping is insufficient.':'画像位置対応不足。'}</p>}
    {content.material.provenance_mapping?.mapping.composite&&<p>{english?'The evidence record covers a group of structures; it does not validate each individual boundary.':'根拠記録は複数構造をまとめた項目です。個々の境界が検証済みという意味ではありません。'}</p>}
    {guides.map((g,i)=>{const text=g[english?'en':'ja'];return <section key={i} data-curriculum-observation-guide><b>{text.title}</b><p>{text.landmark}</p><p>{text.compare}</p><p>{text.check}</p></section>})}
    {content.evidence.map(e=><section key={e.entry_key} data-curriculum-evidence={e.entry_key}><b>{entries.get(e.entry_key)?.lectureLabel??content.material.name}</b>{e.limitations.map((text,i)=><p key={i}>{text}</p>)}{e.source_refs.map(id=>{const label=sourceLabels[id];return <p key={id} data-curriculum-source-ref={id}>{label?label[english?1:0]:id}</p>})}</section>)}
    {!content.evidence.length&&<p>{english?'No explicit provenance link is recorded for this item.':'この項目の明示的な出典対応は未接続です。'}</p>}
    {content.tasks.length>0&&<section><ul>{content.tasks.map(t=><li key={t.id} data-curriculum-task-ref={t.id}>{taskLabels[t.id]??(english?'Additional identification definition':'追加同定課題の定義')}</li>)}</ul><p data-curriculum-task-count={content.tasks.length}>{english?'Related identification definitions: '+content.tasks.length+'. Availability follows the existing quiz checks.':'関連する同定課題の定義：'+content.tasks.length+'件。出題可否は既存クイズの確認条件に従います。'}</p></section>}
    {content.gaps.some(g=>g.kind==='no-dedicated-observation-lesson')&&<p>{english?'No dedicated observation lesson is linked. The existing explanation remains available.':'専用観察教材は未接続です。既存の説明文を参照してください。'}</p>}
  </details>;
}
