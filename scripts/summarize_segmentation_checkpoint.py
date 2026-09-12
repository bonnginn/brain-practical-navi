"""Read-only endpoint comparison; counts are changes, not validated anatomy."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from build_orthogonal_review_bundle import ROOT, MAGIC_LABELS, read_browser_volume


def summarize(before, after):
    if (before.shape!=after.shape or before.ndim!=3 or before.dtype!=np.uint8
            or after.dtype!=np.uint8 or not before.size):
        raise ValueError('Expected equal nonempty uint8 XYZ grids')
    changed=before!=after
    encoded=before[changed].astype(np.uint16)*256+after[changed]
    pairs,counts=np.unique(encoded,return_counts=True)
    transitions=[dict(before=int(k//256),after=int(k%256),count=int(n)) for k,n in zip(pairs,counts)]
    previous=np.bincount(before.ravel(),minlength=256)
    current=np.bincount(after.ravel(),minlength=256)
    labels=[dict(id=int(k),before=int(previous[k]),after=int(current[k]),net=int(current[k]-previous[k]))
            for k in np.flatnonzero(previous+current)]
    return dict(gridShapeXYZ=list(before.shape),voxelCount=int(before.size),
                changedVoxels=int(changed.sum()),transitions=transitions,labels=labels,
                mutation=False,anatomicalValidation=False,
                limitation='Endpoint differences, not cumulative edit events, error counts or percent completion. '
                'Unchanged labels have not been revalidated. Refer to individual image-review/adoption records.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--baseline',required=True,type=Path)
    parser.add_argument('--baseline-sha',required=True)
    parser.add_argument('--current',required=True,type=Path)
    parser.add_argument('--current-sha',required=True)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args();output=args.output.resolve()
    if (not output.is_relative_to((ROOT/'work').resolve()) or output.suffix!='.json'
            or output.exists() or output in [args.baseline.resolve(),args.current.resolve()]):
        raise ValueError('A fresh JSON inside work is required; inputs are read-only')
    _,_,before=read_browser_volume(args.baseline,MAGIC_LABELS,args.baseline_sha)
    _,_,after=read_browser_volume(args.current,MAGIC_LABELS,args.current_sha)
    report=dict(baselineSha256=args.baseline_sha,currentSha256=args.current_sha,
                baselinePath=args.baseline.resolve().relative_to(ROOT).as_posix(),
                currentPath=args.current.resolve().relative_to(ROOT).as_posix(),**summarize(before,after))
    payload=(json.dumps(report,indent=2)+'\n').encode('utf-8')
    output.parent.mkdir(parents=True,exist_ok=True)
    with output.open('xb') as handle:handle.write(payload)
    print(json.dumps(dict(changedVoxels=report['changedVoxels'],transitions=report['transitions'],
                         reportSha256=hashlib.sha256(payload).hexdigest())))


if __name__=='__main__':main()
