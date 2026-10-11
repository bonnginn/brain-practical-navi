import {useId, useRef, useState, type KeyboardEvent} from 'react';
import './circuit-connection-graph.css';

export type CircuitConnectionNode = {
  key: string;
  label: string;
  x: number;
  y: number;
  selectKey?: string;
  kind?: 'model' | 'reference' | 'schematic';
  explanation?: string;
};
export type CircuitConnectionEdge = {from: string; to: string; label?: string; dashed?: boolean; bend?:number; active?:boolean;current?:boolean; flowPart?:'first'|'second'; via?:{x:number;y:number}[]};
type Props = {
  nodes: CircuitConnectionNode[];
  edges: CircuitConnectionEdge[];
  selectedKey: string;
  onSelect: (key: string) => void;
  english: boolean;
};

const nodeWidth = 166;
const lineHeight = 24;
// Coordinates describe a teaching diagram, not anatomical positions.
function labelLines(label: string) {
  return label.split('\n').flatMap(line => {
    const words = line.includes(' ') ? line.split(/\s+/) : Array.from(line);
    const joiner = line.includes(' ') ? ' ' : '';
    const limit = /[^\x00-\x7F]/.test(line) ? 12 : 23;
    const result: string[] = [];
    let current = '';
    for (const word of words) {
      const next = current ? `${current}${joiner}${word}` : word;
      if (current && next.length > limit) {result.push(current); current = word;}
      else current = next;
    }
    result.push(current);
    return result;
  });
}

export function CircuitConnectionGraph({nodes, edges, selectedKey, onSelect, english}: Props) {
  const id = useId().replace(/:/g, '');
  const root = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<{key:string;left:number;top:number}|null>(null);
  const showTip = (element:SVGGElement, key:string) => {
    const bounds=root.current?.getBoundingClientRect();if(!bounds)return;
    const node=element.getBoundingClientRect(),width=Math.min(280,bounds.width-16);
    setTip({key,left:Math.max(8,Math.min(node.left-bounds.left+(node.width-width)/2,bounds.width-width-8)),top:Math.max(8,Math.min(node.bottom-bounds.top+6,bounds.height-95))});
  };
  const titleId = `${id}-title`;
  const arrowId = `${id}-arrow`;
  const positioned = nodes.map(node => {
    const lines = labelLines(node.label);
    return {...node, lines, height: Math.max(76, lines.length * lineHeight + 36)};
  });
  const byKey = new Map(positioned.map(node => [node.key, node]));
  const plainLabel = (key: string) => byKey.get(key)?.label.replace(/\n/g, ' ');
  const connectionDescription = (key: string) => {
    const describe = (edge: CircuitConnectionEdge, other: string) => {
      const label = plainLabel(other);
      return label ? `${label}${edge.label ? ` (${edge.label})` : ''}` : null;
    };
    const incoming = edges.filter(edge => edge.to === key).map(edge => describe(edge, edge.from)).filter(Boolean);
    const outgoing = edges.filter(edge => edge.from === key).map(edge => describe(edge, edge.to)).filter(Boolean);
    return [
      incoming.length ? `${english ? 'Incoming from' : '入力元'}: ${incoming.join('; ')}.` : '',
      outgoing.length ? `${english ? 'Outgoing to' : '出力先'}: ${outgoing.join('; ')}.` : '',
    ].filter(Boolean).join(' ');
  };
  const minX = Math.min(0, ...positioned.map(node => node.x - nodeWidth / 2)) - 38;
  const minY = Math.min(0, ...positioned.map(node => node.y - node.height / 2)) - 42;
  const maxX = Math.max(200, ...positioned.map(node => node.x + nodeWidth / 2)) + 38;
  const maxY = Math.max(100, ...positioned.map(node => node.y + node.height / 2),...edges.flatMap(edge=>edge.via?.map(p=>p.y)??[])) + 42;
  const kinds = {
    model: english ? 'Available model' : '利用できるモデル',
    reference: english ? 'Reference shape' : '参照形状',
    schematic: english ? 'Schematic explanation' : '模式的な説明',
  };
  const select = (event: KeyboardEvent<SVGGElement>, key: string) => {
    if (event.key === 'Enter' || event.key === ' ') {event.preventDefault(); onSelect(key);}
  };
  return <section ref={root} className="circuit-connection-graph" aria-labelledby={titleId} data-circuit-connection-graph onKeyDown={event=>{if(event.key==='Escape')setTip(null)}}>
    <div className="circuit-connection-graph__heading">
      <h3 id={titleId}>{english ? 'Circuit connections' : '回路のつながり'}</h3>
      <p>{english ? 'Select a relay to explore it. Arrows show signal direction in a schematic, not reconstructed 3D fibres.' : '中継を選ぶと説明を確認できます。矢印は模式的な信号方向で、再構成した3D線維ではありません。'}</p>
    </div>
    <ul className="circuit-connection-graph__legend" aria-label={english ? 'Representation legend' : '表示の種類'}>
      {(['model', 'reference', 'schematic'] as const).map(kind => <li key={kind}>
        <span className={`circuit-connection-graph__swatch circuit-connection-graph__swatch--${kind}`} aria-hidden="true"/>{kinds[kind]}
      </li>)}
    </ul>
    <div className="circuit-connection-graph__viewport" tabIndex={0} aria-label={english?"Circuit diagram; scroll horizontally on a narrow screen":"回路図。狭い画面では横にスクロールできます"}><svg className="circuit-connection-graph__canvas" viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`} role="group" aria-labelledby={titleId}>
      <defs><marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor"/></marker></defs>
      <g className="circuit-connection-graph__edges" aria-hidden="true">
        {edges.map((edge, index) => {
          const from = byKey.get(edge.from), to = byKey.get(edge.to);
          if (!from || !to || from.key === to.key) return null;
          const dx = to.x - from.x, dy = to.y - from.y;
          if (dx === 0 && dy === 0) return null;
          const fromRatio = 1 / Math.max(Math.abs(dx) / (nodeWidth / 2 + 5), Math.abs(dy) / (from.height / 2 + 5));
          const toRatio = 1 / Math.max(Math.abs(dx) / (nodeWidth / 2 + 9), Math.abs(dy) / (to.height / 2 + 9));
          const first=edge.via?.[0],last=edge.via?.at(-1);
          const startDx=first?first.x-from.x:dx,startDy=first?first.y-from.y:dy,endDx=last?to.x-last.x:dx,endDy=last?to.y-last.y:dy;
          const sr=first?1/Math.max(Math.abs(startDx)/(nodeWidth/2+5),Math.abs(startDy)/(from.height/2+5)):fromRatio;
          const er=last?1/Math.max(Math.abs(endDx)/(nodeWidth/2+9),Math.abs(endDy)/(to.height/2+9)):toRatio;
          const x1 = from.x + startDx * sr, y1 = from.y + startDy * sr;
          const x2 = to.x - endDx * er, y2 = to.y - endDy * er;
          const reverse = edges.some(other => other.from === edge.to && other.to === edge.from);
          const distance = Math.hypot(dx, dy);
          const bend = edge.bend ?? (reverse ? 25 : 0);
          const cx = (x1 + x2) / 2 - dy / distance * bend;
          const cy = (y1 + y2) / 2 + dx / distance * bend;
          const labelX = edge.via?.length?((edge.via.at(-2)?.x??x1)+edge.via.at(-1)!.x)/2:(x1 + 2 * cx + x2) / 4;
          const labelY = edge.via?.length?edge.via.at(-1)!.y-10:(y1 + 2 * cy + y2) / 4 - 10;
          const edgePath=edge.via?.length?[`M ${x1} ${y1}`,...edge.via.map(p=>`L ${p.x} ${p.y}`),`L ${x2} ${y2}`].join(' '):`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
          return <g key={`${edge.from}-${edge.to}-${index}`}>
            <path className={'circuit-connection-graph__edge'+(edge.dashed?' circuit-connection-graph__edge--dashed':'')+(edge.active?' is-active':'')} d={edge.via?.length?[`M ${x1} ${y1}`,...edge.via.map(p=>`L ${p.x} ${p.y}`),`L ${x2} ${y2}`].join(' '):`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`} markerEnd={`url(#${arrowId})`}/>
            {edge.current&&<path className="circuit-flow-edge" d={edgePath} pathLength={100} data-flow-part={edge.flowPart} data-flow-from={edge.from} data-flow-to={edge.to}/>}
            {edge.label && <text className="circuit-connection-graph__edge-label" x={labelX} y={labelY} textAnchor="middle">{edge.label}</text>}
          </g>;
        })}
      </g>
      {positioned.map(node => {
        const kind = node.kind ?? 'schematic';
        const key = node.selectKey ?? node.key;
        const selected = key === selectedKey;
        const descriptionId = `${id}-connections-${node.key}`;
        return <g key={node.key} className={`circuit-connection-graph__node circuit-connection-graph__node--${kind}${selected ? ' is-selected' : ''}`} transform={`translate(${node.x} ${node.y})`} role="button" tabIndex={0} aria-pressed={selected} aria-label={`${node.label.replace(/\n/g, ' ')} — ${kinds[kind]}`} aria-describedby={descriptionId} onMouseEnter={event=>showTip(event.currentTarget,node.key)} onMouseLeave={()=>setTip(null)} onFocus={event=>showTip(event.currentTarget,node.key)} onBlur={()=>setTip(null)} onClick={() => onSelect(key)} onKeyDown={event => select(event, key)} data-circuit-overview-step={key} data-circuit-node={node.key}>
          <desc id={descriptionId}>{node.explanation} {connectionDescription(node.key)}</desc>
          <rect className="circuit-connection-graph__focus" x={-nodeWidth / 2 - 5} y={-node.height / 2 - 5} width={nodeWidth + 10} height={node.height + 10} rx="17"/>
          <rect className="circuit-connection-graph__node-box" x={-nodeWidth / 2} y={-node.height / 2} width={nodeWidth} height={node.height} rx="12"/>
          <circle className="circuit-connection-graph__kind-dot" cx={-nodeWidth / 2 + 15} cy={-node.height / 2 + 14} r="3"/>
          <text className="circuit-connection-graph__node-label" textAnchor="middle" y={-(node.lines.length - 1) * lineHeight / 2 + 5}>{node.lines.map((line, index) => <tspan key={index} x="0" dy={index ? lineHeight : 0}>{line}</tspan>)}</text>
        </g>;
      })}
    </svg></div>
    {tip&&byKey.get(tip.key)?.explanation&&<div className="circuit-node-tooltip" role="tooltip" style={{left:tip.left,top:tip.top}}><strong>{plainLabel(tip.key)}</strong><span>{byKey.get(tip.key)!.explanation}</span></div>}
  </section>;
}
