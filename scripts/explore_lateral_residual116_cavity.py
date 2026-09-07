"""Bounded raw300 cavity locator around retained 116 points; never adopt."""
import json
import argparse
import re
import numpy as np
from PIL import Image, ImageDraw
from explore_inferior_horn_cavity import connected_trial
from audit_inferior_horn_cavity_grid import support_record, weighted_support_record
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _outline
from build_registered_manual_candidate import nearest_labels
from stage_lateral_detached547 import digest

SHA = 'a512880c4dcd1b1291664f8ee4aaa3bd8d609b62dd2e037634953cd7ebd12efd'
LOW = np.array([398,399,164])
HIGH = np.array([434,424,197])
SEED = np.array([415,410,184])


def main(left_lower=False, *, region=None, locator_threshold=65000):
    if type(locator_threshold) is not int or locator_threshold not in (64500,65000,65400):
        raise ValueError('Unsupported locator threshold')
    if region is None and locator_threshold != 65000:
        raise ValueError('Threshold variants require a distinct regional evidence prefix')
    label_id = 23 if left_lower else 24
    label_sha = 'a2ceb2649ec0950eb7ba0620f38db9f8fc83293ad46bb2b7fcce82091360a6c5' if left_lower else SHA
    low = np.array([190,375,130]) if left_lower else LOW
    high = np.array([252,443,203]) if left_lower else HIGH
    seed = np.array([209,410,175]) if left_lower else SEED
    views = [(0,[205,220,238]),(1,[390,410,430]),(2,[145,165,185])] if left_lower else [(0,[404,414,424]),(1,[404,410,418]),(2,[172,182,190])]
    out = ROOT/('work/anatomy-review/left-lower-cavity-exploration-v1' if left_lower else 'work/anatomy-review/lateral-residual116-cavity-exploration-v1')
    if region is not None:
        if left_lower or set(region)!={'labelId','labelsSha256','low','highExclusive','seed','prefix'}:
            raise ValueError('Invalid regional configuration')
        label_id=region['labelId'];label_sha=region['labelsSha256']
        low=np.asarray(region['low']);high=np.asarray(region['highExclusive']);seed=np.asarray(region['seed'])
        if (type(label_id) is not int or label_id not in (23,24)
                or not re.fullmatch(r'[0-9a-f]{64}',label_sha)
                or not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*',region['prefix'])
                or any(p.shape!=(3,) or p.dtype.kind not in 'iu' for p in (low,high,seed))
                or np.any(low<0) or np.any(high<=low) or np.any(seed<low) or np.any(seed>=high)):
            raise ValueError('Invalid regional geometry or identity')
        views=[(axis,sorted(set(int(low[axis]+(high[axis]-low[axis]-1)*f) for f in (.25,.5,.75)))) for axis in range(3)]
        out=ROOT/f"work/anatomy-review/{region['prefix']}-exploration-v1"
    if out.exists():
        raise ValueError('Preserve evidence')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, label_sha)
    raw, start, step, history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    if np.any(high>raw.shape):raise ValueError('Crop outside original image')
    crop = raw[tuple(slice(a,b) for a,b in zip(low,high))]
    trials = {}
    for threshold in [64500,65000,65400]:
        trial, faces = connected_trial(crop, seed-low, threshold)
        trials[str(threshold)] = dict(count=int(trial.sum()), cropFaceContacts=faces)
    mask, _ = connected_trial(crop, seed-low, locator_threshold)
    geo = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine = np.array(geo['affine']); origin = affine[:3,3]; spacing = np.diag(affine)[:3]
    if not np.allclose(affine[:3,:3], np.diag(spacing)) or np.any(spacing<=0) or np.any(step<=0):
        raise ValueError('Unsupported geometry')
    mapped = np.unique(np.rint(((np.argwhere(mask)+low)*step+start-origin)/spacing).astype(int),axis=0)
    records = []
    for p in mapped:
        if np.any(p<0) or np.any(p>=labels.shape):
            raise ValueError('Outside application grid')
        support = support_record((p*spacing+origin-start)/step,spacing/step,mask,low)
        if region is not None:
            support.update(weighted_support_record((p*spacing+origin-start)/step,spacing/step,mask,low))
        records.append(dict(xyz=p.tolist(),currentLabel=int(labels[tuple(p)]),**support))
    candidates = [r['xyz'] for r in records if r['fullySupported'] and r['currentLabel']==0]
    grid = np.indices(crop.shape).reshape(3,-1).T+low
    projected = nearest_labels(labels,grid*step+start,origin,spacing).reshape(crop.shape)
    gray = encode_image(crop,geo['intensityWindow'])
    out.mkdir(); figures = []
    for axis, indices in views:
        for index in indices:
            p = np.take(gray,index-low[axis],axis=axis).T[::-1]
            m = np.take(mask,index-low[axis],axis=axis).T[::-1]
            lab = np.take(projected,index-low[axis],axis=axis).T[::-1]
            rgb = np.repeat(p[:,:,None],3,axis=2); overlay = rgb.copy()
            overlay[m] = np.rint(.6*rgb[m]+.4*np.array([0,170,255])).astype(np.uint8)
            overlay[_outline(lab==label_id)] = [255,60,90]
            h,w = p.shape; scale = 6
            panel = Image.new('RGB',(max(660,w*scale*2+12),h*scale+52),'#181818')
            ImageDraw.Draw(panel).text((4,3),f'Original300 {"XYZ"[axis]}{index}: raw LEFT / threshold locator BLUE RIGHT\nRED existing ID{label_id}. UNADOPTED: bright tissue/artifact/crop leakage possible.\nSparse locator views, not full candidate-boundary review.',fill='white')
            for col,picture in enumerate([rgb,overlay]):
                panel.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),52))
            path = out/f'{"xyz"[axis]}-{index}.png'; panel.save(path)
            figures.append(dict(path=path.name,axis='xyz'[axis],index=index,sha256=digest(path.read_bytes())))
    report = dict(labelSha256=label_sha,sourceSha256=IMAGE_SHA,sourceHistory=history,
                  cropNativeXYZ=dict(low=low.tolist(),highExclusive=high.tolist()),seedNativeXYZ=seed.tolist(),
                  seedRawValue=int(raw[tuple(seed)]),locatorThreshold=locator_threshold,trials=trials,records=records,candidateAppXYZ=candidates,
                  figures=figures,mutation=False,adopted=False,visualReviewPending=True,
                  limitation='Threshold locator only. Finite-cell support excludes crop faces but does not establish anatomy; all candidate boundaries require separate raw contiguous orthogonal review.')
    if region is not None:
        report['majorityCandidateAppXYZ']=[r['xyz'] for r in records if r['currentLabel']==0
            and r['weightedSupportFraction']>=.5 and not r['touchesCropFace'] and not r['outsideCropCells']]
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(dict(trials=trials,mapped=len(records),finiteCandidates=len(candidates))))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--left-lower', action='store_true')
    main(parser.parse_args().left_lower)
