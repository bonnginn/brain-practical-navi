"""Locate the exact context-mask change caused by the second lateral repair."""
import json
import numpy as np
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import ROOT,DEFAULT_IMAGE,MAGIC_IMAGE,MAGIC_LABELS,EXPECTED_IMAGE_SHA256,read_browser_volume
from stage_third_ventricle_core_repair import digest


def main():
    work=ROOT/'work/anatomy-review';stage=work/'lateral-fringe-next-stage-v1'
    path=work/'lateral-fringe-next-support-v2.json'
    if path.exists():raise ValueError('Preserve evidence')
    if digest((stage/'repair.json').read_bytes())!='90fd67a9e526dd116e47f302f26d13efd3b3daf2a92fae65bbe518fef6072f15':raise ValueError('Stage changed')
    _,_,old=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,'83dcbdda59e86f393cc93b9d91ccd8f68c1fa08bc1156df99467fe3aef792567')
    _,_,new=read_browser_volume(stage/'labels.bin.gz',MAGIC_LABELS,'7c54fdd2e391ca3e1ed70f7e5fdead7be940d1007b891eb4bb4dd22d7407f0ef')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    coarse=raw.transpose(2,1,0)[::2,::2,::2]
    before=blocks.specimen_definitions(coarse,old.transpose(2,1,0)[::2,::2,::2])
    after=blocks.specimen_definitions(coarse,new.transpose(2,1,0)[::2,::2,::2])
    a=next(p.mask for p in before['choroid-plexus'] if p.key=='tissue')
    b=next(p.mask for p in after['choroid-plexus'] if p.key=='tissue')
    coords=np.argwhere(a!=b);changes=[]
    if len(coords)!=1:raise ValueError('Expected one support-mask change')
    for p in coords:
        xyz=(p[::-1]*2).tolist();key=tuple(xyz)
        distances=[]
        for labels in (old,new):
            right=np.argwhere(labels.transpose(2,1,0)[::2,::2,::2]==24)
            distances.append(float(np.sqrt(np.min(np.sum((right-p)**2,axis=1)))*blocks.GEOMETRY_SPACING_MM))
        if xyz!=[216,300,130] or int(old[key])!=8 or int(new[key])!=8 or bool(a[tuple(p)]) or not bool(b[tuple(p)]):raise ValueError('Unexpected context identity')
        if not distances[0]>8.5>=distances[1]:raise ValueError('Distance clipping does not explain change')
        changes.append(dict(coarseZYX=p.tolist(),appXYZ=xyz,before=bool(a[tuple(p)]),after=bool(b[tuple(p)]),labelBefore=int(old[key]),labelAfter=int(new[key]),raw500=int(raw[key]),distanceBeforeMm=distances[0],distanceAfterMm=distances[1],contextCutoffMm=8.5))
    result=dict(changes=changes,sourceCodeSha256=digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes()),installed=False,anatomicalBoundaryChange=False,
        interpretation='Context tissue depends on the segmented ventricular distance field and excludes ventricular labels. Inspect this mask change separately from the anatomical label repair.')
    path.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8');print(json.dumps(result))


if __name__=='__main__':main()
