import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import './circuit-overview.css';

export type CircuitOverviewStage = {
  key: string;
  name: string;
  detail: string;
  representation: string;
  canObserve: boolean;
};

export type CircuitOverviewProps = {
  english: boolean;
  title: string;
  purpose: string;
  briefPurpose?: string;
  laterality: string;
  stages: CircuitOverviewStage[];
  selectedKey: string;
  onSelect: (key: string) => void;
  onObserve: () => void;
  observeLabel?: string;
  onClose?: () => void;
  observation?: ReactNode;
  connectionGraph?: ReactNode;
  onFlowChange?: (playing:boolean,seconds:number)=>void;
};

export function CircuitOverview({english,title,purpose,briefPurpose,laterality,stages,selectedKey,onSelect,onObserve,onClose,observeLabel,observation,connectionGraph,onFlowChange}: CircuitOverviewProps) {
  const rootRef=useRef<HTMLElement>(null);
  useEffect(()=>{const viewport=rootRef.current?.querySelector<HTMLElement>('.circuit-connection-graph__viewport');const node=viewport?.querySelector<SVGElement>('[aria-pressed="true"]');if(!viewport||!node)return;const vr=viewport.getBoundingClientRect(),nr=node.getBoundingClientRect();if(nr.left<vr.left||nr.right>vr.right)viewport.scrollLeft+=nr.left-vr.left-(vr.width-nr.width)/2;if(nr.top<vr.top||nr.bottom>vr.bottom)viewport.scrollTop+=nr.top-vr.top-(vr.height-nr.height)/2;});
  const headingId = useId();
  const detailId = useId();
  const selectedIndex = stages.findIndex(stage => stage.key === selectedKey);
  const selected = stages[selectedIndex];
  const [flowPlaying,setFlowPlaying]=useState(false),[flowSeconds,setFlowSeconds]=useState(2.4);
  useEffect(()=>{onFlowChange?.(flowPlaying,flowSeconds)},[flowPlaying,flowSeconds]);
  const selectRef=useRef(onSelect);selectRef.current=onSelect;
  useEffect(()=>{if(!flowPlaying)return;if(selectedIndex<0){setFlowPlaying(false);return;}const timer=setTimeout(()=>{if(selectedIndex>=stages.length-1)setFlowPlaying(false);else selectRef.current(stages[selectedIndex+1].key)},flowSeconds*1000);return()=>clearTimeout(timer);},[flowPlaying,selectedKey,flowSeconds,stages.length]);
  useEffect(()=>{const pause=()=>{if(document.hidden)setFlowPlaying(false)};document.addEventListener('visibilitychange',pause);return()=>document.removeEventListener('visibilitychange',pause)},[]);
  const copy = english ? {
    eyebrow: 'Circuit overview', close: 'Close overview', purpose: 'What this circuit does',
    laterality: 'Sides and crossing', order: 'Schematic connection order',
    scope: 'The arrows show the explanatory order of connections. This is a schematic, not a 3D anatomical view.',
    instruction: 'Select a step to read its explanation and see which representation is available.',
    selected: 'Selected step', representation: 'Representation', observe: 'Observe selected step',
    unavailable: 'Observation representation unavailable for this step. Use the explanation here.',
    choose: 'Select a step above to read its explanation.', empty: 'No steps are available for this circuit.',
    step: 'Step', of: 'of', current: 'Selected',
  } : {
    eyebrow: '回路の全体像', close: '全体像を閉じる', purpose: 'この回路の働き',
    laterality: '左右と交叉', order: '模式図：つながりの順序',
    scope: '矢印はつながりを説明する順序を示します。解剖学的な3D表示ではなく、模式図です。',
    instruction: '段階を選ぶと、説明と利用できる表現を確認できます。',
    selected: '選択中の段階', representation: '表現の種類', observe: '選択中の段階を観察する',
    unavailable: 'この段階を観察するための表現はありません。ここで説明を確認できます。',
    choose: '上の段階を選ぶと説明を確認できます。', empty: 'この回路には表示できる段階がありません。',
    step: '段階', of: '/', current: '選択中',
  };

  return <section ref={rootRef} className="circuitOverview" data-flow-playing={flowPlaying} style={{'--circuit-flow-duration':flowSeconds+'s'} as React.CSSProperties} data-no-localize lang={english ? 'en' : 'ja'} aria-labelledby={headingId}>
    <header className="circuitOverviewHeader">
      <div><p className="circuitOverviewEyebrow">{copy.eyebrow}</p><h2 id={headingId}>{title}</h2>{briefPurpose&&<p className="circuitBriefPurpose">{briefPurpose}</p>}</div>
      {onClose && <button type="button" className="circuitOverviewClose" onClick={onClose}>{copy.close}</button>}
    </header>
    {connectionGraph}
    {connectionGraph&&<div className="circuitFlowControls"><button type="button" data-circuit-play aria-pressed={flowPlaying} onClick={()=>{if(!flowPlaying&&selectedIndex>=stages.length-1)onSelect(stages[0].key);setFlowPlaying(p=>!p)}}>{flowPlaying?(english?'Pause flow':'流れを停止'):(english?'Play flow':'流れを再生')}</button><label>{english?'Speed':'速度'} <select aria-label={english?'Flow speed':'流れの速度'} value={flowSeconds} onChange={e=>setFlowSeconds(Number(e.target.value))}><option value={2.4}>{english?'Normal':'標準'}</option><option value={4.8}>{english?'Slow':'ゆっくり'}</option></select></label><small>{english?'Moving light: explanatory signal flow':'光る帯：説明上の信号の流れ'}</small></div>}
    <details className="circuitOverviewContext"><summary>{english?'Purpose and laterality':'働き・左右と交叉'}</summary><dl>
      <div><dt>{copy.purpose}</dt><dd>{purpose}</dd></div>
      <div><dt>{copy.laterality}</dt><dd>{laterality}</dd></div>
    </dl></details>
    {!connectionGraph && <div className="circuitOverviewSequence">
      <h3>{copy.order}</h3>
      <p className="circuitOverviewScope">{copy.scope}</p>
      <p className="circuitOverviewInstruction">{copy.instruction}</p>
      {stages.length ? <ol className="circuitOverviewSteps">
        {stages.map((stage,index) => <li key={stage.key}>
          <button type="button" className="circuitOverviewStep" data-circuit-overview-step={stage.key}
            aria-pressed={stage.key === selectedKey} aria-controls={detailId} onClick={() => onSelect(stage.key)}>
            <span className="circuitOverviewStepNumber">{copy.step} {index + 1}</span>
            <span className="circuitOverviewStepName">{stage.name}</span>
            {stage.key === selectedKey && <span className="circuitOverviewSelectedBadge">{copy.current}</span>}
          </button>
          {index < stages.length - 1 && <span className="circuitOverviewArrow" aria-hidden="true">→</span>}
        </li>)}
      </ol> : <p>{copy.empty}</p>}
    </div>}
    <details className="circuitOverviewDetail" id={detailId} aria-live="polite" aria-atomic="true"><summary>{english?'Step explanation and representation':'段階の説明・表現の種類'}</summary>
      {selected ? <>
        <p className="circuitOverviewDetailPosition">{copy.selected} · {selectedIndex + 1} {copy.of} {stages.length}</p>
        <h3>{selected.name}</h3>
        <p className="circuitOverviewExplanation">{selected.detail}</p>
        <p className="circuitOverviewRepresentation"><strong>{copy.representation}</strong><span>{selected.representation}</span></p>
        {selected.canObserve
          ? <button type="button" className="circuitOverviewObserve" onClick={onObserve}>{observeLabel??copy.observe}</button>
          : <p className="circuitOverviewUnavailable" role="note">{copy.unavailable}</p>}
      </> : <p>{stages.length ? copy.choose : copy.empty}</p>}
    </details>
    {observation?<div className="circuitObservationColumn"><nav className="circuitTraversal" aria-label={english?'Follow circuit in order':'回路を順にたどる'}>
 <button type="button" data-circuit-previous disabled={selectedIndex<=0} onClick={()=>onSelect(stages[selectedIndex-1].key)}>{english?'Previous':'前へ'}</button>
 <span aria-live="polite" title={selected?.name}><small>{selectedIndex+1} / {stages.length}</small> {selected?.name}</span>
 <button type="button" data-circuit-next disabled={selectedIndex<0||selectedIndex>=stages.length-1} onClick={()=>onSelect(stages[selectedIndex+1].key)}>{english?'Next':'次へ'}</button>
 </nav>{observation}</div>:<nav className="circuitTraversal" aria-label={english?'Follow circuit in order':'回路を順にたどる'}>
 <button type="button" data-circuit-previous disabled={selectedIndex<=0} onClick={()=>onSelect(stages[selectedIndex-1].key)}>{english?'Previous':'前へ'}</button>
 <span aria-live="polite" title={selected?.name}><small>{selectedIndex+1} / {stages.length}</small> {selected?.name}</span>
 <button type="button" data-circuit-next disabled={selectedIndex<0||selectedIndex>=stages.length-1} onClick={()=>onSelect(stages[selectedIndex+1].key)}>{english?'Next':'次へ'}</button>
 </nav>}
  </section>;
}
