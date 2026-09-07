"""Explain every changed context voxel of the 867-point work-only repair."""
import json
import argparse
import numpy as np
from scipy import ndimage
import build_specimen_blocks as blocks
from build_orthogonal_review_bundle import ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS, EXPECTED_IMAGE_SHA256, read_browser_volume
from stage_lateral_fringe_repair import replay, digest


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inferior-horn',action='store_true')
    parser.add_argument('--residual-51',action='store_true')
    parser.add_argument('--residual-27',action='store_true')
    parser.add_argument('--partial19',action='store_true')
    args=parser.parse_args()
    if sum([args.inferior_horn,args.residual_51,args.residual_27,args.partial19])>1:parser.error('Choose one repair')
    work=ROOT/'work/anatomy-review'; stage=work/'lateral-fringe-medium-stage-v1'
    out=work/'lateral-fringe-medium-context-v1.json'
    expected_sha='0a0eb1962cdd19991b951cd0b0a957d57b90118c746fb7ef29c48c0301ca7ab5'
    specs=[('lateral-ventricle',147,11,(24,)),('commissural-system',8,13,(23,24)),('choroid-plexus',114,8.5,(24,))]
    if args.inferior_horn:
        stage=work/'inferior-horn-cavity-stage-v1';out=work/'inferior-horn-cavity-context-v1.json'
        expected_sha='470b0b86c0183416f2e5c308d10ce76e6ed797b5b64c49052819ccccecb06b50'
        specs=[('lateral-ventricle',55,11,(24,)),('radiations',5,None,(24,)),('choroid-plexus',1,8.5,(24,)),('medial-temporal',3,None,(24,))]
    if args.residual_51:
        stage=work/'inferior-horn-residual-51-stage-v1';out=work/'inferior-horn-residual-51-context-v1.json'
        expected_sha='4401e414aa3e940e3991b0e631215af27415dd221a60c41e4d1b8f10c33b34e1'
        specs=[('lateral-ventricle',129,11,(24,)),('choroid-plexus',125,8.5,(24,)),('medial-temporal',5,None,(24,))]
    if args.residual_27:
        stage=work/'inferior-horn-residual-27-stage-v1';out=work/'inferior-horn-residual-27-context-v1.json'
        expected_sha='6cfb2c826aab3efc0cc69f1d03b4a13d7591ecd392ee3527a83c1a34da90f80f'
        specs=[('lateral-ventricle',997,11,(24,)),('choroid-plexus',523,8.5,(24,))]
    if args.partial19:
        stage=work/'inferior-horn-partial19-stage-v1';out=work/'inferior-horn-partial19-context-v1.json'
        expected_sha='7075358385037d381b17207d786939dcf3ea0b6dc765948357ba1689563fd021'
        specs=[('lateral-ventricle',7,11,(24,)),('choroid-plexus',5,8.5,(24,)),('medial-temporal',1,None,(24,))]
    if out.exists(): raise ValueError('Preserve evidence')
    record_bytes=(stage/'repair.json').read_bytes()
    if digest(record_bytes)!=expected_sha: raise ValueError('Stage changed')
    record=json.loads(record_bytes)
    _,_,old=read_browser_volume(stage/'base.bin.gz',MAGIC_LABELS,record['inputCompressedSha256'])
    _,_,new=read_browser_volume(stage/'labels.bin.gz',MAGIC_LABELS,record['outputCompressedSha256'])
    if not np.array_equal(replay(old,record['points']),new) or not np.array_equal(replay(new,record['points'],True),old): raise ValueError('Replay differs')
    _,_,raw=read_browser_volume(DEFAULT_IMAGE,MAGIC_IMAGE,EXPECTED_IMAGE_SHA256)
    coarse=raw.transpose(2,1,0)[::2,::2,::2]
    labels=[v.transpose(2,1,0)[::2,::2,::2] for v in (old,new)]
    definitions=[blocks.specimen_definitions(coarse,v) for v in labels]
    changes=[]
    for block,expected,cutoff,targets in specs:
        distances=[ndimage.distance_transform_edt(~np.isin(v,targets))*blocks.GEOMETRY_SPACING_MM for v in labels]
        a,b=[next(p.mask for p in d[block] if p.key=='tissue') for d in definitions]
        coords=np.argwhere(a!=b)
        if len(coords)!=expected: raise ValueError('Unexpected context count')
        for p in coords:
            k=tuple(p); xyz=(p[::-1]*2).tolist(); fk=tuple(xyz)
            before,after=int(old[fk]),int(new[fk]); da,db=[float(d[k]) for d in distances]
            if a[k] and not b[k] and before==0 and after in (23,24):
                reason='new-ventricular-label-excluded-from-context'
            elif cutoff is not None and not a[k] and b[k] and before==after and da>cutoff>=db:
                reason='unchanged-tissue-enters-distance-cutoff'
            else: raise ValueError(f'Unexplained context {block} {xyz}')
            changes.append(dict(block=block,appXYZ=xyz,before=bool(a[k]),after=bool(b[k]),labelBefore=before,labelAfter=after,
                                raw500=int(raw[fk]),distanceBeforeMm=da,distanceAfterMm=db,cutoffMm=cutoff,reason=reason))
    result=dict(stageSha256=digest(record_bytes),sourceCodeSha256=digest((ROOT/'scripts/build_specimen_blocks.py').read_bytes()),
                changes=changes,unionReplayExact=True,reverseExact=True,installed=False,anatomyProvenByContext=False)
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(changes=len(changes),reasons={r:sum(c['reason']==r for c in changes) for r in set(c['reason'] for c in changes)})))


if __name__=='__main__': main()
