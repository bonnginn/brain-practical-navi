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
const notes: Record<number, { ja: string; en: string }> = {
  1: { ja: '体性感覚に関わる領野の一つです。BA 2・3と見比べて位置関係を観察します。', en: 'One of the somatosensory areas. Compare its location with BA 2 and 3.' },
  2: { ja: '体性感覚に関わる領野の一つです。BA 1・3と見比べて位置関係を観察します。', en: 'One of the somatosensory areas. Compare its location with BA 1 and 3.' },
  3: { ja: '体性感覚に関わる領野です。この歴史的地図では3a・3bを分けていません。', en: 'A somatosensory area. This historical map does not separate 3a and 3b.' },
  4: { ja: '一次運動野に対応する領野です。この地図では4a・4pを分けていません。', en: 'Corresponds to primary motor cortex. This map does not separate 4a and 4p.' },
  6: { ja: '運動前野に関連する領野です。外側面と内側面の両方を観察します。', en: 'Associated with premotor cortex. Explore both the lateral and medial surfaces.' },
  17: { ja: '一次視覚野に対応する領野です。内側面からも観察します。', en: 'Corresponds to primary visual cortex. Explore it from the medial view as well.' },
  18: { ja: '二次視覚野に関連する領野です。BA 17との位置関係を観察します。', en: 'Associated with secondary visual cortex. Compare its location with BA 17.' },
  44: { ja: 'BA 45とともにBroca領域に関連します。左右の同じ番号が機能的に同一であることを示す図ではありません。', en: 'Associated with Broca’s region together with BA 45. Matching area numbers do not establish identical functions in the two hemispheres.' },
  45: { ja: 'BA 44とともにBroca領域に関連します。左右の同じ番号が機能的に同一であることを示す図ではありません。', en: 'Associated with Broca’s region together with BA 44. Matching area numbers do not establish identical functions in the two hemispheres.' },
};

export default function BrodmannExplorer({ english = false }: { english?: boolean }) {
  const [view, setView] = useState<ViewKey>('left-lateral');
  const [rotation, setRotation] = useState<Rotation>({ ...views['left-lateral'].rotation });
  const [selected, setSelected] = useState<number | null>(null);
  const [colorMode, setColorMode] = useState<'all' | 'selected' | 'none'>('all');
  const [unavailable, setUnavailable] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [inflated, setInflated] = useState(false);
  const [freeRotation, setFreeRotation] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; rotation: Rotation } | null>(null);
  const text = (ja: string, en: string) => english ? en : ja;
  const definition = views[view];
  const highlights = useMemo<HighlightLayer[]>(() => (colorMode === 'all' ? atlas.areaNumbers : colorMode === 'selected' && selected ? [selected] : []).map(area => ({ ids: [area], color: brodmannColor(area) })), [colorMode, selected]);
  const selectView = (key: ViewKey) => { setView(key); setRotation({ ...views[key].rotation }); setFreeRotation(false); };
  const selectedNote = selected ? notes[selected] : null;
  return <div className="brodmannExplorer" data-brodmann-explorer="true">
    <p className="brodmannIntro">{text('ブロードマンの細胞構築による分類を、標準脳表で観察します。番号を選ぶと、その領野だけを強調します。', 'Explore Brodmann’s cytoarchitectonic classification on a reference surface. Select a number to highlight that area.')}</p>
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
          <AtlasVolumeCanvas key={resetKey} kind="surface" surfaceAtlas={inflated ? 'brodmann-inflated' : 'brodmann'} plane="coronal" position={50} focus="thalamus" display="specimen" rotation={rotation}
            view="inside" contrast="bigbrain" showFocus={false} showCutPlane={false} showCerebellum={false} showPonsMedulla={false} showMidbrain={false}
            hemisphere={definition.hemisphere} surfaceHighlights={highlights} onWebGLUnavailableChange={setUnavailable}
            surfaceAriaLabel={text('ブロードマン領野の標準脳表。観察方向ボタンと拡大・縮小で操作できます。', 'Brodmann reference surface. Use viewing-direction and zoom controls.')} />
          <div className="brodmannModelLabel" aria-live="polite"><b>{colorMode === 'selected' && selected ? `BA ${selected}` : colorMode === 'all' ? text('全領野', 'All areas') : text('着色なし', 'No colour')}</b><span>{freeRotation ? text('自由回転', 'Free rotation') : english ? definition.en : definition.ja}</span></div>
        </div>
        <div className="brodmannTools">
          <button type="button" aria-pressed={inflated} onClick={() => setInflated(value => !value)}>{inflated ? text('通常の脳表へ', 'Pial surface') : text('溝の奥を見る（膨張表示）', 'Open sulci (inflated)')}</button>
          <button type="button" onClick={() => { setRotation({ ...definition.rotation }); setFreeRotation(false); setResetKey(value => value + 1); }} disabled={unavailable}>{text('向き・拡大を戻す', 'Reset view and zoom')}</button>
          <span>{inflated ? text('膨張表示：頂点の対応を保持。左右の間隔・大きさは表示用です', 'Inflated: vertex correspondence preserved; spacing and scale are for display') : text('表示：fsaverage標準脳表・ドラッグで回転', 'Surface: fsaverage reference · drag to rotate')}</span>
        </div>
      </section>
      <aside className="brodmannPanel">
        <h2>{text('ブロードマン領野', 'Brodmann areas')} <small>{atlas.areaNumbers.length}{text('領野', ' areas')}</small></h2>
        <div className="brodmannColorModes" role="group" aria-label={text('着色方法', 'Colour mode')}>
          <button type="button" aria-pressed={colorMode === 'all'} onClick={() => setColorMode('all')}>{text('すべて着色', 'Colour all')}</button>
          <button type="button" aria-pressed={colorMode === 'selected'} disabled={!selected} onClick={() => setColorMode('selected')}>{text('選択領野だけ', 'Selected only')}</button>
          <button type="button" aria-pressed={colorMode === 'none'} onClick={() => setColorMode('none')}>{text('着色なし', 'No colour')}</button>
        </div>
        <div className="brodmannAreaGrid" role="group" aria-label={text('領野番号を選択', 'Select an area number')}>
          {atlas.areaNumbers.map(area => <button type="button" key={area} data-brodmann-area={area} aria-pressed={selected === area} onClick={() => { setSelected(area); setColorMode('selected'); }}><i style={{ background: `rgb(${brodmannColor(area).join(',')})` }} />BA {area}</button>)}
        </div>
        <div className="brodmannDescription" aria-live="polite">
          <h3>{selected ? `BA ${selected}` : text('領野を選んで観察', 'Choose an area to explore')}</h3>
          <p>{selectedNote ? (english ? selectedNote.en : selectedNote.ja) : text('外側面・内側面・上面・下面を切り替えて、領野の広がりを確認しましょう。見えないときは、観察する側や方向を変えてください。', 'Switch between lateral, medial, superior and inferior views to inspect the extent of an area. If it is hidden, change the side or direction.')}</p>
          <p>{text('番号は細胞構築による区分です。一つの番号が一つの機能だけを担う、という意味ではありません。', 'The numbers describe cytoarchitectonic divisions, not a one-area–one-function scheme.')}</p>
        </div>
      </aside>
    </div>
    <div className="brodmannSource">
      <b>{text('この地図の由来', 'About this map')}</b>
      <p>{text('PALS-B12の歴史的ブロードマン地図をfsaverageへ対応づけた表示です。Colin右半球に由来する地図を両側へ対応づけており、実際の左右差や個人ごとの細胞構築境界を実測したものではありません。灰色は領野未割当の部分です。', 'This historical PALS-B12 Brodmann map was transferred to fsaverage. A map originating from Colin’s right hemisphere was mapped to both sides; it does not measure individual cytoarchitectonic boundaries or actual hemispheric asymmetry. Grey regions are unassigned.')}</p>
      <p>{text('収録された41領野を表示します。欠番を補完したり、既存の脳回ラベルを番号へ置き換えたりしていません。BigBrain断面との位置合わせ・専門家レビューは未実施です。', 'The 41 supplied areas are displayed without filling missing numbers or relabelling existing gyral parcels. Registration to BigBrain sections and expert review have not been performed.')}</p>
      <nav aria-label={text('ブロードマン表示の参考文献', 'Brodmann display references')}>
        <a href="https://surfer.nmr.mgh.harvard.edu/fswiki/PALS_B12" target="_blank" rel="noreferrer">PALS-B12 / FreeSurfer</a>
        <a href="https://doi.org/10.1016/j.neuroimage.2005.06.058" target="_blank" rel="noreferrer">Van Essen (2005)</a>
        <a href="https://freesurfer.net/fswiki/BrodmannAreaMaps" target="_blank" rel="noreferrer">{text('主な領野の説明', 'Selected area descriptions')}</a>
        <a href={`${import.meta.env.BASE_URL}atlas/BRODMANN-FREESURFER-NOTICE.txt`} target="_blank" rel="noreferrer">{text('出典・利用条件・改変記録', 'Credits, licence and modifications')}</a>
      </nav>
    </div>
  </div>;
}
