export type SegmentationPlane="horizontal"|"coronal"|"sagittal";

export const segmentationPlaneNames:Record<SegmentationPlane,{label:string;axis:"X"|"Y"|"Z";rangeStart:string;rangeEnd:string;increment:string;decrement:string;top:string;bottom:string;left:string;right:string}>={
  horizontal:{label:"水平断",axis:"Z",rangeStart:"上方",rangeEnd:"下方",increment:"上方",decrement:"下方",top:"A",bottom:"P",left:"L",right:"R"},
  coronal:{label:"冠状断",axis:"Y",rangeStart:"後方",rangeEnd:"前方",increment:"前方",decrement:"後方",top:"S",bottom:"I",left:"L",right:"R"},
  sagittal:{label:"矢状断",axis:"X",rangeStart:"左",rangeEnd:"右",increment:"右",decrement:"左",top:"S",bottom:"I",left:"A",right:"P"},
};

/** Display order follows AtlasVolumeCanvas.sectionVoxel. */
export function planeShape(dims:[number,number,number],plane:SegmentationPlane):[number,number]{
  return plane==="sagittal"?[dims[1],dims[2]]:plane==="horizontal"?[dims[0],dims[1]]:[dims[0],dims[2]];
}
export function planeAxisSize(dims:[number,number,number],plane:SegmentationPlane){
  return dims[plane==="sagittal"?0:plane==="horizontal"?2:1];
}
export function planeSliceIndex(position:number,plane:SegmentationPlane,dims:[number,number,number]){
  const size=planeAxisSize(dims,plane),bounded=Math.max(0,Math.min(100,position));
  return Math.round((plane==="horizontal"?1-bounded/100:bounded/100)*(size-1));
}
export function planePositionForSlice(index:number,plane:SegmentationPlane,dims:[number,number,number]){
  const size=planeAxisSize(dims,plane),bounded=Math.max(0,Math.min(size-1,index));
  return (plane==="horizontal"?1-bounded/(size-1):bounded/(size-1))*100;
}

/** A navigation hint from already adopted labels, never an anatomical boundary decision. */
export function nearestLabeledSection(
  rangesByLabel:Record<string,Record<SegmentationPlane,number[][]>>,
  labelIds:readonly number[],plane:SegmentationPlane,currentIndex:number,
):number|null{
  const ranges=labelIds.flatMap(id=>rangesByLabel[String(id)]?.[plane]??[]);
  if(ranges.some(([first,last])=>currentIndex>=first&&currentIndex<=last))return null;
  let best:[number,number]|null=null;
  for(const [first,last,peak] of ranges){
    const distance=currentIndex<first?first-currentIndex:currentIndex-last;
    if(!best||distance<best[0]||(distance===best[0]&&Math.abs(peak-currentIndex)<Math.abs(best[1]-currentIndex)))best=[distance,peak];
  }
  return best?.[1]??null;
}
/** Move one voxel in slider order, preserving the horizontal axis reversal. */
export function stepPlanePosition(position:number,plane:SegmentationPlane,dims:[number,number,number],direction:-1|1){
  const delta=plane==="horizontal"?-direction:direction;
  return planePositionForSlice(planeSliceIndex(position,plane,dims)+delta,plane,dims);
}
/** Display precision only: never feed this rounded label back into sampling. */
export function formatSectionPosition(position:number){return String(Number(position.toFixed(2)));}
export function planeVoxel(a:number,b:number,slice:number,plane:SegmentationPlane,dims:[number,number,number]):[number,number,number]{
  const[dx,dy,dz]=dims;
  if(plane==="horizontal")return[a,dy-1-b,slice];
  if(plane==="sagittal")return[slice,dy-1-a,dz-1-b];
  return[a,slice,dz-1-b];
}
