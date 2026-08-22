export type SegmentationPlane="horizontal"|"coronal"|"sagittal";

export const segmentationPlaneNames:Record<SegmentationPlane,{label:string;axis:"X"|"Y"|"Z";rangeStart:string;rangeEnd:string;increment:string;decrement:string;top:string;bottom:string;left:string;right:string}>={
  horizontal:{label:"水平断",axis:"Z",rangeStart:"上方",rangeEnd:"下方",increment:"上方",decrement:"下方",top:"A",bottom:"P",left:"L",right:"R"},
  coronal:{label:"冠状断",axis:"Y",rangeStart:"後方",rangeEnd:"前方",increment:"前方",decrement:"後方",top:"S",bottom:"I",left:"L",right:"R"},
  sagittal:{label:"矢状断",axis:"X",rangeStart:"左",rangeEnd:"右",increment:"右",decrement:"左",top:"S",bottom:"I",left:"P",right:"A"},
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
export function planeVoxel(a:number,b:number,slice:number,plane:SegmentationPlane,dims:[number,number,number]):[number,number,number]{
  const[dx,dy,dz]=dims;
  if(plane==="horizontal")return[a,dy-1-b,slice];
  if(plane==="sagittal")return[slice,a,dz-1-b];
  return[a,slice,dz-1-b];
}
