"""Read-only crop-sensitivity experiment; threshold support is not anatomy."""
import json
import argparse
from pathlib import Path
from audit_inferior_horn_cavity_grid import weighted_support_record
import numpy as np
from explore_lateral_residual116_cavity import (
    LOW, HIGH, SEED, SOURCE, IMAGE_NAME, IMAGE_SHA, ROOT,
    load_identity_minc, connected_trial, support_record,
    DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, digest,
)

SHA = '3849b1bd3c9ccf6d68b8864644c7ac784cba00dceaa006ec4be329f3d217fa29'


def compare_masks(inner, outer, offset):
    offset = np.asarray(offset, dtype=int)
    if inner.ndim != 3 or outer.ndim != 3 or np.any(offset < 0) or np.any(offset + inner.shape > outer.shape):
        raise ValueError('Nested crop required')
    overlap = outer[tuple(slice(int(a), int(a+b)) for a,b in zip(offset, inner.shape))]
    return dict(lostInsideOldCrop=int((inner & ~overlap).sum()),
                addedInsideOldCrop=int((~inner & overlap).sum()),
                addedOutsideOldCrop=int(outer.sum()-overlap.sum()))


def main(source_report=None, report_sha=None, labels_sha=None, output=None):
    supplied=[source_report,report_sha,labels_sha,output]
    if any(supplied) and not all(supplied):raise ValueError('Provide source report, its SHA, label SHA and output together')
    base_low,base_high,seed=LOW,HIGH,SEED
    current_sha=SHA
    if source_report:
        data=Path(source_report).read_bytes()
        if digest(data)!=report_sha:raise ValueError('Source report changed')
        source=json.loads(data)
        if source['sourceSha256']!=IMAGE_SHA:raise ValueError('Different source image')
        base_low=np.array(source['cropNativeXYZ']['low']);base_high=np.array(source['cropNativeXYZ']['highExclusive'])
        seed=np.array(source['seedNativeXYZ']);current_sha=labels_sha
        if any(p.shape!=(3,) or p.dtype.kind not in 'iu' for p in (base_low,base_high,seed)):
            raise ValueError('Invalid crop geometry')
    out = Path(output) if output else ROOT/'work/anatomy-review/lateral-cavity-crop-extent-v1.json'
    if out.exists():
        raise ValueError('Preserve prior evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, current_sha)
    raw, start, step, history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    geo = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text(encoding='utf-8'))
    affine = np.asarray(geo['affine']); origin = affine[:3,3]; spacing = np.diag(affine)[:3]
    if not np.allclose(affine[:3,:3], np.diag(spacing)) or np.any(spacing <= 0) or np.any(step <= 0):
        raise ValueError('Unsupported geometry')
    results = []; baseline = {}
    for margin in [0, 8, 16]:
        low = base_low-margin; high = base_high+margin
        if np.any(low < 0) or np.any(high > raw.shape):
            raise ValueError('Crop outside source')
        crop = raw[tuple(slice(a,b) for a,b in zip(low,high))]
        for threshold in [64500, 65000, 65400]:
            mask, faces = connected_trial(crop, seed-low, threshold)
            if margin == 0:
                baseline[threshold] = mask
            mapping = np.unique(np.rint(((np.argwhere(mask)+low)*step+start-origin)/spacing).astype(int), axis=0)
            records = []
            for p in mapping:
                if np.any(p < 0) or np.any(p >= labels.shape):
                    raise ValueError('Mapping outside application')
                center=(p*spacing+origin-start)/step
                support = support_record(center, spacing/step, mask, low)
                if source_report:support.update(weighted_support_record(center,spacing/step,mask,low))
                records.append(dict(xyz=p.tolist(), currentLabel=int(labels[tuple(p)]), **support))
            candidates = [r['xyz'] for r in records if r['currentLabel']==0 and r['fullySupported']]
            comparison = compare_masks(baseline[threshold], mask, base_low-low)
            if comparison['lostInsideOldCrop']:
                raise ValueError('Connected component lost under nested expansion')
            row = dict(margin=margin, threshold=threshold, low=low.tolist(), highExclusive=high.tolist(),
                       sourceCount=int(mask.sum()), cropFaceContacts=faces, comparison=comparison,
                       mappedCount=len(records), candidateAppXYZ=candidates, records=records)
            results.append(row)
            if source_report:
                row['majorityCandidateAppXYZ']=[r['xyz'] for r in records if r['currentLabel']==0 and not r['touchesCropFace'] and r['outsideCropCells']==0 and r['weightedSupportFraction']>=.5]
            print(json.dumps({k:row[k] for k in ['margin','threshold','sourceCount','cropFaceContacts','comparison']} | {'candidateCount':len(candidates)}), flush=True)
    result = dict(labelSha256=current_sha, sourceSha256=IMAGE_SHA, sourceHistory=history, seedNativeXYZ=seed.tolist(),
                  results=results, mutation=False, adopted=False, visualReviewPending=True,
                  limitation='Nested bounded threshold experiment only. Expansion may include cisterns, bright tissue or artifacts. No automatic filling; candidate geometry needs contiguous orthogonal image review.')
    out.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print('reportSha256='+digest(out.read_bytes()))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-report');parser.add_argument('--report-sha')
    parser.add_argument('--labels-sha');parser.add_argument('--output')
    args=parser.parse_args()
    main(args.source_report,args.report_sha,args.labels_sha,args.output)
