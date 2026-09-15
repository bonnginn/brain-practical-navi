"use client";

import { useMemo, useRef, useState } from 'react';
import { AtlasVolumeCanvas, type HighlightLayer } from './AtlasVolumeCanvas';
import atlas from '../public/atlas/brodmann-surface.json';
import './brodmann.css';

type ViewKey = 'left-lateral' | 'left-medial' | 'right-lateral' | 'right-medial' | 'superior' | 'inferior';
type Rotation = { x: number; y: number; z?: number };
const views: Record<ViewKey, { ja: string; en: string; hemisphere: 'left' | 'right' | 'both'; rotation: Rotation }> = {
  'left-lateral': { ja: '左・外側面', en: 'Left lateral', hemisphere: 'left', rotation: { x: 0, y: -90, z: 0 } },
  'left-medial': { ja: '左・内側面', en: 'Left medial', hemisphere: 'left', rotation: { x: 0, y: 90, z: 0 } },
  'right-lateral': { ja: '右・外側面', en: 'Right lateral', hemisphere: 'right', rotation: { x: 0, y: 90, z: 0 } },
  'right-medial': { ja: '右・内側面', en: 'Right medial', hemisphere: 'right', rotation: { x: 0, y: -90, z: 0 } },
  superior: { ja: '上面・両半球', en: 'Superior · both', hemisphere: 'both', rotation: { x: -90, y: 0, z: 0 } },
  inferior: { ja: '下面・両半球', en: 'Inferior · both', hemisphere: 'both', rotation: { x: 90, y: 0, z: 0 } },
};
// Display RGB bytes (0–255), matching HighlightLayer; spatial assignments come from the source GIFTI.
export function brodmannColor(area: number): [number, number, number] {
  const hue = (area * 0.61803398875) % 1;
  const channel = (offset: number) => {
    const k = (offset + hue * 12) % 12;
    return Math.round(255 * (0.61 - 0.26 * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [channel(0), channel(8), channel(4)];
}
export const areaNames: Record<number, { ja: string; en: string }> = {
  "1": {
    "ja": "一次体性感覚野（S1）",
    "en": "Primary somatosensory cortex (S1)"
  },
  "2": {
    "ja": "一次体性感覚野（S1）",
    "en": "Primary somatosensory cortex (S1)"
  },
  "3": {
    "ja": "一次体性感覚野（S1）",
    "en": "Primary somatosensory cortex (S1)"
  },
  "4": {
    "ja": "一次運動野（M1）",
    "en": "Primary motor cortex (M1)"
  },
  "5": {
    "ja": "上頭頂小葉・体性感覚連合野",
    "en": "Superior parietal lobule / somatosensory association cortex"
  },
  "6": {
    "ja": "運動前野・補足運動野",
    "en": "Premotor and supplementary motor areas"
  },
  "7": {
    "ja": "上頭頂小葉・楔前部",
    "en": "Superior parietal lobule / precuneus"
  },
  "8": {
    "ja": "前頭眼野（FEF）の目安",
    "en": "Frontal eye field (FEF), approximate"
  },
  "9": {
    "ja": "前頭前野（背外側部など）",
    "en": "Prefrontal cortex (including dorsolateral regions)"
  },
  "10": {
    "ja": "前頭極",
    "en": "Frontopolar cortex"
  },
  "11": {
    "ja": "眼窩前頭皮質",
    "en": "Orbitofrontal cortex"
  },
  "17": {
    "ja": "一次視覚野（V1・線条野）",
    "en": "Primary visual cortex (V1, striate cortex)"
  },
  "18": {
    "ja": "二次視覚野（V2）",
    "en": "Secondary visual cortex (V2)"
  },
  "19": {
    "ja": "視覚連合野（線条外皮質）",
    "en": "Visual association cortex (extrastriate cortex)"
  },
  "20": {
    "ja": "下側頭回領域",
    "en": "Inferior temporal cortex"
  },
  "21": {
    "ja": "中側頭回領域",
    "en": "Middle temporal cortex"
  },
  "22": {
    "ja": "上側頭回・ウェルニッケ領域との関連",
    "en": "Superior temporal gyrus / Wernicke region"
  },
  "23": {
    "ja": "後部帯状皮質（腹側部）",
    "en": "Ventral posterior cingulate cortex"
  },
  "24": {
    "ja": "前部帯状皮質（腹側部）",
    "en": "Ventral anterior cingulate cortex"
  },
  "25": {
    "ja": "膝下部帯状皮質",
    "en": "Subgenual cingulate cortex"
  },
  "26": {
    "ja": "脳梁膨大部周囲の皮質（膨大部外野）",
    "en": "Ectosplenial area"
  },
  "27": {
    "ja": "前海馬台領域",
    "en": "Presubicular area"
  },
  "28": {
    "ja": "嗅内皮質",
    "en": "Entorhinal cortex"
  },
  "29": {
    "ja": "脳梁膨大後皮質（顆粒性）",
    "en": "Granular retrosplenial cortex"
  },
  "30": {
    "ja": "脳梁膨大後皮質（無顆粒性領域）",
    "en": "Agranular retrosplenial area"
  },
  "31": {
    "ja": "後部帯状皮質（背側部）",
    "en": "Dorsal posterior cingulate cortex"
  },
  "32": {
    "ja": "前部帯状皮質（背側部）",
    "en": "Dorsal anterior cingulate cortex"
  },
  "33": {
    "ja": "脳梁膝前部の帯状皮質（膝前野）",
    "en": "Pregenual cingulate area"
  },
  "35": {
    "ja": "嗅周皮質",
    "en": "Perirhinal cortex"
  },
  "36": {
    "ja": "嗅外野（広義の嗅周皮質の一部）",
    "en": "Ectorhinal area / broader perirhinal cortex"
  },
  "37": {
    "ja": "後頭側頭領域・紡錘状回付近",
    "en": "Occipitotemporal cortex / fusiform region"
  },
  "38": {
    "ja": "側頭極",
    "en": "Temporal pole"
  },
  "39": {
    "ja": "角回",
    "en": "Angular gyrus"
  },
  "40": {
    "ja": "縁上回",
    "en": "Supramarginal gyrus"
  },
  "41": {
    "ja": "一次聴覚野・横側頭回（ヘシュル回）",
    "en": "Primary auditory cortex / Heschl’s gyrus"
  },
  "42": {
    "ja": "聴覚連合野（二次聴覚野）の目安",
    "en": "Auditory association cortex, approximate"
  },
  "43": {
    "ja": "中心下領域（中心下回付近）",
    "en": "Subcentral area"
  },
  "44": {
    "ja": "ブローカ領域・下前頭回弁蓋部",
    "en": "Broca region / pars opercularis"
  },
  "45": {
    "ja": "ブローカ領域・下前頭回三角部",
    "en": "Broca region / pars triangularis"
  },
  "46": {
    "ja": "背外側前頭前野（中前頭回付近）",
    "en": "Dorsolateral prefrontal cortex / middle frontal region"
  },
  "47": {
    "ja": "下前頭回眼窩部・眼窩前頭皮質",
    "en": "Pars orbitalis / orbitofrontal cortex"
  }
};
export const notes: Record<number, { ja: string; en: string }> = {
  5: {"ja": "中心後回の後方にあり、BA 1・2・3に続く頭頂葉の領域です。上面からBA 7との位置関係を観察します。", "en": "Lies behind the postcentral gyrus, beyond BA 1, 2 and 3. Compare it with BA 7 from the superior view."},
  7: {"ja": "頭頂葉の上部から内側面の楔前部付近に広がります。外側面と内側面を切り替え、BA 5の後方を観察します。", "en": "Extends across the superior parietal region toward the medial precuneus. Switch between lateral and medial views to inspect the region behind BA 5."},
  9: {"ja": "上・中前頭回付近の前頭前野に対応します。背外側前頭前野はBA 9だけでなくBA 46なども含む区分です。", "en": "Associated with prefrontal cortex around the superior and middle frontal gyri. Dorsolateral prefrontal cortex includes BA 46 as well as BA 9."},
  10: {"ja": "前頭葉の最も前方に位置します。外側面と内側面で前頭極を囲む広がりを確認します。", "en": "Occupies the anterior end of the frontal lobe. Compare its extent around the frontal pole in lateral and medial views."},
  11: {"ja": "眼窩の上にある前頭葉下面の領域です。下面表示でBA 10・47との位置関係を確認します。", "en": "Located on the inferior frontal surface above the orbits. Use the inferior view to compare its position with BA 10 and 47."},
  19: {"ja": "後頭葉でBA 18の周囲に広がります。複数の視覚処理領域に関連し、BA 19全体を一つのV番号に置き換えることはできません。", "en": "Extends around BA 18 in the occipital lobe. It is associated with several visual processing regions, rather than a single V-number area."},
  20: {"ja": "側頭葉の下部に位置します。下面と外側面を切り替え、上方のBA 21や後方のBA 37と見比べます。", "en": "Located in the inferior temporal region. Compare it with BA 21 above and BA 37 posteriorly using inferior and lateral views."},
  21: {"ja": "側頭葉外側面の中側頭回に概ね対応します。上側頭回のBA 22と下側頭回のBA 20の間を観察します。", "en": "Approximately corresponds to the middle temporal gyrus. Inspect its position between superior temporal BA 22 and inferior temporal BA 20."},
  23: {"ja": "脳梁後部の上方にある帯状皮質です。内側面でBA 31および脳梁膨大後部のBA 29・30との関係を見ます。", "en": "A cingulate region above the posterior corpus callosum. Use the medial view to compare it with BA 31 and retrosplenial BA 29 and 30."},
  24: {"ja": "脳梁の前部を取り囲む帯状皮質に位置します。BA 32との関係を内側面で観察します。現代の帯状皮質の機能区分とは一対一に対応しません。", "en": "Lies in cingulate cortex around the anterior corpus callosum. Compare it with BA 32 medially. Modern functional cingulate subdivisions do not map one-to-one onto this area."},
  25: {"ja": "脳梁膝の下方にある小さな領域です。内側面でBA 24・32より下方の位置を確認します。", "en": "A small region below the genu of the corpus callosum. Inspect its position inferior to BA 24 and 32 in the medial view."},
  26: {"ja": "脳梁膨大部の近くにある狭い領域です。内側面を使い、BA 29・30との位置関係を観察します。", "en": "A narrow region near the splenium of the corpus callosum. Use medial views to compare its position with BA 29 and 30."},
  27: {"ja": "海馬台に隣接する内側側頭葉の領域です。ここでは歴史的な前海馬台領域という名称を用います。内側面・下面でBA 28との関係を確認します。", "en": "A medial temporal region adjacent to the subiculum. The historical name presubicular area is used here. Compare it with BA 28 in medial and inferior views."},
  28: {"ja": "海馬傍回の前内側部にあり、大脳皮質と海馬形成を結ぶ記憶回路の重要な中継領域です。BA 35・36との位置関係も観察します。", "en": "Located in the anteromedial parahippocampal region, an important relay in memory circuits linking cortex and the hippocampal formation. Compare it with BA 35 and 36."},
  29: {"ja": "脳梁膨大部の後方にあり、BA 30とともに脳梁膨大後皮質を構成します。「顆粒性」は細胞層の特徴を示す名称です。", "en": "Located behind the splenium and forms retrosplenial cortex together with BA 30. Granular refers to a feature of its cellular layers."},
  30: {"ja": "BA 29に隣接する脳梁膨大後部の領域です。歴史的名称は無顆粒性ですが、現代の分類では異顆粒性と記載されることもあります。", "en": "A retrosplenial region adjacent to BA 29. Historically termed agranular, it is also described as dysgranular in modern classifications."},
  31: {"ja": "内側面でBA 23の背側に広がり、楔前部に隣接します。後部帯状皮質と楔前部全体を同一視しないよう見比べます。", "en": "Extends dorsal to BA 23 on the medial surface, adjoining the precuneus. Distinguish posterior cingulate cortex from the whole precuneus."},
  32: {"ja": "前部帯状皮質の背側から前方に位置します。内側面でBA 24や前頭前野とのつながりを観察します。", "en": "Located dorsally and rostrally in the anterior cingulate region. Use the medial view to inspect its relationship to BA 24 and prefrontal cortex."},
  33: {"ja": "脳梁膝付近の狭い帯状皮質です。内側面でBA 24との関係を確認します。体性感覚野のBA 3とは別の番号です。", "en": "A narrow cingulate area near the callosal genu. Compare it with BA 24 in medial views. It is distinct from somatosensory BA 3."},
  35: {"ja": "内側側頭葉の側副溝・嗅溝付近に位置します。嗅内皮質（BA 28）に隣接します。広義の嗅周皮質にはBA 36を含める場合もあります。", "en": "Located around the collateral and rhinal sulci in the medial temporal lobe, adjoining entorhinal cortex (BA 28). Broader definitions of perirhinal cortex also include BA 36."},
  36: {"ja": "BA 35の外側に隣接する領域です。BA 35とまとめて嗅周皮質と呼ぶ場合がありますが、この地図では別の番号として表示します。", "en": "Adjoins BA 35 laterally. It is sometimes grouped with BA 35 as perirhinal cortex, but is displayed as a separate numbered area in this map."},
  37: {"ja": "側頭葉後部から後頭葉との移行部に位置します。下面で紡錘状回付近を観察します。BA 37全体が顔に反応する紡錘状回顔領域という意味ではありません。", "en": "Located at the posterior temporal–occipital transition. Inspect the fusiform region from below. The whole of BA 37 is not equivalent to the fusiform face area."},
  38: {"ja": "側頭葉の最も前方に位置します。外側面と下面を切り替え、BA 20・21・22の前端との関係を見ます。", "en": "Occupies the anterior tip of the temporal lobe. Use lateral and inferior views to compare it with the anterior ends of BA 20, 21 and 22."},
  43: {"ja": "中心溝下端の近く、前頭・頭頂弁蓋部に位置します。味覚領域と関連づけられますが、味覚皮質は島皮質などにも広がり、BA 43だけでは表せません。", "en": "Located near the lower end of the central sulcus in the frontoparietal operculum. Associated with gustation, but taste cortex also involves the insula and is not confined to BA 43."},
  46: {"ja": "中前頭回付近にある前頭前野の領域です。BA 9などとともに背外側前頭前野に関連づけられます。", "en": "A prefrontal region around the middle frontal gyrus. Associated with dorsolateral prefrontal cortex together with BA 9 and other areas."},
  47: {"ja": "下前頭回の眼窩部から前頭葉下面に位置します。外側面と下面で、三角部のBA 45や眼窩面のBA 11との関係を確認します。", "en": "Located around the pars orbitalis and inferior frontal surface. Compare it with triangular BA 45 and orbital BA 11 using lateral and inferior views."},
  8: {"ja": "視線を目標へ向ける眼球運動に関わります。前頭眼野の機能的な境界とBA 8全体は一致しません。", "en": "Involved in directing gaze toward a target. Functional frontal eye field boundaries do not coincide with the whole of BA 8."},
  22: {"ja": "言語優位半球の上側頭回後部は、古典的なウェルニッケ領域（感覚性言語野）に関連づけられます。BA 22全体がウェルニッケ領域ではなく、言語理解は広いネットワークで担われます。", "en": "The posterior superior temporal gyrus in the language-dominant hemisphere is associated with the classical Wernicke region. It is not the whole of BA 22; language comprehension involves a distributed network."},
  39: {"ja": "下頭頂小葉の角回に概ね対応します。言語や複数の感覚情報を結びつける処理に関わります。", "en": "Approximately corresponds to the angular gyrus of the inferior parietal lobule; contributes to language and integration across sensory modalities."},
  40: {"ja": "下頭頂小葉の縁上回に概ね対応します。言語の音韻処理や感覚情報の統合に関わります。", "en": "Approximately corresponds to the supramarginal gyrus of the inferior parietal lobule; contributes to phonological processing and sensory integration."},
  41: {"ja": "外側溝の奥の横側頭回付近にあり、音の情報を受け取る一次聴覚野に関連します。周囲の領野を隠すときは、位置関係も見比べてください。", "en": "Located around the transverse temporal gyri deep in the lateral sulcus and associated with primary auditory processing. Compare the surrounding anatomy when hiding other areas."},
  42: {"ja": "一次聴覚野に隣接し、音の情報の処理に関わる領域です。機能的な聴覚皮質の区分はBA番号だけでは表しきれません。", "en": "Adjacent to primary auditory cortex and involved in processing sound. Functional auditory subdivisions cannot be fully represented by BA numbers."},

  1: { ja: '体性感覚に関わる領野の一つです。BA 2・3と見比べて位置関係を観察します。', en: 'One of the somatosensory areas. Compare its location with BA 2 and 3.' },
  2: { ja: '体性感覚に関わる領野の一つです。BA 1・3と見比べて位置関係を観察します。', en: 'One of the somatosensory areas. Compare its location with BA 1 and 3.' },
  3: { ja: '体性感覚に関わる領野です。この歴史的地図では3a・3bを分けていません。', en: 'A somatosensory area. This historical map does not separate 3a and 3b.' },
  4: { ja: '一次運動野に対応する領野です。この地図では4a・4pを分けていません。', en: 'Corresponds to primary motor cortex. This map does not separate 4a and 4p.' },
  6: { ja: '外側の運動前野と内側の補足運動野を含み、運動の準備や順序づけに関わります。', en: 'Includes lateral premotor and medial supplementary motor regions, involved in preparing and sequencing movement.' },
  17: { ja: '一次視覚野に対応する領野です。内側面からも観察します。', en: 'Corresponds to primary visual cortex. Explore it from the medial view as well.' },
  18: { ja: '二次視覚野に関連する領野です。BA 17との位置関係を観察します。', en: 'Associated with secondary visual cortex. Compare its location with BA 17.' },
  44: { ja: '言語優位半球（多くは左）のBA 45とともにブローカ領域を構成し、発話や言語処理に関わります。主に下前頭回の弁蓋部に対応します。右側の同じ番号が同じ言語機能を担うという意味ではありません。', en: 'Together with BA 45 in the language-dominant hemisphere (usually left), forms the Broca region, involved in speech and language processing. Mainly corresponds to the pars opercularis. The right-sided number does not imply the same language function.' },
  45: { ja: '言語優位半球（多くは左）のBA 44とともにブローカ領域を構成し、発話や言語処理に関わります。主に下前頭回の三角部に対応します。右側の同じ番号が同じ言語機能を担うという意味ではありません。', en: 'Together with BA 44 in the language-dominant hemisphere (usually left), forms the Broca region, involved in speech and language processing. Mainly corresponds to the pars triangularis. The right-sided number does not imply the same language function.' },
};

export default function BrodmannExplorer({ english = false }: { english?: boolean }) {
  const [view, setView] = useState<ViewKey>('left-lateral');
  const [rotation, setRotation] = useState<Rotation>({ ...views['left-lateral'].rotation });
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedAreas,setSelectedAreas]=useState<number[]>([]);
  const [hiddenAreas,setHiddenAreas]=useState<number[]>([]);
  const [colorMode, setColorMode] = useState<'all' | 'selected' | 'none'>('all');
  const [unavailable, setUnavailable] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [freeRotation, setFreeRotation] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; rotation: Rotation } | null>(null);
  const text = (ja: string, en: string) => english ? en : ja;
  const definition = views[view];
  const highlights = useMemo<HighlightLayer[]>(() => (colorMode === 'all' ? atlas.areaNumbers : colorMode === 'selected' ? selectedAreas : []).map(area => ({ ids: [area], color: brodmannColor(area) })), [colorMode, selectedAreas]);
  const selectView = (key: ViewKey) => { setView(key); setRotation({ ...views[key].rotation }); setFreeRotation(false); };
  const selectedNote = selected ? notes[selected] : null;
  const selectedName = selected ? areaNames[selected] : null;
  return <div className="brodmannExplorer" data-brodmann-explorer="true">
    <p className="brodmannIntro">{text('ブロードマンの細胞構築による分類を、標準脳表で観察します。番号を複数選んで、一緒に着色できます。覆っている領野は選択して隠せます。', 'Explore Brodmann’s cytoarchitectonic classification on a reference surface. Select multiple numbers to colour them together. Select overlying areas to hide them.')}</p>
    <div className="brodmannLayout">
      <section className="brodmannModel" aria-label={text('ブロードマン領野の3D観察', 'Brodmann area 3D observation')}>
        <div className="brodmannViews" role="group" aria-label={text('観察方向', 'Viewing direction')}>
          {(Object.keys(views) as ViewKey[]).map(key => <button type="button" key={key} aria-pressed={view === key && !freeRotation} onClick={() => selectView(key)}>{english ? views[key].en : views[key].ja}</button>)}
        </div>
        <div className="brodmannCanvas" tabIndex={unavailable ? undefined : 0} role="group" aria-label={text('3Dの向き：矢印キーで回転、Rでリセット', '3D orientation: arrow keys rotate, R resets')} onKeyDown={event => {
          if (event.target !== event.currentTarget || unavailable) return;
          if (event.key.toLowerCase() === 'r') { event.preventDefault(); selectView(view); setResetKey(value => value + 1); return; }
          const change = { ArrowLeft: [0, -5], ArrowRight: [0, 5], ArrowUp: [-5, 0], ArrowDown: [5, 0] }[event.key];
          if (change) { event.preventDefault(); setFreeRotation(true); setRotation(value => ({ ...value, x: value.x + change[0], y: value.y + change[1] })); }
        }} onPointerDown={event => {
          if (!(event.target instanceof HTMLCanvasElement) || event.button !== 0) return;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation: { ...rotation } };
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={event => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          setFreeRotation(true);
          setRotation({ x: start.rotation.x + (event.clientY - start.y) * .45, y: start.rotation.y + (event.clientX - start.x) * .45, z: start.rotation.z });
        }} onPointerUp={event => { drag.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { drag.current = null; }}>
          <AtlasVolumeCanvas key={resetKey} kind="surface" surfaceAtlas='brodmann' plane="coronal" position={50} focus="thalamus" display="specimen" rotation={rotation}
            view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} showCerebellum={false} showPonsMedulla={false} showMidbrain={false}
            hemisphere={definition.hemisphere} surfaceHiddenIds={hiddenAreas} surfaceHighlights={highlights} onWebGLUnavailableChange={setUnavailable}
            surfaceAriaLabel={text('ブロードマン領野の標準脳表。観察方向ボタンと拡大・縮小で操作できます。', 'Brodmann reference surface. Use viewing-direction and zoom controls.')} />
          <div className="brodmannModelLabel" aria-live="polite"><b>{colorMode === 'selected' && selectedAreas.length ? `BA ${selectedAreas.join(", ")}` : colorMode === 'all' ? text('全領野', 'All areas') : text('着色なし', 'No colour')}</b><span>{freeRotation ? text('自由回転', 'Free rotation') : english ? definition.en : definition.ja}</span></div>
        </div>
        <div className="brodmannTools">
          <button type="button" disabled={!selectedAreas.length} onClick={()=>{setHiddenAreas(previous=>[...new Set([...previous,...selectedAreas])]);setSelectedAreas([]);setSelected(null)}}>{text('選択した領野を隠す','Hide selected areas')}</button>
          <button type="button" disabled={!hiddenAreas.length} onClick={()=>setHiddenAreas([])}>{text('隠した領野をすべて戻す','Restore hidden areas')}</button>
          <button type="button" onClick={() => { setRotation({ ...definition.rotation }); setFreeRotation(false); setResetKey(value => value + 1); }}>{text('向き・拡大を戻す', 'Reset view and zoom')}</button>
          <span>{text('隠している領野（番号を再選択すると戻ります）：','Hidden areas (select a number again to restore): ')}{hiddenAreas.length?hiddenAreas.map(n=>`BA ${n}`).join(', '):text('なし','None')}</span>
        </div>
      </section>
      <aside className="brodmannPanel">
        <h2>{text('ブロードマン領野', 'Brodmann areas')} <small>{atlas.areaNumbers.length}{text('領野', ' areas')}</small></h2>
        <div className="brodmannColorModes" role="group" aria-label={text('着色方法', 'Colour mode')}>
          <button type="button" aria-pressed={colorMode === 'all'} onClick={() => {setColorMode('all')}}>{text('すべて着色', 'Colour all')}</button>
          <button type="button" aria-pressed={colorMode === 'selected'} disabled={!selectedAreas.length} onClick={() => setColorMode('selected')}>{text('選択領野', 'Selected')}</button>
          <button type="button" aria-pressed={colorMode === 'none'} onClick={() => {setColorMode('none')}}>{text('着色なし', 'No colour')}</button>
          <button type="button" onClick={()=>{setSelectedAreas([]);setSelected(null)}}>{text('選択解除','Clear selection')}</button>
        </div>
        {hiddenAreas.length>0&&<p>{text('非表示：','Hidden: ')}{hiddenAreas.map(n=>`BA ${n}`).join(', ')} — {text('番号を再選択すると戻ります','Select the number again to restore')}</p>}<div className="brodmannAreaGrid" role="group" aria-label={text('領野番号を選択', 'Select an area number')}>
          {atlas.areaNumbers.map(area => <button type="button" key={area} data-brodmann-area={area} aria-pressed={selectedAreas.includes(area)} onClick={() => { setSelected(area); setSelectedAreas(previous=>previous.includes(area)?previous.filter(n=>n!==area):[...previous,area]); setHiddenAreas(previous=>previous.filter(n=>n!==area)); setColorMode('selected'); }}><i style={{ background: `rgb(${brodmannColor(area).join(',')})` }} />BA {area}</button>)}
        </div>
        <div className="brodmannDescription" aria-live="polite">
          <h3>{selected ? `BA ${selected}${selectedName ? ` · ${english ? selectedName.en : selectedName.ja}` : ''}` : text('領野を選んで観察', 'Choose an area to explore')}</h3>
          <p>{selectedNote ? (english ? selectedNote.en : selectedNote.ja) : text('外側面・内側面・上面・下面を切り替えて、領野の広がりを確認しましょう。見えないときは、観察する側や方向を変えてください。', 'Switch between lateral, medial, superior and inferior views to inspect the extent of an area. If it is hidden, change the side or direction.')}</p>
          <p>{text('番号は細胞構築による区分です。併記した名称は代表的な対応で、脳回・機能領域の境界と厳密には一致しません。', 'Numbers describe cytoarchitectonic divisions. The accompanying names are common associations, not exact matches to gyral or functional boundaries.')}</p>
        </div>
      </aside>
    </div>
    <div className="brodmannSource">
      <b>{text('この地図の由来', 'About this map')}</b>
      <p>{text('PALS-B12の歴史的ブロードマン地図をfsaverageへ対応づけた表示です。Colin右半球に由来する地図を両側へ対応づけており、実際の左右差や個人ごとの細胞構築境界を実測したものではありません。灰色は領野未割当の部分です。', 'This historical PALS-B12 Brodmann map was transferred to fsaverage. A map originating from Colin’s right hemisphere was mapped to both sides; it does not measure individual cytoarchitectonic boundaries or actual hemispheric asymmetry. Grey regions are unassigned.')}</p>
      <p>{text('収録された41領野を表示します。島皮質の独立したBA区画はこの地図に収録されていません。欠番を補完したり、既存の脳回ラベルを番号へ置き換えたりしていません。BigBrain断面との位置合わせ・専門家レビューは未実施です。', 'The map does not include a separate insular BA parcel. The 41 supplied areas are displayed without filling missing numbers or relabelling existing gyral parcels. Registration to BigBrain sections and expert review have not been performed.')}</p>
      <nav aria-label={text('ブロードマン表示の参考文献', 'Brodmann display references')}>
        <a href="https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12" target="_blank" rel="noreferrer">PALS-B12 / FreeSurfer</a>
        <a href="https://doi.org/10.1016/j.neuroimage.2005.06.058" target="_blank" rel="noreferrer">Van Essen (2005)</a>
        <a href="https://freesurfer.net/fswiki/BrodmannAreaMaps" target="_blank" rel="noreferrer">{text('主な領野の説明', 'Selected area descriptions')}</a>
        <a href="https://www.ncbi.nlm.nih.gov/books/NBK575742/" target="_blank" rel="noreferrer">{text('皮質の名称・機能の対応', 'Cortical names and functional associations')}</a>
        <a href="https://www2.imm.dtu.dk/~faan/bib/Nielsen2001BibNeuroinformatics/node11.html" target="_blank" rel="noreferrer">{text('歴史的な領野名称の対応表', 'Historical area nomenclature')}</a>
        <a href="https://surfer.nmr.mgh.harvard.edu/fswiki/Perirhinal" target="_blank" rel="noreferrer">{text('BA 35・嗅周皮質の解剖', 'BA 35 / perirhinal anatomy')}</a>
        <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC4691684/" target="_blank" rel="noreferrer">{text('ウェルニッケ領域の範囲と現代的理解', 'Wernicke region: scope and modern interpretation')}</a>
        <a href={`${import.meta.env.BASE_URL}atlas/BRODMANN-FREESURFER-NOTICE.txt`} target="_blank" rel="noreferrer">{text('出典・利用条件・改変記録', 'Credits, licence and modifications')}</a>
      </nav>
    </div>
  </div>;
}
