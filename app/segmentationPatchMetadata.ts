export type PatchRun={start:number;length:number;label:number};
export type PatchTargetStructure={id:number;name:string};
export type PatchSliceRange={plane:"horizontal";axis:"Z";min:number;max:number};
export type PatchTransition={from:number;to:number;voxels:number};
export type PatchChangeSummary={changedVoxelCount:number;unchangedVoxelCount:number;transitions:PatchTransition[]};
export type PatchReview={decision:"unreviewed"|"approved"|"rejected";reviewer:null|{kind:"github"|"project-role";id:string};decidedAt:string|null;reason:string;pullRequest:null|{number:number;mergeCommit:string|null}};
export type SegmentationPatch={
  format:"brain-practical-segmentation-patch";
  version:1;
  sourceImage:string;
  sourceLabels:string;
  sourceLabelsSha256:string;
  dims:[number,number,number];
  voxelSizeMm:[number,number,number];
  primaryPlane:"horizontal";
  createdAt:string;
  authorNote:string;
  authorGitHub:string;
  targetSide:"left"|"right"|"bilateral"|"midline"|"mixed";
  evidence:string;
  confidence:"high"|"medium"|"low";
  workflowMetadataVersion:1;
  targetStructures:PatchTargetStructure[];
  sliceRanges:PatchSliceRange[];
  changeSummary:PatchChangeSummary;
  review:PatchReview;
  reviewStatus:"unreviewed"|"approved"|"rejected";
  editCount:number;
  runs:PatchRun[];
};

export type SegmentationPatchBuildInput={
  edits:ReadonlyMap<number,number>;
  labels:Uint8Array;
  dims:[number,number,number];
  sourceLabelsSha256:string;
  createdAt:string;
  authorNote:string;
  authorGitHub:string;
  targetSide:"left"|"right"|"bilateral"|"midline"|"mixed";
  evidence:string;
  confidence:"high"|"medium"|"low";
};

export const CANONICAL_SOURCE_IMAGE="/atlas/bigbrain-icbm500.bin.gz";
export const CANONICAL_SOURCE_LABELS="/atlas/bigbrain-practical-segmentation-icbm500.bin.gz";

const labelNames:ReadonlyMap<number,string>=new Map([
  [1,"左赤核"],[2,"右赤核"],[3,"左黒質"],[4,"右黒質"],[5,"左視床下核"],[6,"右視床下核"],
  [7,"左尾状核"],[8,"右尾状核"],[9,"左被殻"],[10,"右被殻"],[11,"左淡蒼球外節"],[12,"右淡蒼球外節"],
  [13,"左淡蒼球内節"],[14,"右淡蒼球内節"],[15,"左視床"],[16,"右視床"],[17,"左海馬"],[18,"右海馬"],
  [19,"左側坐核"],[20,"右側坐核"],[21,"左扁桃体"],[22,"右扁桃体"],[23,"左側脳室"],[24,"右側脳室"],
  [25,"第三脳室"],[26,"第四脳室"],[27,"脳幹"],[28,"左小脳"],[29,"右小脳"],[30,"脳梁候補"],
  [31,"左内包候補"],[32,"右内包候補"],[33,"視交叉候補"],[34,"左島皮質候補"],[35,"右島皮質候補"],
  [36,"視交叉（正中）"],[37,"左視索"],[38,"右視索"],[39,"左乳頭体"],[40,"右乳頭体"],
  [41,"中脳水道候補（部分）"],
]);

function toRuns(edits:ReadonlyMap<number,number>):PatchRun[]{
  const sorted=[...edits].sort((a,b)=>a[0]-b[0]),runs:PatchRun[]=[];
  for(const[index,label]of sorted){
    const last=runs.at(-1);
    if(last&&last.label===label&&last.start+last.length===index)last.length++;
    else runs.push({start:index,length:1,label});
  }
  return runs;
}

/** Build browser patch metadata only from the supplied voxel grid and edits. */
export function buildSegmentationPatch(input:SegmentationPatchBuildInput):SegmentationPatch{
  const{edits,labels,dims}=input;
  const targetIds=new Set<number>(),zValues:number[]=[],transitionCounts=new Map<string,number>();
  let changedVoxelCount=0,unchangedVoxelCount=0;
  for(const[index,to]of edits){
    const from=labels[index];
    if(from)targetIds.add(from);
    if(to)targetIds.add(to);
    zValues.push(Math.floor(index/(dims[0]*dims[1])));
    if(from===to)unchangedVoxelCount++;
    else{
      changedVoxelCount++;
      const key=`${from}:${to}`;
      transitionCounts.set(key,(transitionCounts.get(key)??0)+1);
    }
  }
  const targetStructures=[...targetIds].sort((a,b)=>a-b).map(id=>({id,name:labelNames.get(id)??`ラベル ${id}`}));
  const transitions=[...transitionCounts].map(([key,voxels])=>{
    const[from,to]=key.split(":").map(Number);
    return{from,to,voxels};
  }).sort((a,b)=>a.from-b.from||a.to-b.to);
  const sliceRanges:PatchSliceRange[]=zValues.length?[{plane:"horizontal",axis:"Z",min:Math.min(...zValues),max:Math.max(...zValues)}]:[];
  return{
    format:"brain-practical-segmentation-patch",version:1,
    sourceImage:CANONICAL_SOURCE_IMAGE,
    sourceLabels:CANONICAL_SOURCE_LABELS,
    sourceLabelsSha256:input.sourceLabelsSha256,dims,voxelSizeMm:[.5,.5,.5],primaryPlane:"horizontal",
    createdAt:input.createdAt,authorNote:input.authorNote.trim(),authorGitHub:input.authorGitHub.trim().replace(/^@/,""),
    targetSide:input.targetSide,evidence:input.evidence.trim(),confidence:input.confidence,
    workflowMetadataVersion:1,targetStructures,sliceRanges,
    changeSummary:{changedVoxelCount,unchangedVoxelCount,transitions},
    review:{decision:"unreviewed",reviewer:null,decidedAt:null,reason:"",pullRequest:null},reviewStatus:"unreviewed",
    editCount:edits.size,runs:toRuns(edits),
  };
}
