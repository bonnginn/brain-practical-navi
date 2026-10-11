import {AuditoryOverview} from './AuditoryOverview';
import {ThalamusGuide} from './ThalamusGuide';

export function AuditoryRouteLesson({english,onObserve}:{english:boolean;onObserve:(target:'cortex'|'cn8'|'mgb',referenceHash?:string)=>void}){
 return <div className="csfRouteLesson auditoryRouteLesson" data-no-localize>
  <AuditoryOverview english={english} onObserve={target=>{if(target==='mgb'){const d=document.querySelector<HTMLDetailsElement>('.auditoryRouteLesson .thalamusGuide');if(d){d.open=true;d.scrollIntoView({block:'center'});}}else onObserve(target)}}/>
  <h4>{english?'Main auditory relays · explanatory sequence':'聴覚の主要中継 — 説明用の順序'}</h4>
  <ol data-auditory-relays>
   <li>{english?'Cochlea → cochlear part of CN VIII → cochlear nuclei on the same side.':'蝸牛 → 内耳神経VIIIの蝸牛部 → 同側の蝸牛神経核。'}</li>
   <li>{english?'Brainstem projections then reach both sides. The superior olivary complex receives input from both ears; ascending routes include the lateral lemniscus. Not every fibre passes through every relay.':'脳幹では両側への投射が生じます。上オリーブ複合体は両耳から入力を受け、上行路には外側毛帯が含まれます。すべての線維が全中継を順に通るわけではありません。'}</li>
   <li>{english?'Inferior colliculus → medial geniculate body (MGB) → auditory radiation → auditory cortex, mainly in the transverse temporal gyri.':'下丘 → 内側膝状体（MGB） → 聴放線 → 主に横側頭回の聴覚皮質。'}</li>
  </ol>
  <p className="capsuleScope">{english?'This is a pathway explanation, not a segmented tract. Cochlear nuclei, superior olive, lateral lemniscus and inferior colliculus have no individual labels here. The MGB guide below uses an existing published reference shape; the thalamus colour above is not an MGB label.':'これは経路の説明で、分節された神経束ではありません。蝸牛神経核・上オリーブ・外側毛帯・下丘の個別ラベルはありません。下のMGB案内は既存の公表参照形状を使い、上の視床全体の着色をMGBとはみなしません。'}</p>
  <ThalamusGuide onObserveReference={hash=>onObserve('mgb',hash)} english={english} initialRegion="MGB" compact summary={english?'Inspect MGB reference in 3D':'MGBの参照形状を3Dで確認'}/>
  <div className="activeStudyActions"><button type="button" data-auditory-observe="cn8" onClick={()=>onObserve('cn8')}>{english?'Observe CN VIII schematic':'内耳神経VIIIの模式表示を観察'}</button><button type="button" data-auditory-observe="cortex" onClick={()=>onObserve('cortex')}>{english?'Observe transverse temporal gyri':'横側頭回を観察'}</button></div>
  <details data-auditory-self-check><summary>{english?'Explain bilateral transmission, then check':'両側への伝わりを説明してから確認'}</summary><p>{english?'Above the cochlear nuclei, each side carries information from both ears. Hearing is not represented one-ear-to-one-side. This display does not predict a patient’s hearing loss.':'蝸牛神経核より上では、各側に両耳からの情報が伝わります。片耳が片側だけに対応する経路として扱わないでください。この表示で患者の聴力障害を予測しません。'}</p></details>
  <p>{english?'Use the main Review entry for existing questions and score history. Return to your observation to explain the route without colour hints.':'収録済みの問題と得点履歴はメインの「復習」から開きます。元の観察に戻り、着色の手がかりなしでも経路を説明しましょう。'}</p>
  <details><summary>{english?'References and limits':'出典と表現の範囲'}</summary><a href="https://nba.uth.tmc.edu/neuroscience/m/s2/chapter13.html" target="_blank" rel="noreferrer">UTHealth — Auditory pathways, §13.1, figures 13.1–13.3</a><p>{english?'Major relays and bilateral projections; fine branches and lesion diagnosis are outside this candidate.':'主要中継と両側投射を扱います。細かな分枝と病変診断は、この候補の範囲外です。'}</p></details>
 </div>;
}
