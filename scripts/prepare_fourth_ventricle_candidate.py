"""Reproduce one image-reviewed exclusion candidate; never write a label volume.

The seed identifies a previously visually reviewed component, not a geometric
rule for deciding anatomy. Other disconnected components remain untouched.
"""
import hashlib
import argparse
import json
import numpy as np
from PIL import Image, ImageDraw
from build_orthogonal_review_bundle import (
    ROOT, DEFAULT_IMAGE, MAGIC_IMAGE, MAGIC_LABELS,
    EXPECTED_IMAGE_SHA256, read_browser_volume,
    _oriented_crop, _outline, PIXEL_TO_VOXEL_FIXED,
)
from apply_segmentation_patch import _expected_workflow_metadata, validate_patch
from build_bigbrain_practical_seg import AQUEDUCT_SOURCE_COMPRESSED_SHA256 as EXPECTED_LABELS_SHA256

# This reproduces a historical candidate, not a new proposal on current labels.
DEFAULT_LABELS = ROOT/'tests/fixtures/bigbrain-practical-segmentation-pre-classification-b75a.bin.gz'


def component(mask, seed):
    if not mask[seed]:
        raise ValueError('Reviewed seed is absent')
    found = {seed}
    queue = [seed]
    while queue:
        p = queue.pop()
        for axis in range(3):
            for step in (-1, 1):
                q = list(p)
                q[axis] += step
                q = tuple(q)
                if (0 <= q[axis] < mask.shape[axis] and q not in found and mask[q]):
                    found.add(q)
                    queue.append(q)
    return sorted(found)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--aqueduct', action='store_true', help='Reclassify as partial aqueduct ID41 rather than exclude')
    args = parser.parse_args()
    target = 41 if args.aqueduct else 0
    _, _, raw = read_browser_volume(DEFAULT_IMAGE, MAGIC_IMAGE, EXPECTED_IMAGE_SHA256)
    _, _, labels = read_browser_volume(DEFAULT_LABELS, MAGIC_LABELS, EXPECTED_LABELS_SHA256)
    points = component(labels == 26, (195, 199, 119))
    xyz = np.array(points)
    if (len(points) != 16 or xyz.min(0).tolist() != [195, 199, 116]
            or xyz.max(0).tolist() != [196, 202, 123]):
        raise ValueError('Reviewed component identity changed; do not regenerate by guess')
    indices = sorted(int(np.ravel_multi_index(p, labels.shape, order='F')) for p in points)
    edits = [(i, target) for i in indices]
    flat = labels.tobytes(order='F')
    patch = dict(format='brain-practical-segmentation-patch', version=1,
        sourceImage='/atlas/bigbrain-icbm500.bin.gz',
        sourceLabels='/atlas/bigbrain-practical-segmentation-icbm500.bin.gz',
        sourceLabelsSha256=EXPECTED_LABELS_SHA256, dims=list(labels.shape),
        voxelSizeMm=[0.5, 0.5, 0.5], primaryPlane='horizontal',
        authorNote='AI image-reviewed exclusion candidate, not expert approval or a complete aqueduct mask.',
        authorGitHub='', targetSide='midline', confidence='medium',
        evidence='FOURTH_VENTRICLE_REPAIR.md; original BigBrain all Z116-123 and orthogonal X195-196/Y199-202. Remove only the isolated midbrain fragment from ID26; retain its exact coordinates for later aqueduct review. No cavity filling.',
        workflowMetadataVersion=1, reviewStatus='unreviewed',
        review=dict(decision='unreviewed', reviewer=None, decidedAt=None, reason='', pullRequest=None),
        editCount=len(edits), runs=[dict(start=i, length=1, label=target) for i in indices],
        **_expected_workflow_metadata(edits, flat, labels.shape))
    if args.aqueduct:
        patch['authorNote'] = 'User-directed reclassification as partial cerebral aqueduct candidate. Not a complete aqueduct or expert-reviewed boundary.'
        patch['evidence'] += ' Supersedes the exclusion proposal: identical 16 voxels become ID41, without expansion. User requested aqueduct classification on 2026-09-05.'
    out = ROOT / ('work/anatomy-review/aqueduct-reclassification-v1' if args.aqueduct else 'work/anatomy-review/fourth-ventricle-repair-v1')
    out.mkdir(parents=True, exist_ok=True)
    patch_path = out / ('aqueduct-reclassification-candidate.json' if args.aqueduct else 'fourth-ventricle-exclusion-candidate.json')
    patch_path.write_text(json.dumps(patch, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    validate_patch(patch_path, labels.shape, labels.size, flat, EXPECTED_LABELS_SHA256)
    after = labels.copy()
    for p in points:
        after[p] = target
    restore = after.copy()
    for p in points:
        restore[p] = 26
    assert np.array_equal(restore, labels)
    assert np.count_nonzero(after != labels) == 16
    manifest = dict(imageSha256=EXPECTED_IMAGE_SHA256, labelsSha256=EXPECTED_LABELS_SHA256,
        publicAssetMutation=False, reviewStatus='unreviewed',
        patchSha256=hashlib.sha256(patch_path.read_bytes()).hexdigest(),
        beforeCount=int(np.count_nonzero(labels == 26)), afterCount=int(np.count_nonzero(after == 26)),
        excludedFragmentXYZ=points, targetLabel=target, restoreLabel=26, reversible=True,
        pixelToVoxel=PIXEL_TO_VOXEL_FIXED, sheets=[])
    crop = dict(min=[175, 175, 95], max=[215, 225, 140])
    for axis, slices in [('z', list(range(115, 125))), ('x', [194, 195, 196, 197]), ('y', list(range(198, 204)))]:
        rows = []
        for index in slices:
            base = _oriented_crop(raw, axis, index, crop)
            h, w = base.shape
            row = Image.new('RGB', (w*4*3, h*4+24), '#151515')
            ImageDraw.Draw(row).text((4, 4), f'{axis.upper()}={index} RAW | BEFORE 26 | AFTER 26 red / 41 magenta', fill='white')
            for col, seg in enumerate([None, labels, after]):
                rgb = np.repeat(base[:, :, None], 3, axis=2)
                if seg is not None:
                    rgb[_outline(_oriented_crop(seg, axis, index, crop) == 26)] = [255, 60, 90]
                    rgb[_outline(_oriented_crop(seg, axis, index, crop) == 41)] = [228, 106, 206]
                row.paste(Image.fromarray(rgb).resize((w*4, h*4), Image.Resampling.NEAREST), (col*w*4, 24))
            rows.append(row)
        sheet = Image.new('RGB', (rows[0].width, sum(r.height for r in rows)))
        y = 0
        for row in rows:
            sheet.paste(row, (0, y)); y += row.height
        path = out / f'{axis}.png'
        sheet.save(path)
        manifest['sheets'].append(dict(path=path.name, axis=axis, slices=slices, crop=crop,
            sha256=hashlib.sha256(path.read_bytes()).hexdigest()))
    (out/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n', encoding='utf-8')
    print(json.dumps(dict(output=str(out), before=manifest['beforeCount'], after=manifest['afterCount'])))


if __name__ == '__main__':
    main()
