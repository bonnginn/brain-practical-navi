"""Read-only source attribution of missing midbrain context (not a repair)."""
import hashlib
import argparse
import json
import numpy as np
import nibabel as nib
from nibabel.processing import resample_from_to
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_LABELS, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE,
    EXPECTED_LABELS_SHA256, EXPECTED_IMAGE_SHA256, read_browser_volume,
    _oriented_crop, _outline, PIXEL_TO_VOXEL_FIXED,
)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--lower-candidate', action='store_true', help='Render an unadopted lower-midbrain attribution experiment')
    args = parser.parse_args()
    path = ROOT/'work/segmentation-source-review/cerebra.nii.gz'
    payload = path.read_bytes()
    if hashlib.md5(payload).hexdigest() != '7b69ad2478c6be7de12bb5b254b4cb7c':
        raise ValueError('Unexpected source atlas')
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    grid_path = ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    grid = json.loads(grid_path.read_text(encoding='utf-8'))
    if tuple(grid['shape']) != labels.shape or raw.shape != labels.shape:
        raise ValueError('Inconsistent target grids')
    atlas = np.rint(np.asarray(resample_from_to(nib.load(path),
        (labels.shape, np.array(grid['affine'])), order=0).dataobj)).astype(np.uint8)
    # Attribution only: the mixed Ventral DC parcel is NOT a midbrain mask.
    source_brainstem = np.isin(atlas, [62, 11])
    source_dc = np.isin(atlas, [77, 26])
    out = ROOT/'work/anatomy-review/brainstem-source-extent-v1'
    out.mkdir(parents=True, exist_ok=True)
    crop = {'min':[145,160,75], 'max':[245,270,155]}
    planes = [('z',z) for z in [100,104,108,112,116,120,124,128,132,136]]
    planes += [('x',x) for x in [183,195,207]] + [('y',y) for y in [205,215,225,235]]
    report = dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=EXPECTED_LABELS_SHA256,
        atlasSha256=hashlib.sha256(payload).hexdigest(),
        gridMetadataSha256=hashlib.sha256(grid_path.read_bytes()).hexdigest(),
        pixelToVoxel=PIXEL_TO_VOXEL_FIXED, mutation=False, expertReviewed=False,
        note='Ventral DC shown for source attribution only; no proposed union or boundary adoption.',
        currentBrainstemOutsideAtlas=int(np.count_nonzero((labels==27)&~source_brainstem)),
        manualLabelAtlasCounts={}, sheets=[])
    if args.lower_candidate:
        from apply_segmentation_patch import _expected_workflow_metadata, validate_patch
        experiment = source_dc & (labels == 0) & (raw < 252)
        experiment[:,:,:102] = False
        experiment[:,:,113:] = False
        coords = np.argwhere(experiment)
        edits = sorted((int(np.ravel_multi_index(p,labels.shape,order='F')),27) for p in coords)
        if not edits:
            raise ValueError('Empty experiment')
        flat = labels.tobytes(order='F')
        runs = []
        for index,value in edits:
            if runs and runs[-1]['start']+runs[-1]['length']==index:
                runs[-1]['length'] += 1
            else:
                runs.append(dict(start=index,length=1,label=value))
        candidate = dict(format='brain-practical-segmentation-patch',version=1,
            sourceImage='/atlas/bigbrain-icbm500.bin.gz',
            sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
            sourceLabelsSha256=EXPECTED_LABELS_SHA256,dims=list(labels.shape),
            voxelSizeMm=[.5,.5,.5],primaryPlane='horizontal',authorGitHub='',
            authorNote='Source-attribution experiment only; coordinate-limited slab is not a complete anatomical boundary.',
            targetSide='bilateral',confidence='low',
            evidence='BRAINSTEM_SOURCE_EXTENT_REVIEW.md; experiment uses only currently unlabeled tissue within source Ventral DC at Z102-112. Must review every boundary before any adoption; not expert reviewed.',
            workflowMetadataVersion=1,reviewStatus='unreviewed',
            review=dict(decision='unreviewed',reviewer=None,decidedAt=None,reason='',pullRequest=None),
            editCount=len(edits),runs=runs,**_expected_workflow_metadata(edits,flat,labels.shape))
        candidate_path = out/'lower-candidate.json'
        candidate_path.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        validate_patch(candidate_path,labels.shape,labels.size,flat,EXPECTED_LABELS_SHA256)
        report['lowerExperiment'] = dict(count=len(edits),bboxMin=coords.min(0).tolist(),bboxMax=coords.max(0).tolist(),
            patchSha256=hashlib.sha256(candidate_path.read_bytes()).hexdigest(),adopted=False,
            warning='Z102-112 is a review scope, not an anatomical endpoint. No public output.')
        planes = [('z',z) for z in range(101,114)] + [('x',x) for x in [171,183,195,207,219]] + [('y',y) for y in [220,230,240,250]]
    for label in range(1,7):
        values, counts = np.unique(atlas[labels==label], return_counts=True)
        report['manualLabelAtlasCounts'][str(label)] = {str(v):int(n) for v,n in zip(values,counts)}
    for axis,index in planes:
        r = _oriented_crop(raw,axis,index,crop)
        s = _oriented_crop(labels,axis,index,crop)
        a = _oriented_crop(atlas,axis,index,crop)
        rgb = np.repeat(r[:,:,None],3,axis=2)
        rgb[_outline(s==27)] = [255,70,90]
        rgb[_outline(np.isin(a,[77,26]))] = [255,220,0]
        rgb[_outline(np.isin(s,range(1,7)))] = [0,220,255]
        if args.lower_candidate:
            e = _oriented_crop(experiment,axis,index,crop)
            rgb[_outline(e)] = [80,255,100]
        w,h = r.shape[1]*3,r.shape[0]*3
        sheet = Image.new('RGB',(w*2+12,h+42),'#151515')
        draw = ImageDraw.Draw(sheet)
        draw.text((4,3),f'{axis.upper()}={index}: RAW | red current brainstem; yellow source Ventral DC', fill='white')
        draw.text((4,20),'cyan manual RN/SN/STN; outlines are source attribution, NOT approved boundaries',fill='white')
        if args.lower_candidate:
            draw.rectangle((0,18,w*2+12,40),fill='#151515')
            draw.text((4,20),'green UNADOPTED Z102-112 experiment; cyan manual nuclei; cutoff NOT anatomical',fill='white')
        sheet.paste(Image.fromarray(r).convert('RGB').resize((w,h),Image.Resampling.NEAREST),(0,42))
        sheet.paste(Image.fromarray(rgb).resize((w,h),Image.Resampling.NEAREST),(w+12,42))
        name=f'{"candidate-" if args.lower_candidate else ""}{axis}-{index}.png';sheet.save(out/name)
        report['sheets'].append(dict(path=name,axis=axis,index=index,crop=crop,
            sha256=hashlib.sha256((out/name).read_bytes()).hexdigest()))
    (out/('candidate-report.json' if args.lower_candidate else 'report.json')).write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({k:v for k,v in report.items() if k!='sheets'}))


if __name__=='__main__':main()
