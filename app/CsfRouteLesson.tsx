import {SectionThemeBibliography} from './SectionThemeBibliography';
const checks=[
 {key:'sequence',ja:{question:'側脳室から第四脳室までを、通路の名前も入れて順に説明できますか？',answer:'側脳室 → 脳室間孔 → 第三脳室 → 中脳水道 → 第四脳室。左右の側脳室から正中の第三脳室に合流する点を確認します。'},en:{question:'Can you name the route from a lateral ventricle to the fourth ventricle, including its connecting passages?',answer:'Lateral ventricle → interventricular foramen → third ventricle → cerebral aqueduct → fourth ventricle. Each lateral ventricle joins the midline third ventricle.'}},
 {key:'outlet',ja:{question:'第四脳室まで来た脳脊髄液は、脳室の中だけを循環しますか？',answer:'第四脳室の正中口・外側口を通って、くも膜下腔へ出る経路があります。今回の着色では、これらの出口やくも膜下腔は個別に分節していません。'},en:{question:'Does CSF remain inside the ventricles after reaching the fourth ventricle?',answer:'Its median and lateral apertures provide exits to the subarachnoid space. These outlets and the subarachnoid space have no separate labels in this activity.'}},
 {key:'obstruction',ja:{question:'流れの通路が狭くなった場合と、水道の着色が細く見える場合を区別できますか？',answer:'通路の狭窄などで脳脊髄液の流れが妨げられると、水頭症につながり得ます。ただし着色は部分ラベルの収録範囲を示すものです。この表示だけでは、実際の狭窄・流量・病変を判断できません。'},en:{question:'How does an obstructed CSF passage differ from a thin-looking aqueduct highlight?',answer:'A narrowed passage can impede CSF movement and contribute to hydrocephalus. The highlight marks only the stored partial label. Its appearance cannot establish narrowing, flow, or disease.'}},
];
export function CsfRouteLesson({english,showReferences=true}:{english:boolean;showReferences?:boolean}){
 const language=english?'en':'ja';
 return <div className="csfRouteLesson" data-csf-route-lesson data-no-localize>
  <h3>{english?'Trace the spaces, then explain the flow':'腔のつながりから、流れを説明する'}</h3>
  <h4>{english?'Before searching: distinguish space from tissue':'探す前に：腔と組織を区別する'}</h4>
  <p>{english?'First find the midline and follow cavity outlines without colour. A ventricle is a fluid-containing space; the tissue around it provides your landmarks.':'まず正中を見定め、無着色で腔の輪郭を追います。脳室は脳脊髄液を含む空間で、周りの組織が位置の目印になります。'}</p>
  <ol><li>{english?'Near the midline, compare adjacent sagittal sections around the third and fourth ventricles.':'正中付近の矢状断で、第三・第四脳室の周囲を隣接断面と見比べます。'}</li><li>{english?'Use coronal sections to compare the paired lateral ventricles with the midline third ventricle.':'冠状断に切り替え、左右の側脳室と正中の第三脳室を比べます。'}</li><li>{english?'Use the related-structure hints one at a time, then compare the section with 3D and describe their connections.':'関連構造のヒントを1つずつ使い、断面と3Dを見比べてつながりを説明します。'}</li></ol>
  <h4>{english?'Function: production and passage of CSF':'機能：脳脊髄液の産生と通り道'}</h4>
  <p>{english?'The choroid plexus produces CSF. Ventricular spaces connect through passages, with exits from the fourth ventricle to the subarachnoid space. CSF also surrounds the brain and spinal cord and provides cushioning.':'脈絡叢が脳脊髄液を産生します。脳室の腔は通路でつながり、第四脳室からはくも膜下腔へ出る経路があります。脳脊髄液は脳と脊髄の周囲にもあり、衝撃を和らげます。'}</p>
  <p className="csfRouteSequence">{english?'Lateral ventricle → interventricular foramen → third ventricle → aqueduct → fourth ventricle':'側脳室 → 脳室間孔 → 第三脳室 → 中脳水道 → 第四脳室'}</p>
  <p className="capsuleScope">{english?'The aqueduct label covers part of the passage. The ventricular walls, apertures, choroid plexus and subarachnoid space are not separately labelled here. Colour is a location aid; the complete route must also be learned from the references.':'水道のラベルは通路の一部分です。脳室壁、各孔、脈絡叢、くも膜下腔は、この課題では個別ラベルを表示していません。着色を位置の手がかりにし、経路全体は参考資料でも確かめます。'}</p>
  <h4>{english?'Representative disturbance: hydrocephalus':'代表的な障害：水頭症という概念'}</h4>
  <p>{english?'Hydrocephalus can result from impaired CSF movement or absorption. A narrow passage is one possible cause. Use this relationship to explain why connections between spaces matter; the current specimen labels do not measure CSF or show a patient’s lesion.':'脳脊髄液の流れや吸収が妨げられることは、水頭症につながり得ます。通路の狭窄は原因の一つです。「腔どうしのつながりが大切なのはなぜか」を説明しましょう。現在の標本ラベルは、脳脊髄液の量や患者の病変を示していません。'}</p>
  <h4>{english?'Explain first, then open the self-check':'まず説明し、自己確認を開く'}</h4>
  {checks.map(check=><details className="csfSelfCheck" key={check.key} data-csf-self-check={check.key}><summary>{check[language].question}</summary><p>{check[language].answer}</p></details>)}
  <p>{english?'These checks have no score. Return to an uncoloured section and explain the route again; open Review from the main menu to practise the available questions.':'自己確認は無採点です。無着色の断面へ戻って経路をもう一度説明し、メインメニューの復習で収録済みの問題を練習できます。'}</p>
  {showReferences&&<SectionThemeBibliography themeKey="csf-route" english={english} collapsible/>}
 </div>;
}
