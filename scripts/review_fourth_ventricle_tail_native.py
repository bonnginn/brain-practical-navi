"""Read-only registered300 context for fourth-ventricle inferior extent."""
import json
import argparse
import hashlib
import numpy as np
from PIL import Image, ImageDraw
from audit_manual_label_space import SOURCE, load_identity_minc
from render_registered_manual_fine_review import IMAGE_NAME, IMAGE_SHA, encode_image
from build_orthogonal_review_bundle import ROOT, DEFAULT_LABELS, MAGIC_LABELS, read_browser_volume, _oriented_crop, _outline
from build_registered_manual_candidate import nearest_labels

LABEL_SHA = '9bc51ab0b0f6932871a93a0d225491ed0649ef827012a7db41d3f3e049b166a8'


def main(wall_series=False, candidate_overlay=False, paired_holes=False, anterior_next=False):
    out = ROOT/'work/anatomy-review/fourth-ventricle-tail-native-v1'
    if wall_series:
        out = ROOT/'work/anatomy-review/fourth-ventricle-wall-series-v1'
    if candidate_overlay:
        out = ROOT/'work/anatomy-review/fourth-ventricle-wall-extended-native-v1'
    if paired_holes:
        candidate_overlay = True
        out = ROOT/'work/anatomy-review/fourth-ventricle-paired-holes-native-v1'
    label_sha = LABEL_SHA
    if anterior_next:
        candidate_overlay = True
        label_sha = 'e98cd4060d735c732a5fd75030be2f701f57fe91b6cd5b9a12c65e1cb68b37e3'
        out = ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-native-v1'
    if out.exists():
        raise ValueError('Evidence exists')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, label_sha)
    raw, start, step, history = load_identity_minc(SOURCE/IMAGE_NAME, IMAGE_SHA)
    geometry = json.loads((ROOT/'public/atlas/bigbrain-icbm500-validation.json').read_text())
    affine = np.asarray(geometry['affine']); origin = affine[:3,3]; spacing = np.diag(affine)[:3]
    low = np.floor((np.array([170,140,35])*spacing+origin-start)/step).astype(int)
    high = np.ceil((np.array([222,215,120])*spacing+origin-start)/step).astype(int)+1
    if np.any(low<0) or np.any(high>raw.shape):
        raise ValueError('Crop outside source')
    shape=high-low; grid=np.indices(shape).reshape(3,-1).T+low
    projected=nearest_labels(labels,grid*step+start,origin,spacing).reshape(shape)
    candidate_sha = None
    proposed = np.zeros(shape, dtype=bool)
    if candidate_overlay:
        path = ROOT/'work/anatomy-review/fourth-ventricle-wall-extended-candidate-v1/candidate.json'
        expected_sha = '7151723811e2d39e7b6b2ccb2c053c5edbfa814aa5956574a2bdcdb4b4a71e9f'
        expected_count = 108
        if anterior_next:
            path = ROOT/'work/anatomy-review/fourth-ventricle-anterior-next-candidate-v1/candidate.json'
            expected_sha = 'adcbfe9bc10bf811af0eb5ec005f43cfb803370f1f12ee1070ffc58561ff85b1'
            expected_count = 105
        candidate_sha = hashlib.sha256(path.read_bytes()).hexdigest()
        if candidate_sha != expected_sha:
            raise ValueError('Candidate evidence changed')
        candidate = json.loads(path.read_text(encoding='utf-8'))
        points = np.asarray([r['xyz'] for r in candidate['records'] if r['selected']], dtype=int)
        if points.shape != (expected_count, 3) or candidate['inputCompressedSha256'] != label_sha or np.any(labels[tuple(points.T)] != 0):
            raise ValueError('Candidate source mismatch')
        # Project only the finite candidate; never grow it into nearby bright tissue.
        candidate_mask = np.zeros(labels.shape, dtype=np.uint8)
        candidate_mask[tuple(points.T)] = 1
        proposed = nearest_labels(candidate_mask,grid*step+start,origin,spacing).reshape(shape).astype(bool)
    gray=encode_image(raw[tuple(slice(a,b) for a,b in zip(low,high))],geometry['intensityWindow'])
    crop=dict(min=[0,0,0],max=(shape-1).tolist()); figures=[]
    out.mkdir()
    groups = [('x',194),('x',196),('x',198),('y',170),('y',180),('z',54),('z',60),('z',66)]
    if wall_series:
        # Native contiguous runs around the main cavity; not acceptance bounds.
        groups = [(axis, center) for axis, centers in [('y', range(295,307,3)), ('z', range(126,138,3))] for center in centers]
    if candidate_overlay:
        groups = [('x',182),('x',196),('x',208),('y',170),('y',177),('y',182),('z',70),('z',75)]
    if paired_holes:
        groups = [('x',188),('x',204),('y',182),('y',184),('z',71),('z',73)]
    if anterior_next:
        # Complete contiguous native planes intersecting candidate extent plus
        # one outside plane on either side, not only representative centres.
        candidate_lo = np.floor(((points.min(axis=0)-.5)*spacing+origin-start)/step).astype(int)-1
        candidate_hi = np.ceil(((points.max(axis=0)+.5)*spacing+origin-start)/step).astype(int)+1
        groups = [(axis, (a,b)) for dim,axis in enumerate('xyz')
                  for a in range(int(candidate_lo[dim]),int(candidate_hi[dim])+1,3)
                  for b in [min(a+2,int(candidate_hi[dim]))]]
    for axis, app_index in groups:
        dim='xyz'.index(axis)
        if anterior_next:
            indices = list(range(app_index[0],app_index[1]+1))
        else:
            center=app_index if wall_series else int(np.rint((app_index*spacing[dim]+origin[dim]-start[dim])/step[dim]))
            indices = list(range(center-1,center+2))
        rows=[]
        for index in indices:
            plane=_oriented_crop(gray,axis,index-int(low[dim]),crop)
            lab=_oriented_crop(projected,axis,index-int(low[dim]),crop)
            rgb=np.repeat(plane[:,:,None],3,axis=2)
            rgb[_outline(lab==26)]=[255,60,90]
            if candidate_overlay:
                rgb[_oriented_crop(proposed,axis,index-int(low[dim]),crop)] = [255,220,0]
            h,w=plane.shape; scale=3
            row=Image.new('RGB',(max(780,2*w*scale+12),h*scale+42),'#181818')
            d=ImageDraw.Draw(row)
            location = 'native continuous series' if wall_series or anterior_next else f'app vicinity {app_index}'
            d.text((4,3),f'Registered300 {axis.upper()}{index} ({location}): raw / current label',fill='white')
            d.text((4,22),f'Red = existing ID26; yellow = unadopted {expected_count}-voxel candidate.' if candidate_overlay else 'Red = existing fourth ventricle. No proposed boundary or mutation.',fill='white')
            for col,picture in enumerate([np.repeat(plane[:,:,None],3,axis=2),rgb]):
                row.paste(Image.fromarray(picture).resize((w*scale,h*scale),Image.Resampling.NEAREST),(col*(w*scale+12),42))
            rows.append(row)
        sheet=Image.new('RGB',(rows[0].width,sum(r.height for r in rows))); offset=0
        for row in rows:
            sheet.paste(row,(0,offset));offset+=row.height
        suffix = str(indices[0]) if anterior_next else str(app_index)
        path=out/f'{axis}-{suffix}.png';sheet.save(path)
        figures.append(dict(path=path.name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),axis=axis,nativeIndices=indices))
    plane_count = sum(len(f['nativeIndices']) for f in figures)
    (out/'report.json').write_text(json.dumps(dict(inputSha256=label_sha,source300Sha256=IMAGE_SHA,
        cropExclusive=dict(low=low.tolist(),high=high.tolist()),history=history,figures=figures,
        mutation=False,generatedPlanes=plane_count,wallSeries=wall_series,anteriorNext=anterior_next,candidateSha256=candidate_sha,visualReviewPending=True,
        limitation='Registered/resampled 300um source, not native20um or an expert boundary. Initial inferior-context sampling only.'),indent=2)+'\n',encoding='utf-8')
    print(f'Generated {len(groups)} sheets / {plane_count} registered300 planes; review pending.')


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--wall-series',action='store_true')
    parser.add_argument('--candidate-overlay',action='store_true')
    parser.add_argument('--paired-holes',action='store_true')
    parser.add_argument('--anterior-next',action='store_true')
    args = parser.parse_args()
    if sum([args.wall_series,args.candidate_overlay,args.paired_holes,args.anterior_next]) > 1:
        parser.error('Choose one review mode')
    main(args.wall_series,args.candidate_overlay,args.paired_holes,args.anterior_next)
