import { planeAxisSize, planeSliceIndex, segmentationPlaneNames, type SegmentationPlane } from "./segmentationGeometry";

// Verified against the BBS1 header in the regression test; not used for other sources.
export const BIGBRAIN_SECTION_DIMS:[number,number,number]=[394,466,378];
const directions={coronal:["後方","前方","posterior","anterior"],horizontal:["上方","下方","superior","inferior"],sagittal:["左","右","left","right"]} as const;

export function SectionSliceStepper({position,plane,english,onStep}:{position:number;plane:SegmentationPlane;english:boolean;onStep:(direction:-1|1)=>void}){
  const index=planeSliceIndex(position,plane,BIGBRAIN_SECTION_DIMS);
  const last=planeAxisSize(BIGBRAIN_SECTION_DIMS,plane)-1;
  const [back,forward,backEn,forwardEn]=directions[plane];
  const atStart=plane==="horizontal"?index===last:index===0;
  const atEnd=plane==="horizontal"?index===0:index===last;
  return <div className="sectionSliceStepper" aria-label={english?"Step through individual 0.5 mm slices":"0.5 mmの断面を1枚ずつ移動"}>
    <button type="button" onClick={()=>onStep(-1)} disabled={atStart} aria-label={english?`One slice ${backEn} (0.5 mm)`:`${back}へ1枚（0.5 mm）`}>−1{english?" slice":"枚"}</button>
    <span><b data-section-slice-index={index}>{segmentationPlaneNames[plane].axis} {index}</b><small>{english?"0.5 mm steps":"1枚＝0.5 mm"}</small></span>
    <button type="button" onClick={()=>onStep(1)} disabled={atEnd} aria-label={english?`One slice ${forwardEn} (0.5 mm)`:`${forward}へ1枚（0.5 mm）`}>＋1{english?" slice":"枚"}</button>
  </div>;
}
