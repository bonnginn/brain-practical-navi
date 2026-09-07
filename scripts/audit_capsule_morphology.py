"""Compare the actual atlas before/after the nuclear-exclusion repair.

Local-only evidence. No public labels, adopted patches, or source files change.
Run with work/segmentation-deps on PYTHONPATH when using the isolated runtime.
"""
import hashlib
import json
from pathlib import Path
import numpy as np
import nibabel as nib
from nibabel.processing import resample_from_to
from PIL import Image, ImageDraw
from build_bigbrain_practical_seg import atlas_white_matter_candidates, AQUEDUCT_SOURCE_COMPRESSED_SHA256 as EXPECTED_LABELS_SHA256
from apply_segmentation_patch import _expected_workflow_metadata, validate_patch
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, MAGIC_LABELS, MAGIC_IMAGE,
    EXPECTED_IMAGE_SHA256, read_browser_volume,
    _oriented_crop, _outline, PIXEL_TO_VOXEL_FIXED,
)

SOURCE_MD5 = {'cerebra.nii.gz':'7b69ad2478c6be7de12bb5b254b4cb7c',
              'wm-prob.nii.gz':'e5f636592b9c3a3eea4660ebc987a385'}
DEFAULT_LABELS = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'


def main():
    source = ROOT/'work/segmentation-source-review'
    digests = {}
    for name, expected in SOURCE_MD5.items():
        payload = (source/name).read_bytes()
        if hashlib.md5(payload).hexdigest() != expected:
            raise ValueError(f'Official source identity changed: {name}')
        digests[name] = dict(md5=expected, sha256=hashlib.sha256(payload).hexdigest())
    atlas = nib.load(source/'cerebra.nii.gz')
    wm = nib.load(source/'wm-prob.nii.gz')
    if atlas.shape != wm.shape or not np.allclose(atlas.affine, wm.affine):
        raise ValueError('Atlas/WM grids differ')
    labels = np.rint(np.asarray(atlas.dataobj)).astype(np.uint8)
    prob = np.asarray(wm.dataobj, dtype=np.float32)
    if prob.max() > 1.5:
        prob /= 100
    # Explicit historical mode is also used by the pinned public build path.
    before = atlas_white_matter_candidates(labels, prob, atlas.affine,
        preserve_nuclear_exclusions=False)
    after = atlas_white_matter_candidates(labels, prob, atlas.affine)
    _, _, actual = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    _, _, image = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    grid_path = ROOT/'public/atlas/bigbrain-icbm500-validation.json'
    grid = json.loads(grid_path.read_text(encoding='utf-8'))
    if tuple(grid['shape']) != actual.shape:
        raise ValueError('Target dimensions differ')
    target = (actual.shape, np.asarray(grid['affine']))
    out = ROOT/'work/anatomy-review/capsule-morphology-v1'
    out.mkdir(parents=True, exist_ok=True)
    report = dict(sourceDigests=digests, imageSha256=EXPECTED_IMAGE_SHA256,
        labelsSha256=EXPECTED_LABELS_SHA256,
        gridMetadataSha256=hashlib.sha256(grid_path.read_bytes()).hexdigest(),
        publicMutation=False, expertReviewed=False, pixelToVoxel=PIXEL_TO_VOXEL_FIXED,
        items=[], sheets=[])
    edits = []
    for label, old, new in zip((31,32), before[1:], after[1:]):
        if np.any(new & ~old):
            raise ValueError('Exclusion unexpectedly adds atlas voxels')
        removed = old & ~new
        mapped = np.asarray(resample_from_to(nib.Nifti1Image(removed.astype(np.uint8), atlas.affine), target, order=0).dataobj) > 0
        old_mapped = np.asarray(resample_from_to(nib.Nifti1Image(old.astype(np.uint8), atlas.affine), target, order=0).dataobj) > 0
        selected = mapped & (actual == label)
        points = np.argwhere(selected)
        edits.extend((int(np.ravel_multi_index(p,actual.shape,order='F')),0) for p in points)
        entry = dict(label=label, atlasRemoved=int(removed.sum()),
            mappedRemoved=int(mapped.sum()), currentLabelAffected=int(selected.sum()),
            currentLabelOutsideReproducedBaseline=int(np.count_nonzero((actual==label)&~old_mapped)),
            proposedRemovalXYZ=points.tolist(), adopted=False)
        report['items'].append(entry)
        if not len(points):
            continue
        crop = dict(min=np.maximum(0, points.min(0)-8).tolist(),
                    max=np.minimum(np.array(actual.shape)-1, points.max(0)+8).tolist())
        # Inspect all occupied Z planes. No automatic anatomical acceptance.
        for z in sorted(set(points[:,2].tolist())):
            raw = _oriented_crop(image, 'z', z, crop)
            seg = _oriented_crop(actual, 'z', z, crop)
            change = _oriented_crop(selected, 'z', z, crop)
            rgb = np.repeat(raw[:,:,None], 3, axis=2)
            rgb[_outline(seg==label)] = [255,70,90]
            rgb[change] = [255,220,0]
            h,w = raw.shape
            sheet = Image.new('RGB', (w*4+12,h*2+24), '#151515')
            ImageDraw.Draw(sheet).text((4,4),f'ID{label} Z={z} RAW | stored outline red / affected yellow',fill='white')
            sheet.paste(Image.fromarray(raw).convert('RGB').resize((w*2,h*2),Image.Resampling.NEAREST),(0,24))
            sheet.paste(Image.fromarray(rgb).resize((w*2,h*2),Image.Resampling.NEAREST),(w*2+12,24))
            path = out/f'id{label}-z{z}.png'
            sheet.save(path)
            report['sheets'].append(dict(path=path.name, label=label, axis='z', index=z,
                crop=crop, sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    if any(item['currentLabelOutsideReproducedBaseline'] for item in report['items']):
        raise ValueError('Current labels do not reproduce; do not export a candidate')
    edits.sort()
    runs=[]
    for index,value in edits:
        if runs and runs[-1]['start']+runs[-1]['length']==index:
            runs[-1]['length']+=1
        else:
            runs.append(dict(start=index,length=1,label=value))
    patch=dict(format='brain-practical-segmentation-patch',version=1,
        sourceImage='/atlas/bigbrain-icbm500.bin.gz',
        sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
        sourceLabelsSha256=EXPECTED_LABELS_SHA256,dims=list(actual.shape),voxelSizeMm=[0.5]*3,
        primaryPlane='horizontal',authorGitHub='',authorNote='Atlas morphology exclusion difference only; not an accepted anatomical repair.',
        targetSide='bilateral',confidence='low',evidence='INTERNAL_CAPSULE_REPAIR.md; official atlas/WM checksums and before/after reconstruction in capsule-morphology-v1/report.json. Some affected voxels may be real white matter; do not adopt wholesale.',
        workflowMetadataVersion=1,reviewStatus='unreviewed',
        review=dict(decision='unreviewed',reviewer=None,decidedAt=None,reason='',pullRequest=None),
        editCount=len(edits),runs=runs,**_expected_workflow_metadata(edits,actual.tobytes(order='F'),actual.shape))
    patch_path=out/'capsule-morphology-candidate.json'
    patch_path.write_text(json.dumps(patch,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    validate_patch(patch_path,actual.shape,actual.size,actual.tobytes(order='F'),EXPECTED_LABELS_SHA256)
    report['candidatePatchSha256']=hashlib.sha256(patch_path.read_bytes()).hexdigest()
    (out/'report.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps([{k:v for k,v in item.items() if k!='proposedRemovalXYZ'} for item in report['items']]))
    print('sheets',len(report['sheets']))


if __name__=='__main__':
    main()
