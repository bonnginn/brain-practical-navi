"""Work-only anterior column extension, stopped by source support or nonzero tissue labels."""
import gzip
import hashlib
import json
import re
import itertools
from pathlib import Path
import numpy as np
from audit_cerebellar_finite_support import support_corner_minima
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA

ROOT=Path(__file__).resolve().parents[1]
SHA='aa3b649e0d43cc1ccefb095d58d0bba98578657ce812256257694a200caff442'


def main(*, source_sha=SHA, prefix='fourth-anterior-depth-aa3b-v2', through_brainstem=False, posterior_upper=False, majority_fraction=None):
    if majority_fraction is not None and (type(majority_fraction) not in (int,float) or not .5<=majority_fraction<=1):raise ValueError('Invalid sampling fraction')
    if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',prefix):raise ValueError('Invalid output name')
    if not re.fullmatch(r'[a-f0-9]{64}',source_sha):raise ValueError('Explicit source SHA required')
    path=ROOT/f'work/anatomy-review/{prefix}.json'
    if path.exists():raise ValueError('Preserve prior exploration')
    compressed=(ROOT/'public/atlas/bigbrain-practical-segmentation-icbm500.bin.gz').read_bytes()
    if hashlib.sha256(compressed).hexdigest()!=source_sha:raise ValueError('Unexpected source')
    labels=np.frombuffer(gzip.decompress(compressed),np.uint8,offset=10).reshape((394,466,378),order='F')
    raw,start,step,history=load_identity_minc(SOURCE/IMAGE_NAME,IMAGE_SHA)
    affine=np.array(json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())['affine'])
    origin=affine[:3,3];spacing=np.diag(affine)[:3]
    columns=[]; points=[]; blockers=[]
    for x in range(179,213):
        for z in range(85 if posterior_upper else 59,98):
            occupied=np.flatnonzero(labels[x,:,z]==26)
            if not len(occupied):continue
            direction=-1 if posterior_upper else 1
            first=int(occupied.min())-1 if posterior_upper else int(occupied.max())+1
            # Twelve cells is an exploration guard, not an anatomical endpoint.
            rows=[]
            ys=range(first,max(first-12,-1),-1) if posterior_upper else range(first,min(first+12,labels.shape[1]))
            for y in ys:
                if labels[x,y,z] not in ((0,27) if through_brainstem else (0,)):
                    blockers.append(dict(xyz=[x,y,z],label=int(labels[x,y,z]),distanceFromExisting=abs(y-first)+1))
                    break
                rows.append([x,y,z])
            if rows:
                columns.append(dict(x=x,z=z,firstY=first,offset=len(points),length=len(rows),direction=direction))
                points.extend(rows)
    xyz=np.array(points)
    minima=support_corner_minima(raw,((xyz-.5)*spacing+origin-start)/step,((xyz+.5)*spacing+origin-start)/step)
    fractions=None
    if majority_fraction is not None:
        from scipy.ndimage import map_coordinates
        offsets=np.array(list(itertools.product(np.linspace(-.5,.5,5),repeat=3)))
        coords=((xyz[:,None,:]+offsets)*spacing+origin-start)/step
        lo=np.floor(coords.min((0,1))).astype(int);hi=np.ceil(coords.max((0,1))).astype(int)+1
        if np.any(lo<0) or np.any(hi>raw.shape):raise ValueError('Sampling outside source')
        local=raw[tuple(slice(a,b) for a,b in zip(lo,hi))].astype(np.float32)
        values=map_coordinates(local,(coords-lo).reshape(-1,3).T,order=1,prefilter=False).reshape(len(xyz),-1)
        fractions=(values>=65000).mean(1)
    accepted=[];details=[]
    for column in columns:
        rows=points[column['offset']:column['offset']+column['length']]
        values=minima[column['offset']:column['offset']+column['length']]
        count=0
        column_fractions=None if fractions is None else fractions[column['offset']:column['offset']+column['length']]
        for index,(point,value) in enumerate(zip(rows,values)):
            if (value<65000 if column_fractions is None else column_fractions[index]<majority_fraction):break
            accepted.append(point);count+=1
        details.append(dict(**column,acceptedCount=count,supportMinima=[int(v) for v in values],
            guardReached=count==12))
        if column_fractions is not None:details[-1]['sampledFractions']=column_fractions.tolist()
    if blockers:
        blocked_xyz=np.array([r['xyz'] for r in blockers])
        blocked_minima=support_corner_minima(raw,((blocked_xyz-.5)*spacing+origin-start)/step,((blocked_xyz+.5)*spacing+origin-start)/step)
        for row,value in zip(blockers,blocked_minima):row['supportMinimum']=int(value)
    report=dict(sourceSha256=source_sha,originalSha256=IMAGE_SHA,sourceHistory=history,
        threshold=65000,points=accepted,columns=details,considered=len(points),count=len(accepted),
        nonzeroStops=blockers,strongSupportNonzeroStops=[r for r in blockers if r['supportMinimum']>=65000],
        guardReached=sum(r['guardReached'] for r in details),adopted=False,expertReviewed=False,labelMutation=False,
        limitation='Directional candidate search only. Existing anterior label edge is a seed, not ground truth. No posterior/external flood fill. Twelve-cell cap, unseeded columns and source partial-volume effects limit completeness. Image review required before adoption.')
    if through_brainstem:
        report['candidateChanges']=[dict(xyz=p,before=int(labels[tuple(p)]),after=26) for p in accepted]
        report['allowedSourceLabels']=[0,27]
        report['limitation']+=' Brainstem cells are examined without skipping an intervening low-support cell. Nonzero label passage is candidate discovery, not permission to overwrite.'
    if posterior_upper:
        report['direction']='posterior';report['zRangeInclusive']=[85,97]
        report['limitation']='Upper posterior direction only, starting at existing26 minimum Y for each X/Z column. Z85–97 bounds reflect the reviewed upper-cavity region, not an approved boundary. Stops on non-allowed labels or failed source support. The caudal open region is excluded. No claim of complete cavity coverage; image review required.'
    if majority_fraction is not None:
        report['samplingFractionThreshold']=majority_fraction
        report['sampleOffsetsVoxel']=offsets.tolist()
        report['limitation']+=' Partial-volume comparison uses the fraction of 125 trilinear samples >=65000, not a rigorous tissue-volume fraction or proof of cavity identity. Candidate generation only; minimum-support and image evidence must remain available.'
    with path.open('x',encoding='utf-8') as stream:json.dump(report,stream,indent=2);stream.write('\n')
    print(json.dumps({k:report[k] for k in ['considered','count','guardReached','adopted']}))
    print(hashlib.sha256(path.read_bytes()).hexdigest())


if __name__=='__main__':main()
