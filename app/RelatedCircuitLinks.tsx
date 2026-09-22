import {circuitTeaching} from '../src/circuitTeaching.mjs';
import type {LearningCircuitKey} from '../src/learningConnections';

export function RelatedCircuitLinks({circuits,english,onOpen}:{circuits:readonly LearningCircuitKey[]|undefined;english:boolean;onOpen:(key:LearningCircuitKey)=>void}){
  if(!circuits?.length)return null;
  return <nav className="relatedCircuitLinks" data-no-localize aria-label={english?'Related circuit explanations':'関連する回路の解説'}><b>{english?'Connect this structure to a circuit':'この構造を回路で理解する'}</b>{circuits.map(key=><button key={key} type="button" onClick={()=>onOpen(key)}>{circuitTeaching(key)?.name[english?'en':'ja']} →</button>)}</nav>;
}
