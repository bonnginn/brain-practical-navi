import { BIGBRAIN_SECTION_DIMS, planeSliceIndex, sectionSliderDirections, sectionSliderValue, segmentationPlaneNames, type SegmentationPlane } from "./segmentationGeometry";

// Keep the existing import path for the quiz and section controls.
export { BIGBRAIN_SECTION_DIMS };
export function SectionSliceStepper({position,plane,english,onStep}:{position:number;plane:SegmentationPlane;english:boolean;onStep:(direction:-1|1)=>void}){
  const index=planeSliceIndex(position,plane,BIGBRAIN_SECTION_DIMS);
  const {start,end}=sectionSliderDirections[plane];
  const atStart=sectionSliderValue(position,plane)===0;
  const atEnd=sectionSliderValue(position,plane)===100;
  return <div className="sectionSliceStepper" aria-label={english?"Step through individual 0.5 mm slices":"0.5 mmの断面を1枚ずつ移動"}>
    <button type="button" onClick={()=>onStep(-1)} disabled={atStart} aria-label={english?`One slice ${start.en.toLowerCase()} (0.5 mm)`:`${start.ja}へ1枚（0.5 mm）`}>−1{english?" slice":"枚"}</button>
    <span><b data-section-slice-index={index}>{segmentationPlaneNames[plane].axis} {index}</b><small>{english?"0.5 mm steps":"1枚＝0.5 mm"}</small></span>
    <button type="button" onClick={()=>onStep(1)} disabled={atEnd} aria-label={english?`One slice ${end.en.toLowerCase()} (0.5 mm)`:`${end.ja}へ1枚（0.5 mm）`}>＋1{english?" slice":"枚"}</button>
  </div>;
}
