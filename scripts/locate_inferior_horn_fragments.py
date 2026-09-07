"""Locate cropped fragments in the complete label, without joining or deleting."""
import json
import numpy as np
from scipy import ndimage
from scipy.spatial import cKDTree
from diagnose_inferior_horn_sampling import SHA
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume
from stage_third_ventricle_core_repair import digest


def fragment_records(mask, lo, complete, connectivity):
    structure=ndimage.generate_binary_structure(3,connectivity)
    local,n=ndimage.label(mask,structure)
    global_cc,_=ndimage.label(complete,structure)
    sizes=np.bincount(global_cc.ravel())
    local_sizes=np.bincount(local.ravel()); local_sizes[0]=0
    largest=int(local_sizes.argmax())
    main_points=np.argwhere(local==largest)+lo
    tree=cKDTree(main_points)
    records=[]
    for ident in range(1,n+1):
        p=np.argwhere(local==ident); xyz=p+lo
        parents=np.unique(global_cc[tuple(xyz.T)])
        if len(parents)!=1 or parents[0]==0: raise ValueError('Invalid component mapping')
        parent=int(parents[0]); distances,indices=tree.query(xyz)
        k=int(np.argmin(distances))
        faces=[f'{axis}-{side}' for d,axis in enumerate('xyz') for side,bound in [('min',0),('max',mask.shape[d]-1)] if np.any(p[:,d]==bound)]
        records.append(dict(component=ident,count=len(p),min=xyz.min(0).tolist(),max=xyz.max(0).tolist(),
                            completeComponent=parent,completeComponentCount=int(sizes[parent]),cropFaces=faces,
                            nearestMainDistanceMm=float(distances[k]*.5),nearestPoint=xyz[k].tolist(),
                            nearestMainPoint=main_points[int(indices[k])].tolist(),isLargest=ident==largest))
    for r in records:
        r['otherCropComponentsInSameCompleteComponent']=[q['component'] for q in records if q['completeComponent']==r['completeComponent'] and q['component']!=r['component']]
    return records


def main():
    work=ROOT/'work/anatomy-review'; out=work/'inferior-horn-fragment-locations-v1.json'
    if out.exists(): raise ValueError('Preserve evidence')
    source=work/'inferior-horn-sampling-v1.json'; source_bytes=source.read_bytes(); sampling=json.loads(source_bytes)
    if sampling['labelSha256']!=SHA: raise ValueError('Baseline changed')
    _,_,labels=read_browser_volume(DEFAULT_LABELS,MAGIC_LABELS,SHA)
    lo=np.asarray(sampling['cropAppXYZ']['min']); hi=np.asarray(sampling['cropAppXYZ']['maxExclusive'])
    complete=labels==24; mask=complete[tuple(slice(int(a),int(b)) for a,b in zip(lo,hi))]
    groups={name:fragment_records(mask,lo,complete,c) for name,c in [('six',1),('twentySix',3)]}
    report=dict(labelSha256=SHA,samplingReportSha256=digest(source_bytes),cropAppXYZ=sampling['cropAppXYZ'],groups=groups,
                mutation=False,limitation='Nearest endpoints locate gaps only; a straight line is not a proposed tract or cavity repair. Same global component proves connection in the label outside the crop, not anatomical validity. Cropped ID24 is not automatically all temporal horn.')
    out.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({name:[r for r in records if r['count']>=7] for name,records in groups.items()},indent=2))


if __name__=='__main__':main()
